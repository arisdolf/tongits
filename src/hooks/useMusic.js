/*
 * useMusic — synced YouTube player for a Tongits room
 *
 * Firebase node: rooms/<code>/music
 * {
 *   current: { id, videoId, title, by, byName } | null,
 *   queue:   [ same shape ],
 *   playing: boolean,
 *   pos:     seconds into the song at time `at`,
 *   at:      server time (ms) when pos was recorded
 * }
 *
 * Everyone applies the same state to their own hidden-controls player:
 *   target position = pos + (now - at) while playing
 * so a pause / seek / skip from either player affects both.
 */
import { useState, useEffect, useRef } from "react"
import { database } from "../firebase"
import { ref, onValue, runTransaction, update } from "firebase/database"

let ytPromise = null
function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!ytPromise) {
    ytPromise = new Promise(resolve => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
      const s = document.createElement("script")
      s.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(s)
    })
  }
  return ytPromise
}

const toList = q => (q ? Object.values(q) : [])

function normalize(v) {
  if (!v) return null
  return { ...v, queue: toList(v.queue) }
}

export function useMusic({ roomCode, user, name, notify }) {
  const [music, setMusic] = useState(null)
  const [ready, setReady] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)

  const boxRef = useRef(null)        // <div> that holds the player iframe
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const loadedRef = useRef(null)     // id of the song the player currently has
  const musicRef = useRef(null)
  const offsetRef = useRef(0)        // server clock offset
  const blockedRef = useRef(0)
  const notifyRef = useRef(notify)
  musicRef.current = music
  notifyRef.current = notify

  const serverNow = () => Date.now() + offsetRef.current
  const musicRefDb = () => ref(database, "rooms/" + roomCode + "/music")

  /* LISTEN */
  useEffect(() => {
    if (!roomCode) { setMusic(null); return }

    const offA = onValue(ref(database, ".info/serverTimeOffset"), s => {
      offsetRef.current = s.val() || 0
    })
    const offB = onValue(ref(database, "rooms/" + roomCode + "/music"), s => {
      setMusic(normalize(s.val()))
    })

    return () => { offA(); offB(); setMusic(null) }
  }, [roomCode])

  /* DESTROY the player when leaving a room */
  useEffect(() => {
    return () => {
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      readyRef.current = false
      loadedRef.current = null
      setReady(false)
      setNeedsTap(false)
    }
  }, [roomCode])

  /* SYNC the local player to the shared state */
  function sync() {
    const p = playerRef.current
    const m = musicRef.current
    if (!p || !readyRef.current || !m) return

    const cur = m.current
    if (!cur) {
      if (loadedRef.current) { p.stopVideo(); loadedRef.current = null }
      return
    }

    const target = Math.max(
      0,
      m.playing ? m.pos + (serverNow() - m.at) / 1000 : m.pos
    )

    // new song
    if (loadedRef.current !== cur.id) {
      loadedRef.current = cur.id
      const opts = { videoId: cur.videoId, startSeconds: target }
      if (m.playing) p.loadVideoById(opts)
      else p.cueVideoById(opts)
      return
    }

    // same song: fix drift, then play / pause
    const state = p.getPlayerState()
    const t = p.getCurrentTime()

    if (Math.abs(t - target) > (m.playing ? 2 : 1)) {
      p.seekTo(target, true)
      if (!m.playing) p.pauseVideo()
    }
    if (m.playing && state !== 1 && state !== 3) p.playVideo()
    if (!m.playing && (state === 1 || state === 3)) p.pauseVideo()
  }

  useEffect(() => { sync() }, [music, ready])

  /* ADVANCE (transaction, so two players reporting "ended" only skip once) */
  async function advance(expectId) {
    if (!roomCode) return
    await runTransaction(musicRefDb(), m => {
      if (!m || !m.current) return            // abort
      if (expectId && m.current.id !== expectId) return   // someone already skipped
      const q = toList(m.queue)
      const next = q.shift() || null
      return {
        current: next,
        queue: q,
        playing: !!next,
        pos: 0,
        at: serverNow()
      }
    })
  }

  function songEnded() {
    const id = musicRef.current?.current?.id
    if (id) advance(id)
  }

  /* CREATE the player the first time a song exists */
  const hasCurrent = !!music?.current
  useEffect(() => {
    if (!roomCode || !hasCurrent || playerRef.current || !boxRef.current) return
    let cancelled = false

    loadYT().then(YT => {
      if (cancelled || playerRef.current || !boxRef.current) return

      const holder = document.createElement("div")
      boxRef.current.appendChild(holder)

      playerRef.current = new YT.Player(holder, {
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,        // all controls are ours, so both stay in sync
          disablekb: 1,
          fs: 0,
          playsinline: 1,     // required for iPhone
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: () => { readyRef.current = true; setReady(true) },
          onStateChange: e => { if (e.data === 0) songEnded() },
          onError: () => {
            notifyRef.current?.("That video can't be played here — skipping it", "warn")
            songEnded()
          }
        }
      })
    })

    return () => { cancelled = true }
  }, [roomCode, hasCurrent])

  /* WATCHDOG: re-sync every few seconds, and detect blocked autoplay */
  useEffect(() => {
    if (!ready) return
    let n = 0

    const id = setInterval(() => {
      const p = playerRef.current
      const m = musicRef.current
      if (!p || !m) return

      if (++n % 6 === 0) sync()   // every ~3s

      const st = p.getPlayerState?.()
      const stuck = !!m.current && m.playing && (st === -1 || st === 5 || st === 2)
      blockedRef.current = stuck ? blockedRef.current + 1 : 0
      setNeedsTap(blockedRef.current >= 4)
    }, 500)

    return () => clearInterval(id)
  }, [ready])

  /* ACTIONS */
  function newItem(song) {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      videoId: song.videoId,
      title: String(song.title || "YouTube video").slice(0, 120),
      by: user?.uid || "",
      byName: name || "Player"
    }
  }

  async function addSong(song) {
    if (!roomCode || !user) return
    const item = newItem(song)
    await runTransaction(musicRefDb(), m => {
      m = m || {}
      if (!m.current) {
        return { current: item, queue: [], playing: true, pos: 0, at: serverNow() }
      }
      return { ...m, queue: [...toList(m.queue), item] }
    })
  }

  function togglePlay() {
    const m = musicRef.current
    if (!m?.current) return
    const p = playerRef.current
    const pos = p?.getCurrentTime ? p.getCurrentTime() : m.pos
    return update(musicRefDb(), { playing: !m.playing, pos, at: serverNow() })
  }

  function seek(seconds) {
    if (!musicRef.current?.current) return
    return update(musicRefDb(), { pos: seconds, at: serverNow() })
  }

  const skip = () => advance(musicRef.current?.current?.id)

  // jump straight to a queued song
  async function playNow(id) {
    await runTransaction(musicRefDb(), m => {
      if (!m) return
      const q = toList(m.queue)
      const item = q.find(s => s.id === id)
      if (!item) return
      return {
        current: item,
        queue: q.filter(s => s.id !== id),
        playing: true,
        pos: 0,
        at: serverNow()
      }
    })
  }

  // move a queued song to the front of the queue
  async function playNext(id) {
    await runTransaction(musicRefDb(), m => {
      if (!m) return
      const q = toList(m.queue)
      const item = q.find(s => s.id === id)
      if (!item) return
      return { ...m, queue: [item, ...q.filter(s => s.id !== id)] }
    })
  }

  async function remove(id) {
    await runTransaction(musicRefDb(), m => {
      if (!m) return
      return { ...m, queue: toList(m.queue).filter(s => s.id !== id) }
    })
  }

  // Persist a drag reorder against the latest shared queue. A transaction keeps
  // concurrent additions/removals from being overwritten by a stale snapshot.
  async function reorder(orderedIds) {
    if (!roomCode || !Array.isArray(orderedIds)) return
    await runTransaction(musicRefDb(), m => {
      if (!m) return
      const queue = toList(m.queue)
      const byId = new Map(queue.map(song => [song.id, song]))
      if (orderedIds.length !== queue.length || orderedIds.some(id => !byId.has(id))) return
      return { ...m, queue: orderedIds.map(id => byId.get(id)) }
    })
  }

  // called from a tap, so the browser allows audio to start
  function syncNow() {
    sync()
    try { playerRef.current?.playVideo() } catch { /* ignore */ }
    blockedRef.current = 0
    setNeedsTap(false)
  }

  function getTime() {
    const p = playerRef.current
    return {
      t: p?.getCurrentTime?.() || 0,
      d: p?.getDuration?.() || 0
    }
  }

  return {
    boxRef,
    current: music?.current || null,
    queue: music?.queue || [],
    playing: !!music?.playing,
    needsTap,
    addSong, togglePlay, seek, skip,
    playNow, playNext, remove, reorder,
    syncNow, getTime
  }
}
