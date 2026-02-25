import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
type TileType =
  | 'start'
  | 'property'
  | 'event'
  | 'chance'
  | 'tax'
  | 'jail'
  | 'goto_jail'
  | 'free_parking'
  | 'travel'

interface TileData {
  id: number
  name: string
  type: TileType
  color?: string
  price?: number
  emoji?: string
}

interface PlayerState {
  id: number
  name: string
  color: string
  tileIndex: number
  money: number
}

export interface BoardGameHandle {
  rollDice: (onDone?: () => void) => void
}

// ─────────────────────────────────────────────
// 타일 데이터 (32칸)
// ─────────────────────────────────────────────
const TILES: TileData[] = [
  { id: 0, name: 'START', type: 'start', emoji: '🚩' },
  { id: 1, name: '수원', type: 'property', color: '#60a5fa', price: 60 },
  { id: 2, name: '울산', type: 'property', color: '#60a5fa', price: 60 },
  { id: 3, name: '이벤트', type: 'event', emoji: '🎁' },
  { id: 4, name: '군산', type: 'property', color: '#34d399', price: 60 },
  { id: 5, name: '방책', type: 'property', color: '#34d399', price: 60 },
  { id: 6, name: '익산', type: 'property', color: '#34d399', price: 60 },
  { id: 7, name: '?', type: 'chance', emoji: '❓' },
  { id: 8, name: '무인도', type: 'free_parking', emoji: '🏝️' },
  { id: 9, name: '부산', type: 'property', color: '#f87171', price: 60 },
  { id: 10, name: '독도', type: 'property', color: '#f87171', price: 60 },
  { id: 11, name: '목포', type: 'property', color: '#fb923c', price: 60 },
  { id: 12, name: '여수', type: 'property', color: '#fb923c', price: 60 },
  { id: 13, name: '?', type: 'chance', emoji: '❓' },
  { id: 14, name: '광주', type: 'property', color: '#a78bfa', price: 60 },
  { id: 15, name: '전주', type: 'property', color: '#a78bfa', price: 60 },
  { id: 16, name: '교도소', type: 'jail', emoji: '🔒' },
  { id: 17, name: '춘천', type: 'property', color: '#f472b6', price: 60 },
  { id: 18, name: '강릉', type: 'property', color: '#f472b6', price: 60 },
  { id: 19, name: '원주', type: 'property', color: '#f472b6', price: 60 },
  { id: 20, name: '이벤트', type: 'event', emoji: '🎁' },
  { id: 21, name: '대전', type: 'property', color: '#fbbf24', price: 60 },
  { id: 22, name: '대구', type: 'property', color: '#fbbf24', price: 60 },
  { id: 23, name: '?', type: 'chance', emoji: '❓' },
  { id: 24, name: '부산\n이동', type: 'goto_jail', emoji: '🚔' },
  { id: 25, name: '인천', type: 'property', color: '#6ee7b7', price: 60 },
  { id: 26, name: '세종', type: 'property', color: '#6ee7b7', price: 60 },
  { id: 27, name: '제주', type: 'travel', emoji: '✈️' },
  { id: 28, name: '어수', type: 'property', color: '#93c5fd', price: 60 },
  { id: 29, name: '함정', type: 'property', color: '#93c5fd', price: 60 },
  { id: 30, name: '?', type: 'chance', emoji: '❓' },
  { id: 31, name: '국내여행', type: 'travel', emoji: '🛫' },
]

// ─────────────────────────────────────────────
// 그리드 좌표 (9×9, 외곽만 사용)
// 0=START: (8,8) 시계반대방향
// ─────────────────────────────────────────────
function getPos(id: number): { col: number; row: number } {
  if (id === 0) return { col: 8, row: 8 }
  if (id === 8) return { col: 0, row: 8 }
  if (id === 16) return { col: 0, row: 0 }
  if (id === 24) return { col: 8, row: 0 }
  if (id >= 1 && id <= 7) return { col: 8 - id, row: 8 }
  if (id >= 9 && id <= 15) return { col: 0, row: 8 - (id - 8) }
  if (id >= 17 && id <= 23) return { col: id - 16, row: 0 }
  return { col: 8, row: id - 24 }
}

type TileDir = 'bottom' | 'top' | 'left' | 'right' | 'corner'
function getDir(id: number): TileDir {
  if ([0, 8, 16, 24].includes(id)) return 'corner'
  if (id >= 1 && id <= 7) return 'bottom'
  if (id >= 9 && id <= 15) return 'left'
  if (id >= 17 && id <= 23) return 'top'
  return 'right'
}

