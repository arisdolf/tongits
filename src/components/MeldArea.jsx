import PlayingCard from "./PlayingCard"
import { canAddToMeld } from "../utils/cardUtils"
import "../styles/MeldArea.css"

function MeldArea({
  meldList,
  isMyTurn,
  phase,
  selectedCards,
  currentUserId,
  mustMeld,
  onAddToMeld
}) {

  return (
    <div className="meld-area">

      <div className="meld-title">MELDS</div>

      <div className="meld-list">

        {meldList.length === 0 ? (

          <div className="empty-meld">No melds yet</div>

        ) : (

          meldList.map(meld => {

            const canAdd =
              isMyTurn &&
              phase === "discard" &&
              selectedCards.length === 1 &&
              (!mustMeld || selectedCards[0] === mustMeld) &&
              canAddToMeld(meld, selectedCards[0])

            return (

              <div
                className={
                  "meld " +
                  (meld.owner === currentUserId ? "my-meld" : "opponent-meld")
                }
                key={meld.id}
              >

                <div className="meld-header">
                  <span>
                    {meld.owner === currentUserId ? "YOUR MELD" : "OPPONENT MELD"}
                  </span>
                </div>

                <div className="meld-cards">
                  {meld.cards.map((card, i) => (
                    <div className="meld-card" key={card + i}>
                      <PlayingCard card={card} size="small" />
                    </div>
                  ))}
                </div>

                {isMyTurn && (
                  <button
                    className={"layoff-button " + (canAdd ? "can-add" : "")}
                    onClick={() => onAddToMeld(meld.id)}
                    disabled={!canAdd}
                  >
                    ADD CARD
                  </button>
                )}

              </div>

            )

          })

        )}

      </div>

    </div>
  )
}

export default MeldArea