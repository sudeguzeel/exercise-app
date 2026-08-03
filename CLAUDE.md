# exercise-app

Expo (React Native) ile yazılan, hem mobil (iOS/Android, Expo Go veya dev-client) hem web'de çalışan bir fitness/egzersiz uygulaması. Kimlik doğrulama ve veri katmanı Supabase üzerinden.

## Teknoloji yığını

- **Expo SDK 54** + **Expo Router ~6** (dosya tabanlı routing, `expo-router/entry` giriş noktası)
- **React 19** / **React Native 0.81** (New Architecture açık — `app.json` → `newArchEnabled: true`)
- **TypeScript ~5.9**, `strict: true`
- **Supabase** (`@supabase/supabase-js`) — auth + Postgres veritabanı + RPC fonksiyonları (bkz. "Supabase veritabanı" bölümü)
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
└── providers/      → Global context/provider'lar (OnboardingContext burada)
```

### `src/app/` — routing katmanı

Expo Router dosya tabanlı çalışır: bir dosya oluşturmak = bir route tanımlamak, ayrıca kayıt gerekmez.

```
src/app/
├── _layout.tsx        Kök layout: OnboardingProvider, tema (ThemeProvider), StatusBar, üst seviye Stack.
│                       Stack.Screen olarak grupları + onboarding rotalarını listeler.
├── index.tsx           "/" — gerçek uygulama girişi. Şu an sadece <Redirect href="/login" />.
│                        İleride "oturum var mı" kontrolü buraya eklenip (auth)/(main) arasında yönlendirecek.
├── modal.tsx            "/modal" — örnek modal ekranı (henüz iş mantığı yok, boilerplate).
│
├── (auth)/              Route group — parantezli klasör adı URL'e YAZILMAZ, sadece gruplama içindir.
│   ├── _layout.tsx        Bu gruptaki ekranlar için Stack tanımı.
│   ├── login.tsx           "/login" — email/şifre + Google OAuth girişi. Apple girişi ve kayıt ol
│   │                        henüz bağlanmamış (Alert ile placeholder). Kayıt ol linki "/register"a gider.
│   ├── register.tsx        "/register" — email/şifre ile signUp. Başarılıysa (Supabase'de "Confirm
│   │                        email" açıksa) "/verify-email"e, kapalıysa doğrudan
│   │                        "/onboarding/personal-info"e yönlendirir.
│   ├── verify-email.tsx    "/verify-email" — doğrulama e-postası gönderildi bilgi ekranı. Kullanıcı
│   │                        mail'deki linke tıklayınca deep link ile "/email-verified"e düşer; deep
│   │                        link gecikirse/çalışmazsa (özellikle Expo Go) "E-postamı doğruladım, giriş
│   │                        yap" butonuyla elle "/login"e geçilebilir.
│   ├── email-verified.tsx  "/email-verified" — signUp'taki emailRedirectTo hedefi. URL'deki `code`
│   │                        ile exchangeCodeForSession çağırır, başarılıysa
│   │                        "/onboarding/personal-info"e yönlendirir.
│   ├── forgot-password.tsx "/forgot-password" — supabase.auth.resetPasswordForEmail çağırır.
│   ├── email-sent.tsx      "/email-sent" — "linki gönderdik" bilgi ekranı.
│   └── reset-password.tsx  "/reset-password" — deep link'ten gelen code ile
│                             supabase.auth.exchangeCodeForSession + updateUser.
│
├── onboarding/            Kayıt sonrası 3 adımlık zorunlu profil kurulumu (route group değil, düz
│   │                       klasör — segment adı URL'e "onboarding/..." olarak yansır).
│   ├── personal-info.tsx    Adım 1: ad soyad, cinsiyet, doğum tarihi, boy, kilo, hedef.
│   │                          savePersonalInfo() → RPC save_onboarding_personal_info.
│   ├── fitness-experience.tsx Adım 2: cardio/strength/flexibility odak seçimi.
│   │                          saveFitnessPreferences() → RPC save_onboarding_fitness_focus.
│   └── weekly-training-days.tsx Adım 3: haftalık antrenman günleri.
│                                saveWeeklyTrainingDays() → RPC save_onboarding_weekly_goal +
│                                auth metadata'da onboarding_completed=true.
│
└── (main)/               Giriş sonrası alan — Tabs navigasyonu.
    ├── _layout.tsx          Tabs tanımı (şu an sade; ikon/tema yok, (tabs) şablonundan sadeleştirildi).
    ├── index.tsx             Ana sekme — "Hoş geldin" ekranı, oturum bilgisini gösterir, çıkış yapar.
    └── explore.tsx           İkinci sekme — Expo şablonundan kalma örnek içerik, henüz gerçek iş mantığı yok.
```

**Kural:** `app/` içindeki dosyalar sadece ekranı çizer. Birden fazla ekranda kullanılacak mantık/bileşen buraya yazılmaz, `shared/` (veya büyüdükçe `features/`) altına taşınır. Supabase'e yazma/okuma işi de mümkün olduğunca `shared/lib/services/*` altındaki servis fonksiyonlarına devredilir (ekran dosyası sadece servisi çağırıp sonucu render eder).

**Not — bilinen boşluk:** `(main)` grubu login sonrası `router.replace("/(main)")` ile açılıyor ama `src/app/index.tsx` henüz gerçek bir oturum kontrolü yapmıyor (hep `/login`'e yönlendiriyor). Uygulama açılışında zaten giriş yapmış ve onboarding'i tamamlamış kullanıcıyı otomatik `(main)`'e sokan mantık eksik — eklenecek.

### `src/shared/` — ekranlar arası ortak kod

Hiçbir zaman doğrudan bir route'a karşılık gelmez, sadece `app/` (ve ileride `features/`) tarafından import edilir.

```
src/shared/
├── components/        Tekrar kullanılabilir UI parçaları (ThemedText, ThemedView, Collapsible, HapticTab...)
│   └── ui/               Platforma özel / ikon gibi düşük seviyeli görsel bileşenler (icon-symbol.ios.tsx vb.)
├── constants/          Sabitler — theme.ts: Colors/Fonts (Expo şablonu) + AuthColors/AuthLayout/AuthTypography
│                         (auth ekranlarının kendi tasarım tokenları)
├── hooks/               Ortak React hook'ları — use-color-scheme (+ .web varyantı), use-theme-color
└── lib/
    ├── supabase.ts         Supabase client'ı. Web SSR'da (Node, `window` yok) AsyncStorage init'inin
    │                         process'i çökertmesini engellemek için `typeof window !== "undefined"`
    │                         kontrolüyle storage/persistSession/autoRefreshToken koşullu açılıyor.
    │                         BU KONTROLÜ KALDIRMA — kaldırılırsa web build'i "window is not defined"
    │                         hatasıyla tamamen çöker (Metro server process'i dahil).
    ├── validation/
    │   └── authValidation.ts  isValidEmail / normalizeEmail — verify-email.tsx route param'ını
    │                            doğrulamak için kullanılıyor. login.tsx/register.tsx kendi yerel
    │                            regex kopyalarını hâlâ kullanıyor, henüz buraya taşınmadı.
    └── services/            Onboarding ekranlarının Supabase RPC'lerini çağıran ince katman;
        │                      her biri context'teki ham state'i DB'nin beklediği şekle çevirir
        │                      (örn. Gender "other" → "prefer_not_to_say", TrainingDay "monday" → "mon").
        ├── personalInfoService.ts        savePersonalInfo() → save_onboarding_personal_info RPC'si.
        ├── fitnessPreferencesService.ts  saveFitnessPreferences() → save_onboarding_fitness_focus RPC'si.
        └── weeklyTrainingDaysService.ts  saveWeeklyTrainingDays() → save_onboarding_weekly_goal RPC'si
                                             + auth.updateUser(onboarding_completed).
```

**Import kuralı:** `../../../` gibi göreli yol yazılmaz, `@/` alias'ı kullanılır (`tsconfig.json`):
- `@/shared/*` → `src/shared/*`
- `@/providers/*` → `src/providers/*`
- `@/*` (geri kalan her şey, örn. `@/assets/...`) → proje kökü

### `src/providers/` — global context'ler

- `OnboardingContext.tsx` — `OnboardingProvider` (kök layout'ta sarılı) + `useOnboarding()` hook'u. Kayıt
  sonrası 3 adımlık onboarding formunun state'ini (personalInfo, fitnessPreferences, trainingDays) bellekte
  tutar; her adım kendi servis fonksiyonuyla bu state'i Supabase'e yazar. Önceden proje kökündeki
  `context/OnboardingContext.tsx` altındaydı (bu klasörün öngördüğü konumla tutarsızdı), `src/providers/`e
  taşındı.

### `src/features/` — henüz boş iskelet

Sadece `.gitkeep` ile açılmış, içi boş. Niyet: proje büyüdükçe (örn. "egzersiz takibi", "beslenme planı" gibi kendi API çağrıları + state'i + birkaç ekranı olan bağımsız bir domain oluştuğunda) o domain'i `src/app/` içine dağıtmak yerine `src/features/<domain>/` altında toplamak (kendi `api/`, `hooks/`, `components/` alt klasörleriyle).

**Şu an bu klasöre gerçek kod yok — boşken içini "gelecekte lazım olur" diye doldurmayın, gerçek bir domain/ihtiyaç ortaya çıkınca doldurun.**

## Supabase veritabanı (proje: `exercise-app`, ref `jvkiivuxjbhezezowpnx`)

Repoda `supabase/migrations` klasörü yok — şema, RLS policy'leri ve RPC fonksiyonları sadece Supabase
projesinin kendisinde duruyor, repodan takip edilmiyor. Şema değiştiren biri Supabase MCP/Dashboard
üzerinden migration uyguluyor; bu dosyayı okuyan biri güncel şemayı görmek isterse `list_tables` /
`list_migrations` ile projenin kendisine bakmalı.

Onboarding ile ilgili tablolar (`profiles`, `body_metrics`, `fitness_preferences`,
`user_fitness_focus_areas`, `user_weekly_training_days`, `user_onboarding_status`) hepsi `user_id` üzerinden
`auth.users`e FK'li, RLS açık ve `auth.uid() = user_id` policy'siyle sahibine ALL yetkisi veriyor. Client
kodu bu tablolara doğrudan `.from(...)` ile yazmıyor; üç SECURITY INVOKER RPC fonksiyonu üzerinden yazıyor
(client'ın kendi RLS'i geçerli oluyor, ekstra ayrıcalık genişletmesi yok):

- `save_onboarding_personal_info(p_gender, p_goal, p_full_name, p_birth_date, p_height_cm, p_current_weight_kg, p_target_weight_kg)`
  → `profiles` + `fitness_preferences.goal` + `body_metrics` satırlarını tek çağrıda upsert eder.
- `save_onboarding_fitness_focus(p_focus_areas text[])` → `user_fitness_focus_areas`i (cardio/strength/flexibility) siler+yeniden yazar.
- `save_onboarding_weekly_goal(p_days text[])` → `user_weekly_training_days`i siler+yeniden yazar, `user_onboarding_status.completed/weekly_goal/completed_at`i günceller.

Ayrıca egzersiz kataloğu için referans tabloları var: `exercises`, `muscles`, `equipments`, `body_parts`,
`exercise_steps`, `secondary_muscles` (RLS açık, herkese SELECT policy'si var; henüz hiçbir ekran bu
verileri okumuyor — `src/features/` doldurulduğunda buradan beslenmesi bekleniyor).

`fitness_preferences.goal` ile `user_fitness_focus_areas.focus_area` birbirine karıştırılmamalı: ilki
personal-info ekranındaki tek seçimlik "hedef" (kilo verme/kas kazanma/genel fitness), ikincisi
fitness-experience ekranındaki çoklu seçimlik "ilgi alanı" (cardio/strength/flexibility).

Auth tarafında "Leaked password protection" Supabase Dashboard → Auth → Policies üzerinden hâlâ kapalı;
bu SQL/migration ile açılamıyor, elle Dashboard'dan etkinleştirilmeli.

## Route/deep-link notları

- `app.json` → `scheme: "exercise-app"`. Kayıt e-postası doğrulama, şifre sıfırlama ve Google OAuth redirect URI'leri bu scheme ile (`AuthSession.makeRedirectUri`) üretiliyor.
- Supabase tarafında "Redirect URLs" listesine bu scheme'in kayıtlı olması gerekiyor (Supabase Dashboard → Auth → URL Configuration).
- `register.tsx` → signUp'ın `emailRedirectTo`'su `exercise-app://email-verified`. `(auth)/email-verified.tsx`, URL'den gelen `code` query param'ını `useLocalSearchParams` ile okuyup `exchangeCodeForSession`'a veriyor.
- `(auth)/reset-password.tsx` aynı şekilde `code` ile `exchangeCodeForSession` çağırıyor — bu ekranları yeniden adlandırırsan/taşırsan Supabase'deki redirect URL'leri de güncellemeyi unutma.
- Google OAuth (`login.tsx` → `handleGoogleLogin`) `skipBrowserRedirect: true` ile URL alıp `WebBrowser.openAuthSessionAsync`'e veriyor, tarayıcıdan dönen URL'deki `code`'u elle `exchangeCodeForSession`'a geçiyor. `supabase.ts`'de `detectSessionInUrl: false` olduğu ve React Native'de zaten otomatik URL algılama olmadığı için bu elle exchange adımı olmadan session hiç kurulmuyor — kaldırılmamalı.

## Bilinen eksikler / yapılacaklar (bu dosyayı okuyanın bilmesi gerekenler)

- `src/app/index.tsx` gerçek oturum kontrolü yapmıyor, her zaman `/login`'e yönlendiriyor.
- Apple ile giriş ve "Kayıt ol" ekranındaki üçüncü taraf girişleri sadece `Alert.alert` placeholder'ı, gerçek entegrasyon yok. (Email/şifre ile kayıt ol tam çalışıyor.)
- `(main)/explore.tsx` hâlâ Expo'nun örnek şablon içeriği, gerçek bir ekran değil.
- `exercises`/`muscles`/`equipments` gibi referans tabloları okuma policy'sine sahip ama henüz hiçbir ekran bu verileri çekmiyor.
- `login.tsx`/`register.tsx`'teki e-posta regex'i `authValidation.ts`'e taşınmadı, iki ayrı kopya var.
- Onboarding formu geri tuşuyla (`router.back()`) önceki adıma dönüldüğünde önceki adımın verisi tekrar Supabase'e yazılmıyor sadece context state'i korunuyor — kullanıcı adım 3'te geri gidip adım 1'i değiştirip tekrar ileri gelirse adım 1 verisi güncel haliyle yeniden kaydedilir (her adım kendi "Devam et" butonunda upsert ettiği için sorun yok), ama adım 1'e hiç dönmeden sadece adım 2/3'ü tekrar doldurursa bu normal.

## Bu dosyayı güncel tutma

Yeni bir üst düzey klasör (`src/xxx/`), yeni bir route group, yeni bir Supabase tablosu/RPC'si, ya da mimariyi etkileyen bir karar (örn. state yönetimi kütüphanesi eklemek, `features/` yapısını fiilen kullanmaya başlamak) eklendiğinde bu dosyayı da güncelle — amaç, yeni katılan birinin kod tabanını gezmeden önce buradan 5 dakikada oryante olabilmesi.
