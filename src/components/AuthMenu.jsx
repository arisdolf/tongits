import { useState, useEffect } from "react"
import { register, login, logOut, authedFetch } from "../auth"
import "../styles/AuthMenu.css"

function AuthMenu({ firebaseUser, setUsername }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  // close the popup once login succeeds
  useEffect(() => {
    if (loggedIn) { setModalOpen(false); setMenuOpen(false) }
  }, [loggedIn])

  // Esc closes the popup
  useEffect(() => {
    if (!modalOpen) return
    const onKey = e => e.key === "Escape" && setModalOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [modalOpen])

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

  function openModal(m) {
    setMode(m)
    setError("")
    setModalOpen(true)
  }

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

  async function handleLogOut() {
    setMenuOpen(false)
    setUsername("")
    await logOut()
  }

  /* ---------- LOGGED IN: username chip + dropdown ---------- */
  if (loggedIn) {
    return (
      <div className="auth-menu">
        {menuOpen && <div className="auth-backdrop" onClick={() => setMenuOpen(false)} />}

        <button className="auth-chip" onClick={() => setMenuOpen(o => !o)}>
          👤 {account?.username || "..."} ▾
        </button>

        {menuOpen && (
          <div className="auth-dropdown">
            <p className="auth-name"><strong>{account?.username || "..."}</strong></p>
            {account && (
              <p className="auth-stats">
                {account.wins}W · {account.losses}L · {account.ties}T
                <br />
                best streak {account.bestStreak}
              </p>
            )}
            <button className="auth-logout" onClick={handleLogOut}>Log out</button>
          </div>
        )}
      </div>
    )
  }

  /* ---------- LOGGED OUT: button + popup ---------- */
  return (
    <div className="auth-menu">
      <button className="auth-chip" onClick={() => openModal("login")}>
        LOG IN / SIGN UP
      </button>

      {modalOpen && (
        <div className="auth-overlay" onClick={() => setModalOpen(false)}>
          <form
            className="auth-modal"
            onClick={e => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => { setMode("login"); setError("") }}
              >
                LOG IN
              </button>
              <button
                type="button"
                className={mode === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => { setMode("register"); setError("") }}
              >
                SIGN UP
              </button>
              <button
                type="button"
                className="auth-x"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

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

            <button
              type="submit"
              className="auth-submit"
              disabled={busy || (mode === "register" && taken)}
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>

            <p className="auth-guest">
              No account? Close this and play as a guest.
            </p>
          </form>
        </div>
      )}
    </div>
  )
}

export default AuthMenu