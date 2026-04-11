import { db } from '../client'

const _insertGeo = db.prepare(`
  INSERT INTO geo_entries (project_id, point_label, type, macro_region, country, place,
    depth, soil_type, rock_type, groundwater_depth, bearing_capacity, spt_n_value,
    seismic_class, latitude, longitude, sampled_at, notes)
  VALUES (@project_id, @point_label, @type, @macro_region, @country, @place,
    @depth, @soil_type, @rock_type, @groundwater_depth, @bearing_capacity, @spt_n_value,
    @seismic_class, @latitude, @longitude, @sampled_at, @notes)
`)

export const insertGeo = {
  run: (data: Record<string, unknown>) => _insertGeo.run({
    macro_region: '',
    country: '',
    place: '',
    depth: null,
    soil_type: '',
    rock_type: '',
    groundwater_depth: null,
    bearing_capacity: null,
    spt_n_value: null,
    seismic_class: '',
    latitude: null,
    longitude: null,
    sampled_at: null,
    notes: '',
    ...data,
  }),
}
