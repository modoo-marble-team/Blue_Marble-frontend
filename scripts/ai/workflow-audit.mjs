#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { buildWorkflowAudit, printWorkflowAudit } from './lib.mjs'

export function main() {
  const audit = buildWorkflowAudit()
  printWorkflowAudit('AI Workflow Audit', audit)
}

const executedPath = process.argv[1]
const modulePath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === modulePath) {
  main()
}
