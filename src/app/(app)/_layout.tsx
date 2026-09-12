import { Stack } from 'expo-router';

// Tabs live in their own nested group (app)/(tabs) so a pushed screen like person/[id] can
// sit on top of the tab bar instead of becoming a tab itself.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="person/[id]" />
    </Stack>
  );
}
