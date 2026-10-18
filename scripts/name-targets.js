// Namen von Journalen, Ordnern, Szenen und Pins: sammeln, übersetzt speichern, wiederherstellen.
// Original je Feld in flags.vtt-translate.names.<feld> (null = nicht übersetzt).
// Ausnahme Seitennamen: Original in flags.vtt-translate.translation.originalName (wie beim Übersetzen der Seite).
import { MODULE_ID } from "./store.js";

export const NAME_KINDS = ["page", "journal", "folder", "scene", "note"];

const originals = doc => doc.flags?.[MODULE_ID]?.names ?? {};

/**
 * Alle Namensfelder der gewählten Arten.
 * @param {string[]} kinds
 * @param {{journals: object[], folders: object[], scenes: object[]}} world
 * @returns {{doc: object, field: string, flagPath: string, kind: string, text: string, context: string, translated: boolean}[]}
 */
export function nameTargets(kinds, { journals, folders, scenes }) {
  const targets = [];
  const add = (doc, field, kind, context) => {
    const original = originals(doc)[field];
    const text = original ?? doc[field];
    if (text?.trim()) targets.push({ doc, field, flagPath: `flags.${MODULE_ID}.names.${field}`, kind, text, context, translated: original != null });
  };
  // Nur Seiten, deren Text schon übersetzt ist – sonst stünde ein deutscher Name über englischem Text.
  if (kinds.includes("page")) {
    for (const j of journals) {
      for (const page of j.pages ?? []) {
        const data = page.flags?.[MODULE_ID]?.translation;
        if (!data) continue;
        const text = data.originalName ?? page.name;
        if (text?.trim()) targets.push({ doc: page, field: "name", flagPath: `flags.${MODULE_ID}.translation.originalName`, kind: "page", text, context: j.name, translated: data.originalName != null });
      }
    }
  }
  if (kinds.includes("journal")) for (const j of journals) add(j, "name", "journal", j.folder?.name ?? "");
  if (kinds.includes("folder")) for (const f of folders) add(f, "name", "folder", f.type === "Scene" ? "scene folder" : "journal folder");
  if (kinds.includes("scene")) {
    for (const s of scenes) {
      add(s, "name", "scene", "");
      add(s, "navName", "scene", "navigation label");
    }
  }
  if (kinds.includes("note")) for (const s of scenes) for (const n of s.notes) add(n, "text", "note", s.name);
  return targets;
}

/**
 * Speichert Änderungen gebündelt je Dokumentart (bzw. je Szene für Pins).
 * @param {{doc: object, changes: object}[]} items
 */
async function updateGrouped(items) {
  const groups = new Map();
  for (const { doc, changes } of items) {
    const key = doc.parent ? `${doc.parent.uuid}|${doc.documentName}` : doc.documentName;
    if (!groups.has(key)) groups.set(key, { doc, updates: [] });
    groups.get(key).updates.push({ _id: doc.id, ...changes });
  }
  for (const { doc, updates } of groups.values()) {
    if (doc.parent) await doc.parent.updateEmbeddedDocuments(doc.documentName, updates);
    else await doc.constructor.updateDocuments(updates);
  }
}

/** Übersetzte Namen schreiben; Original nur beim ersten Mal sichern. */
export function applyNames(targets, texts) {
  const items = [];
  targets.forEach((t, i) => {
    if (!texts[i]) return;
    items.push({ doc: t.doc, changes: { [t.field]: texts[i], [t.flagPath]: t.text } });
  });
  return updateGrouped(items).then(() => items.length);
}

/** Originalnamen zurückschreiben. */
export function restoreNames(targets) {
  const items = targets.filter(t => t.translated).map(t => ({ doc: t.doc, changes: { [t.field]: t.text, [t.flagPath]: null } }));
  return updateGrouped(items).then(() => items.length);
}
