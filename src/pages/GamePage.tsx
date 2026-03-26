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
import { IS_SOCKET_MOCK_ENABLED } from '../config/env'
import { useAuthStore } from '../features/auth/session/store'
import { requestOnlineUsersSnapshotSync } from '../features/presence/online-users/onlineUsersSocket'
import { DevRoomChatControlPanel } from '../features/room-chat/DevRoomChatControlPanel'
import RoomChat, {
  type RoomChatSenderMeta,
} from '../features/room-chat/RoomChat'
import { useDiceRoll } from '../hooks/game/useDiceRoll'
import { useGameState } from '../hooks/game/useGameState'
import { useTurn } from '../hooks/game/useTurn'
import { playBgm, stopBgm } from '../lib/bgm'
import { socket } from '../lib/socket'
import { normalizeChatMessage } from '../constants/chat'
import {
  emitGameAction,
  emitPromptResponse,
} from '../services/socket/game.handler'
import { useGameStore } from '../stores/game.store'
import type { GamePromptChoice, GameRanking, PlayerId } from '../types/domain'
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
import type {
  ChatEventPayload,
  WaitingRoomSnapshot,
} from './waiting-room/api/types'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED
const ALLOW_ALL_MOCK_TURNS =
  import.meta.env.DEV && import.meta.env.VITE_ALLOW_ALL_MOCK_TURNS === 'true'

const GAME_CHAT_TITLE = '실시간 채팅'

const DEFAULT_MOCK_PLAYER_ID = 'mock-player-1'
const DEFAULT_MOCK_NICKNAME = '플레이어 1'
const DEFAULT_GUEST_ID = 'guest-local'
const MOCK_LOCAL_PLAYER_INDEX = 0
const MAX_ROUND_BADGE_VALUE = 20
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

type PlayerPanelViewModel = {
  id: string
  nickname: string
  color?: string
  money: number
  totalAssets: number
  originalIndex: number
  isActive: boolean
  isBankrupt: boolean
  isRichest: boolean
}

const toComparablePlayerId = (playerId: PlayerId | null | undefined) =>
  playerId == null ? null : String(playerId)

const comparePlayerPanelsByAssets = (
  left: Pick<
    PlayerPanelViewModel,
    'isBankrupt' | 'totalAssets' | 'money' | 'originalIndex'
  >,
  right: Pick<
    PlayerPanelViewModel,
    'isBankrupt' | 'totalAssets' | 'money' | 'originalIndex'
  >
) => {
  const leftBankrupt = left.isBankrupt ? 1 : 0
  const rightBankrupt = right.isBankrupt ? 1 : 0

  if (leftBankrupt !== rightBankrupt) {
    return leftBankrupt - rightBankrupt
  }

  if (left.totalAssets !== right.totalAssets) {
    return right.totalAssets - left.totalAssets
  }

  if (left.money !== right.money) {
    return right.money - left.money
  }

  return left.originalIndex - right.originalIndex
}

const applyRichestFlag = (
  players: PlayerPanelViewModel[],
  richestPlayerId: string | null
) =>
  players.map((player) => ({
    ...player,
    isRichest: richestPlayerId !== null && player.id === richestPlayerId,
  }))

const mapRankingToPanelPlayer = (
  ranking: GameRanking,
  index: number,
  basePlayerById: Map<string, PlayerPanelViewModel>,
  activePlayerId: string | null
): PlayerPanelViewModel => {
  const rankingPlayerId = String(ranking.player_id)
  const basePlayer = basePlayerById.get(rankingPlayerId)

  return {
    id: rankingPlayerId,
    nickname: basePlayer?.nickname ?? ranking.nickname,
    color: basePlayer?.color,
    money: basePlayer?.money ?? 0,
    totalAssets: ranking.final_assets,
    originalIndex: basePlayer?.originalIndex ?? index,
    isActive:
      basePlayer?.isActive ?? activePlayerId === String(ranking.player_id),
    isBankrupt: basePlayer?.isBankrupt ?? false,
    isRichest: Boolean(ranking.is_winner || ranking.rank === 1),
  }
}

