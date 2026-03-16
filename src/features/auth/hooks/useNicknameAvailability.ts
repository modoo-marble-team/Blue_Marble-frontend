import { useEffect, useMemo, useState } from 'react'
import { IS_AUTH_MOCK_ENABLED } from '../api'
import { mockCheckNicknameAvailability } from '../mockApi'
import { NICKNAME_CHECK_DEBOUNCE_MS } from '../nicknameSetupRules'
import type { NicknameValidationResult } from '../types'
import { validateNickname } from '../validation'

interface UseNicknameAvailabilityResult {
  nicknameValidation: NicknameValidationResult
  isCheckingNickname: boolean
  isNicknameAvailable: boolean | null
  isAvailabilityCheckSupported: boolean
}

// 닉네임 형식 검증과 중복 검사 상태를 함께 관리
export function useNicknameAvailability(
  nickname: string
): UseNicknameAvailabilityResult {
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<
    boolean | null
  >(null)

  const nicknameValidation = useMemo(
    () => validateNickname(nickname),
    [nickname]
  )

  useEffect(() => {
    setIsCheckingNickname(false)
    setIsNicknameAvailable(null)

    if (!nicknameValidation.ok) {
      return
    }

    if (!IS_AUTH_MOCK_ENABLED) {
      setIsNicknameAvailable(true)
      return
    }

    let isDisposed = false
    const normalizedNickname = nicknameValidation.normalizedNickname
    const debounceTimer = window.setTimeout(async () => {
      setIsCheckingNickname(true)
      const result = await mockCheckNicknameAvailability(normalizedNickname)
      if (isDisposed) {
        return
      }

      setIsCheckingNickname(false)
      if (!result.ok) {
        setIsNicknameAvailable(null)
        return
      }

      setIsNicknameAvailable(result.isAvailable)
    }, NICKNAME_CHECK_DEBOUNCE_MS)

    return () => {
      isDisposed = true
      window.clearTimeout(debounceTimer)
    }
  }, [nicknameValidation.ok, nicknameValidation.normalizedNickname])

  return {
    nicknameValidation,
    isCheckingNickname,
    isNicknameAvailable,
    isAvailabilityCheckSupported: IS_AUTH_MOCK_ENABLED,
  }
}
