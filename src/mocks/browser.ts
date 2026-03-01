import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// 브라우저 환경 MSW 워커 인스턴스 생성
export const worker = setupWorker(...handlers)
