import { db } from '../db'
import { type RawGeo, mapGeo } from '../types/geo'
import type { z } from 'zod'
import type { CreateGeoEntrySchema } from '../schemas/geo'

export function getGeoByProject(projectId: number) {
  return (db.prepare(`SELECT * FROM geo_entries WHERE project_id = ? ORDER BY point_label ASC`).all(projectId) as RawGeo[]).map(mapGeo)
}

export function createGeoEntry(input: z.infer<typeof CreateGeoEntrySchema>) {
  const result = db.prepare(`
    INSERT INTO geo_entries (project_id, point_label, type, macro_region, country, place,
      depth, soil_type, rock_type, groundwater_depth, bearing_capacity, spt_n_value,
      seismic_class, latitude, longitude, sampled_at, notes)
    VALUES (@project_id, @point_label, @type, @macro_region, @country, @place,
      @depth, @soil_type, @rock_type, @groundwater_depth, @bearing_capacity, @spt_n_value,
      @seismic_class, @latitude, @longitude, @sampled_at, @notes)
  `).run({
    project_id: input.projectId,
    point_label: input.pointLabel, type: input.type,
    macro_region: input.macroRegion, country: input.country, place: input.place,
    depth: input.depth ?? null, soil_type: input.soilType, rock_type: input.rockType,
    groundwater_depth: input.groundwaterDepth ?? null,
    bearing_capacity: input.bearingCapacity ?? null,
    spt_n_value: input.sptNValue ?? null,
    seismic_class: input.seismicClass,
    latitude: input.latitude ?? null, longitude: input.longitude ?? null,
    sampled_at: input.sampledAt ?? null, notes: input.notes,
  })
  return mapGeo(db.prepare(`SELECT * FROM geo_entries WHERE id = ?`).get(result.lastInsertRowid) as RawGeo)
}

export function deleteGeoEntry(id: number) {
  db.prepare(`DELETE FROM geo_entries WHERE id = ?`).run(id)
  return { success: true }
}
