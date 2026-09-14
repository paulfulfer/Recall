import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  useFonts,
} from '@expo-google-fonts/lora';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ThemeProvider as RecallThemeProvider, useAppTheme } from '@/providers/theme-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
  });

  return (
    <AuthProvider>
      <RecallThemeProvider>
        <RootLayoutNav fontsLoaded={fontsLoaded} />
      </RecallThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const { user, initializing } = useAuth();
  const { mode } = useAppTheme();
  const ready = fontsLoaded && !initializing;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Recall's own theme toggle (mode) drives this, not the device color scheme —
          the app defaults to dark regardless of system setting (spec section 7). */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
