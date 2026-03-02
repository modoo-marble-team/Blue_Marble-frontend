import { isAxiosError } from 'axios'

// API 에러에서 화면 분기에 사용할 공통 필드
export interface ParsedApiError {
  status?: number
  code?: string
  detail?: string
  message?: string
}

type UnknownRecord = Record<string, unknown>

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

    return {
      status: error.response?.status,
      code: toNonEmptyString(responseRecord?.code),
      detail:
        readDetail(responseRecord?.detail) ??
        readDetail(responseRecord?.error) ??
        readDetail(responseData),
      message:
        toNonEmptyString(responseRecord?.message) ??
        toNonEmptyString(error.message),
    }
  }

  if (error instanceof Error) {
    return {
      message: toNonEmptyString(error.message),
    }
  }

  return {}
}
