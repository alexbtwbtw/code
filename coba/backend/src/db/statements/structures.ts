import { db } from '../client'

const _insertStructure = db.prepare(`
  INSERT INTO structures (project_id, label, type, material, macro_region, country, place,
    length_m, height_m, span_m, foundation_type, design_load, latitude, longitude, built_at, notes)
  VALUES (@project_id, @label, @type, @material, @macro_region, @country, @place,
    @length_m, @height_m, @span_m, @foundation_type, @design_load, @latitude, @longitude, @built_at, @notes)
`)

export const insertStructure = {
  run: (data: Record<string, unknown>) => _insertStructure.run({
    material: '',
    macro_region: '',
    country: '',
    place: '',
    length_m: null,
    height_m: null,
    span_m: null,
    foundation_type: '',
    design_load: null,
    latitude: null,
    longitude: null,
    built_at: null,
    notes: '',
    ...data,
  }),
}
