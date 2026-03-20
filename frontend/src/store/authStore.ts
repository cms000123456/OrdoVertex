import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authEvents, resetSessionExpiredFlag } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  sessionExpired: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  clearSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      sessionExpired: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        resetSessionExpiredFlag();
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
          sessionExpired: false
        });
      },
      logout: () => {
        localStorage.removeItem('token');
        resetSessionExpiredFlag();
        set({ user: null, token: null, isAuthenticated: false, isAdmin: false, sessionExpired: false });
      },
      clearSessionExpired: () => set({ sessionExpired: false })
    }),
    {
      name: 'auth-storage'
    }
  )
);

// Subscribe to session expiration events from API interceptor
if (typeof window !== 'undefined') {
  authEvents.subscribe(() => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      // Update store to reflect session expiration
      useAuthStore.setState({ 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        isAdmin: false,
        sessionExpired: true 
      });
    }
  });
}
