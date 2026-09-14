import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarBadge } from '@/components/avatar-badge';
import { CategoryTag } from '@/components/category-tag';
import { ClosenessDots } from '@/components/closeness-dots';
import { CATEGORIES, type Category } from '@/constants/categories';
import { LAYOUT, LORA, type ThemeTokens } from '@/constants/theme';
import { daysUntilBirthday } from '@/lib/birthdays';
import { subscribeToPeople } from '@/lib/people';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';
import type { Person } from '@/types/models';

type SortMode = 'name' | 'birthday' | 'recent';

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default function PeopleScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <PeopleList uid={user.uid} />;
}

function PeopleList({ uid }: { uid: string }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('name');

  useEffect(() => subscribeToPeople(uid, setPeople), [uid]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let result = people.filter((p) => (needle ? p.name.toLowerCase().includes(needle) : true));
    if (category) result = result.filter((p) => p.category === category);

    result = [...result].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      if (sortMode === 'birthday') return daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday);
      return new Date(b.lastContacted).getTime() - new Date(a.lastContacted).getTime();
    });
    return result;
  }, [people, search, category, sortMode]);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>People</Text>
          <Pressable onPress={() => router.push('/person/new')} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ New</Text>
          </Pressable>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name"
          placeholderTextColor={tokens.textTertiary}
          style={styles.search}
        />
        <View style={styles.chipRow}>
          <FilterChip label="All" active={category === null} onPress={() => setCategory(null)} tokens={tokens} />
          {CATEGORIES.map((c) => (
            <FilterChip key={c} label={c} active={category === c} onPress={() => setCategory(c)} tokens={tokens} />
          ))}
        </View>
        <View style={styles.sortRow}>
          <SortButton label="Name" active={sortMode === 'name'} onPress={() => setSortMode('name')} tokens={tokens} />
          <SortButton
            label="Upcoming birthday"
            active={sortMode === 'birthday'}
            onPress={() => setSortMode('birthday')}
            tokens={tokens}
          />
          <SortButton
            label="Last contacted"
            active={sortMode === 'recent'}
            onPress={() => setSortMode('recent')}
            tokens={tokens}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No one here yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/person/${item.id}`)}>
            <AvatarBadge
              name={item.name}
              category={item.category}
              size={LAYOUT.avatarListSize}
              radius={LAYOUT.avatarListRadius}
              photoUrl={item.photoUrl}
            />
            <View style={styles.rowMain}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <CategoryTag category={item.category} />
              {item.facts.length > 0 && (
                <Text style={styles.snippet} numberOfLines={1}>
                  {item.facts[item.facts.length - 1]}
                </Text>
              )}
            </View>
            <View style={styles.rowMeta}>
              <Text style={styles.days}>
                {daysSince(item.lastContacted) === 0 ? 'Today' : `${daysSince(item.lastContacted)}d ago`}
              </Text>
              <ClosenessDots category={item.category} value={item.closeness} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  tokens,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        { borderColor: tokens.cardBorder },
        active && { backgroundColor: tokens.pillPrimaryBg, borderColor: tokens.pillPrimaryBg },
      ]}>
      <Text style={[chipStyles.text, { color: active ? tokens.pillPrimaryText : tokens.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function SortButton({
  label,
  active,
  onPress,
  tokens,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text style={[chipStyles.sortText, { color: active ? tokens.textPrimary : tokens.textTertiary }]}>{label}</Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontFamily: LORA.medium, fontSize: 12.5 },
  sortText: { fontFamily: LORA.medium, fontSize: 12 },
});

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary },
    addButton: { backgroundColor: t.pillPrimaryBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    addButtonText: { fontFamily: LORA.medium, fontSize: 13, color: t.pillPrimaryText },
    search: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sortRow: { flexDirection: 'row', gap: 16, paddingBottom: 4 },
    listContent: { padding: 16, gap: LAYOUT.listRowGap },
    empty: { fontFamily: LORA.regular, fontSize: 14, color: t.textTertiary, textAlign: 'center', marginTop: 40 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.card,
      borderRadius: LAYOUT.listRowRadius,
      padding: 12,
      marginBottom: LAYOUT.listRowGap,
    },
    rowMain: { flex: 1, gap: 3 },
    name: { fontFamily: LORA.semiBold, fontSize: 14.5, color: t.textPrimary },
    snippet: { fontFamily: LORA.regular, fontSize: 12.5, color: t.textSecondary },
    rowMeta: { alignItems: 'flex-end', gap: 6 },
    days: { fontFamily: LORA.regular, fontSize: 11.5, color: t.textTertiary },
  });
}
