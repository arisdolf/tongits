import PlayingCard from "./PlayingCard"

function DiscardHistoryModal({ open, onClose, discardPile }) {

  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>

      <div
        className="modal-panel"
        onClick={e => e.stopPropagation()}
      >

        <div className="modal-header">

          <span>
            DISCARDED CARDS ({discardPile.length})
          </span>

          <button className="modal-close" onClick={onClose}>
            ✕
          </button>

        </div>

        <div className="modal-grid">

          {discardPile
            .slice()
            .reverse()
            .map((card, i) => (
              <div className="modal-card" key={card + i}>
                <PlayingCard card={card} size="small" />
              </div>
            ))}

        </div>

      </div>

    </div>
  )
}

export default DiscardHistoryModal
