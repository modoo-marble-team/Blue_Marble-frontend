import { describe, expect, it } from 'vitest'

import { getReviewInsights } from './lib.mjs'

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
})
