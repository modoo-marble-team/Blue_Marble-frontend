import { getBuildCost, type BuildingLevel } from './board.constants'

const SELL_PURCHASE_PRICE_REFUND_RATIO = 0.9
const SELL_BUILD_COST_REFUND_RATIO = 0.75

export function toBoardActionErrorMessage(statusCode: number) {
  if (statusCode === 401) return '로그인이 필요합니다.'
  if (statusCode === 403) return '현재 턴에는 처리할 수 없습니다.'
  if (statusCode === 404) return '대상을 찾을 수 없습니다.'
  if (statusCode === 409) return '조건이 맞지 않아 처리할 수 없습니다.'
  return '요청 처리 중 오류가 발생했습니다.'
}

export function getBoardSellFallbackRefund(
  basePrice: number,
  level: BuildingLevel
) {
  if (level < 0 || basePrice <= 0) return 0

  const normalizedLevel = Math.max(0, Math.min(level, 3))
  const purchaseRefund = Math.trunc(
    basePrice * SELL_PURCHASE_PRICE_REFUND_RATIO
  )

  let investedBuildCost = 0
  for (
    let currentLevel = 0;
    currentLevel < normalizedLevel;
    currentLevel += 1
  ) {
    investedBuildCost += getBuildCost(basePrice, currentLevel as BuildingLevel)
  }

  const buildRefund = Math.trunc(
    investedBuildCost * SELL_BUILD_COST_REFUND_RATIO
  )

  return purchaseRefund + buildRefund
}
