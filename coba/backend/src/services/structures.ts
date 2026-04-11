import { db } from '../db'
import { type RawStructure, mapStructure } from '../types/structures'
import type { z } from 'zod'
import type { CreateStructureSchema } from '../schemas/structures'

export function getStructuresByProject(projectId: number) {
  return (db.prepare(`SELECT * FROM structures WHERE project_id = ? ORDER BY label ASC`).all(projectId) as RawStructure[]).map(mapStructure)
}

export function createStructure(input: z.infer<typeof CreateStructureSchema>) {
  const result = db.prepare(`
    INSERT INTO structures (project_id, label, type, material, macro_region, country, place,
      length_m, height_m, span_m, foundation_type, design_load, latitude, longitude, built_at, notes)
    VALUES (@project_id, @label, @type, @material, @macro_region, @country, @place,
      @length_m, @height_m, @span_m, @foundation_type, @design_load, @latitude, @longitude, @built_at, @notes)
  `).run({
    project_id: input.projectId, label: input.label, type: input.type, material: input.material,
    macro_region: input.macroRegion, country: input.country, place: input.place,
    length_m: input.lengthM ?? null, height_m: input.heightM ?? null, span_m: input.spanM ?? null,
    foundation_type: input.foundationType, design_load: input.designLoad ?? null,
    latitude: input.latitude ?? null, longitude: input.longitude ?? null,
    built_at: input.builtAt ?? null, notes: input.notes,
  })
  return mapStructure(db.prepare(`SELECT * FROM structures WHERE id = ?`).get(result.lastInsertRowid) as RawStructure)
}

export function deleteStructure(id: number) {
  db.prepare(`DELETE FROM structures WHERE id = ?`).run(id)
  return { success: true }
}
