import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { attachCaptureToPerson, updateCapture } from '@/lib/captures';
import { addPersonFacts, addPersonImportantDate, createPerson, listPeople, matchPeopleByName, updatePerson } from '@/lib/people';
import { CATEGORIES, type Category } from '@/constants/categories';
import { CATEGORY_ACCENTS, LORA, type ThemeTokens } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';
import type { CaptureExtracted, Person } from '@/types/models';

interface CaptureConfirmProps {
  uid: string;
  captureId: string;
  transcript: string;
  initialExtracted: CaptureExtracted;
  onDone: () => void;
  onCancel: () => void;
}

type SaveMode = 'attach' | 'create' | 'orphan';

// Spec section 4 steps 6-7: shown after every recording or typed capture, before anything
// commits to a Person document. All extracted fields are editable; nothing here auto-saves.
export function CaptureConfirm({ uid, captureId, transcript, initialExtracted, onDone, onCancel }: CaptureConfirmProps) {
  const { tokens, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [name, setName] = useState(initialExtracted.name ?? '');
  const [category, setCategory] = useState<Category | undefined>(initialExtracted.category);
  const [facts, setFacts] = useState<string[]>(initialExtracted.facts);
  const [newFact, setNewFact] = useState('');
  const [dates, setDates] = useState(initialExtracted.dates);
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDateValue, setNewDateValue] = useState('');

  const [people, setPeople] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Explicit user choice once they tap an attach/create/orphan option — overrides the
  // spec step 7 auto-suggestion derived from the name field below.
  const [userChoice, setUserChoice] = useState<{ mode: SaveMode; personId: string | null } | null>(null);

  useEffect(() => {
    listPeople(uid).then(setPeople).catch(() => setPeople([]));
  }, [uid]);

  const matches = useMemo(() => matchPeopleByName(people, name), [people, name]);

  const { mode: saveMode, personId: selectedPersonId } = useMemo(() => {
    if (userChoice) return userChoice;
    const exact = matches.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exact) return { mode: 'attach' as const, personId: exact.id };
    if (name.trim()) return { mode: 'create' as const, personId: null };
    return { mode: 'orphan' as const, personId: null };
  }, [userChoice, matches, name]);

  function addFact() {
    const trimmed = newFact.trim();
    if (!trimmed) return;
    setFacts((f) => [...f, trimmed]);
    setNewFact('');
  }

  function removeFact(index: number) {
    setFacts((f) => f.filter((_, i) => i !== index));
  }

  function addDate() {
    const label = newDateLabel.trim();
    const date = newDateValue.trim();
    if (!label || !date) return;
    setDates((d) => [...d, { label, date }]);
    setNewDateLabel('');
    setNewDateValue('');
  }

  function removeDate(index: number) {
    setDates((d) => d.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaveError(null);
    if (saveMode === 'create' && !name.trim()) {
      setSaveError('Enter a name to create a new person.');
      return;
    }
    if (saveMode === 'create' && !category) {
      setSaveError('Pick a category to create a new person.');
      return;
    }
    if (saveMode === 'attach' && !selectedPersonId) {
      setSaveError('Pick a person to attach to.');
      return;
    }

    setSaving(true);
    try {
      const finalExtracted: CaptureExtracted = {
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(category ? { category } : {}),
        facts,
        dates,
      };
      const nowIso = new Date().toISOString();
      let personId: string | null = null;

      if (saveMode === 'attach' && selectedPersonId) {
        personId = selectedPersonId;
        await addPersonFacts(uid, personId, facts);
        await Promise.all(dates.map((d) => addPersonImportantDate(uid, personId!, d)));
        await updatePerson(uid, personId, { lastContacted: nowIso });
      } else if (saveMode === 'create') {
        const person = await createPerson(uid, {
          name: name.trim(),
          category: category!,
          closeness: 3,
          fields: {},
          importantDates: dates,
          facts,
          notes: [],
          lastContacted: nowIso,
        });
        personId = person.id;
      }

      if (personId) {
        await attachCaptureToPerson(uid, captureId, personId);
      }
      await updateCapture(uid, captureId, { extracted: finalExtracted });
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <ThemedLabel styles={styles}>Confirm capture</ThemedLabel>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      {transcript ? (
        <View style={styles.card}>
          <ThemedLabel styles={styles}>Transcript</ThemedLabel>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <ThemedLabel styles={styles}>Name</ThemedLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Who was this?"
          placeholderTextColor={tokens.textTertiary}
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <ThemedLabel styles={styles}>Category</ThemedLabel>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const accent = CATEGORY_ACCENTS[c][mode];
            const selected = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, { borderColor: accent }, selected && { backgroundColor: accent }]}>
                <Text style={[styles.chipText, { color: selected ? tokens.bg : accent }]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <ThemedLabel styles={styles}>Facts</ThemedLabel>
        {facts.map((fact, i) => (
          <View key={`${fact}-${i}`} style={styles.listRow}>
            <Text style={styles.listRowText}>{fact}</Text>
            <Pressable onPress={() => removeFact(i)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            value={newFact}
            onChangeText={setNewFact}
            placeholder="Add a fact"
            placeholderTextColor={tokens.textTertiary}
            style={[styles.input, styles.flex1]}
            onSubmitEditing={addFact}
          />
          <Pressable onPress={addFact} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <ThemedLabel styles={styles}>Important dates</ThemedLabel>
        {dates.map((d, i) => (
          <View key={`${d.label}-${d.date}-${i}`} style={styles.listRow}>
            <Text style={styles.listRowText}>{d.label} — {d.date}</Text>
            <Pressable onPress={() => removeDate(i)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            value={newDateLabel}
            onChangeText={setNewDateLabel}
            placeholder="Label"
            placeholderTextColor={tokens.textTertiary}
            style={[styles.input, styles.flex1]}
          />
          <TextInput
            value={newDateValue}
            onChangeText={setNewDateValue}
            placeholder="MM-DD"
            placeholderTextColor={tokens.textTertiary}
            style={[styles.input, styles.dateInput]}
          />
          <Pressable onPress={addDate} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <ThemedLabel styles={styles}>Save to</ThemedLabel>

        {matches.length > 0 && (
          <>
            <Text style={styles.subLabel}>Attach to existing</Text>
            <View style={styles.chipRow}>
              {matches.map((p) => {
                const selected = saveMode === 'attach' && selectedPersonId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setUserChoice({ mode: 'attach', personId: p.id })}
                    style={[styles.chip, { borderColor: tokens.contactLink }, selected && { backgroundColor: tokens.contactLink }]}>
                    <Text style={[styles.chipText, { color: selected ? tokens.bg : tokens.contactLink }]}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setUserChoice({ mode: 'create', personId: null })}
            style={[styles.modeButton, saveMode === 'create' && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, saveMode === 'create' && styles.modeButtonTextActive]}>
              Create new person
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setUserChoice({ mode: 'orphan', personId: null })}
            style={[styles.modeButton, saveMode === 'orphan' && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, saveMode === 'orphan' && styles.modeButtonTextActive]}>
              Save without a person
            </Text>
          </Pressable>
        </View>
      </View>

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      <Pressable onPress={handleSave} disabled={saving} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ThemedLabel({ children, styles }: { children: string; styles: ReturnType<typeof createStyles> }) {
  return <Text style={styles.label}>{children}</Text>;
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    flex1: { flex: 1 },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cancel: { fontFamily: LORA.medium, fontSize: 13, color: t.textSecondary },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 10 },
    label: {
      fontFamily: LORA.semiBold,
      fontSize: 11,
      letterSpacing: 0.44,
      textTransform: 'uppercase',
      color: t.textTertiary,
    },
    subLabel: { fontFamily: LORA.medium, fontSize: 12, color: t.textSecondary },
    transcriptText: { fontFamily: LORA.regular, fontSize: 14, lineHeight: 21.7, color: t.textSecondary },
    input: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
    },
    dateInput: { width: 90 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontFamily: LORA.medium, fontSize: 12.5 },
    listRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      gap: 8,
    },
    listRowText: { flex: 1, fontFamily: LORA.regular, fontSize: 14, color: t.textPrimary },
    removeText: { fontFamily: LORA.medium, fontSize: 12, color: t.reminderText },
    addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    addButton: { backgroundColor: t.pillPrimaryBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
    addButtonText: { fontFamily: LORA.medium, fontSize: 12.5, color: t.pillPrimaryText },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    modeButton: {
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    modeButtonActive: { backgroundColor: t.pillPrimaryBg, borderColor: t.pillPrimaryBg },
    modeButtonText: { fontFamily: LORA.medium, fontSize: 12.5, color: t.textSecondary },
    modeButtonTextActive: { color: t.pillPrimaryText },
    error: { fontFamily: LORA.regular, fontSize: 13, color: t.reminderText, textAlign: 'center' },
    saveButton: {
      backgroundColor: t.pillPrimaryBg,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { fontFamily: LORA.semiBold, fontSize: 15, color: t.pillPrimaryText },
  });
}
