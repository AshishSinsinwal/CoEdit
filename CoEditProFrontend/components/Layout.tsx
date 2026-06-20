import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, FileText, Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = "CoEdit" }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Glass navbar — inline style avoids Tailwind's /8 fraction issue */}
      <header
        className="relative z-20 backdrop-blur-xl border-b border-white/15 px-6 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-white font-bold text-xl hover:text-indigo-300 transition-colors duration-200"
        >
          <div className="bg-indigo-500/20 border border-indigo-400/30 p-1.5 rounded-lg">
            <FileText size={18} className="text-indigo-300" />
          </div>
          <span className="tracking-tight">{title}</span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* User avatar + name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 text-xs font-bold backdrop-blur-sm">
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-white/70 hidden sm:inline">
              {user?.name}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/15 hidden sm:block" />

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-white/40 hover:text-red-400 transition-colors duration-200 text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;