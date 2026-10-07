CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  section TEXT NOT NULL,
  mobile TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  review_note TEXT,
  reviewer_email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications (created_at);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  member_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  section TEXT NOT NULL,
  mobile TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (application_id),
  FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE INDEX IF NOT EXISTS memberships_email_idx ON memberships (email);

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT NOT NULL PRIMARY KEY,
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS applications_updated_at
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
  UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS site_content_updated_at
AFTER UPDATE ON site_content
FOR EACH ROW
BEGIN
  UPDATE site_content SET updated_at = CURRENT_TIMESTAMP WHERE content_key = OLD.content_key;
END;

INSERT OR IGNORE INTO site_content (content_key, content_json)
VALUES ('manifesto', '{"title":"A council that listens, represents, and delivers.","intro":"Our student general council should feel close to every student: open to ideas, clear about action, and accountable for the work that follows.","sections":[{"heading":"LISTEN FIRST","body":"Create regular ways for students to share what is working, what is not, and what needs attention next."},{"heading":"REPRESENT EVERY SECTION","body":"Make sure every section has a voice in council conversations and a clear path to bring forward a concern or idea."},{"heading":"DELIVER WITH CARE","body":"Turn student priorities into visible follow-through, with updates that show what changed and what comes next."}],"closing":"This is a council built with students, not just for them.","photos":["/sri-vishnu-poster.webp","/logo.webp"]}');
