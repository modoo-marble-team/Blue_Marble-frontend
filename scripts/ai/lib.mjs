import fs from 'node:fs'
import { execSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const TODO_SECTIONS = ['Ready', 'In Progress', 'Blocked', 'Done']
const TASK_DOC_KINDS = ['plan', 'context', 'checklist']
const LARGE_CHANGE_FILE_COUNT_THRESHOLD = 8
const PR_SECTION_HEADINGS = {
  task: '## 🧠 Task 문서 (큰 작업이면 필수)',
  todo: '## 📋 TODO.md 연결',
  manual: '## 📚 참고한 기준 문서',
  validation: '## 🧪 실행한 검증',
  risk: '## ⚠️ 남은 리스크',
}
const HIGH_RISK_PREFIXES = [
  'src/pages/lobby/',
  'src/features/presence/',
  'src/features/room-chat/',
  'src/pages/waiting-room/',
  'src/pages/GamePage.tsx',
  'src/components/game/',
  'src/components/board/',
  'src/hooks/game/',
  'src/services/socket/game.handler.ts',
  'src/stores/game.store.ts',
  'src/lib/socket.ts',
]
const TASK_PLACEHOLDER_PATTERNS = [
  '직접 채워주세요',
  '직접 정리해주세요',
  '직접 추가해주세요',
  '직접 확인해주세요',
  '직접 갱신해주세요',
]

function runGit(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

function splitLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function unique(values) {
  return [...new Set(values)]
}

function readWorkspaceFile(path) {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

export function parseScriptArgs(argv) {
  const args = argv.slice(2)
  const fileFlagIndex = args.indexOf('--files')
  const planOnly = args.includes('--plan')

  if (fileFlagIndex === -1) {
    return {
      files: null,
      planOnly,
    }
  }

  const files = args
    .slice(fileFlagIndex + 1)
    .filter((value) => !value.startsWith('--'))

  return {
    files,
    planOnly,
  }
}

export function getChangedFiles() {
  return unique([
    ...splitLines(runGit('git diff --name-only --diff-filter=ACMR')),
    ...splitLines(runGit('git diff --name-only --cached --diff-filter=ACMR')),
    ...splitLines(runGit('git ls-files --others --exclude-standard')),
  ]).sort()
}

export function getDiffText() {
  return [runGit('git diff -- .'), runGit('git diff --cached -- .')]
    .filter(Boolean)
    .join('\n')
}

export function buildDefaultTodoContents() {
  return `# TODO

## Ready

## In Progress

## Blocked

## Done
`
}

function ensureTodoStructure(todoContent) {
  const normalized = (todoContent ?? '').replace(/\r\n/g, '\n')

  if (normalized.trim().length === 0) {
    return buildDefaultTodoContents()
  }

  const lines = normalized.split('\n')

  if (!lines.some((line) => line.trim() === '# TODO')) {
    lines.unshift('# TODO', '')
  }

  for (const section of TODO_SECTIONS) {
    if (!lines.some((line) => line.trim() === `## ${section}`)) {
      lines.push('', `## ${section}`, '')
    }
  }

  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}

function getTaskWorkspaceRoot(cwd = process.cwd()) {
  return path.join(cwd, 'docs', 'ai', 'tasks')
}

function buildTodoTaskLine({ slug, title, checked = false }) {
  return `- [${checked ? 'x' : ' '}] \`${slug}\` - ${title} (\`docs/ai/tasks/${slug}/\`)`
}

export function upsertTodoTask(todoContent, options) {
  const { slug, title, section = 'Ready', checked = false } = options
  const normalized = ensureTodoStructure(todoContent)

  if (normalized.includes(`\`${slug}\``)) {
    return normalized
  }

  const lines = normalized.split('\n')
  const headingIndex = lines.findIndex(
    (line) => line.trim() === `## ${section}`
  )

  if (headingIndex === -1) {
    throw new Error(`TODO section을 찾을 수 없습니다: ${section}`)
  }

  lines.splice(headingIndex + 1, 0, buildTodoTaskLine({ slug, title, checked }))

  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}

export function getTodoSectionForTask(todoContent, slug) {
  const normalized = ensureTodoStructure(todoContent)
  const lines = normalized.split('\n')
  let currentSection = null

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('## ')) {
      currentSection = trimmedLine.replace('## ', '').trim()
      continue
    }

    if (currentSection && trimmedLine.includes(`\`${slug}\``)) {
      return currentSection
    }
  }

  return null
}

export function parseTodoTasks(todoContent) {
  const normalized = ensureTodoStructure(todoContent)
  const lines = normalized.split('\n')
  const entries = []
  let currentSection = null

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('## ')) {
      currentSection = trimmedLine.replace('## ', '').trim()
      continue
    }

    const match = trimmedLine.match(/^- \[( |x)\] `([^`]+)` - (.+)$/)

    if (!match || !currentSection) {
      continue
    }

    const [, checkedMark, slug, rawTitle] = match

    entries.push({
      slug,
      title: rawTitle.trim(),
      checked: checkedMark === 'x',
      section: currentSection,
    })
  }

  return entries
}

export function getTaskSlugsFromFiles(files) {
  const slugs = files
    .map((file) => file.match(/^docs\/ai\/tasks\/([^/]+)\//)?.[1] ?? null)
    .filter((slug) => Boolean(slug) && slug !== '_template')

  return unique(slugs)
}

function hasTodoEntryForSlug(todoContent, slug) {
  return Boolean(getTodoSectionForTask(todoContent, slug))
}

function listTaskWorkspaceSlugs(cwd = process.cwd()) {
  const tasksRoot = getTaskWorkspaceRoot(cwd)

  try {
    return fs
      .readdirSync(tasksRoot, {
        withFileTypes: true,
      })
      .filter((entry) => entry.isDirectory() && entry.name !== '_template')
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}

function isQueueManagedTaskWorkspace(planContent) {
  return (
    planContent.includes('TODO line:') || planContent.includes('Session brief:')
  )
}

function hasTaskPlaceholder(content) {
  return TASK_PLACEHOLDER_PATTERNS.some((pattern) => content.includes(pattern))
}

export function hasTaskDocumentTripletInFiles(files) {
  const groupedKindsBySlug = new Map()

  for (const file of files) {
    const match = file.match(
      /^docs\/ai\/tasks\/([^/]+)\/(plan|context|checklist)\.md$/
    )

    if (!match) {
      continue
    }

    const [, slug, kind] = match
    const kinds = groupedKindsBySlug.get(slug) ?? new Set()
    kinds.add(kind)
    groupedKindsBySlug.set(slug, kinds)
  }

  return Array.from(groupedKindsBySlug.values()).some(
    (kinds) =>
      kinds.has('plan') && kinds.has('context') && kinds.has('checklist')
  )
}

export function getWorkflowGateContext(files) {
  const classified = classifyFiles(files)
  const gateReasons = []

  if (files.length >= LARGE_CHANGE_FILE_COUNT_THRESHOLD) {
    gateReasons.push(
      `changed files ${files.length} >= ${LARGE_CHANGE_FILE_COUNT_THRESHOLD}`
    )
  }

  if (files.some((file) => matchesAnyPrefix(file, HIGH_RISK_PREFIXES))) {
    gateReasons.push('high-risk path changed')
  }

  const isLargeChange = gateReasons.length > 0
  const isEnforcedLargeChange = isLargeChange && !classified.docsOnly

  return {
    classified,
    gateReasons,
    isLargeChange,
    isEnforcedLargeChange,
  }
}

export function isLargeTaskChange(files) {
  return getWorkflowGateContext(files).isEnforcedLargeChange
}

function matchesAnyPrefix(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix))
}

function matchesSourcePrefix(file, prefixes) {
  return !file.endsWith('.md') && matchesAnyPrefix(file, prefixes)
}

function isTestFile(file) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
}

function isCodeFile(file) {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
}

export function classifyFiles(files) {
  const hasLobby = files.some((file) =>
    matchesSourcePrefix(file, [
      'src/pages/lobby/',
      'src/features/presence/',
      'src/features/room-chat/',
    ])
  )
  const hasWaitingRoom = files.some(
    (file) =>
      !file.endsWith('.md') && file.startsWith('src/pages/waiting-room/')
  )
  const hasGame = files.some((file) =>
    matchesSourcePrefix(file, [
      'src/pages/GamePage.tsx',
      'src/components/game/',
      'src/components/board/',
      'src/hooks/game/',
      'src/services/socket/game.handler.ts',
      'src/stores/game.store.ts',
      'src/mocks/handlers/game.handler.ts',
    ])
  )
  const hasSocketInfra = files.some((file) =>
    matchesSourcePrefix(file, [
      'src/contracts/socket/',
      'src/services/socket/',
      'src/lib/socket.ts',
      'mock-socket-server/',
      'src/features/presence/',
    ])
  )
  const hasHooks = files.some(
    (file) =>
      file.includes('/hooks/') ||
      /^src\/hooks\//.test(file) ||
      /use[A-Z].*\.(ts|tsx)$/.test(file)
  )
  const hasUiFiles = files.some(
    (file) =>
      (!file.endsWith('.md') && /^src\/pages\//.test(file)) ||
      (!file.endsWith('.md') && /^src\/components\//.test(file)) ||
      (!file.endsWith('.md') && /^src\/features\//.test(file))
  )
  const hasConfigLikeChanges = files.some((file) =>
    [
      'package.json',
      'vite.config.ts',
      'vitest.config.ts',
      'vitest.owner.config.ts',
      'playwright.config.ts',
      'eslint.config.js',
      'AGENTS.md',
    ].includes(file)
  )
  const hasCodeChanges = files.some((file) => isCodeFile(file))
  const hasTestChanges = files.some((file) => isTestFile(file))
  const hasSourceChanges = files.some((file) => {
    if (!isCodeFile(file)) {
      return false
    }

    return !isTestFile(file)
  })
  const docsOnly =
    files.length > 0 &&
    files.every(
      (file) =>
        file.endsWith('.md') ||
        file.startsWith('docs/') ||
        file === 'AGENTS.md' ||
        file === 'AI_WORKFLOW_SHOWCASE.md'
    )

  return {
    hasLobby,
    hasWaitingRoom,
    hasGame,
    hasSocketInfra,
    hasHooks,
    hasUiFiles,
    hasConfigLikeChanges,
    hasCodeChanges,
    hasTestChanges,
    hasSourceChanges,
    docsOnly,
  }
}

export function getManualsForFiles(files) {
  const manuals = new Set()
  const classified = classifyFiles(files)

  if (files.length > 0) {
    manuals.add('docs/ai/manuals/common.md')
    manuals.add('docs/rules.md')
    manuals.add('docs/testing.md')
  }

  if (classified.hasLobby) {
    manuals.add('docs/ai/manuals/lobby.md')
  }

  if (classified.hasWaitingRoom) {
    manuals.add('docs/ai/manuals/waiting-room.md')
  }

  if (classified.hasGame) {
    manuals.add('docs/ai/manuals/game-runtime.md')
  }

  if (classified.hasSocketInfra) {
    manuals.add('docs/socket-mock-server.md')
  }

  return [...manuals]
}

export function getSuggestedScripts(files, options = {}) {
  const { includeUiChecks = false } = options
  const classified = classifyFiles(files)
  const scripts = []

  if (classified.docsOnly) {
    return scripts
  }

  if (classified.hasCodeChanges || classified.hasConfigLikeChanges) {
    scripts.push('lint')
  }

  if (classified.hasLobby) {
    scripts.push('ai:check:lobby')
  }

  if (classified.hasWaitingRoom) {
    scripts.push('ai:check:waiting-room')
  }

  if (classified.hasGame) {
    scripts.push('ai:check:game')
  }

  if (includeUiChecks) {
    if (classified.hasLobby) {
      scripts.push('ai:check:chat-e2e')
    }

    if (classified.hasWaitingRoom) {
      scripts.push('ai:check:waiting-room-e2e')
    }

    if (
      classified.hasUiFiles ||
      classified.hasGame ||
      classified.hasConfigLikeChanges
    ) {
      scripts.push('ai:check:build')
    }
  }

  return unique(scripts)
}

function extractSection(markdown, heading) {
  const start = markdown.indexOf(heading)

  if (start === -1) {
    return ''
  }

  const rest = markdown.slice(start + heading.length)
  const nextHeadingIndex = rest.search(/\n##\s/)
  return (
    nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex)
  ).trim()
}

function splitMeaningfulLines(markdown) {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function hasMeaningfulValidationContent(section) {
  return splitMeaningfulLines(section).some((line) => {
    if (line.startsWith('>')) {
      return false
    }

    if (
      [
        '- [ ] `npm run lint`',
        '- [ ] `npm run test`',
        '- [ ] `npm run build`',
        '- [ ] 기타:',
      ].includes(line)
    ) {
      return false
    }

    if (line.startsWith('- [x]')) {
      return true
    }

    if (/^- \[ \] 기타:\s*\S+/.test(line)) {
      return true
    }

    return /^- `.+`$/.test(line) || /^- npm run /.test(line)
  })
}

function hasMeaningfulRiskContent(section) {
  return splitMeaningfulLines(section).some((line) => {
    if (line.startsWith('>')) {
      return false
    }

    if (line === '- 없음 / 또는 리스크 작성') {
      return false
    }

    return line.startsWith('- ')
  })
}

function hasMeaningfulTodoContent(section) {
  return splitMeaningfulLines(section).some((line) => {
    if (line.startsWith('>')) {
      return false
    }

    if (
      ['- task slug:', '- TODO status:', '- TODO entry 확인:'].includes(line)
    ) {
      return false
    }

    return /^- (task slug|TODO status|TODO entry 확인):\s*\S+/.test(line)
  })
}

function hasTaskDocumentLinks(section) {
  return [
    /docs\/ai\/tasks\/[^\s)]+\/plan\.md/,
    /docs\/ai\/tasks\/[^\s)]+\/context\.md/,
    /docs\/ai\/tasks\/[^\s)]+\/checklist\.md/,
  ].every((pattern) => pattern.test(section))
}

function getTaskSlugsFromTaskSection(section) {
  return unique(
    Array.from(
      section.matchAll(/docs\/ai\/tasks\/([^/\s)]+)\//g),
      (match) => match[1]
    )
  )
}

export function getRequiredWorkflowManuals(files) {
  const classified = classifyFiles(files)
  const manuals = []

  if (classified.hasLobby) {
    manuals.push('docs/ai/manuals/lobby.md')
  }

  if (classified.hasWaitingRoom) {
    manuals.push('docs/ai/manuals/waiting-room.md')
  }

  if (classified.hasGame) {
    manuals.push('docs/ai/manuals/game-runtime.md')
  }

  if (classified.hasSocketInfra) {
    manuals.push('docs/socket-mock-server.md')
  }

  return unique(manuals)
}

function hasRequiredManualEvidence(section, files) {
  const manualLines = splitMeaningfulLines(section).filter((line) =>
    line.startsWith('- ')
  )
  const requiredManuals = getRequiredWorkflowManuals(files)

  if (requiredManuals.length === 0) {
    return true
  }

  return requiredManuals.every((manual) =>
    manualLines.some((line) => line.includes(manual))
  )
}

function todoSectionMatchesTaskSlugs(section, taskSlugs) {
  if (taskSlugs.length === 0) {
    return true
  }

  return taskSlugs.every((slug) => section.includes(slug))
}

export function buildPrWorkflowGate(options) {
  const files = options.files ?? []
  const prBody = options.prBody ?? ''
  const todoContent = options.todoContent ?? ''
  const gateContext = getWorkflowGateContext(files)
  const sections = {
    task: extractSection(prBody, PR_SECTION_HEADINGS.task),
    todo: extractSection(prBody, PR_SECTION_HEADINGS.todo),
    manual: extractSection(prBody, PR_SECTION_HEADINGS.manual),
    validation: extractSection(prBody, PR_SECTION_HEADINGS.validation),
    risk: extractSection(prBody, PR_SECTION_HEADINGS.risk),
  }
  const taskSlugs = unique([
    ...getTaskSlugsFromFiles(files),
    ...getTaskSlugsFromTaskSection(sections.task),
  ])
  const errors = []
  const warnings = []
  const hasTaskDocumentEvidence =
    hasTaskDocumentLinks(sections.task) || hasTaskDocumentTripletInFiles(files)
  const missingTodoSlugs = taskSlugs.filter(
    (slug) => !hasTodoEntryForSlug(todoContent, slug)
  )

  if (gateContext.isEnforcedLargeChange) {
    if (!hasTaskDocumentEvidence) {
      errors.push(
        '큰 PR/high-risk PR인데 task 문서 근거(plan/context/checklist)가 없습니다.'
      )
    }

    if (!hasMeaningfulTodoContent(sections.todo)) {
      errors.push(
        '큰 PR/high-risk PR인데 `TODO.md 연결` 섹션이 비어 있거나 placeholder 상태입니다.'
      )
    }

    if (!todoSectionMatchesTaskSlugs(sections.todo, taskSlugs)) {
      errors.push(
        '`TODO.md 연결` 섹션의 task slug가 task 문서 근거와 맞지 않습니다.'
      )
    }

    if (missingTodoSlugs.length > 0) {
      errors.push(
        `PR에서 참조한 task slug가 branch TODO.md에 없습니다: ${missingTodoSlugs
          .map((slug) => `\`${slug}\``)
          .join(', ')}`
      )
    }

    if (!hasRequiredManualEvidence(sections.manual, files)) {
      errors.push(
        '큰 PR/high-risk PR인데 참고한 기준 문서 섹션에 필요한 manual 근거가 없습니다.'
      )
    }

    if (!hasMeaningfulValidationContent(sections.validation)) {
      errors.push(
        '큰 PR/high-risk PR인데 `실행한 검증` 섹션이 비어 있거나 placeholder 상태입니다.'
      )
    }

    if (!hasMeaningfulRiskContent(sections.risk)) {
      warnings.push('`남은 리스크` 섹션이 비어 있거나 placeholder 상태입니다.')
    }
  }

  if (taskSlugs.length > 1) {
    warnings.push(
      '여러 task slug가 한 PR에 섞여 있습니다. one-feature-per-session 원칙을 다시 확인하세요.'
    )
  }

  return {
    files,
    sections,
    taskSlugs,
    hasTaskDocumentEvidence,
    requiredManuals: getRequiredWorkflowManuals(files),
    errors: unique(errors),
    warnings: unique(warnings),
    ...gateContext,
  }
}

function extractDocPaths(markdown) {
  return unique(
    Array.from(
      markdown.matchAll(/(?:AGENTS\.md|TODO\.md|docs\/[A-Za-z0-9._/-]+\.md)/g),
      (match) => match[0]
    )
  )
}

function extractCommands(markdown) {
  return unique(
    Array.from(markdown.matchAll(/`([^`]+)`/g), (match) => match[1]).filter(
      (value) => value.startsWith('npm run ') || value.startsWith('npx ')
    )
  )
}

