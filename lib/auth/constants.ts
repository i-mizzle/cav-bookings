export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export const DEFAULT_ADMIN_NAME = process.env.ADMIN_USER_NAME?.trim() || "CAV Admin";
export const DEFAULT_ADMIN_EMAIL =
  process.env.ADMIN_USER_EMAIL?.trim().toLowerCase() || "admin@cavbookings.local";