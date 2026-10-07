CREATE TABLE IF NOT EXISTS site_metrics (
  metric_key TEXT NOT NULL PRIMARY KEY,
  metric_value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_metrics (metric_key, metric_value) VALUES ('manifesto_downloads', 0);
