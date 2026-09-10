# Recall — build specification

A private, voice-first personal CRM. Talk for up to a minute after meeting someone — who they are, what they said — and AI turns that ramble into a structured, searchable profile. You can also add or edit people manually at any time; voice is the fast path in, not the only path. Built for one user (you) across jobs, school, golf, and everywhere else you meet people you don't want to forget.

---

## 0. Before you start (setup checklist)

1. Create a Firebase project. Enable **Authentication** (email/password), **Firestore**, and **Storage**.
2. Get a **Gemini API key** from Google AI Studio (ai.google.dev) — free, no credit card required. This is used for both transcription and extraction, so this is the only AI provider you need.
3. Create a private **GitHub repo**.
4. You do **not** need to upgrade Firebase to the Blaze plan to start, and you do **not** need an Apple Developer or Google Play Console account yet. See Section 11 for when each of those actually becomes necessary — none of them block you from starting.

**Cost reality check:** run this whole app on free tiers. Firebase Spark (free) covers Firestore/Auth/Storage at personal scale. Gemini's free tier covers transcription and extraction at personal recording volume. The only things that cost money are optional and only matter once you want to publish or scale beyond personal use — see Section 11.

---

## 1. Tech stack

- **Framework:** Expo (React Native) + TypeScript
- **Navigation:** Expo Router
- **Backend / data:** Firebase — Auth (email/password), Firestore (offline persistence on), Storage (audio + photos)
- **Cloud Functions:** the only place the Gemini API key lives — never call it directly from the client
- **AI:** Gemini API (Google AI Studio), for both transcription (audio in, text out) and extraction (transcript in, structured JSON out) — one provider, one free tier, covers both jobs
- **Audio recording:** `expo-av`
- **Location anchor:** `expo-location`
- **Calendar anchor:** `expo-calendar`
- **Search:** plain Firestore/client-side keyword matching — no vector database, no embeddings, no semantic search (deliberately deferred, see Section 12)
- **Builds:** EAS Build
- **Repo:** GitHub, private repo

---

## 2. Data model

Firestore structure, scoped under the authenticated user's UID:

```
users/{uid}/people/{personId}
users/{uid}/captures/{captureId}
```

**Person document:**

```ts
type Category = "Work" | "School" | "Family" | "Friends" | "Acquaintances";

interface Person {
  id: string;
  name: string;
  category: Category;
  closeness: 1 | 2 | 3 | 4 | 5;
  photoUrl?: string;                    // Firebase Storage download URL

  fields: Record<string, string>;       // category-specific, see Section 3

  phone?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;

  birthday?: string;                    // "MM-DD"
  importantDates: { label: string; date: string }[];
  giftIdeas?: string;

  facts: string[];                      // discrete facts pulled from captures over time
  notes: { date: string; text: string }[]; // manually-typed free-text log entries
  lastContacted: string;                // ISO date, updated by any note or capture

  createdAt: string;
  updatedAt: string;
}
```

**Capture document** (the raw layer behind every voice or typed entry — nothing is ever thrown away):

```ts
interface Capture {
  id: string;
  personId: string | null;              // null = orphan, not yet attached to a person
  audioUrl?: string;                    // Storage URL; absent for typed captures
  transcript: string;                   // verbatim, from Gemini or typed directly
  extracted: {
    name?: string;
    category?: Category;
    facts: string[];
    dates: { label: string; date: string }[];
  };
  anchors: {
    timestamp: string;
    location?: { lat: number; lng: number; label?: string };
    calendarEvent?: string;
  };
  createdAt: string;
}
```

Photos: `users/{uid}/photos/{personId}.jpg`. Audio: `users/{uid}/audio/{captureId}.m4a`. Both in Firebase Storage.

---

## 3. Categories and custom fields

Five fixed categories, each with its own extra fields:

| Category | Extra fields |
|---|---|
| Work | Company, Title |
| School | School, Class/year |
| Family | Relation |
| Friends | How you met |
| Acquaintances | Context |

Keep in `constants/categories.ts`. Give this list to the Gemini extraction prompt so it picks from a closed set rather than inventing categories.

---

