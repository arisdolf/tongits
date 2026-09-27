import PlayingCard from "./PlayingCard"
import { canAddToBahay } from "../utils/cardUtils"

function BahayArea({
  bahayList,
  isMyTurn,
  phase,
  selectedCards,
  currentUserId,
  onAddToBahay
}) {

  return (
    <div className="bahay-area">

      <div className="bahay-title">
        BAHAY
      </div>

      <div className="bahay-list">

        {bahayList.length === 0 ? (

          <div className="empty-bahay">
            No bahay yet
          </div>

        ) : (

          bahayList.map(bahay => {

            const canAdd =
              isMyTurn &&
              phase === "discard" &&
              selectedCards.length === 1 &&
              canAddToBahay(bahay, selectedCards[0])

            return (

              <div
                className={
                  "bahay " +
                  (bahay.owner === currentUserId
                    ? "my-bahay"
                    : "opponent-bahay")
                }
                key={bahay.id}
              >

                <div className="bahay-header">
                  <span>
                    {bahay.owner === currentUserId
                      ? "YOUR BAHAY"
                      : "OPPONENT BAHAY"}
                  </span>
                </div>

                <div className="bahay-cards">
                  {bahay.cards.map((card, i) => (
                    <div className="bahay-card" key={card + i}>
                      <PlayingCard card={card} size="small" />
                    </div>
                  ))}
                </div>

                {isMyTurn && (
                  <button
                    className={
                      "layoff-button " + (canAdd ? "can-add" : "")
                    }
                    onClick={() => onAddToBahay(bahay.id)}
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

export default BahayArea
