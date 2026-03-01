import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './providers/AppProviders'
import App from './App'
import './index.css'

// 개발 환경에서만 MSW를 활성화해 API 모킹 연결
async function enableMocking() {
  // 배포 환경에서는 네트워크 요청을 그대로 사용
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  }
}

// 모킹 초기화 이후 루트 앱 렌더링 실행
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  )
})
