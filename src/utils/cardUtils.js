/*
 * CARD UTILITIES
 * Pure helper functions only — no React, no state, no Firebase.
 */


export function getHandValue(hand) {
  return hand.reduce((total, card) => total + getCardValue(card), 0)
}

export function getCardRank(card) {
  return card.slice(0, -1)
}

export function getCardSuit(card) {
  return card.slice(-1)
}

export function isRedSuit(suit) {
  return suit === "♥" || suit === "♦"
}

export function getCardValue(card) {

  const value = card.slice(0, -1)

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

export const suitOrder = {
  "♠": 0,
  "♥": 1,
  "♦": 2,
  "♣": 3
}


/*
 * CARD IMAGES
 * Files live in public/cards/frontcards/<suit folder>/<rank><suit letter>.png
 * e.g. public/cards/frontcards/hearts/10h.png
 */
const suitLetters = { "♠": "s", "♥": "h", "♦": "d", "♣": "c" }

const suitFolders = {
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs"
}

// "10♥" -> "10h"
const rankAliases = {
  A: ["A", "a", "ace", "1"],
  J: ["J", "j", "jack", "11"],
  Q: ["Q", "q", "queen", "12"],
  K: ["K", "k", "king", "13"]
}

export function getCardImagePaths(card) {
  const rank = getCardRank(card)
  const suit = getCardSuit(card)
  const folder = "cards/CardsFront/" + suitFolders[suit] + "/"
  const names = rankAliases[rank] || [rank]
  const exts = ["png", "jpg", "jpeg", "webp"]
  const letter = suitLetters[suit]
  const full = suitFolders[suit]

  const paths = []

  for (const ext of exts) {
    for (const name of names) {
      paths.push(folder + name + letter + "." + ext)
      paths.push(folder + name + "_of_" + full + "." + ext)
    }
  }

  for (const ext of exts) {
    for (const name of names) {
      paths.push(folder + name + letter.toUpperCase() + "." + ext)
      paths.push(folder + name + "_of_" + full + "2." + ext)
    }
  }

  return paths
}


/*
 * CREATE DECK
 */
export function createDeck() {

  const suits = ["♠", "♥", "♦", "♣"]

  const values = [
    "A", "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K"
  ]

  const deck = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push(value + suit)
    }
  }

  return deck

}

export function findBestMelds(hand) {
  const cands = []

  // sets (3 or 4 of a kind)
  const byValue = {}
  hand.forEach(c => (byValue[getCardValue(c)] ||= []).push(c))
  for (const cards of Object.values(byValue)) {
    if (cards.length < 3) continue
    cands.push(cards)
    if (cards.length === 4) {
      for (let skip = 0; skip < 4; skip++) {
        cands.push(cards.filter((_, i) => i !== skip))
      }
    }
  }

  // runs (same suit, consecutive, 3+)
  const bySuit = {}
  hand.forEach(c => (bySuit[getCardSuit(c)] ||= []).push(c))
  for (const cards of Object.values(bySuit)) {
    const s = [...cards].sort((a, b) => getCardValue(a) - getCardValue(b))
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 2; j < s.length; j++) {
        const slice = s.slice(i, j + 1)
        if (getCardValue(slice[slice.length - 1]) - getCardValue(slice[0]) === slice.length - 1) {
          cands.push(slice)
        }
      }
    }
  }

  // pick the disjoint combination that gets rid of the most points
  let best = { score: 0, picks: [] }

  function dfs(start, used, picks, score) {
    if (score > best.score) best = { score, picks: [...picks] }
    for (let i = start; i < cands.length; i++) {
      const m = cands[i]
      if (m.some(c => used.has(c))) continue
      m.forEach(c => used.add(c))
      picks.push(m)
      dfs(i + 1, used, picks, score + getHandValue(m))
      picks.pop()
      m.forEach(c => used.delete(c))
    }
  }

  dfs(0, new Set(), [], 0)

  const grouped = new Set(best.picks.flat())
  return {
    groups: best.picks.map(sortMeldCards),
    rest: hand.filter(c => !grouped.has(c))
  }
}


