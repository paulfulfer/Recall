import { Stack } from 'expo-router';

import { useBirthdayNotifications } from '@/hooks/use-birthday-notifications';
import { useAuth } from '@/providers/auth-provider';

// Tabs live in their own nested group (app)/(tabs) so a pushed screen like person/[id] can
// sit on top of the tab bar instead of becoming a tab itself.
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null;
  return <AuthedAppLayout uid={user.uid} />;
}

function AuthedAppLayout({ uid }: { uid: string }) {
  // Runs for the lifetime of the authenticated app shell, not just the Home screen, so a
  // birthday added while on People/Unfiled/Search still gets rescheduled immediately.
  useBirthdayNotifications(uid);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="person/[id]/index" />
      <Stack.Screen name="person/[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="person/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="capture/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
