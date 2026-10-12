// Einstiegspunkt: Einstellungen und Knöpfe im Journal-Fenster.
import { MODULE_ID, getOriginal, isTranslated, saveTranslation, restoreOriginal } from "./store.js";
import { translateHtml } from "./translator.js";
import { createProvider } from "./providers/index.js";

const running = new Set();

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "provider", {
    name: "VTTTRANSLATE.Settings.Provider.Name",
    scope: "world",
    config: true,
    type: String,
    choices: { claude: "Claude (Anthropic)", openrouter: "OpenRouter" },
    default: "claude"
  });
  game.settings.register(MODULE_ID, "model", {
    name: "VTTTRANSLATE.Settings.Model.Name",
    hint: "VTTTRANSLATE.Settings.Model.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "claude-opus-5-5"
  });
  game.settings.register(MODULE_ID, "apiKey", {
    name: "VTTTRANSLATE.Settings.ApiKey.Name",
    hint: "VTTTRANSLATE.Settings.ApiKey.Hint",
    scope: "client",
    config: true,
    type: String,
    default: ""
  });
});

Hooks.on("getHeaderControlsJournalEntrySheet", (app, controls) => {
  if (!game.user.isGM) return;
  controls.push(
    {
      action: "vttTranslatePage",
      icon: "fa-solid fa-language",
      label: "VTTTRANSLATE.Controls.Translate",
      onClick: () => translatePage(currentPage(app))
    },
    {
      action: "vttRestorePage",
      icon: "fa-solid fa-rotate-left",
      label: "VTTTRANSLATE.Controls.Restore",
      onClick: () => restorePage(currentPage(app))
    }
  );
});

/** Aktuell angezeigte Seite des Journal-Fensters. */
function currentPage(app) {
  const pages = app.document.pages;
  return pages.get(app.pageId) ?? pages.contents.sort((a, b) => a.sort - b.sort)[0];
}

function folderPath(entry) {
  const folder = entry.folder;
  if (!folder) return "";
  return [...folder.ancestors].reverse().concat(folder).map(f => f.name).join(" / ");
}

async function translatePage(page) {
  if (!page || page.type !== "text") return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Notify.NoTextPage"));
  if (running.has(page.uuid)) return;

  const apiKey = game.settings.get(MODULE_ID, "apiKey");
  if (!apiKey) return ui.notifications.error(game.i18n.localize("VTTTRANSLATE.Notify.NoApiKey"));
  const model = game.settings.get(MODULE_ID, "model");

  running.add(page.uuid);
  ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Started", { name: page.name }));
  try {
    const provider = createProvider(game.settings.get(MODULE_ID, "provider"), { apiKey, model });
    const entry = page.parent;
    const result = await translateHtml({
      html: getOriginal(page), // immer vom Original aus übersetzen
      context: { journal: entry.name, folder: folderPath(entry), page: page.name },
      provider
    });
    await saveTranslation(page, result.html, { model, failed: result.failed });

    if (result.failed) ui.notifications.warn(game.i18n.format("VTTTRANSLATE.Notify.Partial", { name: page.name, failed: result.failed, total: result.total }));
    else ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Done", { name: page.name }));
  } catch (err) {
    console.error(`${MODULE_ID} |`, err);
    ui.notifications.error(game.i18n.format("VTTTRANSLATE.Notify.Error", { name: page.name, error: err.message }));
  } finally {
    running.delete(page.uuid);
  }
}

async function restorePage(page) {
  if (!page || !isTranslated(page)) return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Notify.NotTranslated"));
  await restoreOriginal(page);
  ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Restored", { name: page.name }));
}
