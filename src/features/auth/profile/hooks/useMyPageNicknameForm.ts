import { useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { setNickname as submitNickname } from '../../api/api'
import {
  createNicknameHelperFeedback,
  VALIDATION_MESSAGE_DEBOUNCE_MS,
  type NicknameHelperFeedback,
} from '../../nickname/nicknameSetupRules'
import { useNicknameAvailability } from '../../nickname/hooks/useNicknameAvailability'
import { useAuthStore } from '../../session/store'
import type { AuthSession, MyPageProfile } from '../../session/types'
import { getMyPageProfileQueryKey } from './useMyPageProfileQuery'

interface UseMyPageNicknameFormParams {
  session: AuthSession | null
  profile: MyPageProfile | null
}

function createCurrentNicknameFeedback(): NicknameHelperFeedback {
  return {
    message: '• 현재 사용 중인 닉네임입니다.',
    tone: 'default',
  }
}

// 마이페이지 인라인 닉네임 편집/검증/저장을 관리한다.
export function useMyPageNicknameForm({
  session,
  profile,
}: UseMyPageNicknameFormParams) {
  const queryClient = useQueryClient()
  const updateNickname = useAuthStore((state) => state.updateNickname)

  const [draftNickname, setDraftNickname] = useState(profile?.nickname ?? '')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isNicknameFocused, setIsNicknameFocused] = useState(false)
  const [showValidationMessage, setShowValidationMessage] = useState(false)

  const {
    nicknameValidation,
    isCheckingNickname,
    isNicknameAvailable,
    isAvailabilityCheckSupported,
  } = useNicknameAvailability(draftNickname)

  const currentNickname = profile?.nickname.trim() ?? ''
  const isCurrentNickname =
    nicknameValidation.normalizedNickname.length > 0 &&
    nicknameValidation.normalizedNickname === currentNickname

  useEffect(() => {
    if (!isEditing) {
      setDraftNickname(profile?.nickname ?? '')
      setSubmitMessage(null)
    }
  }, [isEditing, profile?.nickname])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    setShowValidationMessage(false)
    const timer = window.setTimeout(
      () => setShowValidationMessage(true),
      VALIDATION_MESSAGE_DEBOUNCE_MS
    )

    return () => window.clearTimeout(timer)
  }, [draftNickname, isEditing])

  const helperFeedback = useMemo(() => {
    if (submitMessage) {
      return {
        message: submitMessage,
        tone: 'danger' as const,
      }
    }

    if (nicknameValidation.ok && isCurrentNickname) {
      return createCurrentNicknameFeedback()
    }

    return createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused,
      nickname: draftNickname,
      nicknameValidation,
      isCheckingNickname,
      isNicknameAvailable,
      isAvailabilityCheckSupported,
      showValidationMessage,
    })
  }, [
    draftNickname,
    isAvailabilityCheckSupported,
    isCheckingNickname,
    isCurrentNickname,
    isNicknameAvailable,
    isNicknameFocused,
    nicknameValidation,
    showValidationMessage,
    submitMessage,
  ])

  const isSaveDisabled =
    !isEditing ||
    isSubmitting ||
    !nicknameValidation.ok ||
    isCurrentNickname ||
    (isAvailabilityCheckSupported &&
      (isCheckingNickname || isNicknameAvailable !== true))

  function startEditing() {
    setDraftNickname(profile?.nickname ?? '')
    setSubmitMessage(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraftNickname(profile?.nickname ?? '')
    setSubmitMessage(null)
    setIsNicknameFocused(false)
    setIsEditing(false)
  }

  function handleNicknameChange(value: string) {
    setSubmitMessage(null)
    setDraftNickname(value)
  }

  function handleNicknameFocus() {
    setIsNicknameFocused(true)
  }

  function handleNicknameBlur() {
    setIsNicknameFocused(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitMessage(null)

    if (!session || !profile) {
      return
    }

    if (!nicknameValidation.ok) {
      setSubmitMessage(`• ${nicknameValidation.message}`)
      return
    }

    if (isCurrentNickname) {
      return
    }

    if (isAvailabilityCheckSupported && isNicknameAvailable === false) {
      setSubmitMessage('• 이미 사용 중인 닉네임입니다.')
      return
    }

    if (
      isAvailabilityCheckSupported &&
      (isNicknameAvailable !== true || isCheckingNickname)
    ) {
      setSubmitMessage('• 닉네임 중복 확인이 완료될 때까지 기다려 주세요.')
      return
    }

    setIsSubmitting(true)
    const result = await submitNickname({
      session,
      nickname: nicknameValidation.normalizedNickname,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitMessage(`• ${result.message}`)
      return
    }

    updateNickname(result.nickname)
    queryClient.setQueryData<MyPageProfile | undefined>(
      getMyPageProfileQueryKey(session.userId),
      (currentProfile) =>
        (currentProfile ?? profile)
          ? {
              ...(currentProfile ?? profile),
              nickname: result.nickname,
            }
          : currentProfile
    )
    setDraftNickname(result.nickname)
    setSubmitMessage(null)
    setIsNicknameFocused(false)
    setIsEditing(false)
  }

  return {
    draftNickname,
    helperFeedback,
    isEditing,
    isSubmitting,
    isSaveDisabled,
    startEditing,
    cancelEditing,
    handleNicknameChange,
    handleNicknameFocus,
    handleNicknameBlur,
    handleSubmit,
  }
}
