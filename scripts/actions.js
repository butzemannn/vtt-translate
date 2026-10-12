// Übersetzen/Wiederherstellen einer Seite in Foundry – genutzt vom Journal-Knopf und der Warteschlange.
import { MODULE_ID, getOriginal, saveTranslation, restoreOriginal } from "./store.js";
import { translateHtml, measureHtml } from "./translator.js";
import { createProvider } from "./providers/index.js";

function folderPath(entry) {
  const folder = entry.folder;
  if (!folder) return "";
  return [...folder.ancestors].reverse().concat(folder).map(f => f.name).join(" / ");
}

export function pageContext(page) {
  const entry = page.parent;
  return { journal: entry.name, folder: folderPath(entry), page: page.name };
}

/**
 * Übersetzt eine Seite und speichert das Ergebnis. Wirft bei Fehlern.
 * @returns {Promise<{failed: number, total: number}>}
 */
export async function translatePage(page) {
  if (page?.type !== "text") throw new Error(game.i18n.localize("VTTTRANSLATE.Notify.NoTextPage"));
  const apiKey = game.settings.get(MODULE_ID, "apiKey");
  if (!apiKey) throw new Error(game.i18n.localize("VTTTRANSLATE.Notify.NoApiKey"));
  const model = game.settings.get(MODULE_ID, "model");
  const provider = createProvider(game.settings.get(MODULE_ID, "provider"), { apiKey, model });

  const html = getOriginal(page); // immer vom Original aus übersetzen
  const context = pageContext(page);
  const result = await translateHtml({ html, context, provider });
  await saveTranslation(page, result.html, { model, failed: result.failed, usage: result.usage, measure: measureHtml(html, context) });
  return result;
}

export { restoreOriginal as restorePage };
