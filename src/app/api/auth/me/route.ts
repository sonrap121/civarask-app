import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken, publicUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ user: null });
    const [user] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: publicUser(user) });
  } catch (e) {
    console.error("me error:", e);
    // Oturum kontrolü asla hata sayfası döndürmez; girişsiz kabul et
    return NextResponse.json({ user: null });
  }
}
