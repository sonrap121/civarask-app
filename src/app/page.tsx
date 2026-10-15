"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart, MapPin, Search, BadgeCheck, MessageCircle, Lock, ShieldCheck, ShieldAlert,
  Send, X, Eye, EyeOff, Users, Sparkles, Gem, VenetianMask, HeartHandshake,
  Clock, CheckCheck, Filter, Check, Ban, KeyRound, LogIn, LogOut, Crown, Flame,
  UserPlus, Mail, Star, Navigation, LocateFixed, Trash2, Flag, Undo2, BadgePercent, History
} from "lucide-react";
import { TURKEY_CITIES, CITY_COORDS, haversineKm, nearestCity } from "@/lib/cities";

type Profile = {
  id: number; name: string; age: number; gender: string; city: string; district: string;
  intent: string; bio: string; imageUrl: string; interests: string[]; isOnline: boolean;
  distanceKm: number; lat?: number | null; lng?: number | null; isVerified: boolean;
  hasPrivate: boolean; privateNote: string; liked?: boolean; likeKind?: string | null; intimateStatus?: string;
};
type Msg = { id: number; profileId: number; fromMe: boolean; text: string; isAutoReply: boolean; createdAt?: string };
type AuthUser = { id: number; name: string; email: string; age: number; gender: string; city: string; district: string; intent: string; profileId: number | null; isVip?: boolean; vipPlan?: string; vipExpiresAt?: string | null; isGuest?: boolean; isAdmin?: boolean };
type AdminMember = { id: number; name: string; email: string; age: number; gender: string; city: string; intent: string; createdAt?: string; isAdmin: boolean; isVip: boolean; vipPlan: string; vipExpiresAt?: string | null; imageUrl: string; isOnline: boolean; isGuest: boolean; isSelf: boolean };
type VipPlan = { key: string; name: string; days: number; stars: number; tagline: string; popular: boolean };

const INTENTS = [
  { key: "", label: "Tümü", icon: Users, desc: "Herkesi keşfet" },
  { key: "dul", label: "Dullar", icon: HeartHandshake, desc: "Yeniden başlamak isteyenler" },
  { key: "bekar", label: "Bekarlar", icon: Sparkles, desc: "Tanışmaya hazır" },
  { key: "sevgili", label: "Sevgili Arayanlar", icon: Heart, desc: "İlişki isteyenler" },
  { key: "evlilik", label: "Evlilik / Eş", icon: Gem, desc: "Koca-eş, ciddi niyet" },
  { key: "kacamak", label: "Gizli Kaçamak", icon: VenetianMask, desc: "Mahremiyet esaslı" },
];
const INTENT_LABEL: Record<string, string> = { dul: "Dul", bekar: "Bekar", sevgili: "Sevgili Arıyor", evlilik: "Evlilik / Eş Arıyor", kacamak: "Gizli Kaçamak" };
const INTENT_GRAD: Record<string, string> = {
  dul: "from-violet-500 to-purple-600", bekar: "from-rose-500 to-pink-600", sevgili: "from-pink-500 to-rose-500",
  evlilik: "from-amber-400 to-orange-500", kacamak: "from-slate-700 to-slate-950",
};
const VIP_PLANS: VipPlan[] = [
  { key: "haftalik", name: "VIP Haftalık", days: 7, stars: 250, tagline: "Denemek için ideal", popular: false },
  { key: "aylik", name: "VIP Aylık", days: 30, stars: 750, tagline: "En çok tercih edilen", popular: true },
  { key: "ucaylik", name: "VIP 3 Aylık", days: 90, stars: 1800, tagline: "Ciddi arayanlara", popular: false },
  { key: "yillik", name: "VIP Yıllık", days: 365, stars: 4900, tagline: "En avantajlı fiyat", popular: false },
];
const VIP_PERKS = [
  { icon: Heart, t: "Seni Beğenenleri Gör", d: "Sana kalp gönderen herkesi açıkça gör, eşleşmeyi kaçırma." },
  { icon: MapPin, t: "Komşularını Bul", d: "Konumunu aç, sana en yakın üyeleri gerçek mesafesiyle sıralı gör." },
  { icon: Crown, t: "VIP Rozeti + Öncelik", d: "Profilin altın VIP rozetiyle Keşfet'te en üstte görünür." },
  { icon: MessageCircle, t: "Sınırsız Mesaj", d: "Mesaj ve özel istek sınırı olmadan özgürce konuş." },
  { icon: CheckCheck, t: "Okundu Bilgisi", d: "Mesajlarının okunup okunmadığını anında gör." },
  { icon: Eye, t: "Gizli Ziyaretçiler", d: "Profilini kimlerin ziyaret ettiğini listele." },
];
const REPLIES = [
  "Merhaba! Mesajın için teşekkürler, profilini inceledim, çok hoş görünüyorsun. Kendinden bahseder misin?",
  "Selam, yazmana sevindim. Ben de buralardayım, bir ara kahve içip tanışalım mı?",
  "Merhaba! Ben de samimi bir tanışma arıyorum. Neler yaparsın, nerelerdensin?",
];
const REPLIES_DISCREET = [
  "Merhaba... Gizliliğe ben de çok önem veriyorum, burada konuşalım. Kendinden bahseder misin?",
  "Selam, yazdığın için teşekkürler. Mahremiyet karşılıklı kırmızı çizgim; önce biraz tanışalım.",
];

