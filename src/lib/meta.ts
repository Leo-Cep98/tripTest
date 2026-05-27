// Lightweight metadata encoder. We embed structured fields (price, link, photos…)
// inside the existing `notes` text column so we don't need a DB migration.
// The marker is an HTML comment so it never renders if notes are ever shown
// raw in some other surface, and it's extremely unlikely to collide with text
// a real user writes.

const META_RE = /\s*<!--meta:(\{.*?\})-->\s*$/s;

export interface ItineraryMeta {
  price?: number;
  link?: string;
}

export interface TripMeta {
  photos?: string[];
}

export function parseMeta<T extends Record<string, unknown>>(
  notes: string | null | undefined,
): { text: string; meta: T } {
  if (!notes) return { text: "", meta: {} as T };
  const m = notes.match(META_RE);
  if (!m) return { text: notes, meta: {} as T };
  let meta: T;
  try {
    meta = JSON.parse(m[1]) as T;
  } catch {
    meta = {} as T;
  }
  const text = notes.replace(META_RE, "").trimEnd();
  return { text, meta };
}

export function buildNotes(text: string, meta: Record<string, unknown>): string | null {
  const cleanedText = (text ?? "").trimEnd();
  // Drop falsy/empty meta keys so we don't store {price: ""} type junk
  const cleanMeta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    cleanMeta[k] = v;
  }
  const hasMeta = Object.keys(cleanMeta).length > 0;
  if (!cleanedText && !hasMeta) return null;
  if (!hasMeta) return cleanedText;
  const marker = `<!--meta:${JSON.stringify(cleanMeta)}-->`;
  return cleanedText ? `${cleanedText}\n${marker}` : marker;
}
