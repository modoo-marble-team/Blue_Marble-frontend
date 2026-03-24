import { describe, expect, it, vi } from 'vitest'

import {
  buildGitFlowScaffold,
  parseGitFlowArgs,
  runGitFlow,
} from './git-flow.mjs'

describe('parseGitFlowArgs', () => {
  it('parses explicit files, execution flags, and output paths', () => {
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
      '- 추가 검증 필요',
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
    expect(parsed.riskLine).toBe('- 추가 검증 필요')
    expect(parsed.execute).toBe(true)
    expect(parsed.yes).toBe(true)
    expect(parsed.json).toBe(true)
  })

  it('fails on unknown flags instead of ignoring them', () => {
    expect(() =>
      parseGitFlowArgs([
        'node',
        'scripts/ai/git-flow.mjs',
        '--files',
        'docs/ai/usage.md',
        '--summary',
        'ignored',
      ])
    ).toThrow('지원하지 않는 옵션입니다: --summary')
  })
})

describe('buildGitFlowScaffold', () => {
  it('builds a docs-only small PR scaffold from the repo templates', () => {
    const scaffold = buildGitFlowScaffold({
      files: ['docs/ai/usage.md'],
      title: '워크플로우 문서 정리',
      todoContent:
        '# TODO\n\n## Ready\n\n## In Progress\n\n## Blocked\n\n## Done\n',
    })

    expect(scaffold.type).toBe('docs')
    expect(scaffold.branchName).toBe('docs/<issue-number>-update')
    expect(scaffold.issueTitle).toBe('📝 [DOCS] 워크플로우 문서 정리')
    expect(scaffold.issueLabels).toEqual(['docs'])
    expect(scaffold.issueBody).toContain('## 📝 문서화 대상')
    expect(scaffold.issueBody).toContain('## 📂 문서 종류')
    expect(scaffold.prBody).toContain('- plan: N/A')
    expect(scaffold.prBody).toContain('- task slug: N/A')
    expect(scaffold.prBody).toContain('`docs/ai/manuals/common.md`')
    expect(scaffold.prBody).toContain(
      '`npm run ai:self-review -- --files docs/ai/usage.md`'
    )
    expect(scaffold.prBody).toContain(
      '- 워크플로우 문서 정리 작업을 진행합니다.'
    )
    expect(scaffold.prBody).not.toContain('git-flow를 정리했습니다')
    expect(scaffold.rebasePolicy).toContain(
      'base 브랜치에서 시작하면 branch 생성 전에 `git fetch origin && git rebase origin/develop`를 실행합니다.'
    )
    expect(scaffold.rebasePolicy).toContain(
      'push 전 rebase로 HEAD가 바뀌면 `git push --force-with-lease`, 바뀌지 않으면 일반 `git push`를 사용합니다.'
    )
    expect(scaffold.gateContext.isEnforcedLargeChange).toBe(false)
  })

  it('builds a large scaffold with template issue title, labels, and task-based PR summary', () => {
    const scaffold = buildGitFlowScaffold({
      files: [
        'docs/ai/tasks/mypage-nickname-change/plan.md',
        'docs/ai/tasks/mypage-nickname-change/context.md',
        'docs/ai/tasks/mypage-nickname-change/checklist.md',
        'src/pages/MyPage.tsx',
        'src/features/auth/profile/hooks/useMyPageNicknameForm.ts',
      ],
      issueNumber: '123',
      title: '마이페이지 닉네임 변경',
      prBodyFile: '/tmp/pr-body.md',
      todoContent: `
        # TODO

        ## Ready

        ## In Progress
        - [ ] \`mypage-nickname-change\` - 마이페이지 닉네임 변경 (\`docs/ai/tasks/mypage-nickname-change/\`)

        ## Blocked

        ## Done
      `,
    })

    expect(scaffold.type).toBe('feat')
    expect(scaffold.taskSlug).toBe('mypage-nickname-change')
    expect(scaffold.todoStatus).toBe('In Progress')
    expect(scaffold.branchName).toBe('feat/123-mypage-nickname-change')
    expect(scaffold.issueTitle).toBe('✨ [FEAT] 마이페이지 닉네임 변경')
    expect(scaffold.issueLabels).toEqual(['feat'])
    expect(scaffold.prBody).toContain(
      '- plan: docs/ai/tasks/mypage-nickname-change/plan.md'
    )
    expect(scaffold.prBody).toContain('- TODO status: In Progress')
    expect(scaffold.prBody).toContain(
      '- MyPage 프로필 카드에 닉네임 인라인 편집 UI 추가'
    )
    expect(scaffold.prBody).not.toContain('git-flow를 정리했습니다')
    expect(scaffold.prBody).toContain(
      '`npm run ai:self-review -- --files docs/ai/tasks/mypage-nickname-change/checklist.md docs/ai/tasks/mypage-nickname-change/context.md docs/ai/tasks/mypage-nickname-change/plan.md src/features/auth/profile/hooks/useMyPageNicknameForm.ts src/pages/MyPage.tsx`'
    )
    expect(scaffold.prBody).toContain('## ✅ 체크리스트')
  })
})

