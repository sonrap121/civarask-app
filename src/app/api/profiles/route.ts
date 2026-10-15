import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, likes, intimateRequests } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { coordsForCity } from "@/lib/cities";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  await ensureSeed();
  const sp = req.nextUrl.searchParams;
  const intent = sp.get("intent") || "";
  const gender = sp.get("gender") || "";
  const city = sp.get("city") || "";
  const q = (sp.get("q") || "").toLowerCase();
  const online = sp.get("online") === "1";
  let rows = await db.select().from(profiles).orderBy(desc(profiles.isOnline), desc(profiles.id));
  if (intent) rows = rows.filter(r => r.intent === intent);
  if (gender) rows = rows.filter(r => r.gender === gender);
  if (city) rows = rows.filter(r => r.city === city);
  if (online) rows = rows.filter(r => r.isOnline);
  if (q) rows = rows.filter(r => (r.name + " " + r.city + " " + r.district + " " + r.bio).toLowerCase().includes(q));
  const liked = await db.select().from(likes);
  const kindMap = new Map(liked.map(l => [l.profileId, l.kind || "normal"]));
  const reqs = await db.select().from(intimateRequests);
  const reqMap = new Map(reqs.map(r => [r.profileId, r.status]));
  const enriched = rows.map(r => ({ ...r, liked: kindMap.has(r.id), likeKind: kindMap.get(r.id) || null, intimateStatus: reqMap.get(r.id) || "none" }));
  return NextResponse.json({ profiles: enriched, total: enriched.length });
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  const b = await req.json();
  if (!b.name || !b.age || Number(b.age) < 18) {
    return NextResponse.json({ error: "18 yaşından küçükler kayıt olamaz. Ad ve yaş (18+) zorunludur." }, { status: 400 });
  }
  const [row] = await db.insert(profiles).values({
    name: String(b.name),
    age: Number(b.age),
    gender: b.gender || "Kadın",
    city: b.city || "İstanbul",
    district: b.district || "",
    intent: b.intent || "bekar",
    bio: b.bio || "Yeni katıldım, tanışmak için buradayım.",
    imageUrl: b.imageUrl || "https://images.pexels.com/photos/2530364/pexels-photo-2530364.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    interests: Array.isArray(b.interests) ? b.interests : ["Sohbet", "Kahve"],
    isOnline: true,
    distanceKm: 1,
    ...coordsForCity(b.city || "İstanbul", 5),
    isVerified: false,
    autoReplyEnabled: false,
    autoReplyMessage: "",
    autoReplyDelaySec: Number(b.autoReplyDelaySec || 4),
    hasPrivate: true,
    privateNote: "Özel albüm sadece karşılıklı onay ile açılır.",
  }).returning();
  return NextResponse.json({ profile: row });
}
