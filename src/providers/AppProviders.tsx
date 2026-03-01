import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'

// 앱 전역에서 재사용할 React Query 기본 동작 정의
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 라우터/쿼리/토스트 같은 전역 Provider를 루트에 결합
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster
          position="top-center"
          containerStyle={{
            top: 72,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
