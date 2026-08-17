import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { loadProfilePersonalInfo } from "@/shared/lib/services/profileService";
import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
};

const PROFILE_IMAGE_STORAGE_KEY = "profile-image-data-uri";
const PROFILE_IMAGE_TRANSFORM_KEY = "profile-image-transform";
const EDITOR_SIZE = 280;
type PhotoTransform = { x: number; y: number; scale: number };
const DEFAULT_TRANSFORM: PhotoTransform = { x: 0, y: 0, scale: 1 };

export default function ProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photoTransform, setPhotoTransform] = useState(DEFAULT_TRANSFORM);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [photoSourceVisible, setPhotoSourceVisible] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [editorTransform, setEditorTransform] = useState(DEFAULT_TRANSFORM);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const pinchOrigin = useRef({ distance: 0, scale: 1 });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.auth.getUser(),
      loadProfilePersonalInfo(),
      AsyncStorage.getItem(PROFILE_IMAGE_STORAGE_KEY),
      AsyncStorage.getItem(PROFILE_IMAGE_TRANSFORM_KEY),
    ]).then(
      ([{ data }, profileResult, storedImage, storedTransform]) => {
        if (!active) return;
        setEmail(data.user?.email ?? "");
        setProfileImage(storedImage);
        if (storedTransform) setPhotoTransform(JSON.parse(storedTransform));
        if (profileResult.success) {
          setFullName(profileResult.personalInfo.fullName);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const displayName = useMemo(
    () => getDisplayName(fullName, email),
    [email, fullName],
  );
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch {
      Alert.alert("Çıkış yapılamadı", "Lütfen tekrar deneyin.");
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      if (globalThis.confirm("Hesabından çıkış yapmak istediğine emin misin?")) void handleSignOut();
      return;
    }
    Alert.alert(
      "Çıkış yap",
      "Hesabından çıkış yapmak istediğine emin misin?",
      [
        { text: "İptal", style: "cancel" },
        { text: "Çıkış yap", style: "destructive", onPress: () => void handleSignOut() },
      ],
    );
  };

  const openWebCamera = async () => {
    const webGlobal = globalThis as typeof globalThis & {
      document?: any;
      navigator?: { mediaDevices?: { getUserMedia: (constraints: object) => Promise<any> } };
    };
    const documentApi = webGlobal.document;
    const mediaDevices = webGlobal.navigator?.mediaDevices;
    if (!documentApi || !mediaDevices) {
      Alert.alert("Kamera açılamadı", "Tarayıcın kamera kullanımını desteklemiyor.");
      return;
    }

    try {
      const stream = await mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const overlay = documentApi.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "99999", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px", background: "rgba(0,0,0,.94)", boxSizing: "border-box",
      });

      const title = documentApi.createElement("div");
      title.textContent = "Fotoğraf çek";
      Object.assign(title.style, { marginBottom: "18px", color: "white", fontSize: "22px", fontWeight: "800" });

      const video = documentApi.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      Object.assign(video.style, {
        width: "min(88vw, 440px)", maxHeight: "65vh", borderRadius: "24px",
        objectFit: "cover", transform: "scaleX(-1)", background: "#111",
      });

      const actions = documentApi.createElement("div");
      Object.assign(actions.style, { display: "flex", gap: "12px", marginTop: "22px" });
      const cancel = documentApi.createElement("button");
      cancel.textContent = "İptal";
      const capture = documentApi.createElement("button");
      capture.textContent = "Fotoğraf çek";
      for (const button of [cancel, capture]) {
        Object.assign(button.style, {
          minWidth: "130px", height: "50px", padding: "0 20px", border: "0",
          borderRadius: "16px", fontSize: "16px", fontWeight: "800", cursor: "pointer",
        });
      }
      Object.assign(cancel.style, { color: "white", background: "#30342f" });
      Object.assign(capture.style, { color: "#101510", background: "#87D900" });

      const closeCamera = () => {
        stream.getTracks().forEach((track: any) => track.stop());
        overlay.remove();
      };
      cancel.onclick = closeCamera;
      capture.onclick = () => {
        if (!video.videoWidth || !video.videoHeight) return;
        const canvas = documentApi.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL("image/jpeg", 0.82);
        closeCamera();
        setEditorImage(image);
        setEditorTransform(DEFAULT_TRANSFORM);
      };

      actions.append(cancel, capture);
      overlay.append(title, video, actions);
      documentApi.body.appendChild(overlay);
      await video.play();
    } catch {
      Alert.alert("Kamera izni gerekli", "Kamerayı açmak için tarayıcıdan kamera izni vermelisin.");
    }
  };

  const selectProfileImage = async (source: "camera" | "gallery") => {
    setPhotoSourceVisible(false);
    try {
      if (Platform.OS === "web" && source === "camera") {
        await openWebCamera();
        return;
      }
      if (Platform.OS !== "web") {
        const permission = source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "İzin gerekli",
            source === "camera"
              ? "Fotoğraf çekebilmek için kamera izni vermelisin."
              : "Fotoğraf seçebilmek için galeri izni vermelisin.",
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: false,
        base64: true,
        quality: 0.7,
      };
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const imageSource = asset.base64
        ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
        : asset.uri;
      setEditorImage(imageSource);
      setEditorTransform(DEFAULT_TRANSFORM);
    } catch {
      Alert.alert("Fotoğraf açılamadı", "Lütfen tekrar deneyin.");
    }
  };

  const editProfileImage = () => {
    setPhotoMenuVisible(false);
    if (!profileImage) return;
    setEditorImage(profileImage);
    setEditorTransform(photoTransform);
  };

  const applyProfileImage = async () => {
    if (!editorImage) return;
    setProfileImage(editorImage);
    setPhotoTransform(editorTransform);
    setEditorImage(null);
    await Promise.all([
      AsyncStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, editorImage),
      AsyncStorage.setItem(PROFILE_IMAGE_TRANSFORM_KEY, JSON.stringify(editorTransform)),
    ]);
  };

  const removeProfileImage = () => {
    setPhotoMenuVisible(false);
    setRemoveConfirmVisible(true);
  };

  const confirmRemoveProfileImage = async () => {
    setProfileImage(null);
    setPhotoTransform(DEFAULT_TRANSFORM);
    setRemoveConfirmVisible(false);
    await AsyncStorage.multiRemove([PROFILE_IMAGE_STORAGE_KEY, PROFILE_IMAGE_TRANSFORM_KEY]);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      dragOrigin.current = { x: editorTransform.x, y: editorTransform.y };
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) pinchOrigin.current = { distance: touchDistance(touches), scale: editorTransform.scale };
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = touchDistance(touches);
        if (!pinchOrigin.current.distance) pinchOrigin.current = { distance, scale: editorTransform.scale };
        const scale = clamp(pinchOrigin.current.scale * (distance / pinchOrigin.current.distance), 1, 3);
        setEditorTransform((current) => clampTransform({ ...current, scale }));
        return;
      }
      setEditorTransform((current) => clampTransform({ ...current, x: dragOrigin.current.x + gesture.dx, y: dragOrigin.current.y + gesture.dy }));
    },
    onPanResponderRelease: () => { pinchOrigin.current.distance = 0; },
    onPanResponderTerminate: () => { pinchOrigin.current.distance = 0; },
  }), [editorTransform.x, editorTransform.y, editorTransform.scale]);

  const handlePhotoWheel = (event: any) => {
    event.preventDefault?.();
    const direction = event.deltaY < 0 ? 0.08 : -0.08;
    setEditorTransform((current) => clampTransform({ ...current, scale: clamp(current.scale + direction, 1, 3) }));
  };

  const showComingSoon = (title: string) =>
    Alert.alert(title, "Bu bölüm yakında kullanıma açılacak.");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityRow}>
          <View style={styles.identityLeft}>
            <Pressable
              accessibilityHint="Profil fotoğrafı seçmenizi sağlar"
              accessibilityLabel="Profil fotoğrafını değiştir"
              accessibilityRole="button"
              onPress={() => setPhotoMenuVisible(true)}
              style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
            >
              <View style={styles.avatarClip}>
              {profileImage ? (
  <Image
    source={{ uri: profileImage }}
    resizeMode="cover"
    style={[
      styles.avatarImage,
      {
        transform: [
          { translateX: photoTransform.x * (82 / EDITOR_SIZE) },
          { translateY: photoTransform.y * (82 / EDITOR_SIZE) },
          { scale: photoTransform.scale },
        ],
      },
    ]}
  />
) : (
  <Image
  source={
    isDark
      ? require("../../../assets/images/fitrehber_dark_profil_icon_sn.png")
      : require("../../../assets/images/fitrehber_light_profil_icon_sn_1.png")
  }
  resizeMode="contain"
  style={styles.defaultAvatarImage}
/>
)}
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={colors.onPrimary} />
              </View>
            </Pressable>
            <View style={styles.identityText}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email} numberOfLines={1}>
                {email || "E-posta bilgisi bulunamadı"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(main)/profile-personal-info")}
                style={({ pressed }) => [styles.editProfileButton, pressed && styles.pressed]}
              >
                <Text style={styles.editProfileText}>Profili düzenle</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Geri dön"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </View>

        <SectionLabel>HESAP</SectionLabel>
        <View style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label="Kişisel bilgilerim"
            onPress={() => router.push("/(main)/profile-personal-info")}
          />
          <MenuItem
            icon="flag-outline"
            label="Hedeflerim"
            onPress={() => router.push({ pathname: "/(main)/profile-personal-info", params: { section: "goals" } })}
          />
          <MenuItem
            icon="notifications-outline"
            label="Bildirimler"
            isLast
            onPress={() => router.push("/(main)/profile-notifications")}
          />
        </View>

        <SectionLabel>UYGULAMA</SectionLabel>
        <View style={styles.menuCard}>
          <MenuItem
            icon="language-outline"
            label="Dil"
            value="Türkçe"
            onPress={() => router.push("/(main)/profile-language")}
          />
          <MenuItem
            icon="moon-outline"
            label="Görünüm"
            value="Koyu tema"
            onPress={() => router.push("/(main)/profile-app-settings")}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Gizlilik ve güvenlik"
            isLast
            onPress={() => router.push("/(main)/profile-privacy")}
          />
        </View>

        <SectionLabel>DESTEK</SectionLabel>
        <View style={styles.menuCard}>
          <MenuItem
            icon="help-circle-outline"
            label="Yardım ve sık sorulan sorular"
            onPress={() => showComingSoon("Yardım ve sık sorulan sorular")}
          />
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="Geri bildirim gönder"
            onPress={() => void Linking.openURL("mailto:destek@exerciseapp.com?subject=Exercise%20App%20Geri%20Bildirim")}
          />
          <MenuItem
            icon="information-circle-outline"
            label="Uygulama hakkında"
            isLast
            onPress={() => Alert.alert("Exercise App", "Sürüm 1.0.0")}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={confirmSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.pressed,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={21} color={colors.error} />
              <Text style={styles.signOutText}>Çıkış yap</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <Modal transparent animationType="fade" visible={photoMenuVisible} onRequestClose={() => setPhotoMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPhotoMenuVisible(false)}>
          <View style={styles.photoMenu}>
            <Text style={styles.photoMenuTitle}>Profil fotoğrafı</Text>
            <PhotoAction icon="images-outline" label="Yeni fotoğraf seç" onPress={() => { setPhotoMenuVisible(false); setPhotoSourceVisible(true); }} />
            {profileImage ? <PhotoAction icon="crop-outline" label="Fotoğrafı düzenle" onPress={editProfileImage} /> : null}
            {profileImage ? <PhotoAction danger icon="trash-outline" label="Fotoğrafı kaldır" onPress={removeProfileImage} /> : null}
            <Pressable onPress={() => setPhotoMenuVisible(false)} style={styles.menuCancel}><Text style={styles.menuCancelText}>İptal</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={photoSourceVisible} onRequestClose={() => setPhotoSourceVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPhotoSourceVisible(false)}>
          <View style={styles.photoMenu}>
            <Text style={styles.photoMenuTitle}>Fotoğraf ekle</Text>
            <PhotoAction icon="camera-outline" label="Kamera" onPress={() => void selectProfileImage("camera")} />
            <PhotoAction icon="images-outline" label="Fotoğraflar" onPress={() => void selectProfileImage("gallery")} />
            <Pressable onPress={() => setPhotoSourceVisible(false)} style={styles.menuCancel}><Text style={styles.menuCancelText}>İptal</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={removeConfirmVisible} onRequestClose={() => setRemoveConfirmVisible(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}><Ionicons name="trash-outline" size={26} color={colors.error} /></View>
            <Text style={styles.confirmTitle}>Fotoğrafı kaldır</Text>
            <Text style={styles.confirmText}>Profil fotoğrafını kaldırmak istediğine emin misin?</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setRemoveConfirmVisible(false)} style={styles.confirmCancel}><Text style={styles.confirmCancelText}>İptal</Text></Pressable>
              <Pressable onPress={() => void confirmRemoveProfileImage()} style={styles.confirmRemove}><Text style={styles.confirmRemoveText}>Kaldır</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" visible={editorImage !== null} onRequestClose={() => setEditorImage(null)}>
        <SafeAreaView style={styles.editorSafeArea}>
          <View style={styles.editorHeader}>
            <Pressable onPress={() => setEditorImage(null)}><Text style={styles.editorCancel}>İptal</Text></Pressable>
            <Text style={styles.editorTitle}>Fotoğrafı düzenle</Text>
            <View style={styles.editorSpacer} />
          </View>
          <View style={styles.editorContent}>
            <View style={styles.cropCircle} {...panResponder.panHandlers} {...({ onWheel: handlePhotoWheel } as any)}>
              {editorImage ? <Image source={{ uri: editorImage }} resizeMode="cover" style={[styles.cropImage, { transform: [{ translateX: editorTransform.x }, { translateY: editorTransform.y }, { scale: editorTransform.scale }] }]} /> : null}
            </View>
          </View>
          <Pressable onPress={() => void applyProfileImage()} style={styles.applyButton}><Text style={styles.applyText}>Uygula</Text></Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoAction({ icon, label, danger = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Pressable onPress={onPress} style={styles.photoAction}><Ionicons name={icon} size={21} color={danger ? colors.error : colors.primary} /><Text style={[styles.photoActionText, danger && { color: colors.error }]}>{label}</Text></Pressable>;
}

function MenuItem({
  icon,
  label,
  value,
  isLast = false,
  onPress,
}: MenuItemProps & { isLast?: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !isLast && styles.menuRowBorder,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function getDisplayName(fullName: string, email: string) {
  const normalizedName = fullName.trim();
  if (normalizedName) return normalizedName;
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) return "Kullanıcı";
  const words = localPart.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return "Kullanıcı";
  return words
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase(
      "tr-TR",
    );
  }
  return name.slice(0, 2).toLocaleUpperCase("tr-TR");
}

function touchDistance(touches: readonly { pageX: number; pageY: number }[]) {
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampTransform(transform: PhotoTransform): PhotoTransform {
  const limit = (EDITOR_SIZE * (transform.scale - 1)) / 2;
  return {
    scale: transform.scale,
    x: clamp(transform.x, -limit, limit),
    y: clamp(transform.y, -limit, limit),
  };
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 28 },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  identityLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  backButton: {
    width: 48,
    height: 48,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  avatarClip: { width: 82, height: 82, overflow: "hidden", borderRadius: 41, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontSize: 27, fontWeight: "900" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 41 },
  defaultAvatarImage: {
  width: 76,
  height: 76,
  borderRadius: 38,
},
  cameraBadge: {
    position: "absolute", right: -1, bottom: 1, width: 26, height: 26,
    borderRadius: 13, borderWidth: 2, borderColor: colors.background,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  identityText: { flex: 1, marginLeft: 18 },
  name: { color: colors.text, fontSize: 20, fontWeight: "800" },
  email: { marginTop: 5, color: colors.textSecondary, fontSize: 15 },
  editProfileButton: {
    alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 13, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.primary, borderRadius: 12,
  },
  editProfileText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 10,
    marginLeft: 2,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  menuCard: {
    marginBottom: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  menuRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  menuLabel: { flex: 1, marginLeft: 14, color: colors.text, fontSize: 16 },
  menuValue: { marginRight: 12, color: colors.textSecondary, fontSize: 14 },
  signOutButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 20,
    backgroundColor: colors.errorBackground,
  },
  signOutText: { marginLeft: 14, color: colors.error, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.65 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", padding: 18, backgroundColor: colors.overlay },
  photoMenu: { padding: 18, borderRadius: 22, backgroundColor: colors.surface },
  photoMenuTitle: { marginBottom: 10, color: colors.text, fontSize: 18, fontWeight: "900" },
  photoAction: { minHeight: 54, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  photoActionText: { marginLeft: 13, color: colors.text, fontSize: 16, fontWeight: "600" },
  menuCancel: { height: 48, marginTop: 12, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.surfaceElevated },
  menuCancelText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  confirmBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.overlay },
  confirmCard: { width: "100%", maxWidth: 380, alignItems: "center", padding: 24, borderRadius: 22, backgroundColor: colors.surface },
  confirmIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 27, backgroundColor: colors.errorBackground },
  confirmTitle: { marginTop: 14, color: colors.text, fontSize: 20, fontWeight: "900" },
  confirmText: { marginTop: 8, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center" },
  confirmActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 22 },
  confirmCancel: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 15 },
  confirmCancelText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  confirmRemove: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.error },
  confirmRemoveText: { color: colors.inverseText, fontSize: 15, fontWeight: "900" },
  editorSafeArea: { flex: 1, backgroundColor: colors.background },
  editorHeader: { height: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  editorCancel: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  editorTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  editorSpacer: { width: 42 },
  editorContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  cropCircle: { width: EDITOR_SIZE, height: EDITOR_SIZE, overflow: "hidden", borderRadius: EDITOR_SIZE / 2, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  cropImage: { width: EDITOR_SIZE, height: EDITOR_SIZE },
  applyButton: { height: 56, margin: 20, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.primary },
  applyText: { color: colors.onPrimary, fontSize: 17, fontWeight: "900" },
});
