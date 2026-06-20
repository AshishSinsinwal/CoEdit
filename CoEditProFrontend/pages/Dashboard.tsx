import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { Document } from '../types';
import Layout from '../components/Layout';
import { useAuth } from '../AuthContext';
import { Plus, FileText, Clock, ChevronRight, Loader2, Search, X, Check } from 'lucide-react';
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

  const currentUserId = user.id;

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('document:added', (data: { message: string; docId: string }) => {
      console.log(data.message);
      fetchDocuments();
    });

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
      navigate(`/edit/${doc._id}`, { state: { docTitle: doc.title, ownerId: doc.ownerId } });
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
      {/* Page background — matches Login/Register world */}
      <div className="min-h-screen relative overflow-hidden
        bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900
        dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950"
      >
        {/* Ambient blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-400/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

          {/* Header row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Your Documents</h1>
              <p className="text-white/40 text-sm mt-1">Manage and collaborate in real time.</p>
            </div>

            {!isNaming ? (
              <button
                onClick={() => setIsNaming(true)}
                className="
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                  bg-indigo-500/80 hover:bg-indigo-500
                  border border-indigo-400/40
                  text-white
                  backdrop-blur-sm
                  shadow-[0_0_20px_rgba(99,102,241,0.3)]
                  hover:shadow-[0_0_28px_rgba(99,102,241,0.5)]
                  transition-all duration-200
                "
              >
                <Plus size={18} />
                New Document
              </button>
            ) : (
              <form
                onSubmit={handleCreateSubmit}
                className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Document title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={creating}
                  className="
                    px-4 py-2.5 rounded-xl text-sm
                    bg-white/10 border border-white/20
                    text-white placeholder-white/30
                    focus:outline-none focus:ring-2 focus:ring-indigo-400/50
                    backdrop-blur-sm transition-all duration-200 w-56
                  "
                />
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="p-2.5 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-400/40 text-white backdrop-blur-sm transition-all duration-200 disabled:opacity-40"
                >
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsNaming(false); setNewTitle(''); }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white/70 hover:text-white backdrop-blur-sm transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </form>
            )}
          </div>

          {/* Glass panel */}
          <div className="
            backdrop-blur-xl
            bg-white/10
            dark:bg-white/5
            border border-white/20
            dark:border-white/10
            rounded-2xl
            shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            overflow-hidden
          ">
            {/* Search bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10">
              <Search size={16} className="text-white/40 shrink-0" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  flex-1 bg-transparent border-none focus:ring-0 outline-none
                  text-sm text-white placeholder-white/30
                "
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="animate-spin text-indigo-400" size={36} />
                <p className="text-white/40 text-sm">Loading your documents...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="bg-white/10 border border-white/15 p-5 rounded-2xl text-white/30">
                  <FileText size={40} />
                </div>
                <div className="text-center">
                  <p className="text-white/60 font-medium">No documents found</p>
                  <p className="text-white/30 text-sm mt-1">
                    {searchTerm ? 'Try a different search term' : 'Create your first document to get started'}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {filteredDocs.map((doc) => {
                  const isOwner =
                    (typeof doc.ownerId === 'string' ? doc.ownerId : doc.ownerId._id) === currentUserId;

                  return (
                    <li
                      key={doc._id}
                      onClick={() =>
                        navigate(`/edit/${doc._id}`, {
                          state: { docTitle: doc.title, ownerId: doc.ownerId },
                        })
                      }
                      className="group flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-all duration-150"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="bg-indigo-500/20 border border-indigo-400/25 p-2.5 rounded-xl text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
                          <FileText size={20} />
                        </div>

                        {/* Text */}
                        <div>
                          <h3 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                            {doc.title}
                          </h3>
                          <div className="flex items-center gap-2.5 mt-1">
                            <span className="flex items-center gap-1 text-xs text-white/35">
                              <Clock size={11} />
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </span>
                            <span className="text-white/20 text-xs">•</span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                              isOwner
                                ? 'bg-white/10 text-white/50 border border-white/10'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/20'
                            }`}>
                              {isOwner ? 'Owner' : 'Collaborator'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-white/20 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-150"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer count */}
          {!loading && filteredDocs.length > 0 && (
            <p className="text-center text-xs text-white/25 mt-4">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
              {searchTerm ? ' matching your search' : ' total'}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;