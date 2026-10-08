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
    />
  )
}

export default CardBack