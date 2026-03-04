import {
  useRef,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import BoardTile from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import BuildModal from '../game/modals/BuildModal'
import CardModal from '../game/modals/CardModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
import BankruptModal from '../game/modals/BankruptModal'
import { emitConfirmPenalty } from '../../services/socket/game.handler'
import {
  TILES,
  TOP_ROW,
  BOTTOM_ROW,
  LEFT_COL,
  RIGHT_COL,
  CORNER_SIZE,
  STRAIGHT_SIZE,
  GRID_GAP,
  PLAYER_COLORS,
  INIT_PLAYERS,
  PlayerState,
  TileOwner,
  BuildingLevel,
} from './board.constants'
import {
  syncMockStoreBankrupt,
  syncMockStoreCurrentTurn,
  syncMockStorePlayers,
  syncMockStoreTileOwners,
} from './gameBoardStoreBridge'
import { createGameBoardActionHandlers } from './gameBoardActionHandlers'
import type {
  AIPenaltyModalState,
  BankruptModalState,
  BuildModalState,
  BuyModalState,
  CardModalState,
  TollModalState,
} from './gameBoard.types'
import '../../styles/board.css'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { formatWon } from '../../lib/utils'

// cost helpers are computed per-tile based on price

function getPurchaseCost(tileId: number): number {
  return TILES[tileId]?.price ?? 0
}

function getUpgradeCost(price: number, currentLevel: BuildingLevel): number {
  if (currentLevel === 0) return price * 0.5
  if (currentLevel === 1) return price * 0.5
  if (currentLevel === 2) return price * 0.5
  if (currentLevel === 3) return price * 1.0
  if (currentLevel === 4) return price * 1.0
  if (currentLevel === 5) return price * 1.0
  if (currentLevel === 6) return price * 2.0
  return 0
}

function calcToll(price: number, level: BuildingLevel): number {
  if (level === 0) return price
  if (level === 1) return price * 2
  if (level === 2) return price * 3
  if (level === 3) return price * 5
  if (level === 4) return price * 7
  if (level === 5) return price * 9
  if (level === 6) return price * 12
  if (level === 7) return price * 15
  return price
}

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

const AI_PENALTY_RESULTS = [
  '\uB2E4\uC74C \uD134 \uC2DC\uC791 \uC804\uAE4C\uC9C0 \uD1B5\uD589\uB8CC\uAC00 10M \uC99D\uAC00\uD569\uB2C8\uB2E4.',
  '\uC989\uC2DC \uBCF4\uB108\uC2A4 30M\uB97C \uD68D\uB4DD\uD569\uB2C8\uB2E4.',
  '\uB2E4\uC74C \uC774\uB3D9\uC5D0\uC11C \uCD94\uAC00\uB85C 2\uCE78 \uC804\uC9C4\uD569\uB2C8\uB2E4.',
  '\uB2E4\uC74C \uD134 \uC8FC\uC0AC\uC704 \uACB0\uACFC\uC5D0\uC11C 1\uC744 \uCD94\uAC00\uB85C \uBC1B\uC2B5\uB2C8\uB2E4.',
] as const
const BOARD_TITLE = '\uBE14\uB8E8\uB9C8\uBE14'
const BANKRUPT_DESCRIPTION =
  '\uAC8C\uC784\uC5D0\uC11C \uD0C8\uB77D\uD588\uC2B5\uB2C8\uB2E4.'
const DEFAULT_OPPONENT_NAME = '\uC0C1\uB300\uBC29'
const GAME_START_STATUS = '\uAC8C\uC784 \uC2DC\uC791!'
const ROOM_ID_REQUIRED_MESSAGE =
  '\uAC8C\uC784 \uBC29 \uC2DD\uBCC4\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'
const DICE_ICON = '\uD83C\uDFB2'

const LEVEL_LABEL: Record<number, string> = {
  0: '\uBBF8\uAD6C\uB9E4',
  1: '\uC9D1 1\uB2E8\uACC4',
  2: '\uC9D1 2\uB2E8\uACC4',
  3: '\uC9D1 3\uB2E8\uACC4',
  4: '\uD638\uD154 1\uB2E8\uACC4',
  5: '\uD638\uD154 2\uB2E8\uACC4',
  6: '\uD638\uD154 3\uB2E8\uACC4',
  7: '\uB79C\uB4DC\uB9C8\uD06C',
}

function getUpgradeStage(
  level: BuildingLevel
): 'building-to-hotel' | 'hotel-to-landmark' {
  return level < 6 ? 'building-to-hotel' : 'hotel-to-landmark'
}

const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 22],
    [72, 22],
    [28, 50],
    [72, 50],
    [28, 78],
    [72, 78],
  ],
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '2px solid #E2E8F0',
        boxShadow: rolling
          ? '0 0 0 3px #93C5FD, 0 6px 20px rgba(59,130,246,0.4)'
          : '0 4px 12px rgba(0,0,0,0.12)',
        position: 'relative',
        transform: rolling ? 'rotate(15deg) scale(1.12)' : 'none',
        transition: 'transform 0.08s ease',
        flexShrink: 0,
      }}
    >
      {(DOTS[value] || DOTS[1]).map(([cx, cy], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            left: `${cx}%`,
            top: `${cy}%`,
            transform: 'translate(-50%,-50%)',
          }}
        />
      ))}
    </div>
  )
}

