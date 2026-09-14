# Recall — polish phases

Cosmetic and small feature additions on top of the working app. Same approach as the original build spec: one or two phases at a time, test before moving on. After each phase, confirm it works, then ask to move to the next.

---

## Phase 1 — Recording animation

Add a pulse/waveform animation to the record button while actively recording, per the design spec — it should read as clear visual confirmation that capture is in progress.

---

## Phase 2 — Layout fixes + status bar + pull-to-refresh

1. Move the record button on the home screen below the typed-entry box, positioned in the natural thumb-reach zone near the bottom of the screen (not top or middle).
2. On the capture confirm/edit screen, fix "Confirm capture" and "Cancel" getting clipped by the status bar/notch — wrap the screen content in SafeAreaView (or use `useSafeAreaInsets`) so nothing renders under the status bar, and push those buttons down accordingly.
3. Add a placeholder logo/icon in the space now open at the top of the home screen (where the record button used to be) — a simple placeholder component, real logo to be swapped in later.
4. Make the phone status bar icons match the active theme (light content on dark mode, dark content on light mode), flipping automatically with the theme toggle.
5. Add pull-to-refresh on the people list screen.

---

## Phase 3 — Swipe to delete + undo

Add swipe-to-delete on notes and facts within a person's profile. Pair it with an undo toast/snackbar that appears for a few seconds after any delete, letting the user restore it before it's permanently removed.

---

## Phase 4 — Contact staleness cue

In the people list, shift the "Xd since contact" text color subtly (not alarming, just a visual cue) once it passes 30 days since last contact, so overdue relationships are visible at a glance.

---

## Phase 5 — Unfiled badge

Add a small count badge on the Home screen (or wherever Unfiled is accessed from) showing how many captures are sitting in the Unfiled/orphan bucket, so they don't get forgotten.

---

## Phase 6 — Duplicate-name warning

When manually adding a person, or when attaching a capture during the confirm flow, check for existing people with a similar/matching name and warn before creating a duplicate profile for someone who likely already exists.

---

## Phase 7 — Skeleton loading states

Replace spinners with skeleton loading states (gray placeholder cards matching the real card layout) while Firestore or Gemini calls are in flight, across the people list, person detail, and capture confirm screens.

---

## Phase 8 — Camera capture for photos

Add a camera option alongside the existing photo library picker when setting a person's photo, so a photo can be taken directly after meeting someone instead of requiring the camera roll.
