import { useState } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter
} from "@dnd-kit/core"

import { useTongitsGame } from "./hooks/useTongitsGame"
import EmoteBar, { EmoteContent } from "./components/EmoteBar"
import { getEmote } from "./utils/emotes"
import ChatBox from "./components/ChatBox"
import { isValidMeld } from "./utils/cardUtils"
import Lobby from "./components/Lobby"
import OpponentPanel from "./components/OpponentPanel"
import MeldArea from "./components/MeldArea"
import DeckAndDiscard from "./components/DeckAndDiscard"
import PlayerHand from "./components/PlayerHand"
import PlayingCard from "./components/PlayingCard"
import DiscardHistoryModal from "./components/DiscardHistoryModal"
import WinModal from "./components/WinModal"
import Toast from "./components/Toast"

import { useMusic } from "./hooks/useMusic"
import MusicPlayer from "./components/MusicPlayer"

import "./styles/App.css"
import "./styles/Balatro.css"
import "./styles/Music.css"
import "./styles/Theme.css"      // new look: after Balatro + Music, before LandScape
import "./styles/LandScape.css"  // keep last so it overrides

// Prefer whatever is under the pointer (discard pile), else nearest card
function collisionDetection(args) {
  const hits = pointerWithin(args)
  if (!hits.length) return closestCenter(args)
  const specific = hits.filter(h => h.id !== "new-meld")
  return specific.length ? specific : hits
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // navigator.clipboard only works on https or localhost,
    // so it fails when testing over a LAN IP
    const area = document.createElement("textarea")
    area.value = text
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    document.execCommand("copy")
    area.remove()
  }
}

