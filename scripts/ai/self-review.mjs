#!/usr/bin/env node

import process from 'node:process'
import {
  classifyFiles,
  getChangedFiles,
  getDiffText,
  getManualsForFiles,
  getReviewInsights,
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
const reviewInsights = getReviewInsights(files, { diffText })

console.log('AI Self Review')
console.log('')

if (files.length === 0) {
  console.log('No changed files detected.')
  process.exit(0)
}

printList('Changed Files', files)
printList('Relevant Manuals', manuals)
printList('Findings', reviewInsights.findings)
printList('Test Gaps', reviewInsights.testGaps)
printList('Warnings', reviewInsights.warnings)

printList(
  'Suggested Validation Commands',
  suggestedScripts.map((scriptName) => `npm run ${scriptName}`)
)
