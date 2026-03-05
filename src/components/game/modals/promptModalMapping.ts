import type { GamePrompt, GamePromptChoice } from '../../../types/domain'

export type PromptModalKind =
  | 'buy'
  | 'build'
  | 'toll'
  | 'dice_timer'
  | 'unknown'

export type PromptChoiceRuleKey =
  | 'buyConfirm'
  | 'buyCancel'
  | 'buildConfirm'
  | 'buildCancel'
  | 'tollConfirm'
  | 'timerConfirm'

const BUY_TYPE_TOKENS = ['BUY_OR_SKIP', 'BUY_PROPERTY', 'BUY_PROMPT']
const BUILD_TYPE_TOKENS = ['BUILD_OR_SKIP', 'UPGRADE_OR_SKIP', 'BUILD_PROMPT']
const TOLL_TYPE_TOKENS = ['PAY_TOLL', 'TOLL_CONFIRM', 'PAY_TOLL_CONFIRM']
const DICE_TIMER_TYPE_TOKENS = [
  'DICE_TIMEOUT',
  'TURN_TIMEOUT',
  'TURN_TIMER',
  'ROLL_TIMEOUT',
]
const PROMPT_CHOICE_RULES: Record<
  PromptChoiceRuleKey,
  {
    preferredTokens: string[]
    fallbackIndex?: number
  }
> = {
  buyConfirm: {
    preferredTokens: ['BUY', 'PURCHASE', 'CONFIRM', 'YES'],
    fallbackIndex: 0,
  },
  buyCancel: {
    preferredTokens: ['SKIP', 'PASS', 'CANCEL', 'NO'],
    fallbackIndex: 1,
  },
  buildConfirm: {
    preferredTokens: ['BUILD', 'UPGRADE', 'CONFIRM', 'YES'],
    fallbackIndex: 0,
  },
  buildCancel: {
    preferredTokens: ['SKIP', 'PASS', 'CANCEL', 'NO'],
    fallbackIndex: 1,
  },
  tollConfirm: {
    preferredTokens: ['PAY_TOLL', 'PAY', 'CONFIRM', 'OK'],
    fallbackIndex: 0,
  },
  timerConfirm: {
    preferredTokens: ['END_TURN', 'CONFIRM', 'OK', 'SKIP', 'PASS'],
    fallbackIndex: 0,
  },
}

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toUpperCase() : ''

const hasTypeToken = (prompt: GamePrompt, tokens: string[]) => {
  const promptType = normalize(prompt.type)
  return tokens.some((token) => promptType.includes(token))
}

const getPromptChoices = (prompt: GamePrompt) => prompt.choices ?? []

const hasMatchedChoiceToken = (choice: GamePromptChoice, token: string) => {
  const normalizedToken = normalize(token)
  if (!normalizedToken) {
    return false
  }

  const valueToken = normalize(choice.value)
  const idToken = normalize(choice.id)
  const labelToken = normalize(choice.label)

  return (
    valueToken === normalizedToken ||
    idToken === normalizedToken ||
    labelToken.includes(normalizedToken)
  )
}

const hasChoiceToken = (prompt: GamePrompt, tokens: string[]) =>
  getPromptChoices(prompt).some((choice) =>
    tokens.some((token) => hasMatchedChoiceToken(choice, token))
  )

export const resolvePromptModalKind = (
  prompt: GamePrompt | null | undefined
): PromptModalKind => {
  if (!prompt) {
    return 'unknown'
  }

  if (
    hasTypeToken(prompt, BUY_TYPE_TOKENS) ||
    (hasChoiceToken(prompt, ['BUY']) &&
      hasChoiceToken(prompt, ['SKIP', 'PASS']))
  ) {
    return 'buy'
  }

  if (
    hasTypeToken(prompt, BUILD_TYPE_TOKENS) ||
    hasChoiceToken(prompt, ['BUILD', 'UPGRADE'])
  ) {
    return 'build'
  }

  if (
    hasTypeToken(prompt, TOLL_TYPE_TOKENS) ||
    hasChoiceToken(prompt, ['PAY_TOLL', 'PAY'])
  ) {
    return 'toll'
  }

  if (
    hasTypeToken(prompt, DICE_TIMER_TYPE_TOKENS) ||
    (typeof prompt.timeoutSec === 'number' &&
      hasChoiceToken(prompt, ['END_TURN']))
  ) {
    return 'dice_timer'
  }

  return 'unknown'
}

export const isPromptHandledByBoardModal = (
  prompt: GamePrompt | null | undefined
) => resolvePromptModalKind(prompt) !== 'unknown'

export const findPromptChoiceValue = (
  prompt: GamePrompt | null | undefined,
  preferredTokens: string[],
  fallbackIndex?: number
): string | null => {
  if (!prompt) {
    return null
  }

  const choices = getPromptChoices(prompt)
  if (choices.length === 0) {
    return null
  }

  const matchedChoice = choices.find((choice) =>
    preferredTokens.some((token) => hasMatchedChoiceToken(choice, token))
  )

  if (matchedChoice) {
    return matchedChoice.value
  }

  if (
    typeof fallbackIndex === 'number' &&
    fallbackIndex >= 0 &&
    fallbackIndex < choices.length
  ) {
    return choices[fallbackIndex].value
  }

  return choices[0].value
}

export const resolvePromptChoiceValue = (
  prompt: GamePrompt | null | undefined,
  ruleKey: PromptChoiceRuleKey
): string | null => {
  const rule = PROMPT_CHOICE_RULES[ruleKey]

  return findPromptChoiceValue(prompt, rule.preferredTokens, rule.fallbackIndex)
}

export const getPromptChoiceLabel = (
  prompt: GamePrompt | null | undefined,
  choiceValue: string | null,
  fallbackLabel: string
): string => {
  if (!prompt || !choiceValue) {
    return fallbackLabel
  }

  return (
    getPromptChoices(prompt).find((choice) => choice.value === choiceValue)
      ?.label ?? fallbackLabel
  )
}

const getPayloadRecord = (
  prompt: GamePrompt | null | undefined
): Record<string, unknown> => {
  if (!prompt?.payload || typeof prompt.payload !== 'object') {
    return {}
  }

  return prompt.payload
}

export const getPromptPayloadNumber = (
  prompt: GamePrompt | null | undefined,
  keys: string[]
): number | null => {
  const payload = getPayloadRecord(prompt)
  for (const key of keys) {
    const rawValue = payload[key]
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue
    }
    if (typeof rawValue === 'string' && rawValue.trim() !== '') {
      const parsed = Number.parseInt(rawValue, 10)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
  }

  return null
}

export const getPromptPayloadString = (
  prompt: GamePrompt | null | undefined,
  keys: string[]
): string | null => {
  const payload = getPayloadRecord(prompt)
  for (const key of keys) {
    const rawValue = payload[key]
    if (typeof rawValue === 'string' && rawValue.trim() !== '') {
      return rawValue
    }
  }

  return null
}
