import { DndContext, closestCenter } from "@dnd-kit/core"

import { useTongitsGame } from "./hooks/useTongitsGame"

import Lobby from "./components/Lobby"
import OpponentPanel from "./components/OpponentPanel"
import MeldArea from "./components/MeldArea"
import DeckAndDiscard from "./components/DeckAndDiscard"
import PlayerHand from "./components/PlayerHand"
import DiscardHistoryModal from "./components/DiscardHistoryModal"
import WinModal from "./components/WinModal"

import "./styles/App.css"

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

        <OpponentPanel opponentCount={g.opponentCount} />
        {g.opponentDisconnected && (
          <div className="disconnect-banner">
            ⚠ Opponent disconnected — waiting for them to return...
          </div>
        )}

        <MeldArea
          meldList={g.game?.melds || []}
          isMyTurn={g.isMyTurn}
          phase={g.game?.phase}
          selectedCards={g.selectedCards}
          currentUserId={g.user?.uid}
          mustMeld={g.game?.mustMeld}
          onAddToMeld={g.addToMeld}
        />

        <DndContext
          sensors={g.sensors}
          collisionDetection={closestCenter}
          onDragEnd={g.handleDragEnd}
        >

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

        </DndContext>

        <p className="message">{g.message}</p>

        <WinModal
          game={g.game}
          room={g.room}
          currentUserId={g.user?.uid}
          onRematch={g.rematch}
        />

        <DiscardHistoryModal
          open={g.showDiscardHistory}
          onClose={() => g.setShowDiscardHistory(false)}
          discardPile={g.discardPile}
        />

      </div>
    </div>
  )
}

export default App