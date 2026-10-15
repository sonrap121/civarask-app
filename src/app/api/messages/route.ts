import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { asc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  await ensureSeed();
  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) {
    const all = await db.select().from(messages).orderBy(asc(messages.createdAt));
    return NextResponse.json({ messages: all });
  }
  const rows = await db.select().from(messages).where(eq(messages.profileId, Number(profileId))).orderBy(asc(messages.createdAt));
  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  const b = await req.json();
  const profileId = Number(b.profileId);
  if (!profileId || !b.text?.trim()) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
  const fromMe = b.fromMe === false ? false : true;
  const [row] = await db.insert(messages).values({
    profileId, fromMe, text: String(b.text).trim(), isAutoReply: false,
  }).returning();
  return NextResponse.json({ message: row });
}
