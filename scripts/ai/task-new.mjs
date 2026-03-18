import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { getManualsForFiles, getSuggestedScripts } from './lib.mjs'

const TASKS_ROOT = path.join('docs', 'ai', 'tasks')
const TEMPLATE_ROOT = path.join(TASKS_ROOT, '_template')

export function humanizeSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function parseTaskNewArgs(argv) {
  const args = argv.slice(2)
  const force = args.includes('--force')
  const filesIndex = args.indexOf('--files')
  const slug = args.find((value) => !value.startsWith('--'))

  let files = []

  if (filesIndex !== -1) {
    files = args
      .slice(filesIndex + 1)
      .filter((value) => !value.startsWith('--'))
  }

  return {
    slug,
    files,
    force,
  }
}

function formatBulletList(items, fallback = '- 직접 채워주세요') {
  if (!items.length) {
    return fallback
  }

  return items.map((item) => `- ${item}`).join('\n')
}

function formatCodeBulletList(items, fallback = '- 직접 채워주세요') {
  if (!items.length) {
    return fallback
  }

  return items.map((item) => `- \`${item}\``).join('\n')
}

export function buildTaskFileContents({ slug, files, date = getTodayDate() }) {
  const manuals = getManualsForFiles(files)
  const suggestedScripts = getSuggestedScripts(files, {
    includeUiChecks: true,
  }).map((scriptName) => `npm run ${scriptName}`)
  const taskName = humanizeSlug(slug)
  const targetFiles = formatCodeBulletList(files)
  const relatedFiles = formatCodeBulletList([...manuals, ...files])
  const manualNotes = formatCodeBulletList(
    manuals,
    '- 관련 manual을 직접 추가해주세요'
  )
  const validationCommands = formatCodeBulletList(
    suggestedScripts,
    '- 최소 검증 명령을 직접 채워주세요'
  )

  return {
    plan: `# Plan

## Task

- 작업 이름: ${taskName}
- 요청 날짜: ${date}
- 담당 범위: ${files.length ? '입력 파일 기준 초안 생성' : '직접 채워주세요'}

## Goal

- ${taskName} 작업의 목표를 직접 채워주세요

## In Scope

${targetFiles}

## Out Of Scope

- 이번 작업에서 일부러 다루지 않을 범위를 직접 채워주세요

## Target Files

${targetFiles}

## Completion Criteria

- 사용자 관점에서 완료 기준을 직접 채워주세요
- 관련 코드, 문서, 테스트 범위를 직접 확인해주세요

## Test Plan

${validationCommands}
`,
    context: `# Context

## Current Behavior

- 지금 어떤 흐름으로 동작하는지 직접 정리해주세요
- 어디서 문제가 발생하는지 직접 정리해주세요

## Related Files

${relatedFiles}

## Constraints

${manualNotes}

## Decision Notes

- 선택한 접근 방식과 이유를 직접 정리해주세요
- 버린 대안과 이유를 직접 정리해주세요

## Open Risks

- 아직 확인이 덜 된 부분을 직접 정리해주세요
- 구현 후 꼭 다시 볼 경계 조건을 직접 정리해주세요
`,
    checklist: `# Checklist

## Implementation

- [ ] 관련 manual과 기존 문서를 읽었다
- [ ] 영향 범위를 정리했다
- [ ] 최소 범위로 구현했다
- [ ] mock/real 경로를 함께 확인했다
- [ ] 타입/contract 변경이 있으면 관련 코드도 같이 수정했다

## Testing

${
  suggestedScripts.length
    ? suggestedScripts.map((script) => `- [ ] \`${script}\``).join('\n')
    : '- [ ] 최소 검증 명령을 직접 추가했다'
}

## Review

- [ ] \`docs/rules.md\` 기준으로 셀프 리뷰했다
- [ ] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
`,
  }
}

export function createTaskWorkspace({
  slug,
  files = [],
  force = false,
  cwd = process.cwd(),
  date,
}) {
  if (!slug) {
    throw new Error(
      'task slug가 필요합니다. 예: npm run ai:task:new -- auth-refresh-cookie-flow'
    )
  }

  const taskDir = path.join(cwd, TASKS_ROOT, slug)

  if (fs.existsSync(taskDir) && !force) {
    throw new Error(
      `이미 같은 task 디렉토리가 있습니다: ${taskDir}\n덮어쓰려면 --force 를 사용하세요.`
    )
  }

  fs.mkdirSync(taskDir, {
    recursive: true,
  })

  const contents = buildTaskFileContents({
    slug,
    files,
    date,
  })

  fs.writeFileSync(path.join(taskDir, 'plan.md'), contents.plan)
  fs.writeFileSync(path.join(taskDir, 'context.md'), contents.context)
  fs.writeFileSync(path.join(taskDir, 'checklist.md'), contents.checklist)

  return {
    taskDir,
    createdFiles: [
      path.join(taskDir, 'plan.md'),
      path.join(taskDir, 'context.md'),
      path.join(taskDir, 'checklist.md'),
    ],
  }
}

function validateEnvironment() {
  if (!fs.existsSync(TEMPLATE_ROOT)) {
    throw new Error(`task template 경로를 찾을 수 없습니다: ${TEMPLATE_ROOT}`)
  }
}

export function main(argv = process.argv) {
  validateEnvironment()

  const { slug, files, force } = parseTaskNewArgs(argv)
  const result = createTaskWorkspace({
    slug,
    files,
    force,
  })

  console.log('AI task workspace created:')
  for (const file of result.createdFiles) {
    console.log(`- ${path.relative(process.cwd(), file)}`)
  }
}

const executedPath = process.argv[1]
const modulePath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === modulePath) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
