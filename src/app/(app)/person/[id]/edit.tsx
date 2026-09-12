import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { PersonForm } from '@/components/person-form';
import { subscribeToPerson } from '@/lib/people';
import { useAuth } from '@/providers/auth-provider';
import type { Person } from '@/types/models';

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  if (!user || !id) return null;
  return <EditPersonForm uid={user.uid} personId={id} />;
}

function EditPersonForm({ uid, personId }: { uid: string; personId: string }) {
  const [person, setPerson] = useState<Person | null | undefined>(undefined);

  useEffect(() => subscribeToPerson(uid, personId, setPerson), [uid, personId]);

  if (!person) return null;

  return (
    <PersonForm
      uid={uid}
      initial={person}
      onSaved={() => router.replace(`/person/${personId}`)}
      onCancel={() => router.back()}
    />
  );
}
