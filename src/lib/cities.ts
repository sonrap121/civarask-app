// Türkiye'nin 81 ili ve yaklaşık merkez koordinatları
export const TURKEY_CITIES: string[] = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan",
  "Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir",
  "Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
  "Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak",
];

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Adana": { lat: 37.00, lng: 35.32 }, "Adıyaman": { lat: 37.76, lng: 38.28 }, "Afyonkarahisar": { lat: 38.76, lng: 30.54 },
  "Ağrı": { lat: 39.72, lng: 43.05 }, "Aksaray": { lat: 38.37, lng: 34.03 }, "Amasya": { lat: 40.65, lng: 35.83 },
  "Ankara": { lat: 39.93, lng: 32.86 }, "Antalya": { lat: 36.88, lng: 30.70 }, "Ardahan": { lat: 41.11, lng: 42.70 },
  "Artvin": { lat: 41.18, lng: 41.82 }, "Aydın": { lat: 37.84, lng: 27.84 }, "Balıkesir": { lat: 39.65, lng: 27.89 },
  "Bartın": { lat: 41.63, lng: 32.34 }, "Batman": { lat: 37.88, lng: 41.13 }, "Bayburt": { lat: 40.26, lng: 40.22 },
  "Bilecik": { lat: 40.15, lng: 29.98 }, "Bingöl": { lat: 38.88, lng: 40.50 }, "Bitlis": { lat: 38.40, lng: 42.11 },
  "Bolu": { lat: 40.74, lng: 31.61 }, "Burdur": { lat: 37.72, lng: 30.29 }, "Bursa": { lat: 40.19, lng: 29.06 },
  "Çanakkale": { lat: 40.15, lng: 26.41 }, "Çankırı": { lat: 40.60, lng: 33.62 }, "Çorum": { lat: 40.55, lng: 34.96 },
  "Denizli": { lat: 37.78, lng: 29.10 }, "Diyarbakır": { lat: 37.91, lng: 40.21 }, "Düzce": { lat: 40.84, lng: 31.16 },
  "Edirne": { lat: 41.68, lng: 26.56 }, "Elazığ": { lat: 38.67, lng: 39.22 }, "Erzincan": { lat: 39.75, lng: 39.49 },
  "Erzurum": { lat: 39.91, lng: 41.27 }, "Eskişehir": { lat: 39.78, lng: 30.52 }, "Gaziantep": { lat: 37.07, lng: 37.38 },
  "Giresun": { lat: 40.91, lng: 38.39 }, "Gümüşhane": { lat: 40.46, lng: 39.48 }, "Hakkari": { lat: 37.58, lng: 43.74 },
  "Hatay": { lat: 36.20, lng: 36.16 }, "Iğdır": { lat: 39.92, lng: 44.05 }, "Isparta": { lat: 37.76, lng: 30.56 },
  "İstanbul": { lat: 41.01, lng: 28.98 }, "İzmir": { lat: 38.42, lng: 27.14 }, "Kahramanmaraş": { lat: 37.59, lng: 36.94 },
  "Karabük": { lat: 41.21, lng: 32.62 }, "Karaman": { lat: 37.18, lng: 33.22 }, "Kars": { lat: 40.60, lng: 43.10 },
  "Kastamonu": { lat: 41.39, lng: 33.78 }, "Kayseri": { lat: 38.72, lng: 35.49 }, "Kırıkkale": { lat: 39.85, lng: 33.51 },
  "Kırklareli": { lat: 41.74, lng: 27.22 }, "Kırşehir": { lat: 39.15, lng: 34.16 }, "Kilis": { lat: 36.72, lng: 37.12 },
  "Kocaeli": { lat: 40.77, lng: 29.92 }, "Konya": { lat: 37.87, lng: 32.48 }, "Kütahya": { lat: 39.42, lng: 29.98 },
  "Malatya": { lat: 38.31, lng: 38.31 }, "Manisa": { lat: 38.62, lng: 27.43 }, "Mardin": { lat: 37.31, lng: 40.74 },
  "Mersin": { lat: 36.81, lng: 34.64 }, "Muğla": { lat: 37.22, lng: 28.36 }, "Muş": { lat: 38.74, lng: 41.51 },
  "Nevşehir": { lat: 38.62, lng: 34.71 }, "Niğde": { lat: 37.97, lng: 34.68 }, "Ordu": { lat: 40.98, lng: 37.88 },
  "Osmaniye": { lat: 37.07, lng: 36.25 }, "Rize": { lat: 41.02, lng: 40.52 }, "Sakarya": { lat: 40.77, lng: 30.40 },
  "Samsun": { lat: 41.29, lng: 36.33 }, "Siirt": { lat: 37.93, lng: 41.94 }, "Sinop": { lat: 42.03, lng: 35.15 },
  "Sivas": { lat: 39.75, lng: 37.02 }, "Şanlıurfa": { lat: 37.16, lng: 38.79 }, "Şırnak": { lat: 37.52, lng: 42.46 },
  "Tekirdağ": { lat: 40.98, lng: 27.51 }, "Tokat": { lat: 40.32, lng: 36.55 }, "Trabzon": { lat: 41.00, lng: 39.72 },
  "Tunceli": { lat: 39.11, lng: 39.55 }, "Uşak": { lat: 38.68, lng: 29.41 }, "Van": { lat: 38.50, lng: 43.38 },
  "Yalova": { lat: 40.65, lng: 29.27 }, "Yozgat": { lat: 39.82, lng: 34.81 }, "Zonguldak": { lat: 41.46, lng: 31.79 },
};

// Şehir merkezine deterministik küçük sapma ekleyerek profil koordinatı üretir
export function coordsForCity(city: string, seed = 1): { lat: number; lng: number } {
  const base = CITY_COORDS[city] || CITY_COORDS["İstanbul"];
  const jLat = (((seed * 53) % 41) - 20) / 1000; // yaklaşık ±2 km
  const jLng = (((seed * 97) % 41) - 20) / 1000;
  return { lat: +(base.lat + jLat).toFixed(5), lng: +(base.lng + jLng).toFixed(5) };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function nearestCity(lat: number, lng: number): string {
  let best = "İstanbul"; let bestD = Infinity;
  for (const [name, c] of Object.entries(CITY_COORDS)) {
    const d = haversineKm({ lat, lng }, c);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}
