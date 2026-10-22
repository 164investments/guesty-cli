-- One-time invites. An admin creates one for a teammate, and the teammate's
-- CLI exchanges its code once for an access key. Codes, keys and addresses
-- are stored only as keyed hashes, except the address of a pending invite.

CREATE TABLE invites (
  code_hash TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by TEXT NOT NULL,
  -- Shown in team status while the invite is pending, then cleared.
  email TEXT,
  -- Kept after the invite closes, so the daily email caps still count it.
  email_hash TEXT,
  emailed_at INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  -- Set when the invite is used or cancelled.
  closed_at INTEGER,
  -- The key the invite was exchanged for, which also marks it as used.
  redeemed_key_hash TEXT
);

CREATE INDEX invites_by_team ON invites (team_id, created_at);
CREATE INDEX invites_by_email ON invites (email_hash, emailed_at);

-- Wrong invite codes, by keyed hash of the caller's address, so codes can't
-- be guessed.
CREATE TABLE join_failures (
  client_hash TEXT NOT NULL,
  failed_at INTEGER NOT NULL
);

CREATE INDEX join_failures_by_client ON join_failures (client_hash, failed_at);
