import { ADMIN_SESSION_DURATION_SECONDS } from "@/lib/auth/constants";

type JwtHeader = {
  alg: "HS256";
  typ: "JWT";
};

export type AdminJwtPayload = {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
};

function encodeBase64Url(value: string | Uint8Array) {
  const buffer = typeof value === "string" ? Buffer.from(value) : Buffer.from(value);

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET ?? process.env.ADMIN_USER_PW;

  if (!secret) {
    throw new Error("Missing AUTH_JWT_SECRET or ADMIN_USER_PW environment variable.");
  }

  return secret;
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getJwtSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return encodeBase64Url(new Uint8Array(signature));
}

export async function createAdminJwt(payload: Pick<AdminJwtPayload, "sub" | "email" | "name">) {
  const now = Math.floor(Date.now() / 1000);
  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const body: AdminJwtPayload = {
    ...payload,
    iat: now,
    exp: now + ADMIN_SESSION_DURATION_SECONDS,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(body));
  const signature = await signValue(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyAdminJwt(token: string) {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(`${encodedHeader}.${encodedPayload}`);

  if (signature !== expectedSignature) {
    return null;
  }

  const parsedHeader = JSON.parse(decodeBase64Url(encodedHeader)) as JwtHeader;

  if (parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") {
    return null;
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AdminJwtPayload;

  if (!payload.sub || !payload.email || !payload.name || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}