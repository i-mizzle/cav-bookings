import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function normalizeSecret(secret: string) {
  return secret.normalize("NFKC").trim();
}

export function hashPassword(password: string) {
  const normalizedPassword = normalizeSecret(password);
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(normalizedPassword, salt, KEY_LENGTH).toString("hex");

  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedKey] = passwordHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const normalizedPassword = normalizeSecret(password);
  const derivedKey = scryptSync(normalizedPassword, salt, KEY_LENGTH);
  const storedKeyBuffer = Buffer.from(storedKey, "hex");

  if (storedKeyBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKeyBuffer, derivedKey);
}