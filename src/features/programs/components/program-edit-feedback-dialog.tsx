import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props =
  | {
      mode: "delete";
      visible: boolean;
      programName: string;
      busy: boolean;
      onCancel: () => void;
      onConfirm: () => void;
    }
  | {
      mode: "saved";
      visible: boolean;
    };

export function ProgramEditFeedbackDialog(props: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const deleting = props.mode === "delete";

  return (
    <Modal
      animationType="fade"
      onRequestClose={deleting && !props.busy ? props.onCancel : undefined}
      statusBarTranslucent
      transparent
      visible={props.visible}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={[styles.iconCircle, !deleting && styles.successCircle]}>
            <Ionicons
              color={colors.primary}
              name={deleting ? "trash-outline" : "checkmark"}
              size={27}
            />
          </View>
          <Text style={styles.title}>
            {deleting
              ? "Programı silmek istediğinize emin misiniz?"
              : "Değişiklikler kaydedildi"}
          </Text>
          <Text style={styles.message}>
            {deleting
              ? `“${props.programName || "Bu program"}” kalıcı olarak silinecek.`
              : "Programınız başarıyla güncellendi."}
          </Text>

          {deleting ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={props.busy}
                onPress={props.onCancel}
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelText}>Hayır</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: props.busy, disabled: props.busy }}
                disabled={props.busy}
                onPress={props.onConfirm}
                style={({ pressed }) => [
                  styles.button,
                  styles.deleteButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.deleteText}>
                  {props.busy ? "Siliniyor…" : "Evet"}
                </Text>
              </Pressable>
            </View>
          ) : null}
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
  card: {
    width: "100%",
    maxWidth: 350,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: { backgroundColor: colors.primarySoft },
  title: {
    marginTop: 16,
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    marginTop: 9,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  actions: { width: "100%", marginTop: 22, flexDirection: "row", gap: 10 },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.primaryBright,
  },
  deleteButton: { backgroundColor: colors.errorBackground },
  cancelText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
  deleteText: { color: colors.error, fontSize: 15, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  });
}
