import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, likes, messages, intimateRequests } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export async function GET() {
  await ensureSeed();
  const p = await db.select().from(profiles);
  const l = await db.select().from(likes);
  const m = await db.select().from(messages);
  const r = await db.select().from(intimateRequests);
  return NextResponse.json({
    onlineBase: 123000,
    onlineLabel: "123.000 kişi çevrimiçi",
    profiles: p.length,
    onlineProfiles: p.filter(x => x.isOnline).length,
    likes: l.length,
    messages: m.length,
    pendingRequests: r.filter(x => x.status === "pending").length,
    acceptedRequests: r.filter(x => x.status === "accepted").length,
  });
}
