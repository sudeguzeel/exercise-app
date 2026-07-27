import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// expo-router'ın web static output'u sayfaları Node.js üzerinde SSR ile
// önceden render eder; orada `window` bulunmadığından Supabase'in
// AsyncStorage'dan oturum okuma/başlatma denemesi tüm server process'ini
// çökertiyordu (uncaught "window is not defined"). Bu yüzden storage'ı ve
// otomatik oturum davranışlarını yalnızca gerçek bir tarayıcı/native
// ortamda etkinleştiriyoruz.
const isBrowserOrNative = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowserOrNative ? AsyncStorage : undefined,
    autoRefreshToken: isBrowserOrNative,
    persistSession: isBrowserOrNative,
    detectSessionInUrl: false,
  },
});
