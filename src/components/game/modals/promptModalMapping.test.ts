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
  it('resolves buy modal by prompt type token', () => {
    const prompt = createPrompt({ type: 'BUY_OR_SKIP' })

    expect(resolvePromptModalKind(prompt)).toBe('buy')
  })

  it('resolves build modal by choice token', () => {
    const prompt = createPrompt({
      type: 'SERVER_PROMPT',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'upgrade', label: '건설', value: 'UPGRADE' },
      ],
    })

    expect(resolvePromptModalKind(prompt)).toBe('build')
  })

  it('resolves acquisition modal by prompt type token', () => {
    const prompt = createPrompt({
      type: 'ACQUISITION_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'acquire', label: '인수하기', value: 'ACQUIRE' },
      ],
    })

    expect(resolvePromptModalKind(prompt)).toBe('acquisition')
  })

  it('does not resolve acquisition modal for legacy acquisition alias', () => {
    const prompt = createPrompt({
      type: 'CITY_ACQUISITION',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'acquire', label: '인수하기', value: 'ACQUIRE' },
      ],
    })

    expect(resolvePromptModalKind(prompt)).toBe('unknown')
  })

  it('does not resolve acquisition modal from choice tokens alone', () => {
    const prompt = createPrompt({
      type: 'SERVER_PROMPT',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'acquire', label: '인수하기', value: 'ACQUIRE' },
      ],
    })

    expect(resolvePromptModalKind(prompt)).toBe('unknown')
  })

  it('resolves sell modal by prompt type token', () => {
    const prompt = createPrompt({
      type: 'SELL_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'sell', label: '매각하기', value: 'SELL' },
      ],
    })

    expect(resolvePromptModalKind(prompt)).toBe('sell')
  })

  it('uses preferred token for buy confirm choice', () => {
    const prompt = createPrompt({
      type: 'BUY_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'buy', label: '구매하기', value: 'BUY' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'buyConfirm')).toBe('BUY')
  })

  it('falls back to second choice for buy cancel rule', () => {
    const prompt = createPrompt({
      type: 'BUY_OR_SKIP',
      choices: [
        { id: 'first', label: '첫번째', value: 'FIRST' },
        { id: 'second', label: '두번째', value: 'SECOND' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'buyCancel')).toBe('SECOND')
  })

  it('resolves acquisition confirm/cancel choices', () => {
    const prompt = createPrompt({
      type: 'ACQUISITION_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'acquire', label: '인수하기', value: 'ACQUIRE' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'acquisitionConfirm')).toBe(
      'ACQUIRE'
    )
    expect(resolvePromptChoiceValue(prompt, 'acquisitionCancel')).toBe('SKIP')
  })

  it('returns null when acquisition confirm choice is missing', () => {
    const prompt = createPrompt({
      type: 'ACQUISITION_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'wait', label: '대기', value: 'WAIT' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'acquisitionConfirm')).toBeNull()
    expect(resolvePromptChoiceValue(prompt, 'acquisitionCancel')).toBe('SKIP')
  })

  it('returns null when acquisition cancel choice is missing', () => {
    const prompt = createPrompt({
      type: 'ACQUISITION_OR_SKIP',
      choices: [{ id: 'acquire', label: '인수하기', value: 'ACQUIRE' }],
    })

    expect(resolvePromptChoiceValue(prompt, 'acquisitionConfirm')).toBe(
      'ACQUIRE'
    )
    expect(resolvePromptChoiceValue(prompt, 'acquisitionCancel')).toBeNull()
  })

  it('resolves sell confirm/cancel choices', () => {
    const prompt = createPrompt({
      type: 'SELL_OR_SKIP',
      choices: [
        { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        { id: 'sell', label: '매각하기', value: 'SELL' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'sellConfirm')).toBe('SELL')
    expect(resolvePromptChoiceValue(prompt, 'sellCancel')).toBe('SKIP')
  })

  it('resolves END_TURN for timer confirm choice', () => {
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

  it('prioritizes ROLL_DICE over END_TURN for timer confirm choice', () => {
    const prompt = createPrompt({
      type: 'TURN_TIMEOUT',
      timeoutSec: 15,
      choices: [
        { id: 'end-turn', label: '턴 종료', value: 'END_TURN' },
        { id: 'roll', label: '주사위 굴리기', value: 'ROLL_DICE' },
      ],
    })

    expect(resolvePromptChoiceValue(prompt, 'timerConfirm')).toBe('ROLL_DICE')
  })

  it('returns fallback label when choice label is missing', () => {
    const prompt = createPrompt({
      choices: [{ id: 'buy', label: '구매하기', value: 'BUY' }],
    })

    expect(getPromptChoiceLabel(prompt, 'BUY', '기본값')).toBe('구매하기')
    expect(getPromptChoiceLabel(prompt, 'PASS', '기본값')).toBe('기본값')
  })
})
