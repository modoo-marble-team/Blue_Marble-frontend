import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import BoardTile from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import BuildModal from '../game/modals/BuildModal'
import CardModal from '../game/modals/CardModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
import BankruptModal from '../game/modals/BankruptModal'
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

// ─── 비용 상수 ────────────────────────────────────────────────────
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

// ─── 공개 핸들 ───────────────────────────────────────────────────
export interface BoardGameHandle {
  rollDice: (onDone?: () => void) => void
}

// ─── Props ───────────────────────────────────────────────────────
interface GameBoardProps {
  /** 플레이어 상태 (GamePage에서 관리) */
  players: PlayerState[]
  /** 현재 턴 인덱스 (GamePage에서 관리) */
  curPlayer: number
  /** 돈/위치 변화 콜백 → GamePage가 state 업데이트 */
  onPlayersChange: (players: PlayerState[]) => void
  /** 턴 변경 콜백 */
  onCurPlayerChange: (idx: number) => void
  /** 파산 콜백 */
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

// ─── GameBoard ───────────────────────────────────────────────────
const GameBoard = forwardRef<BoardGameHandle, GameBoardProps>(
  (
    { players, curPlayer, onPlayersChange, onCurPlayerChange, onBankrupt },
    ref
  ) => {
    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const [rolling, setRolling] = useState(false)
    const [status, setStatus] = useState('🎮 게임 시작!')
    const lock = useRef(false)

    // ref 로 최신값 유지 (setInterval 클로저 stale 방지)
    const curPlayerRef = useRef(curPlayer)
    const playersRef = useRef<PlayerState[]>(players)

    // props 변경 시 ref 동기화
    curPlayerRef.current = curPlayer
    playersRef.current = players

    const bankruptSetRef = useRef<Set<number>>(new Set())

    const [tileOwners, setTileOwners] = useState<Record<number, TileOwner>>({})
    const tileOwnersRef = useRef<Record<number, TileOwner>>({})

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

    // ── 돈 변경 → 부모에게 전달 ──────────────────────────────────
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

    // ── 파산 확정 ─────────────────────────────────────────────────
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

    // ── 턴 넘기기 (파산자 건너뜀) ────────────────────────────────
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

    // ── AI 칸 ─────────────────────────────────────────────────────
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

    // ── 주사위 ────────────────────────────────────────────────────
    function rollDice(onDone?: () => void) {
      if (lock.current) return
      lock.current = true
      setRolling(true)

      let count = 0,
        f1 = 1,
        f2 = 1
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

          // 위치 이동
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

    // ── 구매 (-60M) ───────────────────────────────────────────────
    function handleBuy() {
      const { tileId, onDoneCallback } = buyModal
      if (tileId === null) return
      const active = curPlayerRef.current
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
        advanceTurn(onDoneCallback)
      }
    }

    function handleBuyPass() {
      const { onDoneCallback } = buyModal
      setBuyModal({ open: false, tileId: null })
      advanceTurn(onDoneCallback)
    }

    // ── 업그레이드 (-30M) ─────────────────────────────────────────
    function handleBuildConfirm() {
      const { tileId, onDoneCallback } = buildModal
      if (tileId === null) return
      const active = curPlayerRef.current
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
        advanceTurn(onDoneCallback)
      }
    }

    function handleBuildCancel() {
      const { onDoneCallback } = buildModal
      setBuildModal({ open: false, tileId: null })
      advanceTurn(onDoneCallback)
    }

    // ── 통행료 (-30M / +30M) ──────────────────────────────────────
    function handleTollConfirm() {
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
      setAiModal({ open: false, status: 'loading' })
      advanceTurn(onDoneCallback)
    }

    useImperativeHandle(ref, () => ({ rollDice }))

    const byTile: Record<number, PlayerState[]> = {}
    players.forEach((p) => {
      if (!byTile[p.pos]) byTile[p.pos] = []
      byTile[p.pos].push(p)
    })

    const CS = CORNER_SIZE,
      SS = STRAIGHT_SIZE,
      GAP = GRID_GAP
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

          {/* ── 중앙: 플레이어 점 제거, 주사위만 ── */}
          <div className="board-center">
            <span style={{ fontSize: 52 }}>🇰🇷</span>
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
