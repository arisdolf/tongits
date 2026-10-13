import "dotenv/config"
import { readFileSync, writeFileSync } from "fs"
import { initializeApp, cert } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"
import pg from "pg"

initializeApp({
  credential: cert(JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const users = (await getDatabase().ref("users").get()).val() || {}

// 1) always keep a JSON backup
writeFileSync("users-backup.json", JSON.stringify(users, null, 2))

// 2) load into local Postgres
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(`
  CREATE TABLE IF NOT EXISTS players (
    uid          TEXT PRIMARY KEY,
    username     TEXT NOT NULL,
    wins         INT NOT NULL DEFAULT 0,
    losses       INT NOT NULL DEFAULT 0,
    ties         INT NOT NULL DEFAULT 0,
    games_played INT NOT NULL DEFAULT 0,
    best_streak  INT NOT NULL DEFAULT 0,
    synced_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)

for (const [uid, u] of Object.entries(users)) {
  await pool.query(
    `INSERT INTO players (uid, username, wins, losses, ties, games_played, best_streak)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (uid) DO UPDATE SET
       username = EXCLUDED.username, wins = EXCLUDED.wins, losses = EXCLUDED.losses,
       ties = EXCLUDED.ties, games_played = EXCLUDED.games_played,
       best_streak = EXCLUDED.best_streak, synced_at = now()`,
    [uid, u.username, u.wins || 0, u.losses || 0, u.ties || 0, u.gamesPlayed || 0, u.bestStreak || 0]
  )
}

console.log(`Synced ${Object.keys(users).length} players`)
await pool.end()