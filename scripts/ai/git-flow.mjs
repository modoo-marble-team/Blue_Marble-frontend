import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  classifyFiles,
  getChangedFiles,
  getManualsForFiles,
  getSuggestedScripts,
  getTaskSlugsFromFiles,
  getTodoSectionForTask,
  getWorkflowGateContext,
} from './lib.mjs'

const DEFAULT_BASE_BRANCH = 'develop'
const DEFAULT_RISK_LINE = '- 현재 확인된 추가 리스크는 없습니다.'
const DEFAULT_PR_BODY_FILE = '/tmp/ai-git-flow-pr-body.md'
const DEFAULT_ISSUE_BODY_FILE = '/tmp/ai-git-flow-issue-body.md'
const N_A_LIST = ['- plan: N/A', '- context: N/A', '- checklist: N/A']
const SUPPORTED_FLAGS = new Set([
  '--files',
  '--task-slug',
  '--issue-number',
  '--type',
  '--title',
  '--base',
  '--issue-body-file',
  '--pr-body-file',
  '--todo-file',
  '--commit-message',
  '--risk-line',
  '--execute',
  '--yes',
  '--json',
])
const COMMIT_TYPES = [
  'feat',
  'fix',
  'chore',
  'docs',
  'build',
  'test',
  'refactor',
  'hotfix',
]

function unique(values) {
  return [...new Set(values)]
}

function basenameWithoutExtension(targetPath) {
  return path.basename(targetPath).replace(/\.[^.]+$/, '')
}

function humanizeSlug(value) {
  return value
    .split(/[-_/]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function slugifyTitle(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function quoteCliValue(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '\\"')}"`
}

function formatBulletList(items) {
  if (items.length === 0) {
    return '- 없음'
  }

  return items.map((item) => `- ${item}`).join('\n')
}

function formatCodeBulletList(items) {
  if (items.length === 0) {
    return '- 없음'
  }

  return items.map((item) => `- \`${item}\``).join('\n')
}

function normalizeMarkdown(value) {
  return value.replace(/\r\n/g, '\n')
}

function buildRebasePolicy(baseBranch) {
  return [
    `base 브랜치에서 시작하면 branch 생성 전에 \`git fetch origin && git rebase origin/${baseBranch}\`를 실행합니다.`,
    `기존 feature branch에서도 push 직전에 \`git fetch origin && git rebase origin/${baseBranch}\`를 다시 실행합니다.`,
    'push 전 rebase로 HEAD가 바뀌면 `git push --force-with-lease`, 바뀌지 않으면 일반 `git push`를 사용합니다.',
    'rebase 충돌 시 즉시 중단하고 `git rebase --continue` 또는 `git rebase --abort`를 직접 실행하도록 안내합니다.',
  ]
}

function parseMarkdownFrontmatter(contents) {
  const normalized = normalizeMarkdown(contents)

  if (!normalized.startsWith('---\n')) {
    return {
      attributes: {},
      body: normalized,
    }
  }

  const endIndex = normalized.indexOf('\n---\n', 4)

  if (endIndex === -1) {
    return {
      attributes: {},
      body: normalized,
    }
  }

  const frontmatter = normalized.slice(4, endIndex)
  const attributes = {}

  for (const line of frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()
    attributes[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }

  return {
    attributes,
    body: normalized.slice(endIndex + '\n---\n'.length),
  }
}

function readTemplateFile(relativePath, cwd = process.cwd()) {
  const absolutePath = path.join(cwd, relativePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`템플릿 파일을 찾을 수 없습니다: ${relativePath}`)
  }

  return parseMarkdownFrontmatter(fs.readFileSync(absolutePath, 'utf8'))
}

function getTemplateHeadings(templateBody) {
  return normalizeMarkdown(templateBody)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^##\s+/.test(line))
}

function ensureTemplateHeadings(templateBody, expectedHeadings) {
  const headings = getTemplateHeadings(templateBody)

  for (const heading of expectedHeadings) {
    if (!headings.includes(heading)) {
      throw new Error(`템플릿 heading을 찾을 수 없습니다: ${heading}`)
    }
  }
}

function extractMarkdownSectionLines(contents, heading) {
  const lines = normalizeMarkdown(contents).split('\n')
  const headingLine = `## ${heading}`
  const startIndex = lines.findIndex((line) => line.trim() === headingLine)

  if (startIndex === -1) {
    return []
  }

  const sectionLines = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^##\s+/.test(line.trim())) {
      break
    }

    sectionLines.push(line)
  }

  return sectionLines
}

function trimSectionLines(lines) {
  return lines.map((line) => line.trim()).filter(Boolean)
}

function normalizeBulletText(line) {
  return line.replace(/^[-*]\s+/, '').trim()
}

function buildListFromLines(lines, fallbackLines, marker = '-') {
  const source = (lines.length > 0 ? lines : fallbackLines)
    .map((line) => normalizeBulletText(line))
    .filter(Boolean)

  if (source.length === 0) {
    return `${marker} 없음`
  }

  return source.map((line) => `${marker} ${line}`).join('\n')
}

function buildUncheckedChecklist(lines, fallbackLines) {
  const source = (lines.length > 0 ? lines : fallbackLines)
    .map((line) => normalizeBulletText(line))
    .filter(Boolean)

  const resolved = source.length > 0 ? source : ['직접 정리 필요']
  return resolved.map((line) => `- [ ] ${line}`).join('\n')
}

function buildBlockquote(lines, fallbackLine) {
  const source = lines.map((line) => normalizeBulletText(line)).filter(Boolean)
  const resolved = source.length > 0 ? source : [fallbackLine]

  return resolved.map((line) => `> ${line}`).join('\n')
}

function createFallbackTaskContext(title, files) {
  return {
    goalLines: [`${title} 작업을 진행합니다.`],
    inScopeLines: files.map((file) => `${file} 변경을 반영합니다.`).slice(0, 4),
    completionLines: [`${title} 관련 변경이 의도대로 동작합니다.`],
    testPlanLines: ['관련 Vitest와 lint를 확인합니다.'],
    currentBehaviorLines: [
      `현재 ${title} 관련 자동 생성 결과가 충분히 구체적이지 않습니다.`,
    ],
    decisionLines: [`${title} 관련 본문을 템플릿 기준으로 생성합니다.`],
  }
}

