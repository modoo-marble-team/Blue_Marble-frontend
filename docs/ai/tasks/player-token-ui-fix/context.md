# context

## 배경

게임 서버 접속 시 플레이어 말(원형 토큰) 안에 플레이어 번호(1·2·3·4)가 표시되어 시각적으로 불필요한 정보를 노출하였다.

## 영향 파일

| 파일                                 | 변경 내용                                       |
| ------------------------------------ | ----------------------------------------------- |
| `src/components/board/BoardTile.tsx` | PlayerToken 내 `player.id + 1` 숫자 렌더링 제거 |

## 참고

- 섬(🏝️) 아이콘과 skipTurns 배지는 유지
- `docs/ai/manuals/game-runtime.md` 경로 기준 high-risk 파일이므로 Workflow Gate 적용
