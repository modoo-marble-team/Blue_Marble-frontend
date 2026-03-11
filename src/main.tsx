import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './providers/AppProviders'
import App from './App'
import { initBgm } from './lib/bgm'
import './index.css'
import { SHOULD_ENABLE_MSW } from './config/env'

// 개발 서버 또는 배포 데모 모드에서만 MSW를 활성화해 API 모킹 연결
async function enableMocking() {
  // 일반 배포 환경에서는 네트워크 요청을 그대로 사용
  if (SHOULD_ENABLE_MSW) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  }
}

// 모킹 초기화 이후 루트 앱 렌더링 실행
enableMocking().then(() => {
  // 유저 인터랙션 감지 → 오디오 unlock (게임 BGM 즉시 재생 준비)
  initBgm()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  )
})
