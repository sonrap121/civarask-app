import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vipOrders, users } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// VIP planları — ücretler Telegram Stars (⭐) cinsindendir
export const VIP_PLANS = [
  { key: "haftalik", name: "VIP Haftalık", days: 7, stars: 250, tagline: "Denemek için ideal", popular: false },
  { key: "aylik", name: "VIP Aylık", days: 30, stars: 750, tagline: "En çok tercih edilen", popular: true },
  { key: "ucaylik", name: "VIP 3 Aylık", days: 90, stars: 1800, tagline: "Ciddi arayanlara", popular: false },
  { key: "yillik", name: "VIP Yıllık", days: 365, stars: 4900, tagline: "En avantajlı fiyat", popular: false },
];

export function getPlan(key: string) {
  return VIP_PLANS.find(p => p.key === key) || null;
}

// Promosyon kodları (Stars fiyatına indirim oranı)
export const PROMO_CODES: Record<string, number> = { CIVAR10: 0.10, STAR20: 0.20 };

export async function GET() {
  return NextResponse.json({ plans: VIP_PLANS, currency: "Telegram Stars (⭐)" });
}

// Sipariş oluştur (pending) — ödeme Telegram Stars ile tamamlanır
export async function POST(req: NextRequest) {
  try {
    await ensureSeed();
    const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Önce giriş yapılmalı." }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const plan = getPlan(String(b.planKey || ""));
    if (!plan) return NextResponse.json({ error: "Geçersiz VIP planı." }, { status: 400 });
    const promoCode = String(b.promoCode || "").trim().toUpperCase();
    const discount = PROMO_CODES[promoCode] || 0;
    const stars = Math.round(plan.stars * (1 - discount));
    const [order] = await db.insert(vipOrders).values({
      userId: session.uid, planKey: plan.key, stars, status: "pending",
    }).returning();
    return NextResponse.json({ ok: true, order, plan, promoApplied: discount ? promoCode : "", discountRate: discount });
  } catch (e) {
    console.error("vip order error:", e);
    return NextResponse.json({ error: "Sipariş oluşturulamadı, tekrar deneyin." }, { status: 500 });
  }
}

// Kullanıcının sipariş geçmişi
export async function PATCH(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ orders: [] });
    const rows = await db.select().from(vipOrders).where(eq(vipOrders.userId, session.uid)).orderBy(desc(vipOrders.id)).limit(10);
    const [me] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
    return NextResponse.json({ orders: rows, vip: me ? { isVip: me.isVip, plan: me.vipPlan, expiresAt: me.vipExpiresAt } : null });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
