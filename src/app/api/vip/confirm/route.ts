import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vipOrders, users } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken, publicUser } from "@/lib/auth";
import { getPlan } from "../route";
import { and, eq } from "drizzle-orm";

// Telegram Stars ödemesi onaylandığında VIP'i aktifleştirir (süre uzatma destekli)
export async function POST(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Önce giriş yapılmalı." }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const orderId = Number(b.orderId || 0);
    if (!orderId) return NextResponse.json({ error: "Sipariş numarası gerekli." }, { status: 400 });

    const [order] = await db.select().from(vipOrders)
      .where(and(eq(vipOrders.id, orderId), eq(vipOrders.userId, session.uid))).limit(1);
    if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });

    const [me] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
    if (!me) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

    if (order.status === "paid") {
      return NextResponse.json({ ok: true, user: publicUser(me), message: "Bu sipariş zaten ödenmiş, VIP'in aktif." });
    }

    const plan = getPlan(order.planKey);
    if (!plan) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 400 });

    await db.update(vipOrders).set({ status: "paid", paidAt: new Date() }).where(eq(vipOrders.id, order.id));

    const now = new Date();
    const base = me.vipExpiresAt && new Date(me.vipExpiresAt) > now ? new Date(me.vipExpiresAt) : now;
    const expires = new Date(base.getTime() + plan.days * 24 * 60 * 60 * 1000);

    const [updated] = await db.update(users)
      .set({ isVip: true, vipPlan: plan.name, vipExpiresAt: expires })
      .where(eq(users.id, me.id)).returning();

    return NextResponse.json({
      ok: true, user: publicUser(updated),
      message: `${order.stars} Stars ödemesi alındı. ${plan.name} aktif — bitiş: ${expires.toLocaleDateString("tr-TR")}.`,
    });
  } catch (e) {
    console.error("vip confirm error:", e);
    return NextResponse.json({ error: "VIP aktifleştirilemedi, tekrar deneyin." }, { status: 500 });
  }
}
