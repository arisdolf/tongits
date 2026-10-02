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
export function getCardImageName(card) {
  return getCardRank(card) + suitLetters[getCardSuit(card)]
}

// "10♥" -> "cards/frontcards/hearts/10h.png"
export function getCardImagePath(card) {
  return (
    "cards/CardsFront/" +
    suitFolders[getCardSuit(card)] +
    "/" +
    getCardImageName(card) +
    ".png"
  )
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