import { db } from '../db'
import { type RawFeature, mapFeature } from '../types/features'
import type { z } from 'zod'
import type { CreateFeatureSchema } from '../schemas/features'

export function getFeaturesByProject(projectId: number) {
  return (db.prepare(`SELECT * FROM project_features WHERE project_id = ? ORDER BY label ASC`).all(projectId) as RawFeature[]).map(mapFeature)
}

export function createFeature(input: z.infer<typeof CreateFeatureSchema>) {
  const result = db.prepare(`
    INSERT INTO project_features (project_id, label, description, macro_region, country, place, latitude, longitude, notes)
    VALUES (@project_id, @label, @description, @macro_region, @country, @place, @latitude, @longitude, @notes)
  `).run({
    project_id: input.projectId, label: input.label, description: input.description,
    macro_region: input.macroRegion, country: input.country, place: input.place,
    latitude: input.latitude ?? null, longitude: input.longitude ?? null, notes: input.notes,
  })
  return mapFeature(db.prepare(`SELECT * FROM project_features WHERE id = ?`).get(result.lastInsertRowid) as RawFeature)
}

export function deleteFeature(id: number) {
  db.prepare(`DELETE FROM project_features WHERE id = ?`).run(id)
  return { success: true }
}
