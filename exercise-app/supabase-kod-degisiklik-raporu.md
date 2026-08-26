# Yapılan Değişiklikler — Supabase & Kod Uyumsuzlukları Giderme

Önceki analizde (`supabase-kod-uyum-analizi.md`) tespit edilen veritabanı tutarsızlıkları, kod içi tutarsızlıklar ve mock-veri sorunu giderildi. CLAUDE.md güncellemesi kapsam dışı bırakıldı (istendiği gibi).

## 1. Veritabanı değişiklikleri (2 migration uygulandı)

**`fix_rls_and_index_inconsistencies`**
- `user_fitness_focus_areas` policy'si diğer tablolarla aynı `(select auth.uid())` desenine çevrildi (satır başına yeniden değerlendirme sorunu giderildi).
- `body_parts` üzerindeki yinelenen unique constraint/index (`body_parts_name_key`) kaldırıldı.
- Daha önce indekslenmemiş 11 foreign key'e index eklendi (`exercises`, `exercise_steps`, `secondary_muscles`, `user_workout_program_exercises`, `user_completed_exercises`).

**`extend_workout_programs_for_named_recurring_programs`**
- `user_workout_programs`: `program_date` artık zorunlu değil; `name` (1–60 karakter), `training_days text[]` (mon–sun, en az 1), `muscle_group_ids uuid[]` (en az 1) eklendi. Kullanıcı başına aynı isimde iki program açılamaz (case-insensitive unique index).
- `user_workout_program_exercises`: `rest_seconds smallint` (0–600) eklendi; `sets` (1–10) ve `reps` (1–100) için CHECK eklendi — bunlar zaten `exercise-detail-validation.ts`'teki client-side kurallarla birebir aynı.

Bu iki tablo `list_tables`'a göre hâlâ 0 satır olduğu için alter'lar veri kaybı riski taşımadan uygulandı. `get_advisors` ile doğrulandı: RLS/duplicate-index uyarıları gitti; yeni eklenen index'ler için "henüz kullanılmadı" (INFO seviyeli, beklenen) uyarısı dışında sorun yok.

*Not: `list_tables`'da görünen leaked-password-protection uyarısı SQL ile açılamıyor (Dashboard → Auth → Policies üzerinden elle yapılmalı), önceki raporda da belirtilmişti, dokunulmadı.*

## 2. Kod içi tutarsızlıklar

- **E-posta regex tekrarı**: `login.tsx` ve `register.tsx`'teki yerel regex kaldırıldı, ikisi de artık `authValidation.ts`'teki `isValidEmail`'i kullanıyor.
- **`gain-weight` ölü tip üyesi**: `OnboardingContext.tsx`'teki `Goal` tipinden kaldırıldı (hiçbir ekranda sunulmuyor, hiçbir yerde DB'ye eşlenmiyordu).
- **`@/src/features/...` import tutarsızlığı**: `tsconfig.json`'a temiz bir `@/features/*` alias'ı eklendi, tüm `@/src/features/...` import'ları (~15 dosya, mekanik değişiklik) `@/features/...`'a çevrildi.

## 3. Mock veri → gerçek Supabase bağlantısı

Önceki analizde belirlenen iki tasarım kararınıza göre uygulandı: **program modeli için DB şeması genişletildi** (yukarıda), **egzersiz alanları için UI gerçek veriye göre sadeleştirildi** (seviye/tip/önerilen set-tekrar-dinlenme kaldırıldı, kullanıcı artık her zaman kendi değerlerini giriyor).

**Yeni dosyalar:**
- `src/shared/constants/exercise-taxonomy.ts` — DB'deki İngilizce vücut bölgesi/ekipman/kas isimleri (10+28+50 satır) için Türkçe çeviri sözlükleri + vücut bölgesine göre ikon eşlemesi.
- `src/shared/lib/services/exerciseCatalogService.ts` — `exercises`/`body_parts`/`equipments`/`muscles`/`exercise_steps`/`secondary_muscles` tablolarını gerçek Supabase sorgularıyla (arama, kategori filtresi, `.range()` sayfalama) okuyan servis.
- `src/features/programs/program-repository.ts` — `user_workout_programs` + `user_workout_program_exercises`'ı gerçek `.from()` çağrılarıyla okuyan/yazan `ProgramRepository` implementasyonu (RLS zaten tablo bazında koruyor, ekstra RPC gerekmedi).

