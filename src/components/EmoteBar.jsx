import { useState } from "react"
import { EMOTES } from "../utils/emotes"
import "../styles/Emotes.css"

export function EmoteContent({ emote }) {
  if (!emote) return null
  if (emote.type === "image") {
    return <img src={import.meta.env.BASE_URL + emote.content} alt={emote.id} draggable={false} />
  }
  return <span>{emote.content}</span>
}

function EmoteBar({ onSend }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="emote-bar">
      <button className="emote-toggle" onClick={() => setOpen(o => !o)}>😀</button>

      {open && (
        <div className="emote-panel">
          {EMOTES.map(e => (
            <button
              key={e.id}
              className="emote-item"
              onClick={() => { onSend(e.id); setOpen(false) }}
            >
              <EmoteContent emote={e} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default EmoteBar