function App() {
  const g = useTongitsGame()
  const [emoteOpen, setEmoteOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const m = useMusic({
    roomCode: g.roomCode,
    user: g.user,
    name: g.myName,
    notify: g.notify
  })

  const canMeld =
    !!g.isMyTurn &&
    g.game?.status === "playing" &&
    g.game?.phase === "discard" &&
    g.selectedCards.length >= 3 &&
    isValidMeld(g.selectedCards) &&
    (!g.game?.mustMeld || g.selectedCards.includes(g.game.mustMeld))

  function copyRoomCode() {
    copyText(g.roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // only one top-bar panel open at a time
  function openMusic() {
    setEmoteOpen(false)
    g.setChatOpen(false)
    if (m.needsTap) m.syncNow()   // this tap lets the browser start audio
    setMusicOpen(o => !o)
  }

  function handleToastClick() {
    if (g.toast?.action === "open-chat") {
      setMusicOpen(false)
      setEmoteOpen(false)
      g.setChatOpen(true)
    }
    g.dismissToast()
  }

  if (!g.roomCode) {
    return (
      <div className="game">
        <Lobby
          user={g.user}
          username={g.username}
          setUsername={g.setUsername}
          inputCode={g.inputCode}
          setInputCode={g.setInputCode}
          message={g.message}
          onCreateRoom={g.createRoom}
          onJoinRoom={g.joinRoom}
        />
        <Toast key={g.toast?.id} toast={g.toast} onClose={g.dismissToast} onClick={handleToastClick} />
      </div>
    )
  }

  const turnLabel = g.dealing
    ? "Dealing…"
    : g.isMyTurn
      ? "Your turn"
      : "Opponent's turn"

  return (
    <div className="game">

      <div className={"table" + (g.dealing ? " dealing" : "")}>

        <div className="top-bar">
          <div className="top-brand">
            <span className="top-score">
              {g.myName} {g.scoreboard.me} – {g.scoreboard.opp} {g.opponentName}
              {g.scoreboard.myStreak >= 2 ? ` 🔥${g.scoreboard.myStreak}` : ""}
            </span>
          </div>

          <button className="room-code" onClick={copyRoomCode} title="Copy room code">
            Room {g.roomCode} {copied ? "· Copied ✔" : "⧉"}
          </button>

          <div className="top-social-controls">
            {g.game && (
              <button
                className={"top-icon-btn music-btn" + (m.playing ? " is-playing" : "") + (musicOpen ? " is-active" : "") + (m.needsTap ? " needs-sync" : "")}
                onClick={openMusic}
                aria-label="Music"
                aria-expanded={musicOpen}
              >
                <span className="btn-ico">🎵</span>
                <span className="btn-label">{m.current ? "Music" : "Play music"}</span>
                {m.playing && (
                  <span className="eq" aria-hidden="true"><i /><i /><i /></span>
                )}
              </button>
            )}

            <ChatBox
              messages={g.chatMessages}
              myUid={g.user?.uid}
              open={g.chatOpen}
              onToggle={() => {
                if (!g.chatOpen) { setEmoteOpen(false); setMusicOpen(false) }
                g.setChatOpen(o => !o)
              }}
              unread={g.unread}
              onSend={g.sendChat}
              opponentName={g.opponentName}
            />
          </div>

          <div className="top-actions">
            <EmoteBar
              onSend={g.sendEmote}
              open={emoteOpen}
              onToggle={() => {
                if (!emoteOpen) { g.setChatOpen(false); setMusicOpen(false) }
                setEmoteOpen(o => !o)
              }}
              onClose={() => setEmoteOpen(false)}
            />

            <button className="leave-button" onClick={g.leaveRoom}>Leave</button>
          </div>
        </div>

        {/* Music tab: always mounted so the song keeps playing, invisible until opened */}
        <MusicPlayer
          m={m}
          open={musicOpen}
          onClose={() => setMusicOpen(false)}
          notify={g.notify}
        />

        {g.activeEmote && getEmote(g.activeEmote.id) && (
          <div
            key={g.activeEmote.ts}
            className={"emote-bubble " + (g.activeEmote.from === g.user?.uid ? "emote-mine" : "emote-opp")}
          >
            <EmoteContent emote={getEmote(g.activeEmote.id)} />
          </div>
        )}

        <DndContext
          sensors={g.sensors}
          collisionDetection={collisionDetection}
          onDragStart={g.handleDragStart}
          onDragEnd={g.handleDragEnd}
          onDragCancel={g.handleDragCancel}
        >

          <div className="table-body">

            <div className="zone zone-opp">
              <OpponentPanel opponentCount={g.opponentCount} name={g.opponentName} />

              {g.opponentLeft ? (
                <div className="disconnect-banner">
                  ⚠ Opponent left the room — press Leave to close it
                </div>
              ) : g.opponentDisconnected && (
                <div className="disconnect-banner">
                  ⚠ Opponent disconnected — waiting for them to return…
                </div>
              )}
            </div>

            <div className="zone zone-melds">
              <MeldArea
                meldList={g.game?.melds || []}
                isMyTurn={g.isMyTurn}
                phase={g.game?.phase}
                selectedCards={g.selectedCards}
                currentUserId={g.user?.uid}
                mustMeld={g.game?.mustMeld}
                onAddToMeld={g.addToMeld}
              />
            </div>

            <div className="zone zone-center">
              <DeckAndDiscard
                deckCount={g.deckCount}
                drawing={g.drawing}
                onDraw={g.drawCard}
                canDraw={
                  g.isMyTurn &&
                  g.game?.phase === "draw" &&
                  !g.game?.hasDrawn
                }
                discardPile={g.discardPile}
                onViewAll={() => g.setShowDiscardHistory(true)}
                canTakeDiscard={g.canTakeDiscard}
                onTakeDiscard={g.takeDiscard}
              />

              <div className={"turn-message" + (g.isMyTurn && !g.dealing ? " mine" : "")}>
                {turnLabel}
              </div>
            </div>

            <div className="zone zone-hand">
              <PlayerHand
                canMeld={canMeld}
                dealtCount={g.dealtCount}
                name={g.myName}
                onUngroup={g.ungroupSelected}
                groups={g.groups}
                onGroup={g.groupHand}
                myHand={g.myHand}
                selectedCards={g.selectedCards}
                newlyDrawnCard={g.newlyDrawnCard}
                onSelectCard={g.toggleCard}
                sortMenuOpen={g.sortMenuOpen}
                setSortMenuOpen={g.setSortMenuOpen}
                onSortBySuit={g.sortHandBySuit}
                onSortByRank={g.sortHandByRank}
                isMyTurn={g.isMyTurn}
                phase={g.game?.phase}
                onMeld={g.createMeld}
                onDiscard={g.discardSelected}
                onClearSelection={() => g.setSelectedCards([])}
                starterName={g.starterName}
                hasStarter={!!(g.game && g.game.starter)}
              />
            </div>

          </div>

          {createPortal(
            <DragOverlay zIndex={1000} dropAnimation={{ duration: 180 }}>
              {g.activeDragCard ? (
                <div className="drag-ghost">
                  <PlayingCard card={g.activeDragCard} />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}

        </DndContext>

        <p className="message">{g.message}</p>

        <WinModal
          myName={g.myName} opponentName={g.opponentName}
          game={g.game}
          room={g.room}
          currentUserId={g.user?.uid}
          myHand={g.myHand}
          opponentHand={g.opponentHand}
          opponentGone={g.opponentLeft || g.opponentDisconnected}
          onRequestRematch={g.requestRematch}
          onAcceptRematch={g.acceptRematch}
          onDeclineRematch={g.declineRematch}
          onCancelRematch={g.cancelRematch}
          onLeave={g.leaveRoom}
        />

        <DiscardHistoryModal
          open={g.showDiscardHistory}
          onClose={() => g.setShowDiscardHistory(false)}
          discardPile={g.discardPile}
        />

      </div>

      <Toast key={g.toast?.id} toast={g.toast} onClose={g.dismissToast} onClick={handleToastClick} />
    </div>
  )
}

export default App
