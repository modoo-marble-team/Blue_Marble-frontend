import { io } from 'socket.io-client'

// 소켓 서버 기본 URL을 환경변수 또는 로컬 값으로 결정
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

// 앱 전역에서 재사용할 socket.io 클라이언트 생성
export const socket = io(SOCKET_URL, {
  autoConnect: false,
})
