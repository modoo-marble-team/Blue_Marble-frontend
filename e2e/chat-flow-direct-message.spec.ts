import { expect, test } from '@playwright/test'

test.describe('로비 1:1 DM 채팅 플로우', () => {
  test('접속자 목록에서 DM 패널을 열고 메시지 전송 후 수신 DM을 수동 주입해 확인한다', async ({
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

    const openDmButton = page.getByRole('button', { name: '마블왕 채팅' })
    await openDmButton.click()

    const dmPanel = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: 'DM 닫기' }) })
    await expect(dmPanel).toBeVisible()
    await expect(dmPanel.getByText('마블왕')).toBeVisible()

    await page.getByPlaceholder('메시지를 입력하세요...').fill('안녕 DM')
    await page.getByRole('button', { name: 'DM 전송' }).click()

    await expect(page.getByText('안녕 DM')).toBeVisible()

    await page.getByLabel('수신 DM').fill('수신 테스트 DM')
    await page.getByRole('button', { name: '선택 유저로 DM 수신' }).click()

    await expect(page.getByText('수신 테스트 DM')).toBeVisible()
  })
})
