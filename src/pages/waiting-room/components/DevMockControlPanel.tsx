import { useState } from 'react'
import { getWaitingRoomErrorMessage } from '../api'
import {
  mockDevAddWaitingRoomParticipant,
  mockDevGetWaitingRoomSnapshot,
  mockDevRemoveWaitingRoomParticipant,
  mockDevResetWaitingRoom,
  mockDevSeedStartCondition,
  mockDevSetAllNonHostReady,
  mockDevTransferWaitingRoomHost,
} from '../mockGateway'
import type { WaitingRoomSnapshot } from '../types'

const IS_DEV_MOCK_CONTROL_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

// DEV 목 제어 패널 입력값 타입
interface DevMockControlPanelProps {
  roomId: string
  currentUserId: string
  currentNickname: string
  onApplySnapshot: (snapshot: WaitingRoomSnapshot) => void
  onError: (message: string) => void
}

// DEV 환경에서만 방 상태를 수동 제어하는 디버그 패널
export function DevMockControlPanel({
  roomId,
  currentUserId,
  currentNickname,
  onApplySnapshot,
  onError,
}: DevMockControlPanelProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  if (!IS_DEV_MOCK_CONTROL_ENABLED || !roomId) {
    return null
  }

  // 액션 실행 결과 스냅샷을 화면에 반영하고 에러를 공통 처리
  function runAction(actionName: string, action: () => WaitingRoomSnapshot) {
    setPendingAction(actionName)

    try {
      const snapshot = action()
      onApplySnapshot(snapshot)
    } catch (error) {
      onError(getWaitingRoomErrorMessage(error, 'DEV 목 제어에 실패했습니다.'))
    } finally {
      setPendingAction(null)
    }
  }

  const isDisabled = pendingAction !== null

  return (
    <aside className="fixed bottom-4 left-4 z-50 w-[250px] rounded-2xl border border-ui-border bg-white/95 p-3 shadow-xl backdrop-blur">
      <h3 className="text-xs font-extrabold tracking-wide text-ui-text-main">
        DEV MOCK CONTROL
      </h3>
      <p className="mt-1 text-[11px] text-ui-text-sub">{roomId}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('sync', () => mockDevGetWaitingRoomSnapshot(roomId))
          }}
          className="rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
        >
          동기화
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('add', () => mockDevAddWaitingRoomParticipant(roomId))
          }}
          className="rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
        >
          참가자 +1
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('remove', () =>
              mockDevRemoveWaitingRoomParticipant(roomId, currentUserId)
            )
          }}
          className="rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
        >
          참가자 -1
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('seed', () => mockDevSeedStartCondition(roomId))
          }}
          className="rounded-lg bg-ui-brand px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          시작조건
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('ready-all', () =>
              mockDevSetAllNonHostReady(roomId, true)
            )
          }}
          className="col-span-2 rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
        >
          non-host 전원 준비
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('ready-none', () =>
              mockDevSetAllNonHostReady(roomId, false)
            )
          }}
          className="col-span-2 rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
        >
          non-host 준비 해제
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('transfer-host', () =>
              mockDevTransferWaitingRoomHost(roomId)
            )
          }}
          className="col-span-2 rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
        >
          방장 넘기기
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            runAction('reset-room', () =>
              mockDevResetWaitingRoom(roomId, currentUserId, currentNickname)
            )
          }}
          className="col-span-2 rounded-lg border border-ui-danger-border bg-ui-danger-bg px-2 py-1.5 text-xs font-semibold text-ui-danger disabled:opacity-50"
        >
          방 초기화
        </button>
      </div>
    </aside>
  )
}
