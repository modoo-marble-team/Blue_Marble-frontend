const UNREAD_BADGE_MAX_COUNT = 99

export function formatUnreadBadgeCount(count: number) {
  if (count <= 0) {
    return '0'
  }

  if (count > UNREAD_BADGE_MAX_COUNT) {
    return `${UNREAD_BADGE_MAX_COUNT}+`
  }

  return `${count}`
}
