import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import BoardTile from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import BuildModal from '../game/modals/BuildModal'
import CardModal from '../game/modals/CardModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
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

// ─── 레벨 라벨 매핑 ───────────────────────────────────────────────
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

// ─── 주사위 점 위치 ───────────────────────────────────────────────
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

// ─── BoardGameHandle ──────────────────────────────────────────────
export interface BoardGameHandle {
  rollDice: (onDone?: () => void) => void
}

// ─── 모달 상태 타입 ───────────────────────────────────────────────
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

// ─── GameBoard ────────────────────────────────────────────────────
const GameBoard = forwardRef<BoardGameHandle>((_, ref) => {
  const [players, setPlayers] = useState<PlayerState[]>(INIT_PLAYERS)
  const [curPlayer, setCurPlayer] = useState(0)
  const [dice1, setDice1] = useState(1)
  const [dice2, setDice2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [status, setStatus] = useState('🎮 게임 시작!')
  const lock = useRef(false)

  const curPlayerRef = useRef(0)
  const playersRef = useRef<PlayerState[]>(INIT_PLAYERS)

  const [tileOwners, setTileOwners] = useState<Record<number, TileOwner>>({})
  const tileOwnersRef = useRef<Record<number, TileOwner>>({})

  function updateTileOwners(
    updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>
  ) {
    setTileOwners((prev) => {
      const next = updater(prev)
      tileOwnersRef.current = next
      return next
    })
  }

  // ── 모달 상태들 ───────────────────────────────────────────────────
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
    tollText: '30M',
  })

  const [aiModal, setAiModal] = useState<AIPenaltyModalState>({
    open: false,
    status: 'loading',
  })

  // ── 턴 넘기기 헬퍼 ────────────────────────────────────────────────
  function advanceTurn(onDone?: () => void) {
    const next = (curPlayerRef.current + 1) % INIT_PLAYERS.length
    curPlayerRef.current = next
    setCurPlayer(next)
    onDone?.()
  }

  // ── AI 칸 처리: Claude API 호출 ───────────────────────────────────
  async function handleAITile(onDone?: () => void) {
    setAiModal({ open: true, status: 'loading', onDoneCallback: onDone })

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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

      if (!response.ok) throw new Error('API error')

      const data = await response.json()
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

        let landedTileId = 0
        setPlayers((prev) => {
          const next = [...prev]
          const p = { ...next[activeCurPlayer] }
          p.pos = (p.pos + total) % TILES.length
          landedTileId = p.pos
          next[activeCurPlayer] = p
          playersRef.current = next
          setStatus(`${p.name} → ${TILES[p.pos].name} (+${total}칸)`)
          return next
        })

        setTimeout(() => {
          const tile = TILES[landedTileId]

          if (tile.type === 'city') {
            const owner = tileOwnersRef.current[landedTileId]

            if (owner === undefined) {
              // 미소유 → 구매 모달
              setBuyModal({
                open: true,
                tileId: landedTileId,
                onDoneCallback: onDone,
              })
            } else if (owner.ownerId === activeCurPlayer) {
              // 내 소유 → 업그레이드 모달 (최고 레벨이면 턴 넘김)
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
              // 타인 소유 → 통행료 모달
              const ownerPlayer = playersRef.current.find(
                (p) => p.id === owner.ownerId
              )
              setTollModal({
                open: true,
                tileId: landedTileId,
                ownerName: ownerPlayer?.name ?? '상대방',
                tollText: '30M',
                onDoneCallback: onDone,
              })
            }
          } else if (tile.type === 'ai') {
            // AI 칸
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

  // ── 구매 처리 ─────────────────────────────────────────────────────
  function handleBuy() {
    const { tileId, onDoneCallback } = buyModal
    if (tileId === null) return

    const activeCurPlayer = curPlayerRef.current
    updateTileOwners((prev) => ({
      ...prev,
      [tileId]: {
        ownerId: activeCurPlayer,
        ownerColor: PLAYER_COLORS[activeCurPlayer],
        level: 1,
      },
    }))

    setBuyModal({ open: false, tileId: null })
    advanceTurn(onDoneCallback)
  }

  function handleBuyPass() {
    const { onDoneCallback } = buyModal
    setBuyModal({ open: false, tileId: null })
    advanceTurn(onDoneCallback)
  }

  // ── 업그레이드 처리 ───────────────────────────────────────────────
  function handleBuildConfirm() {
    const { tileId, onDoneCallback } = buildModal
    if (tileId === null) return

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

    setBuildModal({ open: false, tileId: null })
    advanceTurn(onDoneCallback)
  }

  function handleBuildCancel() {
    const { onDoneCallback } = buildModal
    setBuildModal({ open: false, tileId: null })
    advanceTurn(onDoneCallback)
  }

  // ── 카드 모달 확인 처리 ───────────────────────────────────────────
  function handleCardConfirm() {
    const { onDoneCallback } = cardModal
    setCardModal({ open: false, variant: 'event' })
    advanceTurn(onDoneCallback)
  }

  // ── 통행료 모달 확인 처리 ─────────────────────────────────────────
  function handleTollConfirm() {
    const { onDoneCallback } = tollModal
    setTollModal({ open: false, tileId: null, ownerName: '', tollText: '30M' })
    advanceTurn(onDoneCallback)
  }

  // ── AI 모달 확인 처리 ─────────────────────────────────────────────
  function handleAIConfirm() {
    if (aiModal.status === 'loading') return
    const { onDoneCallback } = aiModal
    if (aiModal.status === 'error') {
      // 에러 시 재시도
      handleAITile(onDoneCallback)
      return
    }
    setAiModal({ open: false, status: 'loading' })
    advanceTurn(onDoneCallback)
  }

  useImperativeHandle(ref, () => ({ rollDice }))

  // 타일별 플레이어 매핑
  const byTile: Record<number, PlayerState[]> = {}
  players.forEach((p) => {
    if (!byTile[p.pos]) byTile[p.pos] = []
    byTile[p.pos].push(p)
  })

  const CS = CORNER_SIZE
  const SS = STRAIGHT_SIZE
  const GAP = GRID_GAP

  const buyTile = buyModal.tileId !== null ? TILES[buyModal.tileId] : null
  const buildTile = buildModal.tileId !== null ? TILES[buildModal.tileId] : null
  const buildOwner =
    buildModal.tileId !== null ? tileOwners[buildModal.tileId] : undefined
  const tollTile = tollModal.tileId !== null ? TILES[tollModal.tileId] : null

  const currentLevel = (buildOwner?.level ?? 0) as BuildingLevel
  const canBuild = currentLevel < 5

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
          <span style={{ fontSize: 52 }}>🇰🇷</span>
          <span className="board-center__title">부루마블</span>

          <div className="board-dice-pair">
            <DiceFace value={dice1} rolling={rolling} />
            <DiceFace value={dice2} rolling={rolling} />
          </div>

          <div className="board-players">
            {players.map((p, i) => (
              <div key={p.id} className="board-players__item">
                <div
                  className="board-players__dot"
                  style={{
                    backgroundColor: PLAYER_COLORS[p.id],
                    border:
                      curPlayer === i ? '3px solid #3B82F6' : '2px solid white',
                    boxShadow:
                      curPlayer === i
                        ? '0 0 0 2px #93C5FD'
                        : '0 2px 4px rgba(0,0,0,0.2)',
                    transform: curPlayer === i ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  {i + 1}
                </div>
                <span className="board-players__money">{p.money}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 구매 모달 (미소유 도시) ── */}
      <BuyModal
        open={buyModal.open}
        cityName={buyTile?.name ?? ''}
        purchaseCostText="60M"
        tollText="30M"
        isUpgrade={false}
        currentLevel={0}
        onPass={handleBuyPass}
        onBuy={handleBuy}
      />

      {/* ── 건설 업그레이드 모달 (내 소유 도시) ── */}
      <BuildModal
        open={buildModal.open}
        cityName={buildTile?.name ?? ''}
        upgradeStage={getUpgradeStage(currentLevel)}
        currentLevelLabel={LEVEL_LABEL[currentLevel]}
        nextLevelLabel={LEVEL_LABEL[Math.min(currentLevel + 1, 5)]}
        buildCostText="30M"
        nextTollText="60M"
        canBuild={canBuild}
        onCancel={handleBuildCancel}
        onConfirm={handleBuildConfirm}
      />

      {/* ── 이벤트 / 찬스 카드 모달 ── */}
      <CardModal
        open={cardModal.open}
        variant={cardModal.variant}
        onConfirm={handleCardConfirm}
      />

      {/* ── 통행료 모달 ── */}
      <TollModal
        open={tollModal.open}
        cityName={tollTile?.name}
        ownerName={tollModal.ownerName}
        tollText={tollModal.tollText}
        onConfirm={handleTollConfirm}
      />

      {/* ── AI 칸 모달 ── */}
      <AIPenaltyModal
        open={aiModal.open}
        status={aiModal.status}
        resultDescription={aiModal.resultDescription}
        onConfirm={handleAIConfirm}
      />
    </div>
  )
})

GameBoard.displayName = 'GameBoard'

export default GameBoard