interface GamePageLocationState {
  roomId?: string
  gameId?: string
  lastRoomSnapshot?: WaitingRoomSnapshot
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
  const activeGlobalEffect = useGameStore((s) => s.activeGlobalEffect)
  const resetGame = useGameStore((s) => s.resetGame)
  const activeGameId =
    locationState?.gameId ??
    routeGameId ??
    storeGameId ??
    gameSession.gameId ??
    null
  const activeRoomId = locationState?.roomId ?? gameSession.roomId ?? null
  const lastRoomSnapshot = locationState?.lastRoomSnapshot ?? null
  const [promptSubmittingChoice, setPromptSubmittingChoice] = useState<
    string | null
  >(null)
  const [isBoardBlockingModalOpen, setIsBoardBlockingModalOpen] =
    useState(false)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  const [isLeavePending, setIsLeavePending] = useState(false)
  const [isGlobalEffectModalOpen, setIsGlobalEffectModalOpen] = useState(false)
  const [isSoloPlayEnabled, setIsSoloPlayEnabled] = useState(false)
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
  const displayedRoundBadgeValue = Math.min(
    Math.max(round ?? 1, 1),
    MAX_ROUND_BADGE_VALUE
  )
  const activePlayerId = toComparablePlayerId(normalizedCurrentTurn)
  const canControlActiveMockTurn =
    USE_GAME_SOCKET_MOCK && (ALLOW_ALL_MOCK_TURNS || isSoloPlayEnabled)
  const controlledPlayerId = canControlActiveMockTurn
    ? (activePlayerId ?? currentUserId)
    : currentUserId
  const shouldShowSoloPlayControl =
    USE_GAME_SOCKET_MOCK && !ALLOW_ALL_MOCK_TURNS

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
    ? canControlActiveMockTurn || boardCurPlayer === MOCK_LOCAL_PLAYER_INDEX
    : isMyTurnFromStore
  const isPromptTargetedToControlledPlayer =
    prompt?.playerId == null ||
    (controlledPlayerId != null &&
      String(prompt.playerId) === String(controlledPlayerId))
  const isPromptVisible = Boolean(prompt && isPromptTargetedToControlledPlayer)
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

    const normalizedContent = normalizeChatMessage(content)

    if (!normalizedContent) {
      return
    }

    const senderId = currentUserId ?? DEFAULT_GUEST_ID
    const optimisticMessage = createOptimisticGameChatMessage({
      roomId: activeRoomId,
      senderId,
      senderNickname: currentNickname,
      message: normalizedContent,
    })

    pendingGameChatEchoesRef.current = [
      ...pendingGameChatEchoesRef.current,
      {
        id: optimisticMessage.id,
        senderId,
        content: normalizedContent,
        createdAtMs: Date.parse(optimisticMessage.timestamp),
      },
    ]

    useGameStore.getState().addMessage(optimisticMessage)

