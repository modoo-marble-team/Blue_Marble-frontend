import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildSessionBrief,
  buildWorkflowAudit,
  getReviewInsights,
  printSessionBrief,
  printWorkflowAudit,
} from './lib.mjs'

function normalizePath(targetPath: string) {
  return targetPath.replace(/\\/g, '/')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getReviewInsights', () => {
  it('reports auth contract findings and missing tests', () => {
    const insights = getReviewInsights(['src/lib/axios.ts'], {
      diffText: '',
      readFile: (targetPath) => {
        if (targetPath === 'src/lib/axios.ts') {
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

    expect(insights.findings.length).toBeGreaterThan(0)
    expect(insights.testGaps.length).toBeGreaterThan(0)
  })

  it('reports waiting-room test gaps when no tests changed', () => {
    const insights = getReviewInsights(
      ['src/pages/waiting-room/page/WaitingRoomPage.tsx'],
      { diffText: '', readFile: () => '' }
    )

    expect(insights.testGaps.length).toBeGreaterThan(0)
  })

  it('stays quiet when auth config and tests are aligned', () => {
    const insights = getReviewInsights(
      [
        'src/lib/axios.ts',
        'src/lib/axios.test.ts',
        'src/features/auth/api/api.test.ts',
      ],
      {
        diffText: '',
        readFile: (targetPath) => {
          if (targetPath === 'src/lib/axios.ts') {
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

  it('warns when task docs are not linked in TODO', () => {
    const insights = getReviewInsights(
      [
        'docs/ai/tasks/vendor-neutral-team-workflow-standardization/plan.md',
        'docs/ai/tasks/vendor-neutral-team-workflow-standardization/context.md',
        'docs/ai/tasks/vendor-neutral-team-workflow-standardization/checklist.md',
      ],
      {
        diffText: '',
        readFile: (targetPath) => {
          if (targetPath === 'TODO.md') {
            return '# TODO\n\n## Ready\n\n## In Progress\n\n## Blocked\n\n## Done\n'
          }
          return ''
        },
      }
    )

    expect(
      insights.warnings.some((warning) =>
        warning.includes('vendor-neutral-team-workflow-standardization')
      )
    ).toBe(true)
  })
})

describe('buildSessionBrief', () => {
  it('builds and prints session brief from task docs + TODO status', () => {
    const readFile = (targetPath: string) => {
      const normalizedPath = normalizePath(targetPath)

      if (normalizedPath === 'docs/ai/tasks/auth-refresh-cookie-flow/plan.md') {
        return `
          # Plan
          - Session brief: \`npm run ai:session:brief -- auth-refresh-cookie-flow\`
          ## Test Plan
          - \`npm run lint\`
          - \`npm run ai:check:build\`
        `
      }

      if (
        normalizedPath === 'docs/ai/tasks/auth-refresh-cookie-flow/context.md'
      ) {
        return `
          # Context
          ## Relevant Manuals
          - \`docs/ai/manuals/common.md\`
          - \`docs/testing.md\`
        `
      }

      if (
        normalizedPath === 'docs/ai/tasks/auth-refresh-cookie-flow/checklist.md'
      ) {
        return `
          # Checklist
          - [x] docs read
          - [ ] implement minimal changes
        `
      }

      if (normalizedPath === 'TODO.md') {
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

    const brief = buildSessionBrief('auth-refresh-cookie-flow', { readFile })

    expect(
      brief.docsToReopen.some((docPath) =>
        normalizePath(docPath).endsWith(
          'docs/ai/tasks/auth-refresh-cookie-flow/plan.md'
        )
      )
    ).toBe(true)
    expect(brief.docsToReopen).toContain('docs/ai/manuals/common.md')
    expect(brief.todoStatus).toBe('Ready')
    expect(brief.nextStep).toContain('[ ]')
    expect(brief.validationCommands).toContain('npm run lint')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printSessionBrief('AI Session Brief', brief)

    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Task: auth-refresh-cookie-flow')
    expect(output).toContain('TODO status:')
  })
})

describe('buildWorkflowAudit', () => {
  it('reports duplicate/missing/orphan tasks and placeholders', () => {
    const audit = buildWorkflowAudit({
      listTaskSlugs: () => ['alpha-task', 'beta-task', 'orphan-task'],
      readFile: (targetPath: string) => {
        const normalizedPath = normalizePath(targetPath)

        if (normalizedPath === 'TODO.md') {
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

        if (normalizedPath === 'docs/ai/tasks/alpha-task/plan.md') {
          return '# Plan\n## Task Tracking\n- TODO line: `alpha-task`'
        }
        if (normalizedPath === 'docs/ai/tasks/alpha-task/context.md') {
          return '# Context\n- alpha'
        }
        if (normalizedPath === 'docs/ai/tasks/alpha-task/checklist.md') {
          return '# Checklist\n- [x] alpha'
        }

        if (normalizedPath === 'docs/ai/tasks/beta-task/plan.md') {
          return '# Plan\n## Task Tracking\n- TODO line: `beta-task`'
        }
        if (normalizedPath === 'docs/ai/tasks/beta-task/context.md') {
          return '# Context\n- 직접 정리해주세요'
        }
        if (normalizedPath === 'docs/ai/tasks/beta-task/checklist.md') {
          return ''
        }

        if (normalizedPath === 'docs/ai/tasks/orphan-task/plan.md') {
          return '# Plan\n## Task Tracking\n- TODO line: `orphan-task`'
        }
        if (normalizedPath === 'docs/ai/tasks/orphan-task/context.md') {
          return '# Context\n- orphan'
        }
        if (normalizedPath === 'docs/ai/tasks/orphan-task/checklist.md') {
          return '# Checklist\n- [x] orphan'
        }

        return ''
      },
    })

    expect(
      audit.warnings.some(
        (warning) => warning.includes('alpha-task') && warning.includes('여러')
      )
    ).toBe(true)
    expect(
      audit.warnings.some((warning) => warning.includes('missing-task'))
    ).toBe(true)
    expect(
      audit.warnings.some((warning) => warning.includes('orphan-task'))
    ).toBe(true)
    expect(
      audit.warnings.some((warning) => warning.includes('beta-task'))
    ).toBe(true)

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printWorkflowAudit('AI Workflow Audit', audit)
    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Queue-managed task slugs:')
  })
})
