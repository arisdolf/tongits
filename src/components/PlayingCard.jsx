import { useState } from "react"
import {
  getCardRank,
  getCardSuit,
  getCardImagePaths,
  isRedSuit
} from "../utils/cardUtils"
import "../styles/PlayingCard.css"

function PlayingCard({ card, size = "normal" }) {

  const [attempt, setAttempt] = useState({ card, index: 0 })

  const rank = getCardRank(card)
  const suit = getCardSuit(card)
  const red = isRedSuit(suit)

  const paths = getCardImagePaths(card)
  const index = attempt.card === card ? attempt.index : 0

  // Photo version
  if (index < paths.length) {
    return (
      <div className={"playing-card photo-card " + size}>
        <img
          src={import.meta.env.BASE_URL + paths[index]}
          alt={card}
          draggable={false}
          onError={() => setAttempt({ card, index: index + 1 })}
        />
      </div>
    )
  }

  // Fallback: text-based card
  return (
    <div
      className={
        "playing-card " + size + " " + (red ? "red-suit" : "black-suit")
      }
    >
      <span className="pc-corner pc-corner-top">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </span>

      <span className="pc-center-suit">{suit}</span>

      <span className="pc-corner pc-corner-bottom">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </span>
    </div>
  )
}

export default PlayingCard