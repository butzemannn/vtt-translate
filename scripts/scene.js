// Sammelt die Journal-Seiten einer Szene: alle über Notizen (Map-Pins) verlinkten Seiten
// plus Seiten, auf die diese per @UUID verweisen (eine Ebene, z. B. Gegenstände).
// Ohne Foundry-Abhängigkeit: resolve(uuid, page) löst einen Link relativ zur Seite auf.

const PAGE_LINK = /@UUID\[([^\]]+)\]/g;

/**
 * @param {{notes: Iterable<{entry?: object, page?: object}>}} scene
 * @param {(uuid: string, relativeTo: object) => object|null} resolve
 * @param {(page: object) => string} contentOf  Text, in dem Links gesucht werden (Original)
 * @returns {object[]} Textseiten ohne Doppelte, in Reihenfolge der Pins
 */
export function collectScenePages(scene, resolve, contentOf) {
  const pages = new Map();
  const add = page => { if (page?.type === "text" && !pages.has(page.uuid)) pages.set(page.uuid, page); };

  for (const note of scene.notes) {
    if (note.page) add(note.page);
    else if (note.entry) [...note.entry.pages].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).forEach(add);
  }

  for (const page of [...pages.values()]) {
    for (const [, target] of (contentOf(page) ?? "").matchAll(PAGE_LINK)) {
      const linked = resolve(target, page);
      if (linked?.documentName === "JournalEntryPage") add(linked);
    }
  }
  return [...pages.values()];
}
