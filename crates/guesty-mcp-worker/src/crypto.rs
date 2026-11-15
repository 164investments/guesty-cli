//! Keys derived from the Worker's `MCP_KEY` secret, and the primitives built on them.
//!
//! `MCP_KEY` is 32 random bytes, base64-encoded. HKDF-SHA256 derives three independent keys from
//! it: one seals member access keys (AES-256-GCM), one makes keyed hashes of codes, tokens and
//! addresses (HMAC-SHA256), and one signs the sign-in page's pending-request field.

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::Engine;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

pub struct Keys {
    sealing: [u8; 32],
    hashing: [u8; 32],
    forms: [u8; 32],
}

#[derive(Debug, PartialEq)]
pub struct BadSecret;

impl Keys {
    pub fn from_secret(secret: &str) -> Result<Keys, BadSecret> {
        let raw = STANDARD.decode(secret.trim()).map_err(|_| BadSecret)?;
        if raw.len() != 32 {
            return Err(BadSecret);
        }
        let hk = Hkdf::<Sha256>::new(None, &raw);
        let derive = |info: &str| {
            let mut out = [0u8; 32];
            hk.expand(info.as_bytes(), &mut out).map_err(|_| BadSecret)?;
            Ok::<_, BadSecret>(out)
        };
        Ok(Keys {
            sealing: derive("guesty-mcp sealing")?,
            hashing: derive("guesty-mcp hashing")?,
            forms: derive("guesty-mcp forms")?,
        })
    }

    /// Encrypts `plaintext`. The context binds the ciphertext to its row, so a sealed value copied
    /// into another row doesn't open.
    pub fn seal(&self, plaintext: &str, context: &str) -> String {
        let cipher = Aes256Gcm::new_from_slice(&self.sealing).expect("32-byte key");
        let iv: [u8; 12] = random_bytes();
        let sealed = cipher
            .encrypt(Nonce::from_slice(&iv), Payload { msg: plaintext.as_bytes(), aad: context.as_bytes() })
            .expect("AES-GCM encryption");
        format!("v1.{}.{}", STANDARD.encode(iv), STANDARD.encode(sealed))
    }

    pub fn unseal(&self, value: &str, context: &str) -> Option<String> {
        let mut parts = value.split('.');
        if parts.next()? != "v1" {
            return None;
        }
        let iv = STANDARD.decode(parts.next()?).ok()?;
        let sealed = STANDARD.decode(parts.next()?).ok()?;
        if iv.len() != 12 || parts.next().is_some() {
            return None;
        }
        let cipher = Aes256Gcm::new_from_slice(&self.sealing).ok()?;
        let plain = cipher.decrypt(Nonce::from_slice(&iv), Payload { msg: &sealed, aad: context.as_bytes() }).ok()?;
        String::from_utf8(plain).ok()
    }

    /// A keyed hash, hex. The kind keeps values of different types apart.
    pub fn keyed_hash(&self, kind: &str, value: &str) -> String {
        let mut mac = <HmacSha256 as Mac>::new_from_slice(&self.hashing).expect("HMAC key");
        mac.update(kind.as_bytes());
        mac.update(b":");
        mac.update(value.as_bytes());
        hex(&mac.finalize().into_bytes())
    }

    /// `base64url(payload).base64url(mac)`.
    pub fn sign(&self, payload: &[u8]) -> String {
        let mut mac = <HmacSha256 as Mac>::new_from_slice(&self.forms).expect("HMAC key");
        mac.update(payload);
        format!("{}.{}", URL_SAFE_NO_PAD.encode(payload), URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes()))
    }

    /// The payload of a value [`Keys::sign`] made, or `None` if it was changed.
    pub fn verify(&self, signed: &str) -> Option<Vec<u8>> {
        let (payload, tag) = signed.split_once('.')?;
        let payload = URL_SAFE_NO_PAD.decode(payload).ok()?;
        let tag = URL_SAFE_NO_PAD.decode(tag).ok()?;
        let mut mac = <HmacSha256 as Mac>::new_from_slice(&self.forms).ok()?;
        mac.update(&payload);
        mac.verify_slice(&tag).ok()?;
        Some(payload)
    }
}

pub fn random_bytes<const N: usize>() -> [u8; N] {
    let mut buf = [0u8; N];
    getrandom::getrandom(&mut buf).expect("random bytes");
    buf
}

/// 256 random bits, base64url, after a prefix that names the kind of token.
pub fn random_token(prefix: &str) -> String {
    format!("{prefix}{}", URL_SAFE_NO_PAD.encode(random_bytes::<32>()))
}

/// 128 random bits, hex: row ids.
pub fn random_id() -> String {
    hex(&random_bytes::<16>())
}

/// A nonce for a page's Content-Security-Policy.
pub fn nonce() -> String {
    URL_SAFE_NO_PAD.encode(random_bytes::<16>())
}

/// The PKCE S256 transform: base64url(SHA-256(verifier)).
pub fn s256(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(DIGITS[(byte >> 4) as usize] as char);
        out.push(DIGITS[(byte & 15) as usize] as char);
    }
    out
}
