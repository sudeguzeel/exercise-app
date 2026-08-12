import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export function WorkoutExitDialog({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View
          accessibilityLabel="Antrenmandan çıkış onayı"
          accessibilityViewIsModal
          style={styles.dialog}
        >
          <Pressable
            accessibilityLabel="Pencereyi kapat ve antrenmana devam et"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="close" size={19} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.iconCircle}>
            <Ionicons name="exit-outline" size={25} color={colors.primary} />
          </View>
          <Text style={styles.title}>Antrenmanı bırakmak mı istiyorsun?</Text>
          <Text style={styles.description}>
            Tamamladığın setler korunacak, ancak bu antrenman tamamlandı olarak
            işaretlenmeyecek.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.continueButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.continueText}>Antrenmana Devam Et</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.exitButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.exitText}>Antrenmandan Çık</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 13,
    right: 13,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 52,
    height: 52,
    marginBottom: 15,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  actions: { marginTop: 22, gap: 8 },
  button: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButton: {
    backgroundColor: colors.primaryBright,
  },
  exitButton: { backgroundColor: colors.errorBackground },
  continueText: { color: colors.onPrimary, fontSize: 14, fontWeight: "800" },
  exitText: { color: colors.error, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  });
}
