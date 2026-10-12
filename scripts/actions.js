// Übersetzen/Wiederherstellen einer Seite in Foundry – genutzt vom Journal-Knopf und der Warteschlange.
import { MODULE_ID, getOriginal, saveTranslation, restoreOriginal } from "./store.js";
import { translateHtml, measureHtml } from "./translator.js";
import { plainText } from "./html.js";
import { relevantTerms } from "./glossary.js";
import { createProvider } from "./providers/index.js";

function folderPath(entry) {
  const folder = entry.folder;
  if (!folder) return "";
  return [...folder.ancestors].reverse().concat(folder).map(f => f.name).join(" / ");
}

export function getGlossary() {
  return game.settings.get(MODULE_ID, "glossary").entries ?? [];
}

export function setGlossary(entries) {
  return game.settings.set(MODULE_ID, "glossary", { entries });
}

/** Glossar-Einträge, die auf der Seite (Text oder Titel) vorkommen. */
export function pageGlossary(page, html = getOriginal(page)) {
  return relevantTerms(getGlossary(), `${page.name}\n${plainText(html)}`);
}

export function pageContext(page) {
  const entry = page.parent;
  return { journal: entry.name, folder: folderPath(entry), page: page.name };
}

/** Provider gemäß Einstellungen; wirft ohne API-Key. */
export function currentProvider() {
  const apiKey = game.settings.get(MODULE_ID, "apiKey");
  if (!apiKey) throw new Error(game.i18n.localize("VTTTRANSLATE.Notify.NoApiKey"));
  const model = game.settings.get(MODULE_ID, "model");
  return { provider: createProvider(game.settings.get(MODULE_ID, "provider"), { apiKey, model }), model };
}

/**
 * Übersetzt eine Seite und speichert das Ergebnis. Wirft bei Fehlern.
 * @param {string} [hint]  zusätzliche Anweisung (Prüf-Ansicht „neu übersetzen mit Hinweis“)
 * @returns {Promise<{failed: number, total: number}>}
 */
export async function translatePage(page, { hint } = {}) {
  if (page?.type !== "text") throw new Error(game.i18n.localize("VTTTRANSLATE.Notify.NoTextPage"));
  const { provider, model } = currentProvider();

  const html = getOriginal(page); // immer vom Original aus übersetzen
  const context = pageContext(page);
  const glossary = pageGlossary(page, html);
  const started = Date.now();
  const result = await translateHtml({ html, context, glossary, hint, provider });
  const duration = (Date.now() - started) / 1000;
  await saveTranslation(page, result.html, { model, failed: result.failed, usage: result.usage, measure: measureHtml(html, context, glossary), duration });
  return result;
}

export { restoreOriginal as restorePage };
