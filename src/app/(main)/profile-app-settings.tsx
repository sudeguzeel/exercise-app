import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors, AppThemeMode } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ProfileAppSettingsScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header colors={colors} styles={styles} title="Uygulama Ayarları" />

        <View style={styles.intro}>
          <View style={styles.iconCircle}>
            <Ionicons name="settings-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.introText}>
            Uygulama deneyimini kendi tercihlerine göre özelleştir.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Tema</Text>
          <View style={styles.segment}>
            <Option
              mode="light"
              selected={mode === "light"}
              setMode={setMode}
              styles={styles}
              text="Açık"
            />
            <Option
              mode="dark"
              selected={mode === "dark"}
              setMode={setMode}
              styles={styles}
              text="Koyu"
            />
          </View>
        </View>

        <Text style={styles.note}>
          Tema tercihin bu cihazda saklanır ve sonraki açılışta yeniden uygulanır.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Option({
  mode,
  selected,
  setMode,
  styles,
  text,
}: {
  mode: AppThemeMode;
  selected: boolean;
  setMode: (mode: AppThemeMode) => void;
  styles: Styles;
  text: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => setMode(mode)}
      style={[styles.option, selected && styles.selected]}
    >
      <Text style={[styles.optionText, selected && styles.selectedText]}>
        {text}
      </Text>
    </Pressable>
  );
}

function Header({
  colors,
  styles,
  title,
}: {
  colors: AppThemeColors;
  styles: Styles;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Profile dön"
        accessibilityRole="button"
        onPress={() => router.replace("/(main)/profile")}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingTop: 14, paddingBottom: 30 },
    header: {
      marginBottom: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    back: {
      width: 38,
      height: 38,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
    headerSpacer: { width: 38 },
    intro: {
      marginBottom: 28,
      flexDirection: "row",
      alignItems: "center",
    },
    iconCircle: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    introText: {
      flex: 1,
      marginLeft: 17,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    card: {
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    label: { marginBottom: 10, color: colors.text, fontSize: 13 },
    segment: {
      height: 42,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      flexDirection: "row",
      overflow: "hidden",
    },
    option: { flex: 1, alignItems: "center", justifyContent: "center" },
    selected: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 9,
      backgroundColor: colors.primarySoft,
    },
    optionText: { color: colors.textSecondary, fontSize: 13 },
    selectedText: { color: colors.text, fontWeight: "700" },
    note: {
      marginTop: 14,
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: "center",
    },
  });
}
