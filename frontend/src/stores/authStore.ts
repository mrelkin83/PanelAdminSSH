import { create } from 'zustand';
import { Admin } from '@/types';

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  login: (token: string, admin: Admin) => void;
  logout: () => void;
  setAdmin: (admin: Admin) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  admin: null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, admin) => {
    localStorage.setItem('token', token);
    set({ token, admin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, admin: null, isAuthenticated: false });
  },

  setAdmin: (admin) => {
    set({ admin });
  },
}));
