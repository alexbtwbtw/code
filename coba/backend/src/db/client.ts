import Database from 'better-sqlite3'

export const db = new Database(':memory:')

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
