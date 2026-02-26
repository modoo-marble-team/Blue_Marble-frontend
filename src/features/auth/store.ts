import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthSession } from './types'

interface AuthStoreState {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  clearSession: () => void
  updateNickname: (nickname: string) => void
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      updateNickname: (nickname) =>
        set((state) => {
          if (!state.session) {
            return state
          }

          return {
            session: {
              ...state.session,
              nickname,
              needsNicknameSetup: false,
            },
          }
        }),
    }),
    {
      name: 'marble-pop-auth-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
