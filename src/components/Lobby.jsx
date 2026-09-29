/*
 * LOBBY
 * The create-room / join-room screen, shown before
 * a roomCode exists.
 */
import "../styles/Lobby.css"
function Lobby({
  inputCode,
  setInputCode,
  message,
  onCreateRoom,
  onJoinRoom
}) {

  return (
    <div className="lobby">

      <h1 className="title">
        TONGITS
      </h1>

      <p className="subtitle">
        Play Tongits with someone anywhere
      </p>

      <div className="room-buttons">
        <button onClick={onCreateRoom}>
          Create Room
        </button>
      </div>

      <div className="join-area">

        <input
          value={inputCode}
          onChange={e =>
            setInputCode(e.target.value.toUpperCase())
          }
          placeholder="ENTER ROOM CODE"
          maxLength="6"
        />

        <button onClick={onJoinRoom}>
          Join Room
        </button>

      </div>

      <p className="message">
        {message}
      </p>

    </div>
  )
}

export default Lobby
