import { execSync, spawnSync } from 'node:child_process'
import process from 'node:process'

const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm'

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

function matchesAnyPrefix(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix))
}

function isTestFile(file) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
}

function isCodeFile(file) {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
}

export function classifyFiles(files) {
  const hasLobby = files.some((file) =>
    matchesAnyPrefix(file, [
      'src/pages/lobby/',
      'src/features/presence/',
      'src/features/room-chat/',
    ])
  )
  const hasWaitingRoom = files.some((file) =>
    file.startsWith('src/pages/waiting-room/')
  )
  const hasGame = files.some((file) =>
    matchesAnyPrefix(file, [
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
    matchesAnyPrefix(file, [
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
      /^src\/pages\//.test(file) ||
      /^src\/components\//.test(file) ||
      /^src\/features\//.test(file)
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
