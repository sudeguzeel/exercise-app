import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
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
            <Ionicons name="close" size={19} color={MainColors.mutedText} />
          </Pressable>
          <View style={styles.iconCircle}>
            <Ionicons name="exit-outline" size={25} color={MainColors.primary} />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
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
    backgroundColor: MainColors.surface,
    shadowColor: "#000000",
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
    backgroundColor: MainColors.paleGreen,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: MainColors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    marginTop: 10,
    color: MainColors.mutedText,
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
    backgroundColor: MainColors.primaryBright,
  },
  exitButton: { backgroundColor: "#FBEAE6" },
  continueText: { color: MainColors.text, fontSize: 14, fontWeight: "800" },
  exitText: { color: "#B65345", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
