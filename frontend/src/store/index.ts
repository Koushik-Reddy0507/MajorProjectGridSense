import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthState } from '@/types'
import { auth } from '@/services/supabase'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      login: async (email: string, password: string) => {
        try {
          set({ loading: true, error: null })
          const { data, error: signInError } = await auth.signInWithPassword({
            email,
            password,
          })
          if (signInError) throw signInError
          if (data.user) {
            const user: User = {
              id: data.user.id,
              email: data.user.email!,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at || new Date().toISOString(),
            }
            set({ user, isAuthenticated: true, loading: false })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      signup: async (email: string, password: string, name?: string) => {
        try {
          set({ loading: true, error: null })
          const { data, error: signUpError } = await auth.signUp({
            email,
            password,
            options: {
              data: { name },
            },
          })
          if (signUpError) throw signUpError
          if (data.user) {
            const user: User = {
              id: data.user.id,
              email: data.user.email!,
              name,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at || new Date().toISOString(),
            }
            set({ user, isAuthenticated: true, loading: false })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Signup failed'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          set({ loading: true })
          await auth.signOut()
          set({ user: null, isAuthenticated: false, loading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Logout failed'
          set({ error: errorMessage, loading: false })
        }
      },

      checkAuth: async () => {
        try {
          set({ loading: true })
          const { data: { session } } = await auth.getSession()
          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email!,
              created_at: session.user.created_at,
              updated_at: session.user.updated_at || new Date().toISOString(),
            }
            set({ user, isAuthenticated: true, loading: false })
          } else {
            set({ user: null, isAuthenticated: false, loading: false })
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          set({ loading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

// ==================== UI STATE STORE ====================

interface UIState {
  sidebarOpen: boolean
  theme: 'dark' | 'light'
  notifications: {
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    timestamp: number
  }[]
  activeDatasetId?: string
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
  addNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  clearNotifications: () => void
  setActiveDatasetId: (id?: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      notifications: [],
      activeDatasetId: undefined,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),

      addNotification: (message, type) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              message,
              type,
              timestamp: Date.now(),
            },
          ],
        })),

      clearNotifications: () => set({ notifications: [] }),
      setActiveDatasetId: (id) => set({ activeDatasetId: id }),
    }),
    {
      name: 'ui-storage',
    }
  )
)

// ==================== DATASET STATE STORE ====================

interface DatasetState {
  datasets: Record<string, unknown>[]
  selectedDatasetId?: string
  loading: boolean
  error?: string
  uploadProgress: number

  setDatasets: (datasets: Record<string, unknown>[]) => void
  setSelectedDatasetId: (id?: string) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  setUploadProgress: (progress: number) => void
  addDataset: (dataset: Record<string, unknown>) => void
  removeDataset: (id: string) => void
}

export const useDatasetStore = create<DatasetState>()(
  persist(
    (set) => ({
      datasets: [],
      selectedDatasetId: undefined,
      loading: false,
      error: undefined,
      uploadProgress: 0,

      setDatasets: (datasets) => set({ datasets }),
      setSelectedDatasetId: (id) => set({ selectedDatasetId: id }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setUploadProgress: (progress) => set({ uploadProgress: progress }),

      addDataset: (dataset) =>
        set((state) => ({
          datasets: [...state.datasets, dataset],
        })),

      removeDataset: (id) =>
        set((state) => ({
          datasets: state.datasets.filter((d) => (d as Record<string, unknown>).id !== id),
        })),
    }),
    {
      name: 'dataset-storage',
    }
  )
)
