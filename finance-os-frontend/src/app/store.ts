import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  currency?: string;
  timezone?: string;
  avatar_url?: string;
  is_active?: boolean;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface ThemeState {
  theme: 'light' | 'dark';
}

interface StoreActions {
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateUser: (user: User) => void;
}

const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
const savedToken = localStorage.getItem('accessToken');
const savedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  accessToken: savedToken,
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!savedToken,
};

export const useStore = create<AuthState & ThemeState & StoreActions>((set) => ({
  ...initialState,
  theme: savedTheme,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

export const useAuthStore = useStore;
