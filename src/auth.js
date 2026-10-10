import { auth } from "./firebase"
import { signInWithCustomToken, signOut } from "firebase/auth"

const API = import.meta.env.VITE_API_URL

async function post(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Something went wrong")
  return data
}

export async function register(username, password) {
  const { token, user } = await post("/api/register", { username, password })
  await signInWithCustomToken(auth, token)
  return user
}

export async function login(username, password) {
  const { token, user } = await post("/api/login", { username, password })
  await signInWithCustomToken(auth, token)
  return user
}

export async function logOut() {
  await signOut(auth) // the listener in firebase.js signs back in as a guest
}

export async function authedFetch(path, options = {}) {
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...options.headers
    }
  })
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}