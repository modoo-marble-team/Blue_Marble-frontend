import axios from 'axios'

// 공통 API 요청에 사용할 axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})
