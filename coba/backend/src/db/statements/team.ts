import { db } from '../client'

export const insertMember = db.prepare(`
  INSERT INTO team_members (name, title, email, phone, bio, role)
  VALUES (@name, @title, @email, @phone, @bio, @role)
`)

export const insertProjectTeam = db.prepare(`
  INSERT OR IGNORE INTO project_team (project_id, team_member_id, role_on_project)
  VALUES (@project_id, @team_member_id, @role_on_project)
`)

export const insertHistory = db.prepare(`
  INSERT INTO member_history (team_member_id, project_id, project_name, macro_region, country, place, category, start_date, end_date, notes)
  VALUES (@team_member_id, @project_id, @project_name, @macro_region, @country, @place, @category, @start_date, @end_date, @notes)
`)

export const insertHistoryGeo = db.prepare(`
  INSERT INTO member_history_geo (history_id, point_label, type, macro_region, country, place,
    depth, soil_type, rock_type, groundwater_depth, bearing_capacity, spt_n_value,
    seismic_class, latitude, longitude, sampled_at, notes)
  VALUES (@history_id, @point_label, @type, @macro_region, @country, @place,
    @depth, @soil_type, @rock_type, @groundwater_depth, @bearing_capacity, @spt_n_value,
    @seismic_class, @latitude, @longitude, @sampled_at, @notes)
`)

export const insertHistoryStructure = db.prepare(`
  INSERT INTO member_history_structures (history_id, label, type, material, macro_region, country, place,
    length_m, height_m, span_m, foundation_type, design_load, latitude, longitude, built_at, notes)
  VALUES (@history_id, @label, @type, @material, @macro_region, @country, @place,
    @length_m, @height_m, @span_m, @foundation_type, @design_load, @latitude, @longitude, @built_at, @notes)
`)

export const insertHistoryFeature = db.prepare(`
  INSERT INTO member_history_features (history_id, label, description, macro_region, country, place, latitude, longitude, notes)
  VALUES (@history_id, @label, @description, @macro_region, @country, @place, @latitude, @longitude, @notes)
`)
