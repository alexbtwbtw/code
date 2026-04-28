import { db } from './client'

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS insurers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    email        TEXT NOT NULL DEFAULT '',
    phone        TEXT NOT NULL DEFAULT '',
    address      TEXT NOT NULL DEFAULT '',
    notes        TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS insurer_contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    insurer_id INTEGER NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_insurer_contacts_insurer ON insurer_contacts(insurer_id);

  CREATE TABLE IF NOT EXISTS claims (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_number     TEXT NOT NULL UNIQUE,
    insurer_id       INTEGER REFERENCES insurers(id) ON DELETE SET NULL,
    claimant_name    TEXT NOT NULL DEFAULT '',
    claimant_email   TEXT NOT NULL DEFAULT '',
    claimant_phone   TEXT NOT NULL DEFAULT '',
    property_address TEXT NOT NULL DEFAULT '',
    property_type    TEXT NOT NULL DEFAULT 'residential',
    claim_type       TEXT NOT NULL DEFAULT 'property_damage',
    custom_type_name TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'new',
    date_opened      TEXT NOT NULL DEFAULT (date('now')),
    date_closed      TEXT,
    estimated_value  REAL,
    final_settlement REAL,
    adjuster_notes   TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_claim_types (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_claims_insurer ON claims(insurer_id);
  CREATE INDEX IF NOT EXISTS idx_claims_status  ON claims(status);

  CREATE TABLE IF NOT EXISTS inspections (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id       INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    scheduled_date TEXT,
    completed_date TEXT,
    findings       TEXT NOT NULL DEFAULT '',
    adjuster_notes TEXT NOT NULL DEFAULT '',
    latitude       REAL,
    longitude      REAL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_inspections_claim ON inspections(claim_id);

  CREATE TABLE IF NOT EXISTS line_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id       INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    description    TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'other',
    estimated_cost REAL NOT NULL DEFAULT 0,
    approved_cost  REAL,
    notes          TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_line_items_claim ON line_items(claim_id);

  CREATE TABLE IF NOT EXISTS billing_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id    INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    description TEXT    NOT NULL,
    category    TEXT    NOT NULL DEFAULT 'other',
    amount      REAL    NOT NULL DEFAULT 0,
    notes       TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_billing_items_claim ON billing_items(claim_id);

  CREATE TABLE IF NOT EXISTS documents (
    id               TEXT PRIMARY KEY,
    claim_id         INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    filename         TEXT NOT NULL,
    mime_type        TEXT NOT NULL DEFAULT 'application/octet-stream',
    storage_key      TEXT NOT NULL,
    storage_adapter  TEXT NOT NULL DEFAULT 'blob',
    size_bytes       INTEGER NOT NULL DEFAULT 0,
    label            TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    uploaded_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_documents_claim ON documents(claim_id);

  CREATE TABLE IF NOT EXISTS line_item_photos (
    id               TEXT PRIMARY KEY,
    line_item_id     INTEGER NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
    filename         TEXT NOT NULL,
    mime_type        TEXT NOT NULL DEFAULT 'application/octet-stream',
    storage_key      TEXT NOT NULL,
    storage_adapter  TEXT NOT NULL DEFAULT 'blob',
    size_bytes       INTEGER NOT NULL DEFAULT 0,
    uploaded_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_line_item_photos_item ON line_item_photos(line_item_id);

  CREATE TABLE IF NOT EXISTS document_blobs (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_comments (
    id          TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_doc_comments_doc ON document_comments(document_id);

  CREATE TABLE IF NOT EXISTS claim_comments (
    id         TEXT PRIMARY KEY,
    claim_id   INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_claim_comments_claim ON claim_comments(claim_id);

  CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    claim_id        INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    invoice_number  TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'draft',
    issued_date     TEXT NOT NULL,
    due_date        TEXT,
    notes           TEXT NOT NULL DEFAULT '',
    pdf_storage_key TEXT,
    pdf_storage_adapter TEXT,
    total_amount    REAL NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_invoices_claim ON invoices(claim_id);

  CREATE TABLE IF NOT EXISTS invoice_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type   TEXT NOT NULL,
    item_id     INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity    REAL NOT NULL DEFAULT 1,
    unit_price  REAL NOT NULL,
    amount      REAL NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
`

const DROP_DDL = `
  DROP TABLE IF EXISTS claim_comments;
  DROP TABLE IF EXISTS document_comments;
  DROP TABLE IF EXISTS document_blobs;
  DROP TABLE IF EXISTS documents;
  DROP TABLE IF EXISTS line_item_photos;
  DROP TABLE IF EXISTS billing_items;
  DROP TABLE IF EXISTS line_items;
  DROP TABLE IF EXISTS inspections;
  DROP TABLE IF EXISTS claims;
  DROP TABLE IF EXISTS custom_claim_types;
  DROP TABLE IF EXISTS insurer_contacts;
  DROP TABLE IF EXISTS insurers;
`

function runMigration(sql: string, name: string) {
  try {
    db.exec(sql)
  } catch (err: any) {
    const msg: string = err?.message ?? ''
    if (msg.includes('duplicate column name') || msg.includes('already exists') || msg.includes('table') && msg.includes('already exists')) {
      return // expected — column/table already exists
    }
    throw new Error(`Migration "${name}" failed: ${msg}`)
  }
}

export function initSchema() {
  db.exec(SCHEMA_DDL)
  // Migrations for existing databases
  runMigration("ALTER TABLE claims ADD COLUMN custom_type_name TEXT NOT NULL DEFAULT ''", 'claims.custom_type_name')
  runMigration("ALTER TABLE documents ADD COLUMN label TEXT NOT NULL DEFAULT ''", 'documents.label')
  runMigration("ALTER TABLE documents ADD COLUMN description TEXT NOT NULL DEFAULT ''", 'documents.description')
  runMigration(`
    CREATE TABLE IF NOT EXISTS line_item_photos (
      id               TEXT PRIMARY KEY,
      line_item_id     INTEGER NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
      filename         TEXT NOT NULL,
      mime_type        TEXT NOT NULL DEFAULT 'application/octet-stream',
      storage_key      TEXT NOT NULL,
      storage_adapter  TEXT NOT NULL DEFAULT 'blob',
      size_bytes       INTEGER NOT NULL DEFAULT 0,
      uploaded_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_line_item_photos_item ON line_item_photos(line_item_id);
  `, 'create.line_item_photos')
  runMigration(`
    CREATE TABLE IF NOT EXISTS invoices (
      id              TEXT PRIMARY KEY,
      claim_id        INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
      invoice_number  TEXT NOT NULL UNIQUE,
      status          TEXT NOT NULL DEFAULT 'draft',
      issued_date     TEXT NOT NULL,
      due_date        TEXT,
      notes           TEXT NOT NULL DEFAULT '',
      pdf_storage_key TEXT,
      pdf_storage_adapter TEXT,
      total_amount    REAL NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_claim ON invoices(claim_id);
    CREATE TABLE IF NOT EXISTS invoice_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_type   TEXT NOT NULL,
      item_id     INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity    REAL NOT NULL DEFAULT 1,
      unit_price  REAL NOT NULL,
      amount      REAL NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
  `, 'create.invoices')
}

export function resetSchema() {
  db.exec(DROP_DDL)
  db.exec(SCHEMA_DDL)
}

initSchema()
