import { useState, useEffect, useRef } from "react"
import { database, auth } from "../firebase"
import { ref, set, get, onValue, update, onDisconnect, remove, serverTimestamp } from "firebase/database"
import { onAuthStateChanged } from "firebase/auth"
import {
  getHandValue,
  createDeck,
  shuffleDeck,
  isValidMeld,
  canAddToMeld,
  canCardGoOnAnyMeld,
  canFormMeldWithCard,
  sortMeldCards,
  sortHandByMode,
  mergeMelds
} from "../utils/cardUtils"
import { emptyStats, getStat } from "../utils/stats"

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
  const [toast, setToast] = useState(null)
  const [room, setRoom] = useState(null)
  const [game, setGame] = useState(null)
  const [myHand, setMyHand] = useState([])
  const [opponentHand, setOpponentHand] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [drawing, setDrawing] = useState(false)
  const [showDiscardHistory, setShowDiscardHistory] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [sortMode, setSortMode] = useState(null) // null | "suit" | "rank"
  const [newlyDrawnCard, setNewlyDrawnCard] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)
  const [presence, setPresence] = useState({})
  const [opponentLeft, setOpponentLeft] = useState(false)

  const hasLoadedRoomRef = useRef(false)
  const hadPlayer2Ref = useRef(false)
  const leavingRef = useRef(false)
  const prevOpponentStateRef = useRef("none")

  /*
   * TOAST NOTIFIER
   */


  function notify(text, type = "info") {
    setToast({ id: Date.now(), text, type })
  }

  function warn(text) {
    notify(text, "warn")
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (roomCode) localStorage.setItem("roomCode", roomCode)
    else localStorage.removeItem("roomCode")
  }, [roomCode])

  useEffect(() => {
    hasLoadedRoomRef.current = false
    leavingRef.current = false
    prevOpponentStateRef.current = "none"
    setOpponentLeft(false)
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

  // none | left | online | offline
  const opponentState =
    !room || !opponentUid
      ? "none"
      : !presence[opponentUid]
        ? "left"
        : presence[opponentUid].online
          ? "online"
          : "offline"

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

        // I'm the one deleting it — no notice needed
        if (leavingRef.current) return

        if (hasLoadedRoomRef.current) {
          notify("The room was closed", "warn")
        } else {
          notify("That room no longer exists", "error")
        }

        setMessage("")
        setRoomCode("")
        setRoom(null)
        setGame(null)
        setPresence({})
        setMyHand([])
        setOpponentHand([])
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
   * NOT A MEMBER OF THIS ROOM (stale code, or room taken)
   */
  useEffect(() => {

    if (!room || !user || !roomCode) return

    if (room.player1 !== user.uid && room.player2 !== user.uid) {
      notify(
        room.game?.status === "playing"
          ? "That game is already in progress"
          : "That room is full",
        "error"
      )
      setRoomCode("")
      setRoom(null)
      setGame(null)
    }

  }, [room, user])

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
   * PRESENCE — DELETE THE ROOM WHEN THE LAST PLAYER GOES
   * If the opponent is not online (disconnected OR left), my
   * disconnect also deletes the room. If they're online, stand down.
   */
  useEffect(() => {

    if (!roomCode || !user || !opponentUid) return

    const roomRef = ref(database, "rooms/" + roomCode)

    if (opponentState === "online") {
      onDisconnect(roomRef).cancel()
    } else {
      onDisconnect(roomRef).remove()
    }

  }, [roomCode, user, opponentUid, opponentState])

  /*
   * PRESENCE — TELL ME WHAT THE OPPONENT DID
   */
  useEffect(() => {

    const prev = prevOpponentStateRef.current

    if (prev === "online" && opponentState === "left") {
      notify("Opponent left the room", "warn")
      setOpponentLeft(true)
    } else if (prev === "online" && opponentState === "offline") {
      notify("Opponent disconnected", "warn")
    } else if (prev === "offline" && opponentState === "online") {
      notify("Opponent is back", "info")
    }

    if (opponentState === "online") {
      setOpponentLeft(false)
    }

    prevOpponentStateRef.current = opponentState

  }, [opponentState])

  /*
   * OPPONENT HAND (count for the table, full hand for end-of-game stats)
   */
  useEffect(() => {

    if (!roomCode || !opponentUid) return

    const opponentHandRef = ref(
      database,
      "rooms/" + roomCode + "/hands/" + opponentUid
    )

    const unsubscribe = onValue(opponentHandRef, snapshot => {
      const raw = snapshot.val()
      if (Array.isArray(raw)) {
        setOpponentHand(raw)
      } else if (raw && typeof raw === "object") {
        setOpponentHand(Object.values(raw))
      } else {
        setOpponentHand([])
      }
    })

    return () => unsubscribe()

  }, [roomCode, opponentUid])

  /*
   * NEW GAME / REMATCH STARTED — reset local UI state
   */
  const gameStatus = game?.status

  useEffect(() => {
    if (gameStatus === "playing") {
      setSortMode(null)
      setSelectedCards([])
      setNewlyDrawnCard(null)
    }
  }, [gameStatus])

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
   * Deletes the room if the opponent isn't online (i.e. both players are gone).
   */
  async function leaveRoom() {

    if (!roomCode || !user) return

    leavingRef.current = true

    const myPresenceRef = ref(
      database,
      "rooms/" + roomCode + "/presence/" + user.uid
    )
    const roomRef = ref(database, "rooms/" + roomCode)

    try {
      await onDisconnect(myPresenceRef).cancel()
      await onDisconnect(roomRef).cancel()

      if (!opponentUid || opponentState !== "online") {
        await remove(roomRef)
      } else {
        await remove(myPresenceRef)
      }
    } catch (error) {
      console.error("LEAVE ERROR", error)
    }

    setRoomCode("")
    setRoom(null)
    setGame(null)
    setMyHand([])
    setOpponentHand([])
    setSelectedCards([])
    setSortMode(null)
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
      notify("Still connecting — try again in a moment", "error")
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
      notify(error.message, "error")
    }

  }

  /*
   * JOIN ROOM
   */
  async function joinRoom() {

    const code = inputCode.trim().toUpperCase()
    const currentUser = auth.currentUser

    if (!currentUser) {
      notify("Still connecting — try again in a moment", "error")
      return
    }

    if (!code) {
      notify("Enter a room code", "error")
      return
    }

    try {

      const roomRef = ref(database, "rooms/" + code)
      const snapshot = await get(roomRef)

      if (!snapshot.exists()) {
        notify("Room " + code + " does not exist", "error")
        return
      }

      const roomData = snapshot.val()

      const isMember =
        roomData.player1 === currentUser.uid ||
        roomData.player2 === currentUser.uid

      if (isMember) {
        setRoomCode(code)
        setMessage("Rejoined room")
        return
      }

      if (roomData.player2) {
        notify(
          roomData.game?.status === "playing"
            ? "That game is already in progress"
            : "That room is full",
          "error"
        )
        return
      }

      await set(ref(database, "rooms/" + code + "/player2"), currentUser.uid)

      setRoomCode(code)
      setMessage("Joined room!")

      if (!roomData.game) {
        await startGame(code, roomData.player1, currentUser.uid)
      }

    } catch (error) {
      notify(error.message, "error")
    }

  }

  /*
   * START GAME (also used by an accepted rematch)
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
      lastDiscarder: null,
      stats: {
        [player1]: emptyStats(),
        [player2]: emptyStats()
      }
    }

    await set(ref(database, "rooms/" + code + "/hands/" + player1), player1Hand)
    await set(ref(database, "rooms/" + code + "/hands/" + player2), player2Hand)
    await remove(ref(database, "rooms/" + code + "/rematch"))
    await set(ref(database, "rooms/" + code + "/game"), gameData)

  }

  /*
   * Shared helpers
   */
  function applyWinIfEmpty(updates, newHand) {
    if (newHand.length === 0) {
      updates["game/status"] = "finished"
      updates["game/winner"] = user.uid
      updates["game/winReason"] = "emptyHand"
    }
  }

  function bump(updates, key, amount = 1) {
    updates["game/stats/" + user.uid + "/" + key] =
      getStat(game, user.uid, key) + amount
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
      age("Draw a card first")
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

    if (game.mustMeld && !selectedCards.includes(game.mustMeld)) {
      setMessage("Your meld must include the card you took: " + game.mustMeld)
      return
    }

    const newMeld = {
      id: Date.now().toString(),
      owner: user.uid,
      cards: sortMeldCards(selectedCards)
    }

    const newHand = myHand.filter(card => !selectedCards.includes(card))
    const updatedMelds = mergeMelds([...(game.melds || []), newMeld])

    const updates = {
      ["hands/" + user.uid]: newHand,
      "game/melds": updatedMelds,
      "game/mustMeld": null
    }

    bump(updates, "melds", 1)
    bump(updates, "cardsMelded", selectedCards.length)
    applyWinIfEmpty(updates, newHand)

    await update(ref(database, "rooms/" + roomCode), updates)

    setSelectedCards([])
    setMessage(newHand.length === 0 ? "You emptied your hand!" : "Meld created!")

  }

  /*
   * ADD CARD TO MELD (tap a glowing meld)
   */
  async function addToMeld(meldId) {



    if (!game || !user) return
    if (game.status === "finished") return

    if (game.currentTurn !== user.uid) {
      setMessage("It's not your turn")
      return
    }

    if (game.phase !== "discard") {
      setMessage("Draw a card from the pile first")
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

    const updatedMelds = mergeMelds(
      (game.melds || []).map(item =>
        item.id === meldId
          ? { ...item, cards: sortMeldCards([...item.cards, card]) }
          : item
      )
    )

    const newHand = myHand.filter(item => item !== card)

    const updates = {
      ["hands/" + user.uid]: newHand,
      "game/melds": updatedMelds
    }

    if (game.mustMeld === card) {
      updates["game/mustMeld"] = null
    }

    bump(updates, "layoffs", 1)
    bump(updates, "cardsMelded", 1)
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

    bump(updates, "discards", 1)

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
      setMessage("Draw a card from the pile first")
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
   * Put a new card into my hand — slotted into place if I've sorted
   */
  function addToHand(card) {
    const next = [...myHand, card]
    return sortMode ? sortHandByMode(next, sortMode) : next
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
    const newHand = addToHand(card)

    const updates = {
      "game/deck": newDeck,
      "game/hasDrawn": true,
      "game/phase": "discard",
      ["hands/" + user.uid]: newHand
    }

    bump(updates, "draws", 1)

    await update(ref(database, "rooms/" + roomCode), updates)

    setNewlyDrawnCard(card)
    setMessage("Card drawn!")

    setTimeout(() => setDrawing(false), 500)
  }

  /*
   * TAKE THE OPPONENT'S DISCARD
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

    if (!game || !user || !topDiscard) return

    if (game.currentTurn !== user.uid) {
      warn("It's not your turn")
      return
    }

    if (game.phase !== "draw" || game.hasDrawn) {
      warn("You can only take a discard at the start of your turn")
      return
    }

    if (game.lastDiscarder === user.uid) {
      warn("You can't take your own discard")
      return
    }

    if (!canTakeDiscard) {
      warn("That card doesn't form a meld with your hand")
      return
    }

    const card = topDiscard
    const newDiscard = game.discard.slice(0, -1)
    const newHand = addToHand(card)

    const updates = {
      "game/discard": newDiscard,
      "game/hasDrawn": true,
      "game/phase": "discard",
      "game/mustMeld": card,
      ["hands/" + user.uid]: newHand
    }

    bump(updates, "takes", 1)

    await update(ref(database, "rooms/" + roomCode), updates)

    setNewlyDrawnCard(card)
    setSelectedCards([card])
    setMessage("You took " + card)

  }

  /*
   * REMATCH — whoever presses first asks, the other confirms
   */
  async function requestRematch() {
    if (!roomCode || !user) return

    await set(ref(database, "rooms/" + roomCode + "/rematch"), {
      requestedBy: user.uid,
      status: "pending"
    })
  }

  async function acceptRematch() {
    if (!roomCode || !room) return

    await startGame(roomCode, room.player1, room.player2)
    setSelectedCards([])
    setMessage("Rematch started!")
  }

  async function declineRematch() {
    if (!roomCode) return

    await update(ref(database, "rooms/" + roomCode + "/rematch"), {
      status: "declined"
    })
  }

  async function cancelRematch() {
    if (!roomCode) return

    await remove(ref(database, "rooms/" + roomCode + "/rematch"))
  }

  /*
   * DRAG
   */
  function handleDragStart(event) {
    setActiveDragId(event.active.id)
  }

  function handleDragCancel() {
    setActiveDragId(null)
  }

  async function handleDragEnd(event) {

    setActiveDragId(null)

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
        setMessage("Draw a card from the pile first")
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

    // A manual rearrangement means "stop auto-sorting"
    setSortMode(null)
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
    setSortMode("suit")
    applySortedHand(sortHandByMode(myHand, "suit"))
    setMessage("Hand sorted by suit")
  }

  function sortHandByRank() {
    setSortMode("rank")
    applySortedHand(sortHandByMode(myHand, "rank"))
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
    toast,
    dismissToast: () => setToast(null),
    room,
    game,
    myHand,
    opponentHand,
    opponentCount: opponentHand.length,
    selectedCards,
    setSelectedCards,
    drawing,
    showDiscardHistory,
    setShowDiscardHistory,
    sortMenuOpen,
    setSortMenuOpen,
    newlyDrawnCard,
    activeDragCard: activeDragId,
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
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    sortHandBySuit,
    sortHandByRank,
    isMyTurn,
    requestRematch,
    acceptRematch,
    declineRematch,
    cancelRematch,
    starterName,
    discardPile,
    leaveRoom,
    opponentLeft,
    opponentDisconnected: opponentState === "offline"
  }

}