function getTileBg(type: TileType): string {
  const map: Partial<Record<TileType, string>> = {
    start: '#fef9c3',
    jail: '#fee2e2',
    free_parking: '#fef9c3',
    goto_jail: '#fee2e2',
    chance: '#fff7ed',
    event: '#f0fdf4',
    travel: '#eff6ff',
  }
  return map[type] ?? '#ffffff'
}

// ─────────────────────────────────────────────
// 단일 타일
// ─────────────────────────────────────────────
const PCOLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']

interface TileProps {
  tile: TileData
  tokens: PlayerState[]
}

const Tile: React.FC<TileProps> = ({ tile, tokens }) => {
  const dir = getDir(tile.id)
  const isCorner = dir === 'corner'
  const bg = getTileBg(tile.type)

  const stripStyle = (): React.CSSProperties => {
    if (!tile.color) return {}
    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: tile.color,
    }
    if (dir === 'bottom')
      return { ...base, top: 0, left: 0, right: 0, height: 13 }
    if (dir === 'top')
      return { ...base, bottom: 0, left: 0, right: 0, height: 13 }
    if (dir === 'left')
      return { ...base, right: 0, top: 0, bottom: 0, width: 13 }
    if (dir === 'right')
      return { ...base, left: 0, top: 0, bottom: 0, width: 13 }
    return {}
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: bg,
        borderRadius: isCorner ? 10 : 4,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 컬러 스트립 */}
      {tile.color && !isCorner && <div style={stripStyle()} />}

      {/* 텍스트 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          zIndex: 1,
          padding: '0 2px',
          width: '100%',
        }}
      >
        {tile.emoji && (
          <span style={{ fontSize: isCorner ? 22 : 12, lineHeight: 1.1 }}>
            {tile.emoji}
          </span>
        )}
        <span
          style={{
            fontSize: isCorner ? 10 : 7,
            fontWeight: 600,
            color: '#374151',
            textAlign: 'center',
            lineHeight: 1.2,
            whiteSpace: 'pre-wrap',
          }}
        >
          {tile.name}
        </span>
        {tile.price && (
          <span style={{ fontSize: 6, color: '#9ca3af' }}>{tile.price}M</span>
        )}
      </div>

      {/* 플레이어 토큰 */}
      {tokens.map((p, i) => {
        const positions: React.CSSProperties[] = [
          { bottom: 3, right: 3 },
          { bottom: 3, left: 3 },
          { top: 3, right: 3 },
          { top: 3, left: 3 },
        ]
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              ...positions[i % 4],
              width: 15,
              height: 15,
              borderRadius: '50%',
              backgroundColor: PCOLORS[p.id] ?? '#999',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              fontWeight: 700,
              color: '#fff',
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {p.id + 1}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 주사위 페이스
// ─────────────────────────────────────────────
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

const DiceFace: React.FC<{ value: number; rolling: boolean }> = ({
  value,
  rolling,
}) => (
  <div
    style={{
      width: 52,
      height: 52,
      backgroundColor: '#fff',
      borderRadius: 12,
      border: '2px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      position: 'relative',
      transform: rolling ? 'rotate(20deg) scale(1.1)' : 'rotate(0deg) scale(1)',
      transition: 'transform 0.08s ease',
    }}
  >
    {(DOTS[value] ?? DOTS[1]).map(([cx, cy], i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: '#1e293b',
          left: `${cx}%`,
          top: `${cy}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />
    ))}
  </div>
)

// ─────────────────────────────────────────────
// 초기 플레이어
// ─────────────────────────────────────────────
const INIT_PLAYERS: PlayerState[] = [
  { id: 0, name: 'GoormEE', color: '#ef4444', tileIndex: 0, money: 2000 },
  { id: 1, name: 'MarbleKing', color: '#3b82f6', tileIndex: 0, money: 1800 },
  { id: 2, name: 'Player 3', color: '#22c55e', tileIndex: 0, money: 1500 },
  { id: 3, name: 'Player 4', color: '#eab308', tileIndex: 0, money: 1400 },
]

// ─────────────────────────────────────────────
// 메인 BoardGame 컴포넌트 (default export)
// ─────────────────────────────────────────────
const BoardGame = forwardRef<BoardGameHandle>((_, ref) => {
  const [players, setPlayers] = useState<PlayerState[]>(INIT_PLAYERS)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [diceVal, setDiceVal] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [status, setStatus] = useState('🎮 게임 시작!')
  const lock = useRef(false)

  useImperativeHandle(ref, () => ({
    rollDice: (onDone?: () => void) => {
      if (lock.current) return
      lock.current = true
      setRolling(true)

      let count = 0
      let final = 1
      const iv = setInterval(() => {
        final = Math.ceil(Math.random() * 6)
        setDiceVal(final)
        count++
        if (count >= 12) {
          clearInterval(iv)
          setRolling(false)
          lock.current = false

          setPlayers((prev) => {
            const next = [...prev]
            const p = { ...next[currentPlayer] }
            p.tileIndex = (p.tileIndex + final) % TILES.length
            next[currentPlayer] = p
            setStatus(`${p.name} → ${TILES[p.tileIndex].name} (+${final}칸)`)
            return next
          })
          setCurrentPlayer((c) => (c + 1) % INIT_PLAYERS.length)
          onDone?.()
        }
      }, 70)
    },
  }))

  // 타일별 토큰 매핑
  const byTile: Record<number, PlayerState[]> = {}
  players.forEach((p) => {
    if (!byTile[p.tileIndex]) byTile[p.tileIndex] = []
    byTile[p.tileIndex].push(p)
  })

  // 9×9 그리드
  const grid: (TileData | null)[][] = Array.from({ length: 9 }, () =>
    Array(9).fill(null)
  )
  TILES.forEach((t) => {
    const { col, row } = getPos(t.id)
    grid[row][col] = t
  })

  const C = '1.7fr' // 코너 크기
  const N = '1fr' // 일반 타일 크기
  const cols = `${C} ${Array(7).fill(N).join(' ')} ${C}`
  const rows = `${C} ${Array(7).fill(N).join(' ')} ${C}`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
        padding: 12,
        gap: 8,
        boxSizing: 'border-box',
      }}
    >
      {/* 상태 메시지 */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#3b82f6',
          background: 'rgba(255,255,255,0.85)',
          padding: '4px 14px',
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(59,130,246,0.15)',
          flexShrink: 0,
        }}
      >
        {status}
      </div>

      {/* 보드 */}
      <div
        style={{
          width: '100%',
          flex: 1,
          display: 'grid',
          gridTemplateColumns: cols,
          gridTemplateRows: rows,
          gap: 2,
          padding: 6,
          backgroundColor: 'rgba(255,255,255,0.75)',
          borderRadius: 20,
          border: '1px solid #bfdbfe',
          boxSizing: 'border-box',
          boxShadow: 'inset 0 2px 12px rgba(59,130,246,0.08)',
        }}
      >
        {grid.map((rowArr, ri) =>
          rowArr.map((tile, ci) => {
            // 중앙 anchor 셀
            if (!tile && ri === 1 && ci === 1) {
              return (
                <div
                  key="center"
                  style={{
                    gridColumn: '2 / 9',
                    gridRow: '2 / 9',
                    background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 48 }}>🇰🇷</span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#3b82f6',
                      letterSpacing: '0.12em',
                    }}
                  >
                    부루마블
                  </span>

                  {/* 주사위 */}
                  <DiceFace value={diceVal} rolling={rolling} />

                  {/* 플레이어 현황 */}
                  <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                    {INIT_PLAYERS.map((p, i) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            backgroundColor: PCOLORS[p.id],
                            border:
                              currentPlayer === i
                                ? '3px solid #3b82f6'
                                : '2px solid white',
                            boxShadow:
                              currentPlayer === i
                                ? '0 0 0 2px #93c5fd'
                                : '0 2px 4px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#fff',
                            transform:
                              currentPlayer === i ? 'scale(1.2)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {i + 1}
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            color: '#6b7280',
                            fontWeight: 500,
                          }}
                        >
                          {players[i].money}M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // 중앙 빈 셀 skip
            if (!tile && ri >= 1 && ri <= 7 && ci >= 1 && ci <= 7) return null

            // 빈 셀 (외곽)
            if (!tile) return <div key={`e-${ri}-${ci}`} />

            return (
              <Tile key={tile.id} tile={tile} tokens={byTile[tile.id] ?? []} />
            )
          })
        )}
      </div>
    </div>
  )
})

BoardGame.displayName = 'BoardGame'

export default BoardGame
