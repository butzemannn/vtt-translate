// Speichert Übersetzungen an der Seite; Original liegt als Flag am selben Dokument.
export const MODULE_ID = "vtt-translate";
const FLAG = "translation";

/** Kurzer Hash (FNV-1a) – erkennt, ob eine Übersetzung nachträglich von Hand geändert wurde. */
export function hashText(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function getTranslation(page) {
  return page.getFlag(MODULE_ID, FLAG);
}

/** Original-HTML der Seite (vor der ersten Übersetzung). */
export function getOriginal(page) {
  return getTranslation(page)?.original ?? page.text.content ?? "";
}

export function isTranslated(page) {
  return !!getTranslation(page);
}

/**
 * Status einer Seite aus den gespeicherten Daten.
 * @returns {"open"|"translated"|"partial"|"edited"}
 */
export function pageStatus(page) {
  const data = getTranslation(page);
  if (!data) return "open";
  if (data.hash && data.hash !== hashText(page.text.content ?? "")) return "edited";
  return data.status;
}

/**
 * Schreibt die Übersetzung; das Original wird nur beim ersten Mal gesichert.
 * measure = Zeichenzahlen der Anfrage, usage = echte Tokens (für die Kalibrierung der Schätzung).
 */
export async function saveTranslation(page, html, { model, failed, usage, measure }) {
  await page.update({
    "text.content": html,
    [`flags.${MODULE_ID}.${FLAG}`]: {
      original: getOriginal(page),
      status: failed ? "partial" : "translated",
      model,
      usage,
      measure,
      translatedAt: Date.now()
    }
  });
  // Hash vom gespeicherten Stand bilden (Server kann HTML leicht normalisieren).
  await page.update({ [`flags.${MODULE_ID}.${FLAG}.hash`]: hashText(page.text.content ?? "") });
}

/** Stellt das Original wieder her und entfernt die Übersetzungsdaten. */
export async function restoreOriginal(page) {
  const data = getTranslation(page);
  if (!data) return false;
  await page.update({ "text.content": data.original });
  await page.unsetFlag(MODULE_ID, FLAG);
  return true;
}
