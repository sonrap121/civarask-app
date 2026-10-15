import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof b.autoReplyEnabled === "boolean") patch.autoReplyEnabled = b.autoReplyEnabled;
  if (typeof b.autoReplyMessage === "string") patch.autoReplyMessage = b.autoReplyMessage;
  if (typeof b.autoReplyDelaySec === "number") patch.autoReplyDelaySec = b.autoReplyDelaySec;
  const [row] = await db.update(profiles).set(patch).where(eq(profiles.id, Number(id))).returning();
  return NextResponse.json({ profile: row });
}
