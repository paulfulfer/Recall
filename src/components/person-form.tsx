import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORIES, CATEGORY_FIELDS, type Category } from '@/constants/categories';
import { CATEGORY_ACCENTS, LORA, type ThemeTokens } from '@/constants/theme';
import { createPerson, listPeople, matchPeopleByName, savePersonOptionalFields, updatePerson } from '@/lib/people';
import { uploadPersonPhoto } from '@/lib/storage';
import { useAppTheme } from '@/providers/theme-provider';
import type { Person } from '@/types/models';

interface PersonFormProps {
  uid: string;
  initial?: Person;
  onSaved: (personId: string) => void;
  onCancel: () => void;
}

// Spec section 5 screen 8: name, category, category-conditional fields, contact info,
// birthday, gift ideas, and a photo — shared between "create new person" and "edit person".
export function PersonForm({ uid, initial, onSaved, onCancel }: PersonFormProps) {
  const { tokens, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category | undefined>(initial?.category);
  const [fields, setFields] = useState<Record<string, string>>(initial?.fields ?? {});
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [instagram, setInstagram] = useState(initial?.instagram ?? '');
  const [linkedin, setLinkedin] = useState(initial?.linkedin ?? '');
  const [birthday, setBirthday] = useState(initial?.birthday ?? '');
  const [giftIdeas, setGiftIdeas] = useState(initial?.giftIdeas ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPeople, setExistingPeople] = useState<Person[]>([]);

  const categoryFields = category ? CATEGORY_FIELDS[category] : [];

  // Spec polish phase 6: only relevant when creating someone new — editing an existing
  // person's own name obviously shouldn't warn about matching themselves.
  useEffect(() => {
    if (initial) return;
    listPeople(uid).then(setExistingPeople).catch(() => {});
  }, [uid, initial]);

  const duplicateMatches = useMemo(
    () => (initial ? [] : matchPeopleByName(existingPeople, name)),
    [initial, existingPeople, name],
  );

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function chooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    if (!category) {
      setError('Pick a category.');
      return;
    }
    if (birthday.trim() && !/^\d{2}-\d{2}$/.test(birthday.trim())) {
      setError('Birthday should be in MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      const cleanInstagram = instagram.trim().replace(/^@/, '');
      let personId = initial?.id;

      if (personId) {
        await updatePerson(uid, personId, { name: name.trim(), category, fields });
        await savePersonOptionalFields(uid, personId, {
          phone,
          email,
          instagram: cleanInstagram,
          linkedin,
          birthday,
          giftIdeas,
        });
      } else {
        const created = await createPerson(uid, {
          name: name.trim(),
          category,
          closeness: 3,
          fields,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(cleanInstagram ? { instagram: cleanInstagram } : {}),
          ...(linkedin.trim() ? { linkedin: linkedin.trim() } : {}),
          ...(birthday.trim() ? { birthday: birthday.trim() } : {}),
          ...(giftIdeas.trim() ? { giftIdeas: giftIdeas.trim() } : {}),
          importantDates: [],
          facts: [],
          notes: [],
          lastContacted: new Date().toISOString(),
        });
        personId = created.id;
      }

      if (photoUri) {
        const photoUrl = await uploadPersonPhoto(uid, personId, photoUri);
        await updatePerson(uid, personId, { photoUrl });
      }

      onSaved(personId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  const previewUri = photoUri ?? initial?.photoUrl;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{initial ? 'Edit person' : 'New person'}</Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.photoPicker}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Add photo</Text>
            </View>
          )}
        </View>
        <View style={styles.photoActions}>
          <Pressable onPress={takePhoto} style={styles.photoActionButton}>
            <Text style={styles.photoActionText}>Take photo</Text>
          </Pressable>
          <Pressable onPress={chooseFromLibrary} style={styles.photoActionButton}>
            <Text style={styles.photoActionText}>Choose from library</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={tokens.textTertiary}
          style={styles.input}
        />
        {duplicateMatches.length > 0 && (
          <Text style={styles.duplicateWarning}>
            {duplicateMatches.length === 1
              ? `You already have "${duplicateMatches[0].name}" saved — this might be a duplicate.`
              : `You already have ${duplicateMatches.length} people with similar names — this might be a duplicate.`}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
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

      {categoryFields.length > 0 && (
        <View style={styles.card}>
          {categoryFields.map((f) => (
            <View key={f.key} style={styles.fieldGroup}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                value={fields[f.key] ?? ''}
                onChangeText={(v) => setFields((prev) => ({ ...prev, [f.key]: v }))}
                placeholderTextColor={tokens.textTertiary}
                style={styles.input}
              />
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Contact</Text>
        <LabeledInput label="Phone" value={phone} onChangeText={setPhone} styles={styles} tokens={tokens} keyboardType="phone-pad" />
        <LabeledInput label="Email" value={email} onChangeText={setEmail} styles={styles} tokens={tokens} keyboardType="email-address" />
        <LabeledInput label="Instagram handle" value={instagram} onChangeText={setInstagram} styles={styles} tokens={tokens} />
        <LabeledInput label="LinkedIn handle" value={linkedin} onChangeText={setLinkedin} styles={styles} tokens={tokens} />
      </View>

      <View style={styles.card}>
        <LabeledInput label="Birthday (MM-DD)" value={birthday} onChangeText={setBirthday} styles={styles} tokens={tokens} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Gift ideas</Text>
        <TextInput
          value={giftIdeas}
          onChangeText={setGiftIdeas}
          placeholderTextColor={tokens.textTertiary}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={handleSave} disabled={saving} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  styles,
  tokens,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  styles: ReturnType<typeof createStyles>;
  tokens: ThemeTokens;
  keyboardType?: 'phone-pad' | 'email-address';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={tokens.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: LORA.bold, fontSize: 20, color: t.textPrimary },
    cancel: { fontFamily: LORA.medium, fontSize: 13, color: t.textSecondary },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 10 },
    label: {
      fontFamily: LORA.semiBold,
      fontSize: 11,
      letterSpacing: 0.44,
      textTransform: 'uppercase',
      color: t.textTertiary,
    },
    input: {
      backgroundColor: t.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: LORA.regular,
      fontSize: 14,
      color: t.textPrimary,
    },
    multiline: { minHeight: 72, textAlignVertical: 'top' },
    fieldGroup: { gap: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontFamily: LORA.medium, fontSize: 12.5 },
    photoPicker: { alignItems: 'center' },
    photo: { width: 96, height: 96, borderRadius: 24 },
    photoPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 24,
      backgroundColor: t.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPlaceholderText: { fontFamily: LORA.medium, fontSize: 12, color: t.textTertiary },
    photoActions: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
    photoActionButton: {
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    photoActionText: { fontFamily: LORA.medium, fontSize: 12.5, color: t.textSecondary },
    error: { fontFamily: LORA.regular, fontSize: 13, color: t.reminderText, textAlign: 'center' },
    duplicateWarning: { fontFamily: LORA.regular, fontSize: 12.5, color: t.reminderText },
    saveButton: { backgroundColor: t.pillPrimaryBg, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { fontFamily: LORA.semiBold, fontSize: 15, color: t.pillPrimaryText },
  });
}
