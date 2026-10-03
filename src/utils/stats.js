import { getHandValue } from "./cardUtils"

const GRADES = [
  { min: 85, grade: "S", label: "Master" },
  { min: 70, grade: "A", label: "Great" },
  { min: 55, grade: "B", label: "Good" },
  { min: 40, grade: "C", label: "Okay" },
  { min: 0,  grade: "D", label: "Needs practice" }
]

export const emptyStats = () => ({
  draws: 0,
  takes: 0,
  melds: 0,
  layoffs: 0,
  cardsMelded: 0,
  discards: 0
})

export function getStat(game, uid, key) {
  return game?.stats?.[uid]?.[key] || 0
}

/*
 * Rating (0–100):
 *   40  meld efficiency  – cards melded / cards you handled
 *   35  low leftover     – fewer points left in hand
 *   15  smart plays      – lay-offs + useful discards taken (max 5)
 *   10  win bonus
 */
function summarizePlayer(game, uid, hand) {
  const s = game.stats?.[uid] || {}

  const draws = s.draws || 0
  const takes = s.takes || 0
  const melds = s.melds || 0
  const layoffs = s.layoffs || 0
  const cardsMelded = s.cardsMelded || 0
  const discards = s.discards || 0

  const startSize = game.starter === uid ? 13 : 12
  const handled = startSize + draws + takes
  const pointsLeft = getHandValue(hand || [])

  const meldEfficiency = handled > 0 ? Math.min(cardsMelded / handled, 1) : 0
  const lowLeft = 1 - Math.min(pointsLeft, 50) / 50
  const smart = Math.min(layoffs + takes, 5) / 5
  const won = game.winner === uid

  const raw = 40 * meldEfficiency + 35 * lowLeft + 15 * smart + (won ? 10 : 0)
  const score = Math.max(0, Math.min(100, Math.round(raw)))
  const { grade, label } = GRADES.find(g => score >= g.min)

  const parts = [
    { v: meldEfficiency, tip: "Form melds earlier — cards sitting in your hand cost you points." },
    { v: lowLeft,        tip: "Discard your high cards (J, Q, K) sooner to keep your points low." },
    { v: smart,          tip: "Use lay-offs and take useful discards to go out faster." }
  ]
  const weakest = parts.reduce((a, b) => (b.v < a.v ? b : a))

  return {
    pointsLeft, draws, takes, melds, layoffs, cardsMelded, discards,
    score, grade, label,
    tip: score >= 85 ? "Excellent game — hard to improve on that." : weakest.tip
  }
}

export function buildGameReport({ game, myUid, oppUid, myHand, opponentHand }) {
  return {
    me: summarizePlayer(game, myUid, myHand),
    opp: summarizePlayer(game, oppUid, opponentHand)
  }
}