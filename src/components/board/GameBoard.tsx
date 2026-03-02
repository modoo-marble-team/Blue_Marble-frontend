import { useRef, useState, forwardRef, useImperativeHandle } from 'react'
import BoardTile from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import BuildModal from '../game/modals/BuildModal'
import CardModal from '../game/modals/CardModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
import BankruptModal from '../game/modals/BankruptModal'
import { emitConfirmPenalty } from '../../services/socket/game.handler'
import { gameApi } from '../../services/game/game.api'
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
import '../../styles/board.css'

const PURCHASE_COST = 60
const UPGRADE_COST = 30
const TOLL_COST = 30

const LEVEL_LABEL: Record<number, string> = {
  0: '미구매',
  1: '집 1채',
  2: '집 2채',
  3: '집 3채',
  4: '호텔',
  5: '랜드마크',
}

function getUpgradeStage(
  level: BuildingLevel
): 'building-to-hotel' | 'hotel-to-landmark' {
  return level < 4 ? 'building-to-hotel' : 'hotel-to-landmark'
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
  onPlayersChange: (players: PlayerState[]) => void
  onCurPlayerChange: (idx: number) => void
  onBankrupt?: (playerIdx: number) => void
}

interface BuyModalState {
  open: boolean
  tileId: number | null
  onDoneCallback?: () => void
}
interface BuildModalState {
  open: boolean
  tileId: number | null
  onDoneCallback?: () => void
}
interface CardModalState {
  open: boolean
  variant: 'event' | 'chance'
  onDoneCallback?: () => void
}
interface TollModalState {
  open: boolean
  tileId: number | null
  ownerName: string
  tollText: string
  onDoneCallback?: () => void
}
interface AIPenaltyModalState {
  open: boolean
  status: 'loading' | 'result' | 'error'
  resultDescription?: string
  onDoneCallback?: () => void
}
interface BankruptModalState {
  open: boolean
  playerIdx: number
  playerName: string
  onDoneCallback?: () => void
}

type SyncStatePayload = {
  players?: Array<{
    id: string | number
    nickname?: string
    name?: string
    position?: number
    pos?: number
    balance?: number
    money?: number
    color?: string
  }>
  tiles?: Array<{
    index?: number
    id?: number
    owner_id?: string | number | null
    ownerId?: string | number | null
    building?: number
    level?: number
  }>
  current_turn?: string | number | null
  currentTurn?: string | number | null
}

