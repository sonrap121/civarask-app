import { db } from "@/db";
import { profiles, autoReplySettings, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { coordsForCity } from "@/lib/cities";
import { eq } from "drizzle-orm";

const W = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`;

export const SEED_PROFILES = [
  { name:"Elif", age:28, gender:"Kadın", city:"İstanbul", district:"Kadıköy", intent:"bekar", bio:"Kahve, sahil yürüyüşü ve güzel sohbet vazgeçilmezim. Ciddi ve samimi bir tanışma arıyorum, önce arkadaş gibi başlayalım.", imageUrl:W(2530364), interests:["Kahve","Yürüyüş","Sinema","Kitap"], isOnline:true, distanceKm:1.2, autoReplyEnabled:true, autoReplyMessage:"Merhaba, mesajın için teşekkürler. Şu an biraz meşgulüm ama en kısa sürede döneceğim. Kendinden biraz bahseder misin?", autoReplyDelaySec:3, hasPrivate:true, privateNote:"Özel albümüm sadece karşılıklı onaydan sonra açılır." },
  { name:"Zeynep", age:32, gender:"Kadın", city:"Ankara", district:"Çankaya", intent:"dul", bio:"Hayata yeniden, sakin ve dürüst bir yerden başlamak istiyorum. Acelem yok; saygılı, anlayışlı biriyle tanışmak güzel olur.", imageUrl:W(18355488), interests:["Yemek","Tiyatro","Doğa","Müzik"], isOnline:true, distanceKm:2.4, autoReplyEnabled:true, autoReplyMessage:"Merhaba, yazdığın için teşekkür ederim. Profilini inceleyip sana döneceğim, biraz sabırlı olursan sevinirim.", autoReplyDelaySec:5, hasPrivate:true, privateNote:"Önce sohbet, güven oluşmadan özel içerik paylaşmıyorum." },
  { name:"Selin", age:26, gender:"Kadın", city:"İzmir", district:"Bornova", intent:"sevgili", bio:"Enerjik, gülmeyi seven biriyim. Birlikte konserlere, yeni mekanlara gidebileceğim bir sevgili arıyorum.", imageUrl:W(10260754), interests:["Konser","Dans","Seyahat","Fotoğraf"], isOnline:true, distanceKm:0.8, autoReplyEnabled:true, autoReplyMessage:"Selam! Mesajını gördüm, otomatik cevap bu — birazdan kendim yazacağım. İzmir'de misin?", autoReplyDelaySec:2, hasPrivate:true, privateNote:"Özel alanım istek ve karşılıklı onayla açılır." },
  { name:"Merve", age:30, gender:"Kadın", city:"İstanbul", district:"Beşiktaş", intent:"evlilik", bio:"Evlilik düşüncesiyle, ailesine ve değerlerine önem veren biriyim. Hayat arkadaşı, koca adayım olacak dürüst birini arıyorum.", imageUrl:W(13418322), interests:["Aile","Yemek","Seyahat","Kitap"], isOnline:false, distanceKm:4.1, autoReplyEnabled:true, autoReplyMessage:"Merhaba, şu an çevrimdışıyım ama mesajını aldım. Ciddi tanışma için yazdıysan mutlaka dönüş yapacağım.", autoReplyDelaySec:6, hasPrivate:false, privateNote:"" },
  { name:"Deniz", age:29, gender:"Kadın", city:"Antalya", district:"Muratpaşa", intent:"kacamak", bio:"Gizliliğe son derece önem veriyorum. Karşılıklı saygı ve mahremiyet içinde, kimseyi yargılamadan tanışmak isterim. Her şey aramızda kalır.", imageUrl:W(36486926), interests:["Deniz","Gizlilik","Şarap","Yürüyüş"], isOnline:true, distanceKm:1.6, autoReplyEnabled:true, autoReplyMessage:"Merhaba... Gizlilik benim için çok önemli. Bu otomatik cevabım, uygun olduğumda gizli ve saygılı şekilde döneceğim.", autoReplyDelaySec:4, hasPrivate:true, privateNote:"Gizli alan: sadece onayladığım kişiler görebilir, ekran görüntüsü paylaşılmaz." },
  { name:"Aylin", age:35, gender:"Kadın", city:"Bursa", district:"Nilüfer", intent:"dul", bio:"Sakin bir hayatım var, yeniden birine güvenmek ve güzel bir yuva duygusunu tatmak istiyorum. Olgun ve anlayışlı beyler yazsın.", imageUrl:W(16831924), interests:["Bahçe","Yemek","Sinema","Doğa"], isOnline:true, distanceKm:3.2, autoReplyEnabled:false, autoReplyMessage:"", autoReplyDelaySec:5, hasPrivate:true, privateNote:"Özel albüm karşılıklı istek ve onayla açılır." },
  { name:"Gamze", age:27, gender:"Kadın", city:"İstanbul", district:"Şişli", intent:"bekar", bio:"Moda ve sanatla ilgileniyorum. Bekarım, ciddi ama eğlenceli bir ilişkiye açığım. Profilime bakıp geçme, yaz :)", imageUrl:W(23366491), interests:["Moda","Sanat","Kahve","Alışveriş"], isOnline:true, distanceKm:0.5, autoReplyEnabled:true, autoReplyMessage:"Selam, mesajın geldi! Şu an dışarıdayım, otomatik cevap bıraktım — eve geçince uzun uzun yazacağım.", autoReplyDelaySec:3, hasPrivate:true, privateNote:"Özel içeriklerim onay sistemi ile korunuyor." },
  { name:"Ebru", age:33, gender:"Kadın", city:"İzmir", district:"Karşıyaka", intent:"evlilik", bio:"Öğretmenim, düzenli bir hayatım var. Evlilik yolunda, hayatı paylaşacağım güvenilir bir eş arıyorum.", imageUrl:W(11257733), interests:["Kitap","Tiyatro","Yüzme","Yemek"], isOnline:false, distanceKm:5.0, autoReplyEnabled:true, autoReplyMessage:"Merhaba, mesajınız için teşekkürler. İş saatlerinde telefonuma bakamıyorum, akşam mutlaka dönerim.", autoReplyDelaySec:8, hasPrivate:false, privateNote:"" },
  { name:"Burcu", age:25, gender:"Kadın", city:"Ankara", district:"Keçiören", intent:"sevgili", bio:"Üniversiteyi yeni bitirdim, hayatı keşfetmeyi seviyorum. Birlikte gülebileceğim, vakit geçirmekten keyif alacağım birini arıyorum.", imageUrl:W(1408980), interests:["Müzik","Kamp","Fotoğraf","Dans"], isOnline:true, distanceKm:2.9, autoReplyEnabled:false, autoReplyMessage:"", autoReplyDelaySec:4, hasPrivate:true, privateNote:"Özel alan için önce tanışalım, sonra istek gönder." },
  { name:"Ceren", age:31, gender:"Kadın", city:"İstanbul", district:"Üsküdar", intent:"kacamak", bio:"Yoğun iş hayatında nefes alacak, gizli ve seviyeli bir kaçamak arayışındayım. Mahremiyet karşılıklı kırmızı çizgimdir.", imageUrl:W(33383333), interests:["Seyahat","Gizlilik","Sinema","Spor"], isOnline:true, distanceKm:1.9, autoReplyEnabled:true, autoReplyMessage:"Merhaba, gizliliğe verdiğin önem için teşekkürler. Bu otomatik mesaj; müsait olunca sadece buradan döneceğim.", autoReplyDelaySec:4, hasPrivate:true, privateNote:"Bu alan tamamen gizli ve onaya bağlıdır." },
  { name:"Murat", age:34, gender:"Erkek", city:"İstanbul", district:"Ataşehir", intent:"evlilik", bio:"Kendi işim var, hayatımı kurdum. Artık yuva kurmak, iyi bir eş ve hayat arkadaşı bulmak istiyorum. Ciddi düşünenler yazsın.", imageUrl:W(32778912), interests:["İş","Seyahat","Futbol","Yemek"], isOnline:true, distanceKm:3.7, autoReplyEnabled:true, autoReplyMessage:"Merhaba, mesajını aldım. Toplantıdaysam bu otomatik cevap devreye girer, en kısa sürede bizzat döneceğim.", autoReplyDelaySec:5, hasPrivate:false, privateNote:"" },
  { name:"Emre", age:28, gender:"Erkek", city:"İzmir", district:"Konak", intent:"bekar", bio:"Yazılımcıyım, bekarım, sahilde bisiklet sürmeyi severim. Samimi bir tanışma ve güzel bir ilişki arıyorum.", imageUrl:W(7047890), interests:["Bisiklet","Teknoloji","Kahve","Deniz"], isOnline:true, distanceKm:1.1, autoReplyEnabled:true, autoReplyMessage:"Selam! Kod yazarken mesajını gördüm, bu otomatik cevabım — molada hemen yazacağım.", autoReplyDelaySec:3, hasPrivate:true, privateNote:"Özel albüm sadece karşılıklı onayla." },
  { name:"Kerem", age:31, gender:"Erkek", city:"Ankara", district:"Yenimahalle", intent:"sevgili", bio:"Gitar çalarım, hafta sonları kaçamak rotalar yaparım. Birlikte hayatı güzelleştirecek bir sevgili arıyorum.", imageUrl:W(12871437), interests:["Gitar","Kamp","Seyahat","Müzik"], isOnline:false, distanceKm:6.2, autoReplyEnabled:false, autoReplyMessage:"", autoReplyDelaySec:4, hasPrivate:true, privateNote:"Önce tanışalım." },
  { name:"Onur", age:36, gender:"Erkek", city:"İstanbul", district:"Bakırköy", intent:"dul", bio:"Eşimi kaybettikten sonra hayata tutunmaya çalışıyorum. Acele etmeden, anlayışla yeniden bir ilişkiye başlamak isterim.", imageUrl:W(31453929), interests:["Doğa","Balık","Kitap","Yürüyüş"], isOnline:true, distanceKm:4.8, autoReplyEnabled:true, autoReplyMessage:"Merhaba, yazdığınız için teşekkür ederim. Şu an müsait değilim ama mesajınıza mutlaka saygıyla döneceğim.", autoReplyDelaySec:6, hasPrivate:false, privateNote:"" },
  { name:"Serkan", age:33, gender:"Erkek", city:"Antalya", district:"Kepez", intent:"kacamak", bio:"Gizlilik ve karşılıklı rıza her şeyden önce gelir. Seviyeli, kimseye zarar vermeden, aramızda kalacak bir tanışma arayışındayım.", imageUrl:W(30829152), interests:["Gizlilik","Spor","Deniz","Araba"], isOnline:true, distanceKm:2.2, autoReplyEnabled:true, autoReplyMessage:"Merhaba, gizlilik konusunda hassasım; bu otomatik cevaptır. Uygun zamanda, sadece buradan dönüş yaparım.", autoReplyDelaySec:4, hasPrivate:true, privateNote:"Özel alan tamamen onaya bağlı ve gizlidir." },
  { name:"Barış", age:30, gender:"Erkek", city:"Bursa", district:"Osmangazi", intent:"bekar", bio:"Spor salonundan çıkmayan, neşeli bir bekarım. Enerjime uyacak, hayatı seven biriyle tanışmak istiyorum.", imageUrl:W(8350286), interests:["Spor","Sinema","Yemek","Müzik"], isOnline:true, distanceKm:1.4, autoReplyEnabled:true, autoReplyMessage:"Selam, antrenmandayım muhtemelen :) Mesajın geldi, otomatik cevap bu — duştan sonra yazıyorum!", autoReplyDelaySec:3, hasPrivate:true, privateNote:"Özel içerik isteğe ve onaya bağlıdır." },
  { name:"Arda", age:27, gender:"Erkek", city:"İstanbul", district:"Beyoğlu", intent:"sevgili", bio:"Gece hayatını da sakin kafeleri de severim. Birlikte İstanbul'u yeniden keşfedeceğim birini arıyorum.", imageUrl:W(17227989), interests:["Müzik","Gece","Fotoğraf","Sanat"], isOnline:true, distanceKm:0.9, autoReplyEnabled:false, autoReplyMessage:"", autoReplyDelaySec:4, hasPrivate:true, privateNote:"Özel alan istekle açılır." },
  { name:"Volkan", age:38, gender:"Erkek", city:"Ankara", district:"Çankaya", intent:"evlilik", bio:"Olgun, ne istediğini bilen biriyim. Evlilik ve aile kurmak için dürüst, sadık bir hayat arkadaşı arıyorum.", imageUrl:W(34346056), interests:["Aile","Doğa","Tarih","Yemek"], isOnline:false, distanceKm:7.5, autoReplyEnabled:true, autoReplyMessage:"Merhaba, mesajınız bana ulaştı. Gün içinde yoğun olsam da ciddi tanışmalara mutlaka dönüş yaparım.", autoReplyDelaySec:7, hasPrivate:false, privateNote:"" },
];

let seeded = false;
export async function ensureSeed() {
  if (seeded) return;
  try {
    const existing = await db.select().from(profiles).limit(1);
    if (existing.length === 0) {
      let i = 3;
      for (const p of SEED_PROFILES) {
        await db.insert(profiles).values({ ...p, isVerified: true, ...coordsForCity(p.city, i++) });
      }
    }
    // Konumu eksik profillere şehir merkezine göre koordinat ata
    const missing = await db.select({ id: profiles.id, city: profiles.city, lat: profiles.lat }).from(profiles);
    for (const row of missing) {
      if (row.lat == null) {
        await db.update(profiles).set(coordsForCity(row.city, row.id)).where(eq(profiles.id, row.id));
      }
    }
    const s = await db.select().from(autoReplySettings).limit(1);
    if (s.length === 0) {
      await db.insert(autoReplySettings).values({
        enabled: true,
        message: "Merhaba, mesajın için teşekkürler! Şu an biraz meşgulüm ama en kısa sürede sana döneceğim. Kendinden bahseder misin?",
        delaySec: 5,
        onlyWhenOffline: false,
      });
    }
    // Demo giriş hesabı: demo@civarask.com / demo1234
    const demo = await db.select().from(users).where(eq(users.email, "demo@civarask.com")).limit(1);
    if (demo.length === 0) {
      const [du] = await db.insert(users).values({
        name: "Demo Üye",
        email: "demo@civarask.com",
        passwordHash: await hashPassword("demo1234"),
        age: 27,
        gender: "Kadın",
        city: "İstanbul",
        district: "Kadıköy",
        intent: "bekar",
      }).returning();
      const [dp] = await db.insert(profiles).values({
        userId: du.id,
        name: "Demo Üye",
        age: 27,
        gender: "Kadın",
        city: "İstanbul",
        district: "Kadıköy",
        intent: "bekar",
        bio: "Demo hesabıyım. Giriş sistemini, mesajlaşmayı ve VIP özelliklerini denemek için buradayım.",
        imageUrl: W(23366491),
        interests: ["Kahve", "Sohbet", "Sinema"],
        isOnline: true,
        distanceKm: 0,
        ...coordsForCity("İstanbul", 7),
        isVerified: true,
        autoReplyEnabled: false,
        autoReplyMessage: "",
        autoReplyDelaySec: 3,
        hasPrivate: true,
        privateNote: "Özel albüm sadece karşılıklı onay ile açılır.",
      }).returning();
      await db.update(users).set({ profileId: dp.id }).where(eq(users.id, du.id));
    }
    seeded = true;
  } catch (e) {
    console.error("seed error", e);
  }
}

export const INTENT_LABELS: Record<string,string> = {
  dul: "Dul",
  bekar: "Bekar",
  sevgili: "Sevgili Arıyor",
  evlilik: "Evlilik / Eş Arıyor",
  kacamak: "Gizli Kaçamak",
};
