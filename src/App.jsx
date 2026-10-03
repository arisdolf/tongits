import { createPortal } from "react-dom"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter
} from "@dnd-kit/core"

import { useTongitsGame } from "./hooks/useTongitsGame"

import ErrorBoundary from './components/ErrorBoundary.jsx'

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
  return hits.length ? hits : closestCenter(args)
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
          <strong>TONGITS</strong>
          <span>ROOM {g.roomCode}</span>
          <button className="leave-button" onClick={g.leaveRoom}>
            LEAVE
          </button>
        </div>

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
                {g.isMyTurn
                  ? g.game?.phase === "draw"
                    ? "YOUR TURN — DRAW OR TAKE DISCARD"
                    : "YOUR TURN — MELD / DISCARD"
                  : "OPPONENT'S TURN"}
              </div>

              {g.isMyTurn && g.game?.phase === "draw" && (
                <div className="turn-warning">
                  ⚠ Draw (or take a usable discard) first — you can't meld or discard yet.
                </div>
              )}

              {g.isMyTurn && g.game?.mustMeld && (
                <div className="turn-warning">
                  ⚠ You took {g.game.mustMeld} — use it in a meld or add it to one before discarding.
                </div>
              )}

            </div>

            <div className="zone zone-hand">
              <PlayerHand
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)


export default App