# Supabase ↔ exercise-app Uyum Analizi

Proje: `exercise-app` (Supabase ref `jvkiivuxjbhezezowpnx`) — 1 Ağustos 2026 itibarıyla canlı şema, mevcut migration'lar (`list_migrations`), RLS policy'leri, RPC fonksiyon tanımları ve `src/` altındaki tüm ekran/servis kodu karşılaştırıldı.

## En kritik bulgu: Uygulama gerçek veritabanı verisini hiç kullanmıyor

`exercises`, `muscles`, `equipments`, `body_parts`, `exercise_steps`, `secondary_muscles` tabloları dolu ve herkese açık SELECT policy'sine sahip (1324 egzersiz, 50 kas, 28 ekipman, 10 vücut bölgesi, 5600 adım, 2581 ikincil kas eşlemesi). Ancak kod tabanında **hiçbir yerde `supabase.from(...)` çağrısı yok** — tüm ana ekranlar (`(main)/index.tsx`, `(main)/exercise.tsx`, `(main)/program.tsx`, `exercise-detail.tsx`, `program-selection.tsx`, `new-program.tsx`) `src/shared/constants/home-mock-data.ts` içindeki **statik mock veriyle** çalışıyor (`homeService.ts` → `getHomeSourceData()`, `getExerciseCatalog()`, `getExerciseById()`). Program oluşturma akışı da (`mock-program-repository.ts`) gerçek bir tabloya değil, bellek içi bir mock repository'ye yazıyor.

Buna paralel olarak DB'de `user_workout_programs`, `user_workout_program_exercises`, `user_completed_exercises` tabloları — tam da bu mock program/egzersiz akışının ihtiyaç duyacağı şemayla (program adı yerine `program_date`, `sets`/`reps`/`order_index`, tamamlanma kaydı) zaten kurulmuş ve RLS'i açık, ama üçü de şu an **0 satır** ve kodun hiçbir yerinden referans almıyor (ne `.from()` ne `.rpc()`). Yani DB tarafında "gerçek veriye geçiş" için altyapı hazır ama client hiç bağlanmamış.

## Onboarding RPC'leri: kod ile birebir uyumlu

`save_onboarding_personal_info`, `save_onboarding_fitness_focus`, `save_onboarding_weekly_goal` fonksiyonlarının parametre adı/sırası/tipi, `personalInfoService.ts` / `fitnessPreferencesService.ts` / `weeklyTrainingDaysService.ts`'teki `supabase.rpc(...)` çağrılarıyla tam eşleşiyor. Enum eşlemeleri de doğru:

- `GENDER_MAP` çıktısı (`male` / `female` / `prefer_not_to_say`) → `profiles.gender` CHECK constraint'iyle birebir aynı.
- `GOAL_MAP` çıktısı (`muscle_gain` / `fat_loss` / `general_fitness`) → `fitness_preferences.goal` CHECK constraint'iyle birebir aynı.
- `DAY_CODE_MAP` çıktısı (`mon`…`sun`) → `user_weekly_training_days.day_of_week` CHECK constraint'iyle birebir aynı.
- Üç fonksiyon da gerçekten `SECURITY INVOKER` (prosecdef=false) — CLAUDE.md'nin iddiasıyla uyumlu.

Tek dikkat noktası: `OnboardingContext`'teki `Goal` tipi `"gain-weight"` seçeneğini de tanımlıyor ama hem `personal-info.tsx`'teki `goalOptions` hem `personalInfoService.ts`'teki `GOAL_MAP` bunu hiç sunmuyor/eşlemiyor (kod içi yorumla bilinçli olarak dışarıda bırakıldığı belirtilmiş). Kullanılmayan bir tip üyesi — kod çalışmasını bozmuyor ama gereksiz yüzey.

## CLAUDE.md artık güncel değil — kod çok daha ileride

`CLAUDE.md` projeyi hâlâ iskelet hâldeymiş gibi tarif ediyor, ama gerçek kod tabanı bunu aşmış:

