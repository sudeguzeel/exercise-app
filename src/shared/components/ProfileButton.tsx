import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '@/providers/AppThemeContext';

export function ProfileButton() {
  const { colors } = useAppTheme();
  const handlePress = () => {
    router.push('/profile');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.primary, backgroundColor: colors.surface },
        pressed && styles.buttonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Profil sayfasını aç"
      hitSlop={8}
    >
      <Ionicons
        name="person-outline"
        size={24}
        color={colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPressed: {
    opacity: 0.65,
  },
});