function readTaskContext(taskSlug, cwd = process.cwd()) {
  if (!taskSlug) {
    return null
  }

  const taskRoot = path.join(cwd, 'docs', 'ai', 'tasks', taskSlug)
  const planPath = path.join(taskRoot, 'plan.md')
  const contextPath = path.join(taskRoot, 'context.md')

  if (!fs.existsSync(planPath) && !fs.existsSync(contextPath)) {
    return null
  }

  const planContents = fs.existsSync(planPath)
    ? fs.readFileSync(planPath, 'utf8')
    : ''
  const contextContents = fs.existsSync(contextPath)
    ? fs.readFileSync(contextPath, 'utf8')
    : ''

  return {
    goalLines: trimSectionLines(
      extractMarkdownSectionLines(planContents, 'Goal')
    ),
    inScopeLines: trimSectionLines(
      extractMarkdownSectionLines(planContents, 'In Scope')
    ),
    completionLines: trimSectionLines(
      extractMarkdownSectionLines(planContents, 'Completion Criteria')
    ),
    testPlanLines: trimSectionLines(
      extractMarkdownSectionLines(planContents, 'Test Plan')
    ),
    currentBehaviorLines: trimSectionLines(
      extractMarkdownSectionLines(contextContents, 'Current Behavior')
    ),
    decisionLines: trimSectionLines(
      extractMarkdownSectionLines(contextContents, 'Decision Notes')
    ),
  }
}

function summarizeScopeByKind(files, prefixes, fallback) {
  const matches = files.filter((file) =>
    prefixes.some((prefix) => file.startsWith(prefix))
  )

  if (matches.length === 0) {
    return fallback
  }

  return matches.map((file) => `\`${file}\``).join(', ')
}

function buildScopeTableRows(files) {
  return [
    `| 페이지 / 화면 | ${summarizeScopeByKind(files, ['src/pages/'], '관련 변경 없음')} |`,
    `| 컴포넌트 | ${summarizeScopeByKind(files, ['src/components/', 'src/features/'], '관련 변경 없음')} |`,
    `| API / WebSocket | ${summarizeScopeByKind(files, ['src/features/auth/api/', 'src/lib/socket.ts', 'src/contracts/socket/', 'mock-socket-server/'], '관련 변경 없음')} |`,
    `| 상태 관리 | ${summarizeScopeByKind(files, ['src/stores/', 'src/features/auth/session/', 'src/features/auth/profile/'], '관련 변경 없음')} |`,
  ].join('\n')
}

function buildIssueWorkflowSection({
  taskSlug,
  referenceDocs,
  validationCommands,
}) {
  const hasTask = Boolean(taskSlug)
  const hasLint = validationCommands.some((command) => command.includes('lint'))
  const hasVitest = validationCommands.some((command) =>
    command.includes('vitest')
  )
  const hasBuild = validationCommands.some((command) =>
    command.includes('build')
  )
  const hasPlaywright = validationCommands.some((command) =>
    command.includes('playwright')
  )
  const hasCommonManual = referenceDocs.includes('docs/ai/manuals/common.md')

  return [
    '> 비사소한 작업이면 구현 전에 task slug, 읽을 문서, 검증 범위를 먼저 정해주세요.',
    '',
    `- 예상 task slug: ${taskSlug ? `\`${taskSlug}\`` : 'N/A'}`,
    `- task 문서 필요 여부: [${hasTask ? 'x' : ' '}] 필요 [${
      hasTask ? ' ' : 'x'
    }] 불필요`,
    '- 먼저 읽을 기준 문서:',
    `  - [x] AGENTS.md`,
    `  - [${hasCommonManual ? 'x' : ' '}] docs/ai/manuals/common.md`,
    `  - [x] docs/rules.md`,
    `  - [x] docs/testing.md`,
    '  - [ ] 추가 manual:',
    '- 예상 검증:',
    `  - [${hasLint ? 'x' : ' '}] npm run lint`,
    `  - [${hasVitest ? 'x' : ' '}] 관련 Vitest`,
    `  - [${hasBuild ? 'x' : ' '}] npm run build`,
    `  - [${hasPlaywright ? 'x' : ' '}] 관련 Playwright`,
    '  - [ ] 기타:',
  ].join('\n')
}

function buildIssueMetaNote(taskSlug, scaffold) {
  if (taskSlug) {
    return `- \`docs/ai/tasks/${taskSlug}/\`와 \`TODO.md\`를 함께 연결합니다.`
  }

  return `- 변경 파일 ${scaffold.files.length}개를 기준으로 issue/PR 흐름을 정리합니다.`
}

