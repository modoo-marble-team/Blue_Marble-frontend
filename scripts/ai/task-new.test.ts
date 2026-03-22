import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildTaskFileContents,
  createTaskWorkspace,
  humanizeSlug,
  parseTaskNewArgs,
} from './task-new.mjs'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, {
      recursive: true,
      force: true,
    })
  }
})

describe('task-new', () => {
  it('parses slug, files, and force flag', () => {
    const parsed = parseTaskNewArgs([
      'node',
      'task-new.mjs',
      'auth-refresh-cookie-flow',
      '--files',
      'src/lib/axios.ts',
      'src/features/auth/api/api.ts',
      '--force',
    ])

    expect(parsed).toEqual({
      slug: 'auth-refresh-cookie-flow',
      files: ['src/lib/axios.ts', 'src/features/auth/api/api.ts'],
      force: true,
    })
  })

  it('builds populated task file contents from files', () => {
    const contents = buildTaskFileContents({
      slug: 'auth-refresh-cookie-flow',
      files: ['src/lib/axios.ts', 'src/features/auth/api/api.ts'],
      date: '2026-03-18',
    })

    expect(humanizeSlug('auth-refresh-cookie-flow')).toBe(
      'Auth Refresh Cookie Flow'
    )
    expect(contents.plan).toContain('작업 이름: Auth Refresh Cookie Flow')
    expect(contents.plan).toContain('작업 slug: auth-refresh-cookie-flow')
    expect(contents.plan).toContain('`src/lib/axios.ts`')
    expect(contents.plan).toContain('## WAT Workflow')
    expect(contents.plan).toContain('TODO line:')
    expect(contents.plan).toContain(
      '`npm run ai:session:brief -- auth-refresh-cookie-flow`'
    )
    expect(contents.plan).toContain('## Role Plan')
    expect(contents.context).toContain('`docs/ai/manuals/common.md`')
    expect(contents.context).toContain('## Relevant Manuals')
    expect(contents.context).toContain('## Session Handoff Notes')
    expect(contents.checklist).toContain('`npm run lint`')
    expect(contents.checklist).toContain('Planner 기준 정리 완료')
    expect(contents.checklist).toContain(
      'WAT 단계와 역할 분담을 문서에 반영했다'
    )
    expect(contents.checklist).toContain(
      '`TODO.md` task 한 줄을 최신 상태로 유지했다'
    )
  })

  it('creates a task workspace and blocks overwrite by default', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-task-new-'))
    tempDirs.push(cwd)
    fs.mkdirSync(path.join(cwd, 'docs', 'ai', 'tasks', '_template'), {
      recursive: true,
    })

    const created = createTaskWorkspace({
      cwd,
      slug: 'socket-session-clear',
      files: ['src/lib/socket.ts'],
      date: '2026-03-18',
    })

    expect(created.createdFiles).toHaveLength(4)
    expect(
      fs.readFileSync(
        path.join(
          cwd,
          'docs',
          'ai',
          'tasks',
          'socket-session-clear',
          'plan.md'
        ),
        'utf8'
      )
    ).toContain('Socket Session Clear')
    expect(fs.readFileSync(path.join(cwd, 'TODO.md'), 'utf8')).toContain(
      '`socket-session-clear`'
    )

    expect(() =>
      createTaskWorkspace({
        cwd,
        slug: 'socket-session-clear',
      })
    ).toThrow(/이미 같은 task 디렉토리가 있습니다/)
  })
})
