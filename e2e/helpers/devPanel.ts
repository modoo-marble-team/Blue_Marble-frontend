import type { Page } from '@playwright/test'

// 기본 숨김 정책의 DEV 패널을 필요 시 열고 없으면 그대로 진행
async function openDevPanelIfCollapsed(page: Page, openButtonName: string) {
  const openButton = page.getByRole('button', { name: openButtonName }).first()

  if ((await openButton.count()) === 0) {
    return
  }

  if (await openButton.isVisible()) {
    await openButton.click()
  }
}

// 대기방 통합 DEV 컨트롤 패널을 사용 가능한 상태로 보장
export async function ensureDevControlPanelOpen(page: Page) {
  await openDevPanelIfCollapsed(page, 'DEV CONTROL 열기')
}

// 로비 접속자 DEV 패널을 사용 가능한 상태로 보장
export async function ensureDevPresencePanelOpen(page: Page) {
  await openDevPanelIfCollapsed(page, 'DEV PRESENCE 열기')
}
