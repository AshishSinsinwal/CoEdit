import React, { useEffect, useState } from 'react';
import { useNavigate , useLocation } from 'react-router-dom';
import { api } from '../api';
import { Document } from '../types';
import Layout from '../components/Layout';
import { useAuth } from '../AuthContext';
import { Plus, FileText, Clock, ChevronRight, Loader2, Search, X, Check } from 'lucide-react';
;
import { getSocket } from '../socket';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNaming, setIsNaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentUserId = user._id;

  // 1. Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, []);

  // 2. Socket listeners for real-time list updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for when this user is added as a collaborator
    socket.on('document:added', (data: { message: string, docId: string }) => {
      console.log(data.message);
      fetchDocuments(); // Re-fetch the full list to show the new document
    });

    // Listen for when access is removed or document is deleted
    socket.on('document:removed', ({ documentId }: { documentId: string }) => {
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
    });

    return () => {
      socket.off('document:added');
      socket.off('document:removed');
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      const docs = await api.documents.list();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const doc = await api.documents.create(newTitle.trim());
      navigate(`/edit/${doc._id}`, { state: { docTitle: doc.title , ownerId: doc.ownerId} });
    } catch (err) {
      alert('Failed to create document');
      setCreating(false);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout onLogout={onLogout}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Documents </h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and create documents to collaborate on.</p>
          </div>

          {!isNaming ? (
            <button
              onClick={() => setIsNaming(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>New Document</span>
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="flex items-center space-x-2 animate-in slide-in-from-right-4 duration-200">
              <input
                autoFocus
                type="text"
                placeholder="Enter document title..."
                className="px-4 py-2 rounded-lg border border-indigo-300 dark:border-indigo-500 dark:bg-gray-800 dark:text-white outline-none ring-2 ring-indigo-500/20"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={creating}
              />
              <button 
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
              </button>
              <button 
                type="button"
                onClick={() => { setIsNaming(false); setNewTitle(''); }}
                className="p-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <X size={20} />
              </button>
            </form>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center space-x-3 bg-gray-50 dark:bg-gray-800/50">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="bg-transparent border-none focus:ring-0 text-sm flex-1 text-gray-900 dark:text-gray-100 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-2" size={40} />
              <p className="text-gray-500 dark:text-gray-400">Loading your documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full text-gray-400 mb-4">
                <FileText size={48} />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">No documents found</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredDocs.map((doc) => {
                // Determine if user owns it or it's shared
                const isOwner = (typeof doc.ownerId === 'string' ? doc.ownerId : doc.ownerId._id) === currentUserId;
                
                return (
                  <li 
                    key={doc._id} 
                    onClick={() => navigate(`/edit/${doc._id}` , { state: { docTitle: doc.title  , ownerId: doc.ownerId}})}
                    className="group hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer px-6 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                          {doc.title}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock size={12} className="mr-1" />
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            isOwner 
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {isOwner ? 'Owner' : 'Collaborator'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;