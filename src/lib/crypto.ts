import crypto from "node:crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = env.encryptionKey;
  if (!raw || raw.length !== 64) {
    // Derive a deterministic key from a fallback so the app never crashes in demo.
    return crypto.createHash("sha256").update("replypilot-dev-key").digest();
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypt a plaintext string (e.g. an Instagram access token) at rest.
 * Returns a self-contained `iv:authTag:ciphertext` string, all hex-encoded.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${enc.toString("hex")}`;
}

/** Decrypt a value produced by `encrypt`. Throws on tamper / wrong key. */
export function decrypt(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

/** Hash a password using scrypt (no external deps). Returns `salt:hash`. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}

/** Verify an Instagram webhook X-Hub-Signature-256 header. */
export function verifyHubSignature(rawBody: string, signatureHeader: string): boolean {
  if (!env.instagramAppSecret) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", env.instagramAppSecret)
    .update(rawBody)
    .digest("hex");
  if (!signatureHeader) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}