/*
 * SHUFFLE
 */
export function shuffleDeck(deck) {

  for (let i = deck.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1))

    const temp = deck[i]
    deck[i] = deck[j]
    deck[j] = temp

  }

}


/*
 * CHECK VALID MELD
 *
 * Set: 3+ cards with the same value
 * Straight: 3+ consecutive cards, same suit
 */
export function isValidMeld(cards) {

  if (cards.length < 3) return false

  const values = cards.map(getCardValue)
  const suits = cards.map(getCardSuit)

  if (values.every(value => value === values[0])) return true

  if (!suits.every(suit => suit === suits[0])) return false

  const sorted = [...values].sort((a, b) => a - b)

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }

  return true

}

/*
 * CAN A CARD BE ADDED TO AN EXISTING MELD
 */
export function canAddToMeld(meld, card) {
  return isValidMeld([...meld.cards, card])
}

/*
 * CAN THIS CARD GO ON ANY MELD ON THE TABLE
 * (if yes, it can't be discarded)
 */
export function canCardGoOnAnyMeld(melds, card) {
  return (melds || []).some(meld => canAddToMeld(meld, card))
}

/*
 * CAN A CARD FORM A BRAND NEW MELD WITH CARDS IN A HAND
 * (used to decide if the opponent's discard can be taken)
 */
export function canFormMeldWithCard(hand, card) {

  const value = getCardValue(card)
  const suit = getCardSuit(card)

  // Set: need 2 other cards of the same value
  const sameValueCount = hand.filter(c => getCardValue(c) === value).length
  if (sameValueCount >= 2) return true

  // Straight: same suit, run of 3+ that includes the card
  const suitValues = new Set(
    hand.filter(c => getCardSuit(c) === suit).map(getCardValue)
  )

  let left = 0
  while (suitValues.has(value - 1 - left)) left++

  let right = 0
  while (suitValues.has(value + 1 + right)) right++

  return left + right + 1 >= 3

}

/*
 * Sort the cards of a meld: sets by suit, runs low → high
 */
export function sortMeldCards(cards) {
  const values = cards.map(getCardValue)
  const isSet = values.every(v => v === values[0])

  return [...cards].sort((a, b) =>
    isSet
      ? suitOrder[getCardSuit(a)] - suitOrder[getCardSuit(b)]
      : getCardValue(a) - getCardValue(b)
  )
}

/*
 * Sort a hand by mode: "suit" | "rank" | null (leave as is)
 */
export function sortHandByMode(hand, mode) {
  if (mode === "suit") {
    return [...hand].sort((a, b) => {
      const d = suitOrder[getCardSuit(a)] - suitOrder[getCardSuit(b)]
      return d !== 0 ? d : getCardValue(a) - getCardValue(b)
    })
  }

  if (mode === "rank") {
    return [...hand].sort((a, b) => {
      const d = getCardValue(b) - getCardValue(a)
      return d !== 0 ? d : suitOrder[getCardSuit(a)] - suitOrder[getCardSuit(b)]
    })
  }

  return hand
}

/*
 * MERGE MELDS
 * If two melds together form one valid meld (e.g. 3-4-5 and 6-7-8
 * of the same suit), join them into one. Repeats until nothing joins.
 * The merged meld keeps the older meld's id and owner.
 */
export function mergeMelds(melds) {

  const result = [...melds]
  let merged = true

  while (merged) {

    merged = false

    outer:
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {

        const combined = [...result[i].cards, ...result[j].cards]

        if (isValidMeld(combined)) {
          result[i] = { ...result[i], cards: sortMeldCards(combined) }
          result.splice(j, 1)
          merged = true
          break outer
        }

      }
    }

  }

  return result

}