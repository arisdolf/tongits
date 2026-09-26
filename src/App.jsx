import { useState, useEffect } from "react"
import { database, auth } from "./firebase"
import {
  ref,
  set,
  get,
  onValue,
  update
} from "firebase/database"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"

import "./index.css"


function SortableCard({
  card,
  index,
  selected,
  onSelect
}) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : selected ? 10 : 1
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        "card my-card " +
        (selected ? "selected-card " : "") +
        (isDragging ? "dragging-card " : "") +
        (index === 0 ? "first-card" : "")
      }
      onClick={() => onSelect(card)}
    >
      {card}
    </button>
  )
}


function App() {

  const [roomCode, setRoomCode] = useState("")
  const [inputCode, setInputCode] = useState("")
  const [message, setMessage] = useState("")

  const [room, setRoom] = useState(null)
  const [game, setGame] = useState(null)

  const [myHand, setMyHand] = useState([])
  const [selectedCards, setSelectedCards] = useState([])

  const [opponentCount, setOpponentCount] = useState(0)

  const [drawing, setDrawing] = useState(false)

  const user = auth.currentUser


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),

    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5
      }
    })
  )


  /*
   * ROOM LISTENER
   */

  useEffect(() => {

    if (!roomCode) return

    const roomRef = ref(
      database,
      "rooms/" + roomCode
    )

    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {

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

      }
    )

    return () => unsubscribe()

  }, [roomCode])


  /*
   * MY PRIVATE HAND
   */

  useEffect(() => {

    if (!roomCode || !user) return

    const handRef = ref(
      database,
      "rooms/" +
      roomCode +
      "/hands/" +
      user.uid
    )

    const unsubscribe = onValue(
      handRef,
      (snapshot) => {

        const hand = snapshot.val()

        if (Array.isArray(hand)) {
          setMyHand(hand)
        }

      }
    )

    return () => unsubscribe()

  }, [roomCode, user])


  /*
   * OPPONENT HAND COUNT
   */

  const opponentUid =
    room && user
      ? room.player1 === user.uid
        ? room.player2
        : room.player1
      : null


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

        if (Array.isArray(hand)) {
          setOpponentCount(hand.length)
        } else {
          setOpponentCount(0)
        }

      }
    )

    return () => unsubscribe()

  }, [roomCode, opponentUid])


  /*
   * CREATE ROOM
   */

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

      await set(
        ref(database, "rooms/" + code),
        {
          player1: currentUser.uid,
          player2: null
        }
      )

      setRoomCode(code)
      setMessage("Room created!")

    } catch (error) {

      setMessage(error.message)

    }

  }


  /*
   * JOIN ROOM
   */

  async function joinRoom() {

    const code = inputCode.toUpperCase()

    const currentUser = auth.currentUser

    if (!currentUser) {
      setMessage("Player is not connected")
      return
    }

    if (!code) {
      setMessage("Enter a room code")
      return
    }

    try {

      const roomRef = ref(
        database,
        "rooms/" + code
      )

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
        ref(
          database,
          "rooms/" +
          code +
          "/player2"
        ),
        currentUser.uid
      )

      setRoomCode(code)
      setMessage("Joined room!")

      /*
       * PLAYER 2 STARTS THE GAME
       */

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


  /*
   * START GAME
   */

  async function startGame(
    code,
    player1,
    player2
  ) {

    const deck = createDeck()

    shuffleDeck(deck)


    /*
     * RANDOM STARTER
     */

    const starter =
      Math.random() < 0.5
        ? player1
        : player2


    /*
     * STARTER GETS 13
     * OTHER PLAYER GETS 12
     */

    let player1Hand
    let player2Hand

    if (starter === player1) {

      player1Hand =
        deck.splice(0, 13)

      player2Hand =
        deck.splice(0, 12)

    } else {

      player2Hand =
        deck.splice(0, 13)

      player1Hand =
        deck.splice(0, 12)

    }


    const firstDiscard = deck.pop()


    const gameData = {

      deck,

      discard: [
        firstDiscard
      ],

      starter,

      currentTurn: starter,

      started: true,

      status: "playing",

      /*
       * Used later when the round ends
       */

      nextStarter: null

    }


    await set(
      ref(
        database,
        "rooms/" +
        code +
        "/game"
      ),
      gameData
    )


    await set(
      ref(
        database,
        "rooms/" +
        code +
        "/hands/" +
        player1
      ),
      player1Hand
    )


    await set(
      ref(
        database,
        "rooms/" +
        code +
        "/hands/" +
        player2
      ),
      player2Hand
    )

  }


  /*
   * CREATE DECK
   */

  function createDeck() {

    const suits = [
      "♠",
      "♥",
      "♦",
      "♣"
    ]

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

        deck.push(
          value + suit
        )

      }

    }

    return deck

  }


  /*
   * SHUFFLE
   */

  function shuffleDeck(deck) {

    for (
      let i = deck.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        )

      const temp =
        deck[i]

      deck[i] =
        deck[j]

      deck[j] =
        temp

    }

  }


  /*
   * DRAW
   */

  async function drawCard() {

    if (!game || !user) return

    if (
      game.currentTurn !==
      user.uid
    ) {

      setMessage(
        "It's not your turn"
      )

      return

    }


    if (
      !game.deck ||
      game.deck.length === 0
    ) {

      setMessage(
        "The deck is empty"
      )

      return

    }


    setDrawing(true)


    const card =
      game.deck[0]

    const newDeck =
      game.deck.slice(1)

    const newHand = [
      ...myHand,
      card
    ]


    await update(
      ref(
        database,
        "rooms/" +
        roomCode
      ),
      {
        "game/deck": newDeck,

        ["hands/" + user.uid]:
          newHand
      }
    )


    setMessage(
      "Card drawn!"
    )


    setTimeout(() => {
      setDrawing(false)
    }, 500)

  }


  /*
   * SELECT CARD
   */

  function toggleCard(card) {

    if (!game || !user) return

    if (
      game.currentTurn !==
      user.uid
    ) {

      return

    }


    setSelectedCards(
      previous => {

        if (
          previous.includes(card)
        ) {

          return previous.filter(
            item =>
              item !== card
          )

        }

        return [
          ...previous,
          card
        ]

      }
    )

  }


  /*
   * DISCARD
   *
   * For now, one selected card
   */

  async function discardSelected() {

    if (!game || !user) return

    if (
      game.currentTurn !==
      user.uid
    ) {

      setMessage(
        "It's not your turn"
      )

      return

    }


    if (
      selectedCards.length !== 1
    ) {

      setMessage(
        "Select one card to discard"
      )

      return

    }


    const card =
      selectedCards[0]


    const newHand =
      myHand.filter(
        item =>
          item !== card
      )


    const newDiscard = [
      ...(game.discard || []),
      card
    ]


    const nextPlayer =
      user.uid === room.player1
        ? room.player2
        : room.player1


    await update(
      ref(
        database,
        "rooms/" +
        roomCode
      ),
      {

        ["hands/" + user.uid]:
          newHand,

        "game/discard":
          newDiscard,

        "game/currentTurn":
          nextPlayer

      }
    )


    setSelectedCards([])

    setMessage(
      "Card discarded"
    )

  }


  /*
   * DRAG REORDER
   */

  async function handleDragEnd(event) {

    const {
      active,
      over
    } = event


    if (!over) return

    if (
      active.id ===
      over.id
    ) {

      return

    }


    const oldIndex =
      myHand.indexOf(
        active.id
      )

    const newIndex =
      myHand.indexOf(
        over.id
      )


    if (
      oldIndex === -1 ||
      newIndex === -1
    ) {

      return

    }


    const reordered =
      arrayMove(
        myHand,
        oldIndex,
        newIndex
      )


    setMyHand(reordered)


    await set(
      ref(
        database,
        "rooms/" +
        roomCode +
        "/hands/" +
        user.uid
      ),
      reordered
    )

  }


  const isMyTurn =
    game &&
    user &&
    game.currentTurn ===
    user.uid


  const starterName =
    game &&
    room
      ? game.starter ===
        room.player1
        ? "Player 1"
        : "Player 2"
      : ""


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

            <button
              onClick={createRoom}
            >
              Create Room
            </button>

          </div>


          <div className="join-area">

            <input
              value={inputCode}
              onChange={(e) =>
                setInputCode(
                  e.target.value
                    .toUpperCase()
                )
              }
              placeholder="ENTER ROOM CODE"
              maxLength="6"
            />

            <button
              onClick={joinRoom}
            >
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

            <strong>
              TONGITS
            </strong>

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
              }).map(
                (_, index) => (

                  <div
                    className="card opponent-card"
                    key={index}
                  >
                    ?
                  </div>

                )
              )}

            </div>

            <div className="opponent-count">
              {opponentCount} cards
            </div>

          </div>


          <div className="middle">


            <div className="pile-container">

              <div className="pile-label">
                DECK
              </div>

              <button
                className={
                  "deck " +
                  (drawing
                    ? "deck-drawing"
                    : "")
                }
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
                game.discard &&
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


            <DndContext
              sensors={sensors}
              collisionDetection={
                closestCenter
              }
              onDragEnd={
                handleDragEnd
              }
            >

              <SortableContext
                items={myHand}
                strategy={
                  horizontalListSortingStrategy
                }
              >

                <div className="cards my-hand">

                  {myHand.map(
                    (card, index) => (

                      <SortableCard
                        key={card}
                        card={card}
                        index={index}
                        selected={
                          selectedCards.includes(
                            card
                          )
                        }
                        onSelect={
                          toggleCard
                        }
                      />

                    )
                  )}

                </div>

              </SortableContext>

            </DndContext>


            <div className="hand-actions">

              <button
                onClick={
                  discardSelected
                }
                disabled={
                  !isMyTurn ||
                  selectedCards.length !== 1
                }
              >
                DISCARD
              </button>


              <button
                onClick={() =>
                  setSelectedCards([])
                }
                disabled={
                  selectedCards.length === 0
                }
              >
                CLEAR
              </button>

            </div>


            <p className="card-help">

              {isMyTurn
                ? "Drag cards to reorder them. Tap cards to select them."
                : "Wait for your turn"}

            </p>


            {game && game.starter && (

              <p className="starter-info">

                {starterName} started with 13 cards

              </p>

            )}

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