import { useState } from "react"
import { database } from "./firebase"
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

  try {
    await set(ref(database, "rooms/" + code), {
      player1: "waiting",
      player2: "waiting"
    })

    setRoomCode(code)
    setMessage("Room created!")

    console.log("Room created:", code)
  } catch (error) {
    console.error("Firebase error:", error)
    setMessage("Error: " + error.message)
  }
}

  async function joinRoom() {
    const code = inputCode.toUpperCase()

    const snapshot = await get(ref(database, "rooms/" + code))

    if (snapshot.exists()) {
      await set(ref(database, "rooms/" + code + "/player2"), "joined")
      setRoomCode(code)
      setMessage("Joined room!")
    } else {
      setMessage("Room does not exist")
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