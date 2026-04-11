import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localAuthService } from '../services/localAuthService';
import { authApi } from '../api/auth';
import { apiAdapterManager } from '../data/apiAdapter';

export interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isGuest: boolean;
  isLocalUser: boolean;
  backendAvailable: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setUserFromStorage: (user: User, token: string) => void;

  loginWithCredentials: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string,
    nickname?: string
  ) => Promise<{ success: boolean; error?: string }>;

  checkBackendStatus: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isGuest: false,
      isLocalUser: false,
      backendAvailable: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isGuest: user?.id === 'guest_user',
          isLocalUser: user?.id?.startsWith('local_') || user?.id === 'guest_user',
        }),

      setToken: (token) => set({ token }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
          isGuest: user?.id === 'guest_user',
          isLocalUser: user?.id?.startsWith('local_') || user?.id === 'guest_user',
        }),

      logout: async () => {
        const state = get();

        if (!state.isLocalUser && state.backendAvailable) {
          try {
            await authApi.logout();
          } catch (e) {
            console.warn('Backend logout failed:', e);
          }
        }

        await localAuthService.logout();

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isGuest: false,
          isLocalUser: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      setUserFromStorage: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isGuest: user?.id === 'guest_user',
          isLocalUser: user?.id?.startsWith('local_') || user?.id === 'guest_user',
        });
      },

      checkBackendStatus: async () => {
        const isOnline = apiAdapterManager.getOnlineStatus();
        set({ backendAvailable: isOnline });
        return isOnline;
      },

      initializeAuth: async () => {
        set({ isLoading: true });

        try {
          const backendAvailable = await get().checkBackendStatus();

          const token = localStorage.getItem('token');
          if (token) {
            if (token.startsWith('local_token_')) {
              const result = await localAuthService.validateToken(token);
              if (result.valid && result.user) {
                set({
                  user: result.user as User,
                  token,
                  isAuthenticated: true,
                  isGuest: localAuthService.isGuest(result.user),
                  isLocalUser: true,
                  isLoading: false,
                });
                return;
              }
            } else if (backendAvailable) {
              try {
                const user = await authApi.getCurrentUser();
                set({
                  user,
                  token,
                  isAuthenticated: true,
                  isGuest: false,
                  isLocalUser: false,
                  isLoading: false,
                });
                return;
              } catch (e) {
                console.warn('Failed to validate remote token:', e);
              }
            }
          }

          set({ isLoading: false });
        } catch (e) {
          console.error('Auth initialization failed:', e);
          set({ isLoading: false });
        }
      },

      loginWithCredentials: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const backendAvailable = await get().checkBackendStatus();

          if (backendAvailable) {
            try {
              const response = await authApi.login({ username, password });
              set({
                user: response.user,
                token: response.access_token,
                isAuthenticated: true,
                isGuest: false,
                isLocalUser: false,
                isLoading: false,
              });
              localStorage.setItem('token', response.access_token);
              return { success: true };
            } catch (e: any) {
              console.warn('Backend login failed, trying local:', e);
            }
          }

          const localResult = await localAuthService.login(username, password);

          if (localResult.success && localResult.user && localResult.token) {
            await localAuthService.setCurrentUser(localResult.user, localResult.token);
            set({
              user: localResult.user as User,
              token: localResult.token,
              isAuthenticated: true,
              isGuest: localAuthService.isGuest(localResult.user),
              isLocalUser: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false, error: localResult.error });
          return { success: false, error: localResult.error };
        } catch (e: any) {
          set({ isLoading: false, error: e.message });
          return { success: false, error: e.message };
        }
      },

      loginAsGuest: async () => {
        set({ isLoading: true, error: null });

        try {
          const result = await localAuthService.loginAsGuest();

          if (result.success && result.user && result.token) {
            await localAuthService.setCurrentUser(result.user, result.token);
            set({
              user: result.user as User,
              token: result.token,
              isAuthenticated: true,
              isGuest: true,
              isLocalUser: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false, error: '访客登录失败' });
          return { success: false, error: '访客登录失败' };
        } catch (e: any) {
          set({ isLoading: false, error: e.message });
          return { success: false, error: e.message };
        }
      },

      register: async (username: string, email: string, password: string, nickname?: string) => {
        set({ isLoading: true, error: null });

        try {
          const backendAvailable = await get().checkBackendStatus();

          if (backendAvailable) {
            try {
              const response = await authApi.register({ username, email, password, nickname });
              set({
                user: response.user,
                token: response.access_token,
                isAuthenticated: true,
                isGuest: false,
                isLocalUser: false,
                isLoading: false,
              });
              localStorage.setItem('token', response.access_token);
              return { success: true };
            } catch (e: any) {
              console.warn('Backend register failed, trying local:', e);
            }
          }

          const localResult = await localAuthService.register(username, email, password, nickname);

          if (localResult.success && localResult.user && localResult.token) {
            await localAuthService.setCurrentUser(localResult.user, localResult.token);
            set({
              user: localResult.user as User,
              token: localResult.token,
              isAuthenticated: true,
              isGuest: false,
              isLocalUser: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false, error: localResult.error });
          return { success: false, error: localResult.error };
        } catch (e: any) {
          set({ isLoading: false, error: e.message });
          return { success: false, error: e.message };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        isLocalUser: state.isLocalUser,
      }),
    }
  )
);
