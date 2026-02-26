import React from 'react'
import {
  TileData,
  TileDir,
  PlayerState,
  getStripColor,
  TileOwner,
} from './board.constants'
import BuildingBadge from './BuildingBadge'

// ─── PlayerToken ─────────────────────────────────────────────────
interface TokenProps {
  player: PlayerState
  idx: number
  total: number
  stripOffset?: number
}

export const PlayerToken: React.FC<TokenProps> = ({
  player,
  idx,
  total,
  stripOffset = 0,
}) => {
  const offsets =
    total === 1
      ? [{ x: 0, y: 0 }]
      : [
          { x: -13, y: -13 },
          { x: 13, y: -13 },
          { x: -13, y: 13 },
          { x: 13, y: 13 },
        ]
  const { x, y } = offsets[idx % offsets.length]
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + stripOffset}px))`,
        width: 26,
        height: 26,
        borderRadius: '50%',
        backgroundColor: player.color,
        border: '2.5px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 900,
        color: '#fff',
        zIndex: 20,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      }}
    >
      {player.id + 1}
    </div>
  )
}

// ─── BoardTile ────────────────────────────────────────────────────
interface BoardTileProps {
  tile: TileData
  dir: TileDir
  tokens: PlayerState[]
  tileOwner?: TileOwner
}

const BoardTile: React.FC<BoardTileProps> = ({
  tile,
  dir,
  tokens,
  tileOwner,
}) => {
  const isCity = tile.type === 'city'
  const strip = getStripColor(tile)
  const buildingLevel = tileOwner?.level ?? 0
  const hasBuilding = isCity && buildingLevel >= 1
  const stripOffset = strip ? 7 : 0

  // ── 코너 ─────────────────────────────────────────────────────────
  if (dir === 'corner') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          border: '2.5px solid #2B7FFF',
          borderRadius: 18,
          boxShadow: '0 0 0 5px rgba(190,219,255,0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        {tile.emoji && (
          <span style={{ fontSize: 28, lineHeight: 1 }}>{tile.emoji}</span>
        )}
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#374151',
            textAlign: 'center',
            lineHeight: 1.3,
            whiteSpace: 'pre-wrap',
            padding: '0 4px',
          }}
        >
          {tile.name}
        </span>
        {tokens.map((p, i) => (
          <PlayerToken key={p.id} player={p} idx={i} total={tokens.length} />
        ))}
      </div>
    )
  }

  // ── 상단 / 하단 ───────────────────────────────────────────────────
  if (dir === 'top' || dir === 'bottom') {
    const stripOnTop = true

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#E2E8F0',
          borderRadius: 13,
          padding: 2,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: 9,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {stripOnTop && strip && (
            <div
              style={{
                height: 14,
                backgroundColor: strip,
                flexShrink: 0,
                borderRadius: '7px 7px 0 0',
              }}
            />
          )}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: isCity ? 'space-between' : 'center',
              gap: 2,
              padding: isCity ? '8px 3px' : '2px 3px',
            }}
          >
            {tile.emoji && (
              <span style={{ fontSize: 12, lineHeight: 1 }}>{tile.emoji}</span>
            )}
            {(!tile.emoji || isCity) && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#374151',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {tile.name}
              </span>
            )}
            {/* 건물 있으면 이름과 60M 사이에 아이콘 */}
            {hasBuilding && <BuildingBadge level={buildingLevel} />}
            {isCity && (
              <span
                style={{ fontSize: 6.5, color: '#9CA3AF', fontWeight: 600 }}
              >
                60M
              </span>
            )}
          </div>
        </div>

        {tokens.map((p, i) => (
          <PlayerToken
            key={p.id}
            player={p}
            idx={i}
            total={tokens.length}
            stripOffset={stripOffset}
          />
        ))}
      </div>
    )
  }

  // ── 좌측 / 우측 ───────────────────────────────────────────────────
  const isLeft = dir === 'left'
  const rotation = isLeft ? 'rotate(90deg)' : 'rotate(-90deg)'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 13,
      }}
    >
      {/* 회전되는 타일 본체 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '70px',
          height: '90px',
          transform: `translate(-50%, -50%) ${rotation}`,
          backgroundColor: '#E2E8F0',
          borderRadius: 13,
          padding: 2,
          boxSizing: 'border-box' as const,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: 9,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {strip && (
            <div
              style={{
                height: 14,
                backgroundColor: strip,
                flexShrink: 0,
                borderRadius: '7px 7px 0 0',
              }}
            />
          )}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: isCity ? 'space-between' : 'center',
              gap: 2,
              padding: isCity ? '8px 3px' : '2px 3px',
            }}
          >
            {tile.emoji && (
              <span style={{ fontSize: 11, lineHeight: 1 }}>{tile.emoji}</span>
            )}
            {(!tile.emoji || isCity) && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#374151',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {tile.name}
              </span>
            )}
            {/* 건물 있으면 이름과 60M 사이에 아이콘 - position 없이 flex로 중앙 배치 */}
            {hasBuilding && <BuildingBadge level={buildingLevel} />}
            {isCity && (
              <span
                style={{ fontSize: 6.5, color: '#9CA3AF', fontWeight: 600 }}
              >
                60M
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PlayerToken: 회전 바깥 기준 중앙 */}
      {tokens.map((p, i) => (
        <PlayerToken key={p.id} player={p} idx={i} total={tokens.length} />
      ))}
    </div>
  )
}

export default BoardTile
