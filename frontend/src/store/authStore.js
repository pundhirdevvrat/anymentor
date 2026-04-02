import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setToken: (accessToken) => set({ accessToken }),
      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

      isOwner: () => get().user?.role === 'OWNER',
      isCompanyAdmin: () => ['OWNER', 'COMPANY_ADMIN'].includes(get().user?.role),
      isManager: () => ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(get().user?.role),
    }),
    {
      name: 'anymentor-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
