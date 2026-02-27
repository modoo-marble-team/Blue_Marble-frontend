import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import BoardTile from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import CardModal from '../game/modals/CardModal'
import TollModal from '../game/modals/TollModal'
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
  isUpgrade: boolean
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

// ─── GameBoard ────────────────────────────────────────────────────
const GameBoard = forwardRef<BoardGameHandle>((_, ref) => {
  const [players, setPlayers] = useState<PlayerState[]>(INIT_PLAYERS)
  const [curPlayer, setCurPlayer] = useState(0)
  const [dice1, setDice1] = useState(1)
  const [dice2, setDice2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [status, setStatus] = useState('🎮 게임 시작!')
  const lock = useRef(false)

  // curPlayer를 ref로도 관리 (클로저 stale 방지)
  const curPlayerRef = useRef(0)

  // tileOwners를 state + ref 동시 관리 (setInterval 클로저 stale 방지)
  const [tileOwners, setTileOwners] = useState<Record<number, TileOwner>>({})
  const tileOwnersRef = useRef<Record<number, TileOwner>>({})

  // players를 ref로도 관리 (클로저 stale 방지)
  const playersRef = useRef<PlayerState[]>(INIT_PLAYERS)

  function updateTileOwners(
    updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>
  ) {
    setTileOwners((prev) => {
      const next = updater(prev)
      tileOwnersRef.current = next
      return next
    })
  }

  // ── 구매/업그레이드 모달 상태 ─────────────────────────────────────
  const [buyModal, setBuyModal] = useState<BuyModalState>({
    open: false,
    tileId: null,
    isUpgrade: false,
  })

  // ── 카드 모달 상태 (이벤트 / 찬스) ───────────────────────────────
  const [cardModal, setCardModal] = useState<CardModalState>({
    open: false,
    variant: 'event',
  })

  // ── 통행료 모달 상태 ──────────────────────────────────────────────
  const [tollModal, setTollModal] = useState<TollModalState>({
    open: false,
    tileId: null,
    ownerName: '',
    tollText: '30M',
  })

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
              // ── 미소유 도시: 구매 모달 ────────────────────────────
              setBuyModal({
                open: true,
                tileId: landedTileId,
                isUpgrade: false,
                onDoneCallback: onDone,
              })
            } else if (owner.ownerId === activeCurPlayer) {
              // ── 내 소유 도시: 업그레이드 모달 ────────────────────
              setBuyModal({
                open: true,
                tileId: landedTileId,
                isUpgrade: true,
                onDoneCallback: onDone,
              })
            } else {
              // ── 타인 소유 도시: 통행료 모달 ──────────────────────
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
          } else if (tile.type === 'event') {
            // ── 이벤트 칸: 이벤트 카드 모달 ────────────────────────
            setCardModal({
              open: true,
              variant: 'event',
              onDoneCallback: onDone,
            })
          } else if (tile.type === 'chance') {
            // ── 찬스 칸(?): 찬스 카드 모달 ─────────────────────────
            setCardModal({
              open: true,
              variant: 'chance',
              onDoneCallback: onDone,
            })
          } else {
            // ── 그 외 칸: 바로 턴 넘김 ──────────────────────────────
            const next = (activeCurPlayer + 1) % INIT_PLAYERS.length
            curPlayerRef.current = next
            setCurPlayer(next)
            onDone?.()
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

    updateTileOwners((prev) => {
      const existing = prev[tileId]
      const newLevel =
        existing && existing.ownerId === activeCurPlayer
          ? (Math.min(existing.level + 1, 5) as BuildingLevel)
          : 1

      return {
        ...prev,
        [tileId]: {
          ownerId: activeCurPlayer,
          ownerColor: PLAYER_COLORS[activeCurPlayer],
          level: newLevel,
        },
      }
    })

    closeBuyModalAndNextTurn(onDoneCallback)
  }

  // ── 패스 처리 ─────────────────────────────────────────────────────
  function handlePass() {
    closeBuyModalAndNextTurn(buyModal.onDoneCallback)
  }

  function closeBuyModalAndNextTurn(onDone?: () => void) {
    setBuyModal({ open: false, tileId: null, isUpgrade: false })
    const next = (curPlayerRef.current + 1) % INIT_PLAYERS.length
    curPlayerRef.current = next
    setCurPlayer(next)
    onDone?.()
  }

  // ── 카드 모달 확인 처리 ───────────────────────────────────────────
  function handleCardConfirm() {
    const { onDoneCallback } = cardModal
    setCardModal({ open: false, variant: 'event' })
    const next = (curPlayerRef.current + 1) % INIT_PLAYERS.length
    curPlayerRef.current = next
    setCurPlayer(next)
    onDoneCallback?.()
  }

  // ── 통행료 모달 확인 처리 ─────────────────────────────────────────
  function handleTollConfirm() {
    const { onDoneCallback } = tollModal
    setTollModal({ open: false, tileId: null, ownerName: '', tollText: '30M' })
    const next = (curPlayerRef.current + 1) % INIT_PLAYERS.length
    curPlayerRef.current = next
    setCurPlayer(next)
    onDoneCallback?.()
  }

  // FE-B에서 ref로 rollDice 호출 가능
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

  const modalTile = buyModal.tileId !== null ? TILES[buyModal.tileId] : null
  const modalOwner =
    buyModal.tileId !== null ? tileOwners[buyModal.tileId] : undefined

  const tollTile = tollModal.tileId !== null ? TILES[tollModal.tileId] : null

  return (
    <div className="board-page">
      {/* 상태 표시 */}
      <div className="board-status">{status}</div>

      {/* 내부 그리드 */}
      <div
        className="board-inner"
        style={{
          gridTemplateColumns: `${CS}px repeat(7, ${SS}px) ${CS}px`,
          gridTemplateRows: `${CS}px repeat(7, ${SS}px) ${CS}px`,
          gap: `${GAP}px`,
        }}
      >
        {/* ── 상단 행 (row 1) ── */}
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

        {/* ── 하단 행 (row 9) ── */}
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

        {/* ── 왼쪽 열 (col 1, row 2~8) ── */}
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

        {/* ── 오른쪽 열 (col 9, row 2~8) ── */}
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

        {/* ── 중앙 영역 ── */}
        <div className="board-center">
          <span style={{ fontSize: 52 }}>🇰🇷</span>
          <span className="board-center__title">부루마블</span>

          {/* 주사위 2개 */}
          <div className="board-dice-pair">
            <DiceFace value={dice1} rolling={rolling} />
            <DiceFace value={dice2} rolling={rolling} />
          </div>

          {/* 플레이어 현황 */}
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

      {/* ── 구매/업그레이드 모달 ── */}
      <BuyModal
        open={buyModal.open}
        cityName={modalTile?.name ?? ''}
        purchaseCostText="60M"
        tollText="30M"
        isUpgrade={buyModal.isUpgrade}
        currentLevel={modalOwner?.level ?? 0}
        onPass={handlePass}
        onBuy={handleBuy}
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
    </div>
  )
})

GameBoard.displayName = 'GameBoard'

export default GameBoard
