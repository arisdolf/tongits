import { useState, useEffect } from "react"
import { database, auth } from "./firebase"
import {
  ref,
  set,
  get,
  onValue,
  update,
  transaction
} from "firebase/database"
import "./App.css"

function App() {
  const [roomCode, setRoomCode] = useState("")
  const [inputCode, setInputCode] = useState("")
  const [message, setMessage] = useState("")
  const [room, setRoom] = useState(null)
  const [game, setGame] = useState(null)
  const [myHand, setMyHand] = useState([])

  const user = auth.currentUser

  useEffect(() => {
    if (!roomCode) return

    const roomRef = ref(database, "rooms/" + roomCode)

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val()

      if (!data) return

      setRoom(data)

      if (data.game) {
        setGame(data.game)
      }

      if (data.player2) {
        setMessage("Player 2 joined!")
      } else {
        setMessage("Waiting for Player 2...")
      }
    })

    return () => unsubscribe()
  }, [roomCode])

  useEffect(() => {
    if (!roomCode || !user) return

    const handRef = ref(
      database,
      "rooms/" + roomCode + "/hands/" + user.uid
    )

    const unsubscribe = onValue(handRef, (snapshot) => {
      const hand = snapshot.val()

      if (hand) {
        setMyHand(hand)
      }
    })

    return () => unsubscribe()
  }, [roomCode, user])

  async function createRoom() {
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()

    const currentUser = auth.currentUser

    if (!currentUser) {
      setMessage("Player is not connected")
      return
    }

    try {
      await set(ref(database, "rooms/" + code), {
        player1: currentUser.uid,
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
    const currentUser = auth.currentUser

    if (!currentUser) {
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

      const roomData = snapshot.val()

      if (roomData.player2) {
        setMessage("Room is full")
        return
      }

      await set(
        ref(database, "rooms/" + code + "/player2"),
        currentUser.uid
      )

      setRoomCode(code)
      setMessage("Joined room!")

      if (!roomData.game) {
        await startGame(
          code,
          roomData.player1,
          currentUser.uid
        )
      }
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function startGame(code, player1, player2) {
    const deck = createDeck()

    shuffleDeck(deck)

    const player1Hand = deck.splice(0, 7)
    const player2Hand = deck.splice(0, 7)

    const discard = deck.pop()

    const gameData = {
      deck: deck,
      discard: [discard],
      currentTurn: player1,
      started: true
    }

    await set(
      ref(database, "rooms/" + code + "/game"),
      gameData
    )

    await set(
      ref(database, "rooms/" + code + "/hands/" + player1),
      player1Hand
    )

    await set(
      ref(database, "rooms/" + code + "/hands/" + player2),
      player2Hand
    )
  }

  function createDeck() {
    const suits = ["♠", "♥", "♦", "♣"]

    const values = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K"
    ]

    const deck = []

    for (const suit of suits) {
      for (const value of values) {
        deck.push(value + suit)
      }
    }

    return deck
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))

      const temp = deck[i]

      deck[i] = deck[j]
      deck[j] = temp
    }
  }

  async function drawCard() {
    if (!game || !user) return

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (game.deck.length === 0) {
      setMessage("The deck is empty")
      return
    }

    const card = game.deck[0]

    const newDeck = game.deck.slice(1)

    const newHand = [...myHand, card]

    await update(
      ref(database, "rooms/" + roomCode),
      {
        "game/deck": newDeck,
        ["hands/" + user.uid]: newHand
      }
    )

    setMessage("Card drawn!")
  }

  async function discardCard(cardIndex) {
    if (!game || !user) return

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (myHand.length <= 0) return

    const card = myHand[cardIndex]

    const newHand = myHand.filter(
      (_, index) => index !== cardIndex
    )

    const newDiscard = [
      ...game.discard,
      card
    ]

    const nextPlayer =
      user.uid === room.player1
        ? room.player2
        : room.player1

    await update(
      ref(database, "rooms/" + roomCode),
      {
        ["hands/" + user.uid]: newHand,
        "game/discard": newDiscard,
        "game/currentTurn": nextPlayer
      }
    )

    setMessage("Card discarded")
  }

  const isMyTurn =
    game &&
    user &&
    game.currentTurn === user.uid

  const opponentUid =
    room && user && room.player1 === user.uid
      ? room.player2
      : room?.player1

  const [opponentCount, setOpponentCount] = useState(0)

  useEffect(() => {
    if (!roomCode || !opponentUid) return

    const opponentHandRef = ref(
      database,
      "rooms/" +
        roomCode +
        "/hands/" +
        opponentUid
    )

    const unsubscribe = onValue(
      opponentHandRef,
      (snapshot) => {
        const hand = snapshot.val()

        if (hand) {
          setOpponentCount(hand.length)
        }
      }
    )

    return () => unsubscribe()
  }, [roomCode, opponentUid])

  return (
    <div className="game">

      {!roomCode ? (

        <div className="lobby">

          <h1 className="title">
            TONGITS
          </h1>

          <p className="subtitle">
            Play Tongits with someone anywhere
          </p>

          <div className="room-buttons">
            <button onClick={createRoom}>
              Create Room
            </button>
          </div>

          <div className="join-area">

            <input
              value={inputCode}
              onChange={(e) =>
                setInputCode(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="ENTER ROOM CODE"
              maxLength="6"
            />

            <button onClick={joinRoom}>
              Join Room
            </button>

          </div>

          <p className="message">
            {message}
          </p>

        </div>

      ) : (

        <div className="table">

          <div className="top-bar">
            <strong>TONGITS</strong>

            <span>
              ROOM {roomCode}
            </span>
          </div>

          <div className="player opponent">

            <div className="player-name">
              Opponent
            </div>

            <div className="cards">

              {Array.from({
                length: opponentCount
              }).map((_, index) => (

                <div
                  className="card opponent-card deal-animation"
                  key={index}
                  style={{
                    animationDelay:
                      `${index * 0.08}s`
                  }}
                >
                  ?
                </div>

              ))}

            </div>

          </div>

          <div className="middle">

            <div className="pile-container">

              <div className="pile-label">
                DECK
              </div>

              <button
                className="deck"
                onClick={drawCard}
                disabled={!isMyTurn}
              >
                {game
                  ? game.deck.length
                  : 0}
              </button>

            </div>

            <div className="pile-container">

              <div className="pile-label">
                DISCARD
              </div>

              <div className="discard">

                {game &&
                game.discard.length > 0
                  ? game.discard[
                      game.discard.length - 1
                    ]
                  : "—"}

              </div>

            </div>

          </div>

          <div className="turn-message">
            {isMyTurn
              ? "YOUR TURN"
              : "OPPONENT'S TURN"}
          </div>

          <div className="player">

            <div className="player-name">
              You
            </div>

            <div className="cards my-hand">

              {myHand.map((card, index) => (

                <button
                  className="card my-card deal-animation"
                  key={card}
                  onClick={() =>
                    discardCard(index)
                  }
                  style={{
                    animationDelay:
                      `${index * 0.08}s`
                  }}
                >
                  {card}
                </button>

              ))}

            </div>

            <p className="card-help">
              {isMyTurn
                ? "Draw a card, then tap a card to discard"
                : "Wait for your turn"}
            </p>

          </div>

          <p className="message">
            {message}
          </p>

        </div>

      )}

    </div>
  )
}

export default App