import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { consents } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

function ageFrom(dateStr: string) {
  const d = new Date(dateStr); const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  const b = await req.json();
  if (!b.birthDate) return NextResponse.json({ error: "Doğum tarihi zorunludur" }, { status: 400 });
  const age = ageFrom(b.birthDate);
  if (age < 18) {
    // 18 yaş altı giriş denemesi kayıt altına alınır ve kesin olarak reddedilir
    try {
      await db.insert(consents).values({
        birthDate: b.birthDate,
        adultConfirmed: false,
        responsibilityAccepted: false,
        consentText: `REDDEDİLDİ: Doğum tarihine göre yaş ${age} — 18 yaş altı giriş engellendi.`,
      });
    } catch { /* kayıt hatası reddi engellemez */ }
    return NextResponse.json({ error: "18 yaşını doldurmadığınız için bu alana girişiniz engellendi.", blocked: true, age }, { status: 403 });
  }
  if (!b.adultConfirmed || !b.responsibilityAccepted) {
    return NextResponse.json({ error: "Devam etmek için her iki onayı da işaretlemelisiniz." }, { status: 400 });
  }
  const [row] = await db.insert(consents).values({
    birthDate: b.birthDate,
    adultConfirmed: true,
    responsibilityAccepted: true,
    consentText: "18 yaşından büyük olduğumu, cinsel içerikli alana kendi isteğimle girdiğimi ve tüm sorumluluğun bana ait olduğunu kabul ediyorum.",
  }).returning();
  return NextResponse.json({ ok: true, consent: row, age });
}
export async function GET() {
  const rows = await db.select().from(consents);
  return NextResponse.json({ count: rows.length, last: rows[rows.length - 1] || null });
}
