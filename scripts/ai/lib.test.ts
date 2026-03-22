import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildSessionBrief,
  buildWorkflowAudit,
  getReviewInsights,
  printSessionBrief,
  printWorkflowAudit,
} from './lib.mjs'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getReviewInsights', () => {
  it('reports auth contract findings and missing tests', () => {
    const insights = getReviewInsights(['src/lib/axios.ts'], {
      diffText: '',
      readFile: (path) => {
        if (path === 'src/lib/axios.ts') {
          return `
              export const apiClient = axios.create({})
              export function requestAccessTokenRefresh() {
                return '/v1/auth/refresh'
              }
            `
        }

        return ''
      },
    })

    expect(insights.findings).toContain(
      'auth transport 변경이 있지만 `withCredentials: true` 설정이 보이지 않습니다.'
    )
    expect(insights.findings).toContain(
      'auth refresh/logout 경로가 현재 `/api/auth/*` 계약과 다를 수 있습니다.'
    )
    expect(insights.testGaps).toContain(
      'auth transport 변경이 있지만 axios/api/socket/session 관련 테스트 변경이 diff에 없습니다.'
    )
  })

  it('reports area-specific test gaps for waiting-room changes', () => {
    const insights = getReviewInsights(
      ['src/pages/waiting-room/page/WaitingRoomPage.tsx'],
      {
        diffText: '',
        readFile: () => '',
      }
    )

    expect(insights.testGaps).toContain(
      'waiting-room 변경이 있지만 관련 테스트 변경이 diff에 없습니다.'
    )
  })

  it('stays quiet when auth transport change has matching config and tests', () => {
    const insights = getReviewInsights(
      [
        'src/lib/axios.ts',
        'src/lib/axios.test.ts',
        'src/features/auth/api/api.test.ts',
      ],
      {
        diffText: '',
        readFile: (path) => {
          if (path === 'src/lib/axios.ts') {
            return `
              export const apiClient = axios.create({
                withCredentials: true,
              })
              export function requestAccessTokenRefresh() {
                return '/api/auth/refresh'
              }
              export function requestAuthLogout() {
                return '/api/auth/logout'
              }
            `
          }

          return ''
        },
      }
    )

    expect(insights.findings).toEqual([])
    expect(insights.testGaps).toEqual([])
  })

  it('warns when task docs are not linked from TODO', () => {
    const insights = getReviewInsights(
      [
        'docs/ai/tasks/vendor-neutral-team-workflow-standardization/plan.md',
        'docs/ai/tasks/vendor-neutral-team-workflow-standardization/context.md',
        'docs/ai/tasks/vendor-neutral-team-workflow-standardization/checklist.md',
      ],
      {
        diffText: '',
        readFile: (path) => {
          if (path === 'TODO.md') {
            return `
              # TODO

              ## Ready

              ## In Progress

              ## Blocked

              ## Done
            `
          }

          return ''
        },
      }
    )

    expect(insights.warnings).toContain(
      'task 문서 slug `vendor-neutral-team-workflow-standardization`가 TODO.md에 연결되어 있지 않습니다.'
    )
  })

  it('builds and prints a session brief from task docs and TODO status', () => {
    const readFile = (targetPath: string) => {
      if (targetPath === 'docs/ai/tasks/auth-refresh-cookie-flow/plan.md') {
        return `
          # Plan
          - Session brief: \`npm run ai:session:brief -- auth-refresh-cookie-flow\`
          ## Test Plan
          - \`npm run lint\`
          - \`npm run ai:check:build\`
        `
      }

      if (targetPath === 'docs/ai/tasks/auth-refresh-cookie-flow/context.md') {
        return `
          # Context
          ## Relevant Manuals
          - \`docs/ai/manuals/common.md\`
          - \`docs/testing.md\`
        `
      }

      if (
        targetPath === 'docs/ai/tasks/auth-refresh-cookie-flow/checklist.md'
      ) {
        return `
          # Checklist
          - [x] 관련 manual과 기존 문서를 읽었다
          - [ ] 최소 범위로 구현했다
          - [ ] \`npm run ai:session:brief -- auth-refresh-cookie-flow\` 출력이 현재 상태와 맞는다
        `
      }

      if (targetPath === 'TODO.md') {
        return `
          # TODO

          ## Ready
          - [ ] \`auth-refresh-cookie-flow\` - Auth Refresh Cookie Flow (\`docs/ai/tasks/auth-refresh-cookie-flow/\`)

          ## In Progress

          ## Blocked

          ## Done
        `
      }

      return ''
    }

    const brief = buildSessionBrief('auth-refresh-cookie-flow', {
      readFile,
    })

    expect(brief.docsToReopen).toContain(
      'docs/ai/tasks/auth-refresh-cookie-flow/plan.md'
    )
    expect(brief.docsToReopen).toContain('docs/ai/manuals/common.md')
    expect(brief.todoStatus).toBe('Ready')
    expect(brief.nextStep).toBe('- [ ] 최소 범위로 구현했다')
    expect(brief.validationCommands).toContain('npm run lint')
    expect(brief.validationCommands).toContain('npm run ai:check:build')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printSessionBrief('AI Session Brief', brief)

    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Task: auth-refresh-cookie-flow')
    expect(output).toContain('TODO status:')
    expect(output).toContain('npm run ai:check:build')
  })
})

