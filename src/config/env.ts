// 문자열 env flag를 boolean 의미로 정규화
function isEnabled(value: string | undefined) {
  return value === 'true'
}

const demoMockFlag = import.meta.env.VITE_ENABLE_DEMO_MOCK

// 배포 환경에서는 실서버 종료 이후에도 데모가 끊기지 않도록 mock을 기본값으로 둔다.
// 필요 시 VITE_ENABLE_DEMO_MOCK=false를 명시해 실제 서버 모드로 강제할 수 있다.
export const IS_DEMO_MOCK_ENABLED = import.meta.env.PROD
  ? demoMockFlag !== 'false'
  : isEnabled(demoMockFlag)

// 소켓/REST 목 모드는 개발 기본값 또는 배포 데모 플래그로 활성화
export const IS_SOCKET_MOCK_ENABLED =
  (import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false') ||
  IS_DEMO_MOCK_ENABLED

// 게임 화면 우측 상단 디버그 오버레이는 개발 환경에서만 노출
export const SHOW_GAME_DEBUG_OVERLAY = import.meta.env.DEV

// MSW는 실제로 목 데이터를 사용할 때만 활성화
export const SHOULD_ENABLE_MSW = IS_SOCKET_MOCK_ENABLED
