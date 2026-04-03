import React from 'react'
import { motion } from 'framer-motion'
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

interface TokenProps {
  player: PlayerState
  stripOffset?: number
  offset?: { x: number; y: number }
  style?: React.CSSProperties
  isTraveling?: boolean
  travelIconSrc?: string
  hideStateBadge?: boolean
}

export const PlayerToken = React.memo<TokenProps>(
  ({
    player,
    stripOffset = 0,
    offset = { x: 0, y: 0 },
    style,
    isTraveling = false,
    travelIconSrc = '/Travel- airplane.svg',
    hideStateBadge = false,
  }) => {
    const { x, y } = offset
    const isIsland =
      !hideStateBadge &&
      (player.state === 'island' || (player.skipTurns ?? 0) > 0)

    return (
      <motion.div
        layout="position"
        layoutId={`player-token-${player.id}`}
        initial={false}
        animate={{
          x: x,
          y: y + stripOffset,
          scale: isTraveling ? [1, 1.09, 1] : 1,
          rotate: isTraveling ? [0, -7, 7, 0] : 0,
          opacity: 1,
        }}
        transition={
          isTraveling
            ? {
                x: { type: 'tween', duration: 0.2, ease: 'linear' },
                y: { type: 'tween', duration: 0.2, ease: 'linear' },
                scale: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
              }
            : {
                type: 'tween',
                duration: 0.2,
                ease: 'linear',
              }
        }
        style={{
          ...style,
          position: 'relative', // Grid 컨테이너 내에서의 상대 정렬
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: isTraveling ? '#ffffff' : player.color,
          border: '2.5px solid white',

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
          color: '#fff',
          zIndex: 20,
          boxShadow: isTraveling
            ? '0 3px 10px rgba(36,95,229,0.45)'
            : '0 2px 6px rgba(0,0,0,0.35)',
        }}
      >
        {isTraveling && (
          <img
            src={travelIconSrc}
            alt="여행 이동 중"
            style={{ width: 19, height: 19, objectFit: 'contain' }}
          />
        )}
        {isIsland && !isTraveling && <span style={{ fontSize: 10 }}>🏝️</span>}
        {!hideStateBadge && (player.skipTurns ?? 0) > 0 && (
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
      </motion.div>
    )
  },
  (prev, next) => {
    return (
      prev.player.id === next.player.id &&
      prev.player.pos === next.player.pos &&
      prev.player.state === next.player.state &&
      prev.player.skipTurns === next.player.skipTurns &&
      prev.player.color === next.player.color &&
      prev.offset?.x === next.offset?.x &&
      prev.offset?.y === next.offset?.y &&
      prev.stripOffset === next.stripOffset &&
      prev.isTraveling === next.isTraveling &&
      prev.hideStateBadge === next.hideStateBadge &&
      prev.travelIconSrc === next.travelIconSrc &&
      prev.style?.gridRow === next.style?.gridRow &&
      prev.style?.gridColumn === next.style?.gridColumn
    )
  }
)

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
  tileOwner?: TileOwner
  isUrgent?: boolean
  isActivePlayerTile?: boolean
  activeEffectTileBorderColor?: string | null
}

const BoardTile: React.FC<BoardTileProps> = ({
  tile,
  dir,
  tileOwner,
  isUrgent: isUrgentProp = false,
  isActivePlayerTile = false,
  activeEffectTileBorderColor = null,
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
  const outerBorderColor =
    (isProperty && activeEffectTileBorderColor) ||
    (ownerStyle ? ownerStyle.strip : '#E2E8F0')

  const isUrgent = isActivePlayerTile && isUrgentProp

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
            fontSize: 11,
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
      </div>
    )
  }

  // ── 상단 / 하단 (중간 칸들) ─────────────────────────────────────────
  if (dir === 'top' || dir === 'bottom') {
    const isSpecial = ['CHANCE', 'EVENT', 'TRAVEL'].includes(tile.type)
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
              padding: isProperty ? '4px 3px' : '2px 3px',
            }}
          >
            {isProperty && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#374151',
                  textAlign: 'center',
                  lineHeight: '14px',
                  height: 14,
                  marginTop: 2,
                  marginBottom: -1,
                  display: 'flex',
                  alignItems: 'center',
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
                <div
                  style={{
                    flex: 1,
                    minHeight: 30,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 2,
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
                      fontSize: 10,
                      fontWeight: 900,
                      padding: '2px 5px',
                      borderRadius: 10,
                      marginBottom: -1,
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
    )
  }

  // ── 좌측 / 우측 (중간 칸들) ─────────────────────────────────────────
  const isSpecial = ['CHANCE', 'EVENT', 'TRAVEL'].includes(tile.type)

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
            justifyContent: isProperty ? 'flex-start' : 'center',
            padding: isProperty ? '2px 3px' : '2px 3px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {isProperty && (
              <>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#374151',
                    textAlign: 'center',
                    lineHeight: '14px',
                    height: 14,
                    marginTop: 2,
                    marginBottom: -1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {tile.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    minHeight: 22,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 1,
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
                      fontSize: 10,
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: 10,
                      marginTop: 0,
                    }}
                  >
                    {formatWon(tile.price ?? 0)}
                  </div>
                )}
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
    </div>
  )
}

export default React.memo(BoardTile)
