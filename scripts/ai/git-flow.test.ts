import { describe, expect, it, vi } from 'vitest'

import {
  buildGitFlowScaffold,
  parseGitFlowArgs,
  runGitFlow,
} from './git-flow.mjs'

describe('parseGitFlowArgs', () => {
  it('parses flags and values', () => {
    const parsed = parseGitFlowArgs([
      'node',
      'scripts/ai/git-flow.mjs',
      '--files',
      'docs/ai/usage.md',
      'package.json',
      '--task-slug',
      'git-flow-automation-scaffold',
      '--issue-number',
      '123',
      '--title',
      'Git Flow Automation Scaffold',
      '--pr-body-file',
      '/tmp/pr-body.md',
      '--issue-body-file',
      '/tmp/issue-body.md',
      '--commit-message',
      'chore: Git Flow Automation Scaffold',
      '--risk-line',
      '- extra validation needed',
      '--execute',
      '--yes',
      '--json',
    ])

    expect(parsed.files).toEqual(['docs/ai/usage.md', 'package.json'])
    expect(parsed.taskSlug).toBe('git-flow-automation-scaffold')
    expect(parsed.issueNumber).toBe('123')
    expect(parsed.title).toBe('Git Flow Automation Scaffold')
    expect(parsed.prBodyFile).toBe('/tmp/pr-body.md')
    expect(parsed.issueBodyFile).toBe('/tmp/issue-body.md')
    expect(parsed.commitMessage).toBe('chore: Git Flow Automation Scaffold')
    expect(parsed.riskLine).toBe('- extra validation needed')
    expect(parsed.execute).toBe(true)
    expect(parsed.yes).toBe(true)
    expect(parsed.json).toBe(true)
  })

  it('throws on unknown flags', () => {
    expect(() =>
      parseGitFlowArgs([
        'node',
        'scripts/ai/git-flow.mjs',
        '--files',
        'docs/ai/usage.md',
        '--unknown',
        'value',
      ])
    ).toThrow()
  })
})

describe('buildGitFlowScaffold', () => {
  it('builds a docs-only scaffold', () => {
    const scaffold = buildGitFlowScaffold({
      files: ['docs/ai/usage.md'],
      title: 'Docs cleanup',
      todoContent:
        '# TODO\n\n## Ready\n\n## In Progress\n\n## Blocked\n\n## Done\n',
    })

    expect(scaffold.type).toBe('docs')
    expect(scaffold.branchName).toBe('docs/<issue-number>-docs-cleanup')
    expect(scaffold.issueLabels).toEqual(['docs'])
    expect(scaffold.prBody).toContain('N/A')
    expect(scaffold.gateContext.isEnforcedLargeChange).toBe(false)
  })

  it('builds a large scaffold from task slug and todo status', () => {
    const scaffold = buildGitFlowScaffold({
      files: [
        'docs/ai/tasks/mypage-nickname-change/plan.md',
        'docs/ai/tasks/mypage-nickname-change/context.md',
        'docs/ai/tasks/mypage-nickname-change/checklist.md',
        'src/pages/MyPage.tsx',
      ],
      issueNumber: '123',
      title: 'MyPage nickname change',
      prBodyFile: '/tmp/pr-body.md',
      todoContent: `
        # TODO

        ## Ready

        ## In Progress
        - [ ] \`mypage-nickname-change\` - MyPage Nickname Change (\`docs/ai/tasks/mypage-nickname-change/\`)

        ## Blocked

        ## Done
      `,
    })

    expect(scaffold.type).toBe('feat')
    expect(scaffold.taskSlug).toBe('mypage-nickname-change')
    expect(scaffold.todoStatus).toBe('In Progress')
    expect(scaffold.branchName).toBe('feat/123-mypage-nickname-change')
    expect(scaffold.prBody).toContain(
      'docs/ai/tasks/mypage-nickname-change/plan.md'
    )
    expect(scaffold.prBody).toContain('TODO status: In Progress')
  })
})

