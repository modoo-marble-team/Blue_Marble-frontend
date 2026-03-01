// unread 배지는 99개를 초과하면 99+로 표기
const UNREAD_BADGE_MAX_COUNT = 99

// unread 카운트를 배지 문자열로 포맷팅
export function formatUnreadBadgeCount(count: number) {
  // 0 이하는 배지를 표시하지 않도록 0으로 고정
  if (count <= 0) {
    return '0'
  }

  // 최대치 초과는 99+로 압축 표기
  if (count > UNREAD_BADGE_MAX_COUNT) {
    return `${UNREAD_BADGE_MAX_COUNT}+`
  }

  return `${count}`
}
