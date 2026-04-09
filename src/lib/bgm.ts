/**
 * Global BGM manager.
 * 1) initBgm(): register interaction listeners to unlock media playback.
 * 2) playBgm(): request continuous gameplay BGM.
 * 3) stopBgm(): stop playback and reset position.
 */

const BGM_SRC = '/audio/game-bgm.mp3'
const BGM_VOLUME = 0.02

let audio: HTMLAudioElement | null = null
let unlocked = false
let wantPlay = false

function getOrCreateAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(BGM_SRC)
    audio.loop = true
    audio.volume = BGM_VOLUME
  }
  return audio
}

/**
 * Unlock media playback on first user interaction.
 */
function onInteraction() {
  if (unlocked) {
    // Already unlocked: if BGM should be playing, retry playback.
    if (wantPlay) {
      const a = getOrCreateAudio()
      if (a.paused) {
        a.play().catch(() => {})
      }
    }
    return
  }

  // Attempt unlock by starting muted playback once.
  const a = getOrCreateAudio()
  const savedVolume = a.volume
  a.volume = 0
  a.play()
    .then(() => {
      unlocked = true
      if (!wantPlay) {
        a.pause()
        a.currentTime = 0
      }
      a.volume = savedVolume
    })
    .catch(() => {
      a.volume = savedVolume
    })
}

function removeListeners() {
  document.removeEventListener('click', onInteraction, true)
  document.removeEventListener('keydown', onInteraction, true)
  document.removeEventListener('touchstart', onInteraction, true)
  document.removeEventListener('pointerdown', onInteraction, true)
}

function addListeners() {
  document.addEventListener('click', onInteraction, true)
  document.addEventListener('keydown', onInteraction, true)
  document.addEventListener('touchstart', onInteraction, true)
  document.addEventListener('pointerdown', onInteraction, true)
}

/**
 * Initialize listeners for user interaction unlock flow.
 * Audio instance is lazily created only when needed.
 */
export function initBgm() {
  addListeners()
}

/**
 * Start BGM playback.
 */
export function playBgm() {
  wantPlay = true
  addListeners()
  const a = getOrCreateAudio()
  a.play()
    .then(() => {
      unlocked = true
    })
    .catch(() => {
      // interaction listeners stay active while BGM should play
    })
}

/**
 * Stop BGM playback.
 */
export function stopBgm() {
  wantPlay = false
  removeListeners()
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
}

let activeLongSfx: HTMLAudioElement | null = null

export function playLongSfx(src: string) {
  stopLongSfx()
  const sfx = new Audio(src)
  sfx.play().catch(() => {})
  activeLongSfx = sfx
}

export function stopLongSfx() {
  if (activeLongSfx) {
    activeLongSfx.pause()
    activeLongSfx.currentTime = 0
    activeLongSfx = null
  }
}
