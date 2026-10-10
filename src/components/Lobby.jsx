/*
 * LOBBY
 * The create-room / join-room screen, shown before
 * a roomCode exists.
 */
import "../styles/Lobby.css"
import AuthBox from "./AuthBox"

function Lobby({
   user, username, setUsername, inputCode, setInputCode,
  message, onCreateRoom, onJoinRoom
}) {
  const loggedIn = !!user && !user.isAnonymous
  return (
      <div className="lobby">
      <h1 className="title">TONGITS</h1>
      <p className="subtitle">Play Tongits with someone anywhere</p>

      <AuthBox firebaseUser={user} setUsername={setUsername} />

      {!loggedIn && (
        <div className="name-area">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="your name"
            maxLength={12}
          />
        </div>
      )}
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
