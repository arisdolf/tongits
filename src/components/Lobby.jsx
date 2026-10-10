/*
 * LOBBY
 * Name + create room + join room.
 * Login / sign up lives in the top-right (AuthMenu).
 */
import "../styles/Lobby.css"
import AuthMenu from "./AuthMenu"

function Lobby({
  user, username, setUsername, inputCode, setInputCode,
  message, onCreateRoom, onJoinRoom
}) {
  const loggedIn = !!user && !user.isAnonymous

  return (
    <div className="lobby-page">
      <AuthMenu firebaseUser={user} setUsername={setUsername} />

      <div className="lobby">
        <h1 className="title">TONGITS</h1>
        <p className="subtitle">Play Tongits with someone anywhere</p>

        <div className="name-area">
          {loggedIn ? (
            <p className="playing-as">Playing as <strong>{username || "..."}</strong></p>
          ) : (
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your name"
              maxLength={12}
            />
          )}
        </div>

        <div className="room-buttons">
          <button onClick={onCreateRoom}>Create Room</button>
        </div>

        <div className="join-area">
          <input
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            placeholder="ENTER ROOM CODE"
            maxLength="6"
          />
          <button onClick={onJoinRoom}>Join Room</button>
        </div>

        <p className="message">{message}</p>
      </div>
    </div>
  )
}

export default Lobby