import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NETWORK_ERROR_MESSAGE,
  getApiErrorMessage,
  getParsedApiErrorMessage,
  parseApiError,
} from './apiError'

function createAxiosError({
  status,
  data,
  message = 'Request failed with status code 400',
}: {
  status?: number
  data?: unknown
  message?: string
}) {
  return new AxiosError(
    message,
    undefined,
    undefined,
    status ? { readyState: 4, status } : { readyState: 4 },
    status
      ? {
          status,
          statusText: 'error',
          headers: {},
          config: { headers: {} as never },
          data,
        }
      : undefined
  )
}

describe('parseApiError', () => {
  it('FastAPI 422 detail 배열에서 첫 메시지를 추출한다', () => {
    expect(
      parseApiError(
        createAxiosError({
          status: 422,
          data: {
            detail: [{ msg: '닉네임 형식이 올바르지 않습니다.' }],
          },
        })
      )
    ).toEqual({
      status: 422,
      code: undefined,
      detail: '닉네임 형식이 올바르지 않습니다.',
      message: 'Request failed with status code 400',
      isHttpError: true,
      isNetworkError: false,
    })
  })

  it('axios가 아닌 Error subtype의 detail/code/status도 읽는다', () => {
    const error = Object.assign(new Error('fallback message'), {
      status: 409,
      code: 'DUPLICATE',
      detail: '이미 사용 중입니다.',
    })

    expect(parseApiError(error)).toEqual({
      status: 409,
      code: 'DUPLICATE',
      detail: '이미 사용 중입니다.',
      message: 'fallback message',
      isHttpError: false,
      isNetworkError: false,
    })
  })
})

describe('getParsedApiErrorMessage', () => {
  it('네트워크 오류는 공통 fallback 문구로 수렴한다', () => {
    expect(
      getApiErrorMessage(
        createAxiosError({
          message: 'Network Error',
        }),
        '기본 메시지'
      )
    ).toBe(DEFAULT_NETWORK_ERROR_MESSAGE)
  })

  it('axios 기본 영문 오류는 fallback 문구를 우선한다', () => {
    expect(
      getParsedApiErrorMessage(
        parseApiError(
          createAxiosError({
            status: 500,
            data: {},
          })
        ),
        '요청에 실패했습니다.'
      )
    ).toBe('요청에 실패했습니다.')
  })

  it('detail이 있으면 message보다 우선한다', () => {
    expect(
      getApiErrorMessage(
        createAxiosError({
          status: 409,
          data: {
            detail: '이미 사용 중인 닉네임입니다.',
            message: '중복입니다.',
          },
        }),
        '기본 메시지'
      )
    ).toBe('이미 사용 중인 닉네임입니다.')
  })
})
