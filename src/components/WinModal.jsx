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
  const iWon = finished && game.winner === currentUserId
  const myStreak = room?.scores?.[currentUserId]?.streak || 0
  const myLoseStreak = room?.scores?.[currentUserId]?.loseStreak || 0
  const isTie = finished && game.winner === "tie"
  const playMusic = iWon && myStreak >= 2 && musicOn
  const playLoseMusic = finished && !iWon && !isTie && myLoseStreak >= 2 && musicOn

  useEffect(() => {
    if (!playMusic) return

    const audio = new Audio(import.meta.env.BASE_URL + "audio/streak.mp3")
    audio.loop = true
    audio.volume = 0.6
    audio.play().catch(() => { })

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [playMusic])

  useEffect(() => {
  if (!playLoseMusic) return

  const audio = new Audio(import.meta.env.BASE_URL + "audio/losestreak.mp3")
  audio.loop = true
  audio.volume = 0.6
  audio.play().catch(() => {})

  return () => {
    audio.pause()
    audio.currentTime = 0
  }
}, [playLoseMusic])

  if (!finished) return null



 


  const opponentUid =
    room.player1 === currentUserId ? room.player2 : room.player1

  const myScore = room.scores?.[currentUserId] || {}
  const oppScore = room.scores?.[opponentUid] || {}
  const oppStreak = oppScore.streak || 0

  const { me, opp } = buildGameReport({
    game,
    myUid: currentUserId,
    oppUid: opponentUid,
    myHand,
    opponentHand
  })

  const title = isTie
    ? "IT'S A TIE!"
    : iWon
      ? " eyy panalo "
      : "lala talo"

  const reason =
    game.winReason === "emptyHand"
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
  const rematch = room.rematch
  const iRequested = rematch?.requestedBy === currentUserId

  let rematchSection

  if (opponentGone) {

    rematchSection = (
      <>
        <p className="rematch-note">Your opponent left the room.</p>
        <button className="rematch-button" onClick={onLeave}>
          LEAVE ROOM
        </button>
      </>
    )

  } else if (rematch?.status === "pending" && iRequested) {

    rematchSection = (
      <>
        <p className="rematch-note">Waiting for opponent to accept…</p>
        <button className="rematch-button secondary" onClick={onCancelRematch}>
          CANCEL
        </button>
      </>
    )

  } else if (rematch?.status === "pending") {

    rematchSection = (
      <>
        <p className="rematch-note">Opponent wants a rematch!</p>
        <div className="rematch-row">
          <button className="rematch-button" onClick={onAcceptRematch}>
            ACCEPT
          </button>
          <button className="rematch-button secondary" onClick={onDeclineRematch}>
            DECLINE
          </button>
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
    <div className="modal-overlay">

      <div className="modal-panel win-panel">

        <div className="win-title">{title}</div>
        <p className="win-reason">{reason}</p>
       <div className="win-score">
  {myName} {myScore.wins || 0} – {oppScore.wins || 0} {opponentName}
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
  <div className="streak-banner opp">{opponentName} is on a {oppStreak} win streak</div>
)}
        <div className="ratings">

          <div className="rating">
            <div className="rating-name">{myName}</div>
            <div className={"rating-grade grade-" + me.grade}>{me.grade}</div>
            <div className="rating-score">{me.score}/100 · {me.label}</div>
          </div>

          <div className="rating">
            <div className="rating-name">{opponentName}</div>
            <div className={"rating-grade grade-" + opp.grade}>{opp.grade}</div>
            <div className="rating-score">{opp.score}/100 · {opp.label}</div>
          </div>

        </div>

        <p className="rating-tip">💡 {me.tip}</p>

        <table className="stats-table">
          <thead>
            <tr>
              <th></th>
              <th>{myName}</th>
<th>{opponentName}</th>
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

          {!opponentGone && (
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