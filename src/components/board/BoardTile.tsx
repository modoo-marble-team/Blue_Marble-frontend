import React from 'react'
import {
  TileData,
  TileDir,
  PlayerState,
  getStripColor,
  TileOwner,
  PLAYER_COLORS,
  STRAIGHT_SIZE,
  LEVEL_LABELS,
} from './board.constants'
import BuildingBadge from './BuildingBadge'
import { formatWon } from '../../lib/utils'

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
  const isIsland = player.state === 'island' || (player.skipTurns ?? 0) > 0

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
      {isIsland ? (
        <span style={{ fontSize: 10 }}>🏝️</span>
      ) : typeof player.id === 'number' ? (
        player.id + 1
      ) : (
        player.id
      )}
      {(player.skipTurns ?? 0) > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            right: -8,
            background: '#EF5350',
            color: 'white',
            fontSize: 9,
            padding: '1px 4px',
            borderRadius: 4,
            fontWeight: 800,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          {player.skipTurns}
        </div>
      )}
    </div>
  )
}

// ─── 플레이어 소유 색상 맵 ──────────────────────────────────────────
const PLAYER_OWNER_STYLES: Record<string, { strip: string; bg: string }> = {
  '#EF5350': { strip: '#FF0000', bg: '#FFCECF' }, // 기존 빨강
  '#EF4444': { strip: '#FF0000', bg: '#FFCECF' }, // Tailwind 빨강
  '#FF0000': { strip: '#FF0000', bg: '#FFCECF' }, // 순수 빨강
  '#42A5F5': { strip: '#155DFC', bg: '#DCF1FF' },
  '#3B82F6': { strip: '#155DFC', bg: '#DCF1FF' },
  '#66BB6A': { strip: '#00A63E', bg: '#DCFCE7' },
  '#22C55E': { strip: '#00A63E', bg: '#DCFCE7' },
  '#FFD15B': { strip: '#F0B100', bg: '#F7ECAC' },
  '#EAB308': { strip: '#F0B100', bg: '#F7ECAC' },
  RED: { strip: '#FF0000', bg: '#FFCECF' },
  BLUE: { strip: '#155DFC', bg: '#DCF1FF' },
  GREEN: { strip: '#00A63E', bg: '#DCFCE7' },
  YELLOW: { strip: '#F0B100', bg: '#F7ECAC' },
}

// ─── 아이콘 렌더링 헬퍼 ───────────────────────────────────────────
function TileIcon({ tile, size = 12 }: { tile: TileData; size?: number }) {
  if (tile.svgIcon) {
    return (
      <img
        src={tile.svgIcon}
        alt={tile.name}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
  }
  if (tile.emoji) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{tile.emoji}</span>
  }
  return null
}

// ─── BoardTile ────────────────────────────────────────────────────
interface BoardTileProps {
  tile: TileData
  dir: TileDir
  tokens: PlayerState[]
  tileOwner?: TileOwner
  timeLeft?: number
  isActivePlayerTile?: boolean
}