    sendWaitingRoomChat({
      roomId: activeRoomId,
      senderId,
      senderNickname: currentNickname,
      message: normalizedContent,
    })
  }

  const diceRoll = useDiceRoll()

  const panelPlayers = useMemo(() => {
    const basePanelPlayers: PlayerPanelViewModel[] = storePlayers.map(
      (storePlayer, index) => {
        const boardPlayer = boardPlayers[index]
        const playerId = String(storePlayer.id)
        const money = storePlayer.balance ?? boardPlayer?.money ?? 0

        return {
          id: playerId,
          nickname:
            storePlayer.nickname || boardPlayer?.name || `Player ${index + 1}`,
          color: storePlayer.color || boardPlayer?.color,
          money,
          totalAssets: storePlayer.totalAssets ?? money,
          originalIndex: index,
          isActive: activePlayerId === playerId,
          isBankrupt:
            Boolean(storePlayer.is_bankrupt) ||
            storePlayer.state === 'bankrupt' ||
            money <= 0,
          isRichest: false,
        }
      }
    )

    const basePlayerById = new Map(
      basePanelPlayers.map((player) => [player.id, player])
    )

    if (gameResult?.rankings && gameResult.rankings.length > 0) {
      const rankedPlayers = [...gameResult.rankings]
        .sort((left, right) => left.rank - right.rank)
        .map((ranking, index) =>
          mapRankingToPanelPlayer(
            ranking,
            index,
            basePlayerById,
            activePlayerId
          )
        )
      const rankedPlayerIds = new Set(rankedPlayers.map((player) => player.id))
      const remainingPlayers = basePanelPlayers
        .filter((player) => !rankedPlayerIds.has(player.id))
        .sort(comparePlayerPanelsByAssets)

      return applyRichestFlag(
        [...rankedPlayers, ...remainingPlayers],
        rankedPlayers[0]?.id ?? null
      )
    }

    if (gameResult?.winner) {
      const winner = gameResult.winner
      const winnerPlayerId = String(winner.playerId)
      const winnerBaseExists = basePanelPlayers.some(
        (player) => player.id === winnerPlayerId
      )
      const winnerPanelPlayers = winnerBaseExists
        ? basePanelPlayers.map((player) =>
            player.id === winnerPlayerId
              ? {
                  ...player,
                  money: winner.balance,
                  totalAssets: winner.assets,
                }
              : player
          )
        : [
            ...basePanelPlayers,
            {
              id: winnerPlayerId,
              nickname: winner.nickname,
              color: undefined,
              money: winner.balance,
              totalAssets: winner.assets,
              originalIndex: basePanelPlayers.length,
              isActive: activePlayerId === winnerPlayerId,
              isBankrupt: false,
              isRichest: false,
            },
          ]

      return applyRichestFlag(
        [...winnerPanelPlayers].sort((left, right) => {
          const leftWinner = left.id === winnerPlayerId ? 1 : 0
          const rightWinner = right.id === winnerPlayerId ? 1 : 0

          if (leftWinner !== rightWinner) {
            return rightWinner - leftWinner
          }

          return comparePlayerPanelsByAssets(left, right)
        }),
        winnerPlayerId
      )
    }

    const sortedPlayers = [...basePanelPlayers].sort(
      comparePlayerPanelsByAssets
    )
    const richestPlayerId =
      sortedPlayers.find((player) => !player.isBankrupt)?.id ?? null

    return applyRichestFlag(sortedPlayers, richestPlayerId)
  }, [activePlayerId, boardPlayers, gameResult, storePlayers])
  const currentPlayerState = boardPlayers[boardCurPlayer]
  const isCurrentPlayerBankrupt =
    currentPlayerState?.money <= 0 || currentPlayerState?.state === 'bankrupt'
  const isRollPhase = phase === 'rolling'
  const isEndTurnPhase = phase === 'resolving' && !prompt
  const canControlTurn =
    isMyTurn &&
    !isBoardBlockingModalOpen &&
    !isActionPending &&
    !isPromptVisible &&
    !isCurrentPlayerBankrupt &&
    (isRollPhase || isEndTurnPhase)
  const rollButtonMode: 'roll' | 'end_turn' =
    isEndTurnPhase && !isBoardBlockingModalOpen ? 'end_turn' : 'roll'
  const canManageAssetsThisTurn =
    isMyTurn &&
    !isBoardBlockingModalOpen &&
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
  const roomChatSenderMetaById = useMemo<Record<string, RoomChatSenderMeta>>(
    () =>
      Object.fromEntries(
        panelPlayers.map((player) => [
          player.id,
          {
            avatarColor: player.color,
            displayName: player.nickname,
          },
        ])
      ),
    [panelPlayers]
  )
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

      requestOnlineUsersSnapshotSync({
        includeFollowUpRefresh: true,
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
          resumeRoomMembership: true,
          ...(lastRoomSnapshot ? { lastRoomSnapshot } : {}),
        },
      })
      return
    }

    navigate('/lobby', { replace: true })
  }

  const handleRollClick = () => {
    if (
      !isMyTurn ||
      isBoardBlockingModalOpen ||
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
      isBoardBlockingModalOpen ||
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

      <div className="relative z-10 mx-auto flex h-full w-full items-center justify-between gap-8 pb-12 pt-4">
        <div className="flex h-[80%] min-h-0 w-[320px] shrink-0 flex-col">
          <RoomChat
            title={GAME_CHAT_TITLE}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={currentUserId ?? DEFAULT_GUEST_ID}
            senderMetaById={roomChatSenderMetaById}
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
              localPlayerId={controlledPlayerId}
              gamePhase={phase}
              allowAssetActions={canManageAssetsThisTurn}
              onBlockingModalChange={setIsBoardBlockingModalOpen}
              gameResult={gameResult}
              isGameOver={isGameOver}
              winnerId={winnerId}
              onGameResultConfirm={handleGameResultConfirm}
              activeGlobalEffect={activeGlobalEffect}
            />
          </div>
        </div>

        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {panelPlayers.map((player) => (
            <PlayerPanel
              key={player.id}
              player={{
                id: player.id,
                nickname: player.nickname,
                color: player.color,
                money: player.money,
                totalAssets: player.totalAssets,
              }}
              isActive={player.isActive}
              isRichest={player.isRichest}
              isBankrupt={player.isBankrupt}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-20 flex flex-col items-center gap-4">
        {shouldShowSoloPlayControl ? (
          <div className="flex w-[232px] items-center justify-between rounded-[28px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_18px_36px_rgba(36,95,229,0.16)] backdrop-blur-sm">
            <div className="min-w-0 text-left">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8BA3CB]">
                Mock Play
              </p>
              <p className="mt-1 text-sm font-black text-[#1F2A44]">
                혼자 플레이
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-[#6A7A92]">
                상대 턴도 내가 이어서 진행
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSoloPlayEnabled}
              aria-label="혼자 플레이"
              onClick={() => setIsSoloPlayEnabled((prev) => !prev)}
              className={`relative inline-flex h-7 w-[52px] shrink-0 rounded-full border border-white/70 transition-colors ${
                isSoloPlayEnabled ? 'bg-[#245FE5]' : 'bg-[#C8D4E6]'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 flex size-6 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#245FE5] shadow-[0_6px_14px_rgba(36,95,229,0.22)] transition-transform ${
                  isSoloPlayEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isSoloPlayEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        ) : null}
        {/* Round Badge */}
        <div
          aria-label="현재 라운드 배지"
          className="flex items-baseline gap-1.5 rounded-full border-[3px] border-white bg-[#EFF5FF] px-6 py-2.5 shadow-[0_8px_16px_rgba(36,95,229,0.12)]"
        >
          <span className="text-[28px] font-black leading-none tracking-tighter text-[#245FE5]">
            {displayedRoundBadgeValue}
          </span>
          <span className="text-xl font-bold leading-none tracking-tight text-[#8BA3CB]">
            / {MAX_ROUND_BADGE_VALUE}
          </span>
          <span className="ml-1 text-base font-black uppercase leading-none tracking-widest text-[#5E708D]">
            Round
          </span>
        </div>
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

      <GlobalEffectModal
        open={isGlobalEffectModalOpen}
        chance={activeGlobalEffect}
        onClose={() => setIsGlobalEffectModalOpen(false)}
      />
    </div>
  )
}

export default GamePage
