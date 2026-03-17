import { isAxiosError } from 'axios'

// API 에러에서 화면 분기에 사용할 공통 필드
export interface ParsedApiError {
  status?: number
  code?: string
  detail?: string
  message?: string
  isHttpError: boolean
  isNetworkError: boolean
}

type UnknownRecord = Record<string, unknown>
const HTTP_GENERIC_ERROR_MESSAGES = ['network error', 'canceled']
export const DEFAULT_NETWORK_ERROR_MESSAGE =
  '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.'

// object 형태인지 확인해 안전하게 Record로 변환
function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as UnknownRecord
}

// 비어있지 않은 문자열만 반환
function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return undefined
  }

  return trimmedValue
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isNetworkAxiosErrorMessage(message: string | undefined) {
  if (!message) {
    return false
  }

  const normalizedMessage = message.trim().toLowerCase()
  return (
    HTTP_GENERIC_ERROR_MESSAGES.includes(normalizedMessage) ||
    normalizedMessage.startsWith('request failed') ||
    normalizedMessage.includes('failed to fetch')
  )
}

function isNetworkAxiosError(error: unknown) {
  if (!isAxiosError(error)) {
    return false
  }

  if (error.response) {
    return false
  }

  return Boolean(error.request) || isNetworkAxiosErrorMessage(error.message)
}

// detail 필드를 문자열/배열/객체 형태 모두에서 추출
function readDetail(detail: unknown): string | undefined {
  const detailText = toNonEmptyString(detail)
  if (detailText) {
    return detailText
  }

  if (Array.isArray(detail)) {
    for (const item of detail) {
      const itemText = readDetail(item)
      if (itemText) {
        return itemText
      }
    }

    return undefined
  }

  const detailRecord = toRecord(detail)
  if (!detailRecord) {
    return undefined
  }

  return (
    toNonEmptyString(detailRecord.detail) ??
    toNonEmptyString(detailRecord.message) ??
    toNonEmptyString(detailRecord.msg) ??
    toNonEmptyString(detailRecord.error)
  )
}

// Axios/일반 Error를 공통 에러 모델로 정규화
export function parseApiError(error: unknown): ParsedApiError {
  if (isAxiosError(error)) {
    const responseData = error.response?.data
    const responseRecord = toRecord(responseData)
    const errorMessage = toNonEmptyString(error.message)

    return {
      status: error.response?.status,
      code: toNonEmptyString(responseRecord?.code),
      detail:
        readDetail(responseRecord?.detail) ??
        readDetail(responseRecord?.error) ??
        readDetail(responseData),
      message: toNonEmptyString(responseRecord?.message) ?? errorMessage,
      isHttpError: true,
      isNetworkError: isNetworkAxiosError(error),
    }
  }

  if (error instanceof Error) {
    const errorRecord = toRecord(error)

    return {
      status: toNumber(errorRecord?.status),
      code: toNonEmptyString(errorRecord?.code),
      detail: readDetail(errorRecord?.detail) ?? readDetail(errorRecord?.error),
      message: toNonEmptyString(error.message),
      isHttpError: false,
      isNetworkError: false,
    }
  }

  const errorRecord = toRecord(error)
  if (errorRecord) {
    return {
      status: toNumber(errorRecord.status),
      code: toNonEmptyString(errorRecord.code),
      detail:
        readDetail(errorRecord.detail) ??
        readDetail(errorRecord.error) ??
        readDetail(errorRecord),
      message: toNonEmptyString(errorRecord.message),
      isHttpError: false,
      isNetworkError: false,
    }
  }

  return {
    isHttpError: false,
    isNetworkError: false,
  }
}

interface GetParsedApiErrorMessageOptions {
  networkFallbackMessage?: string
}

// 파싱된 공통 에러 모델을 사용자 표시용 메시지로 정규화
export function getParsedApiErrorMessage(
  parsedError: ParsedApiError,
  fallbackMessage: string,
  options?: GetParsedApiErrorMessageOptions
) {
  if (parsedError.isNetworkError) {
    return options?.networkFallbackMessage ?? DEFAULT_NETWORK_ERROR_MESSAGE
  }

  if (parsedError.detail) {
    return parsedError.detail
  }

  if (
    parsedError.message &&
    (!parsedError.isHttpError ||
      !isNetworkAxiosErrorMessage(parsedError.message))
  ) {
    return parsedError.message
  }

  return fallbackMessage
}

// raw error를 공통 규칙으로 사용자 표시용 메시지로 변환
export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
  options?: GetParsedApiErrorMessageOptions
) {
  return getParsedApiErrorMessage(
    parseApiError(error),
    fallbackMessage,
    options
  )
}
