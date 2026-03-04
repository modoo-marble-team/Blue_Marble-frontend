import React from 'react'
import {
  TileData,
  TileDir,
  PlayerState,
  getStripColor,
  TileOwner,
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

// ─── 플레이어 소유 색상 맵 ──────────────────────────────────────────
const PLAYER_OWNER_STYLES: Record<string, { strip: string; bg: string }> = {
  '#EF5350': { strip: '#FF0000', bg: '#FFCECF' },
  '#42A5F5': { strip: '#155DFC', bg: '#DCF1FF' },
  '#66BB6A': { strip: '#00A63E', bg: '#DCFCE7' },
  '#FFD15B': { strip: '#F0B100', bg: '#F7ECAC' },
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
}

const BoardTile: React.FC<BoardTileProps> = ({
  tile,
  dir,
  tokens,
  tileOwner,
}) => {
  const isCity = tile.type === 'city'
  const buildingLevel = tileOwner?.level ?? 0
  const hasBuilding = isCity && buildingLevel >= 1
  const hasIcon = !!(tile.svgIcon || tile.emoji)

  // 소유 색상 계산
  const ownerStyle =
    isCity && tileOwner
      ? (PLAYER_OWNER_STYLES[tileOwner.ownerColor] ?? null)
      : null
  // city: 미구매=#CCCCCC, 구매 후=플레이어 색 / 비도시: 기존 로직
  const strip = isCity
    ? ownerStyle
      ? ownerStyle.strip
      : '#CCCCCC'
    : getStripColor(tile)
  const tileBg = ownerStyle ? ownerStyle.bg : '#FFFFFF'
  const outerBorderColor = ownerStyle ? ownerStyle.strip : '#E2E8F0'
  const stripOffset = strip ? 7 : 0

  // ── 코너 ─────────────────────────────────────────────────────────
  if (['start', 'island', 'travel', 'go_to_island'].includes(tile.type)) {
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

  // ── 상단 / 하단 ───────────────────────────────────────────────────
  if (dir === 'top' || dir === 'bottom') {
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
              justifyContent: isCity ? 'flex-start' : 'center',
              padding: isCity ? '8px 3px' : '2px 3px',
            }}
          >
            {/* 도시명 */}
            {isCity && (
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
            {!isCity && (
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

            {/* 도시 특수 영역: 중앙(건물) & 하단(가격) */}
            {isCity && (
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
              justifyContent: isCity ? 'flex-start' : 'center',
              padding: isCity ? '8px 3px' : '2px 3px',
            }}
          >
            {/* 도시명 */}
            {isCity && (
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
            {!isCity && (
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

            {/* 도시 특수 영역: 중앙(건물) & 하단(가격) */}
            {isCity && (
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
      </div>

      {tokens.map((p, i) => (
        <PlayerToken key={p.id} player={p} idx={i} total={tokens.length} />
      ))}
    </div>
  )
}

export default BoardTile
