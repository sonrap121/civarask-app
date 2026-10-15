import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { verifyPassword, createSessionToken, SESSION_COOKIE, cookieOptions, publicUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await ensureSeed();
    const b = await req.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    if (!email || !password) return NextResponse.json({ error: "E-posta ve şifrenizi yazın." }, { status: 400 });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return NextResponse.json({ error: "Bu e-posta ile kayıtlı hesap bulunamadı. Önce 'Kayıt Ol' ile üye olun." }, { status: 404 });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Şifreniz yanlış. Lütfen tekrar deneyin." }, { status: 401 });

    const res = NextResponse.json({ ok: true, user: publicUser(user), message: `Hoş geldin ${user.name}, giriş yapıldı.` });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user), cookieOptions);
    return res;
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Giriş sırasında sunucu hatası oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
