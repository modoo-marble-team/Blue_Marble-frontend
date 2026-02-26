import React from 'react'
import {
  TileData,
  TileDir,
  PlayerState,
  TileOwner,
  getStripColor,
} from './board.constants'
import BuildingIcon from './BuildingIcon'
import '../../styles/board.css'

// ─── PlayerToken ─────────────────────────────────────────────────
interface TokenProps {
  player: PlayerState
  idx: number
}

export const PlayerToken: React.FC<TokenProps> = ({ player, idx }) => {
  const positions: React.CSSProperties[] = [
    { bottom: 3, right: 3 },
    { bottom: 3, left: 3 },
    { top: 3, right: 3 },
    { top: 3, left: 3 },
  ]
  return (
    <div
      className="player-token"
      style={{
        ...positions[idx % 4],
        backgroundColor: player.color,
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
  tileOwner?: TileOwner // 소유 정보 (없으면 미구매)
}

const BoardTile: React.FC<BoardTileProps> = ({
  tile,
  dir,
  tokens,
  tileOwner,
}) => {
  const isCity = tile.type === 'city'

  // 구매된 타일이면 strip 색상을 ownerColor로, 배경을 #E0E9F6으로
  const strip = tileOwner ? tileOwner.ownerColor : getStripColor(tile)
  const ownedBg = tileOwner ? '#E0E9F6' : undefined

  // ── 코너 ─────────────────────────────────────────────────────────
  if (dir === 'corner') {
    return (
      <div className="board-tile board-tile--corner">
        {tile.emoji && <span className="tile-emoji">{tile.emoji}</span>}
        <span className="tile-name">{tile.name}</span>
        {tokens.map((p, i) => (
          <PlayerToken key={p.id} player={p} idx={i} />
        ))}
      </div>
    )
  }

  // ── 상단 / 하단 ───────────────────────────────────────────────────
  if (dir === 'top' || dir === 'bottom') {
    return (
      <div
        className={`board-tile board-tile--${dir}`}
        style={ownedBg ? { backgroundColor: ownedBg } : undefined}
      >
        <div className="tile-inner">
          {strip && (
            <div
              className="tile-strip"
              style={{ '--strip-color': strip } as React.CSSProperties}
            />
          )}
          <div className="tile-content">
            {tile.emoji && <span className="tile-emoji">{tile.emoji}</span>}
            <span className="tile-name">{tile.name}</span>
            {isCity && <span className="tile-price">60M</span>}
            {/* 건물 아이콘: 구매된 city 타일에만 표시 */}
            {tileOwner && tileOwner.level > 0 && (
              <BuildingIcon
                level={tileOwner.level}
                ownerColor={tileOwner.ownerColor}
              />
            )}
          </div>
        </div>
        {tokens.map((p, i) => (
          <PlayerToken key={p.id} player={p} idx={i} />
        ))}
      </div>
    )
  }

  // ── 좌측 / 우측 ───────────────────────────────────────────────────
  return (
    <div
      className={`board-tile board-tile--${dir}`}
      style={ownedBg ? { backgroundColor: ownedBg } : undefined}
    >
      <div className="tile-inner">
        {strip && (
          <div
            className="tile-strip"
            style={{ '--strip-color': strip } as React.CSSProperties}
          />
        )}
        <div className="tile-content">
          {tile.emoji && <span className="tile-emoji">{tile.emoji}</span>}
          <span className="tile-name">{tile.name}</span>
          {isCity && <span className="tile-price">60M</span>}
          {/* 건물 아이콘: 구매된 city 타일에만 표시 */}
          {tileOwner && tileOwner.level > 0 && (
            <BuildingIcon
              level={tileOwner.level}
              ownerColor={tileOwner.ownerColor}
            />
          )}
        </div>
      </div>
      {tokens.map((p, i) => (
        <PlayerToken key={p.id} player={p} idx={i} />
      ))}
    </div>
  )
}

export default BoardTile
