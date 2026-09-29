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
  onBahay,
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
        <p style={{ color: "yellow" }}>
  MY HAND: {myHand.join(", ")}
</p>
      <SortableContext
        items={myHand}
        strategy={horizontalListSortingStrategy}
      >

        <div className="cards my-hand">

          {myHand.map((card, index) => (
            <SortableCard
              key={card}
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
          onClick={onBahay}
          disabled={
            !isMyTurn ||
            phase !== "discard" ||
            selectedCards.length < 3
          }
        >
          BAHAY
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
            ? "Draw one card, then create or add to a bahay, then discard."
            : "Select cards to create a bahay, add to a bahay, or discard one card."
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
