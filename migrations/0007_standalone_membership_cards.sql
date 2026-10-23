CREATE TABLE IF NOT EXISTS standalone_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT '',
  club_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Member',
  photo_data_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS standalone_memberships_status_idx ON standalone_memberships (status);
