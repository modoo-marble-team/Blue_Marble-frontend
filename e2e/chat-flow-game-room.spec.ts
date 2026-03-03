import { expect, test } from '@playwright/test'

test.describe('게임 채팅 플로우', () => {
  test('게임 진입 후 채팅 1건을 전송해 메시지 목록에 표시한다', async ({
    page,
  }) => {
    await page.goto('/')

    // 이전 세션 영향 제거
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    await page.reload()

    await page.getByRole('button', { name: '게스트로 시작' }).click()
    await expect(page).toHaveURL(/\/lobby$/)

    await page.getByRole('button', { name: '방 만들기' }).click()
    await page.getByLabel('방 제목').fill('E2E 게임 채팅 방')
    await page.getByRole('button', { name: '방 만들기 완료' }).click()

    await expect(page).toHaveURL(/\/rooms\/room-\d+$/)

    await page.getByRole('button', { name: '시작조건' }).click()
    await page.getByRole('button', { name: /^시작$/ }).click()

    await expect(page).toHaveURL(/\/game\/room-\d+$/)

    await page.getByPlaceholder('메시지...').fill('게임 채팅 e2e')
    await page.getByPlaceholder('메시지...').press('Enter')

    await expect(page.getByText('게임 채팅 e2e')).toBeVisible()
  })
})