- **`src/features/`** dosyası "sadece `.gitkeep` ile açılmış, içi boş" deniyor. Gerçekte `features/exercises/` (catalog, detail validation, program-selection, exercise-card) ve `features/programs/` (program-domain, types, mock-program-repository, program-card/flow-header/result-modal/selection-chip) dolu; sadece `features/auth/` ve `features/home/` hâlâ `.gitkeep`.
- **`(main)/` grubu** dokümanda 2 sekme (`index`, `explore`) olarak anlatılıyor. Gerçekte 4 görünür sekme var: `index` (Ana Sayfa), `program`, `exercise`, `progress`; `explore` artık `href: null` ile tab bar'dan gizlenmiş durumda.
- Dokümanda geçmeyen yeni route'lar: `(auth)/auth-callback.tsx`, `exercise-detail.tsx`, `program-selection.tsx`, `new-program.tsx`.
- **"Bilinen boşluk" olarak işaretlenen `src/app/index.tsx` oturum kontrolü eksikliği artık geçerli değil.** Kod zaten `supabase.auth.getSession()` + `user_metadata.onboarding_completed` bakarak `/login`, `/onboarding/personal-info`, `/(main)` arasında doğru yönlendirme yapıyor; `login.tsx` da aynı mantığı hem şifreli girişte hem Google OAuth'ta tekrarlıyor.
- **Deep-link/e-posta doğrulama akışı komple değişmiş.** Doküman "email-verified.tsx URL'deki `code` ile `exchangeCodeForSession` çağırır" ve "signUp'ın emailRedirectTo'su `exercise-app://email-verified`" diyor. Gerçekte:
  - `emailRedirectTo` artık `Linking.createURL("auth-callback")` (dinamik, sabit scheme değil) ve **yeni** `(auth)/auth-callback.tsx` ekranına düşüyor.
  - `supabase.ts`'de `flowType: "implicit"` olduğu için token'lar `code` query param'ı değil, URL fragment'ındaki `access_token`/`refresh_token` olarak geliyor; `authCallbackUrl.ts`'teki `getAuthCallbackParameters()` bunları elle ayrıştırıp `setSession()`'a veriyor. `exchangeCodeForSession` artık hiçbir auth akışında kullanılmıyor (ne Google OAuth'ta, ne e-posta doğrulamada, ne şifre sıfırlamada) — üçü de aynı access/refresh-token + `setSession` desenine geçmiş.
  - `email-verified.tsx` artık `code` değil `email` route param'ı alıyor ve doğrulamayı `getSession()`/`getUser().email_confirmed_at` ile kontrol ediyor.
  - Bu değişikliğin gerekçesi kod içi yorumlarda açıkça yazılı ("önceden code exchange deneniyordu, hiç eşleşmediği için Google ile girişte session hiç kurulmuyordu") — yani bu bilinçli bir mimari düzeltme, ama CLAUDE.md'ye hiç yansıtılmamış.
- `(main)/index.tsx` dokümanda "Hoş geldin ekranı, oturum bilgisini gösterir, çıkış yapar" deniyor; gerçekte oturum/çıkış UI'sı yok, bunun yerine haftalık hareket özeti, vücut bölgesi kırılımı, antrenman grafiği ve günün programını gösteren tam bir dashboard (`buildHomeDashboard` + mock veri).

Sonuç: CLAUDE.md'nin "Klasör yapısı", "Route/deep-link notları" ve "Bilinen eksikler" bölümlerinin tamamı bir önceki geliştirme evresini yansıtıyor; güncellenmesi gerekiyor.

## Veritabanı tarafındaki iç tutarsızlıklar (kod dışı, Supabase advisor bulguları)

- **RLS performans tutarsızlığı:** Diğer tüm "kullanıcı kendi verisini yönetir" policy'leri `(select auth.uid()) = user_id` optimize desenini kullanıyor, ama `user_fitness_focus_areas` tablosundaki policy hâlâ `auth.uid() = user_id` (optimize edilmemiş) — satır başına yeniden değerlendirme riski taşıyor. Aynı migration setinde diğerleri düzeltilirken bu biri atlanmış görünüyor.
- **Duplicate index:** `body_parts` tablosunda `body_parts_name_key` ve `body_parts_name_unique` aynı sütun üzerinde iki ayrı unique index — biri gereksiz.
- **İndekslenmemiş foreign key'ler:** `exercises` (body_part_id, equipment_id, muscle_group_id, target_muscle_id), `exercise_steps.exercise_id`, `secondary_muscles.muscle_id`, `user_workout_program_exercises` (exercise_id, program_id), `user_completed_exercises` (exercise_id, program_exercise_id, user_id) — hiçbiri kapsayan bir index'e sahip değil. Referans tabloları (1300+ satır) için sorgu performansını etkileyebilir; kullanıcı tabloları henüz boş olduğu için şu an pratik etkisi yok ama gerçek veri akışına geçilince önemli olacak.
- **Leaked password protection kapalı** (Dashboard → Auth → Policies, SQL ile açılamıyor) — CLAUDE.md'de zaten not edilmiş, hâlâ geçerli.

## Kodun kendi içindeki küçük tutarsızlıklar

- `login.tsx` ve `register.tsx` hâlâ kendi yerel e-posta regex kopyalarını (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) kullanıyor; `authValidation.ts`'teki `isValidEmail`'e taşınmamış (CLAUDE.md bunu zaten biliyor, hâlâ geçerli).
- `features/programs/mock-program-repository.ts`, `features/programs/types.ts` gibi dosyalar `@/src/features/...` şeklinde "çift kök" (`@/` zaten proje köküne gidiyor, üstüne `src/features/...` ekleniyor) bir import deseni kullanıyor; `shared/` ve `providers/` için tanımlı temiz `@/shared/*`, `@/providers/*` alias'larının aksine `features/` için ayrı bir alias tanımlanmamış. Çalışıyor ama isimlendirme tutarsız.

## Özet tablo

| Alan | Durum |
|---|---|
| Onboarding RPC parametreleri ↔ kod | Tam uyumlu |
| Onboarding enum eşlemeleri (gender/goal/day) ↔ DB CHECK | Tam uyumlu |
| RPC'lerin SECURITY INVOKER olması | CLAUDE.md ile uyumlu |
| Egzersiz kataloğu tabloları ↔ UI | UI hiç okumuyor, mock veri kullanılıyor |
| `user_workout_programs` / `..._exercises` / `user_completed_exercises` | DB'de var, kodda hiç kullanılmıyor |
| CLAUDE.md klasör yapısı açıklaması | Güncel değil (features/, (main)/ sekmeleri) |
| CLAUDE.md deep-link/e-posta doğrulama açıklaması | Güncel değil (code exchange → implicit token akışı) |
| CLAUDE.md "index.tsx oturum kontrolü yok" notu | Artık geçersiz, düzeltme yapılmış |
| RLS policy tutarlılığı | `user_fitness_focus_areas` diğerlerinden farklı desende |
| DB index/performans | Advisor uyarıları mevcut, kritik değil (tablolar boş) |