describe('runGitFlow', () => {
  it('executes issue to PR flow with staged files only', async () => {
    const commands = []
    const writtenFiles = new Map()

    const runCommand = vi.fn((command, args) => {
      commands.push([command, ...args].join(' '))

      const normalized = [command, ...args].join(' ')

      if (normalized === 'git branch --show-current') {
        return { status: 0, stdout: 'develop\n', stderr: '' }
      }

      if (
        normalized ===
        'gh issue create --title 💡 [CHORE] Git Flow Automation Scaffold --body-file /tmp/issue.md --label chore'
      ) {
        return {
          status: 0,
          stdout:
            'https://github.com/modoo-marble-team/Blue_Marble-frontend/issues/123\n',
          stderr: '',
        }
      }

      if (normalized === 'git fetch origin') {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (normalized === 'git rebase origin/develop') {
        return { status: 0, stdout: 'Current branch up to date.\n', stderr: '' }
      }

      if (
        normalized === 'git switch -c chore/123-git-flow-automation-scaffold'
      ) {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (
        normalized ===
        'git add -- TODO.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/usage.md package.json scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts'
      ) {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (normalized === 'git diff --cached --name-only') {
        return {
          status: 0,
          stdout:
            'TODO.md\nscripts/ai/git-flow.mjs\nscripts/ai/git-flow.test.ts\n',
          stderr: '',
        }
      }

      if (normalized === 'git commit -m chore: Git Flow Automation Scaffold') {
        return { status: 0, stdout: '[branch commit]\n', stderr: '' }
      }

      if (normalized === 'git rev-parse HEAD') {
        const count = commands.filter(
          (value) => value === 'git rev-parse HEAD'
        ).length
        return {
          status: 0,
          stdout: count === 1 ? 'commit-before\n' : 'commit-after\n',
          stderr: '',
        }
      }

      if (
        normalized ===
        `${process.execPath} scripts/ai/pr-gate.mjs --files TODO.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/usage.md package.json scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts --pr-body-file /tmp/pr.md`
      ) {
        return { status: 0, stdout: 'AI PR Gate\n', stderr: '' }
      }

      if (
        normalized ===
        'git push --force-with-lease -u origin chore/123-git-flow-automation-scaffold'
      ) {
        return { status: 0, stdout: 'push ok\n', stderr: '' }
      }

      if (
        normalized ===
        'gh pr create --base develop --title chore: Git Flow Automation Scaffold --body-file /tmp/pr.md'
      ) {
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
          'docs/ai/quickstart.md',
          'docs/ai/tasks/git-flow-automation-scaffold/checklist.md',
          'docs/ai/tasks/git-flow-automation-scaffold/context.md',
          'docs/ai/tasks/git-flow-automation-scaffold/plan.md',
          'docs/ai/usage.md',
          'package.json',
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
        writeFile: (targetPath, contents) => {
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
    expect(writtenFiles.get('/tmp/pr.md')).toContain('## 📌 관련 이슈')
    expect(commands).toContain(
      'gh issue create --title 💡 [CHORE] Git Flow Automation Scaffold --body-file /tmp/issue.md --label chore'
    )
    expect(commands).toContain(
      'git add -- TODO.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/usage.md package.json scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts'
    )
    expect(commands).toContain(
      'gh pr create --base develop --title chore: Git Flow Automation Scaffold --body-file /tmp/pr.md'
    )
  })

  it('stops and surfaces rebase conflict before branch creation', async () => {
    const runCommand = vi.fn((command, args) => {
      const normalized = [command, ...args].join(' ')

      if (normalized === 'git branch --show-current') {
        return { status: 0, stdout: 'develop\n', stderr: '' }
      }

      if (
        normalized ===
        'gh issue create --title ✨ [FEAT] Waiting Room Host Transfer --body-file /tmp/issue.md --label feat'
      ) {
        return {
          status: 0,
          stdout:
            'https://github.com/modoo-marble-team/Blue_Marble-frontend/issues/123\n',
          stderr: '',
        }
      }

      if (normalized === 'git fetch origin') {
        return { status: 0, stdout: '', stderr: '' }
      }

      if (normalized === 'git rebase origin/develop') {
        return {
          status: 1,
          stdout: '',
          stderr:
            'CONFLICT (content): Merge conflict in src/pages/waiting-room/page/WaitingRoomPage.tsx',
        }
      }

      return { status: 0, stdout: '', stderr: '' }
    })

    await expect(
      runGitFlow(
        {
          files: [
            'docs/ai/tasks/waiting-room-host-transfer/plan.md',
            'docs/ai/tasks/waiting-room-host-transfer/context.md',
            'docs/ai/tasks/waiting-room-host-transfer/checklist.md',
            'src/pages/waiting-room/page/WaitingRoomPage.tsx',
          ],
          taskSlug: 'waiting-room-host-transfer',
          title: 'Waiting Room Host Transfer',
          type: 'feat',
          base: 'develop',
          yes: true,
          prBodyFile: '/tmp/pr.md',
          issueBodyFile: '/tmp/issue.md',
        },
        {
          runCommand,
          writeFile: () => {},
          readTodo: () => `
            # TODO

            ## Ready

            ## In Progress
            - [ ] \`waiting-room-host-transfer\` - Waiting Room Host Transfer (\`docs/ai/tasks/waiting-room-host-transfer/\`)

            ## Blocked

            ## Done
          `,
        }
      )
    ).rejects.toThrow('git rebase --continue')
  })
})
