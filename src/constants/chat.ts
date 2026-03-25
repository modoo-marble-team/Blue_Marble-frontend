// 사용자용 room chat / DM 최대 글자 수
export const CHAT_MESSAGE_MAX_LENGTH = 300

// 채팅 입력은 trim 후 최대 길이만 남기고 송신 경계에서 재사용
export function normalizeChatMessage(message: string) {
  return message.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH)
}
