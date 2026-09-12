import { router } from 'expo-router';

import { PersonForm } from '@/components/person-form';
import { useAuth } from '@/providers/auth-provider';

export default function NewPersonScreen() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <PersonForm
      uid={user.uid}
      onSaved={(personId) => router.replace(`/person/${personId}`)}
      onCancel={() => router.back()}
    />
  );
}
