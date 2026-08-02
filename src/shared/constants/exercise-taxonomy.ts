// Supabase'deki exercises/body_parts/equipments/muscles referans tabloları
// İngilizce (ExerciseDB kaynaklı) isimlerle geliyor; uygulamanın geri kalanı
// Türkçe olduğu için burada görüntüleme amaçlı çeviri sözlükleri tutuluyor.
// Sözlükte karşılığı olmayan bir isim gelirse (yeni satır eklenirse vb.)
// ham İngilizce isim aynen gösterilir — uygulama hiçbir zaman çökmez.

import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const BODY_PART_TR: Record<string, string> = {
  back: "Sırt",
  cardio: "Kardiyo",
  chest: "Göğüs",
  "lower arms": "Ön Kol",
  "lower legs": "Alt Bacak",
  neck: "Boyun",
  shoulders: "Omuz",
  "upper arms": "Üst Kol",
  "upper legs": "Üst Bacak",
  waist: "Bel / Karın",
};

export const BODY_PART_ICON: Record<string, IconName> = {
  back: "body-outline",
  cardio: "heart-outline",
  chest: "body-outline",
  "lower arms": "barbell-outline",
  "lower legs": "walk-outline",
  neck: "body-outline",
  shoulders: "body-outline",
  "upper arms": "barbell-outline",
  "upper legs": "walk-outline",
  waist: "fitness-outline",
};

export const EQUIPMENT_TR: Record<string, string> = {
  assisted: "Yardımlı",
  band: "Bant",
  barbell: "Halter",
  "body weight": "Vücut Ağırlığı",
  "bosu ball": "Bosu Topu",
  cable: "Kablo",
  dumbbell: "Dambıl",
  "elliptical machine": "Eliptik Makine",
  "ez barbell": "EZ Barbell",
  hammer: "Hammer Tutuş",
  kettlebell: "Kettlebell",
  "leverage machine": "Leverage Makine",
  "medicine ball": "Sağlık Topu",
  "olympic barbell": "Olimpik Halter",
  "resistance band": "Direnç Bandı",
  roller: "Foam Roller",
  rope: "İp",
  "skierg machine": "SkiErg Makine",
  "sled machine": "Sled Makine",
  "smith machine": "Smith Makine",
  "stability ball": "Denge Topu",
  "stationary bike": "Sabit Bisiklet",
  "stepmill machine": "Stepmill Makine",
  tire: "Lastik",
  "trap bar": "Trap Bar",
  "upper body ergometer": "Üst Vücut Ergometresi",
  weighted: "Ağırlıklı",
  "wheel roller": "Karın Tekerleği",
};

export const MUSCLE_TR: Record<string, string> = {
  abdominals: "Karın Kasları",
  abductors: "Abdüktörler",
  abs: "Karın",
  adductors: "Addüktörler",
  "ankle stabilizers": "Ayak Bileği Stabilizatörleri",
  ankles: "Ayak Bilekleri",
  back: "Sırt",
  biceps: "Biceps",
  brachialis: "Brakiyalis",
  calves: "Baldır",
  "cardiovascular system": "Kardiyovasküler Sistem",
  chest: "Göğüs",
  core: "Karın Bölgesi",
  deltoids: "Deltoidler",
  delts: "Omuz",
  feet: "Ayaklar",
  forearms: "Ön Kol",
  glutes: "Kalça",
  "grip muscles": "Kavrama Kasları",
  groin: "Kasık",
  hamstrings: "Arka Bacak",
  hands: "Eller",
  "hip flexors": "Kalça Fleksörleri",
  "inner thighs": "İç Bacak",
  "latissimus dorsi": "Kanat Kası",
  lats: "Kanat",
  "levator scapulae": "Levator Skapula",
  "lower abs": "Alt Karın",
  "lower back": "Bel",
  obliques: "Yan Karın",
  pectorals: "Göğüs",
  quadriceps: "Ön Bacak",
  quads: "Ön Bacak",
  "rear deltoids": "Arka Omuz",
  rhomboids: "Romboid",
  "rotator cuff": "Rotator Manşet",
  "serratus anterior": "Serratus Anterior",
  shins: "Kaval Kemiği",
  shoulders: "Omuz",
  soleus: "Soleus",
  spine: "Omurga",
  sternocleidomastoid: "Sternokleidomastoid",
  trapezius: "Trapez",
  traps: "Trapez",
  triceps: "Triceps",
  "upper back": "Üst Sırt",
  "upper chest": "Üst Göğüs",
  "wrist extensors": "Bilek Ekstensörleri",
  "wrist flexors": "Bilek Fleksörleri",
  wrists: "Bilekler",
};

export function translateBodyPart(rawName: string | null | undefined): string {
  if (!rawName) return "Genel";
  return BODY_PART_TR[rawName] ?? rawName;
}

export function bodyPartIcon(rawName: string | null | undefined): IconName {
  if (!rawName) return "fitness-outline";
  return BODY_PART_ICON[rawName] ?? "fitness-outline";
}

export function translateEquipment(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  return EQUIPMENT_TR[rawName] ?? rawName;
}

export function translateMuscle(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  return MUSCLE_TR[rawName] ?? rawName;
}

// exercises.level (beginner/intermediate/advanced) şu an veri setinde dolu
// değil (bkz. add_exercise_level_column migration'ı) — null gelirse servis
// de null döner, ekran alanı sadece değer varsa gösterir.
export const LEVEL_TR: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta seviye",
  advanced: "İleri seviye",
};

export function translateLevel(rawLevel: string | null | undefined): string | null {
  if (!rawLevel) return null;
  return LEVEL_TR[rawLevel] ?? rawLevel;
}
