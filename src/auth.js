import { auth, database } from "./firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser
} from "firebase/auth"
import { ref, get, set, remove, runTransaction } from "firebase/database"

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

  // random email, so an old name can never collide with an existing Auth account
  const email = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@tongits.app`
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid

  try {
    await set(ref(database, "usernames/" + key(username)), uid)
  } catch {
    await deleteUser(cred.user)
    throw new Error("That username is taken, please choose another")
  }

  await set(ref(database, "emails/" + uid), email)
  await updateProfile(cred.user, { displayName: username })
  await set(ref(database, "users/" + uid), {
    username, wins: 0, losses: 0, ties: 0, gamesPlayed: 0, bestStreak: 0
  })
  return { username }
}

export async function login(username, password) {
  let email = toEmail(username) // old accounts fall back to this

  try {
    const uidSnap = await get(ref(database, "usernames/" + key(username)))
    if (uidSnap.exists()) {
      const emailSnap = await get(ref(database, "emails/" + uidSnap.val()))
      if (emailSnap.exists()) email = emailSnap.val()
    }
  } catch { /* use the fallback */ }

  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch {
    throw new Error("Wrong username or password")
  }
}

export async function changeUsername(newName) {
  newName = newName.trim()
  if (!/^[A-Za-z0-9_]{3,12}$/.test(newName))
    throw new Error("Username: 3-12 letters, numbers or _")

  const user = auth.currentUser
  const uid = user.uid

  const oldSnap = await get(ref(database, `users/${uid}/username`))
  const oldName = oldSnap.val() || ""

  if (newName === oldName) throw new Error("That's already your username")

  const sameKey = key(newName) === key(oldName) // only the capitalisation changed

  // claim the new name first (rules reject it if someone already has it)
  if (!sameKey) {
    try {
      await set(ref(database, "usernames/" + key(newName)), uid)
    } catch {
      throw new Error("That username is taken, please choose another")
    }
  }

  try {
    // remember the real login email (old accounts don't have this yet)
    await set(ref(database, "emails/" + uid), user.email)
    await set(ref(database, `users/${uid}/username`), newName)
    await updateProfile(user, { displayName: newName })
  } catch {
    if (!sameKey) await remove(ref(database, "usernames/" + key(newName))).catch(() => {})
    throw new Error("Couldn't change your username, try again")
  }

  // release the old name
  if (!sameKey && oldName) {
    await remove(ref(database, "usernames/" + key(oldName))).catch(() => {})
  }

  return newName
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