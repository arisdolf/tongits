import { useState, useEffect } from "react"
import { searchVideos, parseVideoId, fetchTitle, thumbUrl } from "../utils/youtube"

const fmt = s => {
  s = Math.max(0, Math.floor(s || 0))
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}

/*
 * MUSIC PLAYER
 * - mini bar (always under the top bar while a song exists): holds the video
 * - bottom sheet (open=true): search, controls, queue
 * `m` comes from useMusic()
 */
function MusicPlayer({ m, open, onClose, notify }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [time, setTime] = useState({ t: 0, d: 0 })
  const [scrub, setScrub] = useState(null)

  // progress bar updates only while the sheet is open
  useEffect(() => {
    if (!open || !m.current) return
    setTime(m.getTime())
    const id = setInterval(() => setTime(m.getTime()), 500)
    return () => clearInterval(id)
  }, [open, m.current?.id])

  async function submit(e) {
    e.preventDefault()
    const text = q.trim()
    if (!text || busy) return

    setBusy(true)
    try {
      const videoId = parseVideoId(text)
      if (videoId) {
        const title = await fetchTitle(videoId)
        await m.addSong({ videoId, title })
        notify("Added to the queue", "info")
        setQ("")
        setResults([])
      } else {
        const found = await searchVideos(text)
        setResults(found)
        if (found.length === 0) notify("No songs found", "warn")
      }
    } catch (err) {
      notify(
        err.message === "NO_KEY"
          ? "Search isn't set up yet — paste a YouTube link instead"
          : err.message,
        "warn"
      )
    }
    setBusy(false)
  }

  async function add(song) {
    await m.addSong(song)
    notify("Added: " + song.title.slice(0, 40), "info")
  }

  function commitScrub() {
    if (scrub === null) return
    m.seek(scrub)
    setTime(t => ({ ...t, t: scrub }))
    setScrub(null)
  }

  const shown = scrub ?? time.t

  return (
    <div className="music-wrap">

      {/* MINI BAR */}
      <div className={"music-bar" + (m.current ? "" : " music-empty")}>
        <div className="music-video">
          <div ref={m.boxRef} className="music-box" />
        </div>

        <div className="music-meta" onClick={onClose ? undefined : undefined}>
          <div className="music-title">{m.current?.title}</div>
          <div className="music-sub">
            {m.current ? "added by " + m.current.byName : ""}
          </div>
        </div>

        {m.needsTap ? (
          <button className="mbtn mbtn-gold" onClick={m.syncNow}>TAP TO SYNC</button>
        ) : (
          <>
            <button className="mbtn" onClick={m.togglePlay} aria-label="Play or pause">
              {m.playing ? "⏸" : "▶"}
            </button>
            <button className="mbtn" onClick={m.skip} aria-label="Next song">⏭</button>
          </>
        )}
      </div>

      {/* BOTTOM SHEET */}
      {open && (
        <div className="music-overlay" onClick={onClose}>
          <div className="music-sheet" onClick={e => e.stopPropagation()}>

            <div className="music-head">
              <span>MUSIC</span>
              <button className="mbtn mbtn-ghost" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="music-body">

              {/* NOW PLAYING */}
              <div className="music-now">
                {m.current ? (
                  <>
                    <div className="music-now-title">{m.current.title}</div>
                    <div className="music-now-sub">added by {m.current.byName}</div>

                    <input
                      className="music-seek"
                      type="range"
                      min={0}
                      max={Math.max(1, Math.floor(time.d))}
                      value={Math.min(Math.floor(shown), Math.max(1, Math.floor(time.d)))}
                      disabled={!time.d}
                      onChange={e => setScrub(Number(e.target.value))}
                      onPointerUp={commitScrub}
                      onKeyUp={commitScrub}
                    />
                    <div className="music-times">
                      <span>{fmt(shown)}</span>
                      <span>{fmt(time.d)}</span>
                    </div>

                    <div className="music-controls">
                      {m.needsTap ? (
                        <button className="mbtn mbtn-gold mbtn-big" onClick={m.syncNow}>TAP TO SYNC</button>
                      ) : (
                        <>
                          <button className="mbtn mbtn-big" onClick={m.togglePlay}>
                            {m.playing ? "⏸ PAUSE" : "▶ PLAY"}
                          </button>
                          <button className="mbtn mbtn-big" onClick={m.skip}>⏭ NEXT</button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="music-empty-note">Nothing playing. Search for a song below.</div>
                )}
              </div>

              {/* SEARCH */}
              <form className="music-search" onSubmit={submit}>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search a song or paste a YouTube link"
                  enterKeyHint="search"
                />
                <button type="submit" className="mbtn mbtn-gold" disabled={busy || !q.trim()}>
                  {busy ? "…" : "GO"}
                </button>
              </form>

              {results.length > 0 && (
                <div className="music-list">
                  <div className="music-list-title">Results</div>
                  {results.map(r => (
                    <div className="music-row" key={r.videoId}>
                      <img src={thumbUrl(r.videoId)} alt="" />
                      <div className="music-row-text">
                        <div className="music-row-title">{r.title}</div>
                        <div className="music-row-sub">{r.channel}</div>
                      </div>
                      <button className="mbtn mbtn-gold" onClick={() => add(r)}>+ ADD</button>
                    </div>
                  ))}
                </div>
              )}

              {/* QUEUE */}
              <div className="music-list">
                <div className="music-list-title">Up next ({m.queue.length})</div>
                {m.queue.length === 0 && (
                  <div className="music-empty-note">The queue is empty.</div>
                )}
                {m.queue.map((s, i) => (
                  <div className="music-row" key={s.id}>
                    <img src={thumbUrl(s.videoId)} alt="" />
                    <div className="music-row-text">
                      <div className="music-row-title">{s.title}</div>
                      <div className="music-row-sub">added by {s.byName}</div>
                    </div>
                    <button className="mbtn" title="Play now" onClick={() => m.playNow(s.id)}>▶</button>
                    {i > 0 && (
                      <button className="mbtn" title="Move to top" onClick={() => m.playNext(s.id)}>⤒</button>
                    )}
                    <button className="mbtn mbtn-red" title="Remove" onClick={() => m.remove(s.id)}>✕</button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MusicPlayer
