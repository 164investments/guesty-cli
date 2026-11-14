-- The hosted MCP server's own database (D1 "guesty-mcp"). Nothing from Guesty
-- is stored here. Codes and tokens are kept only as keyed hashes; the member
-- access key is sealed with AES-GCM under a key derived from MCP_KEY.

-- Apps registered with dynamic client registration (RFC 7591). Apps that use a
-- client ID metadata document aren't stored: their document is read each time.
CREATE TABLE clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT,
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- One sign-in: the team member key it uses and what it allows.
CREATE TABLE grants (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  team_name TEXT,
  key_label TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  read_only INTEGER NOT NULL CHECK (read_only IN (0, 1)),
  sealed_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  activated_at INTEGER,
  revoked_at INTEGER,
  revoke_reason TEXT
);
CREATE INDEX grants_created ON grants (created_at);

-- Authorization codes, bound to the client, the full redirect URI, the
-- resource, the PKCE challenge and the grant's permissions. Spent codes stay a
-- day so a second use is recognized.
CREATE TABLE codes (
  code_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  resource TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  read_only INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX codes_expires ON codes (expires_at);

CREATE TABLE access_tokens (
  token_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX access_tokens_grant ON access_tokens (grant_id);
CREATE INDEX access_tokens_expires ON access_tokens (expires_at);

-- Spent refresh tokens stay until they would have expired, so a reused one
-- is recognized and revokes its grant.
CREATE TABLE refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX refresh_tokens_grant ON refresh_tokens (grant_id);
CREATE INDEX refresh_tokens_expires ON refresh_tokens (expires_at);