const BoardTile: React.FC<BoardTileProps> = ({
  tile,
  dir,
  tokens,
  tileOwner,
  timeLeft = 0,
  isActivePlayerTile = false,
}) => {
  const isProperty = tile.type === 'PROPERTY'
  const buildingLevel = tileOwner?.level ?? 0
  const hasBuilding = isProperty && Boolean(tileOwner) && buildingLevel > 0

  // 소유 색상 계산
  const ownerIdx =
    typeof tileOwner?.ownerId === 'number'
      ? tileOwner.ownerId
      : parseInt(String(tileOwner?.ownerId || 0), 10)
  const rawOwnerColor =
    tileOwner?.ownerColor || PLAYER_COLORS[ownerIdx % PLAYER_COLORS.length]
  const normalizedOwnerColor = (rawOwnerColor || '').trim().toUpperCase()

  const ownerStyle =
    isProperty && tileOwner
      ? (PLAYER_OWNER_STYLES[normalizedOwnerColor] ??
        PLAYER_OWNER_STYLES['#EF5350'])
      : null
  // PROPERTY: 소유 시 플레이어 색 / 미구매/비도시: 시각 규격 반영
  const strip = isProperty
    ? ownerStyle
      ? ownerStyle.strip
      : null // 미구매 건물은 줄 없음
    : getStripColor(tile)
  const tileBg = ownerStyle ? ownerStyle.bg : '#FFFFFF'
  const outerBorderColor = ownerStyle ? ownerStyle.strip : '#E2E8F0'

  // 턴 진행 중인 플레이어가 위치한 칸이고 시간이 10초 이하일 때 애니메이션 강조
  const isUrgent = isActivePlayerTile && timeLeft <= 10 && timeLeft > 0

  // ── 실제 코너 (START, ISLAND, MOVE_TO_ISLAND) ─────────────────────
  const isActualCorner = ['START', 'ISLAND', 'MOVE_TO_ISLAND'].includes(
    tile.type
  )

  if (isActualCorner || dir === 'corner') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          border: isUrgent ? '3px solid #EF5350' : '2.5px solid #2B7FFF',
          borderRadius: 18,
          boxShadow: isUrgent
            ? '0 0 15px rgba(239, 83, 80, 0.6)'
            : '0 0 0 5px rgba(190,219,255,0.65)',
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
        <TileIcon tile={tile} size={28} />
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

  // ── 상단 / 하단 (중간 칸들) ─────────────────────────────────────────
  if (dir === 'top' || dir === 'bottom') {
    const isSpecial = ['CHANCE', 'EVENT', 'AI'].includes(tile.type)
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: isUrgent ? '#EF5350' : outerBorderColor,
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
            backgroundColor: tileBg,
            borderRadius: 9,
            display: 'flex',
            flexDirection: 'column', // 상단/하단 모두 줄이 위에 오도록 column 고정
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
              justifyContent: isProperty ? 'flex-start' : 'center',
              padding: isProperty ? '8px 3px' : '2px 3px',
            }}
          >
            {isProperty && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#374151',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  marginTop: 6,
                  marginBottom: 2,
                }}
              >
                {tile.name}
              </span>
            )}

            {!isProperty && (
              <>
                <TileIcon tile={tile} size={28} />
                {tile.name && !isSpecial && (
                  <span style={{ fontSize: 8, fontWeight: 800, marginTop: 4 }}>
                    {tile.name}
                  </span>
                )}
              </>
            )}

            {isProperty && (
              <>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  {hasBuilding && (
                    <BuildingBadge
                      level={buildingLevel}
                      ownerColor={tileOwner?.ownerColor}
                      isUrgent={isUrgent}
                    />
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: tileOwner ? '#F1F5F9' : '#EEF2F7',
                    color: tileOwner ? '#1E293B' : '#64748B',
                    fontSize: 7,
                    fontWeight: 900,
                    padding: '2px 5px',
                    borderRadius: 10,
                    marginBottom: 4,
                  }}
                >
                  {tileOwner
                    ? LEVEL_LABELS[buildingLevel]
                    : formatWon(tile.price ?? 0)}
                </div>
              </>
            )}
          </div>
        </div>
        {tokens.map((p, i) => (
          <PlayerToken key={p.id} player={p} idx={i} total={tokens.length} />
        ))}
      </div>
    )
  }

  // ── 좌측 / 우측 (중간 칸들) ─────────────────────────────────────────
  const isLeft = dir === 'left'
  const isSpecial = ['CHANCE', 'EVENT', 'AI'].includes(tile.type)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: outerBorderColor,
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
          backgroundColor: tileBg,
          borderRadius: 9,
          display: 'flex',
          flexDirection: isLeft ? 'row-reverse' : 'row',
          overflow: 'hidden',
        }}
      >
        {strip && (
          <div
            style={{
              width: 14,
              height: '100%',
              backgroundColor: strip,
              flexShrink: 0,
            }}
          />
        )}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: isLeft ? 'rotate(90deg)' : 'rotate(-90deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: STRAIGHT_SIZE,
            }}
          >
            {isProperty && (
              <>
                <span style={{ fontSize: 8, fontWeight: 800, marginBottom: 2 }}>
                  {tile.name}
                </span>
                <div
                  style={{ height: 30, display: 'flex', alignItems: 'center' }}
                >
                  {hasBuilding && (
                    <BuildingBadge
                      level={buildingLevel}
                      ownerColor={tileOwner?.ownerColor}
                      isUrgent={isUrgent}
                    />
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: tileOwner ? '#F1F5F9' : '#EEF2F7',
                    color: tileOwner ? '#1E293B' : '#64748B',
                    fontSize: 7,
                    fontWeight: 900,
                    padding: '2px 5px',
                    borderRadius: 10,
                    marginTop: 4,
                  }}
                >
                  {tileOwner
                    ? LEVEL_LABELS[buildingLevel]
                    : formatWon(tile.price ?? 0)}
                </div>
              </>
            )}
            {!isProperty && (
              <>
                <TileIcon tile={tile} size={28} />
                {tile.name && !isSpecial && (
                  <span style={{ fontSize: 8, fontWeight: 800, marginTop: 4 }}>
                    {tile.name}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {tokens.map((p, i) => (
        <PlayerToken key={p.id} player={p} idx={i} total={tokens.length} />
      ))}
    </div>
  )
}

export default BoardTile
