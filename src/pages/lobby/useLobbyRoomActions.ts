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
} from '../waiting-room/api/api'
import type { LobbyRoom } from './types'
import type { WaitingRoomSnapshot } from '../waiting-room/api/types'

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
  function enterWaitingRoom(params: {
    roomId: string
    roomTitle: string
    preJoinedSnapshot?: WaitingRoomSnapshot
  }) {
    navigate(`/rooms/${params.roomId}`, {
      state: {
        roomId: params.roomId,
        roomTitle: params.roomTitle,
        preJoinedSnapshot: params.preJoinedSnapshot,
      },
    })
  }

  // waiting-room 진입 전 join 응답 snapshot을 확보해 초기 렌더 기준을 맞춘다.
  async function joinRoomAndEnter(params: {
    roomId: string
    roomTitle: string
    password?: string
  }) {
    if (!session) {
      return null
    }

    const joinedRoomSnapshot = await joinWaitingRoom({
      roomId: params.roomId,
      userId: session.userId,
      nickname: session.nickname,
      fallbackTitle: params.roomTitle,
      password: params.password,
    })

    enterWaitingRoom({
      roomId: params.roomId,
      roomTitle: params.roomTitle,
      preJoinedSnapshot: joinedRoomSnapshot,
    })

    return joinedRoomSnapshot
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
  async function joinRoom(room: LobbyRoom) {
    if (room.isPrivate) {
      setSelectedPrivateRoom(room)
      setPrivateRoomPassword('')
      setIsPrivateRoomPasswordInvalid(false)
      return
    }

    try {
      await joinRoomAndEnter({
        roomId: room.id,
        roomTitle: room.title,
      })
    } catch (error) {
      toast.error(getWaitingRoomErrorMessage(error, '방 입장에 실패했습니다.'))
    }
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

      try {
        await joinRoomAndEnter({
          roomId: createdRoom.roomId,
          roomTitle: createdRoom.roomTitle,
        })
      } catch (error) {
        // 생성은 이미 완료됐으므로 fallback 진입으로 한 번 더 snapshot 복구를 시도한다.
        toast.error(
          getWaitingRoomErrorMessage(error, '방 입장에 실패했습니다.')
        )
        enterWaitingRoom({
          roomId: createdRoom.roomId,
          roomTitle: createdRoom.roomTitle,
        })
      }
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
      await joinRoomAndEnter({
        roomId: selectedPrivateRoom.id,
        roomTitle: selectedPrivateRoom.title,
        password: privateRoomPassword,
      })

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
