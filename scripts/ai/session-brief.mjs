#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { buildSessionBrief, printSessionBrief } from './lib.mjs'

export function parseSessionBriefArgs(argv) {
  const args = argv.slice(2)
  return args.find((value) => !value.startsWith('--'))
}

export function main(argv = process.argv) {
  const slug = parseSessionBriefArgs(argv)
  const brief = buildSessionBrief(slug)
  printSessionBrief('AI Session Brief', brief)
}

const executedPath = process.argv[1]
const modulePath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === modulePath) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
