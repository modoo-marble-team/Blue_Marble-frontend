#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  buildPrWorkflowGate,
  getChangedFiles,
  printPrWorkflowGate,
} from './lib.mjs'

export function parsePrGateArgs(argv) {
  const args = argv.slice(2)
  const parsed = {
    mode: 'report',
    changedFilesFile: undefined,
    prBodyFile: undefined,
    prBody: undefined,
    todoFile: 'TODO.md',
    outputFile: undefined,
    files: null,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    switch (arg) {
      case '--mode':
        parsed.mode = args[index + 1] ?? parsed.mode
        index += 1
        break
      case '--changed-files-file':
        parsed.changedFilesFile = args[index + 1]
        index += 1
        break
      case '--pr-body-file':
        parsed.prBodyFile = args[index + 1]
        index += 1
        break
      case '--pr-body':
        parsed.prBody = args[index + 1]
        index += 1
        break
      case '--todo-file':
        parsed.todoFile = args[index + 1] ?? parsed.todoFile
        index += 1
        break
      case '--output-file':
        parsed.outputFile = args[index + 1]
        index += 1
        break
      case '--files': {
        const files = []

        for (
          let fileIndex = index + 1;
          fileIndex < args.length && !args[fileIndex].startsWith('--');
          fileIndex += 1
        ) {
          files.push(args[fileIndex])
          index = fileIndex
        }

        parsed.files = files
        break
      }
      default:
        break
    }
  }

  return parsed
}

function readOptionalFile(targetPath) {
  if (!targetPath) {
    return ''
  }

  try {
    return fs.readFileSync(targetPath, 'utf8')
  } catch {
    return ''
  }
}

function readChangedFiles(targetPath) {
  return readOptionalFile(targetPath)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function main(argv = process.argv) {
  const options = parsePrGateArgs(argv)
  const files =
    options.files ??
    (options.changedFilesFile
      ? readChangedFiles(options.changedFilesFile)
      : getChangedFiles())
  const prBody = options.prBody ?? readOptionalFile(options.prBodyFile)
  const todoContent = readOptionalFile(options.todoFile)
  const result = buildPrWorkflowGate({
    files,
    prBody,
    todoContent,
  })

  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, JSON.stringify(result, null, 2))
  }

  printPrWorkflowGate('AI PR Gate', result)

  if (options.mode === 'enforce' && result.errors.length > 0) {
    process.exit(1)
  }
}

const executedPath = process.argv[1]
const modulePath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === modulePath) {
  main()
}
