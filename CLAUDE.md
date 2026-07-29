# exercise-app

Expo (React Native) ile yazılan, hem mobil (iOS/Android, Expo Go veya dev-client) hem web'de çalışan bir fitness/egzersiz uygulaması. Kimlik doğrulama ve veri katmanı Supabase üzerinden.

## Teknoloji yığını

- **Expo SDK 54** + **Expo Router ~6** (dosya tabanlı routing, `expo-router/entry` giriş noktası)
- **React 19** / **React Native 0.81** (New Architecture açık — `app.json` → `newArchEnabled: true`)
- **TypeScript ~5.9**, `strict: true`
- **Supabase** (`@supabase/supabase-js`) — auth + Postgres veritabanı
- **React Navigation** (Expo Router'ın altyapısı olarak; Stack + Tabs)
- **expo-auth-session** + **expo-web-browser** — Google OAuth login akışı
- **expo-dev-client** kurulu → `expo start` varsayılan olarak Dev Client hedefiyle QR üretir. Sadece Expo Go ile test edilecekse `npx expo start --go` kullan, yoksa QR/derin bağlantı çok uzun olur ve Expo Go'da açılmaz.
- Paket yöneticisi: npm (`package-lock.json` var)

## Çalıştırma

```bash
npm install
npx expo start          # dev-client hedefiyle
npx expo start --go     # düz Expo Go ile test için
npx expo start --web    # web
npm run lint            # expo lint (eslint-config-expo)
npx tsc --noEmit         # tip kontrolü
```

Ortam değişkenleri `.env` dosyasında (git'e girmez, `.gitignore`'da):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
`EXPO_PUBLIC_` önekli değişkenler Expo tarafından otomatik olarak `process.env` üzerinden client koduna gömülür.

## Klasör yapısı

Tüm uygulama kodu `src/` altında. Kök dizindeki `assets/` (görseller/ikonlar) ve `scripts/` (proje bakım script'leri) `src/` dışında kalır — Expo'nun standart konumu bu, `app.json` buradan referans veriyor.

```
src/
├── app/            → SADECE routing. Klasör/dosya adı = URL.
├── shared/         → Ekranlar arası ortak kod (bileşen, hook, sabit, servis client'ı)
├── features/       → Domain'e özel dikey dilim (şu an iskelet halinde, boş)
└── providers/      → Global context/provider'lar (şu an iskelet halinde, boş)
```

### `src/app/` — routing katmanı

Expo Router dosya tabanlı çalışır: bir dosya oluşturmak = bir route tanımlamak, ayrıca kayıt gerekmez.

```
src/app/
├── _layout.tsx        Kök layout: tema (ThemeProvider), StatusBar, üst seviye Stack.
│                       Stack.Screen olarak sadece grupları listeler: (auth), (main), index, modal.
├── index.tsx           "/" — gerçek uygulama girişi. Şu an sadece <Redirect href="/login" />.
│                        İleride "oturum var mı" kontrolü buraya eklenip (auth)/(main) arasında yönlendirecek.
├── modal.tsx            "/modal" — örnek modal ekranı (henüz iş mantığı yok, boilerplate).
│
├── (auth)/              Route group — parantezli klasör adı URL'e YAZILMAZ, sadece gruplama içindir.
│   ├── _layout.tsx        Bu gruptaki ekranlar için Stack tanımı.
│   ├── login.tsx           "/login" — email/şifre + Google OAuth girişi. Apple girişi ve kayıt ol
│   │                        henüz bağlanmamış (Alert ile placeholder).
│   ├── forgot-password.tsx "/forgot-password" — supabase.auth.resetPasswordForEmail çağırır.
│   ├── email-sent.tsx      "/email-sent" — "linki gönderdik" bilgi ekranı.
│   └── reset-password.tsx  "/reset-password" — deep link'ten gelen code ile
│                             supabase.auth.exchangeCodeForSession + updateUser.
│
└── (main)/               Giriş sonrası alan — Tabs navigasyonu.
    ├── _layout.tsx          Tabs tanımı (şu an sade; ikon/tema yok, (tabs) şablonundan sadeleştirildi).
    ├── index.tsx             Ana sekme — "Hoş geldin" ekranı, oturum bilgisini gösterir, çıkış yapar.
    └── explore.tsx           İkinci sekme — Expo şablonundan kalma örnek içerik, henüz gerçek iş mantığı yok.
```

**Kural:** `app/` içindeki dosyalar sadece ekranı çizer. Birden fazla ekranda kullanılacak mantık/bileşen buraya yazılmaz, `shared/` (veya büyüdükçe `features/`) altına taşınır.

**Not — bilinen boşluk:** `(main)` grubu login sonrası `router.replace("/(main)")` ile açılıyor ama `src/app/index.tsx` henüz gerçek bir oturum kontrolü yapmıyor (hep `/login`'e yönlendiriyor). Uygulama açılışında zaten giriş yapmış kullanıcıyı otomatik `(main)`'e sokan mantık eksik — eklenecek.

### `src/shared/` — ekranlar arası ortak kod

Hiçbir zaman doğrudan bir route'a karşılık gelmez, sadece `app/` (ve ileride `features/`) tarafından import edilir.

```
src/shared/
├── components/        Tekrar kullanılabilir UI parçaları (ThemedText, ThemedView, Collapsible, HapticTab...)
│   └── ui/               Platforma özel / ikon gibi düşük seviyeli görsel bileşenler (icon-symbol.ios.tsx vb.)
├── constants/          Sabitler — şu an sadece theme.ts (renk paleti/tema sabitleri)
├── hooks/               Ortak React hook'ları — use-color-scheme (+ .web varyantı), use-theme-color
└── lib/                 Dış servislerle konuşan kod
    ├── supabase.ts         Supabase client'ı. Web SSR'da (Node, `window` yok) AsyncStorage init'inin
    │                         process'i çökertmesini engellemek için `typeof window !== "undefined"`
    │                         kontrolüyle storage/persistSession/autoRefreshToken koşullu açılıyor.
    │                         BU KONTROLÜ KALDIRMA — kaldırılırsa web build'i "window is not defined"
    │                         hatasıyla tamamen çöker (Metro server process'i dahil).
    └── services/
        └── fitnessPreferencesService.ts   Kullanıcının fitness tercihlerini (cardio/strength/flexibility)
                                              doğrulayıp `user_fitness_preferences` tablosuna upsert eder.
                                              app/ katmanı henüz bunu kullanmıyor (bağlanacak ekran bekleniyor).
```

**Import kuralı:** `../../../` gibi göreli yol yazılmaz, `@/` alias'ı kullanılır (`tsconfig.json`):
- `@/shared/*` → `src/shared/*`
- `@/*` (geri kalan her şey, örn. `@/assets/...`) → proje kökü

> Bilinen tutarsızlık: `fitnessPreferencesService.ts` içinde `@/shared/lib/supabase` yerine göreli `../lib/supabase` kullanılmış. İşlevsel olarak doğru ama proje kuralına aykırı — yeni kod yazarken `@/shared/...` formatını kullan.

### `src/features/` ve `src/providers/` — henüz boş iskelet

Sadece `.gitkeep` ile açılmış klasörler, içleri boş. Niyet: proje büyüdükçe (örn. "egzersiz takibi", "beslenme planı" gibi kendi API çağrıları + state'i + birkaç ekranı olan bağımsız bir domain oluştuğunda) o domain'i `src/app/` içine dağıtmak yerine `src/features/<domain>/` altında toplamak (kendi `api/`, `hooks/`, `components/` alt klasörleriyle). `providers/` ise ileride eklenecek global context'ler (örn. QueryClientProvider, AuthProvider) için ayrılmış.

**Şu an bu klasörlere gerçek kod yok — boşken içini "gelecekte lazım olur" diye doldurmayın, gerçek bir domain/ihtiyaç ortaya çıkınca doldurun.**

## Route/deep-link notları

- `app.json` → `scheme: "exercise-app"`. Şifre sıfırlama ve Google OAuth redirect URI'leri bu scheme ile (`AuthSession.makeRedirectUri`) üretiliyor.
- Supabase tarafında "Redirect URLs" listesine bu scheme'in kayıtlı olması gerekiyor (Supabase Dashboard → Auth → URL Configuration).
- `(auth)/reset-password.tsx`, URL'den gelen `code` query param'ını `useLocalSearchParams` ile okuyup `exchangeCodeForSession`'a veriyor — bu ekranı yeniden adlandırırsan/taşırsan Supabase'deki redirect URL'i de güncellemeyi unutma.

## Bilinen eksikler / yapılacaklar (bu dosyayı okuyanın bilmesi gerekenler)

- `src/app/index.tsx` gerçek oturum kontrolü yapmıyor, her zaman `/login`'e yönlendiriyor.
- `login.tsx` içinde `console.log` debug satırları duruyor (SUPABASE LOGIN ÇALIŞTI, EMAIL/DATA/ERROR) — prod'a gitmeden temizlenmeli.
- Apple ile giriş ve "Kayıt ol" akışları sadece `Alert.alert` placeholder'ı, gerçek entegrasyon yok.
- `(main)/explore.tsx` hâlâ Expo'nun örnek şablon içeriği, gerçek bir ekran değil.
- `fitnessPreferencesService.ts` yazılmış ama henüz hiçbir ekrandan çağrılmıyor.

## Bu dosyayı güncel tutma

Yeni bir üst düzey klasör (`src/xxx/`), yeni bir route group, ya da mimariyi etkileyen bir karar (örn. state yönetimi kütüphanesi eklemek, `features/` yapısını fiilen kullanmaya başlamak) eklendiğinde bu dosyayı da güncelle — amaç, yeni katılan birinin kod tabanını gezmeden önce buradan 5 dakikada oryante olabilmesi.
