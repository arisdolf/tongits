const SRC = import.meta.env.BASE_URL + "audio/card.ogg"

const base = new Audio(SRC)
base.preload = "auto"
base.volume = 0.7

// cloneNode lets several sounds overlap (melding plays many cards at once)
export function playCardSound(delay = 0) {
  const play = () => {
    const a = base.cloneNode()
    a.volume = base.volume
    a.playbackRate = 0.95 + Math.random() * 0.15 // slight pitch variation, very Balatro
    a.play().catch(() => {})
  }
  if (delay > 0) setTimeout(play, delay)
  else play()
}