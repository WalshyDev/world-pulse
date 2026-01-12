-- Banned IPs table for admin moderation
CREATE TABLE IF NOT EXISTS banned_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  banned_at TEXT NOT NULL DEFAULT (datetime('now')),
  banned_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_banned_ips_date ON banned_ips(banned_at);
