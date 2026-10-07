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
  onViewAll,
  canTakeDiscard,
  onTakeDiscard
}) {

  return (
    <div className="middle">

      <div className="pile-container">
        <div className="pile-label">DECK</div>

        <button
          className={"deck " + (drawing ? "deck-drawing" : "")}
          onClick={onDraw}
          disabled={!canDraw}
          data-fly="deck"
        >
          <CardBack className="deck-back" />
          <span className="deck-count">{deckCount}</span>
        </button>
      </div>

      <div className="pile-container">
        <div className="pile-label">DISCARD</div>

        <DiscardDropZone
          canTake={canTakeDiscard}
          onTap={onTakeDiscard}
          onHold={() => {
            if (discardPile.length > 0) onViewAll()
          }}
        >
          {discardPile.length > 0 ? (
            <div key={discardPile.length} className="discard-card-enter">
              <PlayingCard
                card={discardPile[discardPile.length - 1]}
                size="small"
              />
            </div>
          ) : (
            <span className="discard-empty">—</span>
          )}
        </DiscardDropZone>
      </div>

    </div>
  )
}

export default DeckAndDiscard