describe('runGitFlow', () => {
  it('runs issue -> branch -> commit -> push -> pr flow', async () => {
    const commands: string[] = []
    const writtenFiles = new Map<string, string>()

    const runCommand = vi.fn((command: string, args: string[]) => {
      const normalized = [command, ...args].join(' ')
      commands.push(normalized)

      if (
        command === 'git' &&
        args[0] === 'branch' &&
        args[1] === '--show-current'
      ) {
        return { status: 0, stdout: 'develop\n', stderr: '' }
      }

      if (command === 'gh' && args[0] === 'issue' && args[1] === 'create') {
        return {
          status: 0,
          stdout:
            'https://github.com/modoo-marble-team/Blue_Marble-frontend/issues/123\n',
          stderr: '',
        }
      }

      if (command === 'git' && args[0] === 'fetch') {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (command === 'git' && args[0] === 'rebase') {
        return { status: 0, stdout: 'Current branch up to date.\n', stderr: '' }
      }

      if (command === 'git' && args[0] === 'switch' && args[1] === '-c') {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (command === 'git' && args[0] === 'add') {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (command === 'git' && args[0] === 'diff' && args[1] === '--cached') {
        return {
          status: 0,
          stdout:
            'TODO.md\nscripts/ai/git-flow.mjs\nscripts/ai/git-flow.test.ts\n',
          stderr: '',
        }
      }

      if (command === 'git' && args[0] === 'commit') {
        return { status: 0, stdout: '[branch commit]\n', stderr: '' }
      }

      if (command === 'git' && args[0] === 'rev-parse') {
        const revParseCount = commands.filter((line) =>
          line.startsWith('git rev-parse HEAD')
        ).length
        return {
          status: 0,
          stdout: revParseCount === 1 ? 'commit-before\n' : 'commit-after\n',
          stderr: '',
        }
      }

      if (
        command === process.execPath &&
        args[0] === 'scripts/ai/pr-gate.mjs'
      ) {
        return { status: 0, stdout: 'AI PR Gate\n', stderr: '' }
      }

      if (command === 'git' && args[0] === 'push') {
        return { status: 0, stdout: 'push ok\n', stderr: '' }
      }

      if (command === 'gh' && args[0] === 'pr' && args[1] === 'create') {
        return {
          status: 0,
          stdout:
            'https://github.com/modoo-marble-team/Blue_Marble-frontend/pull/456\n',
          stderr: '',
        }
      }

      return { status: 0, stdout: '', stderr: '' }
    })

    const result = await runGitFlow(
      {
        files: [
          'TODO.md',
          'docs/ai/tasks/git-flow-automation-scaffold/checklist.md',
          'docs/ai/tasks/git-flow-automation-scaffold/context.md',
          'docs/ai/tasks/git-flow-automation-scaffold/plan.md',
          'scripts/ai/git-flow.mjs',
          'scripts/ai/git-flow.test.ts',
        ],
        taskSlug: 'git-flow-automation-scaffold',
        title: 'Git Flow Automation Scaffold',
        type: 'chore',
        base: 'develop',
        yes: true,
        prBodyFile: '/tmp/pr.md',
        issueBodyFile: '/tmp/issue.md',
        todoContent: `
          # TODO

          ## Ready

          ## In Progress
          - [ ] \`git-flow-automation-scaffold\` - Git Flow Automation Scaffold (\`docs/ai/tasks/git-flow-automation-scaffold/\`)

          ## Blocked

          ## Done
        `,
      },
      {
        runCommand,
        writeFile: (targetPath: string, contents: string) => {
          writtenFiles.set(targetPath, contents)
        },
        readTodo: () => `
          # TODO

          ## Ready

          ## In Progress
          - [ ] \`git-flow-automation-scaffold\` - Git Flow Automation Scaffold (\`docs/ai/tasks/git-flow-automation-scaffold/\`)

          ## Blocked

          ## Done
        `,
      }
    )

    expect(result.issueNumber).toBe('123')
    expect(result.issueUrl).toContain('/issues/123')
    expect(result.baseBranch).toBe('develop')
    expect(result.branchCreated).toBe(true)
    expect(result.rebaseBeforeBranch).toBe(true)
    expect(result.rebaseBeforePush).toBe(true)
    expect(result.rebasedBeforePush).toBe(true)
    expect(result.pushMode).toBe('force-with-lease')
    expect(result.prUrl).toContain('/pull/456')
    expect(result.stagedFiles).toEqual([
      'TODO.md',
      'scripts/ai/git-flow.mjs',
      'scripts/ai/git-flow.test.ts',
    ])
    expect(writtenFiles.get('/tmp/pr.md')).toContain(
      'git-flow-automation-scaffold'
    )
    expect(commands.some((line) => line.startsWith('gh issue create'))).toBe(
      true
    )
    expect(commands.some((line) => line.startsWith('git add --'))).toBe(true)
    expect(
      commands.some((line) => line.startsWith('gh pr create --base develop'))
    ).toBe(true)
  })
})
