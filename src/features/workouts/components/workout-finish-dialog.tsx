import { useAppTheme } from "@/providers/AppThemeContext";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export function WorkoutFinishDialog({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Antrenmanı bitirmek istediğinize emin misiniz?
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primaryBright },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Hayır</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.errorBackground },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.error }]}>Evet</Text>
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
  dialog: { width: "100%", maxWidth: 340, padding: 22, borderRadius: 28 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: "900", textAlign: "center" },
  actions: { marginTop: 22, flexDirection: "row", gap: 10 },
  button: { flex: 1, minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});
