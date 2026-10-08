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
import { Analytics } from "@vercel/analytics/next"
import Lobby from "./components/Lobby"
import OpponentPanel from "./components/OpponentPanel"
import MeldArea from "./components/MeldArea"
import DeckAndDiscard from "./components/DeckAndDiscard"
import PlayerHand from "./components/PlayerHand"
import PlayingCard from "./components/PlayingCard"
import DiscardHistoryModal from "./components/DiscardHistoryModal"
import WinModal from "./components/WinModal"
import Toast from "./components/Toast"

import "./styles/App.css"
import "./styles/LandScape.css" // keep last so it overrides

// Prefer whatever is under the pointer (discard pile), else nearest card
function collisionDetection(args) {
  const hits = pointerWithin(args)
  if (!hits.length) return closestCenter(args)
  const specific = hits.filter(h => h.id !== "new-meld")
  return specific.length ? specific : hits
}
//test run
function App() {


  const g = useTongitsGame()

  if (!g.roomCode) {
    return (
      <div className="game">
        <Lobby
          inputCode={g.inputCode}
          setInputCode={g.setInputCode}
          message={g.message}
          onCreateRoom={g.createRoom}
          onJoinRoom={g.joinRoom}
        />
        <Toast key={g.toast?.id} toast={g.toast} onClose={g.dismissToast} />
      </div>
    )
  }

  return (
    <div className="game">
      <div className="table">

       <div className="top-bar">
  <div className="top-brand">
    <strong>TONGITS</strong>
    <span className="top-score">
      YOU {g.scoreboard.me} – {g.scoreboard.opp} OPP
      {g.scoreboard.myStreak >= 2 ? ` 🔥${g.scoreboard.myStreak}` : ""}
    </span>
  </div>

  <span>ROOM {g.roomCode}</span>

  <div className="top-actions">
    <EmoteBar onSend={g.sendEmote} />
    <ChatBox
      messages={g.chatMessages}
      myUid={g.user?.uid}
      open={g.chatOpen}
      onToggle={() => g.setChatOpen(o => !o)}
      unread={g.unread}
      onSend={g.sendChat}
    />
    <button className="leave-button" onClick={g.leaveRoom}>LEAVE</button>
  </div>
</div>
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
              <OpponentPanel opponentCount={g.opponentCount} />

              {g.opponentLeft ? (
                <div className="disconnect-banner">
                  ⚠ Opponent left the room — press LEAVE to close it
                </div>
              ) : g.opponentDisconnected && (
                <div className="disconnect-banner">
                  ⚠ Opponent disconnected — waiting for them to return...
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
                deckCount={g.game?.deck?.length || 0}
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

              <div className="turn-message">
                {g.isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
              </div>




            </div>

            <div className="zone zone-hand">
              <PlayerHand
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

      <Toast key={g.toast?.id} toast={g.toast} onClose={g.dismissToast} />
    </div>
  )
}



export default App