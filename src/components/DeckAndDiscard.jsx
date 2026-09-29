import CardBack from "./CardBack"
import PlayingCard from "./PlayingCard"
import DiscardDropZone from "./DiscardDropZone"
import "../styles/DeckAndDiscard.css"
function DeckAndDiscard({
  deckCount,
  drawing,
  onDraw,
  canDraw,
  discardPile,
  onViewAll
}) {

  return (
    <div className="middle">

      <div className="pile-container">

        <div className="pile-label">
          DECK
        </div>

        <button
          className={"deck " + (drawing ? "deck-drawing" : "")}
          onClick={onDraw}
          disabled={!canDraw}
        >
          <CardBack className="deck-back" />
          <span className="deck-count">
            {deckCount}
          </span>
        </button>

      </div>

      <div className="pile-container">

        <div className="pile-label">
          DISCARD
        </div>

        <DiscardDropZone>

         {discardPile.length > 0 ? (
  <div key={discardPile.length} className="discard-card-enter">
    <PlayingCard
      card={discardPile[discardPile.length - 1]}
      size="small"
    />
  </div>
) : (
  <span className="discard-empty">
    —
  </span>
)}

        </DiscardDropZone>

        <button
          className="view-discards-button"
          onClick={onViewAll}
          disabled={discardPile.length === 0}
        >
          VIEW ALL
        </button>

      </div>

    </div>
  )
}

export default DeckAndDiscard
