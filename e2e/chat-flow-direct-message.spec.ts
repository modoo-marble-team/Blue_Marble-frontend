import { expect, test } from '@playwright/test'
import { ensureDevPresencePanelOpen } from './helpers/devPanel'
import { loginAsGuest, resetSessionAndOpenHome } from './helpers/session'

test.describe('로비 1:1 DM 채팅 플로우', () => {
  test('접속자 목록에서 DM 패널을 열고 메시지 전송 후 수신 DM을 수동 주입해 확인한다', async ({
    page,
  }) => {
    await resetSessionAndOpenHome(page)
    await loginAsGuest(page)

    const openDmButton = page
      .locator('button[aria-label$=" 채팅"]:not(:disabled)')
      .first()
    await expect(openDmButton).toBeVisible()
    await openDmButton.click()

    const dmPanel = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: 'DM 닫기' }) })
    await expect(dmPanel).toBeVisible()

    await page.getByPlaceholder('메시지를 입력하세요...').fill('안녕 DM')
    await page.getByRole('button', { name: 'DM 전송' }).click()

    await expect(page.getByText('안녕 DM')).toBeVisible()

    await ensureDevPresencePanelOpen(page)
    await page.getByLabel('수신 DM').fill('수신 테스트 DM')
    await page.getByRole('button', { name: '선택 유저로 DM 수신' }).click()

    await expect(page.getByText('수신 테스트 DM')).toBeVisible()
  })
})
