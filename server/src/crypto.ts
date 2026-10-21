const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface ServiceKeys {
  sealing: CryptoKey;
  hashing: CryptoKey;
}

let derived: { secret: string; keys: Promise<ServiceKeys> } | undefined;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deriveKeys(secret: string): Promise<ServiceKeys> {
  let raw: Uint8Array;
  try {
    raw = fromBase64(secret);
  } catch {
    raw = new Uint8Array();
  }
  if (raw.length !== 32) throw new Error("CREDENTIALS_KEY must be 32 random bytes, base64-encoded.");
  const master = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
  const derive = (info: string, algorithm: Parameters<SubtleCrypto["deriveKey"]>[2], usages: string[]) =>
    crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: encoder.encode(info) },
      master,
      algorithm,
      false,
      usages
    );
  return {
    sealing: await derive("guesty-token-service sealing", { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]),
    hashing: await derive("guesty-token-service hashing", { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign"]),
  };
}

export function serviceKeys(secret: string): Promise<ServiceKeys> {
  if (derived?.secret !== secret) derived = { secret, keys: deriveKeys(secret) };
  return derived.keys;
}

// The context binds a ciphertext to its row and column, so a sealed value
// copied into another team's row does not decrypt.
export async function seal(keys: ServiceKeys, plaintext: string, context: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
    keys.sealing,
    encoder.encode(plaintext)
  );
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(sealed))}`;
}

export async function unseal(keys: ServiceKeys, value: string, context: string): Promise<string> {
  const [version, iv, sealed] = value.split(".");
  if (version !== "v1" || !iv || !sealed) throw new Error("Unsupported sealed value.");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv), additionalData: encoder.encode(context) },
    keys.sealing,
    fromBase64(sealed)
  );
  return decoder.decode(plaintext);
}

export async function keyedHash(keys: ServiceKeys, value: string): Promise<string> {
  return toHex(await crypto.subtle.sign("HMAC", keys.hashing, encoder.encode(value)));
}

export function newAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `gts_${toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
