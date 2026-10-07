CREATE TABLE IF NOT EXISTS issue_poll (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL,
  intro TEXT NOT NULL,
  options_json TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  option_index INTEGER NOT NULL,
  voter_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (poll_id, voter_token),
  FOREIGN KEY (poll_id) REFERENCES issue_poll(id)
);

CREATE INDEX IF NOT EXISTS poll_votes_poll_idx ON poll_votes (poll_id);

INSERT OR IGNORE INTO issue_poll (id, title, intro, options_json, active)
VALUES (1, 'What should student leaders focus on first?', 'Choose the one issue that matters most to you. Your response is private and the public page will not display vote totals.', '["Campus facilities and maintenance","Career opportunities and placements","Student events and campus life","Transport, food, and daily services","Clubs, sports, and student activities","Wellbeing, safety, and support"]', 1);

INSERT OR IGNORE INTO site_content (content_key, content_json)
VALUES ('candidate', '{"name":"Your Candidate Name","eyebrow":"STUDENT COUNCIL CANDIDATE","tagline":"A clear voice for a stronger student experience.","bio":"Write a short introduction about the candidate, their experience, and what they want to improve.","photo":"/logo.webp","whyVote":"Students deserve a representative who listens carefully, communicates clearly, and follows through.","promises":["Listen to every section","Share visible progress updates","Create more student opportunities","Make student concerns easier to raise","Represent students with consistency"],"instagram":"","whatsapp":""}');
