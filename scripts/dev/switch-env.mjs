import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const mode = process.argv[2]
const rootDir = process.cwd()
const targetPath = path.join(rootDir, '.env.development')
const localOverridePath = path.join(rootDir, '.env.development.local')

const templates = {
  mock: path.join(rootDir, '.env.development.mock'),
  real: path.join(rootDir, '.env.development.real'),
}

async function readModeLabel(filePath) {
  const content = await fs.readFile(filePath, 'utf8')

  if (content.includes('VITE_ENABLE_DEMO_MOCK=true')) {
    return 'mock'
  }

  if (content.includes('VITE_ENABLE_DEMO_MOCK=false')) {
    return 'real'
  }

  return 'unknown'
}

async function showCurrentMode() {
  try {
    const currentMode = await readModeLabel(targetPath)
    console.log(`Current .env.development mode: ${currentMode}`)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.log('Current .env.development mode: missing')
      return
    }

    throw error
  }
}

function parseBooleanFlag(content, key) {
  const matched = content.match(new RegExp(`^${key}=(true|false)$`, 'm'))
  return matched ? matched[1] : null
}

function upsertBooleanFlag(content, key, value) {
  const nextLine = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')

  if (pattern.test(content)) {
    return content.replace(pattern, nextLine)
  }

  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n'
  return `${content}${suffix}${nextLine}\n`
}

async function syncLocalOverrideFlags(templateContent) {
  try {
    let localContent = await fs.readFile(localOverridePath, 'utf8')
    const useSocketMock = parseBooleanFlag(templateContent, 'VITE_USE_SOCKET_MOCK')
    const enableDemoMock = parseBooleanFlag(
      templateContent,
      'VITE_ENABLE_DEMO_MOCK'
    )
    const allowAllMockTurns = parseBooleanFlag(
      templateContent,
      'VITE_ALLOW_ALL_MOCK_TURNS'
    )

    if (useSocketMock !== null) {
      localContent = upsertBooleanFlag(
        localContent,
        'VITE_USE_SOCKET_MOCK',
        useSocketMock
      )
    }

    if (enableDemoMock !== null) {
      localContent = upsertBooleanFlag(
        localContent,
        'VITE_ENABLE_DEMO_MOCK',
        enableDemoMock
      )
    }

    if (allowAllMockTurns !== null) {
      localContent = upsertBooleanFlag(
        localContent,
        'VITE_ALLOW_ALL_MOCK_TURNS',
        allowAllMockTurns
      )
    }

    await fs.writeFile(localOverridePath, localContent)
    console.log(`Synced .env.development.local mock flags -> ${mode}`)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }
}

if (!mode || !['mock', 'real', 'show'].includes(mode)) {
  console.error('Usage: node scripts/dev/switch-env.mjs <mock|real|show>')
  process.exit(1)
}

if (mode === 'show') {
  await showCurrentMode()
  process.exit(0)
}

const templatePath = templates[mode]
const template = await fs.readFile(templatePath, 'utf8')

await fs.writeFile(targetPath, template)
await syncLocalOverrideFlags(template)

console.log(`Updated .env.development -> ${mode}`)
