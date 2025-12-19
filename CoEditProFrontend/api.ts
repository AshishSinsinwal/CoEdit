
import { AuthResponse, Document, User } from './types';

const API_BASE =  import.meta.env.REACT_APP_API_URL;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse & { user: User }> => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    register: async (name: string, email: string, password: string): Promise<AuthResponse & { user: User }> => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) throw new Error('Registration failed');
      return res.json();
    },
    me: async (): Promise<User> => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
    google: async (token: string): Promise<AuthResponse & { user: User }> => {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('Google login failed');
      return res.json();
    },
  },
  documents: {
    list: async (): Promise<Document[]> => {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    create: async (title: string): Promise<Document> => {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create document');
      return res.json();
    },
    addCollaborator: async (docId: string, email: string) => {
      const res = await fetch(`${API_BASE}/documents/${docId}/collaborators`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to add collaborator');
      }
      return res.json();
    },
    deleteDocument: async (docId: string) => {
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete document');
      return res.json();
    },
    removeCollaborator: async (docId: string, email: string) => {
      const res = await fetch(`${API_BASE}/documents/${docId}/collaborators/${email}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to remove collaborator');
      return res.json();
    },
    getCollaborators: async (docId: string) => {
      const res = await fetch(`${API_BASE}/documents/${docId}/collaborators`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      return res.json();
    }
  },
};
