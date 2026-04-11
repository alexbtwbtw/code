import { db } from '../client'

export const insertFeature = db.prepare(`
  INSERT INTO project_features (project_id, label, description, macro_region, country, place, latitude, longitude, notes)
  VALUES (@project_id, @label, @description, @macro_region, @country, @place, @latitude, @longitude, @notes)
`)
