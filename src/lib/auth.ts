import crypto from "crypto";
import type { users } from "@/db/schema";

export const SESSION_COOKIE = "civarask_session";

export type PublicUser = {
  id: number; name: string; email: string; age: number; gender: string;
  city: string; district: string; intent: string; profileId: number | null;
  isVip: boolean; vipPlan: string; vipExpiresAt: string | null; isGuest: boolean; isAdmin: boolean;
};

export function publicUser(u: typeof users.$inferSelect): PublicUser {
  const vipActive = !!u.isVip && (!u.vipExpiresAt || new Date(u.vipExpiresAt) > new Date());
  return {
    id: u.id, name: u.name, email: u.email, age: u.age, gender: u.gender,
    city: u.city, district: u.district, intent: u.intent, profileId: u.profileId,
    // Admin hesabında VIP özellikler ücretsiz ve süresiz aktiftir (test edebilmesi için)
    isVip: vipActive || !!u.isAdmin,
    vipPlan: u.isAdmin ? (u.vipPlan || "Admin VIP (Ücretsiz)") : (u.vipPlan || ""),
    vipExpiresAt: u.vipExpiresAt ? new Date(u.vipExpiresAt).toISOString() : null,
    isGuest: u.email === "misafir@civarask.com" || u.email.startsWith("uye-"),
    isAdmin: !!u.isAdmin,
  };
}
const SECRET = process.env.AUTH_SECRET || "civarask-gizli-anahtar-2024";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex"));
    });
  });
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = (stored || "").split(":");
  if (!salt || !expected) return false;
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex"));
    });
  });
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionToken(user: { id: number; email: string; name: string }): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: user.id, email: user.email, name: user.name, exp: Date.now() + MAX_AGE_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): { uid: number; email: string; name: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return { uid: data.uid, email: data.email, name: data.name };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_MS / 1000,
};
