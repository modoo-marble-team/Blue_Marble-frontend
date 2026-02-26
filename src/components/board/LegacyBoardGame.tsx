// ─────────────────────────────────────────────
// LegacyBoardGame.tsx — 레거시 래퍼
// GamePage(FE-B)가 이 파일을 import 하므로,
// 새 GameBoard 컴포넌트를 re-export 한다.
// ─────────────────────────────────────────────
export { default } from './GameBoard'
export type { BoardGameHandle } from './GameBoard'
