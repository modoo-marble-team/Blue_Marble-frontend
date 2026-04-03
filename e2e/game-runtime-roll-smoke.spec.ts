import { expect, test, type Locator } from '@playwright/test'
import { ensureDevControlPanelOpen } from './helpers/devPanel'
import { loginAsGuest, resetSessionAndOpenHome } from './helpers/session'

const PROMPT_BUTTONS: RegExp[] = [
  /건너뛰기/,
  /확인/,
  /선택/,
  /구매/,
  /건설/,
  /지불/,
  /인수/,
]

test.describe('@game 게임 런타임 롤 스모크', () => {
  test('주사위 굴림/프롬프트 응답/턴 진행이 끊기지 않는다', async ({
    page,
  }) => {
    const consoleLogs: string[] = []

    page.on('console', (message) => {
      consoleLogs.push(message.text())
    })

    await resetSessionAndOpenHome(page)
    await loginAsGuest(page)

    await page.getByRole('button', { name: '방 만들기' }).click()
    await page.getByLabel('방 제목').fill('E2E 런타임 스모크 방')
    await page.getByRole('button', { name: '방 만들기 완료' }).click()
    await expect(page).toHaveURL(/\/rooms\/room-\d+$/)

    await ensureDevControlPanelOpen(page)
    await page.getByRole('button', { name: '시작조건' }).click()
    await page.getByRole('button', { name: /^시작$/ }).click()
    await expect(page).toHaveURL(/\/game\/game-room-\d+-\d+$/)

    const soloPlaySwitch = page.getByRole('switch', { name: '혼자 플레이' })
    const isSoloEnabled = await soloPlaySwitch.getAttribute('aria-checked')
    if (isSoloEnabled !== 'true') {
      await soloPlaySwitch.click()
    }
    await expect(soloPlaySwitch).toHaveAttribute('aria-checked', 'true')

    const rollButton = page.getByRole('button', { name: /ROLL|END/ })
    await expect(rollButton).toBeVisible()

    const clickActionButton = async (button: Locator) => {
      await button.scrollIntoViewIfNeeded()

      try {
        await button.click({ timeout: 1200 })
      } catch {
        await button.click({ timeout: 1200, force: true })
      }
    }

    const consumePromptIfVisible = async () => {
      const topModalOverlay = page
        .locator('div.fixed.inset-0:has(button:enabled)')
        .last()

      if ((await topModalOverlay.count()) > 0) {
        const modalActionButtons = topModalOverlay.locator(
          'button:enabled:visible'
        )
        const buttonCount = await modalActionButtons.count()

        for (let index = buttonCount - 1; index >= 0; index -= 1) {
          const button = modalActionButtons.nth(index)
          if (!(await button.isEnabled())) {
            continue
          }

          try {
            await clickActionButton(button)
            await page.waitForTimeout(350)
            return true
          } catch {
            await page.waitForTimeout(80)
          }
        }
      }

      for (const promptPattern of PROMPT_BUTTONS) {
        const button = page.getByRole('button', { name: promptPattern }).first()
        if (
          (await button.count()) > 0 &&
          (await button.isVisible()) &&
          (await button.isEnabled())
        ) {
          await clickActionButton(button)
          await page.waitForTimeout(350)
          return true
        }
      }

      return false
    }

    for (let i = 0; i < 3; i += 1) {
      // 프롬프트가 열려 있으면 먼저 응답해야 롤 버튼이 활성화될 수 있다.
      for (let consumeTry = 0; consumeTry < 3; consumeTry += 1) {
        const consumed = await consumePromptIfVisible()
        if (!consumed) break
      }

      for (let retry = 0; retry < 20; retry += 1) {
        if (await rollButton.isEnabled()) {
          break
        }

        const consumed = await consumePromptIfVisible()
        if (!consumed) {
          await page.waitForTimeout(200)
        }
      }

      await expect(rollButton).toBeEnabled()
      await rollButton.click()

      await page.waitForTimeout(1200)

      await consumePromptIfVisible()

      const endTurnButton = page
        .getByRole('button', { name: /END|턴 종료/ })
        .first()
      if (
        (await endTurnButton.count()) > 0 &&
        (await endTurnButton.isVisible())
      ) {
        await clickActionButton(endTurnButton)
      }

      await page.waitForTimeout(400)
    }

    const hasMovedLog = consoleLogs.some((log) => log.includes('PLAYER_MOVED'))
    const hasTurnEndedLog = consoleLogs.some((log) =>
      log.includes('TURN_ENDED')
    )
    expect(hasMovedLog).toBe(true)
    expect(hasTurnEndedLog).toBe(true)
  })
})
