import { expect, test } from '@playwright/test'
import { ensureDevControlPanelOpen } from './helpers/devPanel'
import { loginAsGuest, resetSessionAndOpenHome } from './helpers/session'

test.describe('게임 채팅 플로우', () => {
  test('게임 진입 후 채팅 1건을 전송해 메시지 목록에 표시한다', async ({
    page,
  }) => {
    await resetSessionAndOpenHome(page)
    await loginAsGuest(page)

    await page.getByRole('button', { name: '방 만들기' }).click()
    await page.getByLabel('방 제목').fill('E2E 게임 채팅 방')
    await page.getByRole('button', { name: '방 만들기 완료' }).click()

    await expect(page).toHaveURL(/\/rooms\/room-\d+$/)

    await ensureDevControlPanelOpen(page)
    await page.getByRole('button', { name: '시작조건' }).click()
    await page.getByRole('button', { name: /^시작$/ }).click()

    await expect(page).toHaveURL(/\/game\/game-room-\d+-\d+$/)

    await page.getByPlaceholder('메시지...').fill('게임 채팅 e2e')
    await page.getByPlaceholder('메시지...').press('Enter')

    await expect(page.getByText('게임 채팅 e2e')).toBeVisible()
  })
})
