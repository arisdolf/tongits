/*
 * CARD UTILITIES
 * Pure helper functions only — no React, no state, no Firebase.
 * Everything else (components and the game hook) imports
 * whatever it needs from here instead of redefining it.
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
 * CHECK VALID BAHAY
 *
 * Set: 3+ cards with the same value
 * Straight: 3+ consecutive cards, same suit
 */
export function isValidBahay(cards) {

  if (cards.length < 3) {
    return false
  }

  const values = cards.map(getCardValue)
  const suits = cards.map(getCardSuit)

  const sameValue = values.every(value => value === values[0])

  if (sameValue) {
    return true
  }

  const sameSuit = suits.every(suit => suit === suits[0])

  if (!sameSuit) {
    return false
  }

  const sorted = [...values].sort((a, b) => a - b)

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false
    }
  }

  return true

}


/*
 * CHECK IF A CARD CAN BE ADDED TO AN EXISTING BAHAY
 */
export function canAddToBahay(bahay, card) {
  const newCards = [...bahay.cards, card]
  return isValidBahay(newCards)
}
