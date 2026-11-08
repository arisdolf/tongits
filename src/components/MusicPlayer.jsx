import { useState, useEffect } from "react"
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors
} from "@dnd-kit/core"
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove, sortableKeyboardCoordinates
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { searchVideos, parseVideoId, fetchTitle, thumbUrl } from "../utils/youtube"

const fmt = s => {
  s = Math.max(0, Math.floor(s || 0))
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}


/* one draggable row in the queue (drag by the ⠿ handle so scrolling still works) */
function QueueRow({ s, m }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id })

  const style = {
    // vertical only
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={"music-row" + (isDragging ? " music-row-dragging" : "")}
    >
      <span className="music-handle" {...attributes} {...listeners} aria-label="Drag to reorder">⠿</span>
      <img src={thumbUrl(s.videoId)} alt="" />
      <div className="music-row-text">
        <div className="music-row-title">{s.title}</div>
        <div className="music-row-sub">Added by {s.byName}</div>
      </div>
      <button className="mbtn" title="Play now" onClick={() => m.playNow(s.id)}>▶</button>
      <button className="mbtn mbtn-red" title="Remove" onClick={() => m.remove(s.id)}>✕</button>
    </div>
  )
}

/*
 * MUSIC TAB
 * Always mounted (the YouTube player lives in here, so the song keeps
 * playing), but slid off-screen and inert until `open` is true.
 * Nothing about it shows on the table.
 * `m` comes from useMusic()
 */
function MusicPlayer({ m, open, onClose, notify }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [time, setTime] = useState({ t: 0, d: 0 })
  const [scrub, setScrub] = useState(null)

  // progress bar only runs while the tab is open
  useEffect(() => {
    if (!open || !m.current) return
    setTime(m.getTime())
    const id = setInterval(() => setTime(m.getTime()), 500)
    return () => clearInterval(id)
  }, [open, m.current?.id])

  // Esc closes the tab
  useEffect(() => {
    if (!open) return
    const onKey = e => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onQueueDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const ids = m.queue.map(s => s.id)
    const from = ids.indexOf(active.id)
    const to = ids.indexOf(over.id)
    if (from < 0 || to < 0) return
    m.reorder(arrayMove(ids, from, to))
  }

  const shown = scrub ?? time.t
  const max = Math.max(1, Math.floor(time.d))

  return (
    <div className="music-wrap">
      <div
        className={"music-overlay" + (open ? "" : " music-closed")}
        onClick={open ? onClose : undefined}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className="music-sheet"
          role="dialog"
          aria-label="Music"
          onClick={e => e.stopPropagation()}
        >
          <div className="music-grab" />

          <div className="music-head">
            <span>Music</span>
            <button className="mbtn mbtn-ghost" onClick={onClose} aria-label="Close music">✕</button>
          </div>

          <div className="music-body">

            {/* VIDEO (only shown inside this tab) */}
            <div className={"music-video" + (m.current ? "" : " music-video-empty")}>
              <div ref={m.boxRef} className="music-box" />
            </div>

            {/* NOW PLAYING */}
            <div className="music-now">
              {m.current ? (
                <>
                  <div className="music-now-title">{m.current.title}</div>
                  <div className="music-now-sub">Added by {m.current.byName}</div>

                  <input
                    className="music-seek"
                    type="range"
                    min={0}
                    max={max}
                    value={Math.min(Math.floor(shown), max)}
                    disabled={!time.d}
                    onChange={e => setScrub(Number(e.target.value))}
                    onPointerUp={commitScrub}
                    onKeyUp={commitScrub}
                    aria-label="Seek"
                  />
                  <div className="music-times">
                    <span>{fmt(shown)}</span>
                    <span>{fmt(time.d)}</span>
                  </div>

                  <div className="music-controls">
                    {m.needsTap ? (
                      <button className="mbtn mbtn-gold mbtn-big" onClick={m.syncNow}>Tap to sync</button>
                    ) : (
                      <>
                        <button className="mbtn mbtn-big" onClick={m.togglePlay}>
                          {m.playing ? "⏸ Pause" : "▶ Play"}
                        </button>
                        <button className="mbtn mbtn-big" onClick={m.skip}>⏭ Next</button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="music-empty-note">Nothing playing yet. Search for a song below.</div>
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
                {busy ? "…" : "Search"}
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
                    <button className="mbtn mbtn-gold" onClick={() => add(r)}>+ Add</button>
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
              {m.queue.length > 1 && (
                <div className="music-empty-note">Hold ⠿ and drag to reorder</div>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onQueueDragEnd}>
                <SortableContext items={m.queue.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {m.queue.map(s => <QueueRow key={s.id} s={s} m={m} />)}
                </SortableContext>
              </DndContext>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default MusicPlayer