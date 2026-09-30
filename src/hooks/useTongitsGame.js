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
  isValidBahay,
  canAddToBahay,
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
 * game action lives in this one hook. Components never talk
 * to Firebase directly — they just receive data + callbacks
 * from whatever calls this hook (App.jsx).
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
    /*
   * OPPONENT HAND COUNT
   */
  const opponentUid =
    room && user
      ? room.player1 === user.uid
        ? room.player2
        : room.player1
      : null
      
  const sensors = useSensors(

    
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),

    // Distance-based (not delay-based) so a touch drag
    // starts the instant a finger moves, with no hold wait.
    useSensor(TouchSensor, {
      activationConstraint: { distance: 4 }
    })

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
      // Room existed before and is now gone — the other
      // player left after we'd already disconnected once too.
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
      console.log("HAND SNAPSHOT", user.uid, raw)

      if (Array.isArray(raw)) {
        setMyHand(raw)
      } else if (raw && typeof raw === "object") {
        // Firebase returns an object instead of an array if keys have gaps
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
 * Registers what Firebase should do to MY presence node
 * if my connection drops with no warning.
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
 * If my opponent just went offline, arm a second disconnect
 * handler: if I ALSO drop next, take the whole room with me.
 * If they come back, disarm it.
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
   * once it's no longer in hand, or once
   * it's no longer this player's turn
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
 * Explicit exit — used for the Leave button, and also
 * covers "finish game" until you add a real win screen.
 */
async function leaveRoom() {

  if (!roomCode || !user) return

  const myPresenceRef = ref(
    database,
    "rooms/" + roomCode + "/presence/" + user.uid
  )
  const roomRef = ref(database, "rooms/" + roomCode)

  // I'm leaving on purpose — cancel the automatic handlers
  await onDisconnect(myPresenceRef).cancel()
  await onDisconnect(roomRef).cancel()

  const opponentOnline = presence[opponentUid]?.online

  if (!opponentUid || opponentOnline !== true) {
    // Opponent already gone, or never existed — nothing to keep
    await remove(roomRef)
  } else {
    // Opponent still here — just step out, leave their game intact
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
      bahay: []
    }

    await set(ref(database, "rooms/" + code + "/game"), gameData)
    await set(ref(database, "rooms/" + code + "/hands/" + player1), player1Hand)
    await set(ref(database, "rooms/" + code + "/hands/" + player2), player2Hand)

  }


  /*
   * CREATE BAHAY
   */
  async function createBahay() {
    if (game.status === "finished") return

    if (!game || !user) return

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

    if (!isValidBahay(selectedCards)) {
      setMessage("Those cards do not form a valid bahay")
      return
    }

    const newBahay = {
      id: Date.now().toString(),
      owner: user.uid,
      cards: [...selectedCards]
    }

    const newHand = myHand.filter(card => !selectedCards.includes(card))
    const currentBahay = game.bahay || []
    const updatedBahay = [...currentBahay, newBahay]

    await update(ref(database, "rooms/" + roomCode), {
      ["hands/" + user.uid]: newHand,
      "game/bahay": updatedBahay
    })

    setSelectedCards([])
    setMessage("Bahay created!")

  }


  /*
   * ADD CARD TO BAHAY
   */
  async function addToBahay(bahayId) {
    if (game.status === "finished") return
    if (!game || !user) return

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
    const bahay = (game.bahay || []).find(item => item.id === bahayId)

    if (!bahay) {
      setMessage("Bahay not found")
      return
    }

    if (!canAddToBahay(bahay, card)) {
      setMessage("That card cannot be added to this bahay")
      return
    }

    const updatedBahay = (game.bahay || []).map(item => {
      if (item.id === bahayId) {
        return { ...item, cards: [...item.cards, card] }
      }
      return item
    })

    const newHand = myHand.filter(item => item !== card)

    await update(ref(database, "rooms/" + roomCode), {
      ["hands/" + user.uid]: newHand,
      "game/bahay": updatedBahay
    })

    setSelectedCards([])
    setMessage("Card added to bahay!")

  }


  /*
   * SELECT CARD
   */
  function toggleCard(card) {
    if (game.status === "finished") return
    if (!game || !user) return

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
   * performDiscard() holds the actual Firebase update so
   * both the DISCARD button and a drag-to-the-pile drop
   * can share it.
   */
 async function performDiscard(card) {

  const newHand = myHand.filter(item => item !== card)
  const newDiscard = [...(game.discard || []), card]
  const nextPlayer = user.uid === room.player1 ? room.player2 : room.player1

  const updates = {
    ["hands/" + user.uid]: newHand,
    "game/discard": newDiscard
  }

  if (newHand.length === 0) {
    // Went out — instant win, game over right here
    updates["game/status"] = "finished"
    updates["game/winner"] = user.uid
    updates["game/winReason"] = "emptyHand"
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
    if (game.status === "finished") return
    if (!game || !user) return

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
   * DRAW
   */
  /*
 * END GAME BY LOWEST COUNT
 * Called when the deck runs out and nobody has gone out.
 * Reads BOTH hands directly from Firebase (not just local
 * state) since we only track our own hand locally.
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
  async function drawCard() {
    if (game.status === "finished") return
    if (!game.deck || game.deck.length === 0) {
  await endGameByLowestCount()
  return
}

    if (!game || !user) return

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

    if (!game.deck || game.deck.length === 0) {
      setMessage("The deck is empty")
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
 * END GAME BY LOWEST COUNT
 * Called when the deck runs out and nobody has gone out.
 * Reads BOTH hands directly from Firebase (not just local
 * state) since we only track our own hand locally.
 */


async function rematch() {

  if (!roomCode || !room) return

  await startGame(roomCode, room.player1, room.player2)
  setSelectedCards([])
  setMessage("Rematch started!")

}


  /*
   * DRAG END
   * Either a drop on the discard pile, or a
   * hand reorder.
   */
  async function handleDragEnd(event) {

    const { active, over } = event

    if (!over) return

    if (over.id === "discard-zone") {

      if (!game || !user) return

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
   * SORT HAND (persists the new order to Firebase,
   * same as a manual drag reorder would)
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
    createBahay,
    addToBahay,
    toggleCard,
    discardSelected,
    drawCard,
    handleDragEnd,
    sortHandBySuit,
    sortHandByRank,
    isMyTurn,
    rematch,
    starterName,
    discardPile,
    leaveRoom,
opponentDisconnected:
  !!opponentUid && presence[opponentUid]?.online === false,
  }

}
