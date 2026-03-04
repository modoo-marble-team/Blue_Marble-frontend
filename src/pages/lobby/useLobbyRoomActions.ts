import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import type { AuthSession } from '../../features/auth/types'
import type { CreateRoomFormValues } from './CreateRoomModal'
import {
  createWaitingRoom,
  getWaitingRoomErrorMessage,
  isJoinPasswordMismatchError,
  joinWaitingRoom,
} from '../waiting-room/api'
import type { LobbyRoom } from './types'
import type { WaitingRoomSnapshot } from '../waiting-room/types'

// 로비 방 생성/입장 액션 훅 입력값 타입
interface UseLobbyRoomActionsParams {
  session: AuthSession | null
}

// 방 생성/입장/비밀방 모달 상태와 액션을 통합 관리
export function useLobbyRoomActions({ session }: UseLobbyRoomActionsParams) {
  const navigate = useNavigate()
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false)
  const [isCreateRoomPending, setIsCreateRoomPending] = useState(false)
  const [selectedPrivateRoom, setSelectedPrivateRoom] =
    useState<LobbyRoom | null>(null)
  const [privateRoomPassword, setPrivateRoomPassword] = useState('')
  const [isPrivateRoomJoinPending, setIsPrivateRoomJoinPending] =
    useState(false)
  const [isPrivateRoomPasswordInvalid, setIsPrivateRoomPasswordInvalid] =
    useState(false)

  // 대기방 페이지로 이동하면서 roomId/title/snapshot을 전달
  function enterWaitingRoom(
    room: LobbyRoom,
    preJoinedSnapshot?: WaitingRoomSnapshot
  ) {
    navigate(`/rooms/${room.id}`, {
      state: {
        roomId: room.id,
        roomTitle: room.title,
        preJoinedSnapshot,
      },
    })
  }

  // 방 생성 모달 열기
  function openCreateRoomModal() {
    setIsCreateRoomModalOpen(true)
  }

  // 방 생성 요청 중에는 모달 닫기를 막아 중복 동작 방지
  function closeCreateRoomModal() {
    if (isCreateRoomPending) {
      return
    }

    setIsCreateRoomModalOpen(false)
  }

  // 비밀방은 비밀번호 모달을 열고, 일반방은 바로 입장 처리
  function joinRoom(room: LobbyRoom) {
    if (room.isPrivate) {
      setSelectedPrivateRoom(room)
      setPrivateRoomPassword('')
      setIsPrivateRoomPasswordInvalid(false)
      return
    }

    enterWaitingRoom(room)
  }

  // 비밀방 모달 상태 초기화 후 닫기
  function closePrivateRoomModal() {
    setSelectedPrivateRoom(null)
    setPrivateRoomPassword('')
    setIsPrivateRoomPasswordInvalid(false)
  }

  // 비밀번호 입력 변경 시 값 반영 + 오류 상태 해제
  function changePrivateRoomPassword(password: string) {
    setPrivateRoomPassword(password)

    if (isPrivateRoomPasswordInvalid) {
      setIsPrivateRoomPasswordInvalid(false)
    }
  }

  // 방 생성 API를 호출하고 성공 시 생성된 대기방으로 이동
  async function submitCreateRoom(values: CreateRoomFormValues) {
    // 세션이 없으면 생성 요청을 보내지 않음
    if (!session) {
      return
    }

    setIsCreateRoomPending(true)

    try {
      const createdRoom = await createWaitingRoom({
        title: values.title,
        isPrivate: values.isPrivate,
        password: values.password,
        hostUserId: session.userId,
        hostNickname: session.nickname,
      })

      setIsCreateRoomModalOpen(false)
      navigate(`/rooms/${createdRoom.roomId}`, {
        state: {
          roomId: createdRoom.roomId,
          roomTitle: createdRoom.roomTitle,
          preJoinedSnapshot: createdRoom.preJoinedSnapshot,
        },
      })
    } catch (error) {
      toast.error(getWaitingRoomErrorMessage(error, '방 생성에 실패했습니다.'))
    } finally {
      setIsCreateRoomPending(false)
    }
  }

  // 비밀방 비밀번호 검증 입장 요청 처리
  async function submitPrivateRoomJoin() {
    if (!selectedPrivateRoom || !session) {
      return
    }

    setIsPrivateRoomJoinPending(true)

    try {
      const joinedRoomSnapshot = await joinWaitingRoom({
        roomId: selectedPrivateRoom.id,
        userId: session.userId,
        nickname: session.nickname,
        fallbackTitle: selectedPrivateRoom.title,
        password: privateRoomPassword,
      })

      enterWaitingRoom(selectedPrivateRoom, joinedRoomSnapshot)
      closePrivateRoomModal()
    } catch (error) {
      // 비밀번호 불일치 에러는 인풋 에러 상태를 별도 표시
      if (isJoinPasswordMismatchError(error)) {
        setIsPrivateRoomPasswordInvalid(true)
      }

      toast.error(
        getWaitingRoomErrorMessage(error, '비밀방 입장에 실패했습니다.')
      )
    } finally {
      setIsPrivateRoomJoinPending(false)
    }
  }

  return {
    isCreateRoomModalOpen,
    isCreateRoomPending,
    selectedPrivateRoom,
    privateRoomPassword,
    isPrivateRoomJoinPending,
    isPrivateRoomPasswordInvalid,
    openCreateRoomModal,
    closeCreateRoomModal,
    joinRoom,
    closePrivateRoomModal,
    changePrivateRoomPassword,
    submitCreateRoom,
    submitPrivateRoomJoin,
  }
}
