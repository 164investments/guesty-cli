//! Clients, grants, codes and tokens in D1 (S5).
//!
//! Codes are consumed with one `UPDATE … WHERE used_at IS NULL … RETURNING`, and refresh tokens
//! are rotated the same way, so of two requests with the same code or token only one gets a row.
//! A spent code or refresh token presented again revokes its grant. Codes and tokens are stored
//! only as keyed hashes, and the member key only sealed.

use serde_json::Value;

use crate::crypto::{Keys, random_id, random_token};
use crate::db::{Db, DbError, Row, Stmt, int, text};
use crate::oauth::{ClientInfo, pkce_matches};
use crate::sql;

pub const CODE_TTL_MS: i64 = 60_000;
pub const ACCESS_TTL_MS: i64 = 60 * 60_000;
pub const REFRESH_TTL_MS: i64 = 30 * 24 * 60 * 60_000;
const DAY_MS: i64 = 24 * 60 * 60_000;
/// Registered apps no grant uses are removed after 90 days without a sign-in.
const CLIENT_IDLE_MS: i64 = 90 * DAY_MS;
/// A sign-in whose code was never exchanged is removed after an hour.
const PENDING_GRANT_MS: i64 = 60 * 60_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Admin,
    Member,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Admin => "admin",
            Role::Member => "member",
        }
    }

    pub fn parse(value: &str) -> Option<Role> {
        match value {
            "admin" => Some(Role::Admin),
            "member" => Some(Role::Member),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Grant {
    pub id: String,
    pub client_id: String,
    pub team_name: Option<String>,
    pub key_label: Option<String>,
    pub role: Role,
    pub read_only: bool,
    sealed_key: String,
}

impl Grant {
    fn from_row(row: &Row) -> Option<Grant> {
        Some(Grant {
            id: text(row, "id")?,
            client_id: text(row, "client_id")?,
            team_name: text(row, "team_name"),
            key_label: text(row, "key_label"),
            role: Role::parse(&text(row, "role")?)?,
            read_only: int(row, "read_only")? == 1,
            sealed_key: text(row, "sealed_key")?,
        })
    }

    /// The team member access key this grant signs in with.
    pub fn member_key(&self, keys: &Keys) -> Option<String> {
        keys.unseal(&self.sealed_key, &key_context(&self.id))
    }
}

fn key_context(grant_id: &str) -> String {
    format!("grant:{grant_id}:member_key")
}

pub struct NewGrant<'a> {
    pub client_id: &'a str,
    pub team_name: Option<&'a str>,
    pub key_label: Option<&'a str>,
    pub role: Role,
    pub read_only: bool,
    pub member_key: &'a str,
}

/// What a code is bound to.
pub struct CodeBinding<'a> {
    pub redirect_uri: &'a str,
    pub resource: &'a str,
    pub code_challenge: &'a str,
}

#[derive(Debug)]
pub struct Issued {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub grant: Grant,
}

