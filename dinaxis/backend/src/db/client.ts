import Database from 'better-sqlite3'

const dbPath = process.env.DATABASE_URL ?? ':memory:'
export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
