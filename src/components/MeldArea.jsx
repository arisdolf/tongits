import { useState } from "react"
import PlayingCard from "./PlayingCard"
import { canAddToMeld, sortMeldCards } from "../utils/cardUtils"
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

  const [expandedId, setExpandedId] = useState(null)

  const selected = selectedCards.length === 1 ? selectedCards[0] : null

  const canUseSelected =
    isMyTurn &&
    phase === "discard" &&
    !!selected &&
    (!mustMeld || selected === mustMeld)

  return (
    <div className="meld-area">

      <div className="meld-title">MELDS</div>

      <div className="meld-list">

        {meldList.length === 0 ? (

          <div className="empty-meld">No melds yet</div>

        ) : (

          meldList.map(meld => {

            const canAdd = canUseSelected && canAddToMeld(meld, selected)
            const expanded = expandedId === meld.id
            const mine = meld.owner === currentUserId

            function handleTap() {
              if (canAdd) {
                onAddToMeld(meld.id)
                return
              }
              setExpandedId(expanded ? null : meld.id)
            }

            return (

              <div
                key={meld.id}
                role="button"
                tabIndex={0}
                onClick={handleTap}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") handleTap()
                }}
                className={
                  "meld " +
                  (mine ? "my-meld " : "opponent-meld ") +
                  (expanded ? "meld-expanded " : "") +
                  (canAdd ? "can-add" : "")
                }
              >

                <div className="meld-header">
                  {mine ? "YOU" : "OPP"} · {meld.cards.length}
                </div>

                <div className="meld-cards">
                  {sortMeldCards(meld.cards).map(card => (
                    <div className="meld-card" key={card}>
                      <PlayingCard card={card} size="small" />
                    </div>
                  ))}
                </div>

                {canAdd && <span className="meld-add-badge">+ ADD</span>}

              </div>

            )

          })

        )}

      </div>

    </div>
  )
}

export default MeldArea