import { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DesktopViewportGuard } from './DesktopViewportGuard'

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe('DesktopViewportGuard', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    setViewportWidth(1440)
  })

  afterEach(() => {
    setViewportWidth(originalInnerWidth)
  })

  it('작은 화면 안내가 떠도 children을 언마운트하지 않는다', () => {
    const unmountSpy = vi.fn()

    function TrackedChild() {
      useEffect(() => unmountSpy, [])
      return <div>앱 본문</div>
    }

    render(
      <DesktopViewportGuard>
        <TrackedChild />
      </DesktopViewportGuard>
    )

    expect(screen.getByText('앱 본문')).toBeInTheDocument()
    expect(screen.queryByText('넓은 화면이 필요합니다')).not.toBeInTheDocument()

    act(() => {
      setViewportWidth(1024)
      window.dispatchEvent(new Event('resize'))
    })

    expect(screen.getByText('앱 본문')).toBeInTheDocument()
    expect(screen.getByText('넓은 화면이 필요합니다')).toBeInTheDocument()
    expect(
      screen.getByText('최소 권장 폭은 1366px 입니다.')
    ).toBeInTheDocument()
    expect(unmountSpy).not.toHaveBeenCalled()
  })
})
