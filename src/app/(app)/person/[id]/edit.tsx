import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PersonForm } from '@/components/person-form';
import { subscribeToPerson } from '@/lib/people';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';
import type { Person } from '@/types/models';

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  if (!user || !id) return null;
  return <EditPersonForm uid={user.uid} personId={id} />;
}

function EditPersonForm({ uid, personId }: { uid: string; personId: string }) {
  const { tokens } = useAppTheme();
  const [person, setPerson] = useState<Person | null | undefined>(undefined);

  useEffect(() => subscribeToPerson(uid, personId, setPerson), [uid, personId]);

  if (!person) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
        <ActivityIndicator style={{ marginTop: 40 }} color={tokens.textTertiary} />
      </SafeAreaView>
    );
  }

  return (
    <PersonForm
      uid={uid}
      initial={person}
      onSaved={() => router.replace(`/person/${personId}`)}
      onCancel={() => router.back()}
    />
  );
}
