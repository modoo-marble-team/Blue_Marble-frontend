import { useEffect, useRef, useState } from 'react'
import { restoreAuthSession, shouldClearAuthSession } from '../api'
import { useAuthStore } from '../store'

interface UseAuthBootstrapParams {
  skip?: boolean
}

// 앱 초기 진입 시 persisted accessToken으로 세션을 1회 복구
export function useAuthBootstrap({
  skip = false,
}: UseAuthBootstrapParams = {}) {
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [isBootstrapping, setIsBootstrapping] = useState(!skip)
  const hasBootstrappedRef = useRef(false)

  useEffect(() => {
    if (skip) {
      hasBootstrappedRef.current = true
      setIsBootstrapping(false)
      return
    }

    if (hasBootstrappedRef.current) {
      return
    }

    hasBootstrappedRef.current = true

    const accessToken = session?.accessToken.trim()
    if (!accessToken) {
      setIsBootstrapping(false)
      return
    }

    let isDisposed = false
    setIsBootstrapping(true)

    restoreAuthSession({
      accessToken,
      fallbackSession: session,
    })
      .then((restoredSession) => {
        if (isDisposed) {
          return
        }

        setSession(restoredSession)
      })
      .catch((error) => {
        if (isDisposed) {
          return
        }

        if (shouldClearAuthSession(error)) {
          clearSession()
        }
      })
      .finally(() => {
        if (isDisposed) {
          return
        }

        setIsBootstrapping(false)
      })

    return () => {
      isDisposed = true
    }
  }, [clearSession, session, setSession, skip])

  return isBootstrapping
}
