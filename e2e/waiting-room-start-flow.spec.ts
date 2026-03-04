import { expect, test } from '@playwright/test'
import { ensureDevControlPanelOpen } from './helpers/devPanel'
import { loginAsGuest, resetSessionAndOpenHome } from './helpers/session'

test.describe('대기방 시작 플로우', () => {
  test('게스트 로그인 후 방 생성 -> 시작조건 충족 -> 게임 화면 이동', async ({
    page,
  }) => {
    await resetSessionAndOpenHome(page)
    await loginAsGuest(page)

    await page.getByRole('button', { name: '방 만들기' }).click()
    await expect(page.getByRole('dialog', { name: '방 만들기' })).toBeVisible()

    await page.getByLabel('방 제목').fill('E2E 시작 방')
    await page.getByRole('button', { name: '방 만들기 완료' }).click()

    await expect(page).toHaveURL(/\/rooms\/room-\d+$/)
    await expect(page.getByText('E2E 시작 방')).toBeVisible()

    const startButton = page.getByRole('button', { name: /^시작$/ })
    await expect(startButton).toBeDisabled()

    // 채팅 전송 동작이 깨지지 않는지 함께 확인
    await page.getByPlaceholder('메시지 입력...').fill('E2E 채팅 메시지')
    await page.getByPlaceholder('메시지 입력...').press('Enter')
    await expect(page.getByText('E2E 채팅 메시지')).toBeVisible()

    await ensureDevControlPanelOpen(page)
    await page.getByRole('button', { name: '시작조건' }).click()
    await expect(startButton).toBeEnabled()

    await startButton.click()
    await expect(page).toHaveURL(/\/game\/game-room-\d+-\d+$/)
  })
})
