/**
 * 🎵 글로벌 BGM 매니저
 *
 * 1) initBgm(): 앱 시작 시 호출. 유저의 첫 인터랙션으로 오디오를 미리 unlock.
 * 2) playBgm(): 게임 페이지 진입 시 호출. unlock 되어 있으면 즉시 재생.
 * 3) stopBgm(): 게임 퇴장 시 호출. 정지.
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
 * 유저 인터랙션 시 오디오 unlock (+ 재생 대기 중이면 바로 재생)
 */
function onInteraction() {
  if (unlocked) {
    // 이미 unlock 됨. 재생 대기 상태면 재생 시도.
    if (wantPlay) {
      const a = getOrCreateAudio()
      if (a.paused) {
        a.play().catch(() => {})
      }
    }
    return
  }

  // unlock 시도
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
      removeListeners()
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
 * 앱 시작 시 호출. 유저 인터랙션 감지를 시작합니다.
 * 오디오 파일은 아직 로드하지 않습니다.
 */
export function initBgm() {
  addListeners()
}

/**
 * BGM 재생 시작.
 */
export function playBgm() {
  wantPlay = true
  const a = getOrCreateAudio()
  a.play()
    .then(() => {
      unlocked = true
      removeListeners()
    })
    .catch(() => {
      // 자동재생 차단 → 인터랙션 리스너로 대기
      addListeners()
    })
}

/**
 * BGM 정지.
 */
export function stopBgm() {
  wantPlay = false
  removeListeners()
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
}
