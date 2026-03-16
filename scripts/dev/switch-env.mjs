import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const mode = process.argv[2]
const rootDir = process.cwd()
const targetPath = path.join(rootDir, '.env.development')

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

console.log(`Updated .env.development -> ${mode}`)
