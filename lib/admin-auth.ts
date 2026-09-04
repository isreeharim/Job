import { NextRequest } from "next/server";
import crypto from "crypto";

export const ADMIN_EMAIL = "sreehariappu562@gmail.com";
export const ADMIN_PASSWORD = "812940";
export const ADMIN_COOKIE_NAME = "rf_admin_session";

const SECRET_SALT = process.env.CRON_SECRET || "rf_super_admin_salt_812940_secret";

export function generateAdminToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", SECRET_SALT)
    .update(`${ADMIN_EMAIL}:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, providedSig] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return false;

  // Session valid for 14 days
  const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAgeMs) return false;

  const expectedSig = crypto
    .createHmac("sha256", SECRET_SALT)
    .update(`${ADMIN_EMAIL}:${timestampStr}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export function verifyAdminRequest(req: NextRequest): boolean {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminToken(cookie);
}
