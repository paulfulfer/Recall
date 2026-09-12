import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LAYOUT, LORA, type ThemeTokens } from '@/constants/theme';
import { subscribeToCaptures } from '@/lib/captures';
import { subscribeToPeople } from '@/lib/people';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';
import type { Capture, Person } from '@/types/models';

interface SearchResult {
  key: string;
  title: string;
  snippet: string;
  date: string;
  onPress: () => void;
}

function snippetAround(text: string, needle: string, radius = 60): string {
  const idx = text.toLowerCase().indexOf(needle);
  if (idx === -1) return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + needle.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

// Spec section 5 screen 7 / section 8: one search bar, keyword-only, across transcripts,
// extracted facts, and manual notes — client-side filtering over the cached collections.
export default function SearchScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <SearchList uid={user.uid} />;
}

function SearchList({ uid }: { uid: string }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [query, setQuery] = useState('');
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => subscribeToCaptures(uid, setCaptures), [uid]);
  useEffect(() => subscribeToPeople(uid, setPeople), [uid]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const captureResults: SearchResult[] = [];
    for (const c of captures) {
      const factMatch = c.extracted.facts.find((f) => f.toLowerCase().includes(needle));
      const transcriptMatch = !factMatch && c.transcript.toLowerCase().includes(needle);
      if (!factMatch && !transcriptMatch) continue;
      const person = c.personId ? peopleById.get(c.personId) : undefined;
      captureResults.push({
        key: `capture-${c.id}`,
        title: person ? person.name : 'Unfiled',
        snippet: factMatch ?? snippetAround(c.transcript, needle),
        date: c.createdAt,
        onPress: () => (person ? router.push(`/person/${person.id}`) : router.push(`/capture/${c.id}`)),
      });
    }

    const noteResults: SearchResult[] = [];
    for (const p of people) {
      for (const n of p.notes) {
        if (n.text.toLowerCase().includes(needle)) {
          noteResults.push({
            key: `note-${p.id}-${n.date}`,
            title: p.name,
            snippet: snippetAround(n.text, needle),
            date: n.date,
            onPress: () => router.push(`/person/${p.id}`),
          });
        }
      }
    }

    return [...captureResults, ...noteResults].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [captures, people, peopleById, query]);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search transcripts, facts, and notes"
          placeholderTextColor={tokens.textTertiary}
          style={styles.search}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim() ? 'No matches.' : 'Search across everything you’ve captured.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={item.onPress}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.snippet}>{item.snippet}</Text>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 10 },
    title: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3, color: t.textPrimary },
    search: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
    },
    listContent: { padding: 16, gap: LAYOUT.listRowGap },
    empty: { fontFamily: LORA.regular, fontSize: 14, color: t.textTertiary, textAlign: 'center', marginTop: 40 },
    card: {
      backgroundColor: t.card,
      borderRadius: LAYOUT.listRowRadius,
      padding: 14,
      gap: 4,
      marginBottom: LAYOUT.listRowGap,
    },
    name: { fontFamily: LORA.semiBold, fontSize: 14, color: t.textPrimary },
    snippet: { fontFamily: LORA.regular, fontSize: 13.5, lineHeight: 19, color: t.textSecondary },
    date: { fontFamily: LORA.regular, fontSize: 11.5, color: t.textTertiary },
  });
}