#[derive(Debug, PartialEq)]
pub enum TokenError {
    /// `invalid_grant`, with a description safe to return.
    InvalidGrant(&'static str),
    Db,
}

impl From<DbError> for TokenError {
    fn from(_: DbError) -> Self {
        TokenError::Db
    }
}

pub async fn register_client<D: Db>(
    db: &D,
    name: Option<&str>,
    redirect_uris: &[String],
    now: i64,
) -> Result<String, DbError> {
    let client_id = random_token("mcpc_");
    let uris = Value::from(redirect_uris.to_vec()).to_string();
    db.batch(vec![
        sql!(
            "INSERT INTO clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)",
            &client_id,
            name,
            uris,
            now
        ),
        sql!(
            "DELETE FROM clients WHERE COALESCE(last_used_at, created_at) < ?
             AND NOT EXISTS (SELECT 1 FROM grants g WHERE g.client_id = clients.client_id AND g.revoked_at IS NULL)",
            now - CLIENT_IDLE_MS
        ),
    ])
    .await?;
    Ok(client_id)
}

pub async fn get_client<D: Db>(db: &D, client_id: &str) -> Result<Option<ClientInfo>, DbError> {
    let Some(row) = db
        .first(sql!("SELECT client_id, client_name, redirect_uris FROM clients WHERE client_id = ?", client_id))
        .await?
    else {
        return Ok(None);
    };
    let redirect_uris: Vec<String> =
        text(&row, "redirect_uris").and_then(|u| serde_json::from_str(&u).ok()).unwrap_or_default();
    Ok(Some(ClientInfo {
        client_id: client_id.to_string(),
        client_name: text(&row, "client_name"),
        redirect_uris,
        verified_origin: None,
    }))
}

/// Stores an approved sign-in and its code; returns the code. The grant becomes usable only when
/// the code is exchanged.
pub async fn create_grant<D: Db>(
    db: &D,
    keys: &Keys,
    grant: &NewGrant<'_>,
    binding: &CodeBinding<'_>,
    now: i64,
) -> Result<String, DbError> {
    let id = random_id();
    let code = random_token("gmc_");
    let sealed = keys.seal(grant.member_key, &key_context(&id));
    db.batch(vec![
        sql!(
            "INSERT INTO grants (id, client_id, team_name, key_label, role, read_only, sealed_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            &id,
            grant.client_id,
            grant.team_name,
            grant.key_label,
            grant.role.as_str(),
            grant.read_only,
            sealed,
            now
        ),
        sql!(
            "INSERT INTO codes (code_hash, grant_id, client_id, redirect_uri, resource, code_challenge, read_only, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            keys.keyed_hash("code", &code),
            &id,
            grant.client_id,
            binding.redirect_uri,
            binding.resource,
            binding.code_challenge,
            grant.read_only,
            now + CODE_TTL_MS
        ),
        sql!("UPDATE clients SET last_used_at = ? WHERE client_id = ?", now, grant.client_id),
        // Housekeeping: spent and expired codes after a day, sign-ins never completed, grants
        // with no live token left, and revoked grants once their refresh tokens would have expired.
        sql!("DELETE FROM codes WHERE expires_at < ?", now - DAY_MS),
        sql!("DELETE FROM grants WHERE activated_at IS NULL AND created_at < ?", now - PENDING_GRANT_MS),
        sql!(
            "DELETE FROM grants WHERE activated_at IS NOT NULL AND revoked_at IS NULL
             AND NOT EXISTS (SELECT 1 FROM refresh_tokens r WHERE r.grant_id = grants.id AND r.expires_at > ? AND r.used_at IS NULL)
             AND NOT EXISTS (SELECT 1 FROM access_tokens a WHERE a.grant_id = grants.id AND a.expires_at > ?)",
            now,
            now
        ),
        sql!("DELETE FROM grants WHERE revoked_at IS NOT NULL AND revoked_at < ?", now - REFRESH_TTL_MS - DAY_MS),
    ])
    .await?;
    Ok(code)
}

pub struct CodeExchange<'a> {
    pub code: &'a str,
    pub client_id: &'a str,
    pub redirect_uri: &'a str,
    pub verifier: &'a str,
    /// The resource the code was issued for must be this one.
    pub resource: &'a str,
}

