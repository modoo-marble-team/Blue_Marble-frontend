#!/usr/bin/env node

import process from 'node:process'
import {
  classifyFiles,
  getChangedFiles,
  getDiffText,
  getManualsForFiles,
  getSuggestedScripts,
  parseScriptArgs,
} from './lib.mjs'

function printList(title, items) {
  console.log(title)
  if (items.length === 0) {
    console.log('- none')
  } else {
    for (const item of items) {
      console.log(`- ${item}`)
    }
  }
  console.log('')
}

const { files: explicitFiles } = parseScriptArgs(process.argv)
const files = explicitFiles ?? getChangedFiles()
const diffText = getDiffText()
const classified = classifyFiles(files)
const manuals = getManualsForFiles(files)
const suggestedScripts = getSuggestedScripts(files, { includeUiChecks: true })

const checklist = [
  'R5: 핵심 플로우가 위에서 아래로 읽히는가, 시점 이동이 늘지 않았는가?',
]
const warnings = []

if (classified.hasHooks) {
  checklist.push('Hook 반환 형태와 네이밍이 기존 규칙과 달라지지 않았는가?')
}

if (classified.hasSocketInfra || /\bsocket\.(on|off|emit)\(/.test(diffText)) {
  checklist.push(
    'Socket subscribe/unsubscribe, emit 경로, cleanup 타이밍이 모두 짝을 이루는가?'
  )
}

if (
  classified.hasSocketInfra ||
  files.some((file) => file.startsWith('src/contracts/socket/'))
) {
  checklist.push('Mock, socket contract, 관련 테스트가 함께 갱신됐는가?')
}

if (classified.hasUiFiles || /\buseNavigate\b|\bnavigate\(/.test(diffText)) {
  checklist.push(
    'Redirect, modal close, cleanup, pending state 흐름이 사용자 동선 기준으로 일관적인가?'
  )
}

if (classified.hasSourceChanges) {
  checklist.push('변경 기능을 직접 검증하는 테스트가 최소 1개 이상 존재하는가?')
}

if (classified.hasSourceChanges && !classified.hasTestChanges) {
  warnings.push('소스 파일이 바뀌었지만 이번 diff에는 테스트 파일 변경이 없습니다.')
}

if (
  (classified.hasSocketInfra || classified.hasWaitingRoom || classified.hasGame) &&
  !classified.hasTestChanges
) {
  warnings.push(
    '실시간/런타임 경로가 바뀌었는데 테스트 보강 흔적이 없습니다. 회귀 가능성을 다시 확인하세요.'
  )
}

if (classified.docsOnly) {
  warnings.push('현재 diff는 문서 중심입니다. 코드 품질 체크보다 문서-코드 정합성 검토가 우선입니다.')
}

console.log('AI Self Review')
console.log('')

if (files.length === 0) {
  console.log('No changed files detected.')
  process.exit(0)
}

printList('Changed Files', files)
printList('Relevant Manuals', manuals)
printList('Review Checklist', checklist)
printList('Warnings', warnings)

printList(
  'Suggested Validation Commands',
  suggestedScripts.map((scriptName) => `npm run ${scriptName}`)
)
