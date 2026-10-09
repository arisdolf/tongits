import "../styles/CardBack.css"

function CardBack({ className = "" }) {
  return (
    <div
      className={"card-back " + className}
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}cards/backcards/back.png)`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    />
  )
}

export default CardBack