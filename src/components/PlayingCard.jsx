import { useState } from "react"
import {
  getCardRank,
  getCardSuit,
  getCardImagePath,
  isRedSuit
} from "../utils/cardUtils"
import "../styles/PlayingCard.css"

function PlayingCard({ card, size = "normal" }) {

  const [failedCard, setFailedCard] = useState(null)

  const rank = getCardRank(card)
  const suit = getCardSuit(card)
  const red = isRedSuit(suit)

    const src = import.meta.env.BASE_URL + getCardImagePath(card)

  // Photo version
  if (failedCard !== card) {
    return (
      <div className={"playing-card photo-card " + size}>
        <img
          src={src}
          alt={card}
          draggable={false}
          onError={() => setFailedCard(card)}
        />
      </div>
    )
  }

  // Fallback: the original text-based card
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