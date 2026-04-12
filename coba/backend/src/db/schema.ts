import { db } from './client'

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_code        TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    client          TEXT    NOT NULL DEFAULT '',
    macro_region    TEXT    NOT NULL DEFAULT '',
    country         TEXT    NOT NULL DEFAULT '',
    place           TEXT    NOT NULL DEFAULT '',
    category        TEXT    NOT NULL DEFAULT 'other',
    status          TEXT    NOT NULL DEFAULT 'active',
    priority        TEXT    NOT NULL DEFAULT 'medium',
    start_date      TEXT,
    end_date        TEXT,
    budget          REAL,
    currency        TEXT    NOT NULL DEFAULT 'EUR',
    project_manager TEXT    NOT NULL DEFAULT '',
    team_size       INTEGER          DEFAULT 0,
    description     TEXT    NOT NULL DEFAULT '',
    tags            TEXT    NOT NULL DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS geo_entries (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    point_label       TEXT    NOT NULL DEFAULT '',
    type              TEXT    NOT NULL DEFAULT 'borehole',
    macro_region      TEXT    NOT NULL DEFAULT '',
    country           TEXT    NOT NULL DEFAULT '',
    place             TEXT    NOT NULL DEFAULT '',
    depth             REAL,
    soil_type         TEXT    DEFAULT '',
    rock_type         TEXT    DEFAULT '',
    groundwater_depth REAL,
    bearing_capacity  REAL,
    spt_n_value       INTEGER,
    seismic_class     TEXT    DEFAULT '',
    latitude          REAL,
    longitude         REAL,
    sampled_at        TEXT,
    notes             TEXT    NOT NULL DEFAULT '',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    title         TEXT    NOT NULL DEFAULT '',
    email         TEXT    NOT NULL DEFAULT '',
    phone         TEXT    NOT NULL DEFAULT '',
    bio           TEXT    NOT NULL DEFAULT '',
    role          TEXT    NOT NULL DEFAULT 'user',
    password_hash TEXT             DEFAULT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_cvs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    filename       TEXT    NOT NULL DEFAULT '',
    file_size      INTEGER NOT NULL DEFAULT 0,
    file_data      TEXT,
    s3_key         TEXT,
    uploaded_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_team (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id   INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    role_on_project  TEXT    NOT NULL DEFAULT '',
    UNIQUE(project_id, team_member_id)
  );

  CREATE TABLE IF NOT EXISTS structures (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label            TEXT    NOT NULL DEFAULT '',
    type             TEXT    NOT NULL DEFAULT 'other',
    material         TEXT    NOT NULL DEFAULT '',
    macro_region     TEXT    NOT NULL DEFAULT '',
    country          TEXT    NOT NULL DEFAULT '',
    place            TEXT    NOT NULL DEFAULT '',
    length_m         REAL,
    height_m         REAL,
    span_m           REAL,
    foundation_type  TEXT    DEFAULT '',
    design_load      REAL,
    latitude         REAL,
    longitude        REAL,
    built_at         TEXT,
    notes            TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_features (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label        TEXT    NOT NULL DEFAULT '',
    description  TEXT    NOT NULL DEFAULT '',
    macro_region TEXT    NOT NULL DEFAULT '',
    country      TEXT    NOT NULL DEFAULT '',
    place        TEXT    NOT NULL DEFAULT '',
    latitude     REAL,
    longitude    REAL,
    notes        TEXT    NOT NULL DEFAULT '',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    project_name   TEXT    NOT NULL DEFAULT '',
    macro_region   TEXT    NOT NULL DEFAULT '',
    country        TEXT    NOT NULL DEFAULT '',
    place          TEXT    NOT NULL DEFAULT '',
    category       TEXT    NOT NULL DEFAULT 'other',
    start_date     TEXT,
    end_date       TEXT,
    notes          TEXT    NOT NULL DEFAULT '',
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_history_geo (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    history_id        INTEGER NOT NULL REFERENCES member_history(id) ON DELETE CASCADE,
    point_label       TEXT    NOT NULL DEFAULT '',
    type              TEXT    NOT NULL DEFAULT 'borehole',
    macro_region      TEXT    NOT NULL DEFAULT '',
    country           TEXT    NOT NULL DEFAULT '',
    place             TEXT    NOT NULL DEFAULT '',
    depth             REAL,
    soil_type         TEXT    NOT NULL DEFAULT '',
    rock_type         TEXT    NOT NULL DEFAULT '',
    groundwater_depth REAL,
    bearing_capacity  REAL,
    spt_n_value       INTEGER,
    seismic_class     TEXT    NOT NULL DEFAULT '',
    latitude          REAL,
    longitude         REAL,
    sampled_at        TEXT,
    notes             TEXT    NOT NULL DEFAULT '',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_history_structures (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    history_id       INTEGER NOT NULL REFERENCES member_history(id) ON DELETE CASCADE,
    label            TEXT    NOT NULL DEFAULT '',
    type             TEXT    NOT NULL DEFAULT 'other',
    material         TEXT    NOT NULL DEFAULT '',
    macro_region     TEXT    NOT NULL DEFAULT '',
    country          TEXT    NOT NULL DEFAULT '',
    place            TEXT    NOT NULL DEFAULT '',
    length_m         REAL,
    height_m         REAL,
    span_m           REAL,
    foundation_type  TEXT    DEFAULT '',
    design_load      REAL,
    latitude         REAL,
    longitude        REAL,
    built_at         TEXT,
    notes            TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_history_features (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    history_id   INTEGER NOT NULL REFERENCES member_history(id) ON DELETE CASCADE,
    label        TEXT    NOT NULL DEFAULT '',
    description  TEXT    NOT NULL DEFAULT '',
    macro_region TEXT    NOT NULL DEFAULT '',
    country      TEXT    NOT NULL DEFAULT '',
    place        TEXT    NOT NULL DEFAULT '',
    latitude     REAL,
    longitude    REAL,
    notes        TEXT    NOT NULL DEFAULT '',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirement_books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    category    TEXT    NOT NULL DEFAULT 'other',
    description TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirements (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id          INTEGER NOT NULL REFERENCES requirement_books(id) ON DELETE CASCADE,
    title            TEXT    NOT NULL,
    description      TEXT    NOT NULL DEFAULT '',
    discipline       TEXT    NOT NULL DEFAULT 'other',
    level            TEXT    NOT NULL DEFAULT 'any',
    years_experience INTEGER,
    certifications   TEXT    NOT NULL DEFAULT '',
    notes            TEXT    NOT NULL DEFAULT '',
    compliance_note  TEXT    NOT NULL DEFAULT '',
    source_evidence  TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirement_assignments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement_id   INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    team_member_id   INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    rationale        TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(requirement_id, team_member_id)
  );


  CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    status          TEXT    NOT NULL DEFAULT 'todo',
    priority        TEXT    NOT NULL DEFAULT 'medium',
    state_summary   TEXT    NOT NULL DEFAULT '',
    due_date        TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_member_id  INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    UNIQUE(task_id, team_member_id)
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_name     TEXT    NOT NULL,
    content         TEXT    NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`)
