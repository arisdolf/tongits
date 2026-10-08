import { useState, useEffect, useRef } from "react"
import { database, auth } from "../firebase"
import { ref, set, get, onValue, update, onDisconnect, remove, serverTimestamp, push, query, limitToLast } from "firebase/database"
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
import { PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { flyCard } from "../utils/fly"

const $ = selector => document.querySelector(selector)
const $card = card => document.querySelector(`[data-card="${card}"]`)

export function useTongitsGame() {
  const [chatMessages, setChatMessages] = useState([])
const [chatOpen, setChatOpen] = useState(false)
const [unread, setUnread] = useState(0)
const chatOpenRef = useRef(false)
const chatIdsRef = useRef(null)      // null until the first snapshot arrives
const lastChatSentRef = useRef(0)
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
  const [sortMode, setSortMode] = useState(null)
  const [newlyDrawnCard, setNewlyDrawnCard] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)
  const [presence, setPresence] = useState({})
  const [opponentLeft, setOpponentLeft] = useState(false)
  const [activeEmote, setActiveEmote] = useState(null)
  const [groups, setGroups] = useState([])
  const [user, setUser] = useState(null)
  const prevDeckLenRef = useRef(null)
  const hasLoadedRoomRef = useRef(false)
  const hadPlayer2Ref = useRef(false)
  const leavingRef = useRef(false)
  const prevOpponentStateRef = useRef("none")
  const emoteSeenRef = useRef(null)
  const lastEmoteSentRef = useRef(0)
  const prevDiscardRef = useRef(null)

  function notify(text, type = "info") {
    setToast({ id: Date.now(), text, type })
  }
  function warn(text) { notify(text, "warn") }

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
    prevDeckLenRef.current = null
    hasLoadedRoomRef.current = false
    leavingRef.current = false
    prevOpponentStateRef.current = "none"
    emoteSeenRef.current = null
    prevDiscardRef.current = null
    setOpponentLeft(false)
    setGroups([])
  }, [roomCode])

  useEffect(() => {
    return onAuthStateChanged(auth, currentUser => setUser(currentUser))
  }, [])

  const opponentUid =
    room && user
      ? room.player1 === user.uid ? room.player2 : room.player1
      : null

  const opponentState =
    !room || !opponentUid
      ? "none"
      : !presence[opponentUid]
        ? "left"
        : presence[opponentUid].online ? "online" : "offline"

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } })
  )

  /* ROOM LISTENER */
  useEffect(() => {
    if (!roomCode) return

    const roomRef = ref(database, "rooms/" + roomCode)

    const unsubscribe = onValue(roomRef, snapshot => {
      const data = snapshot.val()

      if (!data) {
        if (leavingRef.current) return

        if (hasLoadedRoomRef.current) notify("The room was closed", "warn")
        else notify("That room no longer exists", "error")

        setMessage("")
        setRoomCode("")
        setRoom(null)
        setGame(null)
        setPresence({})
        setMyHand([])
        setOpponentHand([])
        return
      }

      if (!hasLoadedRoomRef.current) emoteSeenRef.current = data.emote?.ts || 0
      hasLoadedRoomRef.current = true
      setRoom(data)
      setPresence(data.presence || {})

      if (data.game) setGame(data.game)

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

  /* EMOTES */
  const emoteTs = room?.emote?.ts
  useEffect(() => {
    const e = room?.emote
    if (!e || emoteSeenRef.current === null || emoteTs === emoteSeenRef.current) return

    emoteSeenRef.current = emoteTs
    setActiveEmote(e)
    const timer = setTimeout(() => setActiveEmote(null), 2500)
    return () => clearTimeout(timer)
  }, [emoteTs])

  async function sendEmote(id) {
    if (!roomCode || !user) return
    if (Date.now() - lastEmoteSentRef.current < 1500) return
    lastEmoteSentRef.current = Date.now()

    await set(ref(database, "rooms/" + roomCode + "/emote"), {
      from: user.uid,
      id,
      ts: Date.now()
    })
  }

  /* CHAT */
useEffect(() => {
  chatOpenRef.current = chatOpen
  if (chatOpen) setUnread(0)
}, [chatOpen])

useEffect(() => {
  if (!roomCode) return

  setChatMessages([])
  setUnread(0)
  chatIdsRef.current = null

  const chatQuery = query(ref(database, "rooms/" + roomCode + "/chat"), limitToLast(50))

  const unsubscribe = onValue(chatQuery, snapshot => {
    const list = []
    snapshot.forEach(child => { list.push({ id: child.key, ...child.val() }) })
    setChatMessages(list)

    const prev = chatIdsRef.current
    chatIdsRef.current = new Set(list.map(m => m.id))

    // don't count history on first load, or messages while the panel is open
    if (prev === null || chatOpenRef.current) return

    const fresh = list.filter(m => !prev.has(m.id) && m.from !== auth.currentUser?.uid)
    if (fresh.length) setUnread(n => n + fresh.length)
  })

  return () => unsubscribe()
}, [roomCode])

async function sendChat(text) {
  const clean = text.trim().slice(0, 200)
  if (!clean || !roomCode || !user) return
  if (Date.now() - lastChatSentRef.current < 500) return
  lastChatSentRef.current = Date.now()

  await push(ref(database, "rooms/" + roomCode + "/chat"), {
    from: user.uid,
    text: clean,
    ts: Date.now()
  })
}

  /* NOT A MEMBER */
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

  /* MY HAND */
  useEffect(() => {
    if (!roomCode || !user) return

    const handRef = ref(database, "rooms/" + roomCode + "/hands/" + user.uid)

    const unsubscribe = onValue(
      handRef,
      snapshot => {
        const raw = snapshot.val()
        if (Array.isArray(raw)) setMyHand(raw)
        else if (raw && typeof raw === "object") setMyHand(Object.values(raw))
        else setMyHand([])
      },
      error => {
        console.error("HAND LISTENER ERROR", error)
        setMessage("Can't read hand: " + error.message)
      }
    )

    return () => unsubscribe()
  }, [roomCode, user])

  /* PRESENCE — online */
  useEffect(() => {
    if (!roomCode || !user) return

    const myPresenceRef = ref(database, "rooms/" + roomCode + "/presence/" + user.uid)

    set(myPresenceRef, { online: true, lastSeen: serverTimestamp() })
    onDisconnect(myPresenceRef).update({ online: false, lastSeen: serverTimestamp() })
  }, [roomCode, user])

  /* PRESENCE — delete room when last player goes */
  useEffect(() => {
    if (!roomCode || !user || !opponentUid) return

    const roomRef = ref(database, "rooms/" + roomCode)

    if (opponentState === "online") onDisconnect(roomRef).cancel()
    else onDisconnect(roomRef).remove()
  }, [roomCode, user, opponentUid, opponentState])

  /* PRESENCE — notices */
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

    if (opponentState === "online") setOpponentLeft(false)

    prevOpponentStateRef.current = opponentState
  }, [opponentState])

  /* OPPONENT HAND */
  useEffect(() => {
    if (!roomCode || !opponentUid) return

    const opponentHandRef = ref(database, "rooms/" + roomCode + "/hands/" + opponentUid)

    const unsubscribe = onValue(opponentHandRef, snapshot => {
      const raw = snapshot.val()
      if (Array.isArray(raw)) setOpponentHand(raw)
      else if (raw && typeof raw === "object") setOpponentHand(Object.values(raw))
      else setOpponentHand([])
    })

    return () => unsubscribe()
  }, [roomCode, opponentUid])

  /* NEW GAME — reset local UI */
  const gameStatus = game?.status

  useEffect(() => {
    if (gameStatus === "playing") {
      setSortMode(null)
      setSelectedCards([])
      setNewlyDrawnCard(null)
      setGroups([])
    }
  }, [gameStatus])

  useEffect(() => {
    if (newlyDrawnCard && !myHand.includes(newlyDrawnCard)) setNewlyDrawnCard(null)
  }, [myHand, newlyDrawnCard])

  useEffect(() => {
    if (game && user && game.currentTurn !== user.uid) setNewlyDrawnCard(null)
  }, [game && game.currentTurn, user])

  /* OPPONENT DISCARD / TAKE ANIMATION */
  useEffect(() => {
    if (!game) { prevDiscardRef.current = null; return }

    const d = game.discard || []
    const prev = prevDiscardRef.current
    prevDiscardRef.current = d

    if (!prev || !user || game.status !== "playing") return

    if (d.length === prev.length + 1 && game.lastDiscarder !== user.uid) {
      flyCard({
        source: $(".opponent .card"),
        getTarget: () => $('[data-fly="discard"]')
      })
    } else if (d.length === prev.length - 1 && game.currentTurn !== user.uid) {
      flyCard({
        source: $(".opponent .card"),
        fromRect: $('[data-fly="discard"]')?.getBoundingClientRect(),
        getTarget: () => $(".opponent .cards")
      })
    }
  }, [game?.discard])

  /* OPPONENT DRAW ANIMATION */
useEffect(() => {
  if (!game) { prevDeckLenRef.current = null; return }

  const len = game.deck?.length ?? 0
  const prev = prevDeckLenRef.current
  prevDeckLenRef.current = len

  if (prev === null || !user || game.status !== "playing") return

  if (len === prev - 1 && game.currentTurn !== user.uid) {
    flyCard({
      source: $('[data-fly="deck"]'),
      getTarget: () => $(".opponent .cards")
    })
  }
}, [game?.deck?.length])

  /* LEAVE ROOM */
  async function leaveRoom() {
    if (!roomCode || !user) return

    leavingRef.current = true

    const myPresenceRef = ref(database, "rooms/" + roomCode + "/presence/" + user.uid)
    const roomRef = ref(database, "rooms/" + roomCode)

    try {
      await onDisconnect(myPresenceRef).cancel()
      await onDisconnect(roomRef).cancel()

      if (!opponentUid || opponentState !== "online") await remove(roomRef)
      else await remove(myPresenceRef)
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
    setGroups([])
    setPresence({})
    setMessage("You left the room")
  }

  /* CREATE ROOM */
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

  /* JOIN ROOM */
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

  /* START GAME */
  async function startGame(code, player1, player2, forcedStarter = null) {
    const deck = createDeck()
    shuffleDeck(deck)

    const starter = forcedStarter || (Math.random() < 0.5 ? player1 : player2)

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
      deck,
      discard: [],
      starter,
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

  /* SHARED HELPERS */
 function applyScores(updates, winner) {
  const old = room?.scores || {}
  const next = {}

  for (const uid of [room.player1, room.player2]) {
    const cur = {
      wins: 0, losses: 0, ties: 0, streak: 0, loseStreak: 0,
      ...(old[uid] || {})
    }

    if (winner === "tie") {
      next[uid] = { ...cur, ties: cur.ties + 1, streak: 0, loseStreak: 0 }
    } else if (winner === uid) {
      next[uid] = { ...cur, wins: cur.wins + 1, streak: cur.streak + 1, loseStreak: 0 }
    } else {
      next[uid] = { ...cur, losses: cur.losses + 1, streak: 0, loseStreak: cur.loseStreak + 1 }
    }
  }

  updates["scores"] = next
}

  function applyWinIfEmpty(updates, newHand) {
    if (newHand.length === 0) {
      updates["game/status"] = "finished"
      updates["game/winner"] = user.uid
      updates["game/winReason"] = "emptyHand"
      applyScores(updates, user.uid)
    }
  }

  function bump(updates, key, amount = 1) {
    updates["game/stats/" + user.uid + "/" + key] =
      getStat(game, user.uid, key) + amount
  }

 /* GROUPS (manual: whatever the player selected) */
const activeGroups = groups
  .map(g => g.filter(c => myHand.includes(c)))
  .filter(g => g.length >= 2)

async function groupHand() {
  if (selectedCards.length < 2) {
    warn("Select 2 or more cards to group")
    return
  }

  const picked = myHand.filter(c => selectedCards.includes(c))

  // remove picked cards from any existing group, drop groups that shrink below 2
  const kept = activeGroups
    .map(g => g.filter(c => !picked.includes(c)))
    .filter(g => g.length >= 2)

  const next = [...kept, picked]
  const grouped = new Set(next.flat())
  const rest = myHand.filter(c => !grouped.has(c))

  setSortMode(null)
  setGroups(next)
  setSelectedCards([])
  await applySortedHand([...rest, ...next.flat()])
  setMessage("Cards grouped")
}

function ungroupSelected() {
  if (selectedCards.length === 0) {
    setGroups([])
    setMessage("Groups cleared")
    return
  }
  setGroups(
    activeGroups
      .map(g => g.filter(c => !selectedCards.includes(c)))
      .filter(g => g.length >= 2)
  )
  setSelectedCards([])
}

  /* CREATE MELD */
async function createMeld(cardsOverride) {
  // a drag passes its own card list; the MELD button passes a click event, so ignore that
  const cards = Array.isArray(cardsOverride) ? cardsOverride : selectedCards

  if (!game || !user) return
  if (game.status === "finished") return

  if (game.currentTurn !== user.uid) {
    setMessage("It's not your turn")
    return
  }
  if (game.phase !== "discard") {
    warn("Draw a card first")
    return
  }
  if (cards.length < 3) {
    setMessage("Select at least 3 cards")
    return
  }
  if (!isValidMeld(cards)) {
    setMessage("Those cards do not form a valid meld")
    return
  }
  if (game.mustMeld && !cards.includes(game.mustMeld)) {
    setMessage("Your meld must include the card you took: " + game.mustMeld)
    return
  }

  const newMeld = {
    id: Date.now().toString(),
    owner: user.uid,
    cards: sortMeldCards(cards)
  }

  const newHand = myHand.filter(card => !cards.includes(card))
  const updatedMelds = mergeMelds([...(game.melds || []), newMeld])

  const updates = {
    ["hands/" + user.uid]: newHand,
    "game/melds": updatedMelds,
    "game/mustMeld": null
  }

  bump(updates, "melds", 1)
  bump(updates, "cardsMelded", cards.length)
  applyWinIfEmpty(updates, newHand)

  cards.forEach((c, i) =>
    flyCard({
      source: $card(c),
      delay: i * 60,
      getTarget: () => $(`[data-meld-id="${newMeld.id}"]`) || $(".meld-list")
    })
  )

  await update(ref(database, "rooms/" + roomCode), updates)

  setSelectedCards([])
  setMessage(newHand.length === 0 ? "You emptied your hand!" : "Meld created!")
}

  /* ADD TO MELD */
 async function addToMeld(meldId, cardArg) {

  
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
    
    if (!cardArg && selectedCards.length !== 1) {
    setMessage("Select one card to add")
    return
  }
    const card = cardArg || selectedCards[0]

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

    if (game.mustMeld === card) updates["game/mustMeld"] = null

    bump(updates, "layoffs", 1)
    bump(updates, "cardsMelded", 1)
    applyWinIfEmpty(updates, newHand)

    flyCard({
      source: $card(card),
      getTarget: () => $(`[data-meld-id="${meldId}"]`) || $(".meld-list")
    })

    await update(ref(database, "rooms/" + roomCode), updates)

    setSelectedCards([])
    setMessage(newHand.length === 0 ? "You emptied your hand!" : "Card added to meld!")
  }

  /* SELECT CARD */
  function toggleCard(card) {
    if (!game || !user) return
    if (game.status === "finished") return
    

    setSelectedCards(previous =>
      previous.includes(card)
        ? previous.filter(item => item !== card)
        : [...previous, card]
    )
  }

  /* DISCARD */
  async function performDiscard(card, fromRect) {
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

    flyCard({
      source: $card(card),
      fromRect,
      getTarget: () => $('[data-fly="discard"]')
    })

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

  /* END GAME BY LOWEST COUNT */
  async function endGameByLowestCount() {
    const handsSnapshot = await get(ref(database, "rooms/" + roomCode + "/hands"))
    const hands = handsSnapshot.val() || {}

    const p1Value = getHandValue(hands[room.player1] || [])
    const p2Value = getHandValue(hands[room.player2] || [])

    let winner
    if (p1Value < p2Value) winner = room.player1
    else if (p2Value < p1Value) winner = room.player2
    else winner = "tie"

    const updates = {
      "game/status": "finished",
      "game/winner": winner,
      "game/winReason": "lowestCount"
    }
    applyScores(updates, winner)

    await update(ref(database, "rooms/" + roomCode), updates)
  }

  /* DRAW */
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
    flyCard({
  source: $('[data-fly="deck"]'),
  getTarget: () => $card(card),
  hideTarget: true
})
    await update(ref(database, "rooms/" + roomCode), updates)

    setNewlyDrawnCard(card)
    setMessage("Card drawn!")

    setTimeout(() => setDrawing(false), 500)
  }

  /* TAKE DISCARD */
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

    flyCard({
      source: $('[data-fly="discard"]'),
      getTarget: () => $card(card),
      hideTarget: true
    })

    await update(ref(database, "rooms/" + roomCode), updates)

    setNewlyDrawnCard(card)
    setSelectedCards([card])
    setMessage("You took " + card)
  }

  /* REMATCH */
  async function requestRematch() {
    if (!roomCode || !user) return

    await set(ref(database, "rooms/" + roomCode + "/rematch"), {
      requestedBy: user.uid,
      status: "pending"
    })
  }

  async function acceptRematch() {
    if (!roomCode || !room) return

    let loser = null
    if (game?.winner && game.winner !== "tie") {
      loser = game.winner === room.player1 ? room.player2 : room.player1
    }

    await startGame(roomCode, room.player1, room.player2, loser)
    setSelectedCards([])
    setMessage("Rematch started!")
  }

  async function declineRematch() {
    if (!roomCode) return
    await update(ref(database, "rooms/" + roomCode + "/rematch"), { status: "declined" })
  }

  async function cancelRematch() {
    if (!roomCode) return
    await remove(ref(database, "rooms/" + roomCode + "/rematch"))
  }

  /* DRAG */
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

      await performDiscard(active.id, active.rect.current.translated)
      return
    }
    if (String(over.id).startsWith("meld:")) {
  await addToMeld(String(over.id).slice(5), active.id)
  return
}
if (over.id === "new-meld") {
  const cards = selectedCards.includes(active.id)
    ? selectedCards
    : [...selectedCards, active.id]
  await createMeld(cards)
  return
}
    if (active.id === over.id) return

    const oldIndex = myHand.indexOf(active.id)
    const newIndex = myHand.indexOf(over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(myHand, oldIndex, newIndex)

    setSortMode(null)
    setGroups([])
    setMyHand(reordered)

    await set(ref(database, "rooms/" + roomCode + "/hands/" + user.uid), reordered)
  }

  /* SORT */
  async function applySortedHand(sorted) {
    setMyHand(sorted)

    if (roomCode && user) {
      await set(ref(database, "rooms/" + roomCode + "/hands/" + user.uid), sorted)
    }
  }

  function sortHandBySuit() {
    setSortMode("suit")
    setGroups([])
    applySortedHand(sortHandByMode(myHand, "suit"))
    setMessage("Hand sorted by suit")
  }

  function sortHandByRank() {
    setSortMode("rank")
    setGroups([])
    applySortedHand(sortHandByMode(myHand, "rank"))
    setMessage("Hand sorted highest to lowest")
  }

  const isMyTurn = game && user && game.currentTurn === user.uid

  const myScore = room?.scores?.[user?.uid] || {}
  const oppScore = room?.scores?.[opponentUid] || {}
  const scoreboard = {
    me: myScore.wins || 0,
    opp: oppScore.wins || 0,
    myStreak: myScore.streak || 0
  }

  const starterName =
    game && room
      ? game.starter === room.player1 ? "Player 1" : "Player 2"
      : ""

  const discardPile = game?.discard || []

  return {
    roomCode, inputCode, setInputCode, message, toast,
    dismissToast: () => setToast(null),
    room, game, myHand, opponentHand,
    opponentCount: opponentHand.length,
    selectedCards, setSelectedCards, drawing,
    showDiscardHistory, setShowDiscardHistory,
    sortMenuOpen, setSortMenuOpen, newlyDrawnCard,
    activeDragCard: activeDragId,
    user, sensors,
    createRoom, joinRoom, createMeld, addToMeld, toggleCard,
    discardSelected, drawCard, takeDiscard, canTakeDiscard,
    handleDragStart, handleDragEnd, handleDragCancel,
    sortHandBySuit, sortHandByRank,
    isMyTurn,
    requestRematch, acceptRematch, declineRematch, cancelRematch,
    starterName, discardPile, leaveRoom, opponentLeft,
    opponentDisconnected: opponentState === "offline",
    scoreboard,
    activeEmote, sendEmote,
    groups: activeGroups, groupHand, ungroupSelected,
    chatMessages, chatOpen, setChatOpen, unread, sendChat
  }
}