/// Exchanges a code for tokens. The code is spent by the first request that presents it, whatever
/// happens next; a second presentation revokes the grant it created.
pub async fn exchange_code<D: Db>(
    db: &D,
    keys: &Keys,
    exchange: &CodeExchange<'_>,
    now: i64,
) -> Result<Issued, TokenError> {
    let code_hash = keys.keyed_hash("code", exchange.code);
    let spent = db
        .first(sql!(
            "UPDATE codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL
             RETURNING grant_id, client_id, redirect_uri, resource, code_challenge, read_only, expires_at",
            now,
            &code_hash
        ))
        .await?;
    let Some(code) = spent else {
        if let Some(row) = db.first(sql!("SELECT grant_id FROM codes WHERE code_hash = ?", &code_hash)).await? {
            if let Some(grant_id) = text(&row, "grant_id") {
                revoke_grant(db, &grant_id, "code_reuse", now).await?;
            }
            return Err(TokenError::InvalidGrant("This authorization code was already used."));
        }
        return Err(TokenError::InvalidGrant("This authorization code isn't valid."));
    };
    if int(&code, "expires_at").unwrap_or(0) <= now {
        return Err(TokenError::InvalidGrant("This authorization code expired."));
    }
    if text(&code, "client_id").as_deref() != Some(exchange.client_id) {
        return Err(TokenError::InvalidGrant("This authorization code was issued to another client."));
    }
    if text(&code, "redirect_uri").as_deref() != Some(exchange.redirect_uri) {
        return Err(TokenError::InvalidGrant("redirect_uri doesn't match the authorization request."));
    }
    if text(&code, "resource").as_deref() != Some(exchange.resource) {
        return Err(TokenError::InvalidGrant("This authorization code was issued for another resource."));
    }
    if !pkce_matches(exchange.verifier, &text(&code, "code_challenge").unwrap_or_default()) {
        return Err(TokenError::InvalidGrant("code_verifier doesn't match the code challenge."));
    }
    let grant_id = text(&code, "grant_id").unwrap_or_default();
    let read_only = int(&code, "read_only").unwrap_or(1);
    // Activated in the same transaction that issues the first tokens, so housekeeping never sees
    // an activated grant without them.
    let activate = sql!(
        "UPDATE grants SET activated_at = ? WHERE id = ? AND client_id = ? AND read_only = ? AND revoked_at IS NULL AND activated_at IS NULL",
        now,
        &grant_id,
        exchange.client_id,
        read_only
    );
    issue(db, keys, &grant_id, exchange.client_id, Some(activate), now).await
}

/// Rotates a refresh token: the old one is spent in one statement and a new pair is issued. A
/// spent token presented again, or a token presented by another client, revokes the grant.
pub async fn refresh<D: Db>(
    db: &D,
    keys: &Keys,
    refresh_token: &str,
    client_id: &str,
    now: i64,
) -> Result<Issued, TokenError> {
    let token_hash = keys.keyed_hash("refresh", refresh_token);
    let spent = db
        .first(sql!(
            "UPDATE refresh_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL RETURNING grant_id, client_id, expires_at",
            now,
            &token_hash
        ))
        .await?;
    let Some(row) = spent else {
        if let Some(row) =
            db.first(sql!("SELECT grant_id, expires_at FROM refresh_tokens WHERE token_hash = ?", &token_hash)).await?
        {
            if int(&row, "expires_at").unwrap_or(0) > now {
                revoke_grant(db, &text(&row, "grant_id").unwrap_or_default(), "refresh_reuse", now).await?;
            }
            return Err(TokenError::InvalidGrant("This refresh token was already used. Sign in again."));
        }
        return Err(TokenError::InvalidGrant("This refresh token isn't valid."));
    };
    let grant_id = text(&row, "grant_id").unwrap_or_default();
    if text(&row, "client_id").as_deref() != Some(client_id) {
        revoke_grant(db, &grant_id, "refresh_wrong_client", now).await?;
        return Err(TokenError::InvalidGrant("This refresh token was issued to another client."));
    }
    if int(&row, "expires_at").unwrap_or(0) <= now {
        return Err(TokenError::InvalidGrant("This refresh token expired. Sign in again."));
    }
    issue(db, keys, &grant_id, client_id, None, now).await
}

