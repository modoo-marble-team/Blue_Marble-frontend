/**
 * ?�� 글로벌 BGM 매니?�
 *
 * 1) initBgm(): ???�작 ???�출. ?��???�??�터?�션?�로 ?�디?��? 미리 unlock.
 * 2) playBgm(): 게임 ?�이지 진입 ???�출. unlock ?�어 ?�으�?즉시 ?�생.
 * 3) stopBgm(): 게임 ?�장 ???�출. ?��?.
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
 * ?��? ?�터?�션 ???�디??unlock (+ ?�생 ?��?중이�?바로 ?�생)
 */
function onInteraction() {
  if (unlocked) {
    // ?��? unlock ?? ?�생 ?��??�태�??�생 ?�도.
    if (wantPlay) {
      const a = getOrCreateAudio()
      if (a.paused) {
        a.play().catch(() => {})
      }
    }
    return
  }

  // unlock ?�도
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
 * ???�작 ???�출. ?��? ?�터?�션 감�?�??�작?�니??
 * ?�디???�일?� ?�직 로드?��? ?�습?�다.
 */
export function initBgm() {
  addListeners()
}

/**
 * BGM ?�생 ?�작.
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
      // ?�동?�생 차단 ???�터?�션 리스?�로 ?��?
      // interaction listeners stay active while BGM should play
    })
}

/**
 * BGM ?��?.
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
