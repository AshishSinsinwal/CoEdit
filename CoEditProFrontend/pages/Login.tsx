import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { FileText, Mail, Lock, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.auth.login(email, password);
      login(token, user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const { token, user } = await api.auth.google(tokenResponse.access_token);
        login(token, user);
      } catch (err: any) {
        setError(err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300
      bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900
      dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950"
    >
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />


      {/* Glass card */}
      <div className="relative z-10 max-w-md w-full">
        <div className="
          backdrop-blur-xl
          bg-white/10
          dark:bg-white/5
          border border-white/20
          dark:border-white/10
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          p-10
        ">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-500/20 border border-indigo-400/30 p-3 rounded-xl backdrop-blur-sm">
                <FileText size={36} className="text-indigo-300" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-white/50">Sign in to continue collaborating</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-3 text-red-300 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-white/40" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-3 rounded-xl text-sm
                  bg-white/10 dark:bg-white/5
                  border border-white/20 dark:border-white/10
                  text-white placeholder-white/30
                  focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50
                  backdrop-blur-sm transition-all duration-200
                "
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-white/40" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-3 rounded-xl text-sm
                  bg-white/10 dark:bg-white/5
                  border border-white/20 dark:border-white/10
                  text-white placeholder-white/30
                  focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50
                  backdrop-blur-sm transition-all duration-200
                "
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 px-4 rounded-xl text-sm font-semibold
                bg-indigo-500/80 hover:bg-indigo-500
                border border-indigo-400/40
                text-white
                backdrop-blur-sm
                shadow-[0_0_20px_rgba(99,102,241,0.3)]
                hover:shadow-[0_0_28px_rgba(99,102,241,0.5)]
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-xs text-white/40 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>

          {/* Google */}
          <button
            onClick={() => handleGoogleLogin()}
            className="
              w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium
              bg-white/10 dark:bg-white/5
              border border-white/20 dark:border-white/10
              text-white/80 hover:text-white
              hover:bg-white/15
              backdrop-blur-sm transition-all duration-200
            "
          >
            <img className="h-4 w-4" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
            Sign in with Google
          </button>

          {/* Footer */}
          <p className="mt-7 text-center text-sm text-white/40">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-indigo-300 hover:text-indigo-200 transition-colors">
              Register for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;