/*
 * CARD BACK
 * Shared back design for the deck and the opponent's hand.
 */

function CardBack({ className = "" }) {
  return (
    <div className={"card-back " + className}>
      <div className="card-back-frame">
        <div className="card-back-emblem">T</div>
      </div>
    </div>
  )
}

export default CardBack
