-- One-time invites. An admin creates one for a teammate, and the teammate's
-- CLI exchanges its code once for an access key. Codes, keys and addresses
-- are stored only as keyed hashes, except the address of a pending invite.

CREATE TABLE invites (
  code_hash TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by TEXT NOT NULL,
  -- The inviting key: revoking it cancels the invites it created.
  invited_by_key TEXT NOT NULL,
  -- Shown in team status while the invite is pending, then cleared.
  email TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  -- Set when the invite is used or cancelled.
  closed_at INTEGER,
  -- The key the invite was exchanged for, which also marks it as used.
  redeemed_key_hash TEXT
);

CREATE INDEX invites_by_team ON invites (team_id, created_at);
CREATE INDEX invites_by_inviter ON invites (invited_by_key);

-- Every invite email the service tried to send, failed or not. Not tied to a
-- team, so deleting and recreating a team can't reset the daily caps: sender
-- is the team's Guesty client fingerprint, and address a keyed hash of the
-- normalized address.
CREATE TABLE invite_emails (
  sender TEXT NOT NULL,
  address TEXT NOT NULL,
  sent_at INTEGER NOT NULL
);

CREATE INDEX invite_emails_by_sender ON invite_emails (sender, sent_at);
CREATE INDEX invite_emails_by_address ON invite_emails (address, sent_at);
CREATE INDEX invite_emails_by_time ON invite_emails (sent_at);

-- Invite code lookups by keyed hash of the caller's address. Each is recorded
-- before the code is checked and removed when the code is real, so wrong
-- codes can't be guessed in a burst.
CREATE TABLE join_failures (
  client_hash TEXT NOT NULL,
  failed_at INTEGER NOT NULL
);

CREATE INDEX join_failures_by_client ON join_failures (client_hash, failed_at);
