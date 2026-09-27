import CardBack from "./CardBack"

function OpponentPanel({ opponentCount }) {

  return (
    <div className="player opponent">

      <div className="player-name">
        Opponent
      </div>

      <div className="cards">

        {Array.from({ length: opponentCount }).map((_, index) => (
          <div className="card" key={index}>
            <CardBack />
          </div>
        ))}

      </div>

      <div className="opponent-count">
        {opponentCount} cards
      </div>

    </div>
  )
}

export default OpponentPanel
