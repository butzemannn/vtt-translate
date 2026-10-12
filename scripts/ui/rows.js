// Baut die Zeilen der Zentrale: Ordner → Journale → Seiten, gefiltert, mit Auswahl- und Statussummen.
// Arbeitet nur mit einfachen Objekten (id, name, sort, folder, pages), daher ohne Foundry testbar.

export const STATUS = {
  open: { icon: "fa-regular fa-circle" },
  queued: { icon: "fa-regular fa-clock" },
  active: { icon: "fa-solid fa-spinner fa-spin" },
  translated: { icon: "fa-solid fa-circle-check" },
  partial: { icon: "fa-solid fa-circle-half-stroke" },
  edited: { icon: "fa-solid fa-pen" },
  error: { icon: "fa-solid fa-triangle-exclamation" }
};

const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name);
const parentId = doc => doc.folder?.id ?? doc.folder ?? null;

/** Status-Zusammenfassung mehrerer Seiten (für Journal/Ordner). */
export function summarize(statuses) {
  const count = s => statuses.filter(x => x === s).length;
  const total = statuses.length;
  const done = count("translated") + count("edited");
  let status = "open";
  if (count("active") || count("queued")) status = "active";
  else if (count("error")) status = "error";
  else if (total && done === total) status = "translated";
  else if (done || count("partial")) status = "partial";
  return { status, done, total };
}

/**
 * @param {object} args
 * @param {object[]} args.folders   Journal-Ordner
 * @param {object[]} args.entries   Journale mit pages
 * @param {(page) => string} args.statusOf
 * @param {Set<string>} args.selected   ausgewählte Seiten-UUIDs
 * @param {Set<string>} args.expanded   aufgeklappte Journal-IDs
 * @param {Set<string>} args.collapsed  zugeklappte Ordner-IDs
 * @param {string} [args.filter]        Status oder "all"
 * @param {string} [args.search]
 * @returns {{rows: object[], visible: string[]}}  visible = alle sichtbaren Seiten-UUIDs
 */
export function buildRows({ folders, entries, statusOf, selected, expanded, collapsed, filter = "all", search = "" }) {
  const term = search.trim().toLowerCase();
  const rows = [];
  const visible = [];

  const pageMatches = (page, entry) => {
    if (filter !== "all" && statusOf(page) !== filter) return false;
    if (!term) return true;
    return page.name.toLowerCase().includes(term) || entry.name.toLowerCase().includes(term);
  };

  // Liefert sichtbare Seiten eines Journals; fügt Zeilen nur hinzu, wenn emit = true.
  function visitEntry(entry, depth, emit) {
    const pages = [...entry.pages].filter(p => p.type === "text").sort(bySort).filter(p => pageMatches(p, entry));
    if (!pages.length) return [];
    if (emit) {
      const uuids = pages.map(p => p.uuid);
      const open = expanded.has(entry.id) || !!term;
      rows.push({ kind: "entry", id: entry.id, name: entry.name, depth, expanded: open, uuids, ...selection(uuids), ...summarize(pages.map(statusOf)) });
      if (open) {
        for (const p of pages) {
          rows.push({ kind: "page", id: p.uuid, uuid: p.uuid, name: p.name, depth: depth + 1, status: statusOf(p), checked: selected.has(p.uuid) });
        }
      }
      visible.push(...uuids);
    }
    return pages;
  }

  function visitFolder(folderId, depth, emit) {
    const childFolders = folders.filter(f => parentId(f) === folderId).sort(bySort);
    const childEntries = entries.filter(e => parentId(e) === folderId).sort(bySort);
    let pages = [];
    for (const folder of childFolders) {
      // Zeile vorab reservieren; Summen erst nach dem Besuch der Kinder bekannt.
      const index = rows.length;
      const open = emit && !collapsed.has(folder.id);
      if (emit) rows.push(null);
      const sub = visitFolder(folder.id, depth + 1, open);
      if (!emit) { pages = pages.concat(sub); continue; }
      if (!sub.length) { rows.splice(index, 1); continue; }
      const uuids = sub.map(p => p.uuid);
      if (!open) visible.push(...uuids);
      rows[index] = { kind: "folder", id: folder.id, name: folder.name, depth, expanded: open, uuids, ...selection(uuids), ...summarize(sub.map(statusOf)) };
      pages = pages.concat(sub);
    }
    for (const entry of childEntries) pages = pages.concat(visitEntry(entry, depth, emit));
    return pages;
  }

  function selection(uuids) {
    const n = uuids.filter(u => selected.has(u)).length;
    return { checked: n > 0 && n === uuids.length, indeterminate: n > 0 && n < uuids.length };
  }

  visitFolder(null, 0, true);
  return { rows, visible };
}
