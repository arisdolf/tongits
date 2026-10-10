import { useState, useEffect, useRef } from "react"
import "../styles/Chat.css"

function ChatBox({ messages, myUid, open, onToggle, unread, onSend, opponentName = "Opponent"}) {
  const [text, setText] = useState("")
  const endRef = useRef(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, open])

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText("")
  }

  return (
    <div className="chat-wrap">
      <button className="chat-toggle" onClick={onToggle}>
        💬
        {unread > 0 && !open && <span className="chat-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>CHAT</span>
            <button className="chat-close" onClick={onToggle}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && <div className="chat-empty">Say hi 👋</div>}
            {messages.map(m => (
              <div key={m.id} className={"chat-msg " + (m.from === myUid ? "chat-mine" : "chat-opp")}>
               {m.from !== myUid && <div className="chat-name">{opponentName}</div>}
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form className="chat-form" onSubmit={submit}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message…"
              maxLength={200}
            />
            <button type="submit" className="chat-send">SEND</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ChatBox