
import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, FileText, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = "CoEdit" }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            <FileText size={24} />
            <span>{title}</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4 sm:space-x-6">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
    </div>
  );
};

export default Layout;
