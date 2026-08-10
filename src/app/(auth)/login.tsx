import { getAuthCallbackParameters } from "@/shared/lib/authCallbackUrl";
import { PasswordVisibilityButton } from "@/shared/components/password-visibility-button";
import { supabase } from "@/shared/lib/supabase";
import { isValidEmail } from "@/shared/lib/validation/authValidation";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from 'expo-auth-session';
import { router } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Web'de Google girişi tam sayfa yönlendirmesiyle çalışıyor (bkz.
  // handleGoogleLogin'deki web dalı): Google'dan dönüşte tarayıcı bu sayfaya
  // (`redirectTo` = ".../login") token'ları URL fragment'ında taşıyarak geri
  // geliyor (`#access_token=...&refresh_token=...`). `detectSessionInUrl`
  // kapalı olduğu için (bkz. supabase.ts) bunu burada elle işlememiz
  // gerekiyor — aksi halde kullanıcı hesabı seçtikten sonra login
  // ekranına döner ama hiçbir zaman oturum açılmış olmaz.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const parameters = getAuthCallbackParameters(window.location.href);
    const accessToken = parameters.get("access_token");
    const refreshToken = parameters.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) throw sessionError;

        // Token'ları URL'den temizle — sayfa yenilendiğinde ya da geri
        // gidildiğinde aynı token'lar tekrar işlenmeye çalışılmasın.
        window.history.replaceState(null, "", window.location.pathname);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Oturum oluşturulamadı.");
        }

        if (cancelled) return;

        const onboardingCompleted =
          sessionData.session.user.user_metadata?.onboarding_completed === true;

        router.replace(
          onboardingCompleted ? "/(main)" : "/onboarding/personal-info",
        );
      } catch (error: any) {
        if (!cancelled) {
          Alert.alert(
            "Google Giriş Hatası",
            error?.message ?? "Oturum tamamlanamadı.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece mount'ta bir kez çalışmalı
  }, []);

  const validateForm = () => {
    let isValid = true;

    setEmailError("");
    setPasswordError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("E-posta alanı boş bırakılamaz.");
      isValid = false;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError("Geçerli bir e-posta adresi gir.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Şifre alanı boş bırakılamaz.");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    setAuthError("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.code === "invalid_credentials") {
          setAuthError("E-posta veya şifre hatalı.");
        } else if (error.name === "AuthRetryableFetchError") {
          Alert.alert(
            "Bağlantı hatası",
            "İnternet bağlantını kontrol edip tekrar dene.",
          );
        } else {
          Alert.alert(
            "Giriş yapılamadı",
            "Şu anda giriş yapılamıyor. Lütfen daha sonra tekrar dene.",
          );
        }
        return;
      }

      if (!data.session) {
        Alert.alert(
          "Giriş yapılamadı",
          "Şu anda giriş yapılamıyor. Lütfen daha sonra tekrar dene.",
        );
        return;
      }

      const onboardingCompleted =
        data.session.user.user_metadata?.onboarding_completed === true;

      router.replace(
        onboardingCompleted ? "/(main)" : "/onboarding/personal-info",
      );
    } catch {
      Alert.alert("Bir hata oluştu", "Bağlantını kontrol edip tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

const handleGoogleLogin = async () => {
  try {
    setLoading(true);

    // Giriş başarılı olduktan sonra uygulamanın geri döneceği adres.
    // `scheme` bilerek verilmiyor: Expo Go'da app.json'daki özel scheme
    // ("exercise-app") hiçbir zaman çalışmaz (Expo Go sadece kendi "exp://"
    // şemasını tanır) — scheme'i sabitlersek Expo Go bunu sessizce görmezden
    // gelip ne döndüreceği belirsizleşiyordu. Scheme'i boş bırakınca Expo
    // Go'da otomatik "exp://<ip>:<port>/--/login", dev-client/production
    // build'de ise app.json'daki "exercise-app://login" üretilir.
    const redirectTo = AuthSession.makeRedirectUri({ path: 'login' });

    // Bu adresi Supabase'in "Redirect URLs" listesine eklemen gerekiyor.
    // Metro terminalinde/browser konsolunda bu satırı arayıp tam adresi
    // görebilirsin.
    console.log('[Google OAuth] redirectTo:', redirectTo);

    if (Platform.OS === 'web') {
      // Web'de WebBrowser.openAuthSessionAsync (popup + polling) güvenilir
      // çalışmıyor — Google hesap seçiminden sonra pencere hiç kapanmadan
      // asılı kalabiliyor. Bunun yerine tam sayfa yönlendirmesi kullanılıyor;
      // `skipBrowserRedirect` verilmediğinde supabase-js web'de otomatik
      // olarak `window.location`'ı Google'a yönlendirir. Dönüşü yukarıdaki
      // useEffect (URL fragment'ından token okuyup setSession çağıran) ele
      // alıyor.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (error) throw error;
      // Tarayıcı burada Google'a yönlendiği için fonksiyon devam etmeyecek;
      // finally bloğu loading'i kapatmaya çalışsa da sayfa zaten ayrılıyor.
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      // Google oturum açma sayfasını mobil tarayıcıda açar
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // supabase.ts içinde detectSessionInUrl kapalı (web SSR'ı çökertmemek
        // için) ve React Native'de zaten otomatik URL algılama çalışmıyor;
        // bu yüzden tarayıcıdan dönen token'ları burada elle okuyup session
        // kurmamız gerekiyor. Proje flowType:"implicit" kullandığı için
        // token'lar `?code=` değil `#access_token=&refresh_token=` şeklinde
        // geliyor — önceden burada code exchange deneniyordu, hiç eşleşmediği
        // için Google ile girişte session hiç kurulmuyordu.
        const parameters = getAuthCallbackParameters(result.url);
        const accessToken = parameters.get('access_token');
        const refreshToken = parameters.get('refresh_token');

        if (!accessToken || !refreshToken) {
          throw new Error('Google girişinden geçerli bir oturum bilgisi alınamadı.');
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) throw sessionError;

        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          throw new Error('Oturum oluşturulamadı.');
        }

        const onboardingCompleted =
          sessionData.session.user.user_metadata?.onboarding_completed === true;

        router.replace(onboardingCompleted ? '/(main)' : '/onboarding/personal-info');
      }
    }
  } catch (error: any) {
    Alert.alert('Google Giriş Hatası', error.message);
  } finally {
    setLoading(false);
  }
};

  const handleAppleLogin = () => {
    Alert.alert(
      "Apple ile giriş",
      "Apple giriş entegrasyonu ilgili görev tamamlandığında bağlanacak.",
    );
  };

  const handleRegister = () => {
    router.push("/register");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.title}>Hoş geldin</Text>

            <Text style={styles.subtitle}>
              Programına devam etmek için giriş yap.
            </Text>

            <Text style={styles.label}>E-POSTA</Text>

            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="mail-outline" size={19} color="#6C716C" />

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setAuthError("");

                  if (emailError) {
                    setEmailError("");
                  }
                }}
                placeholder="ornek@eposta.com"
                placeholderTextColor="#9A9E99"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            <Text style={styles.label}>ŞİFRE</Text>

            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={19} color="#6C716C" />

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setAuthError("");

                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor="#9A9E99"
                secureTextEntry={!isPasswordVisible}
                editable={!loading}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <PasswordVisibilityButton
                disabled={loading}
                onPress={() => setIsPasswordVisible((current) => !current)}
                visible={isPasswordVisible}
              />
            </View>

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            {authError ? (
              <Text accessibilityRole="alert" style={styles.authErrorText}>
                {authError}
              </Text>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#101214" />
              ) : (
                <Text style={styles.loginButtonText}>Giriş yap</Text>
              )}
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>VEYA</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                disabled={loading}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed ? styles.socialButtonPressed : null,
                ]}
              >
                <Text style={styles.googleLetter}>G</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </Pressable>

              <Pressable
                disabled={loading}
                onPress={handleAppleLogin}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed ? styles.socialButtonPressed : null,
                ]}
              >
                <Ionicons name="logo-apple" size={19} color="#14171A" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerQuestion}>Hesabın yok mu? </Text>

              <Pressable disabled={loading} onPress={handleRegister}>
                <Text style={styles.registerLink}>Kayıt ol</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    color: "#14171A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 24,
    color: "#6C716C",
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    marginTop: 15,
    marginBottom: 7,
    color: "#6C716C",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  inputContainerError: {
    borderColor: "#FF5A5A",
    backgroundColor: "rgba(255, 90, 90, 0.06)",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    color: "#14171A",
    fontSize: 15,
  },
  errorText: {
    marginTop: 6,
    marginHorizontal: 2,
    color: "#FF5A5A",
    fontSize: 12,
  },
  authErrorText: {
    marginTop: 8,
    marginHorizontal: 2,
    color: "#D14343",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 11,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: "#74A800",
    fontSize: 13,
    fontWeight: "700",
  },
  loginButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 21,
    borderRadius: 16,
    backgroundColor: "#95D600",
    shadowColor: "#95D600",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#101214",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 21,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(116, 168, 0, 0.35)",
  },
  dividerText: {
    marginHorizontal: 11,
    color: "#6C716C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  socialButtonPressed: {
    backgroundColor: "#EFF1EA",
  },
  socialButtonText: {
    color: "#14171A",
    fontSize: 13,
    fontWeight: "700",
  },
  googleLetter: {
    color: "#4285F4",
    fontSize: 17,
    fontWeight: "900",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  registerQuestion: {
    color: "#6C716C",
    fontSize: 13,
  },
  registerLink: {
    color: "#74A800",
    fontSize: 13,
    fontWeight: "800",
  },
});
