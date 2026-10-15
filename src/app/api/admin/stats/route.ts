import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles, messages, likes, consents, vipOrders } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

async function requireAdmin(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [me] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
  if (!me || !me.isAdmin) return null;
  return me;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Bu alana yalnızca admin erişebilir." }, { status: 403 });

  const allUsers = await db.select().from(users);
  const allProfiles = await db.select().from(profiles);
  const allMessages = await db.select().from(messages);
  const allLikes = await db.select().from(likes);
  const allConsents = await db.select().from(consents).orderBy(desc(consents.id));
  const allOrders = await db.select().from(vipOrders).orderBy(desc(vipOrders.id));

  const now = new Date();
  const vipActive = (u: typeof users.$inferSelect) => u.isAdmin || (!!u.isVip && (!u.vipExpiresAt || new Date(u.vipExpiresAt) > now));
  const paidOrders = allOrders.filter(o => o.status === "paid");

  const userById = new Map(allUsers.map(u => [u.id, u]));
  const orders = allOrders.slice(0, 12).map(o => ({
    id: o.id, userId: o.userId,
    name: userById.get(o.userId)?.name || "Silinmiş üye",
    email: userById.get(o.userId)?.email || "-",
    planKey: o.planKey, stars: o.stars, status: o.status, createdAt: o.createdAt,
  }));
  const recentConsents = allConsents.slice(0, 8).map(c => ({
    id: c.id, birthDate: c.birthDate,
    approved: c.adultConfirmed && c.responsibilityAccepted,
    blocked: (c.consentText || "").startsWith("REDDEDİLDİ"),
    createdAt: c.createdAt,
  }));

  return NextResponse.json({
    admin: { id: admin.id, name: admin.name, email: admin.email },
    stats: {
      totalUsers: allUsers.length,
      vipUsers: allUsers.filter(vipActive).length,
      adminUsers: allUsers.filter(u => u.isAdmin).length,
      guestUsers: allUsers.filter(u => u.email.startsWith("uye-") || u.email === "misafir@civarask.com").length,
      totalProfiles: allProfiles.length,
      onlineProfiles: allProfiles.filter(p => p.isOnline).length,
      totalMessages: allMessages.length,
      totalLikes: allLikes.length,
      consentsApproved: allConsents.filter(c => c.adultConfirmed && c.responsibilityAccepted).length,
      consentsBlocked: allConsents.filter(c => (c.consentText || "").startsWith("REDDEDİLDİ")).length,
      ordersPaid: paidOrders.length,
      ordersPending: allOrders.filter(o => o.status === "pending").length,
      starsEarned: paidOrders.reduce((s, o) => s + o.stars, 0),
    },
    orders,
    consents: recentConsents,
  });
}
