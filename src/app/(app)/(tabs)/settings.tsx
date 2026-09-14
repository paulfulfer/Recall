import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LORA, type ThemeTokens } from '@/constants/theme';
import { deleteAllUserData } from '@/lib/account';
import { ensureNotificationPermission } from '@/lib/notifications';
import { subscribeToPreferences, updatePreferences } from '@/lib/preferences';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';

type PermissionState = 'granted' | 'blocked' | 'unasked';

const LEAD_OPTIONS = [3, 7, 14];

// Spec section 5 screen 9: sign out, theme toggle, notification lead-time preference,
// location/calendar permission management, delete account.
export default function SettingsScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <Settings uid={user.uid} email={user.email} />;
}

function Settings({ uid, email }: { uid: string; email: string | null }) {
  const { tokens, mode, setMode } = useAppTheme();
  const { signOut, deleteAccount, reauthenticate } = useAuth();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [leadDays, setLeadDays] = useState(7);
  const [notifStatus, setNotifStatus] = useState<PermissionState>('unasked');
  const [locationStatus, setLocationStatus] = useState<PermissionState>('unasked');
  const [calendarStatus, setCalendarStatus] = useState<PermissionState>('unasked');

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => subscribeToPreferences(uid, (prefs) => setLeadDays(prefs.notificationLeadDays)), [uid]);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((r) =>
      setLocationStatus(r.granted ? 'granted' : r.canAskAgain ? 'unasked' : 'blocked'),
    );
    Calendar.getCalendarPermissions().then((r) =>
      setCalendarStatus(r.granted ? 'granted' : r.canAskAgain ? 'unasked' : 'blocked'),
    );
  }, []);

  async function refreshNotifStatus() {
    const granted = await ensureNotificationPermission();
    setNotifStatus(granted ? 'granted' : 'blocked');
  }

  async function requestLocation() {
    const r = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(r.granted ? 'granted' : r.canAskAgain ? 'unasked' : 'blocked');
  }

  async function requestCalendar() {
    const r = await Calendar.requestCalendarPermissions();
    setCalendarStatus(r.granted ? 'granted' : r.canAskAgain ? 'unasked' : 'blocked');
  }

  async function runDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAllUserData(uid);
      await deleteAccount();
      // onAuthStateChanged drops us back to the sign-in screen automatically.
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'auth/requires-recent-login') {
        setNeedsReauth(true);
      } else {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.');
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleReauthAndDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await reauthenticate(password);
      setNeedsReauth(false);
      setPassword('');
      await runDelete();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Incorrect password.');
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.email}>{email}</Text>
          <Pressable onPress={() => signOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Appearance</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setMode('dark')}
              style={[styles.chip, mode === 'dark' && styles.chipActive]}>
              <Text style={[styles.chipText, mode === 'dark' && styles.chipTextActive]}>Dark</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('light')}
              style={[styles.chip, mode === 'light' && styles.chipActive]}>
              <Text style={[styles.chipText, mode === 'light' && styles.chipTextActive]}>Light</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Birthday notifications</Text>
          <Text style={styles.helper}>Remind me this many days before a birthday</Text>
          <View style={styles.chipRow}>
            {LEAD_OPTIONS.map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  setLeadDays(n);
                  updatePreferences(uid, { notificationLeadDays: n });
                }}
                style={[styles.chip, leadDays === n && styles.chipActive]}>
                <Text style={[styles.chipText, leadDays === n && styles.chipTextActive]}>{n} days</Text>
              </Pressable>
            ))}
          </View>
          <PermissionRow
            label="Notifications"
            status={notifStatus}
            onRequest={refreshNotifStatus}
            styles={styles}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Permissions</Text>
          <PermissionRow label="Location" status={locationStatus} onRequest={requestLocation} styles={styles} />
          <PermissionRow label="Calendar" status={calendarStatus} onRequest={requestCalendar} styles={styles} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Danger zone</Text>
          {!confirmingDelete ? (
            <Pressable onPress={() => setConfirmingDelete(true)} style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>Delete account</Text>
            </Pressable>
          ) : (
            <View style={styles.dangerConfirm}>
              <Text style={styles.helper}>
                This permanently deletes every person, capture, and photo you&apos;ve saved. This
                cannot be undone.
              </Text>

              {needsReauth && (
                <>
                  <Text style={styles.label}>Confirm your password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor={tokens.textTertiary}
                    style={styles.input}
                  />
                </>
              )}

              {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}

              <View style={styles.chipRow}>
                <Pressable
                  onPress={needsReauth ? handleReauthAndDelete : runDelete}
                  disabled={deleting}
                  style={[styles.dangerButton, deleting && styles.disabled]}>
                  <Text style={styles.dangerButtonText}>
                    {deleting ? 'Deleting…' : 'Yes, delete everything'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setConfirmingDelete(false);
                    setNeedsReauth(false);
                    setDeleteError(null);
                    setPassword('');
                  }}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({
  label,
  status,
  onRequest,
  styles,
}: {
  label: string;
  status: PermissionState;
  onRequest: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const actionLabel = status === 'granted' ? 'Granted' : status === 'blocked' ? 'Open Settings' : 'Request access';
  return (
    <View style={styles.permissionRow}>
      <Text style={styles.permissionLabel}>{label}</Text>
      <Pressable
        onPress={status === 'blocked' ? () => Linking.openSettings() : onRequest}
        disabled={status === 'granted'}>
        <Text style={[styles.permissionAction, status === 'granted' && styles.permissionActionMuted]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary, marginBottom: 4 },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 10 },
    label: {
      fontFamily: LORA.semiBold,
      fontSize: 11,
      letterSpacing: 0.44,
      textTransform: 'uppercase',
      color: t.textTertiary,
    },
    helper: { fontFamily: LORA.regular, fontSize: 13, lineHeight: 19, color: t.textSecondary },
    email: { fontFamily: LORA.regular, fontSize: 14, color: t.textPrimary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActive: { backgroundColor: t.pillPrimaryBg, borderColor: t.pillPrimaryBg },
    chipText: { fontFamily: LORA.medium, fontSize: 13, color: t.textSecondary },
    chipTextActive: { color: t.pillPrimaryText },
    secondaryButton: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    secondaryButtonText: { fontFamily: LORA.medium, fontSize: 13, color: t.textSecondary },
    permissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
    permissionLabel: { fontFamily: LORA.regular, fontSize: 14, color: t.textPrimary },
    permissionAction: { fontFamily: LORA.medium, fontSize: 13, color: t.contactLink },
    permissionActionMuted: { color: t.textTertiary },
    dangerButton: {
      alignSelf: 'flex-start',
      backgroundColor: t.reminderCardBg,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    dangerButtonText: { fontFamily: LORA.semiBold, fontSize: 13, color: t.reminderText },
    dangerConfirm: { gap: 10 },
    disabled: { opacity: 0.6 },
    input: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
    },
    error: { fontFamily: LORA.regular, fontSize: 13, color: t.reminderText },
  });
}
