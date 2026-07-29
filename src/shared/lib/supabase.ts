import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

<<<<<<< HEAD:lib/supabase.ts
// expo-router web static output sayfaları Node.js üzerinde SSR ile
// önceden render eder; orada `window` bulunmadığından Supabase'in
// AsyncStorage'dan oturum okuma denemesi tüm server process'ini
// çökertiyordu (uncaught "window is not defined").
const isBrowserOrNative = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowserOrNative ? AsyncStorage : undefined,
    autoRefreshToken: isBrowserOrNative,
    persistSession: isBrowserOrNative,
    detectSessionInUrl: false,
  },
=======
const isBrowserOrNative = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: isBrowserOrNative ? AsyncStorage : undefined,
        autoRefreshToken: isBrowserOrNative,
        persistSession: isBrowserOrNative,
        detectSessionInUrl: false,
    },
>>>>>>> origin/onboarding-flow:src/shared/lib/supabase.ts
});
