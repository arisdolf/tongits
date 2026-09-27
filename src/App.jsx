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


/*
 * CARD HELPERS
 */

function getCardRank(card) {
  return card.slice(0, -1)
}

function getCardSuitChar(card) {
  return card.slice(-1)
}

function isRedSuit(suit) {
  return suit === "♥" || suit === "♦"
}


/*
 * PLAYING CARD FACE
 * Real card look: corner rank+suit (top-left, mirrored bottom-right)
 * plus a big center suit glyph. Color follows the suit, not the owner.
 */

function PlayingCard({ card, size = "normal" }) {

  const rank = getCardRank(card)
  const suit = getCardSuitChar(card)
  const red = isRedSuit(suit)

  return (
    <div
      className={
        "playing-card " +
        size +
        " " +
        (red ? "red-suit" : "black-suit")
      }
    >
      <span className="pc-corner pc-corner-top">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </span>

      <span className="pc-center-suit">{suit}</span>

      <span className="pc-corner pc-corner-bottom">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </span>
    </div>
  )
}


/*
 * CARD BACK
 * Shared back design for the deck and the opponent's hand.
 */

function CardBack({ className = "" }) {
  return (
    <div className={"card-back " + className}>
      <div className="card-back-frame">
        <div className="card-back-emblem">T</div>
      </div>
    </div>
  )
}


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
    transition: isDragging ? "none" : transition,
    zIndex: isDragging
      ? 20
      : selected
        ? 10
        : 1
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        "card my-card " +
        (selected
          ? "selected-card "
          : "") +
        (isDragging
          ? "dragging-card "
          : "") +
        (index === 0
          ? "first-card"
          : "")
      }
      onClick={() =>
        onSelect(card)
      }
    >
      <PlayingCard card={card} />
    </button>
  )
}