export interface BoardGameHandle {
  rollDice: (onDone?: () => void) => void
}

interface GameBoardProps {
  roomId?: string | null
  players: PlayerState[]
  curPlayer: number
  tiles?: Array<{
    index: number
    owner_id?: string | number | null
    building: number
  }>
  onPlayersChange?: (players: PlayerState[]) => void
  onCurPlayerChange?: (idx: number) => void
  onTileOwnersChange?: (tileOwners: Record<number, TileOwner>) => void
  onBankrupt?: (playerIdx: number) => void
}

function toBoardBuildingLevel(
  tile: { building?: number; level?: number },
  hasOwner: boolean
) {
  if (!hasOwner) return 0 as BuildingLevel
  if (typeof tile.level === 'number') {
    return Math.min(Math.max(tile.level, 1), 7) as BuildingLevel
  }
  const buildingLevel = typeof tile.building === 'number' ? tile.building : 0
  return Math.min(Math.max(buildingLevel + 1, 1), 7) as BuildingLevel
}

function buildTileOwnersFromProps(
  tiles: Array<{
    index: number
    owner_id?: string | number | null
    building: number
  }>,
  players: PlayerState[]
) {
  const nextOwners: Record<number, TileOwner> = {}

  tiles.forEach((tile) => {
    if (!tile.owner_id) {
      return
    }

    const ownerPlayer = players.find(
      (player) => String(player.id) === String(tile.owner_id)
    )

    if (!ownerPlayer) {
      return
    }

    nextOwners[tile.index] = {
      ownerId: ownerPlayer.id,
      ownerColor: ownerPlayer.color,
      level: toBoardBuildingLevel(tile, true),
    }
  })

  return nextOwners
}

