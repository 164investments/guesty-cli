-- Teams share one cached Guesty token per token type. Every secret column
-- holds AES-GCM ciphertext sealed with a key derived from CREDENTIALS_KEY.

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_requests_per_day INTEGER NOT NULL DEFAULT 3 CHECK (max_requests_per_day BETWEEN 1 AND 5),
  created_at INTEGER NOT NULL
);

CREATE TABLE credentials (
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  token_type TEXT NOT NULL CHECK (token_type IN ('openapi', 'beapi')),
  -- Keyed hash of the token type and client ID: one team per Guesty client.
  fingerprint TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (team_id, token_type)
);

CREATE TABLE tokens (
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  token_type TEXT NOT NULL CHECK (token_type IN ('openapi', 'beapi')),
  access_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (team_id, token_type)
);

-- Keyed by client fingerprint, not team, and kept when a team is deleted, so
-- deleting and recreating a team cannot reset Guesty's daily allowance.
CREATE TABLE token_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  team_id TEXT REFERENCES teams (id) ON DELETE SET NULL,
  token_type TEXT NOT NULL,
  -- signup: a request before the caller has a key (new team or recovery).
  -- Signups have their own small allowance, so nobody who merely knows a
  -- client ID can use up a team's renewals.
  source TEXT NOT NULL DEFAULT 'team' CHECK (source IN ('team', 'signup')),
  requested_at INTEGER NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'succeeded', 'failed')),
  http_status INTEGER,
  detail TEXT
);

CREATE INDEX token_requests_by_fingerprint ON token_requests (fingerprint, requested_at);

CREATE TABLE refresh_leases (
  fingerprint TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL,
  lease_until INTEGER NOT NULL
);

CREATE TABLE access_keys (
  key_hash TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER
);

CREATE UNIQUE INDEX access_keys_active_label ON access_keys (team_id, label) WHERE revoked_at IS NULL;

CREATE TABLE team_creation_attempts (
  client_hash TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX team_creation_attempts_by_client ON team_creation_attempts (client_hash, attempted_at);
