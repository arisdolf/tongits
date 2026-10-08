import { Fragment } from "react"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import SortableCard from "./SortableCard"
import "../styles/Cards.css"
import "../styles/PlayerHand.css"
import "../styles/SortDropdown.css"

function PlayerHand({
  myHand, selectedCards, newlyDrawnCard, onSelectCard,
  sortMenuOpen, setSortMenuOpen, onSortBySuit, onSortByRank,
  isMyTurn, phase, onMeld, onDiscard, onClearSelection,
  starterName, hasStarter,
  groups = [], onGroup, onUngroup
}) {

  const groupOf = {}
  groups.forEach((g, gi) =>
    g.forEach((c, ci) => { groupOf[c] = { gi, start: ci === 0 } })
  )
  const firstGroupedIndex = myHand.findIndex(c => groupOf[c])

  return (
    <div className="player player-mine">

      {sortMenuOpen && (
        <div className="dropdown-backdrop" onClick={() => setSortMenuOpen(false)} />
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
            <button className="sort-menu-item"
              onClick={() => { onSortBySuit(); setSortMenuOpen(false) }}>
              By Suit
            </button>
            <button className="sort-menu-item"
              onClick={() => { onSortByRank(); setSortMenuOpen(false) }}>
              High → Low
            </button>
          </div>
        )}
      </div>

      <div className="player-name">You</div>

      <SortableContext items={myHand} strategy={rectSortingStrategy}>
        <div className="cards my-hand">
          {myHand.map((card, index) => (
            <Fragment key={card}>
              {index === firstGroupedIndex && index > 0 && <div className="hand-break" />}
              <SortableCard
                id={card}
                card={card}
                index={index}
                selected={selectedCards.includes(card)}
                isNew={card === newlyDrawnCard}
                onSelect={onSelectCard}
                groupIndex={groupOf[card]?.gi ?? -1}
                groupStart={!!groupOf[card]?.start}
              />
            </Fragment>
          ))}
        </div>
      </SortableContext>

      <div className="hand-actions">
  <button onClick={onMeld}>MELD</button>
  <button onClick={onGroup} disabled={selectedCards.length < 2}>GROUP</button>
  <button onClick={onUngroup} disabled={groups.length === 0}>UNGROUP</button>
  <button onClick={onDiscard}>DISCARD</button>
  <button onClick={onClearSelection} disabled={selectedCards.length === 0}>CLEAR</button>
</div>

      {selectedCards.length > 0 && (
        <p className="selection-info">Selected: {selectedCards.join(" ")}</p>
      )}

      {hasStarter && (
        <p className="starter-info">{starterName} started with 13 cards</p>
      )}
    </div>
  )
}

export default PlayerHand