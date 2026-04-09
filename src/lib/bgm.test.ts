import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class AudioMock {
  static instances: AudioMock[] = []

  src: string
  loop = false
  volume = 1
  paused = true
  currentTime = 0
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })

  constructor(src: string) {
    this.src = src
    AudioMock.instances.push(this)
  }
}

const getLastAudioInstance = () => {
  const instance = AudioMock.instances[AudioMock.instances.length - 1]
  if (!instance) {
    throw new Error('Expected Audio instance to be created')
  }
  return instance
}

describe('bgm manager', () => {
  beforeEach(() => {
    vi.resetModules()
    AudioMock.instances = []
    vi.stubGlobal('Audio', AudioMock as unknown as typeof Audio)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries playback on interaction while play is requested', async () => {
    const { playBgm } = await import('./bgm')

    playBgm()
    await Promise.resolve()

    const audio = getLastAudioInstance()
    expect(audio.play).toHaveBeenCalledTimes(1)

    audio.paused = true
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await Promise.resolve()
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('stops interaction-driven replay after stopBgm', async () => {
    const { playBgm, stopBgm } = await import('./bgm')

    playBgm()
    await Promise.resolve()

    const audio = getLastAudioInstance()
    expect(audio.play).toHaveBeenCalledTimes(1)

    stopBgm()
    audio.paused = true
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await Promise.resolve()
    expect(audio.play).toHaveBeenCalledTimes(1)
  })
})
