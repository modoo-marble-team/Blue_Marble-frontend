import { expect, type Page } from '@playwright/test'

// 테스트 시작 시 브라우저 저장소를 초기화하고 홈으로 진입
export async function resetSessionAndOpenHome(page: Page) {
  await page.goto('/')

  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  await page.reload()
}

// 게스트 로그인 후 로비 진입 완료까지 공통 처리
export async function loginAsGuest(page: Page) {
  await page.getByRole('button', { name: '게스트로 시작' }).click()
  await expect(page).toHaveURL(/\/lobby$/)
}
