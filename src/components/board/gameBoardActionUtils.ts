import { TILES, type BuildingLevel } from './board.constants'

export function toBoardActionErrorMessage(statusCode: number) {
  if (statusCode === 401) return '로그인이 필요합니다.'
  if (statusCode === 403) return '현재 턴에는 처리할 수 없습니다.'
  if (statusCode === 404) return '대상을 찾을 수 없습니다.'
  if (statusCode === 409) return '조건이 맞지 않아 처리할 수 없습니다.'
  return '요청 처리 중 오류가 발생했습니다.'
}

export function getBoardSellFallbackRefund(
  tileId: number,
  level: BuildingLevel
) {
  const basePrice = TILES[tileId]?.price ?? 0
  if (level <= 0 || basePrice === 0) return 0

  let refund = basePrice

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    if (currentLevel === 1) refund += basePrice * 0.5
    else if (currentLevel === 2) refund += basePrice * 0.5
    else if (currentLevel === 3) refund += basePrice * 0.5
    else if (currentLevel === 4) refund += basePrice * 1.0
    else if (currentLevel === 5) refund += basePrice * 1.0
    else if (currentLevel === 6) refund += basePrice * 2.0
  }

  return refund
}
