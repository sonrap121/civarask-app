import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { intimateRequests } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { eq } from "drizzle-orm";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(intimateRequests);
  return NextResponse.json({ requests: rows });
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  const b = await req.json();
  const profileId = Number(b.profileId);
  if (!profileId) return NextResponse.json({ error: "Profil gerekli" }, { status: 400 });
  const existing = await db.select().from(intimateRequests).where(eq(intimateRequests.profileId, profileId));
  if (existing.length) {
    const [row] = await db.update(intimateRequests)
      .set({ status: "pending", note: b.note || "Özel içerik alanını görmek için onayınızı rica ediyorum. Kabul ederseniz tüm sorumluluk bana aittir.", updatedAt: new Date() })
      .where(eq(intimateRequests.profileId, profileId)).returning();
    return NextResponse.json({ request: row });
  }
  const [row] = await db.insert(intimateRequests).values({
    profileId,
    status: "pending",
    note: b.note || "Özel içerik alanını görmek için onayınızı rica ediyorum. Kabul ederseniz tüm sorumluluk bana aittir.",
  }).returning();
  return NextResponse.json({ request: row });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json();
  const profileId = Number(b.profileId);
  const status = b.status === "rejected" ? "rejected" : "accepted";
  const existing = await db.select().from(intimateRequests).where(eq(intimateRequests.profileId, profileId));
  if (!existing.length) return NextResponse.json({ error: "İstek bulunamadı" }, { status: 404 });
  const [row] = await db.update(intimateRequests).set({ status, updatedAt: new Date() }).where(eq(intimateRequests.profileId, profileId)).returning();
  return NextResponse.json({ request: row });
}

export async function DELETE(req: NextRequest) {
  const profileId = Number(req.nextUrl.searchParams.get("profileId"));
  await db.delete(intimateRequests).where(eq(intimateRequests.profileId, profileId));
  return NextResponse.json({ ok: true });
}
