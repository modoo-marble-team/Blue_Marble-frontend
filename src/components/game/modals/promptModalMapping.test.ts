import { describe, expect, it } from 'vitest'
import type { GamePrompt } from '../../../types/domain'
import {
  getPromptChoiceLabel,
  resolvePromptChoiceValue,
  resolvePromptModalKind,
} from './promptModalMapping'

const createPrompt = (overrides: Partial<GamePrompt> = {}): GamePrompt => ({
  id: 'prompt-1',
  type: 'UNKNOWN_PROMPT',
  choices: [],
  ...overrides,
})

describe('promptModalMapping', () => {
  it('prompt type 토큰으로 buy 모달을 판별한다', () => {
    const prompt = createPrompt({ type: 'BUY_OR_SKIP' })

    expect(resolvePromptModalKind(prompt)).toBe('buy')
  })

  it('choice 토큰으로 build 모달을 판별한다', () => {
    const prompt = createPrompt({
      type: 'SERVER_PROMPT',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'upgrade', label: '건설', value: 'UPGRADE' },
      ],
    })

    expect(resolvePromptModalKind(prompt)).toBe('build')
  })

  it('buyConfirm 규칙은 토큰 매칭을 우선 적용한다', () => {
    const prompt = createPrompt({
      type: 'BUY_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'buy', label: '구매하기', value: 'BUY' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'buyConfirm')).toBe('BUY')
  })

  it('buyCancel 규칙은 매칭 실패 시 2번째 choice를 fallback으로 사용한다', () => {
    const prompt = createPrompt({
      type: 'BUY_OR_SKIP',
      choices: [
        { id: 'first', label: '첫번째', value: 'FIRST' },
        { id: 'second', label: '두번째', value: 'SECOND' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'buyCancel')).toBe('SECOND')
  })

  it('timerConfirm 규칙은 END_TURN 선택값을 반환한다', () => {
    const prompt = createPrompt({
      type: 'TURN_TIMEOUT',
      timeoutSec: 15,
      choices: [
        { id: 'keep', label: '대기', value: 'WAIT' },
        { id: 'end-turn', label: '턴 종료', value: 'END_TURN' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'timerConfirm')).toBe('END_TURN')
  })

  it('선택값 label이 없으면 fallback label을 반환한다', () => {
    const prompt = createPrompt({
      choices: [{ id: 'buy', label: '구매하기', value: 'BUY' }],
    })

    expect(getPromptChoiceLabel(prompt, 'BUY', '기본값')).toBe('구매하기')
    expect(getPromptChoiceLabel(prompt, 'PASS', '기본값')).toBe('기본값')
  })
})
