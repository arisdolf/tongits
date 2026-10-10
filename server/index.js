import "dotenv/config"
import express from "express"
import cors from "cors"
import bcrypt from "bcrypt"
import admin from "firebase-admin"
import pg from "pg"
import rateLimit from "express-rate-limit"

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const app = express()
app.set("trust proxy", 1) // needed on Render/Railway for the rate limiter
app.use(cors({ origin: process.env.CLIENT_ORIGIN.split(",") }))
app.use(express.json())

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 })

// "u" prefix keeps Firebase from turning numeric keys into arrays
const toUid = id => "u" + id

const publicUser = u => ({
  id: u.id,
  username: u.username,
  wins: u.wins,
  losses: u.losses,
  ties: u.ties,
  gamesPlayed: u.games_played,
  bestStreak: u.best_streak
})

/* ---------- REGISTER ---------- */
app.post("/api/register", authLimiter, async (req, res) => {
  const username = String(req.body.username || "").trim()
  const password = String(req.body.password || "")

  if (!/^[A-Za-z0-9_]{3,12}$/.test(username))
    return res.status(400).json({ error: "Username: 3-12 letters, numbers or _" })
  if (password.length < 8 || password.length > 72)
    return res.status(400).json({ error: "Password must be 8-72 characters" })

  try {
    const hash = await bcrypt.hash(password, 12)
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *`,
      [username, hash]
    )
    const user = rows[0]
    const token = await admin.auth().createCustomToken(toUid(user.id), { username })
    res.json({ token, user: publicUser(user) })
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "That username is taken, please choose another" })
    console.error(e)
    res.status(500).json({ error: "Server error" })
  }
})

/* ---------- LOGIN ---------- */
app.post("/api/login", authLimiter, async (req, res) => {
  const username = String(req.body.username || "").trim()
  const password = String(req.body.password || "")

  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE lower(username) = lower($1)",
      [username]
    )
    const user = rows[0]
    const ok = user && (await bcrypt.compare(password, user.password_hash))
    if (!ok) return res.status(401).json({ error: "Wrong username or password" })

    const token = await admin
      .auth()
      .createCustomToken(toUid(user.id), { username: user.username })
    res.json({ token, user: publicUser(user) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Server error" })
  }
})

/* ---------- USERNAME CHECK ---------- */
app.get("/api/username-available", async (req, res) => {
  const name = String(req.query.name || "").trim()
  const { rows } = await pool.query(
    "SELECT 1 FROM users WHERE lower(username) = lower($1)", [name]
  )
  res.json({ available: rows.length === 0 })
})

/* ---------- AUTH MIDDLEWARE ---------- */
async function requireAccount(req, res, next) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1]
    const decoded = await admin.auth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider !== "custom") return res.sendStatus(401)
    req.uid = decoded.uid
    req.userId = Number(decoded.uid.slice(1))
    next()
  } catch {
    res.sendStatus(401)
  }
}

/* ---------- ME ---------- */
app.get("/api/me", requireAccount, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.userId])
  if (!rows[0]) return res.sendStatus(404)
  res.json(publicUser(rows[0]))
})

/* ---------- LEADERBOARD ---------- */
app.get("/api/leaderboard", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT username, wins, games_played
     FROM users ORDER BY wins DESC, games_played ASC LIMIT 20`
  )
  res.json(rows)
})

/* ---------- RECORD A FINISHED GAME ---------- */
app.post("/api/game-result", requireAccount, async (req, res) => {
  const code = String(req.body.roomCode || "").toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: "Bad room code" })

  try {
    const snap = await admin.database().ref("rooms/" + code).get()
    const room = snap.val()
    if (!room || !room.game) return res.status(404).json({ error: "Room not found" })
    if (room.player1 !== req.uid && room.player2 !== req.uid)
      return res.status(403).json({ error: "Not your game" })
    if (room.game.status !== "finished")
      return res.status(400).json({ error: "Game not finished" })

    // count each player once per game (a rematch replaces game/, resetting this flag)
    const flag = admin.database().ref(`rooms/${code}/game/counted/${req.uid}`)
    const tx = await flag.transaction(cur => (cur ? undefined : true))
    if (!tx.committed) return res.json({ already: true })

    const winner = room.game.winner
    const result = winner === "tie" ? "tie" : winner === req.uid ? "win" : "loss"
    const streak = room.scores?.[req.uid]?.streak || 0

    try {
      await pool.query(
        `UPDATE users SET
           wins         = wins   + $2,
           losses       = losses + $3,
           ties         = ties   + $4,
           games_played = games_played + 1,
           best_streak  = GREATEST(best_streak, $5)
         WHERE id = $1`,
        [req.userId, result === "win" ? 1 : 0, result === "loss" ? 1 : 0, result === "tie" ? 1 : 0, streak]
      )
    } catch (e) {
      await flag.remove()
      throw e
    }

    res.json({ counted: true, result })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Server error" })
  }
})

app.listen(process.env.PORT || 3001, () => console.log("API on", process.env.PORT || 3001))