function extractFirstUncheckedChecklistItem(markdown) {
  return (
    markdown
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('- [ ] ')) ?? null
  )
}

function hasMatchingTest(files, matcher) {
  return files.some((file) => isTestFile(file) && matcher(file))
}

export function getReviewInsights(files, options = {}) {
  const diffText = options.diffText ?? getDiffText()
  const readFile = options.readFile ?? readWorkspaceFile
  const classified = classifyFiles(files)
  const gateContext = getWorkflowGateContext(files)
  const findings = []
  const testGaps = []
  const warnings = []
  const todoContent = readFile('TODO.md')
  const taskSlugs = getTaskSlugsFromFiles(files)

  const authTransportChanged = files.some((file) =>
    [
      'src/lib/axios.ts',
      'src/features/auth/api/api.ts',
      'src/lib/socket.ts',
      'src/features/auth/session/hooks/useAuthBootstrap.ts',
    ].includes(file)
  )

  const authTransportTestsChanged = files.some((file) =>
    [
      'src/lib/axios.test.ts',
      'src/features/auth/api/api.test.ts',
      'src/lib/socket.test.ts',
      'src/features/auth/session/hooks/useAuthBootstrap.test.tsx',
      'src/pages/lobby/LobbyPage.test.tsx',
      'src/pages/waiting-room/page/WaitingRoomPage.test.tsx',
      'src/pages/waiting-room/page/WaitingRoomFlow.test.tsx',
    ].includes(file)
  )

  if (authTransportChanged) {
    const axiosSource = readFile('src/lib/axios.ts')

    if (axiosSource && !axiosSource.includes('withCredentials: true')) {
      findings.push(
        'auth transport 변경이 있지만 `withCredentials: true` 설정이 보이지 않습니다.'
      )
    }

    if (
      axiosSource &&
      (!axiosSource.includes('/api/auth/refresh') ||
        !axiosSource.includes('/api/auth/logout'))
    ) {
      findings.push(
        'auth refresh/logout 경로가 현재 `/api/auth/*` 계약과 다를 수 있습니다.'
      )
    }

    if (!authTransportTestsChanged) {
      testGaps.push(
        'auth transport 변경이 있지만 axios/api/socket/session 관련 테스트 변경이 diff에 없습니다.'
      )
    }
  }

  if (
    classified.hasLobby &&
    !hasMatchingTest(
      files,
      (file) =>
        file.startsWith('src/pages/lobby/') ||
        file.startsWith('src/features/presence/') ||
        file.startsWith('src/features/room-chat/')
    )
  ) {
    testGaps.push(
      'lobby/presence/room-chat 변경이 있지만 관련 테스트 변경이 diff에 없습니다.'
    )
  }

  if (
    classified.hasWaitingRoom &&
    !hasMatchingTest(files, (file) =>
      file.startsWith('src/pages/waiting-room/')
    )
  ) {
    testGaps.push(
      'waiting-room 변경이 있지만 관련 테스트 변경이 diff에 없습니다.'
    )
  }

  if (
    classified.hasGame &&
    !hasMatchingTest(
      files,
      (file) =>
        file.startsWith('src/components/game/') ||
        file.startsWith('src/components/board/') ||
        file.startsWith('src/hooks/game/') ||
        file === 'src/pages/GamePage.test.tsx' ||
        file === 'src/mocks/handlers/game.handler.test.ts'
    )
  ) {
    testGaps.push(
      'game runtime 변경이 있지만 관련 테스트 변경이 diff에 없습니다.'
    )
  }

  if (
    classified.hasSocketInfra &&
    !hasMatchingTest(
      files,
      (file) =>
        file.startsWith('src/lib/socket.test.') ||
        file.startsWith('src/services/socket/') ||
        file.startsWith('src/contracts/socket/')
    )
  ) {
    testGaps.push(
      'socket infra 변경이 있지만 subscribe/cleanup 또는 계약 테스트 변경이 diff에 없습니다.'
    )
  }

  if (
    classified.hasSourceChanges &&
    !classified.hasTestChanges &&
    testGaps.length === 0
  ) {
    testGaps.push(
      '소스 파일이 바뀌었지만 이번 diff에는 테스트 파일 변경이 없습니다.'
    )
  }

  if (
    classified.hasSocketInfra &&
    /\+.*\bsocket\.on\(/.test(diffText) &&
    !/\+.*\bsocket\.off\(/.test(diffText)
  ) {
    warnings.push(
      'socket subscribe 변경 흔적은 있지만 cleanup 짝이 diff에서 바로 보이지 않습니다.'
    )
  }

  if (classified.docsOnly) {
    warnings.push(
      '현재 diff는 문서 중심입니다. 코드 품질 체크보다 문서-코드 정합성 검토가 우선입니다.'
    )
  }

  if (
    gateContext.isEnforcedLargeChange &&
    !hasTaskDocumentTripletInFiles(files)
  ) {
    warnings.push(
      '큰 변경으로 보이지만 task 문서(plan/context/checklist) 근거가 diff에서 보이지 않습니다.'
    )
  }

  if (taskSlugs.length > 1) {
    warnings.push(
      '여러 task slug가 한 diff에 섞여 있습니다. one-feature-per-session 원칙과 TODO 연결을 다시 확인하세요.'
    )
  }

  if (
    taskSlugs.length === 1 &&
    !hasTodoEntryForSlug(todoContent, taskSlugs[0])
  ) {
    warnings.push(
      `task 문서 slug \`${taskSlugs[0]}\`가 TODO.md에 연결되어 있지 않습니다.`
    )
  }

  return {
    findings: unique(findings),
    testGaps: unique(testGaps),
    warnings: unique(warnings),
  }
}

export function buildWorkflowAudit(options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const readFile = options.readFile ?? readWorkspaceFile
  const taskSlugs = unique(
    (options.listTaskSlugs ?? (() => listTaskWorkspaceSlugs(cwd)))()
      .filter((slug) => Boolean(slug) && slug !== '_template')
      .sort()
  )
  const todoEntries = parseTodoTasks(readFile('TODO.md'))
  const todoSlugs = todoEntries.map((entry) => entry.slug)
  const warnings = []
  const duplicateTodoSlugs = unique(
    todoSlugs.filter((slug, index) => todoSlugs.indexOf(slug) !== index)
  )
  const queueManagedTaskSlugs = unique(
    taskSlugs.filter((slug) => {
      const planPath = path.join('docs', 'ai', 'tasks', slug, 'plan.md')
      return (
        todoSlugs.includes(slug) ||
        isQueueManagedTaskWorkspace(readFile(planPath))
      )
    })
  )
  const trackedTaskSlugs = unique([...todoSlugs, ...queueManagedTaskSlugs])

  for (const slug of duplicateTodoSlugs) {
    warnings.push(`TODO.md에 task slug \`${slug}\`가 여러 번 나타납니다.`)
  }

  for (const slug of unique(todoSlugs)) {
    if (!taskSlugs.includes(slug)) {
      warnings.push(
        `TODO.md에는 \`${slug}\` 항목이 있지만 task 디렉토리 \`docs/ai/tasks/${slug}/\`가 없습니다.`
      )
    }
  }

  for (const slug of queueManagedTaskSlugs) {
    if (!todoSlugs.includes(slug)) {
      warnings.push(
        `task 디렉토리 \`docs/ai/tasks/${slug}/\`는 queue-managed 상태지만 TODO.md에 연결되어 있지 않습니다.`
      )
    }
  }

  for (const slug of trackedTaskSlugs) {
    const taskDir = path.join('docs', 'ai', 'tasks', slug)
    const contentsByKind = new Map(
      TASK_DOC_KINDS.map((kind) => {
        const docPath = path.join(taskDir, `${kind}.md`)
        return [kind, readFile(docPath)]
      })
    )
    const missingKinds = TASK_DOC_KINDS.filter(
      (kind) => !contentsByKind.get(kind)?.trim()
    )

    if (missingKinds.length > 0) {
      warnings.push(
        `task \`${slug}\`에 ${missingKinds.join(', ')} 문서가 없습니다.`
      )
    }

    for (const kind of TASK_DOC_KINDS) {
      const content = contentsByKind.get(kind)

      if (!content?.trim()) {
        continue
      }

      if (hasTaskPlaceholder(content)) {
        warnings.push(
          `task \`${slug}\`의 ${kind}.md에 placeholder 문구가 남아 있습니다.`
        )
      }
    }
  }

  return {
    todoEntries,
    queueManagedTaskSlugs,
    warnings: unique(warnings),
  }
}

export function buildSessionBrief(slug, options = {}) {
  if (!slug) {
    throw new Error(
      'task slug가 필요합니다. 예: npm run ai:session:brief -- auth-refresh-cookie-flow'
    )
  }

  const readFile = options.readFile ?? readWorkspaceFile
  const taskDir = path.join('docs', 'ai', 'tasks', slug)
  const planPath = path.join(taskDir, 'plan.md')
  const contextPath = path.join(taskDir, 'context.md')
  const checklistPath = path.join(taskDir, 'checklist.md')
  const planContent = readFile(planPath)
  const contextContent = readFile(contextPath)
  const checklistContent = readFile(checklistPath)
  const missingFiles = [
    [planPath, planContent],
    [contextPath, contextContent],
    [checklistPath, checklistContent],
  ]
    .filter(([, content]) => content.trim().length === 0)
    .map(([file]) => file)

  if (missingFiles.length > 0) {
    throw new Error(`task 문서를 찾을 수 없습니다: ${missingFiles.join(', ')}`)
  }

  const todoContent = readFile('TODO.md')
  const todoStatus = getTodoSectionForTask(todoContent, slug)
  const docsToReopen = unique([
    'AGENTS.md',
    'docs/rules.md',
    'docs/testing.md',
    planPath,
    contextPath,
    checklistPath,
    ...extractDocPaths(contextContent),
  ])
  const validationCommands = unique([
    ...extractCommands(planContent),
    ...extractCommands(checklistContent),
  ]).filter((command) => !command.startsWith('npm run ai:session:brief'))
  const warnings = []
  const nextStep = extractFirstUncheckedChecklistItem(checklistContent)

  if (!todoStatus) {
    warnings.push(`TODO.md에서 \`${slug}\` 항목을 찾지 못했습니다.`)
  }

  if (!nextStep && todoStatus !== 'Done') {
    warnings.push(
      '체크리스트에 미완료 항목이 없습니다. 다음 단계와 handoff 상태를 직접 확인하세요.'
    )
  }

  if (validationCommands.length === 0) {
    warnings.push('task 문서에서 검증 명령을 찾지 못했습니다.')
  }

  return {
    slug,
    taskDir,
    docsToReopen,
    todoStatus,
    nextStep,
    validationCommands,
    warnings,
  }
}

export function getValidationOrchestration(files) {
  const required = getSuggestedScripts(files)
  const suggested = getSuggestedScripts(files, {
    includeUiChecks: true,
  }).filter((scriptName) => !required.includes(scriptName))
  const classified = classifyFiles(files)
  const reasons = []

  if (classified.hasLobby) {
    reasons.push(
      'Lobby/presence/room-chat 변경이 있어 관련 lobby 검증을 우선 확인합니다.'
    )
  }

  if (classified.hasWaitingRoom) {
    reasons.push(
      'Waiting-room 변경이 있어 waiting-room 전용 검증을 우선 확인합니다.'
    )
  }

  if (classified.hasGame) {
    reasons.push(
      'Game runtime 변경이 있어 game 검증과 후속 build 확인이 중요합니다.'
    )
  }

  if (classified.hasUiFiles && !classified.docsOnly) {
    reasons.push(
      'UI 변경이 있어 build/E2E 성격의 추가 검증을 suggested로 확인합니다.'
    )
  }

  if (classified.hasConfigLikeChanges) {
    reasons.push('설정 파일 변경이 있어 build 기반 확인이 필요할 수 있습니다.')
  }

  return {
    required,
    suggested,
    reasons: unique(reasons),
  }
}

export function runNpmScript(scriptName) {
  const result = spawnSync(NPM_COMMAND, ['run', scriptName], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

export function printScriptPlan(title, files, scripts) {
  console.log(title)
  console.log('')

  if (files.length === 0) {
    console.log('No changed files detected.')
    return
  }

  console.log(`Changed files: ${files.length}`)
  for (const file of files) {
    console.log(`- ${file}`)
  }

  console.log('')

  if (scripts.length === 0) {
    console.log('No matching AI checks were selected for the current diff.')
    return
  }

  console.log('Selected scripts:')
  for (const scriptName of scripts) {
    console.log(`- npm run ${scriptName}`)
  }
}

export function printSessionBrief(title, brief) {
  console.log(title)
  console.log('')
  console.log(`Task: ${brief.slug}`)
  console.log(`Task dir: ${brief.taskDir}`)
  console.log('')
  console.log('Reopen these docs:')

  for (const doc of brief.docsToReopen) {
    console.log(`- ${doc}`)
  }

  console.log('')
  console.log('TODO status:')
  console.log(`- ${brief.todoStatus ?? 'missing'}`)
  console.log('')
  console.log('Next step:')
  console.log(`- ${brief.nextStep ?? 'checklist에 미완료 항목이 없습니다.'}`)
  console.log('')
  console.log('Suggested validation:')

  if (brief.validationCommands.length === 0) {
    console.log('- none')
  } else {
    for (const command of brief.validationCommands) {
      console.log(`- ${command}`)
    }
  }

  console.log('')
  console.log('Warnings:')

  if (brief.warnings.length === 0) {
    console.log('- none')
  } else {
    for (const warning of brief.warnings) {
      console.log(`- ${warning}`)
    }
  }
}

export function printWorkflowAudit(title, audit) {
  console.log(title)
  console.log('')
  console.log('Queue-managed task slugs:')

  if (audit.queueManagedTaskSlugs.length === 0) {
    console.log('- none')
  } else {
    for (const slug of audit.queueManagedTaskSlugs) {
      console.log(`- ${slug}`)
    }
  }

  console.log('')
  console.log('Warnings:')

  if (audit.warnings.length === 0) {
    console.log('- none')
    return
  }

  for (const warning of audit.warnings) {
    console.log(`- ${warning}`)
  }
}

export function printPrWorkflowGate(title, result) {
  console.log(title)
  console.log('')
  console.log('Gate target:')
  console.log(`- ${result.isEnforcedLargeChange ? 'yes' : 'no'}`)
  console.log('')
  console.log('Gate reasons:')

  if (result.gateReasons.length === 0) {
    console.log('- none')
  } else {
    for (const reason of result.gateReasons) {
      console.log(`- ${reason}`)
    }
  }

  console.log('')
  console.log('Required manuals:')

  if (result.requiredManuals.length === 0) {
    console.log('- none')
  } else {
    for (const manual of result.requiredManuals) {
      console.log(`- ${manual}`)
    }
  }

  console.log('')
  console.log('Errors:')

  if (result.errors.length === 0) {
    console.log('- none')
  } else {
    for (const error of result.errors) {
      console.log(`- ${error}`)
    }
  }

  console.log('')
  console.log('Warnings:')

  if (result.warnings.length === 0) {
    console.log('- none')
    return
  }

  for (const warning of result.warnings) {
    console.log(`- ${warning}`)
  }
}

export function printValidationOrchestrationPlan(title, files, plan) {
  console.log(title)
  console.log('')

  if (files.length === 0) {
    console.log('No changed files detected.')
    return
  }

  console.log(`Changed files: ${files.length}`)
  for (const file of files) {
    console.log(`- ${file}`)
  }

  console.log('')

  if (plan.reasons.length === 0) {
    console.log('Reasons:')
    console.log('- none')
  } else {
    console.log('Reasons:')
    for (const reason of plan.reasons) {
      console.log(`- ${reason}`)
    }
  }

  console.log('')

  if (plan.required.length === 0) {
    console.log('Required checks:')
    console.log('- none')
  } else {
    console.log('Required checks:')
    for (const scriptName of plan.required) {
      console.log(`- npm run ${scriptName}`)
    }
  }

  console.log('')

  if (plan.suggested.length === 0) {
    console.log('Suggested checks:')
    console.log('- none')
    return
  }

  console.log('Suggested checks:')
  for (const scriptName of plan.suggested) {
    console.log(`- npm run ${scriptName}`)
  }
}
