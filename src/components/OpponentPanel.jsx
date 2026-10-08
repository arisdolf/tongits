import CardBack from "./CardBack"
import "../styles/Cards.css"
import "../styles/OpponentPanel.css"

function OpponentPanel({ opponentCount, name = "Opponent" }) {

  return (
    <div className="player opponent">

      <div className="player-name">{name}</div>

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
