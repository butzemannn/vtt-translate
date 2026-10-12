// Speichert Übersetzungen an der Seite; Original liegt als Flag am selben Dokument.
export const MODULE_ID = "vtt-translate";
const FLAG = "translation";

/** Original-HTML der Seite (vor der ersten Übersetzung). */
export function getOriginal(page) {
  return page.getFlag(MODULE_ID, FLAG)?.original ?? page.text.content;
}

export function isTranslated(page) {
  return !!page.getFlag(MODULE_ID, FLAG);
}

/** Schreibt die Übersetzung; das Original wird nur beim ersten Mal gesichert. */
export async function saveTranslation(page, html, { model, failed }) {
  await page.update({
    "text.content": html,
    [`flags.${MODULE_ID}.${FLAG}`]: {
      original: getOriginal(page),
      status: failed ? "partial" : "translated",
      model,
      translatedAt: Date.now()
    }
  });
}

/** Stellt das Original wieder her und entfernt die Übersetzungsdaten. */
export async function restoreOriginal(page) {
  const data = page.getFlag(MODULE_ID, FLAG);
  if (!data) return false;
  await page.update({ "text.content": data.original });
  await page.unsetFlag(MODULE_ID, FLAG);
  return true;
}
