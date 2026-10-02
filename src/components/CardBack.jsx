import "../styles/CardBack.css"

function CardBack({ className = "" }) {
  return (
    <div
      className={"card-back " + className}
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}cards/backcards/back.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="card-back-frame">
        <div className="card-back-emblem">T</div>
      </div>
    </div>
  )
}

export default CardBack