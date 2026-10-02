import {
  SortableContext,
  horizontalListSortingStrategy
} from "@dnd-kit/sortable"

import SortableCard from "./SortableCard"
import "../styles/Cards.css"
import "../styles/PlayerHand.css"
import "../styles/SortDropdown.css"
function PlayerHand({
  myHand,
  selectedCards,
  newlyDrawnCard,
  onSelectCard,
  sortMenuOpen,
  setSortMenuOpen,
  onSortBySuit,
  onSortByRank,
  isMyTurn,
  phase,
  onMeld,
  onDiscard,
  onClearSelection,
  starterName,
  hasStarter
}) {

  return (
    <div className="player player-mine">

      {sortMenuOpen && (
        <div
          className="dropdown-backdrop"
          onClick={() => setSortMenuOpen(false)}
        />
      )}

      <div className="sort-dropdown">

        <button
          className="sort-toggle"
          onClick={() => setSortMenuOpen(open => !open)}
          disabled={myHand.length === 0}
        >
          SORT ▾
        </button>

        {sortMenuOpen && (

          <div className="sort-menu">

            <button
              className="sort-menu-item"
              onClick={() => {
                onSortBySuit()
                setSortMenuOpen(false)
              }}
            >
              By Suit
            </button>

            <button
              className="sort-menu-item"
              onClick={() => {
                onSortByRank()
                setSortMenuOpen(false)
              }}
            >
              High → Low
            </button>

          </div>

        )}

      </div>

      <div className="player-name">
        You
      </div>
      
      <SortableContext
        items={myHand}
        strategy={horizontalListSortingStrategy}
      >

        <div className="cards my-hand">

          {myHand.map((card, index) => (
  <SortableCard
    key={card}
    id={card}
    card={card}
    index={index}
    selected={selectedCards.includes(card)}
    isNew={card === newlyDrawnCard}
    onSelect={onSelectCard}
  />
))}

        </div>

      </SortableContext>

            <div className="hand-actions">

        <button
          onClick={onMeld}
          disabled={
            !isMyTurn ||
            phase !== "discard" ||
            selectedCards.length < 3
          }
        >
          MELD
        </button>

        <button
          onClick={onDiscard}
          disabled={!isMyTurn || selectedCards.length !== 1}
        >
          DISCARD
        </button>

        <button
          onClick={onClearSelection}
          disabled={selectedCards.length === 0}
        >
          CLEAR
        </button>

      </div>

      <p className="card-help">
        {isMyTurn
          ? phase === "draw"
            ? "Draw a card or take the discard (if it makes a meld), then meld / add to a meld, then discard."
            : "Select cards to create a meld, add to a meld, or discard one card (a card that fits a meld can't be discarded)."
          : "Wait for your turn"}
      </p>

      {selectedCards.length > 0 && (
        <p className="selection-info">
          Selected: {selectedCards.join(" ")}
        </p>
      )}

      {hasStarter && (
        <p className="starter-info">
          {starterName} started with 13 cards
        </p>
      )}

    </div>
  )
}

export default PlayerHand
