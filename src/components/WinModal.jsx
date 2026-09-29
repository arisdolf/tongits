import "../styles/Modal.css"
import "../styles/WinModal.css"

function WinModal({ game, room, currentUserId, onRematch }) {

  if (!game || game.status !== "finished") {
    return null
  }

  const isTie = game.winner === "tie"
  const iWon = game.winner === currentUserId

  const title = isTie
    ? "IT'S A TIE!"
    : iWon
      ? "🎉 YOU WIN! 🎉"
      : "OPPONENT WINS"

  const reason =
    game.winReason === "emptyHand"
      ? (iWon ? "You emptied your hand first!" : "Opponent emptied their hand first.")
      : isTie
        ? "Equal card values when the deck ran out."
        : "Lowest card total when the deck ran out."

  return (
    <div className="modal-overlay">

      <div className="modal-panel win-panel">

        <div className="win-title">
          {title}
        </div>

        <p className="win-reason">
          {reason}
        </p>

        <button className="rematch-button" onClick={onRematch}>
          REMATCH
        </button>

      </div>

    </div>
  )
}

export default WinModal