// LegacyBoardGame.tsx는 기존 import 경로를 유지하기 위한 래퍼다.
// GamePage(FE-B)가 현재 파일을 import 하고 있어,
// 실제 구현체인 GameBoard를 그대로 re-export 한다.
export { default } from './GameBoard'
export type { BoardGameHandle } from './GameBoard'
