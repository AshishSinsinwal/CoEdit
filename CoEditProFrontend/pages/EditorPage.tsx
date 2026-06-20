import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { getSocket } from '../socket';
import { api } from '../api';
import Layout from '../components/Layout';
import { 
  UserPlus, Loader2, Users, Trash2, Search, X, 
  ShieldCheck, User as UserIcon, CheckCircle2, FileText, Activity
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

const syncLatencies: number[] = [];

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const title = location.state?.docTitle || `Document ${id?.slice(-4)}`;
  const { theme } = useTheme();
  const { user } = useAuth();

  const editorRef = useRef<any>(null);
  const isRemoteChange = useRef(false);

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [fetchingCollabs, setFetchingCollabs] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');
  const [allMembers , setAllMembers] = useState<any[]>([]);
  const [activeMembers , setActiveMembers] = useState<any[]>([]);

  const currentUserId = user?.id || user?._id; 
  const documentOwnerId = location.state?.ownerId;
  const isOwner = currentUserId === documentOwnerId;

  const [isDeleting, setIsDeleting] = useState(false);

  const computePercentiles = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    console.log(`%c⏱️ --- COEDIT LATENCY METRICS (n=${sorted.length}) ---`, "color: #6366f1; font-weight: bold; font-size: 12px;");
    console.log(`Median (p50):  ${p50.toFixed(2)} ms`);
    console.log(`95th % (p95):  ${p95.toFixed(2)} ms`);
    console.log(`99th % (p99):  ${p99.toFixed(2)} ms`);
  };

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    if (!socket) { navigate('/login'); return; }

    socket.emit('document:join', { docId: id });

    socket.on('document:init', ({ docId, content }: { docId: string; content: string }) => {
      if (docId === id) { setContent(content); setLoading(false); }
    });

    socket.on('document:remoteUpdate', ({ docId, content, telemetry }: { docId: string; content: string; telemetry?: { originTime: number; senderSocketId: string } }) => {
      const receiveTime = performance.timeOrigin + performance.now();
      if (docId === id) {
        if (telemetry && telemetry.senderSocketId !== socket.id) {
          const delta = receiveTime - telemetry.originTime;
          syncLatencies.push(delta);
          if (syncLatencies.length % 10 === 0) computePercentiles(syncLatencies);
        }
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            isRemoteChange.current = true;
            const range = model.getFullModelRange();
            model.pushEditOperations([], [{ range, text: content }], () => null);
            isRemoteChange.current = false;
          }
        }
        setContent(content);
      }
    });

    socket.on('document:error', (msg: string) => { setError(msg); setLoading(false); });
    socket.on('document:access_revoked', ({ documentId, message }: { documentId: string; message: string }) => {
      if (documentId === id) { alert(message); navigate('/'); }
    });
    socket.on('document:added', (data: { docId: string }) => {
      if (showListModal && data.docId === id) fetchCollabs();
    });
    socket.on('document:active_presence', ({ docId, activeMembers }: { docId: string; activeMembers: any[] }) => {
      if (docId === id) {
        // Overwrite collaborator state with actual live active arrays!
        setActiveMembers(activeMembers);
      }
    });

    return () => {
      socket.emit('document:leave', { docId: id });
      socket.off('document:init');
      socket.off('document:remoteUpdate');
      socket.off('document:error');
      socket.off('document:access_revoked');
      socket.off('document:added');
      socket.off('document:active_presence');
    };
  }, [id, navigate, showListModal]);

  const fetchCollabs = async () => {
    if (!id) return;
    setFetchingCollabs(true);
    try {
      const response = await api.documents.getCollaborators(id);
      setAllMembers(response?.collaborators || []);
    } catch { setCollaborators([]); }
    finally { setFetchingCollabs(false); }
  };

  useEffect(() => { if (showListModal) fetchCollabs(); }, [showListModal, id]);

  const handleEditorChange = (value: string | undefined) => {
    if (isRemoteChange.current) return;
    const socket = getSocket();
    if (socket && value !== undefined) {
      socket.emit('document:update', {
        docId: id,
        content: value,
        telemetry: { originTime: performance.timeOrigin + performance.now(), senderSocketId: socket.id }
      });
      setContent(value); // Keep local react state in sync for word count
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('saas-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0B1120',
        'editor.selectionBackground': '#4f46e540',
        'editor.lineHighlightBackground': '#1e1b4b80',
        'editorCursor.foreground': '#818cf8',
        'editor.lineHighlightBorder': '#00000000',
      }
    });
  };

  const handleEditorDidMount = (editor: any) => { editorRef.current = editor; };

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
    } finally { setInviting(false); }
  };

  const handleRemoveCollaborator = async (email: string) => {
    if (!id || !window.confirm(`Remove access for ${email}?`)) return;
    try {
      await api.documents.removeCollaborator(id, email);
      setCollaborators(prev => prev.filter(c => c.email !== email));
    } catch (err: any) { alert(err.message || 'Failed to remove collaborator'); }
  };

  const handleDeleteDocument = async () => {
    if (!id || !window.confirm("Are you sure? This will permanently delete the document.")) return;
    setIsDeleting(true);
    try {
      await api.documents.deleteDocument(id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally { setIsDeleting(false); }
  };

  const filteredCollaborators = collaborators.filter(c =>
    c.email.toLowerCase().includes(collabSearch.toLowerCase()) ||
    c.name?.toLowerCase().includes(collabSearch.toLowerCase())
  );

  // Derived state for new UI components
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const displayCollabs = collaborators.filter(c => c.email !== user?.email);
  const visibleCollabs = displayCollabs.slice(0, 3);
  const extraCollabs = displayCollabs.length > 3 ? displayCollabs.length - 3 : 0;

  // Shared glass modal wrapper styles
  const modalOverlay = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200";
  const modalCard = `
    backdrop-blur-xl bg-white/10 dark:bg-white/5
    border border-white/20 dark:border-white/10
    rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]
    w-full max-w-md
  `;

  return (
    <Layout title={'CoEdit'}>
      <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#020617] via-[#0B1120] to-[#0f172a] animate-in fade-in duration-500">
        
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 space-y-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
              <div className="absolute inset-2 rounded-full border-r-2 border-purple-400 animate-spin direction-reverse" />
              <Activity className="text-indigo-400 animate-pulse" size={24} />
            </div>
            <div className="space-y-2 text-center backdrop-blur-sm bg-white/5 px-8 py-6 rounded-3xl border border-white/10 shadow-2xl">
              <h3 className="text-xl font-bold text-white tracking-tight">Preparing Workspace</h3>
              <p className="text-white/40 text-sm">Connecting collaborators & loading document...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full relative z-10 gap-6">
            
            {/* ── Document Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between px-2 gap-4">
              <div>
                <h1 className="text-3xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <FileText className="text-indigo-400" size={30} />
                  {title}
                </h1>
                <div className="flex items-center gap-2 mt-3 text-sm font-medium text-emerald-400/90">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Live Sync Active
                </div>
              </div>

              {/* Roles Badge */}
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isOwner
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-400/20'
                    : 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/20'
                }`}>
                  {isOwner ? <ShieldCheck size={14} /> : <UserIcon size={14} />}
                  {isOwner ? 'Owner' : 'Collaborator'}
                </span>
              </div>
            </div>

            {/* ── Workspace Glass Card ── */}
            <div className="flex-1 flex flex-col rounded-3xl backdrop-blur-xl bg-white/[0.02] border border-white/10 shadow-2xl shadow-indigo-500/5 overflow-hidden relative group">
              {/* Premium Top Glow */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Toolbar */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                
                {/* Left: Collaborator Presence */}
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {/* Current User */}
                    <div 
                      title={`${user?.name} (You)`}
                      className="w-8 h-8 rounded-full ring-2 ring-[#0B1120] bg-indigo-500/80 flex items-center justify-center text-white text-xs font-bold shadow-lg z-20"
                    >
                      {user?.name?.substring(0, 2).toUpperCase() || 'ME'}
                    </div>
                    {/* Visible Collaborators */}
                    {activeMembers.filter((collab) => collab.email !== user?.email)
                    .map((collab, i) => (
                      <div 
                        key={collab.email}
                        title={collab.name || collab.email}
                        className="w-8 h-8 rounded-full ring-2 ring-[#0B1120] bg-purple-500/60 flex items-center justify-center text-white text-xs font-bold shadow-lg z-10 transition-transform hover:-translate-y-1"
                      > 
                        {collab.name?.substring(0, 2).toUpperCase() || 'C'}
                      </div>
                    ))}
                    {/* Extra Collaborators */}
                    {extraCollabs > 0 && (
                      <div className="w-8 h-8 rounded-full ring-2 ring-[#0B1120] bg-white/10 border border-white/20 flex items-center justify-center text-white/70 text-xs font-bold shadow-lg z-0">
                        +{extraCollabs}
                      </div>
                    )}
                  </div>
                  
                  {displayCollabs.length === 0 && (
                    <span className="text-sm text-white/30 hidden sm:block">Only you are here</span>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowListModal(true)}
                    className="flex items-center gap-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium"
                  >
                    <Users size={16} />
                    <span className="hidden sm:inline">Team</span>
                  </button>

                  {isOwner ? (
                    <button
                      onClick={() => setShowCollabModal(true)}
                      className="flex items-center gap-2 text-white/90 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                    >
                      <UserPlus size={16} />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Only the owner can invite others"
                      className="flex items-center gap-2 text-white/20 bg-white/5 px-4 py-2 rounded-xl cursor-not-allowed text-sm font-medium"
                    >
                      <UserPlus size={16} />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  )}

                  {isOwner && (
                    <>
                      <div className="h-6 w-px bg-white/10 mx-2" />
                      <button
                        onClick={handleDeleteDocument}
                        disabled={isDeleting}
                        className="flex items-center justify-center w-10 h-10 text-red-400/70 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-400/20 rounded-xl transition-all duration-200 disabled:opacity-40"
                      >
                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Container */}
              <div className="flex-1 relative bg-[#0B1120]/80">
                <MonacoEditor
                  height="100%"
                  defaultLanguage="markdown"
                  theme="saas-dark"
                  value={content}
                  onChange={handleEditorChange}
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 15,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    wordWrap: 'on',
                    lineHeight: 26,
                    padding: { top: 32, bottom: 32 },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    renderLineHighlight: "all",
                  }}
                  className="rounded-b-3xl"
                />
              </div>

              {/* Status Bar */}
              <div className="px-6 py-3 flex items-center justify-between border-t border-white/5 bg-white/[0.01] text-xs font-medium text-white/40 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5 hover:text-white/70 transition-colors cursor-default">
                    <CheckCircle2 size={14} className="text-indigo-400/70" /> 
                    Markdown
                  </span>
                  <span className="hidden sm:inline-block">{wordCount} words</span>
                  <span className="hidden sm:inline-block">{charCount} characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500/50"></span>
                  {activeMembers.length} Collaborator{activeMembers.length !== 1 && 's'} Active
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: Collaborators List ── */}
      {showListModal && (
        <div className={modalOverlay}>
          <div className={`${modalCard} flex flex-col max-h-[80vh]`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Team Members</h3>
              <button
                onClick={() => setShowListModal(false)}
                className="text-white/40 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-white/30" size={16} />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                  className="
                    w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                    bg-white/5 border border-white/10
                    text-white placeholder-white/30
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                    backdrop-blur-sm transition-all
                  "
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {fetchingCollabs ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-indigo-400" size={28} />
                </div>
              ) : allMembers.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-8">No members found</p>
              ) : (
                allMembers.map((member) => {
                  // 🟢 Check if this database member exists in the live Redis array
                  const isOnline = activeMembers.some(active => active.email === member.email);

                  return (
                    <div
                      key={member.email}
                      className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-white/5 group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        
                        {/* Avatar Container with Active Dot */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/25 flex items-center justify-center text-indigo-300 text-sm font-bold shadow-inner">
                            {member.name?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                          
                          {/* The Live Green Dot */}
                          {isOnline && (
                            <span 
                              title="Online right now"
                              className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0B1120] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" 
                            />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white/90">
                              {member.email === user?.email ? `${member.name} (You)` : member.name}
                            </span>
                            {member.role === 'owner' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/20 text-[10px] font-bold uppercase tracking-wide">
                                Owner
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-white/40">{member.email}</span>
                        </div>
                      </div>

                      {isOwner && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveCollaborator(member.email)}
                          className="text-white/20 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setShowListModal(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Invite Collaborator ── */}
      {showCollabModal && isOwner && (
        <div className={modalOverlay}>
          <div className={`${modalCard} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Share Document</h3>
              <button
                onClick={() => setShowCollabModal(false)}
                className="text-white/40 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider pl-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl text-sm
                    bg-white/5 border border-white/10
                    text-white placeholder-white/20
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                    backdrop-blur-sm transition-all duration-200
                  "
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCollabModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="
                    px-6 py-2.5 rounded-xl text-sm font-bold
                    bg-indigo-500 hover:bg-indigo-400
                    border border-indigo-400/50 text-white
                    shadow-[0_0_20px_rgba(99,102,241,0.3)]
                    hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]
                    disabled:opacity-50 transition-all duration-300
                  "
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EditorPage;