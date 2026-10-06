CREATE TABLE IF NOT EXISTS applications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  section VARCHAR(120) NOT NULL,
  mobile VARCHAR(64) NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  review_note TEXT NULL,
  reviewer_email VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY applications_status_idx (status),
  KEY applications_created_at_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memberships (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id INT UNSIGNED NOT NULL,
  member_code VARCHAR(40) NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  section VARCHAR(120) NOT NULL,
  mobile VARCHAR(64) NULL,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY memberships_member_code_uq (member_code),
  UNIQUE KEY memberships_application_uq (application_id),
  KEY memberships_email_idx (email),
  CONSTRAINT memberships_application_fk FOREIGN KEY (application_id) REFERENCES applications (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content (
  content_key VARCHAR(80) NOT NULL,
  content_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (content_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_content (content_key, content_json)
VALUES ('manifesto', '{"title":"A council that listens, represents, and delivers.","intro":"Our student general council should feel close to every student: open to ideas, clear about action, and accountable for the work that follows.","sections":[{"heading":"LISTEN FIRST","body":"Create regular ways for students to share what is working, what is not, and what needs attention next."},{"heading":"REPRESENT EVERY SECTION","body":"Make sure every section has a voice in council conversations and a clear path to bring forward a concern or idea."},{"heading":"DELIVER WITH CARE","body":"Turn student priorities into visible follow-through, with updates that show what changed and what comes next."}],"closing":"This is a council built with students, not just for them.","photos":["/sri-vishnu-poster.png","/logo.jpg"]}')
ON DUPLICATE KEY UPDATE content_key = content_key;
