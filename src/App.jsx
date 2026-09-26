import { useState } from "react"
import { database, auth } from "./firebase"
import { ref, set, get } from "firebase/database"

function App() {
  const [roomCode, setRoomCode] = useState("")
  const [inputCode, setInputCode] = useState("")
  const [message, setMessage] = useState("")

  async function createRoom() {
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()

    const user = auth.currentUser

    if (!user) {
      setMessage("Player is not connected")
      return
    }

    try {
      await set(ref(database, "rooms/" + code), {
        player1: user.uid,
        player2: null
      })

      setRoomCode(code)
      setMessage("Room created!")
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function joinRoom() {
    const code = inputCode.toUpperCase()
    const user = auth.currentUser

    if (!user) {
      setMessage("Player is not connected")
      return
    }

    try {
      const roomRef = ref(database, "rooms/" + code)
      const snapshot = await get(roomRef)

      if (!snapshot.exists()) {
        setMessage("Room does not exist")
        return
      }

      const room = snapshot.val()

      if (room.player2) {
        setMessage("Room is full")
        return
      }

      await set(ref(database, "rooms/" + code + "/player2"), user.uid)

      setRoomCode(code)
      setMessage("Joined room!")
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div>
      <h1>Tongits</h1>

      <button onClick={createRoom}>
        Create Room
      </button>

      {roomCode && (
        <h2>Room Code: {roomCode}</h2>
      )}

      <hr />

      <input
        value={inputCode}
        onChange={(e) => setInputCode(e.target.value)}
        placeholder="Enter room code"
      />

      <button onClick={joinRoom}>
        Join Room
      </button>

      <p>{message}</p>
    </div>
  )
}

export default App