## 4. The capture pipeline (voice-first entry)

1. **Record**: hit the record button, talk for up to ~60 seconds, hit stop. `expo-av` captures locally.
2. **Anchor immediately**: the moment recording starts, stamp `timestamp` (always), `location` (if permission granted), `calendarEvent` (if permission granted — whatever's on the calendar at that hour). Do this regardless of whether transcription/extraction later succeeds.
3. **Upload**: audio uploads to Firebase Storage.
4. **Transcribe**: a Cloud Function sends the audio to Gemini, gets back a verbatim transcript, saves it to the capture document right away — the transcript is never lost even if extraction fails later.
5. **Extract**: the same or a second Cloud Function sends the transcript to Gemini with a prompt asking for structured JSON: candidate name, candidate category (from the closed list in Section 3), a list of discrete facts, and any dates mentioned.
6. **Confirm/edit screen**: show extracted fields pre-filled and editable, before anything commits to a Person document. Never auto-save without this step.
7. **Attach, create, or orphan**:
   - Extracted name matches an existing person → suggest "attach to [existing person]," editable.
   - New name → offer "create new person."
   - No name captured at all → save with `personId: null`, goes to the Unfiled bucket with its anchors intact.
8. **Typed fallback**: a plain text entry point sits alongside the record button everywhere it appears (quiet rooms, meetings, or just preference). Typed captures skip transcription and go straight to extraction.

Manual editing (adding/editing a person's fields, contact info, gift ideas, notes, closeness) stays available at any time from the person detail screen — voice is the fast path in, not the only way to maintain a profile.

---

## 5. Screens

1. **Sign in / sign up** — Firebase email/password.
2. **Home** — record button (primary action), recent captures, birthday reminder banner (anyone with a birthday within 7 days).
3. **Capture confirm/edit** — shown right after every recording or typed capture: transcript preview, extracted fields all editable, attach/create/orphan choice, save.
4. **People list** — search, category filter chips, sort (upcoming birthday / last contacted / name). Each row: name, category, days since last contact, closeness dots, one-line snippet of the most recent fact.
5. **Person detail** — profile fields, category-specific fields, contact info (tap-to-open, see Section 6), important dates, gift ideas, closeness (editable), a manual note-entry field, and a reverse-chronological capture history (each entry: date, extracted facts, expandable full transcript).
6. **Unfiled (orphan bucket)** — captures with no attached person, anchors (timestamp, location, calendar event) shown prominently. Tap one to search/select an existing person or create a new one to merge it into.
7. **Search** — single search bar, keyword search across transcripts, extracted facts, and manual notes.
8. **Add/edit person (manual)** — name, category, category fields, contact info, birthday, photo upload.
9. **Settings** — sign out, theme toggle (Section 7), notification lead-time preference, location/calendar permission management, delete account.

---

## 6. Contact info tap behavior (deep links)

Same pattern regardless of whether the contact was captured by voice or typed manually. Use React Native's `Linking` API, try the app first, fall back to web:

| Field | Try first (app) | Fallback (web/OS) |
|---|---|---|
| Phone | `tel:{number}` | same — OS handles this natively |
| Email | `mailto:{address}` | same |
| Instagram | `instagram://user?username={handle}` | `https://instagram.com/{handle}` |
| LinkedIn | `linkedin://in/{handle}` | `https://linkedin.com/in/{handle}` |

Store the handle only, not a full URL. Strip a leading `@` on Instagram handles.

---

## 7. Design system

Dark-mode-first, Brick-app-inspired: near-black shell, soft floating cards, pill buttons. Built as real light/dark theme tokens from day one since a toggle is a planned feature. Default to dark.

**Colors — dark theme (default)**
| Token | Hex | Use |
|---|---|---|
| Background | `#0D0D0F` | Screen background |
| Card | `#1B1B1E` | Cards, list rows |
| Modal | `#222126` | Modal/sheet surfaces |
| Input background | `#232226` | Text inputs |
| Text primary | `#F3F2EE` | Names, headers |
| Text secondary | `#A9A9AD` | Body text |
| Text tertiary | `#77777B` | Meta, muted data |
| Card border | `rgba(243,242,238,0.08)` | Dividers, outlines |
| Reminder card bg / text | `#2A2013` / `#E3A855` | Birthday alert banner |
| Reminder icon | `#D99A3D` | Birthday alert icon |
| Primary pill bg / text | `#F3F2EE` / `#17171A` | Primary buttons |
| Dot empty border | `#45454A` | Unfilled closeness dot |
| Contact link color | `#8FC2E0` | Tappable phone/email/social rows |

**Colors — light theme**
| Token | Hex | Use |
|---|---|---|
| Background | `#F3F2EE` | Screen background |
| Card | `#FFFFFF` | Cards, list rows |
| Modal | `#FFFFFF` | Modal/sheet surfaces |
| Input background | `#F3F2EE` | Text inputs |
| Text primary | `#17171A` | Names, headers |
| Text secondary | `#65656A` | Body text |
| Text tertiary | `#9A9A9D` | Meta, muted data |
| Card border | `rgba(23,23,26,0.08)` | Dividers, outlines |
| Reminder card bg / text | `#EFE3D2` / `#6B4A1E` | Birthday alert banner |
| Reminder icon | `#B5790C` | Birthday alert icon |
| Primary pill bg / text | `#17171A` / `#FFFFFF` | Primary buttons |
| Dot empty border | `#CBCAC5` | Unfilled closeness dot |
| Contact link color | `#2F6F8F` | Tappable phone/email/social rows |

**Colors — category accents (dark / light pair per category)**
| Category | Dark-mode hex | Light-mode hex |
|---|---|---|
| Work | `#5B9BC2` | `#2F6F8F` |
| School | `#8B95D6` | `#5A67A8` |
| Family | `#D48CA0` | `#A4697E` |
| Friends | `#63B39F` | `#3F8A7A` |
| Acquaintances | `#9A9A9E` | `#8C8C90` |

**Typography**
- Single family throughout: **Lora** (serif, weights 400/500/600/700) — headers through data, no separate mono pairing.
- Google Fonts: `https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap` (native: install via `expo-font`, not a stylesheet import).
- Screen title: 26px/700, letter-spacing −0.01em. Person name: ~14.5–18px/600 depending on context. Body/note text: 14px/400, line-height 1.55. Labels: 11px/600, uppercase, letter-spacing 0.04em, tertiary color.

**Layout**
- Single-column, mobile-first.
- Every content section on person detail (category fields, Contact, Important dates, Gift ideas, Notes, Capture history) is its own separate floating card — 22px radius, stacked with ~12px gaps.
- People-list rows: each person is their own card (18px radius, ~10px gap between rows) — not a shared container with dividers.
- Category marker: 8×8px rounded-square swatch (3px radius) in the accent color, plus the category name at 11.5px/500 in the same accent.
- Avatar badges: rounded-square initials badge (not circular) — 36×36px/12px radius in list rows, 44×44px/14px radius in the detail header. Background = accent at ~12% opacity, text = full accent color.
- Closeness: five 6px circles, 5px gap. Filled = category accent. Empty = transparent, 1px border in the theme's "dot empty border" token.
- Buttons: full pill radius (999px) throughout.
- The **record button** is the one deliberately different element: large circular (not pill), primary pill color, with a pulse/waveform animation while recording — it should read as the app's primary action at a glance.

---

## 8. Search

- Keyword only for v1 (Section 12).
- Searches `transcript`, `extracted.facts`, and manual `notes` text.
- At personal scale, a plain Firestore query or client-side filter over cached data is sufficient — no Algolia/Typesense needed.

---

## 9. Orphan bucket and anchors

- Every capture gets `timestamp`, `location`, and `calendarEvent` anchors regardless of whether a name was captured.
- Request location/calendar permissions with a clear explanation; the app works fully without them, anchors just degrade to timestamp-only.
- Merging an orphan into a person moves `personId` from `null` to the real person's ID — transcript, facts, and anchors carry over unchanged.

---

## 10. Birthday reminders

- Local notifications via `expo-notifications`, scheduled on-device — no push server needed.
- Two per person per year: configurable lead time before the birthday (default 7 days) and one on the day itself.
- Reschedule on app launch, whenever a birthday is added/edited (manually or via capture extraction), and annually.
- Request notification permission on first launch with a clear explanation.
- The in-app birthday banner is a same-day fallback that doesn't depend on notification permission.

---

## 11. Costs and when they actually kick in

| Thing | Free tier covers you until... | What it costs beyond that |
|---|---|---|
| Firebase Firestore/Auth/Storage | Generous free quota, personal use won't approach it | Pay-as-you-go on Blaze plan if you exceed it |
| Cloud Functions calling Gemini | Works on free Spark plan for the function itself, but **outbound calls to external APIs from Cloud Functions require the Blaze plan** — you'll need to enable Blaze to call Gemini from a Function at all, even though Gemini itself is free | Blaze has its own free tier baked in; you're adding a card on file, not necessarily a bill |
| Gemini API (transcription + extraction) | Free tier, no card required, daily quota in the low thousands of requests — plenty for personal recording volume | Pay-per-token if you ever exceed the free quota |
| EAS Build | Free tier, limited builds/month | Paid plan for more/faster builds |
| Android testing | Sideloading an APK to your own device is free | $25 one-time for Google Play Console, only needed to publish |
| iOS testing | Free Apple ID + Xcode installs to your own device, re-signs every 7 days | $99/yr Apple Developer account, only needed for a build that doesn't expire weekly or for TestFlight/App Store |

Bottom line: you can build and use this entirely free except for the Blaze-plan requirement to let Cloud Functions reach Gemini — and Blaze itself won't bill you unless your actual usage exceeds its free quota, which personal use won't.

---

## 12. Explicit non-goals (for this v1)

- **Semantic/vector search** — deferred. Keyword search only. Revisit later with Firestore's native vector search (KNN) or a dedicated vector DB if this ever goes beyond personal use.
- **Hybrid search** — moot without semantic search.
- **Voice shortcuts, lock screen widget, CarPlay/Android Auto** — cut. Real native work (widget/shortcuts) or gatekept by Apple's entitlement system (CarPlay) in ways that aren't worth scoping even as a "someday."
- **Sharing/collaboration** — single user only.
- **Relationship-strength auto-calculation** — closeness stays manually set.

---

## 13. Build phases (for Claude Code, in order)

1. **Scaffold**: `npx create-expo-app` with TypeScript template, Expo Router, GitHub repo initialized and pushed.
2. **Firebase setup**: Auth, Firestore (offline persistence), Storage. Wire up `.env` handling for client-side config.
3. **Theme system**: implement the `THEMES` (dark/light) token object and category accent pairs from Section 7 before building screens. Default to dark.
4. **Auth flow**: sign in / sign up, auth state listener, protected routes.
5. **Data layer**: Firestore read/write functions for people and captures per Section 2.
6. **Cloud Functions + Gemini setup**: enable Blaze plan, set the Gemini API key as a Functions environment secret, deploy a basic test function first to confirm the pipeline (billing, permissions, deployment) before building real logic.
7. **Capture pipeline, record → transcribe**: recording UI, upload to Storage, Cloud Function calling Gemini for transcription. Test thoroughly before adding extraction.
8. **Capture pipeline, extract → confirm**: Gemini extraction call, plus the confirm/edit screen (Section 4, steps 6-7).
9. **People list and person detail screens**: all sections as stacked cards, capture history list, manual note entry, editable closeness.
10. **Add/edit person screen (manual entry)**: category-conditional fields, photo picker + upload.
11. **Unfiled/orphan bucket and merge flow**.
12. **Search screen**: keyword search across transcripts, facts, and notes.
13. **Notifications**: permission request, birthday scheduling logic per Section 10.
14. **Settings screen**: theme toggle, notification lead time, permission management, sign out.
15. **Polish pass**: empty/loading/error states — especially around transcription/extraction, which won't be instant, and shouldn't lose audio or anchors if the AI call fails.
16. **EAS setup**: `eas build:configure`, build profiles, first internal build.

Test the capture pipeline (steps 7-8) extensively on-device early — it's the riskiest, most novel part of the app and worth de-risking before building everything downstream of it.