const GameBoard = forwardRef<BoardGameHandle, GameBoardProps>(
  (
    {
      roomId = null,
      players,
      curPlayer,
      tiles = [],
      onPlayersChange,
      onCurPlayerChange,
      onTileOwnersChange,
      onBankrupt,
    },
    ref
  ) => {
    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const [rolling, setRolling] = useState(false)
    const [status, setStatus] = useState(GAME_START_STATUS)
    const lock = useRef(false)

    const curPlayerRef = useRef(curPlayer)
    const playersRef = useRef<PlayerState[]>(players)
    curPlayerRef.current = curPlayer
    playersRef.current = players

    const bankruptSetRef = useRef<Set<number>>(new Set())
    const [optimisticTileOwners, setOptimisticTileOwners] = useState<Record<
      number,
      TileOwner
    > | null>(null)
    const derivedTileOwners = useMemo(
      () => buildTileOwnersFromProps(tiles, players),
      [tiles, players]
    )
    const tileOwners =
      optimisticTileOwners === null ? derivedTileOwners : optimisticTileOwners
    const tileOwnersRef = useRef<Record<number, TileOwner>>(tileOwners)

    useEffect(() => {
      setOptimisticTileOwners(null)
      tileOwnersRef.current = derivedTileOwners
    }, [derivedTileOwners])

    function getPlayerIdByIndex(playerIdx: number) {
      return playersRef.current[playerIdx]?.id ?? playerIdx
    }

    function getPlayerColorByIndex(playerIdx: number) {
      return (
        playersRef.current[playerIdx]?.color ??
        PLAYER_COLORS[playerIdx % PLAYER_COLORS.length]
      )
    }

    function getPlayerIndexById(playerId: number) {
      return playersRef.current.findIndex((player) => player.id === playerId)
    }

    const [buyModal, setBuyModal] = useState<BuyModalState>({
      open: false,
      tileId: null,
    })
    const [buildModal, setBuildModal] = useState<BuildModalState>({
      open: false,
      tileId: null,
    })
    const [cardModal, setCardModal] = useState<CardModalState>({
      open: false,
      variant: 'event',
    })
    const [tollModal, setTollModal] = useState<TollModalState>({
      open: false,
      tileId: null,
      ownerName: '',
      tollText: '',
    })
    const [aiModal, setAiModal] = useState<AIPenaltyModalState>({
      open: false,
      status: 'loading',
    })
    const [bankruptModal, setBankruptModal] = useState<BankruptModalState>({
      open: false,
      playerIdx: -1,
      playerName: '',
    })

    function updateTileOwners(
      updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>,
      options?: { notifyParent?: boolean }
    ) {
      const next = updater(tileOwnersRef.current)
      tileOwnersRef.current = next
      setOptimisticTileOwners(next)

      if (options?.notifyParent) {
        if (onTileOwnersChange) {
          onTileOwnersChange(next)
        } else {
          syncMockStoreTileOwners(next)
        }
      }
    }

    function publishPlayers(nextPlayers: PlayerState[]) {
      if (onPlayersChange) {
        onPlayersChange(nextPlayers)
      } else {
        syncMockStorePlayers(nextPlayers)
      }
    }

    function publishCurrentTurn(nextTurnIndex: number) {
      if (onCurPlayerChange) {
        onCurPlayerChange(nextTurnIndex)
      } else {
        syncMockStoreCurrentTurn(nextTurnIndex)
      }
    }

    function publishTileOwners(nextOwners: Record<number, TileOwner>) {
      if (onTileOwnersChange) {
        onTileOwnersChange(nextOwners)
      } else {
        syncMockStoreTileOwners(nextOwners)
      }
    }

    function applyMoney(
      playerIdx: number,
      delta: number,
      onDoneCallback?: () => void
    ): boolean {
      const updated = playersRef.current.map((p, i) => {
        if (i !== playerIdx) return p
        return { ...p, money: Math.max(0, p.money + delta) }
      })
      playersRef.current = updated
      if (onPlayersChange) {
        onPlayersChange([...updated])
      } else {
        syncMockStorePlayers(updated)
      }

      const isBankrupt = updated[playerIdx].money <= 0
      if (isBankrupt) {
        const name = updated[playerIdx]?.name ?? `Player ${playerIdx + 1}`
        setTimeout(
          () =>
            setBankruptModal({
              open: true,
              playerIdx,
              playerName: name,
              onDoneCallback,
            }),
          0
        )
        return true
      }
      return false
    }

    const {
      handleBuy,
      handleBuyPass,
      handleBuildConfirm,
      handleBuildCancel,
      handleTollConfirm,
    } = createGameBoardActionHandlers({
      roomId,
      useGameSocketMock: USE_GAME_SOCKET_MOCK,
      roomIdRequiredMessage: ROOM_ID_REQUIRED_MESSAGE,
      setStatus,
      setOptimisticTileOwners,
      setBuyModal,
      setBuildModal,
      setTollModal,
      playersRef,
      curPlayerRef,
      tileOwnersRef,
      publishPlayers,
      publishCurrentTurn,
      publishTileOwners,
      getPlayerIdByIndex,
      getPlayerColorByIndex,
      getPlayerIndexById,
      toBoardBuildingLevel,
      getPurchaseCost,
      getUpgradeCost,
      calcToll,
      getTilePrice: (tileId) => TILES[tileId]?.price ?? 0,
      updateTileOwners,
      applyMoney,
      advanceTurn,
    })

    function handleBankruptConfirm() {
      const { playerIdx, onDoneCallback } = bankruptModal
      setBankruptModal({ open: false, playerIdx: -1, playerName: '' })

      bankruptSetRef.current.add(playerIdx)
      const bankruptPlayerId = getPlayerIdByIndex(playerIdx)

      updateTileOwners(
        (prev) => {
          const next = { ...prev }
          Object.keys(next).forEach((k) => {
            if (next[Number(k)].ownerId === bankruptPlayerId)
              delete next[Number(k)]
          })
          return next
        },
        { notifyParent: true }
      )

      if (onBankrupt) {
        onBankrupt(playerIdx)
      } else {
        syncMockStoreBankrupt(playerIdx)
      }
      advanceTurn(onDoneCallback)
    }

    function advanceTurn(onDone?: () => void) {
      const playerCount = playersRef.current.length || INIT_PLAYERS.length
      let next = (curPlayerRef.current + 1) % playerCount
      let tries = 0
      while (bankruptSetRef.current.has(next) && tries < playerCount) {
        next = (next + 1) % playerCount
        tries++
      }

      // 턴 스킵 처리 (남은 스킵 턴이 있으면 차감하고 다시 건너뛴다)
      const nextPlayer = playersRef.current[next]
      if (
        nextPlayer &&
        (nextPlayer.skipTurns ?? 0) > 0 &&
        tries < playerCount
      ) {
        // 스킵 턴 1회를 차감해 반영한다
        const updatedPlayers = [...playersRef.current]
        updatedPlayers[next] = {
          ...nextPlayer,
          skipTurns: nextPlayer.skipTurns! - 1,
        }
        playersRef.current = updatedPlayers
        if (onPlayersChange) {
          onPlayersChange(updatedPlayers)
        } else {
          syncMockStorePlayers(updatedPlayers)
        }

        // 스킵 상태를 보여주기 위해 잠시 현재 턴으로 바꾼 뒤 다시 턴을 넘긴다
        curPlayerRef.current = next
        if (onCurPlayerChange) {
          onCurPlayerChange(next)
        } else {
          syncMockStoreCurrentTurn(next)
        }

        setTimeout(() => {
          advanceTurn(onDone)
        }, 1500)
        return
      }

      curPlayerRef.current = next
      if (onCurPlayerChange) {
        onCurPlayerChange(next)
      } else {
        syncMockStoreCurrentTurn(next)
      }
      onDone?.()
    }

    async function handleAITile(onDone?: () => void) {
      setAiModal({ open: true, status: 'loading', onDoneCallback: onDone })

      if (USE_GAME_SOCKET_MOCK) {
        const fallbackDescription =
          AI_PENALTY_RESULTS[
            Math.floor(Math.random() * AI_PENALTY_RESULTS.length)
          ]

        window.setTimeout(() => {
          setAiModal((prev) => ({
            ...prev,
            status: 'result',
            resultDescription: fallbackDescription,
          }))
        }, 500)
        return
      }

      window.setTimeout(() => {
        setAiModal((prev) =>
          prev.open
            ? {
                ...prev,
                status: 'error',
              }
            : prev
        )
      }, 1500)
    }
    function rollDice(onDone?: () => void) {
      if (lock.current) return
      lock.current = true
      setRolling(true)

      let count = 0
      let f1 = 1
      let f2 = 1

      const iv = setInterval(() => {
        f1 = Math.ceil(Math.random() * 6)
        f2 = Math.ceil(Math.random() * 6)
        setDice1(f1)
        setDice2(f2)
        count++

        if (count >= 12) {
          clearInterval(iv)
          setRolling(false)
          lock.current = false

          const total = f1 + f2
          const activeCurPlayer = curPlayerRef.current

          const movedPlayers = playersRef.current.map((p, i) => {
            if (i !== activeCurPlayer) return p

            let newPos = (p.pos + total) % TILES.length
            let newSkipTurns = p.skipTurns ?? 0

            if (TILES[newPos].type === 'go_to_island') {
              newPos = 8
              newSkipTurns += 1
              setStatus(`${p.name} 무인도로 이동! (1턴 휴식)`)
            } else {
              setStatus(`${p.name} → ${TILES[newPos].name} (+${total}칸)`)
            }

            return { ...p, pos: newPos, skipTurns: newSkipTurns }
          })
          playersRef.current = movedPlayers
          if (onPlayersChange) {
            onPlayersChange([...movedPlayers])
          } else {
            syncMockStorePlayers(movedPlayers)
          }

          const landedTileId = movedPlayers[activeCurPlayer].pos

          setTimeout(() => {
            const tile = TILES[landedTileId]

            if (tile.type === 'city') {
              const owner = tileOwnersRef.current[landedTileId]
              const activePlayer = movedPlayers[activeCurPlayer]
              const price = tile.price ?? 0

              if (!owner) {
                setBuyModal({
                  open: true,
                  tileId: landedTileId,
                  onDoneCallback: onDone,
                })
              } else if (owner.ownerId === activePlayer.id) {
                if (owner.level < 7) {
                  setBuildModal({
                    open: true,
                    tileId: landedTileId,
                    onDoneCallback: onDone,
                  })
                } else {
                  advanceTurn(onDone)
                }
              } else {
                const ownerPlayer = playersRef.current.find(
                  (p) => p.id === owner.ownerId
                )
                const tollAmount = calcToll(price, owner.level)
                setTollModal({
                  open: true,
                  tileId: landedTileId,
                  ownerName: ownerPlayer?.name ?? DEFAULT_OPPONENT_NAME,
                  tollText: formatWon(tollAmount),
                  onDoneCallback: onDone,
                })
              }
            } else if (tile.type === 'ai') {
              handleAITile(onDone)
            } else if (tile.type === 'event') {
              setCardModal({
                open: true,
                variant: 'event',
                onDoneCallback: onDone,
              })
            } else if (tile.type === 'chance') {
              setCardModal({
                open: true,
                variant: 'chance',
                onDoneCallback: onDone,
              })
            } else {
              advanceTurn(onDone)
            }
          }, 50)
        }
      }, 70)
    }

    function handleCardConfirm() {
      const { onDoneCallback, variant } = cardModal

      // 찬스 카드에서 주사위 1턴 쉬기 결과가 나왔을 때의 프런트 처리
      // 실서버 연동 전까지는 서버 이벤트 대신 화면 동작만 확인한다
      if (variant === 'chance') {
        const active = curPlayerRef.current
        const activePlayer = playersRef.current[active]
        const updatedPlayers = [...playersRef.current]
        updatedPlayers[active] = {
          ...activePlayer,
          skipTurns: (activePlayer.skipTurns ?? 0) + 1,
        }
        playersRef.current = updatedPlayers
        if (onPlayersChange) {
          onPlayersChange(updatedPlayers)
        } else {
          syncMockStorePlayers(updatedPlayers)
        }
        setStatus(`${activePlayer.name} 주사위 1턴 쉬기!`)
      }

      setCardModal({ open: false, variant: 'event' })
      advanceTurn(onDoneCallback)
    }

    function handleAIConfirm() {
      if (aiModal.status === 'loading') return
      const { onDoneCallback } = aiModal
      if (aiModal.status === 'error') {
        handleAITile(onDoneCallback)
        return
      }

      const active = curPlayerRef.current
      const activePlayer = playersRef.current[active]
      if (activePlayer && roomId) {
        emitConfirmPenalty({
          room_id: roomId,
          player_id: String(activePlayer.id),
        })
      }

      setAiModal({ open: false, status: 'loading' })
      advanceTurn(onDoneCallback)
    }

    useImperativeHandle(ref, () => ({ rollDice }))

    const byTile: Record<number, PlayerState[]> = {}
    players.forEach((p, i) => {
      if (bankruptSetRef.current.has(i)) return
      if (!byTile[p.pos]) byTile[p.pos] = []
      byTile[p.pos].push(p)
    })

    const CS = CORNER_SIZE
    const SS = STRAIGHT_SIZE
    const GAP = GRID_GAP
    const buyTile = buyModal.tileId !== null ? TILES[buyModal.tileId] : null
    const buildTile =
      buildModal.tileId !== null ? TILES[buildModal.tileId] : null
    const buildOwner =
      buildModal.tileId !== null ? tileOwners[buildModal.tileId] : undefined
    const tollTile = tollModal.tileId !== null ? TILES[tollModal.tileId] : null
    const currentLevel = (buildOwner?.level ?? 0) as BuildingLevel

    return (
      <div className="board-page">
        <div className="board-status">{status}</div>

        <div
          className="board-inner"
          style={{
            gridTemplateColumns: `${CS}px repeat(7, ${SS}px) ${CS}px`,
            gridTemplateRows: `${CS}px repeat(7, ${SS}px) ${CS}px`,
            gap: `${GAP}px`,
          }}
        >
          {TOP_ROW.map((id, ci) => (
            <div key={id} style={{ gridRow: 1, gridColumn: ci + 1 }}>
              <BoardTile
                tile={TILES[id]}
                dir={ci === 0 || ci === 8 ? 'corner' : 'top'}
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
              />
            </div>
          ))}
          {BOTTOM_ROW.map((id, ci) => (
            <div key={id} style={{ gridRow: 9, gridColumn: ci + 1 }}>
              <BoardTile
                tile={TILES[id]}
                dir={ci === 0 || ci === 8 ? 'corner' : 'bottom'}
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
              />
            </div>
          ))}
          {LEFT_COL.map((id, ri) => (
            <div key={id} style={{ gridRow: ri + 2, gridColumn: 1 }}>
              <BoardTile
                tile={TILES[id]}
                dir="left"
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
              />
            </div>
          ))}
          {RIGHT_COL.map((id, ri) => (
            <div key={id} style={{ gridRow: ri + 2, gridColumn: 9 }}>
              <BoardTile
                tile={TILES[id]}
                dir="right"
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
              />
            </div>
          ))}

          <div className="board-center">
            <span style={{ fontSize: 52 }}>{DICE_ICON}</span>
            <span className="board-center__title">{BOARD_TITLE}</span>
            <div className="board-dice-pair">
              <DiceFace value={dice1} rolling={rolling} />
              <DiceFace value={dice2} rolling={rolling} />
            </div>
          </div>
        </div>

        <BuyModal
          open={buyModal.open}
          cityName={buyTile?.name ?? ''}
          purchaseCostText={formatWon(buyTile?.price ?? 0)}
          isUpgrade={false}
          currentLevel={0}
          onPass={() => handleBuyPass(buyModal)}
          onBuy={() => handleBuy(buyModal)}
        />
        <BuildModal
          open={buildModal.open}
          cityName={buildTile?.name ?? ''}
          upgradeStage={getUpgradeStage(currentLevel)}
          currentLevelLabel={LEVEL_LABEL[currentLevel]}
          nextLevelLabel={LEVEL_LABEL[Math.min(currentLevel + 1, 7)]}
          buildCostText={formatWon(
            getUpgradeCost(buildTile?.price ?? 0, currentLevel)
          )}
          nextTollText={formatWon(
            calcToll(buildTile?.price ?? 0, (currentLevel + 1) as BuildingLevel)
          )}
          canBuild={currentLevel < 7}
          onCancel={() => handleBuildCancel(buildModal)}
          onConfirm={() => handleBuildConfirm(buildModal)}
        />
        <CardModal
          open={cardModal.open}
          variant={cardModal.variant}
          onConfirm={handleCardConfirm}
        />
        <TollModal
          open={tollModal.open}
          cityName={tollTile?.name}
          ownerName={tollModal.ownerName}
          tollText={tollModal.tollText}
          onConfirm={() => handleTollConfirm(tollModal)}
        />
        <AIPenaltyModal
          open={aiModal.open}
          status={aiModal.status}
          resultDescription={aiModal.resultDescription}
          onConfirm={handleAIConfirm}
        />
        <BankruptModal
          open={bankruptModal.open}
          playerName={bankruptModal.playerName}
          description={BANKRUPT_DESCRIPTION}
          onConfirm={handleBankruptConfirm}
        />
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'
export default GameBoard
