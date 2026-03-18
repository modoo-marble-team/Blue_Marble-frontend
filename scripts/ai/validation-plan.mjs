#!/usr/bin/env node

import process from 'node:process'
import {
  getChangedFiles,
  getValidationOrchestration,
  parseScriptArgs,
  printValidationOrchestrationPlan,
} from './lib.mjs'

const { files: explicitFiles } = parseScriptArgs(process.argv)
const files = explicitFiles ?? getChangedFiles()
const plan = getValidationOrchestration(files)

printValidationOrchestrationPlan('AI Validation Orchestration', files, plan)
