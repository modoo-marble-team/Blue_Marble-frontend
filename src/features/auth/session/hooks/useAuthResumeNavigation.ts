import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getMyContext, shouldClearAuthSession } from '../../api/api'
import { disconnectSocketAndClearAuth } from '../../../../lib/socket'
import { useAuthStore } from '../store'
import type { AuthResumeContext, AuthSession } from '../types'

interface UseAuthResumeNavigationParams {
  session: AuthSession | null
  skip?: boolean
}

interface ResumeNavigationState {
  roomId?: string
  roomTitle?: string
  gameId?: string
}

interface ResumeDestination {
  pathname: string
  state?: ResumeNavigationState
}

function buildResumeIdentity(session: AuthSession | null) {
  if (!session || session.needsNicknameSetup) {
    return ''
  }

  return `${session.provider}:${session.userId}`
}

export function resolveResumeDestination(
  context: AuthResumeContext
): ResumeDestination {
  if (context.resumeTarget === 'game' && context.gameId) {
    return {
      pathname: `/game/${context.gameId}`,
      state: {
        gameId: context.gameId,
        roomId: context.roomId ?? undefined,
      },
    }
  }

  if (context.resumeTarget === 'room' && context.roomId) {
    return {
      pathname: `/rooms/${context.roomId}`,
      state: {
        roomId: context.roomId,
        roomTitle: context.roomTitle ?? undefined,
      },
    }
  }

  return {
    pathname: '/lobby',
  }
}

export function useAuthResumeNavigation({
  session,
  skip = false,
}: UseAuthResumeNavigationParams) {
  const navigate = useNavigate()
  const location = useLocation()
  const clearSession = useAuthStore((state) => state.clearSession)
  const [isResolving, setIsResolving] = useState(false)
  const resolvedIdentityRef = useRef('')
  const activeAccessTokenRef = useRef(session?.accessToken.trim() ?? '')

  useEffect(() => {
    activeAccessTokenRef.current = session?.accessToken.trim() ?? ''
  }, [session])

  useEffect(() => {
    const resumeIdentity = buildResumeIdentity(session)
    const accessToken = session?.accessToken.trim() ?? ''

    if (skip || !resumeIdentity || !accessToken) {
      if (!resumeIdentity) {
        resolvedIdentityRef.current = ''
      }
      setIsResolving(false)
      return
    }

    if (resolvedIdentityRef.current === resumeIdentity) {
      setIsResolving(false)
      return
    }

    let isDisposed = false
    setIsResolving(true)

    getMyContext(accessToken)
      .then((context) => {
        if (isDisposed || activeAccessTokenRef.current !== accessToken) {
          return
        }

        resolvedIdentityRef.current = resumeIdentity

        const destination = resolveResumeDestination(context)
        if (location.pathname === destination.pathname) {
          return
        }

        navigate(destination.pathname, {
          replace: true,
          state: destination.state,
        })
      })
      .catch((error) => {
        if (isDisposed || activeAccessTokenRef.current !== accessToken) {
          return
        }

        resolvedIdentityRef.current = resumeIdentity

        if (shouldClearAuthSession(error)) {
          clearSession()
          disconnectSocketAndClearAuth()
          navigate('/', { replace: true })
          return
        }

        if (location.pathname === '/') {
          navigate('/lobby', { replace: true })
        }
      })
      .finally(() => {
        if (isDisposed || activeAccessTokenRef.current !== accessToken) {
          return
        }

        setIsResolving(false)
      })

    return () => {
      isDisposed = true
    }
  }, [clearSession, location.pathname, navigate, session, skip])

  return isResolving
}
