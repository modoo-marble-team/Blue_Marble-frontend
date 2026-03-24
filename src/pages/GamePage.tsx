import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import BoardGame, { BoardGameHandle } from '../components/board/GameBoard'
import RollButton from '../components/game/controls/RollButton'
import ExitGameModal from '../components/game/modals/ExitGameModal'
import { isPromptHandledByBoardModal } from '../components/game/modals/promptModalMapping'
import PlayerPanel from '../components/game/panels/PlayerPanel'
import GlobalEffectModal from '../components/game/GlobalEffectModal'
import GlobalEffectOverlay from '../components/game/GlobalEffectOverlay'
import { IS_SOCKET_MOCK_ENABLED } from '../config/env'
import { useAuthStore } from '../features/auth/session/store'
import { DevRoomChatControlPanel } from '../features/room-chat/DevRoomChatControlPanel'
import RoomChat from '../features/room-chat/RoomChat'
import { useDiceRoll } from '../hooks/game/useDiceRoll'
import { useGameState } from '../hooks/game/useGameState'
import { useTurn } from '../hooks/game/useTurn'
import { playBgm, stopBgm } from '../lib/bgm'
import { socket } from '../lib/socket'
import {
  emitGameAction,
  emitPromptResponse,
} from '../services/socket/game.handler'
import { useGameStore } from '../stores/game.store'
import type { GamePromptChoice } from '../types/domain'
import {
  findBoardCurrentPlayerIndex,
  mapStorePlayersToBoardPlayers,
  mapStoreTilesToBoardTiles,
} from './game/gameViewModel'
import {
  consumePendingGameChatEcho,
  createOptimisticGameChatMessage,
  mapGameChatEventToMessage,
  reconcileGameChatMessages,
  type PendingGameChatEcho,
} from './game/gameChat'
import { getGameLeaveErrorMessage, leaveRoomFromGame } from './game/api'
import { sendWaitingRoomChat } from './waiting-room/socket/socket'
import type { ChatEventPayload } from './waiting-room/api/types'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED
const ALLOW_ALL_MOCK_TURNS =
  import.meta.env.DEV && import.meta.env.VITE_ALLOW_ALL_MOCK_TURNS === 'true'

const GAME_CHAT_TITLE = '실시간 채팅'

const DEFAULT_MOCK_PLAYER_ID = 'mock-player-1'
const DEFAULT_MOCK_NICKNAME = '플레이어 1'
const DEFAULT_GUEST_ID = 'guest-local'
const MOCK_LOCAL_PLAYER_INDEX = 0
const FATAL_GAME_ROUTE_ERROR_CODES = new Set([
  'GAME_NOT_FOUND',
  'NOT_GAME_MEMBER',
  'INVALID_GAME_ID',
])
const FALLBACK_PROMPT_CHOICES: GamePromptChoice[] = [
  {
    id: 'confirm',
    label: 'Confirm',
    value: 'confirm',
  },
]

interface GamePageLocationState {
  roomId?: string
  gameId?: string
}