function App() {

  const [roomCode, setRoomCode] =
    useState("")

  const [inputCode, setInputCode] =
    useState("")

  const [message, setMessage] =
    useState("")

  const [room, setRoom] =
    useState(null)

  const [game, setGame] =
    useState(null)

  const [myHand, setMyHand] =
    useState([])

  const [selectedCards, setSelectedCards] =
    useState([])

  const [opponentCount, setOpponentCount] =
    useState(0)

  const [drawing, setDrawing] =
    useState(false)

  const [showDiscardHistory, setShowDiscardHistory] =
    useState(false)

  const user =
    auth.currentUser


  const sensors = useSensors(

    useSensor(
      PointerSensor,
      {
        activationConstraint: {
          distance: 4
        }
      }
    ),

    // Distance-based (not delay-based) so a touch drag
    // starts the instant a finger moves, with no hold wait.
    useSensor(
      TouchSensor,
      {
        activationConstraint: {
          distance: 4
        }
      }
    )

  )


  /*
   * ROOM LISTENER
   */

  useEffect(() => {

    if (!roomCode) return

    const roomRef =
      ref(
        database,
        "rooms/" + roomCode
      )

    const unsubscribe =
      onValue(
        roomRef,
        snapshot => {

          const data =
            snapshot.val()

          if (!data) return

          setRoom(data)

          if (data.game) {

            setGame(
              data.game
            )

          }

          if (data.player2) {

            setMessage(
              "Player 2 joined!"
            )

          } else {

            setMessage(
              "Waiting for Player 2..."
            )

          }

        }
      )

    return () =>
      unsubscribe()

  }, [roomCode])


  /*
   * MY HAND
   */

  useEffect(() => {

    if (!roomCode || !user)
      return

    const handRef =
      ref(
        database,
        "rooms/" +
        roomCode +
        "/hands/" +
        user.uid
      )

    const unsubscribe =
      onValue(
        handRef,
        snapshot => {

          const hand =
            snapshot.val()

          if (Array.isArray(hand)) {

            setMyHand(hand)

          }

        }
      )

    return () =>
      unsubscribe()

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

    if (
      !roomCode ||
      !opponentUid
    ) return

    const opponentHandRef =
      ref(
        database,
        "rooms/" +
        roomCode +
        "/hands/" +
        opponentUid
      )

    const unsubscribe =
      onValue(
        opponentHandRef,
        snapshot => {

          const hand =
            snapshot.val()

          if (Array.isArray(hand)) {

            setOpponentCount(
              hand.length
            )

          } else {

            setOpponentCount(0)

          }

        }
      )

    return () =>
      unsubscribe()

  }, [
    roomCode,
    opponentUid
  ])


  /*
   * CREATE ROOM
   */

  async function createRoom() {

    const code =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()

    const currentUser =
      auth.currentUser

    if (!currentUser) {

      setMessage(
        "Player is not connected"
      )

      return

    }

    try {

      await set(
        ref(
          database,
          "rooms/" + code
        ),
        {
          player1:
            currentUser.uid,

          player2:
            null
        }
      )

      setRoomCode(code)

      setMessage(
        "Room created!"
      )

    } catch (error) {

      setMessage(
        error.message
      )

    }

  }


  /*
   * JOIN ROOM
   */

  async function joinRoom() {

    const code =
      inputCode.toUpperCase()

    const currentUser =
      auth.currentUser

    if (!currentUser) {

      setMessage(
        "Player is not connected"
      )

      return

    }

    if (!code) {

      setMessage(
        "Enter a room code"
      )

      return

    }

    try {

      const roomRef =
        ref(
          database,
          "rooms/" + code
        )

      const snapshot =
        await get(roomRef)

      if (!snapshot.exists()) {

        setMessage(
          "Room does not exist"
        )

        return

      }

      const roomData =
        snapshot.val()

      if (roomData.player2) {

        setMessage(
          "Room is full"
        )

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

      setMessage(
        "Joined room!"
      )

      if (!roomData.game) {

        await startGame(
          code,
          roomData.player1,
          currentUser.uid
        )

      }

    } catch (error) {

      setMessage(
        error.message
      )

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

    const deck =
      createDeck()

    shuffleDeck(deck)

    const starter =
      Math.random() < 0.5
        ? player1
        : player2

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

    const gameData = {

      deck: deck,

      discard: [],

      starter: starter,

      currentTurn: starter,

      phase: "discard",

      hasDrawn: false,

      status: "playing",

      nextStarter: null,

      bahay: []

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
   * CARD VALUE
   */

  function getCardValue(card) {

    const value =
      card.slice(
        0,
        -1
      )

    const values = {
      A: 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13
    }

    return values[value]

  }


  /*
   * CARD SUIT
   */

  function getCardSuit(card) {

    return card.slice(-1)

  }


  /*
   * CHECK VALID BAHAY
   *
   * Set:
   * 3+ cards with same value
   *
   * Straight:
   * 3+ consecutive cards
   * with same suit
   */

  function isValidBahay(cards) {

    if (cards.length < 3) {

      return false

    }

    const values =
      cards.map(
        getCardValue
      )

    const suits =
      cards.map(
        getCardSuit
      )

    const sameValue =
      values.every(
        value =>
          value === values[0]
      )

    if (sameValue) {

      return true

    }

    const sameSuit =
      suits.every(
        suit =>
          suit === suits[0]
      )

    if (!sameSuit) {

      return false

    }

    const sorted =
      [...values].sort(
        (a, b) => a - b
      )

    for (
      let i = 1;
      i < sorted.length;
      i++
    ) {

      if (
        sorted[i] !==
        sorted[i - 1] + 1
      ) {

        return false

      }

    }

    return true

  }


  /*
   * CREATE BAHAY
   */

  async function createBahay() {

    if (!game || !user)
      return

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
      game.phase !==
      "discard"
    ) {

      setMessage(
        "Draw a card first"
      )

      return

    }

    if (
      selectedCards.length < 3
    ) {

      setMessage(
        "Select at least 3 cards"
      )

      return

    }

    if (
      !isValidBahay(
        selectedCards
      )
    ) {

      setMessage(
        "Those cards do not form a valid bahay"
      )

      return

    }

    const newBahay = {

      id:
        Date.now().toString(),

      owner:
        user.uid,

      cards:
        [...selectedCards]

    }

    const newHand =
      myHand.filter(
        card =>
          !selectedCards.includes(
            card
          )
      )

    const currentBahay =
      game.bahay || []

    const updatedBahay = [
      ...currentBahay,
      newBahay
    ]

    await update(
      ref(
        database,
        "rooms/" +
        roomCode
      ),
      {

        ["hands/" + user.uid]:
          newHand,

        "game/bahay":
          updatedBahay

      }
    )

    setSelectedCards([])

    setMessage(
      "Bahay created!"
    )

  }


  /*
   * CHECK IF CARD CAN
   * BE ADDED TO BAHAY
   */

  function canAddToBahay(
    bahay,
    card
  ) {

    const newCards = [
      ...bahay.cards,
      card
    ]

    return isValidBahay(
      newCards
    )

  }


  /*
   * ADD CARD TO BAHAY
   */

  async function addToBahay(
    bahayId
  ) {

    if (!game || !user)
      return

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
      game.phase !==
      "discard"
    ) {

      setMessage(
        "Draw a card first"
      )

      return

    }

    if (
      selectedCards.length !== 1
    ) {

      setMessage(
        "Select one card to add"
      )

      return

    }

    const card =
      selectedCards[0]

    const bahay =
      (game.bahay || [])
        .find(
          item =>
            item.id ===
            bahayId
        )

    if (!bahay) {

      setMessage(
        "Bahay not found"
      )

      return

    }

    if (
      !canAddToBahay(
        bahay,
        card
      )
    ) {

      setMessage(
        "That card cannot be added to this bahay"
      )

      return

    }

    const updatedBahay =
      (game.bahay || [])
        .map(
          item => {

            if (
              item.id ===
              bahayId
            ) {

              return {

                ...item,

                cards: [
                  ...item.cards,
                  card
                ]

              }

            }

            return item

          }
        )

    const newHand =
      myHand.filter(
        item =>
          item !== card
      )

    await update(
      ref(
        database,
        "rooms/" +
        roomCode
      ),
      {

        ["hands/" + user.uid]:
          newHand,

        "game/bahay":
          updatedBahay

      }
    )

    setSelectedCards([])

    setMessage(
      "Card added to bahay!"
    )

  }


  /*
   * SELECT CARD
   */

  function toggleCard(card) {

    if (!game || !user)
      return

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
   */

  async function discardSelected() {

    if (!game || !user)
      return

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
      game.phase !==
      "discard"
    ) {

      setMessage(
        "You must draw a card first"
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
          nextPlayer,

        "game/phase":
          "draw",

        "game/hasDrawn":
          false

      }
    )

    setSelectedCards([])

    setMessage(
      "Card discarded"
    )

  }


  /*
   * DRAW
   */

  async function drawCard() {

    if (!game || !user)
      return

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
      game.phase !==
      "draw"
    ) {

      setMessage(
        "You cannot draw right now"
      )

      return

    }

    if (game.hasDrawn) {

      setMessage(
        "You already drew this turn"
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

        "game/deck":
          newDeck,

        "game/hasDrawn":
          true,

        "game/phase":
          "discard",

        ["hands/" + user.uid]:
          newHand

      }
    )

    setMessage(
      "Card drawn!"
    )

    setTimeout(
      () => {
        setDrawing(false)
      },
      500
    )

  }


  /*
   * DRAG REORDER
   */

  async function handleDragEnd(
    event
  ) {

    const {
      active,
      over
    } = event

    if (!over)
      return

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

    setMyHand(
      reordered
    )

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


  /*
   * SORT HAND (persists the new order to Firebase,
   * same as a manual drag reorder would)
   */

  async function applySortedHand(sorted) {

    setMyHand(sorted)

    if (roomCode && user) {

      await set(
        ref(
          database,
          "rooms/" +
          roomCode +
          "/hands/" +
          user.uid
        ),
        sorted
      )

    }

  }

  const suitOrder = {
    "♠": 0,
    "♥": 1,
    "♦": 2,
    "♣": 3
  }

  function sortHandBySuit() {

    const sorted =
      [...myHand].sort(
        (a, b) => {

          const suitDiff =
            suitOrder[getCardSuit(a)] -
            suitOrder[getCardSuit(b)]

          if (suitDiff !== 0) {
            return suitDiff
          }

          return (
            getCardValue(a) -
            getCardValue(b)
          )

        }
      )

    applySortedHand(sorted)

    setMessage(
      "Hand sorted by suit"
    )

  }

  function sortHandByRank() {

    const sorted =
      [...myHand].sort(
        (a, b) =>
          getCardValue(b) -
          getCardValue(a)
      )

    applySortedHand(sorted)

    setMessage(
      "Hand sorted highest to lowest"
    )

  }


  const isMyTurn =
    game &&
    user &&
    game.currentTurn ===
    user.uid


  const starterName =
    game && room
      ? game.starter ===
        room.player1
        ? "Player 1"
        : "Player 2"
      : ""

  const discardPile =
    game?.discard || []


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
              onChange={
                e =>
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


          {/* OPPONENT */}

          <div className="player opponent">

            <div className="player-name">
              Opponent
            </div>

            <div className="cards">

              {Array.from({
                length:
                  opponentCount
              }).map(
                (_, index) => (

                  <div
                    className="card"
                    key={index}
                  >
                    <CardBack />
                  </div>

                )
              )}

            </div>

            <div className="opponent-count">
              {opponentCount} cards
            </div>

          </div>


          {/* TABLE */}

          <div className="bahay-area">

            <div className="bahay-title">
              BAHAY
            </div>

            <div className="bahay-list">

              {(game?.bahay || []).length === 0 ? (

                <div className="empty-bahay">
                  No bahay yet
                </div>

              ) : (

                (game?.bahay || []).map(
                  bahay => (

                    <div
                      className={
                        "bahay " +
                        (
                          bahay.owner ===
                          user?.uid
                            ? "my-bahay"
                            : "opponent-bahay"
                        )
                      }
                      key={bahay.id}
                    >

                      <div className="bahay-header">

                        <span>
                          {bahay.owner ===
                          user?.uid
                            ? "YOUR BAHAY"
                            : "OPPONENT BAHAY"}
                        </span>

                      </div>

                      <div className="bahay-cards">

                        {bahay.cards.map(
                          (card, i) => (

                            <div
                              className="bahay-card"
                              key={card + i}
                            >
                              <PlayingCard
                                card={card}
                                size="small"
                              />
                            </div>

                          )
                        )}

                      </div>

                      {isMyTurn && (
                        <button
                          className="layoff-button"
                          onClick={() =>
                            addToBahay(
                              bahay.id
                            )
                          }
                          disabled={
                            selectedCards.length !== 1
                          }
                        >
                          ADD CARD
                        </button>
                      )}

                    </div>

                  )
                )

              )}

            </div>

          </div>


          {/* DECK AND DISCARD */}

          <div className="middle">

            <div className="pile-container">

              <div className="pile-label">
                DECK
              </div>

              <button
                className={
                  "deck " +
                  (
                    drawing
                      ? "deck-drawing"
                      : ""
                  )
                }
                onClick={
                  drawCard
                }
                disabled={
                  !isMyTurn ||
                  game?.phase !==
                    "draw" ||
                  game?.hasDrawn
                }
              >
                <CardBack className="deck-back" />
                <span className="deck-count">
                  {game
                    ? game.deck.length
                    : 0}
                </span>
              </button>

            </div>


            <div className="pile-container">

              <div className="pile-label">
                DISCARD
              </div>

              <div className="discard">

                {discardPile.length > 0 ? (

                  <PlayingCard
                    card={
                      discardPile[
                        discardPile.length - 1
                      ]
                    }
                    size="small"
                  />

                ) : (

                  <span className="discard-empty">
                    —
                  </span>

                )}

              </div>

              <button
                className="view-discards-button"
                onClick={() =>
                  setShowDiscardHistory(true)
                }
                disabled={
                  discardPile.length === 0
                }
              >
                VIEW ALL
              </button>

            </div>

          </div>


          {/* TURN */}

          <div className="turn-message">

            {isMyTurn
              ? game?.phase ===
                "draw"
                ? "YOUR TURN — DRAW"
                : "YOUR TURN — PLAY / DISCARD"
              : "OPPONENT'S TURN"}

          </div>


          {/* MY HAND */}

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


            {/* SORT */}

            <div className="sort-actions">

              <button
                className="sort-button"
                onClick={sortHandBySuit}
                disabled={
                  myHand.length === 0
                }
              >
                SORT BY SUIT
              </button>

              <button
                className="sort-button"
                onClick={sortHandByRank}
                disabled={
                  myHand.length === 0
                }
              >
                SORT HIGH — LOW
              </button>

            </div>


            {/* ACTIONS */}

            <div className="hand-actions">

              <button
                onClick={
                  createBahay
                }
                disabled={
                  !isMyTurn ||
                  game?.phase !==
                    "discard" ||
                  selectedCards.length < 3
                }
              >
                BAHAY
              </button>


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

                ? game?.phase ===
                  "draw"

                  ? "Draw one card, then create or add to a bahay, then discard."

                  : "Select cards to create a bahay, add to a bahay, or discard one card."

                : "Wait for your turn"}

            </p>


            {selectedCards.length > 0 && (

              <p className="selection-info">

                Selected:
                {" "}
                {selectedCards.join(" ")}

              </p>

            )}


            {game &&
            game.starter && (

              <p className="starter-info">

                {starterName}
                {" "}
                started with
                {" "}
                13 cards

              </p>

            )}

          </div>


          <p className="message">
            {message}
          </p>


          {/* DISCARD HISTORY MODAL */}

          {showDiscardHistory && (

            <div
              className="modal-overlay"
              onClick={() =>
                setShowDiscardHistory(false)
              }
            >

              <div
                className="modal-panel"
                onClick={
                  e => e.stopPropagation()
                }
              >

                <div className="modal-header">

                  <span>
                    DISCARDED CARDS
                    {" "}
                    ({discardPile.length})
                  </span>

                  <button
                    className="modal-close"
                    onClick={() =>
                      setShowDiscardHistory(false)
                    }
                  >
                    ✕
                  </button>

                </div>

                <div className="modal-grid">

                  {discardPile
                    .slice()
                    .reverse()
                    .map(
                      (card, i) => (

                        <div
                          className="modal-card"
                          key={card + i}
                        >
                          <PlayingCard
                            card={card}
                            size="small"
                          />
                        </div>

                      )
                    )}

                </div>

              </div>

            </div>

          )}

        </div>

      )}

    </div>

  )

}


export default App