import { buildGameReport } from "../utils/stats"
import "../styles/Modal.css"
import "../styles/WinModal.css"
import { useState, useEffect } from "react"

function WinModal({
  game,
  room,
  currentUserId,
  myHand,
  opponentHand,
  opponentGone,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onCancelRematch,
  onLeave,
  myName = "YOU", opponentName = "OPP"
}) {

  const [musicOn, setMusicOn] = useState(true)

  const finished = !!game && game.status === "finished" && !!room

  /* music (uses live data, so it stops as soon as the new round starts) */
  const liveWon = finished && game.winner === currentUserId
  const liveTie = finished && game.winner === "tie"
  const liveStreak = room?.scores?.[currentUserId]?.streak || 0
  const liveLoseStreak = room?.scores?.[currentUserId]?.loseStreak || 0
  const playMusic = liveWon && liveStreak >= 2 && musicOn
  const playLoseMusic = finished && !liveWon && !liveTie && liveLoseStreak >= 2 && musicOn

  useEffect(() => {
    if (!playMusic) return
    const audio = new Audio(import.meta.env.BASE_URL + "audio/streak.mp3")
    audio.loop = true
    audio.volume = 0.6
    audio.play().catch(() => { })
    return () => { audio.pause(); audio.currentTime = 0 }
  }, [playMusic])

  useEffect(() => {
    if (!playLoseMusic) return
    const audio = new Audio(import.meta.env.BASE_URL + "audio/losestreak.mp3")
    audio.loop = true
    audio.volume = 0.6
    audio.play().catch(() => { })
    return () => { audio.pause(); audio.currentTime = 0 }
  }, [playLoseMusic])

  // Unmount as soon as a rematch starts. Keeping a snapshot for an exit
  // animation briefly covered the new deal with the previous result screen.
  if (!finished) return null

  const d = { game, room, myHand, opponentHand, opponentGone, myName, opponentName }
  const g = d.game
  const r = d.room

  const iWon = g.winner === currentUserId
  const isTie = g.winner === "tie"
  const myStreak = r.scores?.[currentUserId]?.streak || 0
  const myLoseStreak = r.scores?.[currentUserId]?.loseStreak || 0

  const opponentUid = r.player1 === currentUserId ? r.player2 : r.player1
  const myScore = r.scores?.[currentUserId] || {}
  const oppScore = r.scores?.[opponentUid] || {}
  const oppStreak = oppScore.streak || 0

  const { me, opp } = buildGameReport({
    game: g,
    myUid: currentUserId,
    oppUid: opponentUid,
    myHand: d.myHand,
    opponentHand: d.opponentHand
  })

  const title = isTie ? "IT'S A TIE!" : iWon ? " eyy panalo " : "lala talo"

  const reason =
    g.winReason === "emptyHand"
      ? (iWon ? "You emptied your hand first!" : "Opponent emptied their hand first.")
      : isTie
        ? "Equal card values when the deck ran out."
        : "Lowest card total when the deck ran out."

  const rows = [
    ["Points left in hand", me.pointsLeft, opp.pointsLeft],
    ["Melds made", me.melds, opp.melds],
    ["Cards melded", me.cardsMelded, opp.cardsMelded],
    ["Lay-offs", me.layoffs, opp.layoffs],
    ["Discards taken", me.takes, opp.takes],
    ["Cards drawn", me.draws, opp.draws],
    ["Cards discarded", me.discards, opp.discards]
  ]

  /* REMATCH */
  const rematch = r.rematch
  const iRequested = rematch?.requestedBy === currentUserId
  let rematchSection

  if (d.opponentGone) {
    rematchSection = (
      <>
        <p className="rematch-note">Your opponent left the room.</p>
        <button className="rematch-button" onClick={onLeave}>LEAVE ROOM</button>
      </>
    )
  } else if (rematch?.status === "pending" && iRequested) {
    rematchSection = (
      <>
        <p className="rematch-note">Waiting for opponent to accept…</p>
        <button className="rematch-button secondary" onClick={onCancelRematch}>CANCEL</button>
      </>
    )
  } else if (rematch?.status === "pending") {
    rematchSection = (
      <>
        <p className="rematch-note">Opponent wants a rematch!</p>
        <div className="rematch-row">
          <button className="rematch-button" onClick={onAcceptRematch}>ACCEPT</button>
          <button className="rematch-button secondary" onClick={onDeclineRematch}>DECLINE</button>
        </div>
      </>
    )
  } else {
    rematchSection = (
      <>
        {rematch?.status === "declined" && (
          <p className="rematch-note">
            {iRequested ? "Opponent declined the rematch." : "You declined the rematch."}
          </p>
        )}
        <button className="rematch-button" onClick={onRequestRematch}>
          {rematch?.status === "declined" ? "ASK AGAIN" : "REMATCH"}
        </button>
      </>
    )
  }

  return (
    <div className="modal-overlay win-overlay">

      <div className="modal-panel win-panel">

        <div className="win-title">{title}</div>
        <p className="win-reason">{reason}</p>
        <div className="win-score">
          {d.myName} {myScore.wins || 0} – {oppScore.wins || 0} {d.opponentName}
        </div>

        {iWon && myStreak >= 2 && (
          <div className="streak-banner">
            🔥 {myStreak} win streak!
            <button className="music-toggle" onClick={() => setMusicOn(m => !m)}>
              {musicOn ? "🔊" : "🔇"}
            </button>
          </div>
        )}

        {!iWon && !isTie && myLoseStreak >= 2 && (
          <div className="streak-banner opp">
            💀 {myLoseStreak} loss streak
            <button className="music-toggle" onClick={() => setMusicOn(m => !m)}>
              {musicOn ? "🔊" : "🔇"}
            </button>
          </div>
        )}

        {!iWon && !isTie && myLoseStreak < 2 && oppStreak >= 2 && (
          <div className="streak-banner opp">{d.opponentName} is on a {oppStreak} win streak</div>
        )}

        <div className="ratings">
          <div className="rating">
            <div className="rating-name">{d.myName}</div>
            <div className={"rating-grade grade-" + me.grade}>{me.grade}</div>
            <div className="rating-score">{me.score}/100 · {me.label}</div>
          </div>
          <div className="rating">
            <div className="rating-name">{d.opponentName}</div>
            <div className={"rating-grade grade-" + opp.grade}>{opp.grade}</div>
            <div className="rating-score">{opp.score}/100 · {opp.label}</div>
          </div>
        </div>

        <p className="rating-tip">💡 {me.tip}</p>

        <table className="stats-table">
          <thead>
            <tr>
              <th></th>
              <th>{d.myName}</th>
              <th>{d.opponentName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, mine, theirs]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{mine}</td>
                <td>{theirs}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="win-actions">
          {rematchSection}
          {!d.opponentGone && (
            <button className="rematch-button leave-link" onClick={onLeave}>
              LEAVE ROOM
            </button>
          )}
        </div>
      </div>

    </div>
  )
}

export default WinModal
