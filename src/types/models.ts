// Firestore document shapes per build spec section 2.
// Firestore structure: users/{uid}/people/{personId}, users/{uid}/captures/{captureId}

import type { Category } from '@/constants/categories';

export interface Person {
  id: string;
  name: string;
  category: Category;
  closeness: 1 | 2 | 3 | 4 | 5;
  photoUrl?: string;

  fields: Record<string, string>;

  phone?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;

  birthday?: string; // "MM-DD"
  importantDates: { label: string; date: string }[];
  giftIdeas?: string;

  facts: string[];
  notes: { date: string; text: string }[];
  lastContacted: string; // ISO date

  createdAt: string;
  updatedAt: string;
}

export interface CaptureExtracted {
  name?: string;
  category?: Category;
  facts: string[];
  dates: { label: string; date: string }[];
}

export interface CaptureAnchors {
  timestamp: string;
  location?: { lat: number; lng: number; label?: string };
  calendarEvent?: string;
}

export interface Capture {
  id: string;
  personId: string | null; // null = orphan, not yet attached to a person
  audioUrl?: string;
  transcript: string;
  extracted: CaptureExtracted;
  anchors: CaptureAnchors;
  createdAt: string;
}
