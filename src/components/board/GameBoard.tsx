import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import BoardTile from './BoardTile'
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

// ─── BoardGameHandle (FE-B 호환) ──────────────────────────────────
export interface BoardGameHandle {
  rollDice: (onDone?: () => void) => void
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
        setPlayers((prev) => {
          const next = [...prev]
          const p = { ...next[curPlayer] }
          p.pos = (p.pos + total) % TILES.length
          next[curPlayer] = p
          setStatus(`${p.name} → ${TILES[p.pos].name} (+${total}칸)`)
          return next
        })
        setCurPlayer((c) => (c + 1) % INIT_PLAYERS.length)
        onDone?.()
      }
    }, 70)
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

  return (
    <div className="board-page">
      {/* 상태 표시 */}
      <div className="board-status">{status}</div>

      {/* 내부 그리드 (외곽 파란 배경 제거) */}
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
            />
          </div>
        ))}

        {/* ── 왼쪽 열 (col 1, row 2~8) ── */}
        {LEFT_COL.map((id, ri) => (
          <div key={id} style={{ gridRow: ri + 2, gridColumn: 1 }}>
            <BoardTile tile={TILES[id]} dir="left" tokens={byTile[id] ?? []} />
          </div>
        ))}

        {/* ── 오른쪽 열 (col 9, row 2~8) ── */}
        {RIGHT_COL.map((id, ri) => (
          <div key={id} style={{ gridRow: ri + 2, gridColumn: 9 }}>
            <BoardTile tile={TILES[id]} dir="right" tokens={byTile[id] ?? []} />
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
    </div>
  )
})

GameBoard.displayName = 'GameBoard'

export default GameBoard
