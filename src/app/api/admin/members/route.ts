import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles, likes, messages, intimateRequests, vipOrders } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

async function requireAdmin(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [me] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
  if (!me || !me.isAdmin) return null;
  return me;
}

function vipActive(u: typeof users.$inferSelect) {
  return u.isAdmin || (!!u.isVip && (!u.vipExpiresAt || new Date(u.vipExpiresAt) > new Date()));
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Bu alana yalnızca admin erişebilir." }, { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase();
  const status = req.nextUrl.searchParams.get("status") || "all";
  const allUsers = await db.select().from(users).orderBy(desc(users.id));
  const allProfiles = await db.select().from(profiles);
  const byProfileId = new Map(allProfiles.map(p => [p.id, p]));
  const byUserId = new Map(allProfiles.filter(p => p.userId != null).map(p => [p.userId as number, p]));

  let members = allUsers.map(u => {
    const p = (u.profileId ? byProfileId.get(u.profileId) : undefined) || byUserId.get(u.id);
    return {
      id: u.id, name: u.name, email: u.email, age: u.age, gender: u.gender,
      city: u.city, district: u.district, intent: u.intent, createdAt: u.createdAt,
      isAdmin: !!u.isAdmin, isVip: vipActive(u), vipPlan: u.vipPlan || "",
      vipExpiresAt: u.vipExpiresAt, profileId: u.profileId,
      imageUrl: p?.imageUrl || "", isOnline: p?.isOnline ?? false,
      isGuest: u.email.startsWith("uye-") || u.email === "misafir@civarask.com",
      isSelf: u.id === admin.id,
    };
  });
  if (q) members = members.filter(m => (m.name + " " + m.email + " " + m.city).toLowerCase().includes(q));
  if (status === "vip") members = members.filter(m => m.isVip);
  if (status === "free") members = members.filter(m => !m.isVip);
  if (status === "online") members = members.filter(m => m.isOnline);
  if (status === "admin") members = members.filter(m => m.isAdmin);
  if (status === "guest") members = members.filter(m => m.isGuest);
  return NextResponse.json({ members, total: members.length });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Bu alana yalnızca admin erişebilir." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const userId = Number(b.userId || 0);
  const action = String(b.action || "");
  if (!userId) return NextResponse.json({ error: "Üye seçilmedi." }, { status: 400 });
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });

  if (action === "grantVip") {
    if (target.isAdmin) return NextResponse.json({ error: "Admin hesabında VIP zaten ücretsiz aktif." }, { status: 400 });
    const days = [7, 30, 90, 365].includes(Number(b.days)) ? Number(b.days) : 30;
    const now = new Date();
    const base = target.vipExpiresAt && new Date(target.vipExpiresAt) > now ? new Date(target.vipExpiresAt) : now;
    const expires = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await db.update(users).set({ isVip: true, vipPlan: `Admin Hediyesi (${days} gün)`, vipExpiresAt: expires }).where(eq(users.id, userId));
    return NextResponse.json({ ok: true, message: `${target.name} için ${days} günlük VIP tanımlandı (bitiş: ${expires.toLocaleDateString("tr-TR")}).` });
  }
  if (action === "revokeVip") {
    if (target.isAdmin) return NextResponse.json({ error: "Admin VIP'si kaldırılamaz." }, { status: 400 });
    await db.update(users).set({ isVip: false, vipPlan: "", vipExpiresAt: null }).where(eq(users.id, userId));
    return NextResponse.json({ ok: true, message: `${target.name} kullanıcısının VIP üyeliği kaldırıldı.` });
  }
  if (action === "toggleOnline") {
    if (!target.profileId) return NextResponse.json({ error: "Bu üyenin profili yok." }, { status: 400 });
    const [p] = await db.select().from(profiles).where(eq(profiles.id, target.profileId)).limit(1);
    if (!p) return NextResponse.json({ error: "Profil bulunamadı." }, { status: 404 });
    await db.update(profiles).set({ isOnline: !p.isOnline }).where(eq(profiles.id, p.id));
    return NextResponse.json({ ok: true, message: `${target.name} artık ${!p.isOnline ? "çevrimiçi" : "çevrimdışı"} görünüyor.` });
  }
  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Bu alana yalnızca admin erişebilir." }, { status: 403 });
  const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
  if (!userId) return NextResponse.json({ error: "Üye seçilmedi." }, { status: 400 });
  if (userId === admin.id) return NextResponse.json({ error: "Kendi admin hesabını silemezsin." }, { status: 400 });
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: "Admin hesapları silinemez." }, { status: 400 });

  const profs = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const pids = new Set<number>(profs.map(p => p.id));
  if (target.profileId) pids.add(target.profileId);
  for (const pid of pids) {
    await db.delete(likes).where(eq(likes.profileId, pid));
    await db.delete(messages).where(eq(messages.profileId, pid));
    await db.delete(intimateRequests).where(eq(intimateRequests.profileId, pid));
    await db.delete(profiles).where(eq(profiles.id, pid));
  }
  await db.delete(vipOrders).where(eq(vipOrders.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ ok: true, message: `${target.name} (${target.email}) ve profili silindi.` });
}