const GamePage: React.FC = () => {
  const { gameId: routeGameId } = useParams<{ gameId: string }>()
  const location = useLocation()
  const locationState = location.state as GamePageLocationState | null
  const navigate = useNavigate()
  const authSession = useAuthStore((state) => state.session)
  const currentPlayerId = useGameStore((s) => s.currentPlayerId)
  const currentTurn = useGameStore((s) => s.currentTurn)
  const phase = useGameStore((s) => s.phase)
  const messages = useGameStore((s) => s.messages)
  const storePlayers = useGameStore((s) => s.players)
  const storeTiles = useGameStore((s) => s.tiles)
  const gameResult = useGameStore((s) => s.gameResult)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const winnerId = useGameStore((s) => s.winnerId)
  const round = useGameStore((s) => s.round)
  const prompt = useGameStore((s) => s.prompt)
  const pendingAction = useGameStore((s) => s.pendingAction)
  const lastAck = useGameStore((s) => s.lastAck)
  const lastError = useGameStore((s) => s.lastError)
  const gameSession = useGameStore((s) => s.session)
  const storeGameId = useGameStore((s) => s.gameId)
  const clearPrompt = useGameStore((s) => s.clearPrompt)
  const setLastError = useGameStore((s) => s.setLastError)
  const activeGlobalEffect = useGameStore((s) => s.activeGlobalEffect)
  const resetGame = useGameStore((s) => s.resetGame)
  const activeGameId =
    locationState?.gameId ??
    routeGameId ??
    storeGameId ??
    gameSession.gameId ??
    null
  const activeRoomId = locationState?.roomId ?? gameSession.roomId ?? null
  const [promptSubmittingChoice, setPromptSubmittingChoice] = useState<
    string | null
  >(null)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  const [isLeavePending, setIsLeavePending] = useState(false)
  const [isGlobalEffectModalOpen, setIsGlobalEffectModalOpen] = useState(false)
  const previousGlobalEffectRef = useRef(activeGlobalEffect)
  const [isRecoveringFromFatalGameRoute, setIsRecoveringFromFatalGameRoute] =
    useState(false)
  const boardRef = useRef<BoardGameHandle>(null)
  const pendingGameChatEchoesRef = useRef<PendingGameChatEcho[]>([])

  // 🎵 배경음악 (BGM) — 게임 진입 시 즉시 재생, 퇴장 시 정지
  useEffect(() => {
    playBgm()
    return () => {
      stopBgm()
    }
  }, [])

  useGameState(activeGameId)

  useEffect(() => {
    if (
      activeGlobalEffect &&
      (!previousGlobalEffectRef.current ||
        previousGlobalEffectRef.current.effect !== activeGlobalEffect.effect ||
        activeGlobalEffect.duration > previousGlobalEffectRef.current.duration)
    ) {
      setIsGlobalEffectModalOpen(true)
    }
    previousGlobalEffectRef.current = activeGlobalEffect
  }, [activeGlobalEffect])

  const currentUserId =
    authSession?.userId ??
    (USE_GAME_SOCKET_MOCK ? DEFAULT_MOCK_PLAYER_ID : null)
  const currentNickname =
    authSession?.nickname ??
    (USE_GAME_SOCKET_MOCK ? DEFAULT_MOCK_NICKNAME : 'Guest')
  const effectiveCurrentTurn = currentPlayerId ?? currentTurn
  const normalizedCurrentTurn =
    USE_GAME_SOCKET_MOCK &&
    (effectiveCurrentTurn === 'me' ||
      effectiveCurrentTurn === DEFAULT_MOCK_PLAYER_ID) &&
    currentUserId
      ? currentUserId
      : effectiveCurrentTurn

  const boardPlayers = useMemo(
    () => mapStorePlayersToBoardPlayers(storePlayers),
    [storePlayers]
  )
  const boardCurPlayer = useMemo(
    () => findBoardCurrentPlayerIndex(storePlayers, normalizedCurrentTurn),
    [normalizedCurrentTurn, storePlayers]
  )
  const normalizedTilesForBoard = useMemo(
    () => mapStoreTilesToBoardTiles(storeTiles, storePlayers, boardPlayers),
    [boardPlayers, storePlayers, storeTiles]
  )
  const isMyTurnFromStore = useTurn(normalizedCurrentTurn, currentUserId)
  const isMyTurn = USE_GAME_SOCKET_MOCK
    ? ALLOW_ALL_MOCK_TURNS || boardCurPlayer === MOCK_LOCAL_PLAYER_INDEX
    : isMyTurnFromStore
  const isPromptTargetedToCurrentUser =
    prompt?.playerId == null ||
    (currentUserId != null && String(prompt.playerId) === String(currentUserId))
  const isPromptVisible = Boolean(prompt && isPromptTargetedToCurrentUser)
  const isBoardHandledPrompt = isPromptHandledByBoardModal(prompt)
  const activeBoardPrompt =
    isPromptVisible && isBoardHandledPrompt ? prompt : null
  const promptChoices = useMemo(
    () =>
      prompt?.choices && prompt.choices.length > 0
        ? prompt.choices
        : FALLBACK_PROMPT_CHOICES,
    [prompt]
  )
  const isActionPending = pendingAction !== null

  useEffect(() => {
    if (!prompt) {
      setPromptSubmittingChoice(null)
      return
    }

    if (lastAck?.promptId === prompt.id) {
      clearPrompt(prompt.id)
      setPromptSubmittingChoice(null)
    }
  }, [clearPrompt, lastAck?.promptId, prompt])

  useEffect(() => {
    if (!lastError) {
      return
    }

    setPromptSubmittingChoice(null)
  }, [lastError])

  useEffect(() => {
    if (!activeRoomId) {
      return
    }

    const handleChat = (payload: ChatEventPayload) => {
      if (payload.room_id !== activeRoomId) {
        return
      }

      const nextMessage = mapGameChatEventToMessage(payload)
      const consumedPendingEcho = consumePendingGameChatEcho({
        pendingEchoes: pendingGameChatEchoesRef.current,
        incomingMessage: nextMessage,
        currentUserId,
      })

      pendingGameChatEchoesRef.current = consumedPendingEcho.pendingEchoes

      useGameStore.setState((state) => ({
        messages: reconcileGameChatMessages({
          previousMessages: state.messages,
          incomingMessage: nextMessage,
          matchedPendingId: consumedPendingEcho.matchedPendingId,
        }),
      }))
    }

    socket.on('chat', handleChat)

    return () => {
      socket.off('chat', handleChat)
    }
  }, [activeRoomId, currentUserId])

  const handleSendMessage = (content: string) => {
    if (!activeRoomId) {
      return
    }

    const senderId = currentUserId ?? DEFAULT_GUEST_ID
    const optimisticMessage = createOptimisticGameChatMessage({
      roomId: activeRoomId,
      senderId,
      senderNickname: currentNickname,
      message: content,
    })

    pendingGameChatEchoesRef.current = [
      ...pendingGameChatEchoesRef.current,
      {
        id: optimisticMessage.id,
        senderId,
        content,
        createdAtMs: Date.parse(optimisticMessage.timestamp),
      },
    ]

    useGameStore.getState().addMessage(optimisticMessage)

    sendWaitingRoomChat({
      roomId: activeRoomId,
      senderId,
      senderNickname: currentNickname,
      message: content,
    })
  }

  const diceRoll = useDiceRoll()

  const playerTotalAssetsMap = useMemo(
    () =>
      new Map(
        boardPlayers.map((player, index) => [
          player.id,
          storePlayers[index]?.totalAssets,
        ])
      ),
    [boardPlayers, storePlayers]
  )
  const maxMoney = Math.max(...boardPlayers.map((player) => player.money))
  const currentPlayerState = boardPlayers[boardCurPlayer]
  const isCurrentPlayerBankrupt =
    currentPlayerState?.money <= 0 || currentPlayerState?.state === 'bankrupt'
  const isRollPhase = phase === 'rolling'
  const isEndTurnPhase = phase === 'resolving' && !prompt
  const canControlTurn =
    isMyTurn &&
    !isActionPending &&
    !isPromptVisible &&
    !isCurrentPlayerBankrupt &&
    (isRollPhase || isEndTurnPhase)
  const rollButtonMode: 'roll' | 'end_turn' = isEndTurnPhase
    ? 'end_turn'
    : 'roll'
  const canManageAssetsThisTurn =
    isMyTurn &&
    !isActionPending &&
    !isPromptVisible &&
    !isCurrentPlayerBankrupt &&
    (phase === 'rolling' || phase === 'resolving')
  const roomChatSenderOptions = useMemo(
    () =>
      storePlayers.map((player) => ({
        id: String(player.id),
        nickname: player.nickname,
      })),
    [storePlayers]
  )
  const currentUserIdForChat =
    currentUserId == null ? undefined : String(currentUserId)
  const preferredRoomChatSenderId =
    roomChatSenderOptions.find(
      (senderOption) => senderOption.id !== currentUserIdForChat
    )?.id ?? roomChatSenderOptions[0]?.id
  const handlePromptChoice = (
    choice: string,
    payload?: Record<string, unknown>
  ) => {
    if (!prompt || promptSubmittingChoice !== null) {
      return
    }

    setPromptSubmittingChoice(choice)
    emitPromptResponse({
      gameId: activeGameId,
      promptId: prompt.id,
      choice,
      payload,
    })
  }
  const dismissLastError = () => {
    setLastError(null)
  }
  const handleExitConfirm = async () => {
    if (isLeavePending) {
      return
    }

    if (!activeRoomId) {
      resetGame()
      setIsExitModalOpen(false)
      navigate('/lobby', { replace: true })
      return
    }

    setIsLeavePending(true)

    try {
      await leaveRoomFromGame({
        roomId: activeRoomId,
        userId: currentUserId ?? undefined,
      })

      resetGame()
      setIsExitModalOpen(false)
      navigate('/lobby', { replace: true })
    } catch (error) {
      toast.error(
        getGameLeaveErrorMessage(error, '게임 나가기에 실패했습니다.')
      )
    } finally {
      setIsLeavePending(false)
    }
  }

  const handleGameResultConfirm = () => {
    resetGame()

    if (activeRoomId) {
      navigate(`/rooms/${activeRoomId}`, {
        replace: true,
        state: {
          roomId: activeRoomId,
        },
      })
      return
    }

    navigate('/lobby', { replace: true })
  }

  const handleRollClick = () => {
    if (
      !isMyTurn ||
      isActionPending ||
      isPromptVisible ||
      isCurrentPlayerBankrupt
    ) {
      return
    }
    if (!isRollPhase) {
      return
    }
    if (!activeGameId) {
      return
    }
    if (!USE_GAME_SOCKET_MOCK && !socket.connected) {
      return
    }

    boardRef.current?.rollDice()
    new Audio('/audio/dice-roll.mp3').play().catch(() => {})
    diceRoll(activeGameId)
  }

  const handleEndTurnClick = () => {
    if (
      !isMyTurn ||
      isActionPending ||
      isPromptVisible ||
      isCurrentPlayerBankrupt
    ) {
      return
    }
    if (!isEndTurnPhase) {
      return
    }
    if (!activeGameId || pendingAction !== null) {
      return
    }
    if (!USE_GAME_SOCKET_MOCK && !socket.connected) {
      return
    }

    emitGameAction({
      type: 'END_TURN',
      gameId: activeGameId,
    })
  }

  const isFatalGameRouteError =
    lastError != null && FATAL_GAME_ROUTE_ERROR_CODES.has(lastError.code)
  const hasFinishedGameState =
    isGameOver || phase === 'finished' || gameResult != null

  useEffect(() => {
    if (!isFatalGameRouteError || hasFinishedGameState) {
      return
    }

    setIsRecoveringFromFatalGameRoute(true)

    resetGame()

    if (activeRoomId) {
      navigate(`/rooms/${activeRoomId}`, {
        replace: true,
        state: {
          roomId: activeRoomId,
        },
      })
      return
    }

    navigate('/lobby', { replace: true })
  }, [
    activeRoomId,
    hasFinishedGameState,
    isFatalGameRouteError,
    navigate,
    resetGame,
  ])

  const isWaitingForServerState =
    !USE_GAME_SOCKET_MOCK &&
    !hasFinishedGameState &&
    !isFatalGameRouteError &&
    !isRecoveringFromFatalGameRoute &&
    storePlayers.length === 0

  if (
    (isFatalGameRouteError || isRecoveringFromFatalGameRoute) &&
    !hasFinishedGameState
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-ui-app-bg font-['Inter']">
        <div className="text-lg font-bold text-[#45556C]">
          참가 정보를 다시 확인하고 있습니다...
        </div>
      </div>
    )
  }

  if (isWaitingForServerState) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-ui-app-bg font-['Inter']">
        <div className="text-lg font-bold text-[#45556C]">게임 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-ui-app-bg px-6 font-['Inter']">
      <div className="pointer-events-none absolute inset-0 z-0">
        <img
          src="/GamePage_background.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.34),transparent_30%),linear-gradient(180deg,rgba(250,248,240,0.38),rgba(250,248,240,0.5))]" />
      </div>
      <div className="absolute left-6 top-6 z-70">
        <button
          type="button"
          aria-label="나가기"
          onClick={() => setIsExitModalOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/80 text-[#45556C] shadow-sm transition-colors hover:bg-white"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      <div className="absolute right-6 top-6 z-20 flex w-85 flex-col gap-2">
        {isActionPending && (
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#1D4ED8]">
            Pending action: {pendingAction.type}
          </div>
        )}
        {lastAck && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              lastAck.ok
                ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
            }`}
          >
            {lastAck.ok ? 'Action acknowledged' : 'Action rejected'} (
            {lastAck.type ?? 'UNKNOWN'})
          </div>
        )}
        {lastError && (
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]">
            <div className="font-semibold">{lastError.code}</div>
            <div className="mt-1">{lastError.message}</div>
            <button
              type="button"
              onClick={dismissLastError}
              className="mt-2 rounded-lg border border-[#FCA5A5] bg-white px-2 py-1 text-[11px] font-semibold text-[#B91C1C] transition-colors hover:bg-[#FEE2E2]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full items-center justify-between gap-8 pb-12 pt-4">
        <div className="flex h-[80%] min-h-0 w-[320px] shrink-0 flex-col">
          <RoomChat
            title={GAME_CHAT_TITLE}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={currentUserId ?? DEFAULT_GUEST_ID}
            notice={
              (round ?? 1) > 1 ? undefined : '게임 시작! 순서를 정했습니다.'
            }
          />
        </div>

        <div className="flex shrink-0 flex-1 items-center justify-center">
          <div
            className="aspect-square w-full overflow-hidden rounded-[48px] border-white shadow-[0_50px_100px_-20px_rgba(30,58,138,0.3)]"
            style={{
              maxWidth: 'min(1380px, calc(100vh - 140px), calc(100vw - 660px))',
              borderWidth: '8px',
            }}
          >
            <BoardGame
              ref={boardRef}
              gameId={activeGameId}
              players={boardPlayers}
              curPlayer={boardCurPlayer}
              round={round}
              suppressDiceTimerModal={isExitModalOpen}
              tiles={normalizedTilesForBoard}
              activePrompt={activeBoardPrompt}
              promptSubmittingChoice={promptSubmittingChoice}
              onPromptChoice={handlePromptChoice}
              localPlayerId={currentUserId}
              gamePhase={phase}
              allowAssetActions={canManageAssetsThisTurn}
              gameResult={gameResult}
              isGameOver={isGameOver}
              winnerId={winnerId}
              onGameResultConfirm={handleGameResultConfirm}
            />
          </div>
        </div>

        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {[...boardPlayers]
            .map((player, index) => ({
              ...player,
              originalIndex: index,
              totalAssets: playerTotalAssetsMap.get(player.id) ?? player.money,
            }))
            .sort((left, right) => {
              const leftBankrupt = left.money <= 0 ? 1 : 0
              const rightBankrupt = right.money <= 0 ? 1 : 0
              if (leftBankrupt !== rightBankrupt) {
                return leftBankrupt - rightBankrupt
              }

              if (left.money !== right.money) {
                return right.money - left.money
              }

              return left.originalIndex - right.originalIndex
            })
            .map((player) => (
              <PlayerPanel
                key={player.id}
                player={{
                  id: String(player.id),
                  name: player.name ?? `Player ${player.id + 1}`,
                  nickname: player.name ?? `Player ${player.id + 1}`,
                  color: player.color,
                  money: player.money,
                  totalAssets: player.totalAssets,
                }}
                isActive={player.originalIndex === boardCurPlayer}
                isRichest={player.money > 0 && player.money === maxMoney}
                isBankrupt={player.money <= 0}
              />
            ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-20">
        <RollButton
          isMyTurn={canControlTurn}
          mode={rollButtonMode}
          onRoll={handleRollClick}
          onEndTurn={handleEndTurnClick}
        />
      </div>

      {isPromptVisible && prompt && !isBoardHandledPrompt && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-[#1F2A44]">
              {prompt.title ?? prompt.type ?? 'Prompt'}
            </h2>
            {prompt.message && (
              <p className="mt-2 text-sm font-semibold text-[#5A6D8A]">
                {prompt.message}
              </p>
            )}
            {typeof prompt.timeoutSec === 'number' && (
              <p className="mt-1 text-xs font-semibold text-[#64748B]">
                Timeout: {prompt.timeoutSec}s
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {promptChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  disabled={promptSubmittingChoice !== null}
                  onClick={() => handlePromptChoice(choice.value)}
                  className="w-full rounded-xl border border-[#D0D7E2] px-4 py-3 text-left text-sm font-bold text-[#334155] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {choice.label}
                  {choice.description ? (
                    <span className="mt-1 block text-xs font-medium text-[#64748B]">
                      {choice.description}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {promptSubmittingChoice && (
              <p className="mt-3 text-xs font-semibold text-[#1D4ED8]">
                Sending response...
              </p>
            )}
          </div>
        </div>
      )}

      <ExitGameModal
        open={isExitModalOpen}
        isSubmitting={isLeavePending}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirm={handleExitConfirm}
      />

      <DevRoomChatControlPanel
        roomId={activeRoomId ?? ''}
        senderOptions={roomChatSenderOptions}
        preferredSenderId={preferredRoomChatSenderId}
      />

      <GlobalEffectOverlay activeEffect={activeGlobalEffect} />

      <GlobalEffectModal
        open={isGlobalEffectModalOpen}
        chance={activeGlobalEffect}
        onClose={() => setIsGlobalEffectModalOpen(false)}
      />
    </div>
  )
}

export default GamePage