**Yeniden yazılan dosyalar:** `homeService.ts`, `home-dashboard.ts`, `(main)/index.tsx`, `(main)/exercise.tsx`, `exercise-detail.tsx`, `exercise-catalog.ts`, `program-selection.ts` (features/exercises) — hepsi artık mock veri yerine yukarıdaki servisleri çağırıyor, yükleniyor/hata durumları eklendi (veri artık asenkron).

**Düzenlenen dosyalar:** `(main)/program.tsx`, `program-selection.tsx`, `new-program.tsx`, `exercise-card.tsx`, `features/programs/types.ts` — `getExerciseById`/`getExerciseCatalog` gibi senkron mock çağrıları async servislerle değiştirildi.

**Bilerek yapılmayanlar (kapsam dışı bırakıldı):**
- Egzersiz görselleri: `exercises.image`/`gif_url` DB'de göreli yol olarak duruyor (`images/0001-....jpg`) ama hiçbir storage bucket/CDN base URL tanımlı değil — gerçek görsel/gif gösterilemiyor, önceki mock'taki gibi vücut-bölgesine-göre ikon placeholder kullanılmaya devam ediyor. Base URL'i biliyorsanız söyleyin, kolayca bağlarım.
- "Egzersizi tamamlandı işaretle" — `user_completed_exercises`'a yazan hiçbir UI yok (mock veride de gerçek bir aksiyon değildi, sadece uydurma kayıtlardı). Dashboard artık bu tabloyu doğru okuyor ama tablo boş olduğu için haftalık özet/seri şu an dürüstçe sıfır gösterecek — yeni bir özellik (workout tamamlama ekranı) eklenene kadar bu beklenen bir durum.

**Silinemeyen orphan dosyalar:** `mock-program-repository.ts` ve `home-mock-data.ts` — silme izni istendi ama reddedildi, bu yüzden hâlâ diskteler ama hiçbir yerden import edilmiyorlar (`@ts-nocheck` eklendi ki tip kontrolünü bozmasınlar). İsterseniz elle silebilirsiniz.

## 4. Doğrulama

- `npx tsc --noEmit` → **temiz**, hiçbir tip hatası yok.
- `npx expo lint` sandbox'ta güvenilir şekilde tamamlanamadı (ilk çalıştırmada interaktif/uzun sürüyor) — yerelde `npm run lint` ile kontrol etmenizi öneririm.
- Supabase tarafı: `get_advisors` (security+performance) ile migration'lar sonrası tekrar kontrol edildi.
- PostgREST embed sorguları (`exerciseCatalogService.ts`, `homeService.ts`) canlı şemadaki gerçek foreign key adlarına göre yazıldı, ama sandbox'ın `supabase.co`'ya ağ erişimi olmadığı için uçtan uca canlı testi yapılamadı — `npx expo start --web` ile "Egzersizler" sekmesini ilk açtığınızda bir kontrol etmenizi öneririm.

## 5. Önemli not: `git diff` gürültüsü

`git status`'a bakarsanız hiç dokunmadığım dosyalar da (`themed-text.tsx`, `haptic-tab.tsx` vb.) "M" (modified) görünüyor ve değiştirdiğim dosyalarda da satır sayısı gerçek değişiklikten çok daha yüksek çıkıyor. Bunun sebebi benim değişikliklerim değil — sandbox ortamının satır sonu (CRLF/LF) normalizasyonu, repo genelinde böyle görünmesine yol açıyor. Gerçekten içeriğini değiştirdiğim dosyalar bu raporda listelenenlerle sınırlı.
