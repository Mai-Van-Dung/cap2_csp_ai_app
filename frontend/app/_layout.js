import { Stack } from 'expo-router';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider, useLang } from './context/LanguageContext';

function LanguageToggle() {
  const { lang, toggleLang } = useLang();
  const label = lang === 'vi' ? '🇻🇳 / 🇺🇸' : '🇺🇸 / 🇻🇳';

  return (
    <Pressable style={styles.toggle} onPress={toggleLang}>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#F7F9FC' },
            }}
          />
          <LanguageToggle />
        </View>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  toggle: {
    position: 'absolute',
    top: 18,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleText: { color: '#2563EB', fontWeight: '700', fontSize: 12 },
});