async fn issue<D: Db>(
    db: &D,
    keys: &Keys,
    grant_id: &str,
    client_id: &str,
    activate: Option<Stmt>,
    now: i64,
) -> Result<Issued, TokenError> {
    let access_token = random_token("gma_");
    let refresh_token = random_token("gmr_");
    let activating = activate.is_some();
    let mut statements: Vec<Stmt> = activate.into_iter().collect();
    statements.extend([
        sql!(
            "INSERT INTO access_tokens (token_hash, grant_id, client_id, expires_at)
             SELECT ?, id, client_id, ? FROM grants WHERE id = ? AND client_id = ? AND revoked_at IS NULL AND activated_at IS NOT NULL",
            keys.keyed_hash("access", &access_token),
            now + ACCESS_TTL_MS,
            grant_id,
            client_id
        ),
        sql!(
            "INSERT INTO refresh_tokens (token_hash, grant_id, client_id, expires_at)
             SELECT ?, id, client_id, ? FROM grants WHERE id = ? AND client_id = ? AND revoked_at IS NULL AND activated_at IS NOT NULL",
            keys.keyed_hash("refresh", &refresh_token),
            now + REFRESH_TTL_MS,
            grant_id,
            client_id
        ),
        sql!("DELETE FROM access_tokens WHERE expires_at < ?", now),
        sql!("DELETE FROM refresh_tokens WHERE expires_at < ?", now),
        sql!(
            "SELECT g.id, g.client_id, g.team_name, g.key_label, g.role, g.read_only, g.sealed_key
             FROM grants g WHERE g.id = ? AND g.revoked_at IS NULL",
            grant_id
        ),
    ]);
    let results = db.batch(statements).await?;
    let offset = activating as usize;
    let activated = !activating || results[0].changes == 1;
    let grant = results.last().and_then(|r| r.rows.first()).and_then(Grant::from_row);
    match (activated, results[offset].changes, results[offset + 1].changes, grant) {
        (true, 1, 1, Some(grant)) => {
            Ok(Issued { access_token, refresh_token, expires_in: ACCESS_TTL_MS / 1000, grant })
        }
        _ => Err(TokenError::InvalidGrant("This sign-in is no longer valid. Sign in again.")),
    }
}

/// The grant an access token belongs to, if the token is live and the grant isn't revoked.
pub async fn grant_for_access_token<D: Db>(
    db: &D,
    keys: &Keys,
    access_token: &str,
    now: i64,
) -> Result<Option<Grant>, DbError> {
    let row = db
        .first(sql!(
            "SELECT g.id, g.client_id, g.team_name, g.key_label, g.role, g.read_only, g.sealed_key
             FROM access_tokens a JOIN grants g ON g.id = a.grant_id
             WHERE a.token_hash = ? AND a.expires_at > ? AND a.client_id = g.client_id AND g.revoked_at IS NULL",
            keys.keyed_hash("access", access_token),
            now
        ))
        .await?;
    Ok(row.as_ref().and_then(Grant::from_row))
}

/// Revokes a grant: its access tokens are deleted, its sealed key is wiped, and its refresh tokens
/// stop working (they're kept, spent, so a later presentation is still recognized).
pub async fn revoke_grant<D: Db>(db: &D, grant_id: &str, reason: &'static str, now: i64) -> Result<(), DbError> {
    db.batch(vec![
        sql!(
            "UPDATE grants SET revoked_at = ?, revoke_reason = ?, sealed_key = '' WHERE id = ? AND revoked_at IS NULL",
            now,
            reason,
            grant_id
        ),
        sql!("DELETE FROM access_tokens WHERE grant_id = ?", grant_id),
        sql!("UPDATE refresh_tokens SET used_at = ? WHERE grant_id = ? AND used_at IS NULL", now, grant_id),
    ])
    .await?;
    Ok(())
}

/// RFC 7009: revoking either token revokes the whole grant. Unknown tokens, and tokens of
/// another client, are ignored (the endpoint answers 200 either way).
pub async fn revoke_token<D: Db>(
    db: &D,
    keys: &Keys,
    token: &str,
    client_id: Option<&str>,
    now: i64,
) -> Result<(), DbError> {
    for (kind, query) in [
        ("access", "SELECT grant_id, client_id FROM access_tokens WHERE token_hash = ?"),
        ("refresh", "SELECT grant_id, client_id FROM refresh_tokens WHERE token_hash = ?"),
    ] {
        if let Some(row) = db.first(sql!(query, keys.keyed_hash(kind, token))).await? {
            let owner = text(&row, "client_id");
            if client_id.is_none() || owner.as_deref() == client_id {
                revoke_grant(db, &text(&row, "grant_id").unwrap_or_default(), "revoked_by_client", now).await?;
            }
            return Ok(());
        }
    }
    Ok(())
}
