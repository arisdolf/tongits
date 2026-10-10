import { useState, useEffect } from "react"
import { register, login, logOut, authedFetch } from "../auth"

function AuthBox({ firebaseUser, setUsername }) {
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState(false)
  const [account, setAccount] = useState(null)

  const loggedIn = !!firebaseUser && !firebaseUser.isAnonymous

  // load the profile whenever we become logged in
  useEffect(() => {
    if (!loggedIn) { setAccount(null); return }
    authedFetch("/api/me")
      .then(me => { setAccount(me); setUsername(me.username) })
      .catch(() => {})
  }, [loggedIn, firebaseUser?.uid])

  // live "is this username taken?" check (register mode only)
  useEffect(() => {
    setTaken(false)
    if (mode !== "register" || !/^[A-Za-z0-9_]{3,12}$/.test(name)) return

    const timer = setTimeout(() => {
      fetch(import.meta.env.VITE_API_URL + "/api/username-available?name=" + encodeURIComponent(name))
        .then(r => r.json())
        .then(d => setTaken(!d.available))
        .catch(() => {})
    }, 400)

    return () => clearTimeout(timer)
  }, [name, mode])

  async function submit(e) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      if (mode === "login") await login(name, password)
      else await register(name, password)
      setPassword("")
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (loggedIn) {
    return (
      <div className="auth-box">
        <p className="auth-name">Signed in as <strong>{account?.username || "..."}</strong></p>
        {account && (
          <p className="auth-stats">
            {account.wins}W · {account.losses}L · {account.ties}T · best streak {account.bestStreak}
          </p>
        )}
        <button onClick={logOut}>Log out</button>
      </div>
    )
  }

  return (
    <form className="auth-box" onSubmit={submit}>
      <input
        placeholder="username"
        value={name}
        maxLength={12}
        autoComplete="username"
        onChange={e => setName(e.target.value)}
        required
      />
      {mode === "register" && taken && (
        <p className="auth-error">That username is taken, please choose another</p>
      )}

      <input
        type="password"
        placeholder="password (8+ characters)"
        value={password}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        onChange={e => setPassword(e.target.value)}
        required
      />

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={busy || (mode === "register" && taken)}>
        {mode === "login" ? "Log in" : "Create account"}
      </button>

      <button
        type="button"
        className="auth-switch"
        onClick={() => { setMode(m => (m === "login" ? "register" : "login")); setError("") }}
      >
        {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
      </button>

      <p className="auth-guest">Or just enter a name below and play as a guest.</p>
    </form>
  )
}

export default AuthBox