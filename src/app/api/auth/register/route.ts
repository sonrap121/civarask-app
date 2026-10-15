import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { hashPassword, createSessionToken, SESSION_COOKIE, cookieOptions, publicUser } from "@/lib/auth";
import { coordsForCity } from "@/lib/cities";
import { eq } from "drizzle-orm";

const DEFAULT_IMG: Record<string, string> = {
  "Kadın": "https://images.pexels.com/photos/2530364/pexels-photo-2530364.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "Erkek": "https://images.pexels.com/photos/32778912/pexels-photo-32778912.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
};

export async function POST(req: NextRequest) {
  try {
    await ensureSeed();
    const b = await req.json().catch(() => ({}));
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    const age = Number(b.age || 0);

    if (!name) return NextResponse.json({ error: "Adınızı yazın." }, { status: 400 });
    if (!email || !email.includes("@") || !email.includes(".")) return NextResponse.json({ error: "Geçerli bir e-posta adresi yazın." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Şifreniz en az 6 karakter olmalı." }, { status: 400 });
    if (!age || age < 18) return NextResponse.json({ error: "CivarAşk yalnızca 18 yaş ve üzeri içindir." }, { status: 400 });

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı. Lütfen 'Giriş Yap' ile giriş yapın." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      name, email, passwordHash, age,
      gender: b.gender === "Erkek" ? "Erkek" : "Kadın",
      city: String(b.city || "İstanbul").trim() || "İstanbul",
      district: String(b.district || "").trim(),
      intent: ["dul", "bekar", "sevgili", "evlilik", "kacamak"].includes(b.intent) ? b.intent : "bekar",
    }).returning();

    const [profile] = await db.insert(profiles).values({
      userId: user.id,
      name, age,
      gender: user.gender,
      city: user.city,
      district: user.district,
      intent: user.intent,
      bio: String(b.bio || "").trim() || "Yeni katıldım, tanışmak için buradayım.",
      imageUrl: DEFAULT_IMG[user.gender] || DEFAULT_IMG["Kadın"],
      interests: ["Sohbet", "Kahve", "Yürüyüş"],
      isOnline: true,
      distanceKm: 0,
      ...coordsForCity(user.city, user.id),
      isVerified: false,
      autoReplyEnabled: false,
      autoReplyMessage: "",
      autoReplyDelaySec: 4,
      hasPrivate: true,
      privateNote: "Özel albüm sadece karşılıklı onay ile açılır.",
    }).returning();

    const [updated] = await db.update(users).set({ profileId: profile.id }).where(eq(users.id, user.id)).returning();

    const res = NextResponse.json({ ok: true, user: publicUser(updated), message: "Kayıt tamamlandı, otomatik giriş yapıldı." });
    res.cookies.set(SESSION_COOKIE, createSessionToken(updated), cookieOptions);
    return res;
  } catch (e: unknown) {
    console.error("register error:", e);
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı. Lütfen 'Giriş Yap' ile giriş yapın." }, { status: 409 });
    }
    return NextResponse.json({ error: "Sunucuda beklenmedik bir hata oluştu. Lütfen birkaç saniye sonra tekrar deneyin." }, { status: 500 });
  }
}