const GameBoard = forwardRef<BoardGameHandle, GameBoardProps>(
  (
    {
      roomId = null,
      players,
      curPlayer,
      onPlayersChange,
      onCurPlayerChange,
      onBankrupt,
    },
    ref
  ) => {
    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const [rolling, setRolling] = useState(false)
    const [status, setStatus] = useState('게임 시작!')
    const lock = useRef(false)

    const curPlayerRef = useRef(curPlayer)
    const playersRef = useRef<PlayerState[]>(players)
    curPlayerRef.current = curPlayer
    playersRef.current = players

    const bankruptSetRef = useRef<Set<number>>(new Set())
    const [tileOwners, setTileOwners] = useState<Record<number, TileOwner>>({})
    const tileOwnersRef = useRef<Record<number, TileOwner>>({})

    async function syncBoardStateFromServer() {
      if (!roomId) return false

      const syncResult = await gameApi.syncState(roomId)
      if (!syncResult.ok) return false

      const payload = syncResult.data as SyncStatePayload
      const payloadPlayers = payload.players ?? []
      const prevById = new Map(
        playersRef.current.map((player) => [String(player.id), player])
      )

      if (payloadPlayers.length > 0) {
        const nextById = new Map<string, PlayerState>()

        payloadPlayers.forEach((player, idx) => {
          const playerId = Number(player.id)
          if (Number.isNaN(playerId)) return

          const prevPlayer = prevById.get(String(player.id))
          nextById.set(String(player.id), {
            id: playerId,
            name:
              player.nickname ??
              player.name ??
              prevPlayer?.name ??
              `Player ${idx + 1}`,
            color:
              player.color ??
              prevPlayer?.color ??
              PLAYER_COLORS[idx % PLAYER_COLORS.length],
            pos: player.position ?? player.pos ?? prevPlayer?.pos ?? 0,
            money: player.balance ?? player.money ?? prevPlayer?.money ?? 0,
          })
        })

        const orderedPlayers = playersRef.current.map((prevPlayer) => {
          return nextById.get(String(prevPlayer.id)) ?? prevPlayer
        })
        const additionalPlayers = Array.from(nextById.values()).filter(
          (nextPlayer) =>
            !orderedPlayers.some(
              (orderedPlayer) => orderedPlayer.id === nextPlayer.id
            )
        )

        const nextPlayers = [...orderedPlayers, ...additionalPlayers]
        playersRef.current = nextPlayers
        onPlayersChange(nextPlayers)
      }

      if (payload.tiles) {
        const nextOwners: Record<number, TileOwner> = {}

        payload.tiles.forEach((tile) => {
          const tileIndex = tile.index ?? tile.id
          const ownerRaw = tile.owner_id ?? tile.ownerId
          if (
            tileIndex === undefined ||
            ownerRaw === null ||
            ownerRaw === undefined
          ) {
            return
          }

          const ownerId =
            typeof ownerRaw === 'number'
              ? ownerRaw
              : Number.parseInt(String(ownerRaw), 10)
          if (Number.isNaN(ownerId)) return

          const ownerPlayer = playersRef.current.find(
            (player) => player.id === ownerId
          )
          nextOwners[tileIndex] = {
            ownerId,
            ownerColor:
              ownerPlayer?.color ??
              PLAYER_COLORS[ownerId % PLAYER_COLORS.length],
            level: Math.min(
              Math.max(tile.building ?? tile.level ?? 1, 0),
              5
            ) as BuildingLevel,
          }
        })

        tileOwnersRef.current = nextOwners
        setTileOwners(nextOwners)
      }

      const nextTurnRaw = payload.current_turn ?? payload.currentTurn
      if (nextTurnRaw !== undefined && nextTurnRaw !== null) {
        const nextTurnIndex = playersRef.current.findIndex(
          (player) => String(player.id) === String(nextTurnRaw)
        )
        if (nextTurnIndex >= 0) {
          curPlayerRef.current = nextTurnIndex
          onCurPlayerChange(nextTurnIndex)
        }
      }

      return true
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
      tollText: `${TOLL_COST}M`,
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
      updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>
    ) {
      setTileOwners((prev) => {
        const next = updater(prev)
        tileOwnersRef.current = next
        return next
      })
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
      onPlayersChange([...updated])

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

    function handleBankruptConfirm() {
      const { playerIdx, onDoneCallback } = bankruptModal
      setBankruptModal({ open: false, playerIdx: -1, playerName: '' })

      bankruptSetRef.current.add(playerIdx)

      updateTileOwners((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          if (next[Number(k)].ownerId === playerIdx) delete next[Number(k)]
        })
        return next
      })

      onBankrupt?.(playerIdx)
      advanceTurn(onDoneCallback)
    }

    function advanceTurn(onDone?: () => void) {
      let next = (curPlayerRef.current + 1) % INIT_PLAYERS.length
      let tries = 0
      while (bankruptSetRef.current.has(next) && tries < INIT_PLAYERS.length) {
        next = (next + 1) % INIT_PLAYERS.length
        tries++
      }
      curPlayerRef.current = next
      onCurPlayerChange(next)
      onDone?.()
    }

    async function handleAITile(onDone?: () => void) {
      setAiModal({ open: true, status: 'loading', onDoneCallback: onDone })

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [
              {
                role: 'user',
                content:
                  '부루마블 보드게임의 AI 칸에 도착했습니다. 플레이어에게 재미있는 패널티나 보너스를 한 문장으로 알려주세요. 예: "다음 턴 이동 칸 +2 보너스!" 또는 "통행료 1회 면제 카드 획득!"',
              },
            ],
          }),
        })

        if (!res.ok) throw new Error()
        const data = await res.json()
        const text =
          data.content
            ?.filter((b: { type: string }) => b.type === 'text')
            .map((b: { text: string }) => b.text)
            .join('') ?? '결과를 확인하세요.'

        setAiModal((prev) => ({
          ...prev,
          status: 'result',
          resultDescription: text,
        }))
      } catch {
        setAiModal((prev) => ({ ...prev, status: 'error' }))
      }
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
            const newPos = (p.pos + total) % TILES.length
            setStatus(`${p.name} → ${TILES[newPos].name} (+${total}칸)`)
            return { ...p, pos: newPos }
          })
          playersRef.current = movedPlayers
          onPlayersChange([...movedPlayers])

          const landedTileId = movedPlayers[activeCurPlayer].pos

          setTimeout(() => {
            const tile = TILES[landedTileId]

            if (tile.type === 'city') {
              const owner = tileOwnersRef.current[landedTileId]
              if (!owner) {
                setBuyModal({
                  open: true,
                  tileId: landedTileId,
                  onDoneCallback: onDone,
                })
              } else if (owner.ownerId === activeCurPlayer) {
                if (owner.level < 5) {
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
                setTollModal({
                  open: true,
                  tileId: landedTileId,
                  ownerName: ownerPlayer?.name ?? '상대방',
                  tollText: `${TOLL_COST}M`,
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

    function toActionErrorMessage(status: number) {
      if (status === 401) return '로그인이 필요합니다.'
      if (status === 403) return '현재 턴이 아닙니다.'
      if (status === 404) return '대상을 찾을 수 없습니다.'
      if (status === 409) return '조건이 맞지 않아 처리할 수 없습니다.'
      return '요청 처리 중 오류가 발생했습니다.'
    }

    function getSellFallbackRefund(level: BuildingLevel) {
      if (level <= 0) return 0
      return PURCHASE_COST + Math.max(0, level - 1) * UPGRADE_COST
    }

    async function sellOwnedTileForPlayer(playerIdx: number) {
      const ownedTileEntries = Object.entries(tileOwnersRef.current)
        .filter(([, owner]) => owner.ownerId === playerIdx)
        .sort(([, a], [, b]) => b.level - a.level)

      if (ownedTileEntries.length === 0) return false

      const [tileIdText, owner] = ownedTileEntries[0]
      const tileId = Number(tileIdText)
      if (!roomId) return false

      const sellResult = await gameApi.sellTile(roomId, {
        tile_index: tileId,
        level: owner.level,
      })

      if (!sellResult.ok) {
        setStatus(toActionErrorMessage(sellResult.status))
        return false
      }

      const synced = await syncBoardStateFromServer()
      if (!synced) {
        updateTileOwners((prev) => {
          const next = { ...prev }
          delete next[tileId]
          return next
        })
        applyMoney(playerIdx, +getSellFallbackRefund(owner.level))
      }

      return true
    }

    async function handleBuy() {
      const { tileId, onDoneCallback } = buyModal
      if (tileId === null) return
      if (!roomId) {
        setStatus('게임 방 식별자를 찾을 수 없습니다.')
        return
      }
      const active = curPlayerRef.current

      const actionResult = await gameApi.buyTile(roomId, { tile_index: tileId })
      if (!actionResult.ok) {
        setStatus(toActionErrorMessage(actionResult.status))
        return
      }

      setBuyModal({ open: false, tileId: null })
      const bankrupt = applyMoney(active, -PURCHASE_COST, onDoneCallback)
      if (!bankrupt) {
        updateTileOwners((prev) => ({
          ...prev,
          [tileId]: {
            ownerId: active,
            ownerColor: PLAYER_COLORS[active],
            level: 1,
          },
        }))
        void syncBoardStateFromServer()
        advanceTurn(onDoneCallback)
      }
    }

    function handleBuyPass() {
      const { onDoneCallback } = buyModal
      setBuyModal({ open: false, tileId: null })
      advanceTurn(onDoneCallback)
    }

    async function handleBuildConfirm() {
      const { tileId, onDoneCallback } = buildModal
      if (tileId === null) return
      if (!roomId) {
        setStatus('게임 방 식별자를 찾을 수 없습니다.')
        return
      }
      const active = curPlayerRef.current

      const actionResult = await gameApi.buildTile(roomId, {
        tile_index: tileId,
      })
      if (!actionResult.ok) {
        setStatus(toActionErrorMessage(actionResult.status))
        return
      }

      setBuildModal({ open: false, tileId: null })
      const bankrupt = applyMoney(active, -UPGRADE_COST, onDoneCallback)
      if (!bankrupt) {
        updateTileOwners((prev) => {
          const existing = prev[tileId]
          if (!existing) return prev
          return {
            ...prev,
            [tileId]: {
              ...existing,
              level: Math.min(existing.level + 1, 5) as BuildingLevel,
            },
          }
        })
        void syncBoardStateFromServer()
        advanceTurn(onDoneCallback)
      }
    }

    function handleBuildCancel() {
      const { onDoneCallback } = buildModal
      setBuildModal({ open: false, tileId: null })
      advanceTurn(onDoneCallback)
    }

    async function handleTollConfirm() {
      const { tileId, onDoneCallback } = tollModal
      const active = curPlayerRef.current
      setTollModal({
        open: false,
        tileId: null,
        ownerName: '',
        tollText: `${TOLL_COST}M`,
      })

      if (tileId !== null) {
        const owner = tileOwnersRef.current[tileId]
        if (owner) {
          if (playersRef.current[active].money < TOLL_COST) {
            const sold = await sellOwnedTileForPlayer(active)
            if (!sold) {
              const bankrupt = applyMoney(active, -TOLL_COST, onDoneCallback)
              if (!bankrupt) advanceTurn(onDoneCallback)
              return
            }
          }
          applyMoney(owner.ownerId, +TOLL_COST)
          const bankrupt = applyMoney(active, -TOLL_COST, onDoneCallback)
          if (!bankrupt) advanceTurn(onDoneCallback)
          return
        }
      }
      advanceTurn(onDoneCallback)
    }

    function handleCardConfirm() {
      const { onDoneCallback } = cardModal
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
    players.forEach((p) => {
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
            <span style={{ fontSize: 52 }}>🎲</span>
            <span className="board-center__title">부루마블</span>
            <div className="board-dice-pair">
              <DiceFace value={dice1} rolling={rolling} />
              <DiceFace value={dice2} rolling={rolling} />
            </div>
          </div>
        </div>

        <BuyModal
          open={buyModal.open}
          cityName={buyTile?.name ?? ''}
          purchaseCostText={`${PURCHASE_COST}M`}
          tollText={`${TOLL_COST}M`}
          isUpgrade={false}
          currentLevel={0}
          onPass={handleBuyPass}
          onBuy={handleBuy}
        />
        <BuildModal
          open={buildModal.open}
          cityName={buildTile?.name ?? ''}
          upgradeStage={getUpgradeStage(currentLevel)}
          currentLevelLabel={LEVEL_LABEL[currentLevel]}
          nextLevelLabel={LEVEL_LABEL[Math.min(currentLevel + 1, 5)]}
          buildCostText={`${UPGRADE_COST}M`}
          nextTollText="60M"
          canBuild={currentLevel < 5}
          onCancel={handleBuildCancel}
          onConfirm={handleBuildConfirm}
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
          onConfirm={handleTollConfirm}
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
          description="게임에서 탈락합니다."
          onConfirm={handleBankruptConfirm}
        />
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'
export default GameBoard
