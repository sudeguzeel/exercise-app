import type { ProgramResultGroup } from "@/features/programs/program-domain";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProgramResultModalProps = {
  visible: boolean;
  title: string;
  message: string;
  groups?: ProgramResultGroup[];
  success?: boolean;
  onConfirm: () => void;
};

export function ProgramResultModal({
  visible,
  title,
  message,
  groups = [],
  success = false,
  onConfirm,
}: ProgramResultModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal
      animationType="fade"
      onRequestClose={onConfirm}
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.overlay}>
        <View
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={[styles.icon, success && styles.successIcon]}>
            <Ionicons
              name={success ? "checkmark" : "information-outline"}
              size={30}
              color={colors.primary}
            />
          </View>

          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.message}>
            {message}
          </Text>

          {groups.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.groupContent}
              showsVerticalScrollIndicator={false}
              style={styles.groups}
            >
              {groups.map((group) => (
                <View key={group.title} style={styles.group}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.groupTitle}>
                    {group.title}
                  </Text>
                  {group.programNames.map((programName) => (
                    <Text
                      key={`${group.title}-${programName}`}
                      maxFontSizeMultiplier={1.3}
                      style={styles.programName}
                    >
                      • {programName}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.buttonText}>
              Tamam
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "86%",
    padding: 24,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    backgroundColor: colors.primarySoft,
  },
  title: {
    marginTop: 18,
    color: colors.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    marginTop: 9,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  groups: {
    width: "100%",
    marginTop: 16,
  },
  groupContent: {
    gap: 12,
  },
  group: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  programName: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  button: {
    width: "100%",
    height: 54,
    marginTop: 22,
    borderRadius: 18,
    backgroundColor: colors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: colors.primaryStrong,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  });
}