function renderIssueTemplateSections(type, scaffold) {
  const taskContext =
    readTaskContext(scaffold.taskSlug, scaffold.cwd) ??
    createFallbackTaskContext(scaffold.title, scaffold.files)

  const defaultWorkLines =
    taskContext.inScopeLines.length > 0
      ? taskContext.inScopeLines
      : scaffold.files.map((file) => `${file} 변경을 반영합니다.`).slice(0, 4)
  const defaultCompletionLines =
    taskContext.completionLines.length > 0
      ? taskContext.completionLines
      : [`${scaffold.title} 관련 결과를 확인합니다.`]
  const currentBehaviorLines =
    taskContext.currentBehaviorLines.length > 0
      ? taskContext.currentBehaviorLines
      : [`현재 ${scaffold.title} 관련 자동화 결과를 정리해야 합니다.`]
  const decisionLines =
    taskContext.decisionLines.length > 0
      ? taskContext.decisionLines
      : [`${scaffold.title} 관련 템플릿 기준 본문을 준비합니다.`]

  const commonWorkflowSection = buildIssueWorkflowSection({
    taskSlug: scaffold.taskSlug,
    referenceDocs: scaffold.referenceDocs,
    validationCommands: scaffold.validationCommands,
  })

  const baseSections = {
    feat: {
      '## ✨ 기능 개요': buildBlockquote(
        taskContext.goalLines,
        `${scaffold.title} 기능을 추가합니다.`
      ),
      '## 🎯 기능 상세 설명': buildBlockquote(
        defaultWorkLines,
        `${scaffold.title} 동작을 구체화합니다.`
      ),
      '## 💡 제안 배경 / 동기': buildBlockquote(
        currentBehaviorLines,
        `${scaffold.title} 기능이 필요한 배경을 정리합니다.`
      ),
      '## 📂 작업 범위 (Scope)': [
        '| 구분 | 대상 |',
        '| --- | --- |',
        buildScopeTableRows(scaffold.files),
      ].join('\n'),
      '## 🤖 AI Workflow 준비': commonWorkflowSection,
      '## 📝 세부 작업 목록': buildUncheckedChecklist(defaultWorkLines, [
        `${scaffold.title} 작업 범위를 정리합니다.`,
      ]),
      '## ✅ 완료 기준 (Acceptance Criteria)': buildUncheckedChecklist(
        defaultCompletionLines,
        [`${scaffold.title} 완료 기준을 정리합니다.`]
      ),
      '## 🖼️ UI/UX 참고 (선택)': buildBlockquote(
        [],
        '관련 UI/UX 참고는 추후 연결합니다.'
      ),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    chore: {
      '## 💡 작업 개요': buildBlockquote(
        taskContext.goalLines,
        `${scaffold.title} 작업을 정리합니다.`
      ),
      '## 📂 수정 대상': [
        '| 파일 경로 | 수정 내용 |',
        '| --------- | --------- |',
        ...scaffold.files.map(
          (file) => `| \`${file}\` | ${scaffold.title} 관련 정리 |`
        ),
      ].join('\n'),
      '## 📝 세부 작업 목록': buildUncheckedChecklist(defaultWorkLines, [
        `${scaffold.title} 변경을 반영합니다.`,
      ]),
      '## 🤖 AI Workflow 메모': [
        '- 단일 파일, 단일 세션, 낮은 회귀 위험이면 task 문서를 생략할 수 있습니다.',
        scaffold.taskSlug
          ? `- 이번 작업은 \`${scaffold.taskSlug}\` slug와 task 문서를 사용합니다.`
          : '- 이번 작업은 task 문서 없이 진행 가능한지 먼저 확인합니다.',
        '- PR 전에는 관련 검증과 `npm run ai:self-review` 결과를 기준으로 본문을 정리합니다.',
      ].join('\n'),
      '## ✅ 완료 기준': buildUncheckedChecklist(defaultCompletionLines, [
        `${scaffold.title} 변경 확인`,
      ]),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    docs: {
      '## 📝 문서화 대상': buildBlockquote(
        taskContext.goalLines,
        `${scaffold.title} 문서를 정리합니다.`
      ),
      '## 📂 문서 종류': buildUncheckedChecklist(
        scaffold.files.map((file) => file),
        ['README.md']
      ),
      '## ✏️ 작업 내용': [
        '**추가:**',
        '',
        buildListFromLines(defaultWorkLines, [`${scaffold.title} 문서 추가`]),
        '',
        '**수정:**',
        '',
        buildListFromLines(defaultWorkLines, [`${scaffold.title} 문서 수정`]),
        '',
        '**삭제:**',
        '',
        '- 없음',
      ].join('\n'),
      '## 🤖 AI Workflow 메모': [
        '- 단일 문서 수정이면 task 문서 없이 진행할 수 있습니다.',
        scaffold.taskSlug
          ? `- 이번 작업은 \`${scaffold.taskSlug}\` task 문서를 함께 사용합니다.`
          : '- 범위가 커지면 task slug와 `TODO.md` 연결을 추가합니다.',
        '- PR 전에는 문서 링크, 실행한 검증, 남은 리스크를 본문에 정리해주세요.',
      ].join('\n'),
      '## ✅ 완료 기준': buildUncheckedChecklist(defaultCompletionLines, [
        `${scaffold.title} 문서 정리 완료`,
      ]),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    test: {
      '## ✅ 작업 개요': buildBlockquote(
        taskContext.goalLines,
        `${scaffold.title} 테스트를 정리합니다.`
      ),
      '## 📂 테스트 대상': [
        '| 테스트 파일 | 테스트 대상 |',
        '| ----------- | ----------- |',
        ...scaffold.files.map(
          (file) => `| \`${file}\` | ${scaffold.title} 관련 검증 |`
        ),
      ].join('\n'),
      '## 📝 테스트 케이스 목록': buildUncheckedChecklist(defaultWorkLines, [
        `${scaffold.title} 테스트 케이스 정리`,
      ]),
      '## 🤖 AI Workflow 메모': [
        '- 테스트 전용 소규모 수정이면 task 문서를 생략할 수 있습니다.',
        scaffold.taskSlug
          ? `- 이번 작업은 \`${scaffold.taskSlug}\` task 문서를 사용합니다.`
          : '- 테스트 범위가 넓어지면 task slug와 `TODO.md`를 연결합니다.',
        '- PR 전에는 어떤 계약과 시나리오를 검증했는지 `npm run ai:self-review`와 함께 정리해주세요.',
      ].join('\n'),
      '## ✅ 완료 기준': buildUncheckedChecklist(defaultCompletionLines, [
        `${scaffold.title} 테스트 완료`,
      ]),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    build: {
      '## 🚚 작업 개요': buildBlockquote(
        taskContext.goalLines,
        `${scaffold.title} 빌드 관련 작업을 진행합니다.`
      ),
      '## 📂 수정 대상': buildUncheckedChecklist(scaffold.files, [
        'package.json / 설정 파일',
      ]),
      '## 📝 변경 사항 상세': [
        '| 항목 | 변경 전 | 변경 후 |',
        '| ---- | ------- | ------- |',
        `| 빌드/설정 | 기존 동작 유지 | ${scaffold.title} 반영 |`,
      ].join('\n'),
      '## ⚠️ 영향 범위': buildUncheckedChecklist([], ['없음']),
      '## 🤖 AI Workflow 준비': commonWorkflowSection,
      '## ✅ 완료 기준': buildUncheckedChecklist(defaultCompletionLines, [
        '로컬 빌드 정상 확인',
      ]),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    refactor: {
      '## ♻️ 리팩터링 목적': buildBlockquote(
        taskContext.goalLines,
        `${scaffold.title} 리팩터링 목적을 정리합니다.`
      ),
      '## 📂 대상 파일 / 컴포넌트': [
        '| 파일 경로 | 리팩터링 이유 |',
        '| --------- | ------------- |',
        ...scaffold.files.map(
          (file) => `| \`${file}\` | ${scaffold.title} 정리 |`
        ),
      ].join('\n'),
      '## 🚨 현재 문제점': [
        '```typescript',
        '// 문제가 있는 현재 코드 예시 (선택)',
        '```',
        '',
        '**문제점:**',
        '',
        buildListFromLines(currentBehaviorLines, [
          `${scaffold.title} 관련 문제점 정리`,
        ]),
      ].join('\n'),
      '## 💡 개선 방향': [
        '```typescript',
        '// 개선 후 예상 코드 예시 (선택)',
        '```',
        '',
        '**개선 내용:**',
        '',
        buildListFromLines(defaultWorkLines, [
          `${scaffold.title} 개선 방향 정리`,
        ]),
      ].join('\n'),
      '## 🤖 AI Workflow 준비': commonWorkflowSection,
      '## ✅ 완료 기준': buildUncheckedChecklist(defaultCompletionLines, [
        `${scaffold.title} 리팩터링 완료`,
      ]),
      '## ⚠️ 사이드 이펙트 검토': buildUncheckedChecklist(decisionLines, [
        '영향 범위를 확인합니다.',
      ]),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    fix: {
      '## 🐛 버그 설명': buildBlockquote(
        currentBehaviorLines,
        `${scaffold.title} 버그를 설명합니다.`
      ),
      '## 📍 재현 방법': [
        '1. 관련 화면에 진입한다.',
        '2. 현재 동작을 재현한다.',
        '3. 문제를 확인한다.',
      ].join('\n'),
      '## 🎯 기대 동작': buildBlockquote(
        defaultCompletionLines,
        `${scaffold.title} 기대 동작을 정리합니다.`
      ),
      '## 💥 실제 동작': buildBlockquote(
        currentBehaviorLines,
        `${scaffold.title} 실제 동작을 정리합니다.`
      ),
      '## 📸 스크린샷 / 에러 로그': [
        '<details>',
        '<summary>에러 로그 펼치기</summary>',
        '',
        '```',
        '로그는 구현 중 직접 채워주세요',
        '```',
        '',
        '</details>',
      ].join('\n'),
      '## 🌐 환경 정보': [
        '| 항목 | 내용 |',
        '| ---- | ---- |',
        '| OS | 미정 |',
        '| 브라우저 | 미정 |',
        '| 화면 / 페이지 | 관련 변경 파일 기준 정리 |',
        '| 발생 시점 | 재현 단계 기준 정리 |',
      ].join('\n'),
      '## 📂 예상 원인 및 수정 범위': [
        '| 구분 | 내용 |',
        '| ---- | ---- |',
        `| 예상 원인 | ${normalizeBulletText(currentBehaviorLines[0] ?? `${scaffold.title} 원인 분석 예정`)} |`,
        `| 수정 파일 | ${formatCodeBulletList(scaffold.files).replace(/\n/g, '<br />')} |`,
      ].join('\n'),
      '## 🤖 AI Workflow 준비': commonWorkflowSection,
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
    hotfix: {
      '## 🚨 긴급 상황 요약': buildBlockquote(
        currentBehaviorLines,
        `${scaffold.title} 긴급 상황을 정리합니다.`
      ),
      '## 💥 증상': buildBlockquote(
        currentBehaviorLines,
        `${scaffold.title} 증상을 설명합니다.`
      ),
      '## 📍 발생 위치': [
        '| 항목 | 내용 |',
        '| ---- | ---- |',
        '| 화면 / 페이지 | 관련 변경 파일 기준 정리 |',
        '| 발생 시점 | 재현 단계 기준 정리 |',
        '| 영향 범위 | 확인 필요 |',
      ].join('\n'),
      '## 📸 에러 로그': [
        '<details>',
        '<summary>에러 로그 펼치기</summary>',
        '',
        '```',
        '에러 메시지를 여기에 붙여넣기',
        '```',
        '',
        '</details>',
      ].join('\n'),
      '## ⚡ 임시 대응 방안 (선택)': buildBlockquote(
        decisionLines,
        '임시 대응 방안은 확인 후 정리합니다.'
      ),
      '## 🔧 근본 원인 분석': buildBlockquote(
        decisionLines,
        `${scaffold.title} 근본 원인을 분석합니다.`
      ),
      '## 🤖 AI Workflow 준비': commonWorkflowSection,
      '## ✅ 수정 완료 기준': buildUncheckedChecklist(defaultCompletionLines, [
        `${scaffold.title} 긴급 수정 완료`,
      ]),
      '## 🔗 관련 이슈 / PR': '- PR: 생성 후 연결 예정',
      '## 📌 추가 메모': buildIssueMetaNote(scaffold.taskSlug, scaffold),
    },
  }

  return baseSections[type]
}

function renderTemplateBodyFromSections(headings, sections, options = {}) {
  const separator = options.separator ?? '\n\n'
  const renderedSections = headings.map((heading) => {
    const body = sections[heading]

    if (typeof body !== 'string') {
      throw new Error(`템플릿 section 값이 없습니다: ${heading}`)
    }

    return `${heading}\n\n${body}`.trimEnd()
  })

  return renderedSections.join(separator)
}

function formatTaskDocumentSection(taskSlug) {
  if (!taskSlug) {
    return N_A_LIST.join('\n')
  }

  return [
    `- plan: docs/ai/tasks/${taskSlug}/plan.md`,
    `- context: docs/ai/tasks/${taskSlug}/context.md`,
    `- checklist: docs/ai/tasks/${taskSlug}/checklist.md`,
  ].join('\n')
}

function formatTodoSection(taskSlug, todoStatus) {
  if (!taskSlug) {
    return [
      '- task slug: N/A',
      '- TODO status: N/A',
      '- TODO entry 확인: N/A',
    ].join('\n')
  }

  const resolvedStatus = todoStatus ?? 'Not Found'
  const entryNote =
    todoStatus === null
      ? `TODO.md에 \`${taskSlug}\` 항목이 아직 없습니다.`
      : `TODO.md와 docs/ai/tasks/${taskSlug}/가 1:1로 연결됨`

  return [
    `- task slug: ${taskSlug}`,
    `- TODO status: ${resolvedStatus}`,
    `- TODO entry 확인: ${entryNote}`,
  ].join('\n')
}

function parseTemplateChecklist(lines) {
  return lines
    .map((line) => line.trim())
    .filter((line) => /^- \[[ x]\]/.test(line))
    .map((line) => line.replace(/^- \[[ x]\]\s*/, '').trim())
}

function inferType(files, explicitType) {
  if (explicitType) {
    return explicitType
  }

  if (files.length === 0) {
    return 'chore'
  }

  const classified = classifyFiles(files)
  const testFilesOnly = files.every((file) =>
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
  )
  const repoAutomationOnly = files.every(
    (file) =>
      file.startsWith('scripts/') ||
      file.startsWith('docs/') ||
      file.startsWith('.github/') ||
      ['package.json', 'package-lock.json', 'TODO.md', 'AGENTS.md'].includes(
        file
      )
  )

  if (classified.docsOnly) {
    return 'docs'
  }

  if (testFilesOnly) {
    return 'test'
  }

  if (repoAutomationOnly) {
    return 'chore'
  }

  return 'feat'
}

function inferTaskSlug(files, explicitTaskSlug) {
  if (explicitTaskSlug) {
    return explicitTaskSlug
  }

  const taskSlugs = getTaskSlugsFromFiles(files)
  return taskSlugs.length === 1 ? taskSlugs[0] : ''
}

function inferTitle(files, taskSlug, explicitTitle) {
  if (explicitTitle) {
    return explicitTitle
  }

  if (taskSlug) {
    return humanizeSlug(taskSlug)
  }

  if (files.length > 0) {
    return humanizeSlug(basenameWithoutExtension(files[0]))
  }

  return 'Workflow Update'
}

function buildValidationCommands(files, options) {
  const commands = []
  const suggestedScripts = getSuggestedScripts(files, {
    includeUiChecks: true,
  }).map((scriptName) => `npm run ${scriptName}`)
  const changedTests = files.filter((file) =>
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
  )
  const fileArgs = files.map((file) => quoteCliValue(file)).join(' ')
  const selfReviewCommand =
    files.length > 0
      ? `npm run ai:self-review -- --files ${fileArgs}`
      : 'npm run ai:self-review'

  commands.push(...suggestedScripts)

  if (changedTests.length > 0) {
    commands.push(
      `npx vitest run ${changedTests
        .map((file) => quoteCliValue(file))
        .join(' ')}`
    )
  }

  commands.push(selfReviewCommand)

  if (options.includePrGate) {
    commands.push(
      `npm run ai:pr-gate -- --files ${fileArgs} --pr-body-file ${quoteCliValue(
        options.prBodyFile
      )}`
    )
  }

  return unique(commands)
}

function buildReferenceDocs(files) {
  return unique([
    'AGENTS.md',
    'docs/ai/manuals/common.md',
    'docs/rules.md',
    'docs/testing.md',
    ...getManualsForFiles(files).filter(
      (manual) =>
        ![
          'docs/ai/manuals/common.md',
          'docs/rules.md',
          'docs/testing.md',
        ].includes(manual)
    ),
  ])
}

function buildPrWorkSummaryLines(scaffold) {
  const taskContext =
    readTaskContext(scaffold.taskSlug, scaffold.cwd) ??
    createFallbackTaskContext(scaffold.title, scaffold.files)
  const summaryCandidates = [
    ...taskContext.inScopeLines,
    ...taskContext.goalLines,
  ]
    .map((line) => normalizeBulletText(line))
    .filter(Boolean)

  if (summaryCandidates.length > 0) {
    return unique(summaryCandidates)
      .slice(0, 4)
      .map((line) => `- ${line}`)
  }

  return [
    `- ${scaffold.title} 변경을 반영했습니다.`,
    `- 관련 변경 파일 ${scaffold.files.length}개를 기준으로 동작을 정리했습니다.`,
  ]
}

function buildPrChecklistSection(templateBody, scaffold) {
  const checklistLines = parseTemplateChecklist(
    extractMarkdownSectionLines(templateBody, '✅ 체크리스트')
  )

  return checklistLines
    .map((line) => {
      const checked =
        line === '관련 이슈 연결 완료' ||
        line === '참고한 기준 문서를 PR 본문에 남겼다' ||
        line === '실행한 검증과 남은 리스크를 PR 본문에 적었다' ||
        (line === '큰 작업이면 task 문서 링크를 남겼다' &&
          Boolean(scaffold.taskSlug)) ||
        (line === '큰 작업이면 `TODO.md` / task slug 연결을 PR 본문에 남겼다' &&
          Boolean(scaffold.taskSlug))

      return `- [${checked ? 'x' : ' '}] ${line}`
    })
    .join('\n')
}

function buildPrTemplateSections(scaffold, templateBody, riskLine) {
  const issueLine = scaffold.issueNumber
    ? `> closes #${scaffold.issueNumber}`
    : '> closes #이슈번호'

  return {
    '## 📌 관련 이슈': issueLine,
    '## 📝 작업 내용': buildPrWorkSummaryLines(scaffold).join('\n'),
    '## 🧠 Task 문서 (큰 작업이면 필수)': formatTaskDocumentSection(
      scaffold.taskSlug
    ),
    '## 📋 TODO.md 연결': formatTodoSection(
      scaffold.taskSlug,
      scaffold.todoStatus
    ),
    '## 📚 참고한 기준 문서': formatCodeBulletList(scaffold.referenceDocs),
    '## 🧪 실행한 검증': formatCodeBulletList(scaffold.validationCommands),
    '## ⚠️ 남은 리스크': riskLine,
    '## ✅ 체크리스트': buildPrChecklistSection(templateBody, scaffold),
    '## 📸 스크린샷 (선택)': '> UI 변경이 있을 경우 첨부해주세요.',
  }
}

function buildPrBody({ scaffold, riskLine = DEFAULT_RISK_LINE }) {
  const prTemplate = readTemplateFile(
    '.github/PULL_REQUEST_TEMPLATE.md',
    scaffold.cwd
  )
  const headings = getTemplateHeadings(prTemplate.body)

  ensureTemplateHeadings(prTemplate.body, [
    '## 📌 관련 이슈',
    '## 📝 작업 내용',
    '## 🧠 Task 문서 (큰 작업이면 필수)',
    '## 📋 TODO.md 연결',
    '## 📚 참고한 기준 문서',
    '## 🧪 실행한 검증',
    '## ⚠️ 남은 리스크',
    '## ✅ 체크리스트',
    '## 📸 스크린샷 (선택)',
  ])

  return renderTemplateBodyFromSections(
    headings,
    buildPrTemplateSections(scaffold, prTemplate.body, riskLine),
    { separator: '\n\n---\n\n' }
  )
}

function buildIssueScaffold(type, scaffold) {
  const issueTemplate = readTemplateFile(
    `.github/ISSUE_TEMPLATE/${type}.md`,
    scaffold.cwd
  )
  const headings = getTemplateHeadings(issueTemplate.body)
  const issueSections = renderIssueTemplateSections(type, scaffold)

  for (const heading of Object.keys(issueSections)) {
    ensureTemplateHeadings(issueTemplate.body, [heading])
  }

  const issueTitlePrefix = issueTemplate.attributes.title ?? ''
  const labels = (issueTemplate.attributes.labels ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return {
    issueTitle: `${issueTitlePrefix}${scaffold.title}`.trim(),
    issueLabels: labels,
    issueBody: renderTemplateBodyFromSections(headings, issueSections),
    issueTemplatePath: `.github/ISSUE_TEMPLATE/${type}.md`,
    issueTemplateName: issueTemplate.attributes.name ?? '',
  }
}

function parseIssueNumber(value) {
  const match = value.match(/\/issues\/(\d+)(?:\/|$)/)
  return match?.[1] ?? ''
}

function validateCommitType(type) {
  if (!type || COMMIT_TYPES.includes(type)) {
    return
  }

  throw new Error(`지원하지 않는 commit type입니다: ${type}`)
}

function ensureFilesExist(files) {
  if (files.length > 0) {
    return
  }

  throw new Error(
    '변경 파일이 없습니다. `--files`를 주거나 작업 트리에 변경을 만든 뒤 다시 실행하세요.'
  )
}

function defaultWriteFile(targetPath, contents) {
  fs.writeFileSync(targetPath, contents)
}

function defaultReadTodo(todoFile) {
  return fs.existsSync(todoFile) ? fs.readFileSync(todoFile, 'utf8') : ''
}

function defaultRunCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    input: options.input ?? null,
    stdio: 'pipe',
  })

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

async function defaultConfirmStep(stepTitle, lines) {
  const rl = createInterface({ input, output })
  try {
    console.log('')
    console.log(stepTitle)
    console.log(lines.join('\n'))
    const answer = await rl.question('계속 진행할까요? [y/N] ')
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}

function trimLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function getCurrentBranch(runCommand, cwd) {
  const result = runCommand('git', ['branch', '--show-current'], { cwd })

  if (result.status !== 0) {
    throw new Error(
      `현재 브랜치를 읽지 못했습니다.\n${result.stderr || result.stdout}`
    )
  }

  return result.stdout.trim()
}

function getHeadSha(runCommand, cwd) {
  const result = runCommand('git', ['rev-parse', 'HEAD'], { cwd })

  if (result.status !== 0) {
    throw new Error(
      `HEAD SHA를 읽지 못했습니다.\n${result.stderr || result.stdout}`
    )
  }

  return result.stdout.trim()
}

function getStagedFiles(runCommand, cwd) {
  const result = runCommand('git', ['diff', '--cached', '--name-only'], { cwd })

  if (result.status !== 0) {
    throw new Error(
      `staged 파일 목록을 읽지 못했습니다.\n${result.stderr || result.stdout}`
    )
  }

  return trimLines(result.stdout)
}

function extractSingleLine(value) {
  return trimLines(value)[0] ?? ''
}

function ensureCommandSuccess(result, errorMessage) {
  if (result.status === 0) {
    return result
  }

  const detail = [result.stderr, result.stdout]
    .filter(Boolean)
    .join('\n')
    .trim()
  throw new Error(detail ? `${errorMessage}\n${detail}` : errorMessage)
}

export function parseGitFlowArgs(argv) {
  const args = argv.slice(2)
  const parsed = {
    files: null,
    taskSlug: '',
    issueNumber: '',
    type: '',
    title: '',
    base: DEFAULT_BASE_BRANCH,
    issueBodyFile: '',
    prBodyFile: '',
    json: false,
    todoFile: 'TODO.md',
    execute: false,
    yes: false,
    commitMessage: '',
    riskLine: DEFAULT_RISK_LINE,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg.startsWith('--') && !SUPPORTED_FLAGS.has(arg)) {
      throw new Error(`지원하지 않는 옵션입니다: ${arg}`)
    }

    switch (arg) {
      case '--files': {
        const files = []

        for (
          let fileIndex = index + 1;
          fileIndex < args.length && !args[fileIndex].startsWith('--');
          fileIndex += 1
        ) {
          files.push(args[fileIndex])
          index = fileIndex
        }

        parsed.files = files
        break
      }
      case '--task-slug':
        parsed.taskSlug = args[index + 1] ?? parsed.taskSlug
        index += 1
        break
      case '--issue-number':
        parsed.issueNumber = args[index + 1] ?? parsed.issueNumber
        index += 1
        break
      case '--type':
        parsed.type = args[index + 1] ?? parsed.type
        index += 1
        break
      case '--title':
        parsed.title = args[index + 1] ?? parsed.title
        index += 1
        break
      case '--base':
        parsed.base = args[index + 1] ?? parsed.base
        index += 1
        break
      case '--issue-body-file':
        parsed.issueBodyFile = args[index + 1] ?? parsed.issueBodyFile
        index += 1
        break
      case '--pr-body-file':
        parsed.prBodyFile = args[index + 1] ?? parsed.prBodyFile
        index += 1
        break
      case '--todo-file':
        parsed.todoFile = args[index + 1] ?? parsed.todoFile
        index += 1
        break
      case '--commit-message':
        parsed.commitMessage = args[index + 1] ?? parsed.commitMessage
        index += 1
        break
      case '--risk-line':
        parsed.riskLine = args[index + 1] ?? parsed.riskLine
        index += 1
        break
      case '--execute':
        parsed.execute = true
        break
      case '--yes':
        parsed.yes = true
        break
      case '--json':
        parsed.json = true
        break
      default:
        break
    }
  }

  return parsed
}

export function buildGitFlowScaffold(options = {}) {
  const files = (options.files ?? []).slice().sort()
  const taskSlug = inferTaskSlug(files, options.taskSlug)
  const title = inferTitle(files, taskSlug, options.title)
  const type = inferType(files, options.type)
  const issueNumber = options.issueNumber?.trim() ?? ''
  const baseBranch = options.base ?? DEFAULT_BASE_BRANCH
  const todoContent = options.todoContent ?? ''
  const cwd = options.cwd ?? process.cwd()
  const todoStatus = taskSlug
    ? getTodoSectionForTask(todoContent, taskSlug)
    : null
  const referenceDocs = buildReferenceDocs(files)
  const gateContext = getWorkflowGateContext(files)
  const prBodyFile = options.prBodyFile || DEFAULT_PR_BODY_FILE
  const validationCommands = buildValidationCommands(files, {
    includePrGate: gateContext.isEnforcedLargeChange,
    prBodyFile,
  })
  const branchSlug = taskSlug || slugifyTitle(title) || 'update'
  const branchName = issueNumber
    ? `${type}/${issueNumber}-${branchSlug}`
    : `${type}/<issue-number>-${branchSlug}`
  const commitMessage = options.commitMessage?.trim() || `${type}: ${title}`

  validateCommitType(type)

  const scaffold = {
    cwd,
    files,
    taskSlug,
    todoStatus,
    issueNumber,
    type,
    title,
    baseBranch,
    branchName,
    commitMessage,
    prTitle: `${type}: ${title}`,
    validationCommands,
    referenceDocs,
    rebasePolicy: buildRebasePolicy(baseBranch),
    gateContext,
  }

  const issueScaffold = buildIssueScaffold(type, scaffold)

  const prBody = buildPrBody({
    scaffold: {
      ...scaffold,
      ...issueScaffold,
    },
    riskLine: options.riskLine || DEFAULT_RISK_LINE,
  })

  return {
    ...scaffold,
    ...issueScaffold,
    prBody,
  }
}

function printExecutionSummary(scaffold) {
  console.log('Execution Summary')
  console.log(`- Base Branch: ${scaffold.baseBranch}`)
  console.log(`- Current Issue: ${scaffold.issueNumber || 'new issue needed'}`)
  console.log(`- Branch Name: ${scaffold.branchName}`)
  console.log(`- Commit Message: ${scaffold.commitMessage}`)
  console.log(`- Rebase Target: origin/${scaffold.baseBranch}`)
  console.log(
    '- Rebase Flow: branch-before-create(if on base) + before-push(always)'
  )
  console.log(
    `- Workflow Gate: ${scaffold.gateContext.isEnforcedLargeChange ? 'enforced' : 'not enforced'}`
  )
  console.log(`- Files: ${scaffold.files.length}`)
}

export function printGitFlowScaffold(title, scaffold) {
  console.log(title)
  console.log('')
  console.log(`Base Branch: ${scaffold.baseBranch}`)
  console.log(`Detected Type: ${scaffold.type}`)
  console.log(`Task Slug: ${scaffold.taskSlug || 'N/A'}`)
  console.log(`TODO Status: ${scaffold.todoStatus ?? 'N/A'}`)
  console.log(
    `Workflow Gate: ${scaffold.gateContext.isEnforcedLargeChange ? 'enforced' : 'not enforced'}`
  )
  console.log('')
  console.log('Changed Files')
  console.log(formatBulletList(scaffold.files))
  console.log('')
  console.log('Issue Title')
  console.log(scaffold.issueTitle)
  console.log('')
  console.log('Issue Body')
  console.log(scaffold.issueBody)
  console.log('')
  console.log('Branch Name')
  console.log(scaffold.branchName)
  console.log('')
  console.log('Commit Message')
  console.log(scaffold.commitMessage)
  console.log('')
  console.log('Rebase Policy')
  console.log(formatBulletList(scaffold.rebasePolicy))
  console.log('')
  console.log('PR Title')
  console.log(scaffold.prTitle)
  console.log('')
  console.log('PR Body')
  console.log(scaffold.prBody)
}

async function confirmStep(stepTitle, lines, options, confirmFn) {
  if (options.yes) {
    return true
  }

  return confirmFn(stepTitle, lines)
}

function createExecutionResult(scaffold) {
  return {
    issueNumber: scaffold.issueNumber || '',
    issueUrl: '',
    baseBranch: scaffold.baseBranch,
    branchName: scaffold.branchName,
    branchCreated: false,
    skippedBranchCreation: false,
    rebaseBeforeBranch: false,
    rebaseBeforePush: false,
    rebasedBeforePush: false,
    stagedFiles: [],
    commitSha: '',
    pushMode: '',
    prUrl: '',
    stoppedAt: '',
    executedCommands: [],
  }
}

function recordCommand(result, command, args) {
  result.executedCommands.push([command, ...args].join(' '))
}

function runAndRecord(execution, runCommand, command, args, options, label) {
  recordCommand(execution, command, args)
  return ensureCommandSuccess(
    runCommand(command, args, options),
    `${label} 실패`
  )
}

export async function runGitFlow(options = {}, deps = {}) {
  const cwd = options.cwd ?? process.cwd()
  const runCommand = deps.runCommand ?? defaultRunCommand
  const writeFile = deps.writeFile ?? defaultWriteFile
  const readTodo = deps.readTodo ?? defaultReadTodo
  const confirmFn = deps.confirmStep ?? defaultConfirmStep
  const issueBodyFile = options.issueBodyFile || DEFAULT_ISSUE_BODY_FILE
  const prBodyFile = options.prBodyFile || DEFAULT_PR_BODY_FILE
  const todoContent = readTodo(options.todoFile ?? 'TODO.md')
  const initialScaffold = buildGitFlowScaffold({
    ...options,
    prBodyFile,
    issueBodyFile,
    todoContent,
  })

  ensureFilesExist(initialScaffold.files)

  const currentBranch = getCurrentBranch(runCommand, cwd)
  let scaffold = initialScaffold
  const execution = createExecutionResult(scaffold)

  writeFile(issueBodyFile, scaffold.issueBody)
  writeFile(prBodyFile, scaffold.prBody)

  printExecutionSummary(scaffold)

  if (!scaffold.issueNumber) {
    const approved = await confirmStep(
      'Issue 생성',
      [`- Title: ${scaffold.issueTitle}`, `- Body File: ${issueBodyFile}`],
      options,
      confirmFn
    )

    if (!approved) {
      execution.stoppedAt = 'issue'
      return execution
    }

    const issueCreate = runAndRecord(
      execution,
      runCommand,
      'gh',
      [
        'issue',
        'create',
        '--title',
        scaffold.issueTitle,
        '--body-file',
        issueBodyFile,
        ...scaffold.issueLabels.flatMap((label) => ['--label', label]),
      ],
      { cwd },
      'GitHub issue 생성'
    )
    const issueUrl = extractSingleLine(issueCreate.stdout)
    const issueNumber = parseIssueNumber(issueUrl)

    scaffold = buildGitFlowScaffold({
      ...options,
      issueNumber,
      prBodyFile,
      issueBodyFile,
      todoContent,
    })
    writeFile(prBodyFile, scaffold.prBody)
    execution.issueNumber = issueNumber
    execution.issueUrl = issueUrl
    execution.branchName = scaffold.branchName
  } else {
    execution.issueNumber = scaffold.issueNumber
  }

  let activeBranch = currentBranch

  if (currentBranch === scaffold.baseBranch) {
    const approved = await confirmStep(
      '브랜치 생성 전 rebase',
      [`- Base: ${scaffold.baseBranch}`, `- Current Branch: ${currentBranch}`],
      options,
      confirmFn
    )

    if (!approved) {
      execution.stoppedAt = 'rebase-before-branch'
      return execution
    }

    runAndRecord(
      execution,
      runCommand,
      'git',
      ['fetch', 'origin'],
      { cwd },
      'origin fetch'
    )

    try {
      runAndRecord(
        execution,
        runCommand,
        'git',
        ['rebase', `origin/${scaffold.baseBranch}`],
        { cwd },
        'branch 생성 전 rebase'
      )
      execution.rebaseBeforeBranch = true
    } catch (error) {
      execution.stoppedAt = 'rebase-before-branch'
      throw new Error(
        `${error.message}\n충돌이 났다면 파일을 정리한 뒤 \`git rebase --continue\` 또는 \`git rebase --abort\`를 직접 실행하세요.`
      )
    }

    runAndRecord(
      execution,
      runCommand,
      'git',
      ['switch', '-c', scaffold.branchName],
      { cwd },
      '브랜치 생성'
    )

    execution.branchCreated = true
    activeBranch = scaffold.branchName
  } else {
    execution.skippedBranchCreation = true
    execution.branchName = currentBranch
    activeBranch = currentBranch
  }

  const approvedCommit = await confirmStep(
    '커밋 준비',
    [
      `- Branch: ${activeBranch}`,
      `- Commit Message: ${scaffold.commitMessage}`,
      `- Files: ${scaffold.files.join(', ')}`,
    ],
    options,
    confirmFn
  )

  if (!approvedCommit) {
    execution.stoppedAt = 'commit'
    return execution
  }

  runAndRecord(
    execution,
    runCommand,
    'git',
    ['add', '--', ...scaffold.files],
    { cwd },
    '파일 스테이징'
  )

  execution.stagedFiles = getStagedFiles(runCommand, cwd)

  if (execution.stagedFiles.length === 0) {
    execution.stoppedAt = 'commit'
    throw new Error('staged 파일이 없습니다. `--files` 범위를 다시 확인하세요.')
  }

  runAndRecord(
    execution,
    runCommand,
    'git',
    ['commit', '-m', scaffold.commitMessage],
    { cwd },
    '커밋'
  )

  execution.commitSha = getHeadSha(runCommand, cwd)

  const approvedPush = await confirmStep(
    'push 전 rebase 및 push',
    [
      `- Branch: ${activeBranch}`,
      '- pre-push 훅에서 lint -> test -> coverage -> e2e:ci -> build가 실행됩니다.',
    ],
    options,
    confirmFn
  )

  if (!approvedPush) {
    execution.stoppedAt = 'push'
    return execution
  }

  const beforePushSha = execution.commitSha

  runAndRecord(
    execution,
    runCommand,
    'git',
    ['fetch', 'origin'],
    { cwd },
    'push 전 origin fetch'
  )

  try {
    runAndRecord(
      execution,
      runCommand,
      'git',
      ['rebase', `origin/${scaffold.baseBranch}`],
      { cwd },
      'push 전 rebase'
    )
    execution.rebaseBeforePush = true
  } catch (error) {
    execution.stoppedAt = 'push-rebase'
    throw new Error(
      `${error.message}\n충돌이 났다면 파일을 정리한 뒤 \`git rebase --continue\` 또는 \`git rebase --abort\`를 직접 실행하세요.`
    )
  }

  const afterPushRebaseSha = getHeadSha(runCommand, cwd)
  execution.rebasedBeforePush = beforePushSha !== afterPushRebaseSha
  execution.commitSha = afterPushRebaseSha
  execution.pushMode = execution.rebasedBeforePush
    ? 'force-with-lease'
    : 'normal'

  runAndRecord(
    execution,
    runCommand,
    'git',
    execution.rebasedBeforePush
      ? ['push', '--force-with-lease', '-u', 'origin', activeBranch]
      : ['push', '-u', 'origin', activeBranch],
    { cwd },
    'push'
  )

  writeFile(prBodyFile, scaffold.prBody)

  if (scaffold.gateContext.isEnforcedLargeChange) {
    runAndRecord(
      execution,
      runCommand,
      process.execPath,
      [
        'scripts/ai/pr-gate.mjs',
        '--files',
        ...scaffold.files,
        '--pr-body-file',
        prBodyFile,
      ],
      { cwd },
      'PR gate'
    )
  }

  const approvedPr = await confirmStep(
    'PR 생성',
    [
      `- Title: ${scaffold.prTitle}`,
      `- Base: ${scaffold.baseBranch}`,
      `- Body File: ${prBodyFile}`,
    ],
    options,
    confirmFn
  )

  if (!approvedPr) {
    execution.stoppedAt = 'pr'
    return execution
  }

  const prCreate = runAndRecord(
    execution,
    runCommand,
    'gh',
    [
      'pr',
      'create',
      '--base',
      scaffold.baseBranch,
      '--title',
      scaffold.prTitle,
      '--body-file',
      prBodyFile,
    ],
    { cwd },
    'PR 생성'
  )

  execution.prUrl = extractSingleLine(prCreate.stdout)

  return execution
}

export function printGitFlowExecutionResult(result) {
  console.log('')
  console.log('Execution Result')
  console.log(`- Issue: ${result.issueUrl || result.issueNumber || 'N/A'}`)
  console.log(`- Base Branch: ${result.baseBranch}`)
  console.log(`- Branch: ${result.branchName}`)
  console.log(`- Rebase Target: origin/${result.baseBranch}`)
  console.log(
    `- Rebase Before Branch: ${result.rebaseBeforeBranch ? 'yes' : 'no'}`
  )
  console.log(`- Rebase Before Push: ${result.rebaseBeforePush ? 'yes' : 'no'}`)
  console.log(
    `- Rebased Before Push: ${result.rebasedBeforePush ? 'yes' : 'no'}`
  )
  console.log(`- Commit: ${result.commitSha || 'N/A'}`)
  console.log(`- Push Mode: ${result.pushMode || 'N/A'}`)
  console.log(`- PR: ${result.prUrl || 'N/A'}`)
  console.log(`- Stopped At: ${result.stoppedAt || 'completed'}`)
}

export async function main(argv = process.argv) {
  const options = parseGitFlowArgs(argv)
  const files = options.files ?? getChangedFiles()
  const todoContent = defaultReadTodo(options.todoFile)
  const scaffold = buildGitFlowScaffold({
    ...options,
    files,
    todoContent,
  })

  ensureFilesExist(scaffold.files)

  if (!options.execute) {
    if (options.issueBodyFile) {
      defaultWriteFile(options.issueBodyFile, scaffold.issueBody)
    }

    if (options.prBodyFile) {
      defaultWriteFile(options.prBodyFile, scaffold.prBody)
    }

    if (options.json) {
      console.log(JSON.stringify(scaffold, null, 2))
      return
    }

    printGitFlowScaffold('AI Git Flow Scaffold', scaffold)
    return
  }

  const result = await runGitFlow({
    ...options,
    files,
    todoContent,
  })

  printGitFlowExecutionResult(result)
}

const executedPath = process.argv[1]
const modulePath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === modulePath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
