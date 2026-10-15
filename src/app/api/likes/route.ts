import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { likes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(likes);
  const kinds: Record<number, string> = {};
  for (const r of rows) kinds[r.profileId] = r.kind || "normal";
  return NextResponse.json({ likes: rows, ids: rows.map(r => r.profileId), kinds });
}

// kind: "normal" kalp beğenisi | "super" süper beğen (yıldız)
// Aynı türde tekrar basmak beğeniyi kaldırır; normal -> super yükseltir.
export async function POST(req: NextRequest) {
  const b = await req.json();
  const profileId = Number(b.profileId);
  if (!profileId) return NextResponse.json({ error: "Profil gerekli" }, { status: 400 });
  const kind = b.kind === "super" ? "super" : "normal";
  const [existing] = await db.select().from(likes).where(eq(likes.profileId, profileId));

  if (existing) {
    if (kind === "super" && existing.kind !== "super") {
      await db.update(likes).set({ kind: "super" }).where(eq(likes.profileId, profileId));
      return NextResponse.json({ liked: true, kind: "super", upgraded: true });
    }
    await db.delete(likes).where(eq(likes.profileId, profileId));
    return NextResponse.json({ liked: false, kind: null });
  }
  await db.insert(likes).values({ profileId, kind });
  return NextResponse.json({ liked: true, kind });
}
