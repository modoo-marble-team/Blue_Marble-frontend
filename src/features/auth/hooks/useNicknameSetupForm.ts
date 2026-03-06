import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequireNicknameSetupSession } from './useRequireNicknameSetupSession'
import { mockSetNickname } from '../mockApi'
import {
  createNicknameHelperFeedback,
  VALIDATION_MESSAGE_DEBOUNCE_MS,
} from '../nicknameSetupRules'
import { useAuthStore } from '../store'
import { useNicknameAvailability } from './useNicknameAvailability'

// 닉네임 설정 화면의 입력/검증/제출 상태를 통합 관리
export function useNicknameSetupForm() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const updateNickname = useAuthStore((state) => state.updateNickname)
  const shouldRender = useRequireNicknameSetupSession(session)

  const [nickname, setNickname] = useState('')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNicknameFocused, setIsNicknameFocused] = useState(false)
  const [showValidationMessage, setShowValidationMessage] = useState(false)

  const { nicknameValidation, isCheckingNickname, isNicknameAvailable } =
    useNicknameAvailability(nickname)

  // 입력 직후 안내 메시지 노출을 지연해 깜빡임 완화
  useEffect(() => {
    setShowValidationMessage(false)
    const timer = window.setTimeout(
      () => setShowValidationMessage(true),
      VALIDATION_MESSAGE_DEBOUNCE_MS
    )
    return () => window.clearTimeout(timer)
  }, [nickname])

  // 제출 에러/포커스/검증 상태를 조합해 하단 안내 메시지 계산
  const helperFeedback = useMemo(
    () =>
      createNicknameHelperFeedback({
        submitMessage,
        isNicknameFocused,
        nickname,
        nicknameValidation,
        isCheckingNickname,
        isNicknameAvailable,
        showValidationMessage,
      }),
    [
      isCheckingNickname,
      isNicknameAvailable,
      isNicknameFocused,
      nickname,
      nicknameValidation,
      showValidationMessage,
      submitMessage,
    ]
  )

  // 제출 가능 조건을 단일 불리언으로 통합
  const isSubmitDisabled =
    isSubmitting ||
    !nicknameValidation.ok ||
    isCheckingNickname ||
    isNicknameAvailable !== true

  // 제출 시 형식/중복 상태를 재검증하고 닉네임 저장 요청
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitMessage(null)

    // 세션이 없으면 제출 처리 중단
    if (!session) {
      return
    }

    // 로컬 형식 검증 실패 메시지 우선 노출
    if (!nicknameValidation.ok) {
      setSubmitMessage(`• ${nicknameValidation.message}`)
      return
    }

    // 중복 닉네임이면 제출 차단
    if (isNicknameAvailable === false) {
      setSubmitMessage('• 이미 사용 중인 닉네임입니다.')
      return
    }

    // 중복 검사 진행 중이거나 미완료면 제출 차단
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

    // 서버 저장 실패 메시지 노출
    if (!result.ok) {
      setSubmitMessage(`• ${result.message}`)
      return
    }

    // 저장 성공 시 전역 세션 닉네임 반영 후 로비 이동
    updateNickname(result.nickname)
    navigate('/lobby', { replace: true })
  }

  // 입력 변경 시 제출 에러 초기화 후 값 반영
  function handleNicknameChange(value: string) {
    setSubmitMessage(null)
    setNickname(value)
  }

  // 포커스 진입 상태 반영
  function handleNicknameFocus() {
    setIsNicknameFocused(true)
  }

  // 포커스 이탈 상태 반영
  function handleNicknameBlur() {
    setIsNicknameFocused(false)
  }

  // 홈 이동 버튼 동작 처리
  function handleBackToHome() {
    navigate('/', { replace: true })
  }

  return {
    shouldRender,
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
