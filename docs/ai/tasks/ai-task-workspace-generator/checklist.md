# Checklist

## Implementation

- [x] task workspace 생성 스크립트를 추가했다
- [x] slug와 optional `--files` 입력을 처리한다
- [x] template 기반 문서 3종을 생성한다
- [x] manual / target files / validation 초안을 자동 채운다
- [x] `package.json`에 실행 스크립트를 추가했다
- [x] README 사용 예시를 보강했다

## Testing

- [x] `npx vitest run scripts/ai/task-new.test.ts`
- [x] `npx prettier --check ...`
- [x] `npm run ai:self-review -- --files ...`

## Review

- [x] 생성 결과가 바로 수정 가능한 수준인지 확인했다
- [x] 기존 template 구조를 깨지 않는지 확인했다
- [x] 기존 manual/validation 분류 로직과 충돌하지 않는지 확인했다
