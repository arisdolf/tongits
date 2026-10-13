import { auth, database } from "./firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser
} from "firebase/auth"
import { ref, get, set, runTransaction } from "firebase/database"

const key = name => name.trim().toLowerCase()
const toEmail = name => key(name) + "@tongits.app"

export async function isUsernameAvailable(name) {
  const snap = await get(ref(database, "usernames/" + key(name)))
  return !snap.exists()
}

export async function register(username, password) {
  username = username.trim()
  if (!/^[A-Za-z0-9_]{3,12}$/.test(username))
    throw new Error("Username: 3-12 letters, numbers or _")
  if (password.length < 8)
    throw new Error("Password must be at least 8 characters")

  const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password)
  const uid = cred.user.uid

  try {
    // rules reject this if the name already exists, so two people can't grab it at once
    await set(ref(database, "usernames/" + key(username)), uid)
  } catch {
    await deleteUser(cred.user)
    throw new Error("That username is taken, please choose another")
  }

  await updateProfile(cred.user, { displayName: username })
  await set(ref(database, "users/" + uid), {
    username, wins: 0, losses: 0, ties: 0, gamesPlayed: 0, bestStreak: 0
  })
  return { username }
}

export async function login(username, password) {
  try {
    await signInWithEmailAndPassword(auth, toEmail(username), password)
  } catch {
    throw new Error("Wrong username or password")
  }
}

export async function logOut() {
  await signOut(auth) // firebase.js signs back in as a guest
}

export async function getMyProfile() {
  const snap = await get(ref(database, "users/" + auth.currentUser.uid))
  return snap.val()
}

export async function recordGameResult(roomCode, game, room) {
  const uid = auth.currentUser.uid

  // count each game once per player
  const flag = ref(database, `rooms/${roomCode}/game/counted/${uid}`)
  const tx = await runTransaction(flag, cur => (cur ? undefined : true))
  if (!tx.committed) return

  const result = game.winner === "tie" ? "tie" : game.winner === uid ? "win" : "loss"
  const streak = room.scores?.[uid]?.streak || 0

  await runTransaction(ref(database, "users/" + uid), cur => {
    const u = cur || { wins: 0, losses: 0, ties: 0, gamesPlayed: 0, bestStreak: 0 }
    return {
      ...u,
      wins: (u.wins || 0) + (result === "win" ? 1 : 0),
      losses: (u.losses || 0) + (result === "loss" ? 1 : 0),
      ties: (u.ties || 0) + (result === "tie" ? 1 : 0),
      gamesPlayed: (u.gamesPlayed || 0) + 1,
      bestStreak: Math.max(u.bestStreak || 0, streak)
    }
  })
}