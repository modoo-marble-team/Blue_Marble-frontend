#!/usr/bin/env node

import process from 'node:process'
import {
  getChangedFiles,
  getSuggestedScripts,
  parseScriptArgs,
  printScriptPlan,
  runNpmScript,
} from './lib.mjs'

const { files: explicitFiles, planOnly } = parseScriptArgs(process.argv)
const files = explicitFiles ?? getChangedFiles()
const scripts = getSuggestedScripts(files)

if (planOnly) {
  printScriptPlan('AI Fast Check Plan', files, scripts)
  process.exit(0)
}

if (scripts.length === 0) {
  printScriptPlan('AI Fast Check Plan', files, scripts)
  process.exit(0)
}

for (const scriptName of scripts) {
  runNpmScript(scriptName)
}
