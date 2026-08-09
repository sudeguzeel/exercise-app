import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type DataErrorStateProps = {
  variant: "offline" | "service";
  description?: string;
  errorCode?: string;
  onRetry: () => void;
  onSecondaryAction?: () => void;
  secondaryActionDisabled?: boolean;
  retrying?: boolean;
  presentation?: "fullscreen" | "inline";
};

const COPY = {
  offline: {
    title: "Bağlantı yok",
    description: "İnternet bağlantını kontrol et ve yeniden dene.",
    primary: "Tekrar dene",
  },
  service: {
    title: "Bir şeyler ters gitti",
    description:
      "Bilgiler şu anda yüklenemiyor. Bu geçici bir servis hatası olabilir. Birkaç saniye sonra yeniden dene.",
    primary: "Yeniden dene",
    secondary: "Ana sayfaya dön",
  },
} as const;

export function DataErrorState({
  variant,
  description,
  errorCode,
  onRetry,
  onSecondaryAction,
  secondaryActionDisabled = false,
  retrying = false,
  presentation = "fullscreen",
}: DataErrorStateProps) {
  const copy = COPY[variant];
  const isService = variant === "service";

  return (
    <View
      style={[
        styles.container,
        presentation === "inline" ? styles.inline : styles.fullscreen,
      ]}
    >
      <View style={[styles.iconBox, isService ? styles.serviceIconBox : styles.offlineIconBox]}>
        <Ionicons
          name={isService ? "warning-outline" : "cloud-offline-outline"}
          size={44}
          color={isService ? "#FF5A5F" : "#747B74"}
        />
      </View>

      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.description}>{description ?? copy.description}</Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !retrying && styles.pressed,
          ]}
        >
          {retrying ? (
            <ActivityIndicator color={MainColors.text} />
          ) : (
            <Text style={styles.primaryText}>{copy.primary}</Text>
          )}
        </Pressable>

        {isService ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: secondaryActionDisabled }}
            disabled={secondaryActionDisabled || !onSecondaryAction}
            onPress={onSecondaryAction}
            style={({ pressed }) => [
              styles.secondaryButton,
              secondaryActionDisabled && styles.secondaryButtonDisabled,
              pressed && !secondaryActionDisabled && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.secondaryText,
                secondaryActionDisabled && styles.secondaryTextDisabled,
              ]}
            >
              {COPY.service.secondary}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isService && errorCode ? (
        <Text style={styles.errorCode}>Hata kodu: {errorCode}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MainColors.background,
  },
  fullscreen: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  inline: {
    minHeight: 360,
    paddingHorizontal: 22,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: MainColors.subtleBorder,
    borderRadius: 28,
  },
  iconBox: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconBox: { backgroundColor: "#FBE7E4" },
  offlineIconBox: { backgroundColor: "#F0F2EC" },
  title: {
    marginTop: 28,
    color: MainColors.text,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    maxWidth: 430,
    marginTop: 14,
    color: MainColors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  actions: { width: "100%", maxWidth: 440, marginTop: 32, gap: 12 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: MainColors.text, fontSize: 17, fontWeight: "900" },
  secondaryButton: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonDisabled: { opacity: 0.45 },
  secondaryText: { color: MainColors.text, fontSize: 16, fontWeight: "800" },
  secondaryTextDisabled: { color: MainColors.mutedText },
  errorCode: { marginTop: 12, color: MainColors.mutedText, fontSize: 13 },
  pressed: { opacity: 0.72 },
});
