#!/usr/bin/env node

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

function buildIssueBody({ title, taskSlug, files, manuals }) {
  const completionCriteria = [
    '- [ ] 변경 범위와 목적이 이슈 본문에 반영된다',
    taskSlug
      ? `- [ ] TODO.md와 docs/ai/tasks/${taskSlug}/ 연결이 유지된다`
      : '- [ ] small/docs-only 변경이면 Task 문서가 없어도 괜찮은지 확인한다',
    '- [ ] 최소 검증과 PR 본문 근거를 정리한다',
  ]

  return [
    '## 작업 내용',
    `- ${title} 작업을 진행한다`,
    `- 변경 파일 ${files.length}개를 기준으로 issue/PR 흐름을 정리한다`,
    '',
    '## 변경 파일',
    formatCodeBulletList(files),
    '',
    '## 참고 문서',
    formatCodeBulletList(manuals),
    '',
    '## 완료 기준',
    completionCriteria.join('\n'),
  ].join('\n')
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

function buildWorkSummaryLines(scaffold) {
  const summaryLines = [
    `- ${scaffold.title} 변경을 반영했습니다.`,
    `- 변경 파일 ${scaffold.files.length}개를 기준으로 git-flow를 정리했습니다.`,
  ]

  if (scaffold.taskSlug) {
    summaryLines.push(
      `- task slug \`${scaffold.taskSlug}\` 기준으로 TODO 및 task 문서를 연결했습니다.`
    )
  } else {
    summaryLines.push(
      '- small/docs-only 변경 기준으로 task 문서는 `N/A` 처리했습니다.'
    )
  }

  if (scaffold.gateContext.isEnforcedLargeChange) {
    summaryLines.push(
      '- large/high-risk PR 기준으로 manual과 validation 근거를 함께 포함했습니다.'
    )
  }

  return summaryLines
}

function buildPrBody({ scaffold, riskLine = DEFAULT_RISK_LINE }) {
  const issueLine = scaffold.issueNumber
    ? `> closes #${scaffold.issueNumber}`
    : '> closes #<issue-number>'

  return [
    '## 📌 관련 이슈',
    '',
    issueLine,
    '',
    '---',
    '',
    '## 📝 작업 내용',
    '',
    buildWorkSummaryLines(scaffold).join('\n'),
    '',
    '---',
    '',
    '## 🧠 Task 문서 (큰 작업이면 필수)',
    '',
    formatTaskDocumentSection(scaffold.taskSlug),
    '',
    '---',
    '',
    '## 📋 TODO.md 연결',
    '',
    formatTodoSection(scaffold.taskSlug, scaffold.todoStatus),
    '',
    '---',
    '',
    '## 📚 참고한 기준 문서',
    '',
    formatCodeBulletList(scaffold.referenceDocs),
    '',
    '---',
    '',
    '## 🧪 실행한 검증',
    '',
    formatCodeBulletList(scaffold.validationCommands),
    '',
    '---',
    '',
    '## ⚠️ 남은 리스크',
    '',
    riskLine,
    '',
    '---',
    '',
    '## ✅ 체크리스트',
    '',
    '- [ ] 로컬에서 정상 동작 확인',
    '- [ ] 불필요한 console.log 제거',
    '- [ ] 관련 이슈 연결 완료',
    '- [ ] 큰 작업이면 task 문서 링크를 남겼다',
    '- [ ] 큰 작업이면 `TODO.md` / task slug 연결을 PR 본문에 남겼다',
    '- [ ] 참고한 기준 문서를 PR 본문에 남겼다',
    '- [ ] 실행한 검증과 남은 리스크를 PR 본문에 적었다',
  ].join('\n')
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
  const issueTitle = `${type}: ${title}`
  const commitMessage = options.commitMessage?.trim() || `${type}: ${title}`

  validateCommitType(type)

  const issueBody = buildIssueBody({
    title,
    taskSlug,
    files,
    manuals: referenceDocs,
  })

  const scaffold = {
    files,
    taskSlug,
    todoStatus,
    issueNumber,
    type,
    title,
    baseBranch,
    branchName,
    issueTitle,
    issueBody,
    commitMessage,
    prTitle: issueTitle,
    validationCommands,
    referenceDocs,
    gateContext,
  }

  const prBody = buildPrBody({
    scaffold,
    riskLine: options.riskLine || DEFAULT_RISK_LINE,
  })

  return {
    ...scaffold,
    prBody,
  }
}

function printExecutionSummary(scaffold) {
  console.log('Execution Summary')
  console.log(`- Base Branch: ${scaffold.baseBranch}`)
  console.log(`- Current Issue: ${scaffold.issueNumber || 'new issue needed'}`)
  console.log(`- Branch Name: ${scaffold.branchName}`)
  console.log(`- Commit Message: ${scaffold.commitMessage}`)
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
  console.log(`- Branch: ${result.branchName}`)
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
