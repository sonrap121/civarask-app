import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { hashPassword, verifyPassword, createSessionToken, SESSION_COOKIE, cookieOptions, publicUser } from "@/lib/auth";
import { coordsForCity, TURKEY_CITIES } from "@/lib/cities";
import { eq } from "drizzle-orm";

// Otomatik hesap: kayıt formu yok. Her cihaza özel bir hesap belirlenir,
// yoksa anında oluşturulur ve oturum açılır.

const IMG: Record<string, string> = {
  "Kadın": "https://images.pexels.com/photos/2530364/pexels-photo-2530364.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "Erkek": "https://images.pexels.com/photos/32778912/pexels-photo-32778912.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
};
const PEOPLE = [
  { name: "Elif", gender: "Kadın" }, { name: "Zeynep", gender: "Kadın" }, { name: "Selin", gender: "Kadın" },
  { name: "Merve", gender: "Kadın" }, { name: "Deniz", gender: "Kadın" }, { name: "Aylin", gender: "Kadın" },
  { name: "Gamze", gender: "Kadın" }, { name: "Ceren", gender: "Kadın" },
  { name: "Emre", gender: "Erkek" }, { name: "Kerem", gender: "Erkek" }, { name: "Murat", gender: "Erkek" },
  { name: "Barış", gender: "Erkek" }, { name: "Arda", gender: "Erkek" }, { name: "Onur", gender: "Erkek" },
];
const CITIES = TURKEY_CITIES;
const INTENTS = ["bekar", "sevgili", "dul", "evlilik", "kacamak"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function createAccount(email: string, password: string) {
  const person = pick(PEOPLE);
  const name = `${person.name} ${Math.floor(1000 + Math.random() * 9000)}`;
  const city = pick(CITIES);
  const age = 24 + Math.floor(Math.random() * 16);
  const intent = pick(INTENTS);
  const [user] = await db.insert(users).values({
    name, email, passwordHash: await hashPassword(password), age,
    gender: person.gender, city, district: "", intent,
  }).returning();
  const [profile] = await db.insert(profiles).values({
    userId: user.id, name, age, gender: person.gender, city, district: "", intent,
    bio: "CivarAşk'a otomatik hesabımla katıldım, tanışmak için buradayım.",
    imageUrl: IMG[person.gender] || IMG["Kadın"],
    interests: ["Sohbet", "Kahve", "Yürüyüş"],
    isOnline: true, distanceKm: 0, isVerified: false,
    ...coordsForCity(city, user.id),
    autoReplyEnabled: false,
    autoReplyMessage: "",
    autoReplyDelaySec: 3,
    hasPrivate: true,
    privateNote: "Özel albüm sadece karşılıklı onay ile açılır.",
  }).returning();
  const [updated] = await db.update(users).set({ profileId: profile.id }).where(eq(users.id, user.id)).returning();
  return updated;
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeed();
    const b = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");

    let user: typeof users.$inferSelect;
    if (email && password) {
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) {
        const ok = await verifyPassword(password, existing.passwordHash);
        if (!ok) return NextResponse.json({ error: "Otomatik hesap doğrulanamadı." }, { status: 401 });
        user = existing;
        await db.update(profiles).set({ isOnline: true }).where(eq(profiles.id, user.profileId ?? -1));
      } else {
        user = await createAccount(email, password);
      }
    } else {
      // Bilgi gönderilmezse paylaşılan yedek hesap
      const [existing] = await db.select().from(users).where(eq(users.email, "misafir@civarask.com")).limit(1);
      user = existing ?? (await createAccount("misafir@civarask.com", "misafir-" + Math.random().toString(36).slice(2, 12)));
    }

    const res = NextResponse.json({ ok: true, user: publicUser(user), message: `Hoş geldin ${user.name}, hesabın otomatik belirlendi.` });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user), cookieOptions);
    return res;
  } catch (e) {
    console.error("guest login error:", e);
    return NextResponse.json({ error: "Otomatik giriş sırasında hata oluştu, sayfayı yenileyip tekrar deneyin." }, { status: 500 });
  }
}
