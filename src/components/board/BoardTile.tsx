import React from 'react'
import {
  TileData,
  TileDir,
  PlayerState,
  getStripColor,
  TileOwner,
  PLAYER_COLORS,
} from './board.constants'
import BuildingBadge from './BuildingBadge'
import { formatWon } from '../../lib/utils'

const LEVEL_LABELS: Record<number, string> = {
  0: '토지',
  1: '집 x1',
  2: '집 x2',
  3: '집 x3',
  4: '호텔 x1',
  5: '호텔 x2',
  6: '호텔 x3',
  7: '랜드마크',
}

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
  const hasBuilding = isProperty && buildingLevel >= 1
  const hasIcon = !!(tile.svgIcon || tile.emoji)

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
  // PROPERTY: 미구매=#CCCCCC, 구매 후=플레이어 색 / 비도시: 기존 로직
  const strip = isProperty
    ? ownerStyle
      ? ownerStyle.strip
      : '#CCCCCC'
    : getStripColor(tile)
  const tileBg = ownerStyle ? ownerStyle.bg : '#FFFFFF'
  const outerBorderColor = ownerStyle ? ownerStyle.strip : '#E2E8F0'
  const stripOffset = strip ? 7 : 0

  // 턴 진행 중인 플레이어가 위치한 칸이고 시간이 10초 이하일 때 애니메이션 강조
  const isUrgent = isActivePlayerTile && timeLeft <= 10 && timeLeft > 0

  // ── 코너 ─────────────────────────────────────────────────────────
  if (
    ['START', 'ISLAND', 'EVENT', 'MOVE_TO_ISLAND', 'CHANCE'].includes(tile.type)
  ) {
    // CHANCE, EVENT tiles usually appear in the middle rows, but can be corner-like if needed.
    // However, START, ISLAND, MOVE_TO_ISLAND are definitely corners.
    const isCorner =
      ['START', 'ISLAND', 'MOVE_TO_ISLAND'].includes(tile.type) ||
      dir === 'corner'
    if (isCorner || !isProperty) {
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
  }

  // ── 상단 / 하단 ───────────────────────────────────────────────────
  if (dir === 'top' || dir === 'bottom') {
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
              justifyContent: isProperty ? 'flex-start' : 'center',
              padding: isProperty ? '8px 3px' : '2px 3px',
            }}
          >
            {/* 도시명 */}
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

            {/* 비도시: 아이콘+이름 중앙 */}
            {!isProperty && (
              <>
                {!hasIcon && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: '#374151',
                      textAlign: 'center',
                    }}
                  >
                    {tile.name}
                  </span>
                )}
                <TileIcon tile={tile} size={28} />
              </>
            )}

            {/* PROPERTY 특수 영역: 중앙(건물) & 하단(가격) */}
            {isProperty && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    width: '100%',
                  }}
                >
                  {hasBuilding && (
                    <BuildingBadge
                      level={buildingLevel}
                      ownerColor={tileOwner?.ownerColor}
                      isUrgent={isUrgent}
                    />
                  )}
                </div>
                {!tileOwner && (
                  <div
                    style={{
                      backgroundColor: '#EEF2F7',
                      color: '#64748B',
                      fontSize: 7,
                      fontWeight: 900,
                      padding: '3px 6px',
                      borderRadius: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {formatWon(tile.price ?? 0)}
                  </div>
                )}
              </>
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
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '70px',
          height: '90px',
          transform: `translate(-50%, -50%) ${rotation}`,
          backgroundColor: outerBorderColor,
          borderRadius: 13,
          padding: 2,
          boxSizing: 'border-box' as const,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: tileBg,
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
              justifyContent: isProperty ? 'flex-start' : 'center',
              padding: isProperty ? '8px 3px' : '2px 3px',
            }}
          >
            {/* 도시명 */}
            {isProperty && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#374151',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  marginTop: 6,
                  marginBottom: 2,
                }}
              >
                {tile.name}
              </span>
            )}

            {/* 비도시: 아이콘+이름 중앙 */}
            {!isProperty && (
              <>
                {!hasIcon && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: '#374151',
                      textAlign: 'center',
                    }}
                  >
                    {tile.name}
                  </span>
                )}
                <TileIcon tile={tile} size={24} />
              </>
            )}

            {/* PROPERTY 특수 영역: 중앙(건물) & 하단(가격/레벨) */}
            {isProperty && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    width: '100%',
                  }}
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    letterSpacing: '-0.2px',
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
      </div>

      {tokens.map((p, i) => (
        <PlayerToken key={p.id} player={p} idx={i} total={tokens.length} />
      ))}
    </div>
  )
}

export default BoardTile
