import { getCardRank, getCardSuit, isRedSuit } from "../utils/cardUtils"
import "../styles/PlayingCard.css"
/*
 * PLAYING CARD FACE
 * Real card look: corner rank+suit (top-left, mirrored bottom-right)
 * plus a big center suit glyph. Color follows the suit, not the owner.
 */

function PlayingCard({ card, size = "normal" }) {

  const rank = getCardRank(card)
  const suit = getCardSuit(card)
  const red = isRedSuit(suit)

  return (
    <div
      className={
        "playing-card " +
        size +
        " " +
        (red ? "red-suit" : "black-suit")
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