function fmt(n: number) { return n.toLocaleString("tr-TR"); }
function timeoutSignal(ms = 15000): AbortSignal | undefined { try { return AbortSignal.timeout(ms); } catch { return undefined; } }
function calcAge(birthStr: string): number | null {
  const d = new Date(birthStr); if (isNaN(d.getTime())) return null;
  const now = new Date(); let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export default function Home() {
  const [tab, setTab] = useState<"kesfet" | "mesajlar" | "ozel" | "vip" | "begeniler" | "admin">("kesfet");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [intent, setIntent] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"onerilen" | "yakin" | "aktif" | "yeni">("onerilen");
  const [ageRange, setAgeRange] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [superUsed, setSuperUsed] = useState(0);
  const [onlineCount, setOnlineCount] = useState(123000);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [chatProfile, setChatProfile] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [toast, setToast] = useState("");
  // +18 onay
  const [consented, setConsented] = useState(false);
  const [birth, setBirth] = useState("");
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [consentErr, setConsentErr] = useState("");
  const [blocked18, setBlocked18] = useState(false);
  const [consentInfo, setConsentInfo] = useState<{ count: number; lastAt: string | null }>({ count: 0, lastAt: null });
  const [privFilter, setPrivFilter] = useState<"all" | "open" | "pending" | "locked">("all");
  const [privQ, setPrivQ] = useState("");
  const [privOnline, setPrivOnline] = useState(false);
  const [blockedIds, setBlockedIds] = useState<number[]>([]);
  const [reportedIds, setReportedIds] = useState<number[]>([]);
  const [hideOwn, setHideOwn] = useState(false);
  const [incomingDec, setIncomingDec] = useState<Record<number, string>>({});
  // hesap
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [authErr, setAuthErr] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [join, setJoin] = useState({ name: "", email: "", password: "", age: 25, gender: "Kadın", city: "İstanbul", district: "", intent: "bekar", bio: "" });
  // vip
  const [vipSel, setVipSel] = useState<VipPlan | null>(null);
  const [vipBusy, setVipBusy] = useState(false);
  const [vipOrders, setVipOrders] = useState<{ id: number; planKey: string; stars: number; status: string; createdAt?: string }[]>([]);
  const [vipRadius, setVipRadius] = useState(100);
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  // konum
  // admin
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminConsents, setAdminConsents] = useState<any[]>([]);
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [adminQ, setAdminQ] = useState("");
  const [adminStatus, setAdminStatus] = useState("all");
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locCity, setLocCity] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [manualCity, setManualCity] = useState("İstanbul");
  const [nearRadius, setNearRadius] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3400); };

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (intent) params.set("intent", intent);
    if (gender) params.set("gender", gender);
    if (city) params.set("city", city);
    if (q) params.set("q", q);
    if (onlineOnly) params.set("online", "1");
    const r = await fetch(`/api/profiles?${params}`);
    const d = await r.json();
    setProfiles(d.profiles || []);
  }, [intent, gender, city, q, onlineOnly]);

  const loadAll = useCallback(async () => {
    const r = await fetch(`/api/profiles`);
    const d = await r.json();
    setAllProfiles(d.profiles || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAll(); }, [loadAll, tab]);
  useEffect(() => {
    try {
      if (localStorage.getItem("civarask_18_consent") === "1") setConsented(true);
      if (localStorage.getItem("civarask_18_blocked")) setBlocked18(true);
      const b = localStorage.getItem("civarask_birth"); if (b) setBirth(b);
      if (localStorage.getItem("civarask_hideown") === "1") setHideOwn(true);
      const inc = JSON.parse(localStorage.getItem("civarask_incoming") || "{}"); if (inc && typeof inc === "object") setIncomingDec(inc);
    } catch { /* yoksay */ }
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
    const t = setInterval(() => setOnlineCount(123000 + Math.floor(Math.random() * 420) - 160), 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);
  useEffect(() => {
    if (tab === "ozel" && consented) {
      fetch("/api/consent").then(r => r.json()).then(d => setConsentInfo({ count: d.count || 0, lastAt: d.last?.createdAt || null })).catch(() => {});
    }
  }, [tab, consented]);

  const countFor = (key: string) => key === "" ? allProfiles.length : allProfiles.filter(p => p.intent === key).length;

  // --- KONUM ---
  function effDist(p: Profile): number {
    if (myPos && p.lat != null && p.lng != null) return Math.round(haversineKm(myPos, { lat: p.lat, lng: p.lng }) * 10) / 10;
    return p.distanceKm;
  }
  function fmtDist(d: number) { return d >= 100 ? `${Math.round(d)} km` : `${d.toLocaleString("tr-TR")} km`; }

  function requestLocation() {
    setLocErr("");
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setLocErr("Tarayıcınız konum desteklemiyor. Aşağıdan şehrinizi seçerek devam edebilirsiniz."); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos(p); setLocCity(nearestCity(p.lat, p.lng)); setLocBusy(false);
        showToast(`Konumun aktif: ${nearestCity(p.lat, p.lng)} çevresi. Mesafeler gerçek konumuna göre hesaplanıyor.`);
      },
      () => { setLocBusy(false); setLocErr("Konum izni alınamadı. Tarayıcı ayarlarından izin verin ya da şehrinizi seçerek devam edin."); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }
  function applyManualCity(c: string) {
    const coords = CITY_COORDS[c]; if (!coords) return;
    setMyPos(coords); setLocCity(c); setLocErr("");
    showToast(`Konumun ${c} olarak ayarlandı. Mesafeler bu şehre göre hesaplanıyor.`);
  }
  function clearLocation() { setMyPos(null); setLocCity(""); setNearRadius(0); showToast("Konum kapatıldı."); }

  // --- ETKİLEŞİM ---
  const superLeft = user?.isVip ? 999 : Math.max(0, 1 - superUsed);

  async function toggleLike(p: Profile, kind: "normal" | "super" = "normal") {
    if (kind === "super" && p.likeKind !== "super" && !user?.isVip && superLeft <= 0) {
      showToast("Bugünkü süper beğen hakkın doldu. VIP ile sınırsız süper beğen kazan!");
      setTab("vip");
      return;
    }
    const wasSuper = p.likeKind === "super";
    const r = await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: p.id, kind }) });
    const d = await r.json().catch(() => ({} as any));
    if (kind === "super" && d.kind === "super" && !wasSuper) {
      if (!user?.isVip) {
        const next = superUsed + 1;
        setSuperUsed(next);
        try { localStorage.setItem("civarask_super", JSON.stringify({ date: new Date().toDateString(), count: next })); } catch { /* yoksay */ }
      }
      showToast(`${p.name} SÜPER beğenildi — ona bildirimde öne çıkacaksın!`);
    } else if (d.liked) showToast(`${p.name} beğenildi, eşleşme listene eklendi`);
    else showToast(`${p.name} beğenisi kaldırıldı`);
    load(); loadAll();
  }

  function passProfile(p: Profile) {
    const next = [...hiddenIds, p.id];
    setHiddenIds(next);
    try { localStorage.setItem("civarask_hidden", JSON.stringify(next)); } catch { /* yoksay */ }
    showToast(`${p.name} geçildi. İstersen filtre çubuğundan geri gösterebilirsin.`);
  }
  function showHidden() {
    setHiddenIds([]);
    try { localStorage.removeItem("civarask_hidden"); } catch { /* yoksay */ }
    showToast("Geçilen profiller tekrar gösteriliyor.");
  }

  async function openChat(p: Profile) {
    setChatProfile(p); setTab("mesajlar");
    const r = await fetch(`/api/messages?profileId=${p.id}`);
    const d = await r.json();
    setMsgs(d.messages || []);
  }

  async function sendMsg() {
    if (!chatProfile || !chatInput.trim()) return;
    const p = chatProfile;
    const text = chatInput.trim(); setChatInput("");
    const myCountBefore = msgs.filter(m => m.fromMe).length;
    const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: p.id, text }) });
    const d = await r.json();
    if (d.message) setMsgs(prev => [...prev, d.message]);
    // Karşı taraf çevrimiçiyse bir süre sonra kendisi cevap yazar (ilk iki mesaja)
    if (p.isOnline && myCountBefore < 2) {
      const pool = p.intent === "kacamak" ? REPLIES_DISCREET : REPLIES;
      const reply = pool[myCountBefore % pool.length];
      setTimeout(() => setTyping(true), 2600);
      setTimeout(async () => {
        try {
          const rr = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: p.id, text: reply, fromMe: false }) });
          const dd = await rr.json();
          if (dd.message) setMsgs(prev => [...prev, dd.message]);
        } catch { /* yoksay */ }
        setTyping(false);
      }, 4600 + Math.random() * 1500);
    }
  }

  async function sendIntimate(p: Profile) {
    const r = await fetch("/api/intimate-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: p.id }) });
    const d = await r.json();
    if (d.request) {
      showToast(`${p.name} için özel içerik isteği gönderildi. Karşı taraf kabul ederse tüm sorumluluk kabul eden taraflara aittir.`);
      load(); loadAll();
      setTimeout(async () => {
        const accept = Math.random() > 0.22;
        await fetch("/api/intimate-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: p.id, status: accept ? "accepted" : "rejected" }) });
        showToast(accept ? `${p.name} özel içerik isteğini KABUL ETTİ — özel alan açıldı` : `${p.name} özel içerik isteğini reddetti`);
        load(); loadAll();
      }, 6000);
    }
  }

  async function cancelIntimate(p: Profile) {
    await fetch(`/api/intimate-requests?profileId=${p.id}`, { method: "DELETE" });
    showToast(`${p.name} için gönderdiğin özel istek geri çekildi.`);
    load(); loadAll();
  }

  async function revokeAccess(p: Profile) {
    await fetch(`/api/intimate-requests?profileId=${p.id}`, { method: "DELETE" });
    showToast(`${p.name} için özel erişimin sonlandırıldı — albüm tekrar kilitlendi.`);
    load(); loadAll();
  }

  function blockProfile(p: Profile) {
    if (blockedIds.includes(p.id)) return;
    const next = [...blockedIds, p.id];
    setBlockedIds(next);
    try { localStorage.setItem("civarask_blocked", JSON.stringify(next)); } catch { /* yoksay */ }
    showToast(`${p.name} engellendi. Özel alanda ve isteklerde artık görünmeyecek.`);
  }
  function unblockProfile(p: Profile) {
    const next = blockedIds.filter(id => id !== p.id);
    setBlockedIds(next);
    try { localStorage.setItem("civarask_blocked", JSON.stringify(next)); } catch { /* yoksay */ }
    showToast(`${p.name} engeli kaldırıldı.`);
  }
  function reportProfile(p: Profile) {
    if (reportedIds.includes(p.id)) { showToast(`${p.name} zaten şikayet edilmiş durumda.`); return; }
    const next = [...reportedIds, p.id];
    setReportedIds(next);
    try { localStorage.setItem("civarask_reports", JSON.stringify(next)); } catch { /* yoksay */ }
    showToast(`Şikayetin alındı. ${p.name} güvenlik ekibi tarafından incelenecek.`);
  }

  // --- +18 ONAY ---
  const birthAge = birth ? calcAge(birth) : null;

  async function submitConsent() {
    setConsentErr("");
    if (!birth) return setConsentErr("Doğum tarihinizi girin.");
    const age = calcAge(birth);
    if (age !== null && age < 18) {
      // Sunucu denemeyi kayıt altına alır ve reddeder; cihazda da engel kalıcı işaretlenir
      await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthDate: birth, adultConfirmed: c1, responsibilityAccepted: c2 }) }).catch(() => {});
      try { localStorage.setItem("civarask_18_blocked", birth); } catch { /* yoksay */ }
      setBlocked18(true);
      return;
    }
    if (!c1 || !c2 || !c3) return setConsentErr("Devam etmek için tüm onay kutularını işaretlemelisiniz.");
    const r = await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthDate: birth, adultConfirmed: c1, responsibilityAccepted: c2 }) });
    const d = await r.json().catch(() => ({} as any));
    if (!r.ok) {
      if (d.blocked) { try { localStorage.setItem("civarask_18_blocked", birth); } catch { /* yoksay */ } setBlocked18(true); return; }
      return setConsentErr(d.error || "Onay başarısız");
    }
    try { localStorage.setItem("civarask_18_consent", "1"); localStorage.setItem("civarask_birth", birth); } catch { /* yoksay */ }
    setConsented(true);
    showToast("Ön onay tamamlandı. +18 özel alan açıldı — tüm sorumluluk size aittir.");
  }

  function resetBlock() {
    try { localStorage.removeItem("civarask_18_blocked"); } catch { /* yoksay */ }
    setBlocked18(false); setBirth(""); setConsentErr("");
  }
  function safeExit() {
    try { localStorage.removeItem("civarask_18_consent"); } catch { /* yoksay */ }
    setConsented(false); setTab("kesfet");
    showToast("Özel alandan güvenli çıkış yapıldı.");
  }
  function toggleHideOwn(v: boolean) {
    setHideOwn(v);
    try { localStorage.setItem("civarask_hideown", v ? "1" : "0"); } catch { /* yoksay */ }
  }
  async function decideIncoming(p: Profile, accept: boolean) {
    const next = { ...incomingDec, [p.id]: accept ? "accepted" : "rejected" };
    setIncomingDec(next);
    try { localStorage.setItem("civarask_incoming", JSON.stringify(next)); } catch { /* yoksay */ }
    if (accept) {
      await fetch("/api/intimate-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: p.id, status: "accepted" }) }).catch(() => {});
      showToast(`${p.name} isteğini kabul ettin — özel alanınız karşılıklı açıldı, tüm sorumluluk taraflara aittir.`);
      loadAll();
    } else {
      showToast(`${p.name} isteği reddedildi.`);
    }
  }

  // --- HESAP ---
  async function doDirectLogin() {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      let creds = { email: "", password: "" };
      try {
        const saved = JSON.parse(localStorage.getItem("civarask_guest") || "null");
        if (saved?.email && saved?.password) creds = saved;
        else {
          const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
          creds = { email: `uye-${rand}@civarask.com`, password: `cv-${rand}` };
          localStorage.setItem("civarask_guest", JSON.stringify(creds));
        }
      } catch {
        const rand = Math.random().toString(36).slice(2, 10);
        creds = { email: `uye-${rand}@civarask.com`, password: `cv-${rand}` };
      }
      const r = await fetch("/api/auth/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds), signal: timeoutSignal() });
      const d = await r.json().catch(() => ({} as any));
      if (!r.ok || !d.user) { showToast(d.error || "Giriş yapılamadı, sayfayı yenileyip tekrar deneyin."); return; }
      try { localStorage.removeItem("civarask_no_auto"); } catch { /* yoksay */ }
      setUser(d.user); setAuthMode(null); setShowWelcome(true); setTab("kesfet");
      showToast(`Hoş geldin ${d.user.name}! Hesabın otomatik belirlendi, giriş yapıldı.`);
      load(); loadAll();
    } catch (e: any) { showToast(e?.name === "TimeoutError" || e?.name === "AbortError" ? "Sunucu zamanında yanıt vermedi. Tekrar dene." : "Bağlantı kurulamadı. Sayfayı yenileyip (F5) tekrar deneyin."); } finally { setAuthBusy(false); }
  }

  async function doLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    try { localStorage.setItem("civarask_no_auto", "1"); } catch { /* yoksay */ }
    setUser(null); setShowWelcome(false);
    showToast("Çıkış yapıldı. İstediğin an Giriş Yap ile aynı hesabına dönersin.");
  }

  function openAuth(mode: "login" | "register") { setAuthErr(""); setAuthMode(mode); }

  async function doLogin() {
    setAuthErr(""); setAuthBusy(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm), signal: timeoutSignal() });
      const d = await r.json().catch(() => ({} as any));
      if (!r.ok || !d.user) { setAuthErr(d.error || "Giriş yapılamadı. Bilgilerinizi kontrol edin."); return; }
      try { localStorage.removeItem("civarask_no_auto"); } catch { /* yoksay */ }
      setUser(d.user); setAuthMode(null); setShowWelcome(true); setTab("kesfet");
      showToast(`Hoş geldin ${d.user.name}! Giriş yapıldı.`);
      loadAll();
    } catch (e: any) { setAuthErr(e?.name === "TimeoutError" || e?.name === "AbortError" ? "Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin." : "Bağlantı kurulamadı. Sayfayı yenileyip tekrar deneyin."); } finally { setAuthBusy(false); }
  }

  async function doRegister() {
    setAuthErr("");
    if (!join.name.trim()) return setAuthErr("Adınızı yazın.");
    if (!join.email.includes("@")) return setAuthErr("Geçerli bir e-posta yazın.");
    if (join.password.length < 6) return setAuthErr("Şifreniz en az 6 karakter olmalı.");
    if (Number(join.age) < 18) return setAuthErr("CivarAşk yalnızca 18 yaş ve üzeri içindir.");
    setAuthBusy(true);
    try {
      const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(join), signal: timeoutSignal() });
      const d = await r.json().catch(() => ({} as any));
      if (!r.ok || !d.user) { setAuthErr(d.error || "Kayıt yapılamadı. Lütfen tekrar deneyin."); return; }
      try { localStorage.removeItem("civarask_no_auto"); } catch { /* yoksay */ }
      setUser(d.user); setAuthMode(null); setShowWelcome(true); setTab("kesfet");
      showToast(`Üyeliğin oluşturuldu. Hoş geldin ${d.user.name}!`);
      loadAll();
    } catch (e: any) { setAuthErr(e?.name === "TimeoutError" || e?.name === "AbortError" ? "Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin." : "Bağlantı kurulamadı. Sayfayı yenileyip tekrar deneyin."); } finally { setAuthBusy(false); }
  }

  async function openMyProfile() {
    let mine = allProfiles.find(p => p.id === user?.profileId);
    if (!mine && user?.profileId) {
      try {
        const r = await fetch("/api/profiles");
        const d = await r.json();
        setAllProfiles(d.profiles || []);
        mine = (d.profiles || []).find((p: Profile) => p.id === user.profileId);
      } catch { /* yoksay */ }
    }
    if (mine) { setSelected(mine); setTab("kesfet"); }
    else showToast("Profilin hazırlanıyor, Keşfet listesinde adına bakabilirsin.");
  }

  // --- VIP ---
  const PROMO_RATES: Record<string, number> = { CIVAR10: 10, STAR20: 20 };
  const promoRate = promoCode ? (PROMO_RATES[promoCode] || 0) : 0;
  const planPrice = (plan: VipPlan) => promoRate ? Math.max(1, Math.round(plan.stars * (100 - promoRate) / 100)) : plan.stars;

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (PROMO_RATES[code]) { setPromoCode(code); showToast(`${code} kodu uygulandı — Stars fiyatlarına %${PROMO_RATES[code]} indirim yansıtıldı!`); }
    else { setPromoCode(""); showToast("Promosyon kodu geçersiz. İpucu: CIVAR10"); }
  }

  function buyVip(plan: VipPlan) {
    if (!user) { showToast("Önce hesabın oluşturuluyor, bir saniye sonra tekrar dene."); doDirectLogin(); return; }
    setVipSel(plan);
  }
  async function confirmVipPayment() {
    if (!vipSel) return;
    setVipBusy(true);
    try {
      const r = await fetch("/api/vip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey: vipSel.key, promoCode: promoCode || undefined }) });
      const d = await r.json().catch(() => ({} as any));
      if (!r.ok || !d.order) { showToast(d.error || "Sipariş oluşturulamadı."); return; }
      const r2 = await fetch("/api/vip/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: d.order.id }) });
      const d2 = await r2.json().catch(() => ({} as any));
      if (!r2.ok || !d2.user) { showToast(d2.error || "VIP aktifleştirilemedi."); return; }
      setUser(d2.user); setVipSel(null);
      showToast(d2.message || `${vipSel.name} aktif! VIP ayrıcalıkların açıldı.`);
      loadVipOrders();
    } catch { showToast("Ödeme sırasında bağlantı hatası oluştu."); } finally { setVipBusy(false); }
  }
  const loadVipOrders = useCallback(async () => {
    try {
      const r = await fetch("/api/vip", { method: "PATCH" });
      const d = await r.json();
      setVipOrders(d.orders || []);
    } catch { /* yoksay */ }
  }, []);
  useEffect(() => { if (tab === "vip" && user) loadVipOrders(); }, [tab, user, loadVipOrders]);

  // --- ADMIN ---
  const loadAdmin = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (adminQ) params.set("q", adminQ);
      if (adminStatus !== "all") params.set("status", adminStatus);
      const [rs, rm] = await Promise.all([fetch("/api/admin/stats"), fetch(`/api/admin/members?${params}`)]);
      const ds = await rs.json().catch(() => ({}));
      const dm = await rm.json().catch(() => ({}));
      if (ds.stats) { setAdminStats(ds.stats); setAdminOrders(ds.orders || []); setAdminConsents(ds.consents || []); }
      if (dm.members) setAdminMembers(dm.members);
    } catch { /* yoksay */ }
  }, [adminQ, adminStatus]);

  useEffect(() => { if (tab === "admin" && user?.isAdmin) loadAdmin(); }, [tab, user, loadAdmin]);

  async function adminAction(m: AdminMember, action: string, days?: number) {
    const r = await fetch("/api/admin/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: m.id, action, days }) });
    const d = await r.json().catch(() => ({} as any));
    showToast(d.message || d.error || "İşlem tamamlandı.");
    loadAdmin();
    if (action === "grantVip" || action === "revokeVip") { /* üye listesi yenilendi */ }
  }
  async function adminDelete(m: AdminMember) {
    if (!confirm(`${m.name} (${m.email}) kalıcı olarak silinsin mi? Profili ve verileri de silinir.`)) return;
    const r = await fetch(`/api/admin/members?userId=${m.id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({} as any));
    showToast(d.message || d.error || "Üye silindi.");
    loadAdmin(); loadAll();
  }

  // --- türetilmiş listeler ---
  const privateProfiles = allProfiles.filter(p => p.hasPrivate);
  const likedProfiles = [...allProfiles.filter(p => p.liked)].sort((a, b) => (b.likeKind === "super" ? 1 : 0) - (a.likeKind === "super" ? 1 : 0));
  const AGE_RANGES: Record<string, [number, number]> = { "18-24": [18, 24], "25-34": [25, 34], "35-44": [35, 44], "45+": [45, 120] };
  let displayed = profiles
    .filter(p => !hiddenIds.includes(p.id))
    .map(p => ({ p, dist: effDist(p) }));
  if (ageRange !== "all" && AGE_RANGES[ageRange]) displayed = displayed.filter(x => x.p.age >= AGE_RANGES[ageRange][0] && x.p.age <= AGE_RANGES[ageRange][1]);
  if (verifiedOnly) displayed = displayed.filter(x => x.p.isVerified);
  if (myPos && nearRadius > 0) displayed = displayed.filter(x => x.dist <= nearRadius);
  if (sortBy === "yakin") displayed = [...displayed].sort((a, b) => a.dist - b.dist);
  else if (sortBy === "aktif") displayed = [...displayed].sort((a, b) => (b.p.isOnline ? 1 : 0) - (a.p.isOnline ? 1 : 0) || a.dist - b.dist);
  else if (sortBy === "yeni") displayed = [...displayed].sort((a, b) => b.p.id - a.p.id);
  else displayed = [...displayed].sort((a, b) => (b.p.isOnline ? 1 : 0) - (a.p.isOnline ? 1 : 0) || (b.p.likeKind === "super" ? 1 : 0) - (a.p.likeKind === "super" ? 1 : 0) || a.dist - b.dist);
  const neighbors = myPos
    ? allProfiles.filter(p => p.id !== user?.profileId).map(p => ({ p, dist: effDist(p) })).filter(x => x.dist <= vipRadius).sort((a, b) => a.dist - b.dist).slice(0, 12)
    : [];
  const myRequests = allProfiles.filter(p => p.intimateStatus && p.intimateStatus !== "none");
  const incoming = allProfiles.filter(p => p.hasPrivate && p.id !== user?.profileId && !incomingDec[p.id] && !blockedIds.includes(p.id)).slice(0, 3);
  const decisionHistory = allProfiles.filter(p => incomingDec[p.id]);
  const blockedProfiles = allProfiles.filter(p => blockedIds.includes(p.id));
  const privShown = privateProfiles.filter(p => {
    if (blockedIds.includes(p.id)) return false;
    if (hideOwn && p.id === user?.profileId) return false;
    if (privOnline && !p.isOnline) return false;
    if (privQ && !(p.name + " " + p.city).toLowerCase().includes(privQ.toLowerCase())) return false;
    const st = p.intimateStatus || "none";
    if (privFilter === "open") return st === "accepted";
    if (privFilter === "pending") return st === "pending";
    if (privFilter === "locked") return st === "none" || st === "rejected";
    return true;
  });

  const navItems = [
    { k: "kesfet" as const, label: "Keşfet" },
    { k: "mesajlar" as const, label: "Mesajlar" },
    { k: "ozel" as const, label: "+18 Özel Alan", lock: true },
    { k: "vip" as const, label: "VIP", crown: true },
    { k: "begeniler" as const, label: `Beğendiklerim${likedProfiles.length ? ` (${likedProfiles.length})` : ""}` },
    ...(user?.isAdmin ? [{ k: "admin" as const, label: "Admin Paneli", crown: false, lock: false, admin: true }] : []),
  ];

  const manualPicker = (compact = false) => (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-3"}`}>
      <select value={manualCity} onChange={e => setManualCity(e.target.value)} className="rounded-full bg-white px-3.5 py-2.5 text-[13px] font-bold text-slate-800 outline-none ring-1 ring-rose-200">
        {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => applyManualCity(manualCity)} className="rounded-full bg-slate-950 px-4 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-rose-600">Bu Şehirle Devam Et</button>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* ARKA PLAN */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff1f5_0%,#fdf4ff_38%,#ffffff_75%)]" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-rose-300/30 blur-3xl" />
        <div className="absolute top-24 -right-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="absolute top-[42rem] left-1/3 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      {/* ÜST CANLI BAR */}
      <div className="bg-slate-950/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 text-[12.5px] sm:justify-between">
          <span className="flex items-center gap-2 font-bold">
            <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-300">{fmt(onlineCount)} kişi çevrimiçi</span>
            <span className="hidden font-medium text-slate-400 sm:inline">— şu an aktif eşleşiyor</span>
          </span>
          <span className="hidden items-center gap-5 font-medium text-slate-300 md:flex">
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-rose-400" /> Gizlilik korumalı</span>
            <span>18+ ön onay aktif</span>
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-sky-300" /> 81 ilde konum tabanlı eşleşme</span>
          </span>
        </div>
      </div>

      {/* HEADER */}
      <header className="glass sticky top-0 z-40 border-b border-white/70 shadow-[0_10px_40px_rgba(225,29,72,0.07)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button onClick={() => setTab("kesfet")} className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 text-white shadow-lg shadow-rose-300/60"><Heart size={23} fill="currentColor" /></span>
            <span className="text-left leading-none">
              <span className="block text-[24px] font-extrabold tracking-tight">Civar<span className="bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent">Aşk</span></span>
              <span className="mt-0.5 block text-[10.5px] font-semibold tracking-wide text-slate-500">KONUM TABANLI • 81 İL</span>
            </span>
          </button>

          <nav className="ml-5 hidden items-center gap-1 rounded-full bg-white/60 p-1 ring-1 ring-rose-100 lg:flex">
            {navItems.map(n => (
              <button key={n.k} onClick={() => setTab(n.k)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold transition ${tab === n.k ? (n.k === "vip" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-300/60" : n.k === "admin" ? "bg-slate-950 text-white shadow-md" : "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-300/50") : (n.k === "vip" ? "text-amber-600 hover:bg-amber-50" : n.k === "admin" ? "text-slate-800 hover:bg-slate-100" : "text-slate-600 hover:bg-rose-50 hover:text-rose-700")}`}>
                {n.lock && <Lock size={12} />} {(n as { crown?: boolean }).crown && <Crown size={13} />} {(n as { admin?: boolean }).admin && <ShieldCheck size={13} />} {n.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <button onClick={openMyProfile} className={`flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 shadow-sm ring-1 transition hover:bg-white ${user.isVip ? "ring-amber-300" : "ring-rose-200/70"}`} title="Profilimi gör">
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold text-white ${user.isVip ? "bg-gradient-to-br from-amber-400 to-yellow-600" : "bg-gradient-to-br from-rose-500 to-fuchsia-500"}`}>{user.isVip ? <Crown size={16} /> : user.name.charAt(0).toUpperCase()}</span>
                  <span className="hidden text-left leading-none sm:block">
                    <span className="block max-w-[120px] truncate text-[13px] font-extrabold">{user.name}</span>
                    <span className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${user.isVip ? "text-amber-600" : "text-emerald-600"}`}><span className={`live-dot h-1.5 w-1.5 rounded-full ${user.isVip ? "bg-amber-500" : "bg-emerald-500"}`} /> {user.isAdmin ? "Admin • VIP Ücretsiz Aktif" : user.isVip ? `${user.vipPlan || "VIP"} Üye` : "Otomatik giriş"}</span>
                  </span>
                </button>
                {user.isAdmin && (
                  <button onClick={() => setTab("admin")} className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-md ring-1 ring-amber-400/60 transition hover:bg-slate-800"><ShieldCheck size={14} className="text-amber-400" /> <span className="hidden md:inline">Admin Paneli</span><span className="md:hidden">Admin</span></button>
                )}
                {user.isVip && !user.isAdmin ? (
                  <button onClick={() => setTab("vip")} className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-md shadow-amber-300/50 transition hover:brightness-110 md:flex"><Crown size={14} /> VIP</button>
                ) : user.isGuest ? (
                  <>
                    <button onClick={() => openAuth("login")} className="hidden items-center gap-1.5 rounded-full border-2 border-slate-950 bg-white/80 px-3.5 py-2 text-[12.5px] font-extrabold text-slate-950 transition hover:bg-slate-950 hover:text-white sm:flex"><LogIn size={14} /> Giriş Yap</button>
                    <button onClick={() => openAuth("register")} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-rose-300/50 transition hover:brightness-110"><UserPlus size={15} /> Üye Ol</button>
                  </>
                ) : null}
                <button onClick={doLogout} className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3.5 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:bg-red-600"><LogOut size={15} /> <span className="hidden sm:inline">Çıkış</span></button>
              </>
            ) : authBusy || !authReady ? (
              <span className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-[13px] font-bold text-rose-700 ring-1 ring-rose-200"><span className="live-dot h-2 w-2 rounded-full bg-rose-500" /> Hesabın hazırlanıyor...</span>
            ) : (
              <>
                <button onClick={() => openAuth("login")} className="flex items-center gap-1.5 rounded-full border-2 border-slate-950 bg-white/80 px-4 py-2 text-[13px] font-extrabold text-slate-950 transition hover:bg-slate-950 hover:text-white"><LogIn size={15} /> Giriş Yap</button>
                <button onClick={() => openAuth("register")} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-rose-300/50 transition hover:brightness-110"><UserPlus size={15} /> Üye Ol</button>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:hidden">
          {navItems.map(n => (
            <button key={n.k} onClick={() => setTab(n.k)} className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${tab === n.k ? (n.k === "vip" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow" : n.k === "admin" ? "bg-slate-950 text-white shadow" : "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow") : (n.k === "vip" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : n.k === "admin" ? "bg-slate-100 text-slate-800 ring-1 ring-slate-200" : "bg-white/70 text-slate-700 ring-1 ring-rose-100")}`}>{(n as { crown?: boolean }).crown && <Crown size={12} />} {(n as { admin?: boolean }).admin && <ShieldCheck size={12} />} {n.label}</button>
          ))}
        </div>
      </header>

      {/* HOŞ GELDİN ŞERİDİ */}
      {user && showWelcome && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="float-up flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[22px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-5 py-3.5 text-white shadow-lg shadow-emerald-200">
            <span className="flex items-center gap-2 text-sm font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/25">{user.isVip ? <Crown size={15} /> : <Check size={15} />}</span> Hoş geldin {user.name}{user.isVip ? " — VIP üyeliğin aktif!" : " — hesabın otomatik belirlendi!"}</span>
            <span className="hidden text-[13px] text-emerald-50 md:inline">{user.isVip ? `${user.vipPlan} • Bitiş: ${user.vipExpiresAt ? new Date(user.vipExpiresAt).toLocaleDateString("tr-TR") : "-"}` : user.isGuest ? "Kalıcı üyelik için ücretsiz Üye Ol, ayrıcalıklarını koru" : "Profilin Keşfet'te yayında • Kaldığın yerden devam et"}</span>
            {user.isGuest && !user.isVip && <button onClick={() => openAuth("register")} className="ml-auto flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-1.5 text-xs font-extrabold text-white shadow transition hover:bg-rose-700"><UserPlus size={13} /> Üye Ol</button>}
            <button onClick={openMyProfile} className={`${user.isGuest && !user.isVip ? "" : "ml-auto"} rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold text-emerald-700 shadow transition hover:bg-emerald-50`}>Profilimi Gör</button>
            <button onClick={() => setShowWelcome(false)} className="grid h-7 w-7 place-items-center rounded-full bg-white/20 transition hover:bg-white/35"><X size={14} /></button>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 top-24 z-[90] w-[92%] max-w-md -translate-x-1/2 rounded-2xl bg-slate-950/95 px-5 py-3.5 text-center text-sm font-semibold text-white shadow-2xl backdrop-blur float-up">{toast}</div>}

      <main className="mx-auto max-w-7xl px-4 pb-24">
        {tab === "kesfet" && (
          <>
            {/* HERO */}
            <section className="relative mt-6 overflow-hidden rounded-[36px] shadow-2xl shadow-rose-200/60 ring-1 ring-white/60">
              <img src="https://images.pexels.com/photos/11368690/pexels-photo-11368690.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" alt="Mutlu çift" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#20060f]/85 via-[#3d0a24]/55 to-rose-900/10" />
              <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.25fr_.75fr] lg:p-12">
                <div className="float-up">
                  <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide text-white ring-1 ring-white/30">
                    <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" /> ŞU AN {fmt(onlineCount)} KİŞİ ÇEVRİMİÇİ
                  </span>
                  <h1 className="font-display mt-5 text-4xl leading-[1.08] text-white sm:text-[3.4rem]">
                    Civarındaki aşk,<br /><span className="italic text-rose-300">bir mesaj uzağında.</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-rose-50/90">
                    Dullar, bekarlar, sevgili arayanlar, evlilik / koca-eş arayanlar ve gizli kaçamak isteyenler — Türkiye'nin 81 ilinde, konumuna en yakın kişilerle tanış.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <button onClick={() => document.getElementById("kesfet-grid")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-rose-950/40 transition hover:brightness-110">Hemen Keşfet</button>
                    <button onClick={() => myPos ? document.getElementById("kesfet-grid")?.scrollIntoView({ behavior: "smooth" }) : requestLocation()} className="glass-dark flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25"><LocateFixed size={15} /> {myPos ? `Konum: ${locCity}` : locBusy ? "Konum alınıyor..." : "Konumumu Kullan"}</button>
                    <button onClick={() => setTab("vip")} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-amber-950/30 transition hover:brightness-110"><Crown size={15} /> VIP Ol — Telegram Stars ile</button>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-2.5">
                    {[[fmt(onlineCount), "Çevrimiçi"], ["18+", "Yaş doğrulama"], ["%100", "Gizlilik"], ["81 İl", "Tüm Türkiye"]].map(([a, b]) => (
                      <div key={b} className="glass-dark rounded-2xl px-4 py-2.5 text-center ring-1 ring-white/20">
                        <div className="text-[17px] font-extrabold text-white">{a}</div>
                        <div className="text-[10.5px] font-semibold text-rose-100/80">{b}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative hidden lg:block">
                  <div className="glass-dark float-slow absolute right-2 top-2 w-60 rounded-[24px] p-3 ring-1 ring-white/25">
                    <div className="flex items-center gap-3">
                      <img src="https://images.pexels.com/photos/2530364/pexels-photo-2530364.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800" alt="Elif" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/40" />
                      <div className="text-white">
                        <p className="flex items-center gap-1.5 text-sm font-extrabold">Elif, 28 <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot" /></p>
                        <p className="text-[11px] text-rose-100/85">Kadıköy • 1,2 km • şimdi aktif</p>
                      </div>
                    </div>
                    <button onClick={() => document.getElementById("kesfet-grid")?.scrollIntoView({ behavior: "smooth" })} className="mt-3 w-full rounded-full bg-white py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-50">Mesaj Gönder</button>
                  </div>
                  <div className="glass-dark float-slower absolute bottom-4 left-0 w-64 rounded-[24px] p-4 ring-1 ring-white/25">
                    <p className="flex items-center gap-2 text-[13px] font-extrabold text-white"><MapPin size={15} className="text-sky-300" /> Komşularını Bul <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] font-black text-slate-950">VIP</span></p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-rose-50/85">Konumunu aç, sana en yakın üyeleri gerçek mesafeleriyle sıralı gör.</p>
                    <button onClick={() => setTab("vip")} className="mt-3 w-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 py-2 text-xs font-extrabold text-slate-950 transition hover:brightness-110">VIP'de Keşfet</button>
                  </div>
                </div>
              </div>
            </section>

            {/* KATEGORİLER */}
            <section className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-rose-500">Kategoriler</p>
                  <h2 className="mt-1 text-[26px] font-extrabold tracking-tight">Kime göre arıyorsun?</h2>
                </div>
                <p className="max-w-sm text-[13px] leading-relaxed text-slate-500">Dul, bekar, sevgili, evlilik ya da gizli kaçamak — niyetini seç, civarındakileri anında gör.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {INTENTS.map(it => {
                  const active = intent === it.key;
                  return (
                    <button key={it.key || "all"} onClick={() => setIntent(it.key)} className={`group rounded-[24px] p-4 text-left transition duration-300 hover:-translate-y-0.5 ${active ? "bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-600 text-white shadow-xl shadow-rose-300/50" : "glass text-slate-800 shadow-sm ring-1 ring-white/70 hover:shadow-lg hover:shadow-rose-100"}`}>
                      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-white/20 text-white" : `bg-gradient-to-br ${INTENT_GRAD[it.key] || "from-rose-500 to-pink-600"} text-white shadow-md`}`}><it.icon size={19} /></span>
                      <span className="mt-3 block text-[14px] font-extrabold leading-tight">{it.label}</span>
                      <span className={`mt-0.5 block text-[11.5px] leading-snug ${active ? "text-rose-100" : "text-slate-500"}`}>{it.desc}</span>
                      <span className={`mt-2.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${active ? "bg-white/25 text-white" : "bg-rose-50 text-rose-700"}`}>{countFor(it.key)} profil</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* FİLTRE + KONUM */}
            <section className="glass sticky top-[76px] z-30 mt-8 rounded-[26px] p-3 shadow-lg shadow-rose-100/60 ring-1 ring-white/70 lg:top-[84px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 text-[13px] font-extrabold text-slate-600"><Filter size={15} className="text-rose-500" /> Filtrele</span>
                <label className="relative min-w-[160px] flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="İsim, şehir, semt ara..." className="w-full rounded-full bg-white/80 py-2.5 pl-10 pr-3 text-sm font-medium outline-none ring-1 ring-rose-100 transition focus:ring-2 focus:ring-rose-400" />
                </label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="rounded-full bg-white/80 px-3.5 py-2.5 text-[13px] font-bold outline-none ring-1 ring-rose-100"><option value="">Kadın + Erkek</option><option>Kadın</option><option>Erkek</option></select>
                <select value={city} onChange={e => setCity(e.target.value)} className="max-w-[170px] rounded-full bg-white/80 px-3.5 py-2.5 text-[13px] font-bold outline-none ring-1 ring-rose-100">
                  <option value="">Tüm Şehirler (81 İl)</option>
                  {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setOnlineOnly(!onlineOnly)} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-extrabold transition ${onlineOnly ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200" : "bg-white/80 text-slate-600 ring-1 ring-rose-100"}`}><span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-white" : "bg-emerald-500 live-dot"}`} /> Sadece Çevrimiçi</button>
                {myPos ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-sky-200"><MapPin size={14} /> Konum: {locCity} <button onClick={clearLocation} className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-white/25 transition hover:bg-white/40"><X size={11} /></button></span>
                ) : (
                  <button onClick={requestLocation} disabled={locBusy} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-sky-200 transition hover:brightness-110 disabled:opacity-60"><LocateFixed size={14} /> {locBusy ? "Konum alınıyor..." : "Konumumu Kullan"}</button>
                )}
                <span className="ml-auto px-2 text-[13px] font-bold text-slate-500"><b className="text-rose-600">{displayed.length}</b> profil</span>
              </div>
              {myPos && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-rose-100/70 px-2 pt-2.5">
                  <span className="flex items-center gap-1 text-[12px] font-extrabold text-sky-700"><Navigation size={12} /> En yakından sıralanıyor • Yarıçap:</span>
                  {[{ v: 0, l: "Tümü" }, { v: 5, l: "5 km" }, { v: 10, l: "10 km" }, { v: 25, l: "25 km" }, { v: 50, l: "50 km" }, { v: 100, l: "100 km" }].map(r => (
                    <button key={r.v} onClick={() => setNearRadius(r.v)} className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${nearRadius === r.v ? "bg-sky-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-sky-100 hover:bg-sky-50"}`}>{r.l}</button>
                  ))}
                </div>
              )}
              {locErr && !myPos && (
                <div className="mt-2.5 rounded-[18px] bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <p className="text-[12.5px] font-bold text-red-700">{locErr}</p>
                  {manualPicker(true)}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-rose-100/70 px-2 pt-2.5">
                <span className="text-[12px] font-extrabold text-slate-500">Yaş:</span>
                {[{ k: "all", l: "Tümü" }, { k: "18-24", l: "18-24" }, { k: "25-34", l: "25-34" }, { k: "35-44", l: "35-44" }, { k: "45+", l: "45+" }].map(a => (
                  <button key={a.k} onClick={() => setAgeRange(a.k)} className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${ageRange === a.k ? "bg-rose-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-rose-100 hover:bg-rose-50"}`}>{a.l}</button>
                ))}
                <button onClick={() => setVerifiedOnly(!verifiedOnly)} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${verifiedOnly ? "bg-sky-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-sky-100 hover:bg-sky-50"}`}><BadgeCheck size={12} /> Doğrulanmış</button>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="rounded-full bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-slate-700 outline-none ring-1 ring-rose-100">
                  <option value="onerilen">Sırala: Önerilen</option>
                  <option value="yakin">Sırala: En Yakın</option>
                  <option value="aktif">Sırala: En Aktif</option>
                  <option value="yeni">Sırala: En Yeni</option>
                </select>
                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11.5px] font-extrabold text-amber-700 ring-1 ring-amber-200"><Star size={12} className="fill-amber-400 text-amber-400" /> Süper Beğen: {user?.isVip ? "Sınırsız (VIP)" : `bugün ${superLeft} hak`}</span>
                {hiddenIds.length > 0 && (
                  <button onClick={showHidden} className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-[11.5px] font-extrabold text-white transition hover:bg-rose-600"><Undo2 size={12} /> {hiddenIds.length} geçildi — geri göster</button>
                )}
              </div>
            </section>

            {/* PROFİL IZGARASI */}
            <section id="kesfet-grid" className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {displayed.map(({ p, dist }) => (
                <article key={p.id} className="group overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-rose-100/80 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-200/60">
                  <div className="relative aspect-[3/4] cursor-pointer overflow-hidden" onClick={() => setSelected(p)}>
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
                    <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                      <span className={`rounded-full bg-gradient-to-r px-2.5 py-1 text-[10.5px] font-extrabold text-white shadow ${INTENT_GRAD[p.intent]}`}>{INTENT_LABEL[p.intent]}</span>
                      {p.likeKind === "super" && <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 text-[10.5px] font-black text-slate-950 shadow"><Star size={10} className="fill-slate-950" /> Süper Beğenildi</span>}
                      {p.id === user?.profileId && <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10.5px] font-extrabold text-white shadow">Senin Profilin</span>}
                      {p.id !== user?.profileId && (
                        <button onClick={e => { e.stopPropagation(); passProfile(p); }} className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold text-slate-700 transition hover:bg-slate-950 hover:text-white" title="Bu profili geç"><X size={10} /> Geç</button>
                      )}
                    </div>
                    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
                      <button onClick={e => { e.stopPropagation(); toggleLike(p); }} className={`grid h-10 w-10 place-items-center rounded-full shadow transition ${p.liked ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white" : "glass text-rose-600 hover:bg-rose-600 hover:text-white"}`} title="Beğen"><Heart size={17} fill={p.liked ? "currentColor" : "none"} /></button>
                      {p.id !== user?.profileId && (
                        <button onClick={e => { e.stopPropagation(); toggleLike(p, "super"); }} className={`grid h-10 w-10 place-items-center rounded-full shadow transition ${p.likeKind === "super" ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950" : "glass text-amber-500 hover:bg-amber-400 hover:text-slate-950"}`} title="Süper Beğen (yıldız)"><Star size={17} fill={p.likeKind === "super" ? "currentColor" : "none"} /></button>
                      )}
                    </div>
                    <div className="glass-dark absolute inset-x-3 bottom-3 rounded-[20px] p-3 ring-1 ring-white/25">
                      <div className="flex items-center gap-1.5 text-white">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${p.isOnline ? "bg-emerald-400 live-dot" : "bg-slate-300"}`} />
                        <span className="text-[10.5px] font-bold">{p.isOnline ? "Şimdi çevrimiçi" : "Yakınlarda aktif"}</span>
                        <span className="ml-auto flex items-center gap-1 text-[10.5px] font-bold text-rose-100"><MapPin size={11} /> {fmtDist(dist)}</span>
                      </div>
                      <h3 className="mt-1 flex items-center gap-1.5 text-[17px] font-extrabold leading-tight text-white">{p.name}, {p.age} {p.isVerified && <BadgeCheck size={16} className="shrink-0 text-sky-300" />}</h3>
                      <p className="text-[11.5px] font-medium text-rose-100/90">{p.city}{p.district ? ` • ${p.district}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2.5">
                    <button onClick={() => openChat(p)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-rose-200 transition hover:brightness-110"><MessageCircle size={15} /> Mesaj At</button>
                    <button onClick={() => setSelected(p)} className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100" title="Profili gör"><Eye size={17} /></button>
                    <button onClick={() => { if (!consented) { setTab("ozel"); showToast("Özel içerik için önce +18 ön onay vermelisin"); } else sendIntimate(p); }} className={`grid h-10 w-10 place-items-center rounded-full transition ${p.intimateStatus === "accepted" ? "bg-emerald-100 text-emerald-700" : p.intimateStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-950 text-white hover:bg-rose-600"}`} title="Özel içerik isteği gönder"><Lock size={16} /></button>
                  </div>
                </article>
              ))}
              {displayed.length === 0 && (
                <div className="glass col-span-full rounded-[28px] p-12 text-center ring-1 ring-white/70">
                  <Search className="mx-auto text-rose-300" size={38} />
                  <p className="mt-3 text-lg font-extrabold">Bu filtreyle profil bulunamadı</p>
                  <p className="text-sm text-slate-500">{myPos && nearRadius > 0 ? "Seçtiğin yarıçapta kimse yok; yarıçapı büyüt ya da filtreleri temizle." : "Filtreleri temizleyip tekrar dene."}</p>
                  <button onClick={() => { setIntent(""); setGender(""); setCity(""); setQ(""); setOnlineOnly(false); setNearRadius(0); }} className="mt-5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-200">Filtreleri Temizle</button>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "mesajlar" && (
          <section className="glass mt-6 grid overflow-hidden rounded-[32px] shadow-xl shadow-rose-100/70 ring-1 ring-white/70 lg:grid-cols-[350px_1fr]" style={{ minHeight: 640 }}>
            <aside className="border-r border-rose-100/70 bg-white/40">
              <div className="border-b border-rose-100/70 p-5">
                <h2 className="flex items-center gap-2 text-lg font-extrabold"><MessageCircle className="text-rose-600" size={20} /> Mesajlarım</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Birini seç, sohbete başla. Karşındaki çevrimiçiyse genelde kısa sürede cevap yazar.</p>
              </div>
              <div className="max-h-[560px] overflow-y-auto p-2">
                {allProfiles.map(p => (
                  <button key={p.id} onClick={() => openChat(p)} className={`flex w-full items-center gap-3 rounded-[20px] p-2.5 text-left transition hover:bg-white/80 ${chatProfile?.id === p.id ? "bg-white shadow-md shadow-rose-100 ring-1 ring-rose-100" : ""}`}>
                    <span className="relative shrink-0"><img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded-[16px] object-cover" /><span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${p.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{p.name}, {p.age}</span>
                      <span className="block truncate text-xs text-slate-500">{p.city} • {INTENT_LABEL[p.intent]}{myPos ? ` • ${fmtDist(effDist(p))}` : ""}</span>
                    </span>
                    {p.isOnline && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-600 ring-1 ring-emerald-100">ÇEVRİMİÇİ</span>}
                  </button>
                ))}
              </div>
            </aside>
            <div className="flex flex-col bg-white/50">
              {!chatProfile ? (
                <div className="grid flex-1 place-items-center p-10 text-center">
                  <div>
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-rose-100 to-fuchsia-100 text-rose-500"><MessageCircle size={30} /></span>
                    <p className="mt-4 text-lg font-extrabold">Bir profil seç, sohbete başla</p>
                    <p className="text-sm text-slate-500">Soldan birini seç ya da Keşfet'ten "Mesaj At"a bas.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-rose-100/70 bg-white/60 p-4">
                    <img src={chatProfile.imageUrl} alt={chatProfile.name} className="h-12 w-12 rounded-[16px] object-cover ring-2 ring-rose-100" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[15px] font-extrabold">{chatProfile.name}, {chatProfile.age} {chatProfile.isVerified && <BadgeCheck size={16} className="text-sky-500" />}</p>
                      <p className="truncate text-xs text-slate-500">{chatProfile.isOnline ? "Çevrimiçi" : "Çevrimdışı"} • {chatProfile.city}{chatProfile.district ? `/${chatProfile.district}` : ""} • {INTENT_LABEL[chatProfile.intent]}</p>
                    </div>
                    {myPos && <span className="hidden items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-extrabold text-sky-700 ring-1 ring-sky-200 sm:flex"><MapPin size={13} /> {fmtDist(effDist(chatProfile))} yakınında</span>}
                    <button onClick={() => { if (!consented) { setTab("ozel"); showToast("Özel istek için önce +18 ön onay gerekli"); } else sendIntimate(chatProfile); }} className="flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-rose-600"><Lock size={13} /> Özel İstek Gönder</button>
                  </div>
                  <div className="flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-rose-50/50 to-fuchsia-50/30 p-4" style={{ maxHeight: 440 }}>
                    {msgs.length === 0 && (
                      <div className="glass mx-auto max-w-sm rounded-[24px] p-5 text-center ring-1 ring-white/70">
                        <p className="font-extrabold">{chatProfile.name} ile ilk mesajı sen at</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">Saygılı ve samimi bir merhaba her zaman işe yarar. Karşındaki çevrimiçiyse genelde kısa sürede döner.</p>
                        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                          {["Merhaba, nasılsın?", "Profilin çok hoşuma gitti", "Civarında mı oturuyorsun?"].map(s => <button key={s} onClick={() => setChatInput(s)} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-600 hover:text-white">{s}</button>)}
                        </div>
                      </div>
                    )}
                    {msgs.map(m => (
                      <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-[22px] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${m.fromMe ? "rounded-br-md bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-rose-200" : "rounded-bl-md bg-white ring-1 ring-rose-100"}`}>
                          {m.text}
                          <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.fromMe ? "text-rose-100" : "text-slate-400"}`}>{m.fromMe && <CheckCheck size={11} />} {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </div>
                      </div>
                    ))}
                    {typing && chatProfile && (
                      <div className="flex justify-start"><div className="flex items-center gap-2 rounded-[22px] rounded-bl-md bg-white px-4 py-3 ring-1 ring-rose-100"><span className="text-xs font-bold text-slate-500">{chatProfile.name} yazıyor</span><span className="typing flex gap-1"><span /><span /><span /></span></div></div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex items-center gap-2 border-t border-rose-100/70 bg-white/70 p-3.5">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder={`${chatProfile.name} kişisine mesaj yaz...`} className="flex-1 rounded-full bg-white px-4 py-3 text-sm outline-none ring-1 ring-rose-100 transition focus:ring-2 focus:ring-rose-400" />
                    <button onClick={sendMsg} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-300/60 transition hover:brightness-110"><Send size={18} /></button>
                  </div>
                  <p className="border-t border-rose-50 bg-white/50 px-4 py-2 text-center text-[11px] text-slate-400">Özel / cinsel içerik paylaşımı yalnızca karşılıklı istek ve kabul ile yapılır; kabul eden taraf tüm sorumluluğu üstlenir.</p>
                </>
              )}
            </div>
          </section>
        )}

        {tab === "ozel" && !consented && blocked18 && (
          <section className="glass float-up mx-auto mt-8 max-w-xl rounded-[32px] p-8 text-center shadow-2xl shadow-red-100 ring-1 ring-red-200 sm:p-10">
            <span className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white ring-4 ring-red-100"><Ban size={30} /></span>
            <h2 className="font-display mt-4 text-[26px]">Erişim Engellendi</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">Girdiğiniz doğum tarihine göre <b>18 yaşını doldurmadığınız</b> için bu alana girişinize izin verilmiyor. Bu deneme, güvenlik amacıyla tarih ve saat ile kayıt altına alındı.</p>
            <div className="mx-auto mt-5 max-w-md rounded-[20px] bg-red-50 p-4 text-left text-[12.5px] leading-relaxed text-red-800 ring-1 ring-red-200">
              <p className="flex gap-2"><ShieldAlert size={15} className="mt-0.5 shrink-0" /> CivarAşk'ın özel alanı yalnızca 18 yaş ve üzeri yetişkinler içindir. Yaş şartını sağlamayan hesaplar bu alana hiçbir şekilde alınmaz.</p>
            </div>
            <button onClick={() => setTab("kesfet")} className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-rose-600">Güvenli Alana Dön</button>
            <button onClick={resetBlock} className="mt-3 block w-full text-[12px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">Doğum tarihimi yanlış girdim, tekrar denemek istiyorum</button>
          </section>
        )}

        {tab === "ozel" && !consented && !blocked18 && (
          <section className="glass float-up mx-auto mt-8 max-w-2xl overflow-hidden rounded-[32px] shadow-2xl shadow-rose-200/60 ring-1 ring-white/70">
            <div className="relative overflow-hidden bg-slate-950 p-7 text-center text-white sm:p-9">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-600/40 blur-3xl" />
              <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-fuchsia-600/30 blur-3xl" />
              <span className="relative mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 text-[22px] font-extrabold ring-4 ring-white/15">18+</span>
              <h2 className="font-display relative mt-4 text-[28px]">Özel Alana Giriş — Ön Onay</h2>
              <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">Bu alan yetişkinlere özeldir. Doğum tarihinize göre yaşınız hesaplanır; <b className="text-white">18 yaşını doldurmayanlar kesinlikle içeri alınmaz.</b></p>
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex gap-3 rounded-[20px] bg-amber-50/90 p-4 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-200/70">
                <ShieldAlert className="mt-0.5 shrink-0 text-amber-600" size={18} />
                <p><b>Önemli:</b> Özel içerikler yalnızca <b>istek gönderilerek</b> ve karşı taraf <b>kabul ederse</b> görüntülenebilir. Kabul eden taraf, gördüğü ve paylaştığı içerikle ilgili <b>tüm sorumluluğun kendisine ait olduğunu</b> kabul etmiş sayılır.</p>
              </div>
              <label className="block">
                <span className="text-sm font-extrabold">Doğum Tarihiniz</span>
                <input type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={e => setBirth(e.target.value)} className="mt-1.5 w-full rounded-2xl bg-white/80 px-4 py-3 text-sm outline-none ring-1 ring-rose-200 transition focus:ring-2 focus:ring-rose-400" />
              </label>
              {birthAge !== null && (
                birthAge >= 18
                  ? <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-800 ring-1 ring-emerald-200"><ShieldCheck size={15} /> Yaşınız: {birthAge} — 18 yaş şartını sağlıyorsunuz, onayları işaretleyip girebilirsiniz.</p>
                  : <p className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700 ring-1 ring-red-200"><Ban size={15} /> Yaşınız: {birthAge} — 18 yaşını doldurmadığınız için bu alana giremezsiniz. Giriş denemesi kayıt altına alınır.</p>
              )}
              {[
                { v: c1, s: setC1, t: "18 yaşından büyük olduğumu onaylıyorum." },
                { v: c2, s: setC2, t: "Cinsel içerikli alana tamamen kendi isteğimle giriyorum; bu alandaki tüm içerik ve iletişimden doğan tüm sorumluluğun bana ait olduğunu kabul ediyorum." },
                { v: c3, s: setC3, t: "Karşı tarafın açık onayı olmadan özel içerik istemeyeceğimi, onay verilmezse ısrar etmeyeceğimi ve gizlilik kurallarına uyacağımı kabul ediyorum." },
              ].map((row, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 rounded-[20px] bg-white/70 p-4 ring-1 ring-rose-100 transition hover:bg-white">
                  <input type="checkbox" checked={row.v} onChange={e => row.s(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-rose-600" />
                  <span className="text-[13.5px] leading-relaxed">{row.t}</span>
                </label>
              ))}
              {consentErr && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200">{consentErr}</p>}
              <button onClick={submitConsent} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 py-4 text-sm font-extrabold text-white shadow-xl shadow-rose-300/50 transition hover:brightness-110"><KeyRound size={16} /> Onaylıyorum — Sorumluluk Bana Aittir, Alana Gir</button>
              <button onClick={() => setTab("kesfet")} className="w-full py-1 text-center text-sm font-bold text-slate-500 transition hover:text-slate-800">Vazgeç, güvenli alana dön</button>
              <p className="text-center text-[11px] leading-relaxed text-slate-400">Onayınız ve reddedilen giriş denemeleri tarih-saat ile kayıt altına alınır. 18 yaşından küçüklerin girişi kesinlikle yasaktır.</p>
            </div>
          </section>
        )}

        {tab === "ozel" && consented && (
          <section className="mt-6">
            <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300">
              <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-rose-600/40 blur-3xl" />
              <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-gradient-to-br from-rose-500 to-fuchsia-600 text-lg font-extrabold">18+</span>
              <div className="relative min-w-[220px] flex-1">
                <h2 className="font-display text-[24px]">Özel Alan — Onaylı İçerikler</h2>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-300">İstek gönderirsiniz, karşı taraf <b className="text-white">kabul ederse</b> alan açılır; tüm sorumluluk kabul eden taraflara aittir.</p>
              </div>
              <span className="relative flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-2 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-400/30"><ShieldCheck size={14} /> Yaş Doğrulandı (18+)</span>
              <button onClick={safeExit} className="glass-dark relative rounded-full px-4 py-2 text-xs font-bold ring-1 ring-white/25 transition hover:bg-white/25">Güvenli Çıkış</button>
            </div>

            {/* istatistikler */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { v: privateProfiles.length, l: "Kilitli özel albüm", icon: Lock },
                { v: myRequests.filter(p => p.intimateStatus === "accepted").length, l: "Açılan alan", icon: Eye },
                { v: myRequests.filter(p => p.intimateStatus === "pending").length, l: "Bekleyen isteğim", icon: Clock },
                { v: (() => { const a = myRequests.filter(p => p.intimateStatus === "accepted").length; const r = myRequests.filter(p => p.intimateStatus === "rejected").length; return a + r > 0 ? `%${Math.round((a / (a + r)) * 100)}` : "—"; })(), l: "Kabul oranım", icon: CheckCheck },
                { v: blockedIds.length, l: "Engellediklerim", icon: Ban },
              ].map(s => (
                <div key={s.l} className="glass rounded-[22px] p-4 ring-1 ring-white/70">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><s.icon size={13} className="text-rose-500" /> {s.l}</p>
                  <p className="mt-1 text-[26px] font-black leading-none">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_330px]">
              {/* sol: filtre + albümler */}
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {[{ k: "all", l: "Tümü" }, { k: "open", l: "Açık Olanlar" }, { k: "pending", l: "Bekleyenler" }, { k: "locked", l: "Kilitliler" }].map(f => (
                    <button key={f.k} onClick={() => setPrivFilter(f.k as typeof privFilter)} className={`rounded-full px-4 py-2 text-[12.5px] font-extrabold transition ${privFilter === f.k ? "bg-slate-950 text-white shadow" : "glass text-slate-600 ring-1 ring-white/70 hover:text-rose-700"}`}>{f.l}</button>
                  ))}
                  <label className="relative ml-auto">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={privQ} onChange={e => setPrivQ(e.target.value)} placeholder="Albüm ara (isim/şehir)" className="w-44 rounded-full bg-white py-2 pl-8 pr-3 text-[12px] font-semibold outline-none ring-1 ring-rose-100 focus:ring-2 focus:ring-rose-400" />
                  </label>
                  <button onClick={() => setPrivOnline(!privOnline)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition ${privOnline ? "bg-emerald-600 text-white shadow" : "glass text-slate-600 ring-1 ring-white/70"}`}><span className={`h-2 w-2 rounded-full ${privOnline ? "bg-white" : "bg-emerald-500"}`} /> Çevrimiçi</button>
                  <span className="self-center text-[12px] font-bold text-slate-400">{privShown.length} albüm</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                  {privShown.map(p => {
                    const st = p.intimateStatus || "none";
                    const unlocked = st === "accepted";
                    return (
                      <article key={p.id} className="overflow-hidden rounded-[26px] bg-white shadow-sm ring-1 ring-rose-100/80 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-200/60">
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img src={p.imageUrl} alt={p.name} className={`h-full w-full object-cover ${unlocked ? "" : "scale-110 blur-2xl"}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />
                          {!unlocked && (
                            <div className="absolute inset-0 grid place-items-center p-4 text-center text-white">
                              <div>
                                <span className="glass-dark mx-auto grid h-12 w-12 place-items-center rounded-full ring-1 ring-white/30"><Lock size={20} /></span>
                                <p className="mt-2.5 text-sm font-extrabold">Özel Albüm Kilitli</p>
                                <p className="mx-auto mt-1 max-w-[190px] text-[11px] leading-snug text-slate-200">{p.privateNote}</p>
                              </div>
                            </div>
                          )}
                          {unlocked && <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow"><Eye size={11} /> Onay Verildi — Açık</span>}
                          {st === "pending" && <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow"><Clock size={11} /> Onay Bekleniyor</span>}
                          {st === "rejected" && <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow"><Ban size={11} /> Reddedildi</span>}
                          <div className="glass-dark absolute inset-x-2.5 bottom-2.5 rounded-[18px] p-2.5 ring-1 ring-white/25 text-white">
                            <h3 className="text-[15px] font-extrabold">{p.name}, {p.age}</h3>
                            <p className="text-[11px] text-rose-100/90">{p.city} • {INTENT_LABEL[p.intent]}</p>
                            {unlocked && <p className="mt-1 text-[10.5px] leading-snug text-slate-100">{p.privateNote}</p>}
                          </div>
                        </div>
                        <div className="p-2.5">
                          {unlocked ? (
                            <>
                              <button onClick={() => openChat(p)} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-[12.5px] font-extrabold text-white shadow-md shadow-emerald-200 transition hover:brightness-110"><MessageCircle size={15} /> Özel Sohbete Git</button>
                              <button onClick={() => revokeAccess(p)} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-red-50 py-2 text-[11.5px] font-extrabold text-red-600 ring-1 ring-red-100 transition hover:bg-red-600 hover:text-white"><Lock size={12} /> Erişimi Sonlandır</button>
                            </>
                          ) : st === "pending" ? (
                            <div className="flex gap-1.5">
                              <button disabled className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-100 py-2.5 text-[12.5px] font-extrabold text-amber-800"><Clock size={14} /> Bekleniyor</button>
                              <button onClick={() => cancelIntimate(p)} className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100" title="İsteği geri çek"><Trash2 size={15} /></button>
                            </div>
                          ) : (
                            <button onClick={() => sendIntimate(p)} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-950 py-2.5 text-[12.5px] font-extrabold text-white transition hover:bg-rose-600"><Lock size={14} /> {st === "rejected" ? "Tekrar İstek Gönder" : "Özel İçerik İsteği Gönder"}</button>
                          )}
                          {p.id !== user?.profileId && (
                            <div className="mt-1.5 flex gap-1.5">
                              <button onClick={() => blockProfile(p)} className="flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 text-[10.5px] font-extrabold text-slate-500 transition hover:bg-slate-950 hover:text-white"><Ban size={11} /> Engelle</button>
                              <button onClick={() => reportProfile(p)} className={`flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 text-[10.5px] font-extrabold transition ${reportedIds.includes(p.id) ? "bg-red-100 text-red-700" : "text-slate-500 hover:bg-red-600 hover:text-white"}`}><Flag size={11} /> {reportedIds.includes(p.id) ? "Şikayet Edildi" : "Şikayet Et"}</button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {privShown.length === 0 && (
                    <div className="glass col-span-full rounded-[26px] p-10 text-center ring-1 ring-white/70">
                      <Lock className="mx-auto text-rose-300" size={32} />
                      <p className="mt-3 font-extrabold">Bu görünümde albüm yok</p>
                      <p className="text-sm text-slate-500">Filtreyi değiştirerek diğer albümleri görebilirsin.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* sağ panel */}
              <div className="space-y-4">
                <div className="glass rounded-[24px] p-5 ring-1 ring-white/70">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold"><ShieldCheck size={17} className="text-emerald-600" /> Yaş Doğrulama Durumu</h3>
                  <div className="mt-3 space-y-2 text-[13px]">
                    <p className="flex justify-between"><span className="text-slate-500">Doğum tarihiniz</span><b>{birth ? new Date(birth).toLocaleDateString("tr-TR") : "-"}</b></p>
                    <p className="flex justify-between"><span className="text-slate-500">Hesaplanan yaş</span><b>{birthAge ?? "-"} (18+ uygun)</b></p>
                    <p className="flex justify-between"><span className="text-slate-500">Kayıtlı onay sayısı</span><b>{consentInfo.count}</b></p>
                    <p className="flex justify-between"><span className="text-slate-500">Son onay</span><b>{consentInfo.lastAt ? new Date(consentInfo.lastAt).toLocaleDateString("tr-TR") : "-"}</b></p>
                  </div>
                  <button onClick={safeExit} className="mt-4 w-full rounded-full bg-slate-950 py-2.5 text-[12.5px] font-extrabold text-white transition hover:bg-red-600">Onayı Geri Al ve Çık</button>
                  <p className="mt-2 text-center text-[10.5px] leading-relaxed text-slate-400">18 yaş altı giriş denemeleri sistem tarafından otomatik engellenir ve kaydedilir.</p>
                </div>

                <div className="glass rounded-[24px] p-5 ring-1 ring-white/70">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold"><Send size={16} className="text-rose-600" /> İsteklerim</h3>
                  {myRequests.length === 0 ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">Henüz özel içerik isteği göndermedin. Soldaki albümlerden istek gönderebilirsin.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {myRequests.map(p => (
                        <div key={p.id} className="flex items-center gap-2.5 rounded-[16px] bg-white/70 p-2.5 ring-1 ring-rose-100">
                          <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-extrabold">{p.name}, {p.age}</p>
                            <p className="text-[11px] text-slate-500">{p.city}</p>
                          </div>
                          {p.intimateStatus === "accepted" && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">Açık</span>}
                          {p.intimateStatus === "pending" && <><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">Bekliyor</span><button onClick={() => cancelIntimate(p)} className="grid h-7 w-7 place-items-center rounded-full bg-red-50 text-red-600" title="Geri çek"><Trash2 size={12} /></button></>}
                          {p.intimateStatus === "rejected" && <><span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-extrabold text-red-700">Red</span><button onClick={() => sendIntimate(p)} className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-extrabold text-white">Tekrar</button></>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass rounded-[24px] p-5 ring-1 ring-white/70">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold"><HeartHandshake size={17} className="text-violet-600" /> Bana Gelen İstekler</h3>
                  {incoming.length === 0 ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">Şu an bekleyen yeni istek yok. Karar verdiklerin burada tekrar görünmez.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {incoming.map(p => (
                        <div key={p.id} className="rounded-[16px] bg-white/70 p-3 ring-1 ring-violet-100">
                          <div className="flex items-center gap-2.5">
                            <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-extrabold">{p.name}, {p.age}</p>
                              <p className="truncate text-[11px] text-slate-500">Özel alanını görmek istiyor • {p.city}</p>
                            </div>
                          </div>
                          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                            <button onClick={() => decideIncoming(p, true)} className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-[11.5px] font-extrabold text-white">Kabul Et</button>
                            <button onClick={() => decideIncoming(p, false)} className="rounded-full bg-red-50 py-2 text-[11.5px] font-extrabold text-red-600 ring-1 ring-red-100">Reddet</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2.5 text-[10.5px] leading-relaxed text-slate-400">Kabul edersen özel alanınız karşılıklı açılır ve tüm sorumluluk taraflara ait olur. Reddettiğin istek tekrar sorulmaz.</p>
                </div>

                <div className="glass rounded-[24px] p-5 ring-1 ring-white/70">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold"><EyeOff size={16} className="text-slate-700" /> Gizlilik</h3>
                  <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-[16px] bg-white/70 p-3 ring-1 ring-rose-100">
                    <span className="text-[12.5px] font-bold leading-snug">Kendi profilimi bu listede gizle</span>
                    <input type="checkbox" checked={hideOwn} onChange={e => toggleHideOwn(e.target.checked)} className="h-5 w-5 shrink-0 accent-rose-600" />
                  </label>
                  <ul className="mt-3 space-y-1.5 text-[11.5px] leading-relaxed text-slate-500">
                    <li className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-600" /> Onay olmadan hiçbir özel içerik açılmaz</li>
                    <li className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-600" /> İsteklerini dilediğin an geri çekebilirsin</li>
                    <li className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-600" /> 18 yaş altı hesaplar bu alana alınmaz</li>
                  </ul>
                </div>

                <div className="glass rounded-[24px] p-5 ring-1 ring-white/70">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold"><History size={16} className="text-violet-600" /> Karar Geçmişim</h3>
                  {decisionHistory.length === 0 ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">Henüz gelen isteklere karar vermedin. Kabul/ret kararların burada listelenir.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {decisionHistory.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center gap-2.5 rounded-[16px] bg-white/70 p-2.5 ring-1 ring-rose-100">
                          <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-extrabold">{p.name}, {p.age}</p>
                            <p className="text-[11px] text-slate-500">{p.city}</p>
                          </div>
                          {incomingDec[p.id] === "accepted" ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">Kabul Ettin</span> : <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-extrabold text-red-700">Reddettin</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass rounded-[24px] p-5 ring-1 ring-white/70">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold"><Ban size={16} className="text-slate-700" /> Engellenenler</h3>
                  {blockedProfiles.length === 0 ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">Engellediğin kimse yok. Albüm kartlarındaki "Engelle" ile ekleyebilirsin; engellediklerin özel alanda görünmez.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {blockedProfiles.map(p => (
                        <div key={p.id} className="flex items-center gap-2.5 rounded-[16px] bg-white/70 p-2.5 ring-1 ring-slate-200">
                          <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-extrabold">{p.name}, {p.age}</p>
                            <p className="text-[11px] text-slate-500">{p.city}</p>
                          </div>
                          <button onClick={() => unblockProfile(p)} className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[10.5px] font-extrabold text-white transition hover:bg-emerald-500"><Eye size={11} /> Engeli Kaldır</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {reportedIds.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Flag size={12} className="text-red-400" /> {reportedIds.length} şikayetin inceleniyor</p>}
                </div>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-2xl rounded-[20px] bg-amber-50/90 p-4 text-center text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200/70">Yasal uyarı: Bu alandaki tüm içerik ve iletişim, istek gönderen ile kabul eden taraflar arasındadır. Kabul eden taraf tüm sorumluluğu üstlenir. Rıza dışı paylaşım, kayıt ve ifşa yasaktır; ihlalde hesap kapatılır.</p>
          </section>
        )}

        {tab === "vip" && (
          <section className="mt-6">
            <div className="relative overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-2xl shadow-amber-200/40 sm:p-9">
              <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-amber-500/30 blur-3xl" />
              <div className="absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-rose-600/25 blur-3xl" />
              <div className="relative flex flex-wrap items-center gap-5">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-amber-300 to-yellow-600 shadow-lg shadow-amber-950/40"><Crown size={30} className="text-slate-950" /></span>
                <div className="min-w-[240px] flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-300">CivarAşk VIP</p>
                  <h2 className="font-display mt-1 text-[30px] leading-tight">Yıldızlarla parlayan üyelik</h2>
                  <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-slate-300">Ödemeler <b className="text-white">Telegram Stars</b> ile alınır — kart bilgisi yok, saniyeler içinde VIP aktifleşir. Planını seç, Stars ile öde, ayrıcalıklar anında açılsın.</p>
                </div>
                {user?.isVip ? (
                  <div className="rounded-[22px] bg-gradient-to-br from-amber-400 to-yellow-600 p-[1.5px] shadow-xl">
                    <div className="rounded-[20px] bg-slate-950/85 px-5 py-4 text-center">
                      <p className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-300"><Crown size={13} /> VIP Aktif</p>
                      <p className="mt-1 text-lg font-extrabold">{user.vipPlan}</p>
                      <p className="text-[12px] text-slate-300">Bitiş: {user.vipExpiresAt ? new Date(user.vipExpiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "-"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="glass-dark rounded-[22px] px-5 py-4 text-center ring-1 ring-white/20">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-200">Şu anki durumun</p>
                    <p className="mt-1 text-lg font-extrabold">Ücretsiz Üye</p>
                    <p className="text-[12px] text-slate-300">Aşağıdan plan seçerek yükselt</p>
                  </div>
                )}
              </div>
            </div>

            {/* AYRICALIKLAR */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {VIP_PERKS.map(perk => (
                <div key={perk.t} className="glass rounded-[24px] p-5 ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-md shadow-amber-200"><perk.icon size={19} /></span>
                  <p className="mt-3 text-[14.5px] font-extrabold">{perk.t}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{perk.d}</p>
                  {!user?.isVip && <p className="mt-2 flex items-center gap-1 text-[11px] font-extrabold text-amber-600"><Lock size={11} /> VIP ile açılır</p>}
                </div>
              ))}
            </div>

            {/* ÜCRETSİZ vs VIP KARŞILAŞTIRMA */}
            <div className="glass mt-8 overflow-hidden rounded-[28px] ring-1 ring-white/70">
              <div className="grid grid-cols-[1fr_92px_92px] items-center gap-2 border-b border-amber-100 bg-amber-50/70 px-5 py-3.5 text-[12px] font-extrabold sm:grid-cols-[1fr_130px_130px]">
                <span className="text-slate-600">Özellik Karşılaştırması</span>
                <span className="text-center text-slate-500">Ücretsiz</span>
                <span className="flex items-center justify-center gap-1 text-center text-amber-600"><Crown size={13} /> VIP</span>
              </div>
              {[
                { t: "Profil keşfetme ve mesajlaşma", free: "Var", vip: "Var" },
                { t: "Komşularını Bul (konum tabanlı)", free: "", vip: "Var" },
                { t: "Seni Beğenenleri Görme", free: "", vip: "Var" },
                { t: "Süper Beğen", free: "Günde 1", vip: "Sınırsız" },
                { t: "Keşfet'te öncelikli sıralama", free: "", vip: "Var" },
                { t: "Okundu bilgisi", free: "", vip: "Var" },
                { t: "Altın VIP rozeti", free: "", vip: "Var" },
                { t: "Özel içerik isteği gönderme", free: "Var", vip: "Var" },
              ].map((row, i) => (
                <div key={row.t} className={`grid grid-cols-[1fr_92px_92px] items-center gap-2 px-5 py-3 text-[13px] sm:grid-cols-[1fr_130px_130px] ${i % 2 ? "bg-white/40" : ""}`}>
                  <span className="font-semibold text-slate-700">{row.t}</span>
                  <span className="text-center">{row.free ? <span className="font-bold text-slate-500">{row.free}</span> : <X size={16} className="mx-auto text-slate-300" />}</span>
                  <span className="text-center">{row.vip === "Var" ? <Check size={17} className="mx-auto text-amber-500" /> : <span className="font-extrabold text-amber-600">{row.vip}</span>}</span>
                </div>
              ))}
            </div>

            {/* KOMŞULARINI BUL — VIP konum özelliği */}
            <div className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-600">VIP Özelliği <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] font-black text-slate-950">VIP</span></p>
                  <h3 className="mt-1 flex items-center gap-2 text-[24px] font-extrabold tracking-tight"><Navigation className="text-sky-600" /> Komşularını Bul</h3>
                  <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-slate-500">Konumuna en yakın üyeleri gerçek mesafeleriyle, yakından uzağa sıralı gör. Konumun asla başkalarıyla paylaşılmaz; sadece mesafe hesaplanır.</p>
                </div>
                {user?.isVip && myPos && <button onClick={clearLocation} className="rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-slate-600 ring-1 ring-rose-100 transition hover:text-red-600">Konumu Kapat</button>}
              </div>

              {!user?.isVip ? (
                <div className="relative mt-4 overflow-hidden rounded-[28px]">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {allProfiles.filter(p => p.id !== user?.profileId).slice(0, 4).map(p => (
                      <div key={p.id} className="overflow-hidden rounded-[24px] bg-white ring-1 ring-rose-100">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img src={p.imageUrl} alt="Komşu" className="h-full w-full scale-110 object-cover blur-xl" />
                          <span className="glass-dark absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold text-white ring-1 ring-white/30"><MapPin size={10} /> ?,? km</span>
                        </div>
                        <div className="p-3"><p className="text-sm font-extrabold text-slate-400">Yakınındaki Üye</p><p className="flex items-center gap-1 text-[11.5px] font-bold text-amber-600"><Lock size={11} /> VIP ile gör</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/25 p-4">
                    <div className="glass max-w-sm rounded-[24px] p-6 text-center ring-1 ring-white/70">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-200"><Navigation size={21} /></span>
                      <p className="mt-3 font-extrabold">Komşularını görmek için VIP ol</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">Konum tabanlı komşu bulma yalnızca VIP üyelerine açıktır.</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">{allProfiles.filter(x => x.isOnline).length} kişi şu an çevrimiçi</span>
                        <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-extrabold text-sky-700 ring-1 ring-sky-200">{allProfiles.filter(x => x.distanceKm <= 25).length} üye 25 km çevrende</span>
                      </div>
                      <button onClick={() => buyVip(VIP_PLANS[1])} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-amber-300/50 transition hover:brightness-110"><Crown size={15} /> VIP ile Kilidi Aç</button>
                    </div>
                  </div>
                </div>
              ) : !myPos ? (
                <div className="glass mt-4 rounded-[28px] p-6 ring-1 ring-white/70 sm:p-8">
                  <div className="flex flex-wrap items-center gap-5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-200"><LocateFixed size={24} /></span>
                    <div className="min-w-[230px] flex-1">
                      <p className="text-lg font-extrabold">Konumunu aktif et, komşularını bul</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">Tarayıcı konum izni ister; konumun kimseyle paylaşılmaz, yalnızca mesafe hesaplanır. İzin vermek istemezsen şehrini seçerek de devam edebilirsin.</p>
                    </div>
                    <button onClick={requestLocation} disabled={locBusy} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-sky-300/50 transition hover:brightness-110 disabled:opacity-60"><LocateFixed size={16} /> {locBusy ? "Konum alınıyor..." : "Konumumu Kullan"}</button>
                  </div>
                  {locErr && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[12.5px] font-bold text-red-700 ring-1 ring-red-200">{locErr}</p>}
                  <div className="mt-4 border-t border-rose-100/70 pt-4">
                    <p className="text-[12px] font-extrabold text-slate-500">Veya şehrini seç (81 il):</p>
                    {manualPicker()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-[12.5px] font-extrabold text-white shadow"><MapPin size={13} /> Konum: {locCity} çevresi</span>
                    <span className="text-[12px] font-extrabold text-slate-500">Yarıçap:</span>
                    {[10, 25, 50, 100, 500].map(r => (
                      <button key={r} onClick={() => setVipRadius(r)} className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-extrabold transition ${vipRadius === r ? "bg-sky-600 text-white shadow" : "glass text-slate-600 ring-1 ring-white/70 hover:text-sky-700"}`}>{r} km</button>
                    ))}
                    <span className="ml-auto flex flex-wrap gap-1.5">
                      {neighbors.length > 0 && <span className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-extrabold text-white">En yakın: {fmtDist(neighbors[0].dist)}</span>}
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">{neighbors.filter(x => x.p.isOnline).length} çevrimiçi</span>
                      <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-500 ring-1 ring-rose-100">{neighbors.length} komşu bulundu</span>
                    </span>
                  </div>
                  {neighbors.length === 0 ? (
                    <div className="glass mt-4 rounded-[26px] p-10 text-center ring-1 ring-white/70">
                      <Navigation className="mx-auto text-sky-300" size={34} />
                      <p className="mt-3 font-extrabold">Bu yarıçapta komşu bulunamadı</p>
                      <p className="text-sm text-slate-500">Yarıçapı büyütmeyi dene; 500 km neredeyse tüm Türkiye'yi kapsar.</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      {neighbors.map(({ p, dist }, i) => (
                        <div key={p.id} className="glass flex flex-wrap items-center gap-3.5 rounded-[24px] p-3.5 ring-1 ring-white/70 transition hover:shadow-lg hover:shadow-sky-100">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-600 text-[11px] font-black text-white">{i + 1}</span>
                          <span className="relative shrink-0"><img src={p.imageUrl} alt={p.name} className="h-14 w-14 rounded-[18px] object-cover" /><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${p.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} /></span>
                          <div className="min-w-[130px] flex-1">
                            <p className="flex items-center gap-1.5 font-extrabold">{p.name}, {p.age} {p.isVerified && <BadgeCheck size={15} className="text-sky-500" />}</p>
                            <p className="text-xs text-slate-500">{p.city}{p.district ? ` • ${p.district}` : ""} • {INTENT_LABEL[p.intent]} • {p.isOnline ? "Çevrimiçi" : "Çevrimdışı"}</p>
                          </div>
                          <span className="flex items-center gap-1.5 rounded-full bg-sky-600 px-3.5 py-2 text-[13px] font-black text-white shadow-md shadow-sky-200"><MapPin size={13} /> {fmtDist(dist)}</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => setSelected(p)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-50" title="Profili gör"><Eye size={16} /></button>
                            <button onClick={() => openChat(p)} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-md shadow-rose-200 transition hover:brightness-110"><MessageCircle size={14} /> Mesaj At</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* PLANLAR */}
            <div className="mt-12">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-600">Planlar</p>
              <h3 className="mt-1 text-[24px] font-extrabold tracking-tight">Telegram Stars ile VIP al</h3>
              <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-slate-500">Fiyatlar Telegram Yıldızı cinsindendir. Satın aldığında siparişin oluşturulur, Stars ödemen onaylanınca VIP'in anında aktifleşir ve süresi hesabına işlenir.</p>
              {/* PROMOSYON KODU */}
              <div className="glass mt-5 flex flex-wrap items-center gap-3 rounded-[24px] p-4 ring-1 ring-white/70 sm:p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-md shadow-amber-200"><BadgePercent size={19} /></span>
                <div className="min-w-[170px] flex-1">
                  <p className="text-sm font-extrabold">Promosyon kodun var mı?</p>
                  <p className="text-[12px] text-slate-500">{promoCode ? `${promoCode} aktif — fiyatlara %${promoRate} indirim yansıtıldı` : "Kodu uygula, indirim anında Stars fiyatlarına yansısın. İpucu: CIVAR10"}</p>
                </div>
                {promoCode ? (
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2.5 text-[13px] font-extrabold text-emerald-700"><Check size={14} /> {promoCode} (-%{promoRate})</span>
                    <button onClick={() => { setPromoCode(""); setPromoInput(""); }} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-red-100 hover:text-red-600"><X size={15} /></button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && applyPromo()} placeholder="KOD GİR" className="w-32 rounded-full bg-white px-4 py-2.5 text-center text-[13px] font-extrabold uppercase tracking-wider outline-none ring-1 ring-amber-200 focus:ring-2 focus:ring-amber-400" />
                    <button onClick={applyPromo} className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-amber-300/50 transition hover:brightness-110">Uygula</button>
                  </span>
                )}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {VIP_PLANS.map(plan => (
                  <article key={plan.key} className={`relative flex flex-col rounded-[28px] p-6 transition duration-300 hover:-translate-y-1 ${plan.popular ? "bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 text-white shadow-2xl shadow-amber-300/60" : "glass ring-1 ring-white/70 hover:shadow-xl hover:shadow-amber-100"}`}>
                    {plan.popular && <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-950 px-3.5 py-1.5 text-[10.5px] font-extrabold text-amber-300 shadow-lg"><Flame size={11} /> EN POPÜLER</span>}
                    <p className={`text-[12px] font-extrabold uppercase tracking-wider ${plan.popular ? "text-amber-100" : "text-amber-600"}`}>{plan.name}</p>
                    {promoRate > 0 && <p className={`mt-3 text-[13px] font-bold line-through ${plan.popular ? "text-amber-200" : "text-slate-400"}`}>{fmt(plan.stars)} Stars</p>}
                    <p className={`${promoRate > 0 ? "mt-0.5" : "mt-3"} flex items-end gap-1.5`}>
                      <span className={`flex items-center gap-1 text-[34px] font-black leading-none ${plan.popular ? "text-white" : "text-slate-900"}`}><Star size={26} className={plan.popular ? "fill-amber-200 text-amber-200" : "fill-amber-400 text-amber-400"} /> {fmt(planPrice(plan))}</span>
                      <span className={`pb-1 text-[12px] font-bold ${plan.popular ? "text-amber-100" : "text-slate-400"}`}>Stars</span>
                    </p>
                    <p className={`mt-1.5 text-[12.5px] font-semibold ${plan.popular ? "text-amber-50" : "text-slate-500"}`}>{plan.days} gün • günde sadece {Math.round(planPrice(plan) / plan.days)} Stars{promoRate > 0 ? ` • %${promoRate} indirimli` : ""} • {plan.tagline}</p>
                    <ul className={`mt-4 flex-1 space-y-1.5 text-[12.5px] font-semibold ${plan.popular ? "text-amber-50" : "text-slate-600"}`}>
                      <li className="flex gap-1.5"><Check size={14} className="mt-0.5 shrink-0" /> Tüm VIP ayrıcalıkları</li>
                      <li className="flex gap-1.5"><Check size={14} className="mt-0.5 shrink-0" /> Komşularını Bul (konum)</li>
                      <li className="flex gap-1.5"><Check size={14} className="mt-0.5 shrink-0" /> Altın VIP rozeti</li>
                      {plan.days >= 90 && <li className="flex gap-1.5"><Check size={14} className="mt-0.5 shrink-0" /> Öncelikli destek</li>}
                    </ul>
                    <button onClick={() => buyVip(plan)} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-extrabold shadow-lg transition hover:brightness-110 ${plan.popular ? "bg-slate-950 text-amber-300 shadow-slate-900/30" : "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-amber-300/50"}`}>
                      <Star size={15} className="fill-current" /> Stars ile Satın Al
                    </button>
                    {user?.vipPlan === plan.name && user?.isVip && <p className="mt-2 text-center text-[11px] font-extrabold text-emerald-600">Şu anki planın — süre ekleyebilirsin</p>}
                  </article>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-[22px] bg-slate-950 px-6 py-4 text-center text-[12.5px] font-semibold text-slate-300">
                <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black">1</span> Planını seç</span>
                <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black">2</span> Telegram Stars bakiyenle öde</span>
                <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black">3</span> VIP anında aktifleşsin</span>
              </div>
            </div>

            {/* SENİ BEĞENENLER */}
            <div className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-600">VIP Özelliği</p>
                  <h3 className="mt-1 flex items-center gap-2 text-[24px] font-extrabold tracking-tight"><Heart className="text-rose-600" fill="currentColor" /> Seni Beğenenler</h3>
                </div>
                {!user?.isVip && <button onClick={() => buyVip(VIP_PLANS[1])} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-[12.5px] font-extrabold text-white shadow-md shadow-amber-300/50"><Crown size={13} /> VIP ile Kilidi Aç</button>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {allProfiles.filter(p => p.id !== user?.profileId).slice(0, 8).map(p => {
                  const open = !!user?.isVip;
                  return (
                    <article key={p.id} className="overflow-hidden rounded-[24px] bg-white ring-1 ring-rose-100/80">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={p.imageUrl} alt={open ? p.name : "Gizli hayran"} className={`h-full w-full object-cover ${open ? "" : "scale-110 blur-xl"}`} />
                        {!open && <div className="absolute inset-0 grid place-items-center"><span className="glass-dark grid h-11 w-11 place-items-center rounded-full ring-1 ring-white/40"><Lock size={18} className="text-white" /></span></div>}
                      </div>
                      <div className="p-3">
                        {open ? (
                          <>
                            <p className="truncate text-sm font-extrabold">{p.name}, {p.age}</p>
                            <p className="text-[11.5px] text-slate-500">{p.city} • {INTENT_LABEL[p.intent]}</p>
                            <button onClick={() => openChat(p)} className="mt-2 w-full rounded-full bg-gradient-to-r from-rose-600 to-pink-600 py-2 text-[12px] font-extrabold text-white">Mesaj At</button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-extrabold text-slate-400">Gizli Hayran</p>
                            <p className="flex items-center gap-1 text-[11.5px] font-bold text-amber-600"><Lock size={11} /> VIP ile gör</p>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* SİPARİŞLERİM */}
            {user && vipOrders.length > 0 && (
              <div className="glass mt-10 rounded-[26px] p-5 ring-1 ring-white/70 sm:p-6">
                <h3 className="flex items-center gap-2 font-extrabold"><Star size={17} className="fill-amber-400 text-amber-400" /> VIP Siparişlerim (Telegram Stars)</h3>
                <div className="mt-3 divide-y divide-rose-50">
                  {vipOrders.map(o => {
                    const plan = VIP_PLANS.find(x => x.key === o.planKey);
                    return (
                      <div key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                        <span className="font-extrabold">{plan?.name || o.planKey}</span>
                        <span className="flex items-center gap-1 font-bold text-amber-600"><Star size={13} className="fill-amber-400 text-amber-400" /> {fmt(o.stars)} Stars</span>
                        <span className="text-xs text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleString("tr-TR") : ""}</span>
                        <span className={`ml-auto rounded-full px-3 py-1 text-[11px] font-extrabold ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{o.status === "paid" ? "Ödendi ✓" : "Ödeme Bekliyor"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "admin" && user?.isAdmin && (
          <section className="mt-6">
            {/* ADMIN BANNER */}
            <div className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300 sm:p-8">
              <div className="absolute -right-10 -top-14 h-52 w-52 rounded-full bg-amber-500/25 blur-3xl" />
              <div className="absolute -bottom-14 left-1/3 h-44 w-44 rounded-full bg-rose-600/25 blur-3xl" />
              <div className="relative flex flex-wrap items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-gradient-to-br from-slate-700 to-slate-900 ring-1 ring-amber-400/50"><ShieldCheck size={26} className="text-amber-400" /></span>
                <div className="min-w-[220px] flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-300">Yönetim Paneli</p>
                  <h2 className="font-display mt-0.5 text-[26px]">Hoş geldin, {user.name}</h2>
                  <p className="mt-0.5 text-[13px] text-slate-300">{user.email} • Admin yetkisi aktif</p>
                </div>
                <div className="rounded-[20px] bg-gradient-to-br from-amber-400 to-yellow-600 p-[1.5px]">
                  <div className="rounded-[18px] bg-slate-950/90 px-4 py-3 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-amber-300"><Crown size={12} /> Admin VIP</p>
                    <p className="mt-0.5 text-[15px] font-extrabold">Ücretsiz Aktif</p>
                    <p className="text-[11px] text-slate-400">Tüm VIP özellikleri açık</p>
                  </div>
                </div>
                <button onClick={loadAdmin} className="glass-dark rounded-full px-4 py-2.5 text-xs font-extrabold ring-1 ring-white/25 transition hover:bg-white/25">Yenile</button>
              </div>
            </div>

            {/* İSTATİSTİKLER */}
            {adminStats ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { v: adminStats.totalUsers, l: "Toplam Üye", icon: Users, c: "text-sky-600 bg-sky-50" },
                  { v: adminStats.vipUsers, l: "VIP Üye", icon: Crown, c: "text-amber-600 bg-amber-50" },
                  { v: adminStats.onlineProfiles, l: "Çevrimiçi Profil", icon: Eye, c: "text-emerald-600 bg-emerald-50" },
                  { v: adminStats.totalProfiles, l: "Toplam Profil", icon: Heart, c: "text-rose-600 bg-rose-50" },
                  { v: adminStats.totalMessages, l: "Toplam Mesaj", icon: MessageCircle, c: "text-violet-600 bg-violet-50" },
                  { v: adminStats.totalLikes, l: "Toplam Beğeni", icon: HeartHandshake, c: "text-pink-600 bg-pink-50" },
                  { v: adminStats.consentsApproved, l: "+18 Onay", icon: ShieldCheck, c: "text-teal-600 bg-teal-50" },
                  { v: adminStats.consentsBlocked, l: "18- Engellenen", icon: Ban, c: "text-red-600 bg-red-50" },
                  { v: adminStats.ordersPaid, l: "Ödenen VIP Sipariş", icon: Check, c: "text-emerald-600 bg-emerald-50" },
                  { v: fmt(adminStats.starsEarned), l: "Kazanılan Stars", icon: Star, c: "text-amber-600 bg-amber-50" },
                  { v: adminStats.guestUsers, l: "Otomatik Hesap", icon: Sparkles, c: "text-slate-600 bg-slate-100" },
                  { v: adminStats.adminUsers, l: "Admin", icon: ShieldCheck, c: "text-slate-700 bg-slate-100" },
                ].map(s => (
                  <div key={s.l} className="glass rounded-[22px] p-4 ring-1 ring-white/70">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-slate-400"><span className={`grid h-6 w-6 place-items-center rounded-lg ${s.c}`}><s.icon size={13} /></span> {s.l}</p>
                    <p className="mt-1.5 text-[26px] font-black leading-none">{s.v}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass mt-5 rounded-[24px] p-8 text-center ring-1 ring-white/70"><p className="font-bold text-slate-500">İstatistikler yükleniyor...</p></div>
            )}

            {/* ÜYELER */}
            <div className="glass mt-6 rounded-[28px] ring-1 ring-white/70">
              <div className="flex flex-wrap items-center gap-2 border-b border-rose-100/70 p-5">
                <h3 className="flex items-center gap-2 text-lg font-extrabold"><Users size={19} className="text-slate-800" /> Üyeler <span className="rounded-full bg-slate-950 px-2.5 py-0.5 text-[11px] font-extrabold text-white">{adminMembers.length}</span></h3>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <label className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={adminQ} onChange={e => setAdminQ(e.target.value)} placeholder="Ad, e-posta, şehir ara..." className="w-52 rounded-full bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none ring-1 ring-rose-100 focus:ring-2 focus:ring-rose-400" />
                  </label>
                  {[{ k: "all", l: "Tümü" }, { k: "vip", l: "VIP" }, { k: "free", l: "Ücretsiz" }, { k: "online", l: "Çevrimiçi" }, { k: "guest", l: "Otomatik" }, { k: "admin", l: "Admin" }].map(f => (
                    <button key={f.k} onClick={() => setAdminStatus(f.k)} className={`rounded-full px-3.5 py-2 text-[12px] font-extrabold transition ${adminStatus === f.k ? "bg-slate-950 text-white shadow" : "bg-white text-slate-600 ring-1 ring-rose-100 hover:text-rose-700"}`}>{f.l}</button>
                  ))}
                </div>
              </div>
              <div className="max-h-[640px] divide-y divide-rose-50 overflow-y-auto">
                {adminMembers.map(m => (
                  <div key={m.id} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/60">
                    <span className="relative shrink-0">
                      {m.imageUrl ? <img src={m.imageUrl} alt={m.name} className="h-12 w-12 rounded-[16px] object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-gradient-to-br from-rose-400 to-fuchsia-500 font-extrabold text-white">{m.name.charAt(0).toUpperCase()}</span>}
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${m.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                    </span>
                    <div className="min-w-[190px] flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold">
                        {m.name}, {m.age}
                        {m.isAdmin && <span className="flex items-center gap-1 rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black text-amber-300"><ShieldCheck size={9} /> ADMİN</span>}
                        {m.isSelf && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black text-sky-700">SEN</span>}
                        {m.isGuest && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">OTOMATİK</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{m.email} • {m.city} • {INTENT_LABEL[m.intent] || m.intent} • {m.createdAt ? new Date(m.createdAt).toLocaleDateString("tr-TR") : ""}</p>
                    </div>
                    <div className="text-right">
                      {m.isVip ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-[10.5px] font-black text-slate-950"><Crown size={11} /> {m.isAdmin ? "ADMİN VIP" : "VIP"}</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10.5px] font-black text-slate-500">ÜCRETSİZ</span>
                      )}
                      <p className="mt-1 text-[10.5px] font-semibold text-slate-400">{m.isVip && m.vipExpiresAt ? `Bitiş: ${new Date(m.vipExpiresAt).toLocaleDateString("tr-TR")}` : m.isOnline ? "Şimdi çevrimiçi" : "Çevrimdışı"}</p>
                    </div>
                    {!m.isAdmin ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="flex overflow-hidden rounded-full ring-1 ring-amber-300">
                          {[7, 30, 90, 365].map(d => (
                            <button key={d} onClick={() => adminAction(m, "grantVip", d)} className="bg-amber-50 px-2.5 py-2 text-[11px] font-extrabold text-amber-700 transition hover:bg-amber-400 hover:text-white" title={`${d} gün VIP ver`}>+{d}g</button>
                          ))}
                        </span>
                        {m.isVip && <button onClick={() => adminAction(m, "revokeVip")} className="rounded-full bg-red-50 px-3 py-2 text-[11px] font-extrabold text-red-600 ring-1 ring-red-100 transition hover:bg-red-600 hover:text-white">VIP'yi Al</button>}
                        <button onClick={() => adminAction(m, "toggleOnline")} className={`rounded-full px-3 py-2 text-[11px] font-extrabold ring-1 transition ${m.isOnline ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{m.isOnline ? "Çevrimiçi" : "Çevrimdışı"}</button>
                        <button onClick={() => adminDelete(m)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100 transition hover:bg-red-600 hover:text-white" title="Üyeyi sil"><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-950 px-3 py-2 text-[11px] font-extrabold text-amber-300">Korumalı hesap</span>
                    )}
                  </div>
                ))}
                {adminMembers.length === 0 && <p className="p-8 text-center text-sm font-bold text-slate-400">Bu filtreyle üye bulunamadı.</p>}
              </div>
              <p className="border-t border-rose-50 px-5 py-3 text-[11px] text-slate-400">"+gün" butonları üyeye ücretsiz VIP tanımlar (süre mevcut bitişe eklenir). VIP'yi Al üyeliği anında kaldırır. Silme işlemi geri alınamaz.</p>
            </div>

            {/* ALT PANELLER */}
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="glass rounded-[26px] p-5 ring-1 ring-white/70 sm:p-6">
                <h3 className="flex items-center gap-2 font-extrabold"><Star size={17} className="fill-amber-400 text-amber-400" /> Son VIP Siparişleri (Telegram Stars)</h3>
                {adminOrders.length === 0 ? <p className="mt-2 text-sm text-slate-500">Henüz sipariş yok.</p> : (
                  <div className="mt-3 space-y-2">
                    {adminOrders.map((o: any) => (
                      <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-[16px] bg-white/70 p-3 text-[13px] ring-1 ring-amber-100">
                        <b>{o.name}</b>
                        <span className="max-w-[170px] truncate text-xs text-slate-400">{o.email}</span>
                        <span className="flex items-center gap-1 font-extrabold text-amber-600"><Star size={12} className="fill-amber-400 text-amber-400" /> {fmt(o.stars)}</span>
                        <span className="text-xs text-slate-400">{VIP_PLANS.find(x => x.key === o.planKey)?.name || o.planKey}</span>
                        <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-extrabold ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{o.status === "paid" ? "Ödendi ✓" : "Bekliyor"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="glass rounded-[26px] p-5 ring-1 ring-white/70 sm:p-6">
                <h3 className="flex items-center gap-2 font-extrabold"><ShieldCheck size={17} className="text-teal-600" /> Son +18 Onay / Engel Kayıtları</h3>
                {adminConsents.length === 0 ? <p className="mt-2 text-sm text-slate-500">Henüz kayıt yok.</p> : (
                  <div className="mt-3 space-y-2">
                    {adminConsents.map((c: any) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-[16px] bg-white/70 p-3 text-[13px] ring-1 ring-rose-100">
                        <span className="font-bold">Doğum: {c.birthDate}</span>
                        <span className="text-xs text-slate-400">{c.createdAt ? new Date(c.createdAt).toLocaleString("tr-TR") : ""}</span>
                        {c.blocked ? (
                          <span className="ml-auto flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-extrabold text-red-700"><Ban size={10} /> 18- ENGELLENDİ</span>
                        ) : (
                          <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">ONAYLANDI ✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">18 yaş altı giriş denemeleri otomatik engellenir ve burada kayıt altında tutulur.</p>
              </div>
            </div>
          </section>
        )}

        {tab === "begeniler" && (
          <section className="mt-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-rose-500">Eşleşmeler</p>
            <h2 className="mt-1 flex items-center gap-2 text-[26px] font-extrabold tracking-tight"><Heart className="text-rose-600" fill="currentColor" /> Beğendiklerim</h2>
            <p className="mt-1 text-sm text-slate-500">{likedProfiles.length} kişiyi beğendin. Mesaj atarak eşleşmeyi başlat.</p>
            {likedProfiles.length === 0 ? (
              <div className="glass mt-5 rounded-[30px] p-12 text-center ring-1 ring-white/70">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-rose-50 text-rose-400"><Heart size={30} /></span>
                <p className="mt-4 text-lg font-extrabold">Henüz kimseyi beğenmedin</p>
                <p className="text-sm text-slate-500">Kalp simgesine basarak beğenmeye başla.</p>
                <button onClick={() => setTab("kesfet")} className="mt-5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-300/50">Keşfet'e Git</button>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {likedProfiles.map(p => (
                  <article key={p.id} className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-rose-100/80 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-200/60">
                    <div className="relative aspect-[3/4]">
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {p.likeKind === "super" && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 text-[10.5px] font-black text-slate-950 shadow"><Star size={10} className="fill-slate-950" /> Süper Beğen</span>}
                      <div className="glass-dark absolute inset-x-3 bottom-3 rounded-[20px] p-3 ring-1 ring-white/25 text-white">
                        <h3 className="font-extrabold">{p.name}, {p.age}</h3>
                        <p className="text-[11.5px] text-rose-100/90">{p.city} • {INTENT_LABEL[p.intent]}{myPos ? ` • ${fmtDist(effDist(p))}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 p-2.5">
                      <button onClick={() => openChat(p)} className="flex-1 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-rose-200">Mesaj At</button>
                      {p.likeKind !== "super" && <button onClick={() => toggleLike(p, "super")} className="grid h-10 w-10 place-items-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200 transition hover:bg-amber-400 hover:text-slate-950" title="Süper beğene yükselt"><Star size={16} /></button>}
                      <button onClick={() => toggleLike(p)} className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100"><X size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ALT BİLGİ */}
      <footer className="glass border-t border-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2.5 text-lg font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white"><Heart size={18} fill="currentColor" /></span> Civar<span className="-ml-2.5 bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent">Aşk</span></p>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-slate-500">Dullar, bekarlar, sevgili arayanlar, evlilik isteyenler ve gizli kaçamak arayanlar için gizlilik odaklı, konum tabanlı civar tanışma platformu.</p>
          </div>
          <div className="text-[13px] text-slate-500">
            <p className="font-extrabold text-slate-800">Güvenlik ve Onay</p>
            <ul className="mt-3 space-y-2">
              <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" /> +18 alan: doğum tarihiyle yaş doğrulanır, 18 altı giremez</li>
              <li className="flex gap-2"><Lock size={15} className="mt-0.5 shrink-0 text-rose-600" /> Özel içerik: istek + kabul olmadan asla açılmaz</li>
              <li className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-sky-600" /> Konumun paylaşılmaz, sadece mesafe hesaplanır</li>
            </ul>
          </div>
          <div className="text-[13px] text-slate-500">
            <p className="font-extrabold text-slate-800">Canlı Durum</p>
            <p className="mt-3 flex items-center gap-2"><span className="live-dot h-2.5 w-2.5 rounded-full bg-emerald-500" /> <b className="text-emerald-700">{fmt(onlineCount)} kişi çevrimiçi</b></p>
            <p className="mt-1">81 ilde aktif kullanıcılar civarında eşleşiyor.</p>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-slate-400"><Flame size={13} className="text-rose-500" /> Şeffaf arayüz • Konum tabanlı eşleşme</p>
          </div>
        </div>
        <div className="border-t border-rose-100/60 py-4 text-center text-[11px] text-slate-400">CivarAşk yalnızca 18 yaş ve üzeri içindir. Tüm kullanıcılar kendi içerik ve iletişimlerinden sorumludur.</div>
      </footer>

      {/* PROFİL DETAY */}
      {selected && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-md" onClick={() => setSelected(null)}>
          <div className="float-up max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="grid sm:grid-cols-2">
              <div className="relative aspect-[3/4] sm:aspect-auto sm:min-h-[540px]">
                <img src={selected.imageUrl} alt={selected.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                <span className={`absolute left-4 top-4 rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-extrabold text-white shadow ${INTENT_GRAD[selected.intent]}`}>{INTENT_LABEL[selected.intent]}</span>
                <div className="glass-dark absolute inset-x-4 bottom-4 rounded-[20px] p-3.5 ring-1 ring-white/25 text-white">
                  <p className="flex items-center gap-1.5 text-xs font-bold"><span className={`h-2.5 w-2.5 rounded-full ${selected.isOnline ? "bg-emerald-400 live-dot" : "bg-slate-300"}`} /> {selected.isOnline ? "Şimdi çevrimiçi" : "Çevrimdışı"} • <MapPin size={12} /> {fmtDist(effDist(selected))} {myPos ? "yakınında" : "uzakta"}</p>
                </div>
              </div>
              <div className="relative p-6 sm:p-7">
                <button onClick={() => setSelected(null)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-slate-100 transition hover:bg-rose-100"><X size={17} /></button>
                <h3 className="flex items-center gap-2 pr-10 text-[26px] font-extrabold tracking-tight">{selected.name}, {selected.age} {selected.isVerified && <BadgeCheck className="shrink-0 text-sky-500" />}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} className="text-rose-500" /> {selected.city}{selected.district ? ` / ${selected.district}` : ""} • {selected.gender}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">{selected.bio}</p>
                <div className="mt-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">İlgi Alanları</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{selected.interests.map(i => <span key={i} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{i}</span>)}</div>
                </div>
                {selected.hasPrivate && (
                  <div className="relative mt-4 overflow-hidden rounded-[20px] bg-slate-950 p-4 text-white">
                    <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-rose-600/40 blur-2xl" />
                    <p className="relative flex items-center gap-1.5 text-[13px] font-extrabold"><Lock size={14} className="text-rose-400" /> Özel Alan {selected.intimateStatus === "accepted" ? "— Onaylandı, Açık" : selected.intimateStatus === "pending" ? "— İstek Beklemede" : "— Kilitli"}</p>
                    <p className="relative mt-1 text-[12px] leading-relaxed text-slate-300">{selected.privateNote} İstek kabul edilirse tüm sorumluluk kabul eden taraflara aittir.</p>
                  </div>
                )}
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button onClick={() => toggleLike(selected)} className={`flex items-center justify-center gap-1.5 rounded-full py-3 text-sm font-extrabold transition ${selected.liked ? "bg-rose-100 text-rose-700" : "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-200 hover:brightness-110"}`}><Heart size={16} fill={selected.liked ? "currentColor" : "none"} /> {selected.liked ? "Beğenildi" : "Beğen"}</button>
                  <button onClick={() => { setSelected(null); openChat(selected); }} className="flex items-center justify-center gap-1.5 rounded-full bg-slate-950 py-3 text-sm font-extrabold text-white transition hover:bg-rose-600"><MessageCircle size={16} /> Mesaj At</button>
                </div>
                <button onClick={() => toggleLike(selected, "super")} className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border-2 py-2.5 text-sm font-extrabold transition ${selected.likeKind === "super" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-amber-400 text-amber-600 hover:bg-gradient-to-r hover:from-amber-400 hover:to-yellow-500 hover:text-slate-950"}`}><Star size={15} className={selected.likeKind === "super" ? "fill-amber-400 text-amber-400" : ""} /> {selected.likeKind === "super" ? "Süper Beğenildi" : "Süper Beğen Gönder"}</button>
                <button onClick={() => { if (!consented) { setSelected(null); setTab("ozel"); showToast("Özel içerik için önce +18 ön onay vermelisin"); } else { sendIntimate(selected); setSelected(null); setTab("ozel"); } }} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-slate-950 py-2.5 text-sm font-extrabold transition hover:bg-slate-950 hover:text-white"><Lock size={15} /> Özel İçerik İsteği Gönder</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GİRİŞ / ÜYE OL PENCERESİ */}
      {authMode && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-md" onClick={() => setAuthMode(null)}>
          <div className="float-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl sm:p-7" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2.5 text-xl font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white"><Heart size={18} fill="currentColor" /></span> {authMode === "login" ? "Tekrar Hoş Geldin" : "CivarAşk'a Üye Ol"}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{authMode === "login" ? "E-postan ve şifrenle giriş yap, kaldığın yerden devam et." : "Ücretsiz üye ol, profilin hemen Keşfet'te görünsün. 18 yaş ve üzeri zorunludur."}</p>
              </div>
              <button onClick={() => setAuthMode(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 transition hover:bg-rose-100"><X size={16} /></button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-rose-50 p-1 ring-1 ring-rose-100">
              <button onClick={() => openAuth("login")} className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-extrabold transition ${authMode === "login" ? "bg-slate-950 text-white shadow" : "text-slate-600 hover:text-rose-700"}`}><LogIn size={15} /> Giriş Yap</button>
              <button onClick={() => openAuth("register")} className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-extrabold transition ${authMode === "register" ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow" : "text-slate-600 hover:text-rose-700"}`}><UserPlus size={15} /> Üye Ol</button>
            </div>

            {authErr && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200">{authErr}</p>}

            {authMode === "login" ? (
              <div className="mt-5 space-y-3">
                {user?.isGuest && (
                  <p className="rounded-2xl bg-sky-50 px-4 py-3 text-[12.5px] leading-relaxed text-sky-900 ring-1 ring-sky-200">Şu an <b>otomatik hesapla</b> ({user.email}) girişlisin. Kendi hesabın varsa aşağıdan giriş yapabilirsin; yoksa <b>Üye Ol</b> sekmesinden kalıcı hesabını oluştur.</p>
                )}
                <label className="block"><span className="flex items-center gap-1.5 text-xs font-extrabold"><Mail size={13} className="text-rose-600" /> E-posta</span>
                  <input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="ornek@eposta.com" className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-4 py-3 text-sm outline-none ring-1 ring-rose-200 transition focus:ring-2 focus:ring-rose-400" /></label>
                <label className="block"><span className="flex items-center gap-1.5 text-xs font-extrabold"><KeyRound size={13} className="text-rose-600" /> Şifre</span>
                  <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="Şifreniz" className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-4 py-3 text-sm outline-none ring-1 ring-rose-200 transition focus:ring-2 focus:ring-rose-400" /></label>
                <button onClick={doLogin} disabled={authBusy} className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-rose-600 disabled:opacity-60"><LogIn size={16} /> {authBusy ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
                <button onClick={() => { setAuthMode(null); doDirectLogin(); }} className="w-full rounded-full bg-emerald-600 py-3 text-[13px] font-extrabold text-white transition hover:bg-emerald-500">Kayıt Olmadan Otomatik Hesapla Gir</button>
                <p className="text-center text-[12.5px] text-slate-500">Demo hesap: <b>demo@civarask.com</b> / <b>demo1234</b></p>
                <p className="text-center text-[13px] text-slate-500">Hesabın yok mu? <button onClick={() => openAuth("register")} className="font-extrabold text-rose-600 hover:underline">Hemen Üye Ol</button></p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block"><span className="text-xs font-extrabold">Adın</span><input value={join.name} onChange={e => setJoin({ ...join, name: e.target.value })} placeholder="örn. Elif" className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-sm outline-none ring-1 ring-rose-200" /></label>
                  <label className="block"><span className="text-xs font-extrabold">Yaş (18+)</span><input type="number" min={18} max={80} value={join.age} onChange={e => setJoin({ ...join, age: Number(e.target.value) })} className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-sm outline-none ring-1 ring-rose-200" /></label>
                </div>
                <label className="block"><span className="flex items-center gap-1.5 text-xs font-extrabold"><Mail size={13} className="text-rose-600" /> E-posta</span><input type="email" value={join.email} onChange={e => setJoin({ ...join, email: e.target.value })} placeholder="ornek@eposta.com" className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-sm outline-none ring-1 ring-rose-200" /></label>
                <label className="block"><span className="flex items-center gap-1.5 text-xs font-extrabold"><KeyRound size={13} className="text-rose-600" /> Şifre (en az 6 karakter)</span><input type="password" value={join.password} onChange={e => setJoin({ ...join, password: e.target.value })} placeholder="••••••" className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-sm outline-none ring-1 ring-rose-200" /></label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block"><span className="text-xs font-extrabold">Cinsiyet</span><select value={join.gender} onChange={e => setJoin({ ...join, gender: e.target.value })} className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-rose-200"><option>Kadın</option><option>Erkek</option></select></label>
                  <label className="block"><span className="text-xs font-extrabold">Şehir (81 il)</span>
                    <select value={join.city} onChange={e => setJoin({ ...join, city: e.target.value })} className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-rose-200">
                      {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></label>
                  <label className="block"><span className="text-xs font-extrabold">Semt</span><input value={join.district} onChange={e => setJoin({ ...join, district: e.target.value })} placeholder="Kadıköy" className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-sm outline-none ring-1 ring-rose-200" /></label>
                </div>
                <label className="block"><span className="text-xs font-extrabold">Ne arıyorsun?</span>
                  <select value={join.intent} onChange={e => setJoin({ ...join, intent: e.target.value })} className="mt-1.5 w-full rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-sm outline-none ring-1 ring-rose-200">
                    <option value="dul">Dulum — yeniden başlamak istiyorum</option>
                    <option value="bekar">Bekarım</option>
                    <option value="sevgili">Sevgili arıyorum</option>
                    <option value="evlilik">Evlilik / koca-eş arıyorum</option>
                    <option value="kacamak">Gizli kaçamak (gizlilik esaslı)</option>
                  </select></label>
                <label className="block"><span className="text-xs font-extrabold">Kendinden bahset</span><textarea value={join.bio} onChange={e => setJoin({ ...join, bio: e.target.value })} rows={2} placeholder="Kısa, samimi bir tanıtım yaz..." className="mt-1.5 w-full rounded-2xl bg-rose-50/70 p-3.5 text-sm outline-none ring-1 ring-rose-200" /></label>
                <button onClick={doRegister} disabled={authBusy} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-rose-300/50 transition hover:brightness-110 disabled:opacity-60"><UserPlus size={16} /> {authBusy ? "Üyeliğin oluşturuluyor..." : "Üye Ol ve Hemen Giriş Yap"}</button>
                <p className="text-center text-[13px] text-slate-500">Zaten hesabın var mı? <button onClick={() => openAuth("login")} className="font-extrabold text-rose-600 hover:underline">Giriş Yap</button></p>
                <p className="text-center text-[11px] leading-relaxed text-slate-400">Üye olarak 18 yaşından büyük olduğunu ve tüm sorumluluğun sana ait olduğunu kabul edersin. Üyelik sonrası otomatik giriş yapılır.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TELEGRAM STARS ÖDEME PENCERESİ */}
      {vipSel && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-md" onClick={() => !vipBusy && setVipSel(null)}>
          <div className="float-up w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative overflow-hidden bg-slate-950 p-6 text-white">
              <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-500/35 blur-3xl" />
              <div className="relative flex items-center gap-3.5">
                <span className="grid shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-amber-300 to-yellow-600 p-3"><Crown size={24} className="text-slate-950" /></span>
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-amber-300">Telegram Stars ile Ödeme</p>
                  <h3 className="text-xl font-extrabold">{vipSel.name}</h3>
                </div>
                <button onClick={() => !vipBusy && setVipSel(null)} className="glass-dark ml-auto grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/25"><X size={16} /></button>
              </div>
            </div>
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between rounded-[20px] bg-amber-50 p-4 ring-1 ring-amber-200/70">
                <span className="text-sm font-bold text-amber-900">Ödenecek tutar</span>
                <span className="flex items-center gap-2">
                  {promoRate > 0 && <span className="text-[15px] font-bold text-slate-400 line-through">{fmt(vipSel.stars)}</span>}
                  <span className="flex items-center gap-1.5 text-[22px] font-black text-amber-600"><Star size={20} className="fill-amber-400 text-amber-400" /> {fmt(planPrice(vipSel))} <span className="text-[13px] font-extrabold">Stars</span></span>
                </span>
              </div>
              <div className="space-y-2 rounded-[20px] bg-slate-50 p-4 text-[13px] ring-1 ring-slate-200/80">
                <p className="flex justify-between"><span className="text-slate-500">Plan süresi</span><b>{vipSel.days} gün</b></p>
                {promoRate > 0 && <p className="flex justify-between"><span className="text-slate-500">Promosyon ({promoCode})</span><b className="text-emerald-600">-%{promoRate} • {fmt(vipSel.stars - planPrice(vipSel))} Stars kazandın</b></p>}
                <p className="flex justify-between"><span className="text-slate-500">Ödeme yöntemi</span><b className="flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" /> Telegram Stars bakiyesi</b></p>
                <p className="flex justify-between"><span className="text-slate-500">Hesap</span><b>{user?.name}</b></p>
                <p className="flex justify-between"><span className="text-slate-500">Aktivasyon</span><b className="text-emerald-600">Anında</b></p>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-500">Onayladığında siparişin oluşturulur ve <b>Stars ödemen alınmış sayılarak VIP'in anında aktifleşir</b>; süre, varsa mevcut VIP bitişine eklenir. Dilersen ödemeyi Telegram botumuz üzerinden de tamamlayabilirsin.</p>
              <button onClick={confirmVipPayment} disabled={vipBusy} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-sm font-extrabold text-white shadow-xl shadow-amber-300/50 transition hover:brightness-110 disabled:opacity-60">
                <Star size={16} className="fill-current" /> {vipBusy ? "Ödeme işleniyor..." : `${fmt(planPrice(vipSel))} Stars ile Öde ve VIP'i Aç`}
              </button>
              <a href={`https://t.me/CivarAskBot?start=vip_${vipSel.key}`} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 py-3.5 text-[13px] font-extrabold text-white transition hover:bg-sky-600"><Send size={15} /> Telegram'da Satın Al (@CivarAskBot)</a>
              <p className="text-center text-[11px] text-slate-400">Stars bakiyen yetersizse Telegram içinden yıldız satın alabilirsin. İptalde VIP süresi geri alınır.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
