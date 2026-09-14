import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LORA, type ThemeTokens } from '@/constants/theme';
import { daysUntilBirthday } from '@/lib/birthdays';
import { subscribeToPeople } from '@/lib/people';
import { useAppTheme } from '@/providers/theme-provider';
import type { Person } from '@/types/models';

// Spec section 5 screen 2 / section 10: a same-day-or-sooner birthday banner that doesn't
// depend on notification permission — anyone with a birthday within the next 7 days.
export function BirthdayBanner({ uid }: { uid: string }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => subscribeToPeople(uid, setPeople), [uid]);

  const upcoming = useMemo(
    () =>
      people
        .filter((p) => daysUntilBirthday(p.birthday) <= 7)
        .sort((a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday)),
    [people],
  );

  if (upcoming.length === 0) return null;

  return (
    <View style={styles.stack}>
      {upcoming.map((p) => {
        const days = daysUntilBirthday(p.birthday);
        return (
          <Pressable key={p.id} style={styles.banner} onPress={() => router.push(`/person/${p.id}`)}>
            <Text style={styles.text}>
              {days === 0
                ? `${p.name}'s birthday is today`
                : `${p.name}'s birthday is in ${days} day${days === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    stack: { width: '100%', maxWidth: 420, gap: 8 },
    banner: { backgroundColor: t.reminderCardBg, borderRadius: 16, padding: 14 },
    text: { fontFamily: LORA.medium, fontSize: 13.5, color: t.reminderText },
  });
}
