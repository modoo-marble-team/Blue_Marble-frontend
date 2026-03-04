// DEV + 환경변수 조합으로 소켓 목 모드 활성 여부를 단일 규칙으로 계산
export const IS_SOCKET_MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'