describe('buildWorkflowAudit', () => {
  it('reports TODO/task mismatches, duplicate slugs, missing docs, and placeholders', () => {
    const audit = buildWorkflowAudit({
      listTaskSlugs: () => [
        'alpha-task',
        'beta-task',
        'orphan-task',
        'example-lobby-dm-unread-stability',
      ],
      readFile: (targetPath: string) => {
        if (targetPath === 'TODO.md') {
          return `
            # TODO

            ## Ready
            - [ ] \`alpha-task\` - Alpha Task (\`docs/ai/tasks/alpha-task/\`)
            - [ ] \`missing-task\` - Missing Task (\`docs/ai/tasks/missing-task/\`)

            ## In Progress
            - [ ] \`alpha-task\` - Alpha Task (\`docs/ai/tasks/alpha-task/\`)
            - [ ] \`beta-task\` - Beta Task (\`docs/ai/tasks/beta-task/\`)

            ## Blocked

            ## Done
          `
        }

        if (targetPath === 'docs/ai/tasks/alpha-task/plan.md') {
          return `
            # Plan
            ## Task Tracking
            - TODO line: \`alpha-task\`
            - Session brief: \`npm run ai:session:brief -- alpha-task\`
          `
        }

        if (targetPath === 'docs/ai/tasks/alpha-task/context.md') {
          return '# Context\n- alpha'
        }

        if (targetPath === 'docs/ai/tasks/alpha-task/checklist.md') {
          return '# Checklist\n- [x] alpha'
        }

        if (targetPath === 'docs/ai/tasks/beta-task/plan.md') {
          return `
            # Plan
            ## Task Tracking
            - TODO line: \`beta-task\`
            - Session brief: \`npm run ai:session:brief -- beta-task\`
          `
        }

        if (targetPath === 'docs/ai/tasks/beta-task/context.md') {
          return '# Context\n- 지금 어떤 흐름으로 동작하는지 직접 정리해주세요'
        }

        if (targetPath === 'docs/ai/tasks/beta-task/checklist.md') {
          return ''
        }

        if (targetPath === 'docs/ai/tasks/orphan-task/plan.md') {
          return `
            # Plan
            ## Task Tracking
            - TODO line: \`orphan-task\`
            - Session brief: \`npm run ai:session:brief -- orphan-task\`
          `
        }

        if (targetPath === 'docs/ai/tasks/orphan-task/context.md') {
          return '# Context\n- orphan'
        }

        if (targetPath === 'docs/ai/tasks/orphan-task/checklist.md') {
          return '# Checklist\n- [x] orphan'
        }

        if (
          targetPath ===
          'docs/ai/tasks/example-lobby-dm-unread-stability/plan.md'
        ) {
          return '# Plan\n- example task'
        }

        return ''
      },
    })

    expect(audit.warnings).toContain(
      'TODO.md에 task slug `alpha-task`가 여러 번 나타납니다.'
    )
    expect(audit.warnings).toContain(
      'TODO.md에는 `missing-task` 항목이 있지만 task 디렉토리 `docs/ai/tasks/missing-task/`가 없습니다.'
    )
    expect(audit.warnings).toContain(
      'task 디렉토리 `docs/ai/tasks/orphan-task/`는 queue-managed 상태지만 TODO.md에 연결되어 있지 않습니다.'
    )
    expect(audit.warnings).toContain(
      'task `beta-task`에 checklist 문서가 없습니다.'
    )
    expect(audit.warnings).toContain(
      'task `beta-task`의 context.md에 placeholder 문구가 남아 있습니다.'
    )

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printWorkflowAudit('AI Workflow Audit', audit)

    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Queue-managed task slugs:')
    expect(output).toContain('orphan-task')
  })
})
