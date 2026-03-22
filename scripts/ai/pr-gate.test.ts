import { describe, expect, it } from 'vitest'

import { buildPrWorkflowGate } from './lib.mjs'

function createLargeFiles() {
  return [
    'src/pages/waiting-room/page/WaitingRoomPage.tsx',
    'src/pages/waiting-room/page/WaitingRoomFlow.tsx',
  ]
}

function buildLargePrBody(options: {
  taskSlug?: string
  todoSlug?: string
  includeTaskDocs?: boolean
  includeTodo?: boolean
  includeManual?: boolean
  includeValidation?: boolean
  includeRisk?: boolean
}) {
  const taskSlug = options.taskSlug ?? 'waiting-room-host-transfer'
  const todoSlug = options.todoSlug ?? taskSlug

  return `
## 🧠 Task 문서 (큰 작업이면 필수)

${
  options.includeTaskDocs === false
    ? '- plan: N/A\n- context: N/A\n- checklist: N/A'
    : `- plan: docs/ai/tasks/${taskSlug}/plan.md
- context: docs/ai/tasks/${taskSlug}/context.md
- checklist: docs/ai/tasks/${taskSlug}/checklist.md`
}

## 📋 TODO.md 연결

${
  options.includeTodo === false
    ? '- task slug:\n- TODO status:\n- TODO entry 확인:'
    : `- task slug: ${todoSlug}
- TODO status: In Progress
- TODO entry 확인: TODO.md와 docs/ai/tasks/${todoSlug}/가 1:1로 연결됨`
}

## 📚 참고한 기준 문서

- \`AGENTS.md\`
- \`docs/rules.md\`
- \`docs/testing.md\`
${
  options.includeManual === false
    ? '- 추가 manual / 문서 경로:'
    : '- `docs/ai/manuals/waiting-room.md`'
}

## 🧪 실행한 검증

${
  options.includeValidation === false
    ? ''
    : '- `npm run lint`\n- `npm run ai:check:waiting-room`'
}

## ⚠️ 남은 리스크

${options.includeRisk === false ? '' : '- 현재 확인된 추가 리스크는 없습니다.'}
  `.trim()
}

function buildTodoContent(slugs: string[]) {
  return `
  # TODO

  ## Ready

  ## In Progress
  ${slugs
    .map((slug) => `- [ ] \`${slug}\` - ${slug} (\`docs/ai/tasks/${slug}/\`)`)
    .join('\n')}

  ## Blocked

  ## Done
  `
}

describe('buildPrWorkflowGate', () => {
  it('passes small PRs with placeholder body', () => {
    const result = buildPrWorkflowGate({
      files: ['src/components/common/Button.tsx'],
      prBody: '',
      todoContent: buildTodoContent([]),
    })

    expect(result.isEnforcedLargeChange).toBe(false)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('fails large PRs without task document evidence', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({
        includeTaskDocs: false,
      }),
      todoContent: buildTodoContent(['waiting-room-host-transfer']),
    })

    expect(result.errors).toContain(
      '큰 PR/high-risk PR인데 task 문서 근거(plan/context/checklist)가 없습니다.'
    )
  })

  it('fails large PRs without TODO section evidence', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({
        includeTodo: false,
      }),
      todoContent: buildTodoContent(['waiting-room-host-transfer']),
    })

    expect(result.errors).toContain(
      '큰 PR/high-risk PR인데 `TODO.md 연결` 섹션이 비어 있거나 placeholder 상태입니다.'
    )
  })

  it('fails when TODO slug does not match task document evidence', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({
        taskSlug: 'waiting-room-host-transfer',
        todoSlug: 'other-task',
      }),
      todoContent: buildTodoContent(['waiting-room-host-transfer']),
    })

    expect(result.errors).toContain(
      '`TODO.md 연결` 섹션의 task slug가 task 문서 근거와 맞지 않습니다.'
    )
  })

  it('fails when referenced task slug is missing from branch TODO', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({}),
      todoContent: buildTodoContent([]),
    })

    expect(result.errors).toContain(
      'PR에서 참조한 task slug가 branch TODO.md에 없습니다: `waiting-room-host-transfer`'
    )
  })

  it('fails when required manual evidence is missing', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({
        includeManual: false,
      }),
      todoContent: buildTodoContent(['waiting-room-host-transfer']),
    })

    expect(result.errors).toContain(
      '큰 PR/high-risk PR인데 참고한 기준 문서 섹션에 필요한 manual 근거가 없습니다.'
    )
  })

  it('fails when validation evidence is missing', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({
        includeValidation: false,
      }),
      todoContent: buildTodoContent(['waiting-room-host-transfer']),
    })

    expect(result.errors).toContain(
      '큰 PR/high-risk PR인데 `실행한 검증` 섹션이 비어 있거나 placeholder 상태입니다.'
    )
  })

  it('keeps risk section as warning-only', () => {
    const result = buildPrWorkflowGate({
      files: createLargeFiles(),
      prBody: buildLargePrBody({
        includeRisk: false,
      }),
      todoContent: buildTodoContent(['waiting-room-host-transfer']),
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toContain(
      '`남은 리스크` 섹션이 비어 있거나 placeholder 상태입니다.'
    )
  })

  it('skips blocking for docs-only PRs even when file count is large', () => {
    const result = buildPrWorkflowGate({
      files: [
        'docs/a.md',
        'docs/b.md',
        'docs/c.md',
        'docs/d.md',
        'docs/e.md',
        'docs/f.md',
        'docs/g.md',
        'docs/h.md',
      ],
      prBody: '',
      todoContent: buildTodoContent([]),
    })

    expect(result.isLargeChange).toBe(true)
    expect(result.isEnforcedLargeChange).toBe(false)
    expect(result.errors).toEqual([])
  })
})
