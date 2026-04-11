import { db } from '../client'

export const insertBook = db.prepare(`
  INSERT INTO requirement_books (title, project_id, category, description)
  VALUES (@title, @project_id, @category, @description)
`)

export const insertRequirement = db.prepare(`
  INSERT INTO requirements (book_id, title, description, discipline, level, years_experience, certifications, notes)
  VALUES (@book_id, @title, @description, @discipline, @level, @years_experience, @certifications, @notes)
`)
