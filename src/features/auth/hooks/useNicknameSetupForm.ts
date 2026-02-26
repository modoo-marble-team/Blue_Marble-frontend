import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  mockCheckNicknameAvailability,
  mockSetNickname,
  validateNickname,
} from '../mockApi'
import {
  createNicknameHelperFeedback,
  NICKNAME_CHECK_DEBOUNCE_MS,
} from '../nicknameSetupRules'
import { useAuthStore } from '../store'

export function useNicknameSetupForm() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const updateNickname = useAuthStore((state) => state.updateNickname)

  const [nickname, setNickname] = useState('')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNicknameFocused, setIsNicknameFocused] = useState(false)
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<
    boolean | null
  >(null)

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    if (!session.needsNicknameSetup) {
      navigate('/lobby', { replace: true })
    }
  }, [navigate, session])

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
  }, [nicknameValidation])

  const helperFeedback = useMemo(
    () =>
      createNicknameHelperFeedback({
        submitMessage,
        isNicknameFocused,
        nickname,
        nicknameValidation,
        isCheckingNickname,
        isNicknameAvailable,
      }),
    [
      isCheckingNickname,
      isNicknameAvailable,
      isNicknameFocused,
      nickname,
      nicknameValidation,
      submitMessage,
    ]
  )

  const isSubmitDisabled =
    isSubmitting ||
    !nicknameValidation.ok ||
    isCheckingNickname ||
    isNicknameAvailable !== true

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitMessage(null)

    if (!session) {
      return
    }

    if (!nicknameValidation.ok) {
      setSubmitMessage(`• ${nicknameValidation.message}`)
      return
    }

    if (isNicknameAvailable === false) {
      setSubmitMessage('• 이미 사용 중인 닉네임입니다.')
      return
    }

    if (isNicknameAvailable !== true || isCheckingNickname) {
      setSubmitMessage('• 닉네임 중복 확인이 완료될 때까지 기다려 주세요.')
      return
    }

    setIsSubmitting(true)
    const result = await mockSetNickname({
      session,
      nickname: nicknameValidation.normalizedNickname,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitMessage(`• ${result.message}`)
      return
    }

    updateNickname(result.nickname)
    navigate('/lobby', { replace: true })
  }

  function handleNicknameChange(value: string) {
    setSubmitMessage(null)
    setNickname(value)
  }

  function handleNicknameFocus() {
    setIsNicknameFocused(true)
  }

  function handleNicknameBlur() {
    setIsNicknameFocused(false)
  }

  function handleBackToHome() {
    navigate('/', { replace: true })
  }

  return {
    shouldRender: Boolean(session && session.needsNicknameSetup),
    nickname,
    helperFeedback,
    isSubmitting,
    isSubmitDisabled,
    handleSubmit,
    handleNicknameChange,
    handleNicknameFocus,
    handleNicknameBlur,
    handleBackToHome,
  }
}
