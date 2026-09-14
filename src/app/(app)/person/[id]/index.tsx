import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarBadge } from '@/components/avatar-badge';
import { CategoryTag } from '@/components/category-tag';
import { ClosenessDots } from '@/components/closeness-dots';
import { SkeletonBlock, SkeletonGroup } from '@/components/skeleton';
import { SwipeableRow } from '@/components/swipeable-row';
import { CATEGORY_FIELDS } from '@/constants/categories';
import { LAYOUT, LORA, type ThemeTokens } from '@/constants/theme';
import { openEmail, openInstagram, openLinkedIn, openPhone } from '@/lib/contact-links';
import { subscribeToCapturesForPerson } from '@/lib/captures';
import { addPersonNote, removePersonFact, removePersonNote, subscribeToPerson, updatePerson } from '@/lib/people';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/providers/theme-provider';
import type { Capture, Person } from '@/types/models';

const UNDO_WINDOW_MS = 5000;

type PendingDelete = { kind: 'fact'; value: string } | { kind: 'note'; note: { date: string; text: string } };

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  if (!user || !id) return null;
  return <PersonDetail uid={user.uid} personId={id} />;
}

function PersonDetail({ uid, personId }: { uid: string; personId: string }) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [person, setPerson] = useState<Person | null | undefined>(undefined);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [noteText, setNoteText] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `pending` so the unmount effect below (which only runs once, per its empty
  // deps) can read the latest value instead of the stale one from its first render.
  const pendingRef = useRef<PendingDelete | null>(null);
  pendingRef.current = pending;

  useEffect(() => subscribeToPerson(uid, personId, setPerson), [uid, personId]);
  useEffect(() => subscribeToCapturesForPerson(uid, personId, setCaptures), [uid, personId]);
  // Any pending delete still waiting out its undo window when the screen unmounts should
  // still land — otherwise navigating away right after a swipe would silently keep the item.
  useEffect(
    () => () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      if (pendingRef.current) commitDelete(pendingRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function commitDelete(target: PendingDelete) {
    if (target.kind === 'fact') removePersonFact(uid, personId, target.value);
    else removePersonNote(uid, personId, target.note);
  }

  function requestDelete(target: PendingDelete) {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    if (pending) commitDelete(pending);
    setPending(target);
    pendingTimer.current = setTimeout(() => {
      commitDelete(target);
      setPending(null);
      pendingTimer.current = null;
    }, UNDO_WINDOW_MS);
  }

  function undoDelete() {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
    setPending(null);
  }

  if (person === undefined) {
    return (
      <SafeAreaView style={styles.flex}>
        <SkeletonGroup style={styles.content}>
          <View style={styles.profileHeader}>
            <SkeletonBlock width={LAYOUT.avatarDetailSize} height={LAYOUT.avatarDetailSize} radius={LAYOUT.avatarDetailRadius} />
            <View style={styles.profileText}>
              <SkeletonBlock width={140} height={16} />
              <SkeletonBlock width={70} height={11} />
            </View>
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonBlock width={60} height={10} />
              <SkeletonBlock width="85%" height={13} />
              <SkeletonBlock width="55%" height={13} />
            </View>
          ))}
        </SkeletonGroup>
      </SafeAreaView>
    );
  }
  if (person === null) {
    return (
      <SafeAreaView style={styles.flex}>
        <Text style={styles.notFound}>This person no longer exists.</Text>
      </SafeAreaView>
    );
  }

  const contactRows: { label: string; value: string; onPress: () => void }[] = [];
  if (person.phone) contactRows.push({ label: 'Phone', value: person.phone, onPress: () => openPhone(person.phone!) });
  if (person.email) contactRows.push({ label: 'Email', value: person.email, onPress: () => openEmail(person.email!) });
  if (person.instagram) {
    contactRows.push({ label: 'Instagram', value: person.instagram, onPress: () => openInstagram(person.instagram!) });
  }
  if (person.linkedin) {
    contactRows.push({ label: 'LinkedIn', value: person.linkedin, onPress: () => openLinkedIn(person.linkedin!) });
  }

  const categoryFields = CATEGORY_FIELDS[person.category];

  function toggleExpanded(captureId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(captureId)) next.delete(captureId);
      else next.add(captureId);
      return next;
    });
  }

  async function addNote() {
    const text = noteText.trim();
    if (!text) return;
    setNoteText('');
    await addPersonNote(uid, personId, { date: new Date().toISOString(), text });
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/person/${personId}/edit`)} hitSlop={12}>
            <Text style={styles.back}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.profileHeader}>
          <AvatarBadge
            name={person.name}
            category={person.category}
            size={LAYOUT.avatarDetailSize}
            radius={LAYOUT.avatarDetailRadius}
            photoUrl={person.photoUrl}
          />
          <View style={styles.profileText}>
            <Text style={styles.name}>{person.name}</Text>
            <CategoryTag category={person.category} />
          </View>
        </View>

        {categoryFields.length > 0 && (
          <View style={styles.card}>
            {categoryFields.map((f) => (
              <View key={f.key} style={styles.fieldRow}>
                <Text style={styles.label}>{f.label}</Text>
                <Text style={styles.fieldValue}>{person.fields[f.key] || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {contactRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Contact</Text>
            {contactRows.map((row) => (
              <Pressable key={row.label} onPress={row.onPress} style={styles.contactRow}>
                <Text style={styles.contactLabel}>{row.label}</Text>
                <Text style={styles.contactValue}>{row.value}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {(person.birthday || person.importantDates.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.label}>Important dates</Text>
            {person.birthday && <Text style={styles.dateRow}>Birthday — {person.birthday}</Text>}
            {person.importantDates.map((d, i) => (
              <Text key={`${d.label}-${i}`} style={styles.dateRow}>{d.label} — {d.date}</Text>
            ))}
          </View>
        )}

        {person.giftIdeas && (
          <View style={styles.card}>
            <Text style={styles.label}>Gift ideas</Text>
            <Text style={styles.body}>{person.giftIdeas}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Closeness</Text>
          <ClosenessDots
            category={person.category}
            value={person.closeness}
            onChange={(v) => updatePerson(uid, personId, { closeness: v })}
          />
        </View>

        {person.facts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Facts</Text>
            {person.facts
              .filter((f) => !(pending?.kind === 'fact' && pending.value === f))
              .map((f, i) => (
                <SwipeableRow key={`${f}-${i}`} onDelete={() => requestDelete({ kind: 'fact', value: f })}>
                  <View style={styles.factRow}>
                    <Text style={styles.body}>• {f}</Text>
                  </View>
                </SwipeableRow>
              ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Notes</Text>
          {[...person.notes]
            .reverse()
            .filter((n) => !(pending?.kind === 'note' && pending.note.date === n.date && pending.note.text === n.text))
            .map((n, i) => (
              <SwipeableRow key={`${n.date}-${i}`} onDelete={() => requestDelete({ kind: 'note', note: n })}>
                <View style={styles.noteRow}>
                  <Text style={styles.noteDate}>{new Date(n.date).toLocaleDateString()}</Text>
                  <Text style={styles.body}>{n.text}</Text>
                </View>
              </SwipeableRow>
            ))}
          <View style={styles.addRow}>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note"
              placeholderTextColor={tokens.textTertiary}
              style={[styles.input, styles.flex1]}
              onSubmitEditing={addNote}
            />
            <Pressable onPress={addNote} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Capture history</Text>
          {captures.length === 0 && <Text style={styles.body}>No captures yet.</Text>}
          {captures.map((c) => {
            const isOpen = expanded.has(c.id);
            return (
              <View key={c.id} style={styles.captureRow}>
                <Text style={styles.noteDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                {c.extracted.facts.map((f, i) => (
                  <Text key={i} style={styles.body}>• {f}</Text>
                ))}
                {c.transcript ? (
                  <Pressable onPress={() => toggleExpanded(c.id)}>
                    <Text style={styles.transcriptToggle}>{isOpen ? 'Hide transcript' : 'Show transcript'}</Text>
                  </Pressable>
                ) : null}
                {isOpen && <Text style={styles.body}>{c.transcript}</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {pending && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{pending.kind === 'fact' ? 'Fact deleted' : 'Note deleted'}</Text>
          <Pressable onPress={undoDelete} hitSlop={8}>
            <Text style={styles.snackbarUndo}>Undo</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    flex1: { flex: 1 },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
    back: { fontFamily: LORA.medium, fontSize: 14, color: t.contactLink },
    notFound: { fontFamily: LORA.regular, fontSize: 14, color: t.textSecondary, textAlign: 'center', marginTop: 40 },
    profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
    profileText: { gap: 4 },
    name: { fontFamily: LORA.semiBold, fontSize: 18, color: t.textPrimary },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 10 },
    label: {
      fontFamily: LORA.semiBold,
      fontSize: 11,
      letterSpacing: 0.44,
      textTransform: 'uppercase',
      color: t.textTertiary,
    },
    fieldRow: { flexDirection: 'row', justifyContent: 'space-between' },
    fieldValue: { fontFamily: LORA.regular, fontSize: 14, color: t.textPrimary },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    contactLabel: { fontFamily: LORA.regular, fontSize: 13, color: t.textSecondary },
    contactValue: { fontFamily: LORA.medium, fontSize: 14, color: t.contactLink },
    dateRow: { fontFamily: LORA.regular, fontSize: 14, color: t.textPrimary },
    body: { fontFamily: LORA.regular, fontSize: 14, lineHeight: 21.7, color: t.textPrimary },
    factRow: { paddingVertical: 4, backgroundColor: t.card },
    noteRow: { gap: 2, paddingVertical: 4, backgroundColor: t.card },
    noteDate: { fontFamily: LORA.medium, fontSize: 11.5, color: t.textTertiary },
    snackbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.cardBorder,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    snackbarText: { fontFamily: LORA.regular, fontSize: 13.5, color: t.textPrimary },
    snackbarUndo: { fontFamily: LORA.semiBold, fontSize: 13.5, color: t.contactLink },
    addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    input: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
    },
    addButton: { backgroundColor: t.pillPrimaryBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
    addButtonText: { fontFamily: LORA.medium, fontSize: 12.5, color: t.pillPrimaryText },
    captureRow: { gap: 4, paddingBottom: 10 },
    transcriptToggle: { fontFamily: LORA.medium, fontSize: 12.5, color: t.contactLink },
  });
}
