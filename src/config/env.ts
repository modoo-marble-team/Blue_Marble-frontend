// 문자열 env flag를 boolean 의미로 정규화
function isEnabled(value: string | undefined) {
  return value === 'true'
}

// 배포 환경에서도 데모 목 모드를 명시적으로 켤 수 있는 플래그
export const IS_DEMO_MOCK_ENABLED = isEnabled(
  import.meta.env.VITE_ENABLE_DEMO_MOCK
)

// 소켓/REST 목 모드는 개발 기본값 또는 배포 데모 플래그로 활성화
export const IS_SOCKET_MOCK_ENABLED =
  (import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false') ||
  IS_DEMO_MOCK_ENABLED

// MSW는 실제로 목 데이터를 사용할 때만 활성화
export const SHOULD_ENABLE_MSW = IS_SOCKET_MOCK_ENABLED
