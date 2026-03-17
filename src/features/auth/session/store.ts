import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthSession } from './types'

// 인증 세션 스토어 상태/액션 타입 정의
interface AuthStoreState {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  clearSession: () => void
  updateNickname: (nickname: string) => void
}

// 인증 세션을 localStorage에 영속화하는 zustand 스토어 생성
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      // 세션이 있을 때만 닉네임과 초기 설정 플래그를 갱신
      updateNickname: (nickname) =>
        set((state) => {
          // 세션이 없으면 상태 변경 없이 그대로 반환
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
