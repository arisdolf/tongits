import { DndContext, closestCenter } from "@dnd-kit/core"

import { useTongitsGame } from "./hooks/useTongitsGame"

import Lobby from "./components/Lobby"
import OpponentPanel from "./components/OpponentPanel"
import BahayArea from "./components/BahayArea"
import DeckAndDiscard from "./components/DeckAndDiscard"
import PlayerHand from "./components/PlayerHand"
import DiscardHistoryModal from "./components/DiscardHistoryModal"
import WinModal from "./components/winModal"

import "./index.css"


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


        <BahayArea
          bahayList={g.game?.bahay || []}
          isMyTurn={g.isMyTurn}
          phase={g.game?.phase}
          selectedCards={g.selectedCards}
          currentUserId={g.user?.uid}
          onAddToBahay={g.addToBahay}
        />

        <DndContext
          sensors={g.sensors}
          collisionDetection={closestCenter}
          onDragEnd={g.handleDragEnd}
        >

          <DeckAndDiscard
            deckCount={g.game ? g.game.deck.length : 0}
            drawing={g.drawing}
            onDraw={g.drawCard}
            canDraw={
              g.isMyTurn &&
              g.game?.phase === "draw" &&
              !g.game?.hasDrawn
            }
            discardPile={g.discardPile}
            onViewAll={() => g.setShowDiscardHistory(true)}
          />

          <div className="turn-message">
            {g.isMyTurn
              ? g.game?.phase === "draw"
                ? "YOUR TURN — DRAW"
                : "YOUR TURN — PLAY / DISCARD"
              : "OPPONENT'S TURN"}
          </div>

          {g.isMyTurn && g.game?.phase === "draw" && (
            <div className="turn-warning">
              ⚠ Draw a card first — you can't bahay or discard yet.
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
            onBahay={g.createBahay}
            onDiscard={g.discardSelected}
            onClearSelection={() => g.setSelectedCards([])}
            starterName={g.starterName}
            hasStarter={!!(g.game && g.game.starter)}
          />

        </DndContext>

        <p className="message">
          {g.message}
        </p>
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
