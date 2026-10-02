import { useState, useEffect, useRef } from "react"
import { database, auth } from "../firebase"
import { ref, set, get, onValue, update, onDisconnect, remove, serverTimestamp } from "firebase/database"
import { onAuthStateChanged } from "firebase/auth"
import {
  getCardValue,
  getCardSuit,
  getHandValue,
  createDeck,
  shuffleDeck,
  isValidMeld,
  canAddToMeld,
  canCardGoOnAnyMeld,
  canFormMeldWithCard,
  suitOrder
} from "../utils/cardUtils"

import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

import { arrayMove } from "@dnd-kit/sortable"

/*
 * useTongitsGame
 * Every piece of state, every Firebase listener, and every
 * game action lives in this one hook.
 */

export function useTongitsGame() {
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem("roomCode") || "")

  const [inputCode, setInputCode] = useState("")
  const [message, setMessage] = useState("")
  const [room, setRoom] = useState(null)
  const [game, setGame] = useState(null)
  const [myHand, setMyHand] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [opponentCount, setOpponentCount] = useState(0)
  const [drawing, setDrawing] = useState(false)
  const [showDiscardHistory, setShowDiscardHistory] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [newlyDrawnCard, setNewlyDrawnCard] = useState(null)
  const [presence, setPresence] = useState({})
  const hasLoadedRoomRef = useRef(false)
  const hadPlayer2Ref = useRef(false)

  useEffect(() => {
    if (roomCode) localStorage.setItem("roomCode", roomCode)
    else localStorage.removeItem("roomCode")
  }, [roomCode])

  useEffect(() => {
    hasLoadedRoomRef.current = false
  }, [roomCode])

  const [user, setUser] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
    })
  }, [])

  const opponentUid =
    room && user
      ? room.player1 === user.uid
        ? room.player2
        : room.player1
      : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } })
  )

  /*
   * ROOM LISTENER
   */
  useEffect(() => {

    if (!roomCode) return

    const roomRef = ref(database, "rooms/" + roomCode)

    const unsubscribe = onValue(roomRef, snapshot => {

      const data = snapshot.val()

      if (!data) {
        if (hasLoadedRoomRef.current) {
          setMessage("Room closed")
          setRoomCode("")
          setRoom(null)
          setGame(null)
          setPresence({})
        }
        return
      }

      hasLoadedRoomRef.current = true
      setRoom(data)
      setPresence(data.presence || {})

      if (data.game) {
        setGame(data.game)
      }

      if (!data.player2) {
        hadPlayer2Ref.current = false
        setMessage("Waiting for Player 2...")
      } else if (!hadPlayer2Ref.current) {
        hadPlayer2Ref.current = true
        setMessage("Player 2 joined!")
      }

    })

    return () => unsubscribe()

  }, [roomCode])

  /*
   * MY HAND
   */
  useEffect(() => {
    if (!roomCode || !user) return

    const handRef = ref(database, "rooms/" + roomCode + "/hands/" + user.uid)

    const unsubscribe = onValue(
      handRef,
      snapshot => {
        const raw = snapshot.val()

        if (Array.isArray(raw)) {
          setMyHand(raw)
        } else if (raw && typeof raw === "object") {
          setMyHand(Object.values(raw))
        } else {
          setMyHand([])
        }
      },
      error => {
        console.error("HAND LISTENER ERROR", error)
        setMessage("Can't read hand: " + error.message)
      }
    )

    return () => unsubscribe()
  }, [roomCode, user])

  /*
   * PRESENCE — MARK MYSELF ONLINE
   */
  useEffect(() => {

    if (!roomCode || !user) return

    const myPresenceRef = ref(
      database,
      "rooms/" + roomCode + "/presence/" + user.uid
    )

    set(myPresenceRef, { online: true, lastSeen: serverTimestamp() })

    onDisconnect(myPresenceRef).update({
      online: false,
      lastSeen: serverTimestamp()
    })

  }, [roomCode, user])

  /*
   * PRESENCE — ESCALATE OR STAND DOWN
   */
  useEffect(() => {

    if (!roomCode || !user || !opponentUid) return

    const opponentOnline = presence[opponentUid]?.online
    const roomRef = ref(database, "rooms/" + roomCode)

    if (opponentOnline === false) {
      onDisconnect(roomRef).remove()
    } else if (opponentOnline === true) {
      onDisconnect(roomRef).cancel()
    }

  }, [roomCode, user, opponentUid, presence[opponentUid]?.online])

  /*
   * OPPONENT HAND COUNT
   */
  useEffect(() => {

    if (!roomCode || !opponentUid) return

    const opponentHandRef = ref(
      database,
      "rooms/" + roomCode + "/hands/" + opponentUid
    )

    const unsubscribe = onValue(opponentHandRef, snapshot => {
      const hand = snapshot.val()
      if (Array.isArray(hand)) {
        setOpponentCount(hand.length)
      } else {
        setOpponentCount(0)
      }
    })

    return () => unsubscribe()

  }, [roomCode, opponentUid])

  /*
   * CLEAR THE "NEW CARD" INDICATOR
   */
  useEffect(() => {
    if (newlyDrawnCard && !myHand.includes(newlyDrawnCard)) {
      setNewlyDrawnCard(null)
    }
  }, [myHand, newlyDrawnCard])

  useEffect(() => {
    if (game && user && game.currentTurn !== user.uid) {
      setNewlyDrawnCard(null)
    }
  }, [game && game.currentTurn, user])

  /*
   * LEAVE ROOM
   */
  async function leaveRoom() {

    if (!roomCode || !user) return

    const myPresenceRef = ref(
      database,
      "rooms/" + roomCode + "/presence/" + user.uid
    )
    const roomRef = ref(database, "rooms/" + roomCode)

    await onDisconnect(myPresenceRef).cancel()
    await onDisconnect(roomRef).cancel()

    const opponentOnline = presence[opponentUid]?.online

    if (!opponentUid || opponentOnline !== true) {
      await remove(roomRef)
    } else {
      await remove(myPresenceRef)
    }

    setRoomCode("")
    setRoom(null)
    setGame(null)
    setMyHand([])
    setSelectedCards([])
    setPresence({})
    setMessage("You left the room")

  }

  /*
   * CREATE ROOM
   */
  async function createRoom() {

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
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

      await set(ref(database, "rooms/" + code + "/player2"), currentUser.uid)

      setRoomCode(code)
      setMessage("Joined room!")

      if (!roomData.game) {
        await startGame(code, roomData.player1, currentUser.uid)
      }

    } catch (error) {
      setMessage(error.message)
    }

  }

  /*
   * START GAME
   */
  async function startGame(code, player1, player2) {

    const deck = createDeck()
    shuffleDeck(deck)

    const starter = Math.random() < 0.5 ? player1 : player2

    let player1Hand
    let player2Hand

    if (starter === player1) {
      player1Hand = deck.splice(0, 13)
      player2Hand = deck.splice(0, 12)
    } else {
      player2Hand = deck.splice(0, 13)
      player1Hand = deck.splice(0, 12)
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
      melds: [],
      mustMeld: null,
      lastDiscarder: null
    }

    await set(ref(database, "rooms/" + code + "/game"), gameData)
    await set(ref(database, "rooms/" + code + "/hands/" + player1), player1Hand)
    await set(ref(database, "rooms/" + code + "/hands/" + player2), player2Hand)

  }

  /*
   * Shared: if the hand is now empty, the player goes out and wins.
   */
  function applyWinIfEmpty(updates, newHand) {
    if (newHand.length === 0) {
      updates["game/status"] = "finished"
      updates["game/winner"] = user.uid
      updates["game/winReason"] = "emptyHand"
    }
  }

  /*
   * CREATE MELD
   */
  async function createMeld() {

    if (!game || !user) return
    if (game.status === "finished") return

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (game.phase !== "discard") {
      setMessage("Draw a card first")
      return
    }

    if (selectedCards.length < 3) {
      setMessage("Select at least 3 cards")
      return
    }

    if (!isValidMeld(selectedCards)) {
      setMessage("Those cards do not form a valid meld")
      return
    }

    // A card taken from the discard pile MUST be used in the meld
    if (game.mustMeld && !selectedCards.includes(game.mustMeld)) {
      setMessage("Your meld must include the card you took: " + game.mustMeld)
      return
    }

    const newMeld = {
      id: Date.now().toString(),
      owner: user.uid,
      cards: [...selectedCards]
    }

    const newHand = myHand.filter(card => !selectedCards.includes(card))
    const updatedMelds = [...(game.melds || []), newMeld]

    const updates = {
      ["hands/" + user.uid]: newHand,
      "game/melds": updatedMelds,
      "game/mustMeld": null
    }

    applyWinIfEmpty(updates, newHand)

    await update(ref(database, "rooms/" + roomCode), updates)

    setSelectedCards([])
    setMessage(newHand.length === 0 ? "You emptied your hand!" : "Meld created!")

  }

  /*
   * ADD CARD TO MELD
   */
  async function addToMeld(meldId) {

    if (!game || !user) return
    if (game.status === "finished") return

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (game.phase !== "discard") {
      setMessage("Draw a card first")
      return
    }

    if (selectedCards.length !== 1) {
      setMessage("Select one card to add")
      return
    }

    const card = selectedCards[0]

    if (game.mustMeld && card !== game.mustMeld) {
      setMessage("Use the card you took first: " + game.mustMeld)
      return
    }

    const meld = (game.melds || []).find(item => item.id === meldId)

    if (!meld) {
      setMessage("Meld not found")
      return
    }

    if (!canAddToMeld(meld, card)) {
      setMessage("That card cannot be added to this meld")
      return
    }

    const updatedMelds = (game.melds || []).map(item =>
      item.id === meldId
        ? { ...item, cards: [...item.cards, card] }
        : item
    )

    const newHand = myHand.filter(item => item !== card)

    const updates = {
      ["hands/" + user.uid]: newHand,
      "game/melds": updatedMelds
    }

    if (game.mustMeld === card) {
      updates["game/mustMeld"] = null
    }

    applyWinIfEmpty(updates, newHand)

    await update(ref(database, "rooms/" + roomCode), updates)

    setSelectedCards([])
    setMessage(newHand.length === 0 ? "You emptied your hand!" : "Card added to meld!")

  }

  /*
   * SELECT CARD
   */
  function toggleCard(card) {
    if (!game || !user) return
    if (game.status === "finished") return
    if (game.currentTurn !== user.uid) return

    setSelectedCards(previous => {
      if (previous.includes(card)) {
        return previous.filter(item => item !== card)
      }
      return [...previous, card]
    })
  }

  /*
   * DISCARD
   * performDiscard() is shared by the DISCARD button and drag-to-pile.
   * Rules enforced here:
   *  - can't discard the card you took until it has been used
   *  - can't discard a card that fits on any meld on the table
   */
  async function performDiscard(card) {

    if (game.mustMeld) {
      setMessage("You must use the card you took (" + game.mustMeld + ") in a meld first")
      return
    }

    if (canCardGoOnAnyMeld(game.melds, card)) {
      setMessage(card + " fits a meld — add it or keep it, you can't discard it")
      return
    }

    const newHand = myHand.filter(item => item !== card)
    const newDiscard = [...(game.discard || []), card]
    const nextPlayer = user.uid === room.player1 ? room.player2 : room.player1

    const updates = {
      ["hands/" + user.uid]: newHand,
      "game/discard": newDiscard,
      "game/lastDiscarder": user.uid
    }

    if (newHand.length === 0) {
      applyWinIfEmpty(updates, newHand)
    } else {
      updates["game/currentTurn"] = nextPlayer
      updates["game/phase"] = "draw"
      updates["game/hasDrawn"] = false
    }

    await update(ref(database, "rooms/" + roomCode), updates)

    setSelectedCards([])
    setMessage(newHand.length === 0 ? "You emptied your hand!" : "Card discarded")

  }

  async function discardSelected() {
    if (!game || !user) return
    if (game.status === "finished") return

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (game.phase !== "discard") {
      setMessage("You must draw a card first")
      return
    }

    if (selectedCards.length !== 1) {
      setMessage("Select one card to discard")
      return
    }

    await performDiscard(selectedCards[0])
  }

  /*
   * END GAME BY LOWEST COUNT
   */
  async function endGameByLowestCount() {

    const handsSnapshot = await get(ref(database, "rooms/" + roomCode + "/hands"))
    const hands = handsSnapshot.val() || {}

    const p1Value = getHandValue(hands[room.player1] || [])
    const p2Value = getHandValue(hands[room.player2] || [])

    let winner

    if (p1Value < p2Value) {
      winner = room.player1
    } else if (p2Value < p1Value) {
      winner = room.player2
    } else {
      winner = "tie"
    }

    await update(ref(database, "rooms/" + roomCode), {
      "game/status": "finished",
      "game/winner": winner,
      "game/winReason": "lowestCount"
    })

  }

  /*
   * DRAW
   */
  async function drawCard() {
    if (!game || !user) return
    if (game.status === "finished") return

    if (!game.deck || game.deck.length === 0) {
      await endGameByLowestCount()
      return
    }

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (game.phase !== "draw") {
      setMessage("You cannot draw right now")
      return
    }

    if (game.hasDrawn) {
      setMessage("You already drew this turn")
      return
    }

    setDrawing(true)

    const card = game.deck[0]
    const newDeck = game.deck.slice(1)
    const newHand = [...myHand, card]

    await update(ref(database, "rooms/" + roomCode), {
      "game/deck": newDeck,
      "game/hasDrawn": true,
      "game/phase": "discard",
      ["hands/" + user.uid]: newHand
    })

    setNewlyDrawnCard(card)
    setMessage("Card drawn!")

    setTimeout(() => setDrawing(false), 500)
  }

  /*
   * TAKE THE OPPONENT'S DISCARD
   * Only allowed when the card forms a meld with cards in my hand.
   * The card is flagged as mustMeld — I can't discard until I've
   * used it in a meld (or laid it off on an existing one).
   */
  const topDiscard = game?.discard?.length
    ? game.discard[game.discard.length - 1]
    : null

  const canTakeDiscard = !!(
    game &&
    user &&
    game.status === "playing" &&
    game.currentTurn === user.uid &&
    game.phase === "draw" &&
    !game.hasDrawn &&
    topDiscard &&
    game.lastDiscarder !== user.uid &&
    canFormMeldWithCard(myHand, topDiscard)
  )

  async function takeDiscard() {

    if (!canTakeDiscard) {
      setMessage("You can only take a discard that forms a meld with your hand")
      return
    }

    const card = topDiscard
    const newDiscard = game.discard.slice(0, -1)
    const newHand = [...myHand, card]

    await update(ref(database, "rooms/" + roomCode), {
      "game/discard": newDiscard,
      "game/hasDrawn": true,
      "game/phase": "discard",
      "game/mustMeld": card,
      ["hands/" + user.uid]: newHand
    })

    setNewlyDrawnCard(card)
    setSelectedCards([card])
    setMessage("You took " + card + " — make a meld with it, then discard")

  }

  async function rematch() {

    if (!roomCode || !room) return

    await startGame(roomCode, room.player1, room.player2)
    setSelectedCards([])
    setMessage("Rematch started!")

  }

  /*
   * DRAG END
   */
  async function handleDragEnd(event) {

    const { active, over } = event

    if (!over) return

    if (over.id === "discard-zone") {

      if (!game || !user) return
      if (game.status === "finished") return

      if (game.currentTurn !== user.uid) {
        setMessage("It's not your turn")
        return
      }

      if (game.phase !== "discard") {
        setMessage("Draw a card before you can discard")
        return
      }

      await performDiscard(active.id)
      return

    }

    if (active.id === over.id) return

    const oldIndex = myHand.indexOf(active.id)
    const newIndex = myHand.indexOf(over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(myHand, oldIndex, newIndex)

    setMyHand(reordered)

    await set(
      ref(database, "rooms/" + roomCode + "/hands/" + user.uid),
      reordered
    )

  }

  /*
   * SORT HAND
   */
  async function applySortedHand(sorted) {

    setMyHand(sorted)

    if (roomCode && user) {
      await set(
        ref(database, "rooms/" + roomCode + "/hands/" + user.uid),
        sorted
      )
    }

  }

  function sortHandBySuit() {

    const sorted = [...myHand].sort((a, b) => {
      const suitDiff = suitOrder[getCardSuit(a)] - suitOrder[getCardSuit(b)]
      if (suitDiff !== 0) return suitDiff
      return getCardValue(a) - getCardValue(b)
    })

    applySortedHand(sorted)
    setMessage("Hand sorted by suit")

  }

  function sortHandByRank() {

    const sorted = [...myHand].sort((a, b) => getCardValue(b) - getCardValue(a))

    applySortedHand(sorted)
    setMessage("Hand sorted highest to lowest")

  }

  const isMyTurn = game && user && game.currentTurn === user.uid

  const starterName =
    game && room
      ? game.starter === room.player1
        ? "Player 1"
        : "Player 2"
      : ""

  const discardPile = game?.discard || []

  return {
    roomCode,
    inputCode,
    setInputCode,
    message,
    room,
    game,
    myHand,
    selectedCards,
    setSelectedCards,
    opponentCount,
    drawing,
    showDiscardHistory,
    setShowDiscardHistory,
    sortMenuOpen,
    setSortMenuOpen,
    newlyDrawnCard,
    user,
    sensors,
    createRoom,
    joinRoom,
    createMeld,
    addToMeld,
    toggleCard,
    discardSelected,
    drawCard,
    takeDiscard,
    canTakeDiscard,
    handleDragEnd,
    sortHandBySuit,
    sortHandByRank,
    isMyTurn,
    rematch,
    starterName,
    discardPile,
    leaveRoom,
    opponentDisconnected:
      !!opponentUid && presence[opponentUid]?.online === false
  }

}