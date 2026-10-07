import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import PlayingCard from "./PlayingCard"
import { canAddToMeld, sortMeldCards } from "../utils/cardUtils"
import "../styles/MeldArea.css"

function MeldItem({ meld, mine, expanded, canAdd, onTap }) {
  const { setNodeRef, isOver } = useDroppable({ id: "meld:" + meld.id })

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") onTap()
      }}
      className={
        "meld " +
        (mine ? "my-meld " : "opponent-meld ") +
        (expanded ? "meld-expanded " : "") +
        (isOver ? "meld-drop-over " : "") +
        (canAdd ? "can-add" : "")
      }
      data-meld-id={meld.id}
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
}

function MeldArea({
  meldList, isMyTurn, phase, selectedCards,
  currentUserId, mustMeld, onAddToMeld
}) {
  const [expandedId, setExpandedId] = useState(null)
  const { setNodeRef, isOver } = useDroppable({ id: "new-meld" })

  const selected = selectedCards.length === 1 ? selectedCards[0] : null

  const canUseSelected =
    isMyTurn &&
    phase === "discard" &&
    !!selected &&
    (!mustMeld || selected === mustMeld)

  return (
    <div ref={setNodeRef} className={"meld-area " + (isOver ? "meld-area-over" : "")}>
      <div className="meld-title">MELDS</div>

      <div className="meld-list">
        {meldList.length === 0 ? (
          <div className="empty-meld">No melds yet — drop cards here</div>
        ) : (
          meldList.map(meld => {
            const canAdd = canUseSelected && canAddToMeld(meld, selected)
            const expanded = expandedId === meld.id

            return (
              <MeldItem
                key={meld.id}
                meld={meld}
                mine={meld.owner === currentUserId}
                expanded={expanded}
                canAdd={canAdd}
                onTap={() => {
                  if (canAdd) onAddToMeld(meld.id)
                  else setExpandedId(expanded ? null : meld.id)
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export default MeldArea