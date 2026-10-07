import { useState } from "react"
import {
  getCardRank,
  getCardSuit,
  isRedSuit,
  getCardImagePaths
} from "../utils/cardUtils"
import "../styles/PlayingCard.css"

function CardFace({ card, size }) {
  const [pathIndex, setPathIndex] = useState(0)

  const paths = getCardImagePaths(card)
  const rank = getCardRank(card)
  const suit = getCardSuit(card)
  const sizeClass = size ? " " + size : ""

  // try each possible image filename until one loads
  if (pathIndex < paths.length) {
    return (
      <div className={"playing-card photo-card" + sizeClass}>
        <img
          src={import.meta.env.BASE_URL + paths[pathIndex]}
          alt={card}
          draggable={false}
          onError={() => setPathIndex(i => i + 1)}
        />
      </div>
    )
  }

  // fallback: plain text card
  return (
    <div
      className={
        "playing-card " +
        (isRedSuit(suit) ? "red-suit" : "black-suit") +
        sizeClass
      }
    >
      <div className="pc-corner">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </div>

      <span className="pc-center-suit">{suit}</span>

      <div className="pc-corner pc-corner-bottom">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </div>
    </div>
  )
}

// key={card} resets the image-fallback state when the card changes
function PlayingCard({ card, size = "" }) {
  return <CardFace key={card} card={card} size={size} />
}

export default PlayingCard