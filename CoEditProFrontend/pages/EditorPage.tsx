import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { getSocket } from '../socket';
import { api } from '../api';
import Layout from '../components/Layout';
import { UserPlus, Loader2, AlertCircle, Users, Trash2, Search, X, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const title = location.state?.docTitle || `Document ${id?.slice(-4)}`;
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const editorRef = useRef<any>(null);
  const isRemoteChange = useRef(false);

  // States
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Collaboration States
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [fetchingCollabs, setFetchingCollabs] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');
  
  // Ownership Logic
  const currentUserId = user?._id;
  const documentOwnerId = location.state?.ownerId;
  const isOwner = currentUserId === documentOwnerId;

  // Action States
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    if (!socket) {
      navigate('/login');
      return;
    }

    socket.emit('document:join', { docId: id });

    socket.on('document:init', ({ docId, content }: { docId: string; content: string }) => {
      if (docId === id) {
        setContent(content);
        setLoading(false);
      }
    });

    socket.on('document:remoteUpdate', ({ docId, content }: { docId: string; content: string }) => {
      if (docId === id && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          isRemoteChange.current = true;
          const range = model.getFullModelRange();
          model.pushEditOperations([], [{ range: range, text: content }], () => null);
          isRemoteChange.current = false;
        }
      }
    });

    socket.on('document:error', (msg: string) => {
      setError(msg);
      setLoading(false);
    });

    socket.on('document:access_revoked', ({ documentId, message }: { documentId: string; message: string }) => {
      if (documentId === id) {
        alert(message);
        navigate('/');
      }
    });

    socket.on('document:added', (data: { docId: string }) => {
      if (showListModal && data.docId === id) {
        fetchCollabs();
      }
    });

    return () => {
      socket.off('document:init');
      socket.off('document:remoteUpdate');
      socket.off('document:error');
      socket.off('document:access_revoked');
      socket.off('document:added');
    };
  }, [id, navigate, showListModal]);

  const fetchCollabs = async () => {
    if (!id) return;
    setFetchingCollabs(true);
    try {
      const response = await api.documents.getCollaborators(id);
      // Backend returns { collaborators: [...] } including the owner manually added
      setCollaborators(response?.collaborators || []);
    } catch (err) {
      console.error("Failed to fetch collaborators");
      setCollaborators([]);
    } finally {
      setFetchingCollabs(false);
    }
  };

  useEffect(() => {
    if (showListModal) fetchCollabs();
  }, [showListModal, id]);

  const handleEditorChange = (value: string | undefined) => {
    if (isRemoteChange.current) return;
    const socket = getSocket();
    if (socket && value !== undefined) {
      socket.emit('document:update', { docId: id, content: value });
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail) return;
    setInviting(true);
    try {
      await api.documents.addCollaborator(id, inviteEmail);
      alert('Collaborator invited successfully!');
      setInviteEmail('');
      setShowCollabModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to invite collaborator');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveCollaborator = async (email: string) => {
    if (!id || !window.confirm(`Remove access for ${email}?`)) return;
    try {
      await api.documents.removeCollaborator(id, email);
      setCollaborators(prev => prev.filter(c => c.email !== email));
    } catch (err: any) {
      alert(err.message || 'Failed to remove collaborator');
    }
  };

  const handleDeleteDocument = async () => {
    if (!id || !window.confirm("Are you sure? This will permanently delete the document.")) return;
    setIsDeleting(true);
    try {
      await api.documents.deleteDocument(id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCollaborators = collaborators.filter(c => 
    c.email.toLowerCase().includes(collabSearch.toLowerCase()) || 
    c.name?.toLowerCase().includes(collabSearch.toLowerCase())
  );

  return (
    <Layout title={loading ? 'Loading...' : `${title} - CoEdit Pro`}>
      <div className="flex flex-col h-full transition-colors duration-200">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2 mr-4">
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.name?.substring(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Role Indicator Badge */}
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isOwner ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {isOwner ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
              <span>{isOwner ? 'Owner' : 'Collaborator'}</span>
            </div>
            
            <span className="text-sm text-gray-500 dark:text-gray-400 italic hidden sm:inline">Autosaving...</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Team List Button */}
            <button 
              onClick={() => setShowListModal(true)}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
            >
              <Users size={18} />
              <span className="hidden sm:inline">Team</span>
            </button>

            {/* Share Button (Restricted to Owner) */}
            {isOwner ? (
              <button 
                onClick={() => setShowCollabModal(true)}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Share</span>
              </button>
            ) : (
                <button 
                  disabled 
                  title="Only the owner can invite others"
                  className="flex items-center space-x-2 text-gray-400 cursor-not-allowed px-3 py-1.5 opacity-50 text-sm font-medium"
                >
                  <UserPlus size={18} />
                  <span className="hidden sm:inline">Share</span>
                </button>
            )}

            {/* Delete Button (Restricted to Owner) */}
            {isOwner && (
              <>
                <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1" />
                <button 
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-white dark:bg-[#1e1e1e] relative">
          {loading ? (
            <div className="absolute inset-0 z-20 bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-2" size={40} />
              <p className="text-gray-500 dark:text-gray-400">Initializing editor sync...</p>
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              defaultLanguage="markdown"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                lineHeight: 24,
                padding: { top: 20 },
                automaticLayout: true,
              }}
            />
          )}
        </div>
      </div>

      {/* MODAL: Collaborators List */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Collaborators</h3>
              <button onClick={() => setShowListModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <div className="p-4 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search team members..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {fetchingCollabs ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" /></div>
              ) : (
                <>
                {filteredCollaborators
                  .filter(collab => collab.email !== user?.email)
                  .map((collab) => (
                  <div key={collab.email} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{collab.name || 'User'}</span>
                        {collab.role === 'owner' && (
                          <span className="flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold uppercase">
                            <ShieldCheck size={10} className="mr-1" /> Owner
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{collab.email}</span>
                    </div>

                    {/* ONLY allow removal if current user is OWNER AND target is NOT the owner */}
                    {isOwner && collab.role !== 'owner' && (
                      <button 
                        onClick={() => handleRemoveCollaborator(collab.email)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {filteredCollaborators.filter(c => c.email !== user?.email).length === 0 && (
                   <p className="text-center text-gray-500 text-sm py-4">No other members found</p>
                )}
                </>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
              <button onClick={() => setShowListModal(false)} className="w-full py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite Modal (Only for Owner) */}
      {showCollabModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Invite to Document</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <input type="email" required placeholder="collaborator@email.com" className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCollabModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" disabled={inviting} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{inviting ? 'Sending...' : 'Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EditorPage;