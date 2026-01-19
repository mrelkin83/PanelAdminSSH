import { create } from 'zustand';
import { Admin } from '@/types';

interface AuthState {
  token: string | null;
  admin: Admin | null;
  user: Admin | null; // Alias for admin
  isAuthenticated: boolean;
  login: (token: string, admin: Admin) => void;
  logout: () => void;
  setAdmin: (admin: Admin) => void;
  setUser: (admin: Admin) => void; // Alias for setAdmin
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  admin: null,
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, admin) => {
    localStorage.setItem('token', token);
    set({ token, admin, user: admin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, admin: null, user: null, isAuthenticated: false });
  },

  setAdmin: (admin) => {
    set({ admin, user: admin });
  },

  setUser: (admin) => {
    set({ admin, user: admin });
  },
}));
