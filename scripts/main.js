// Einstiegspunkt: Einstellungen, Knöpfe im Journal-Fenster, Zentrale und Seitenleiste.
import { MODULE_ID, isTranslated, pageStatus } from "./store.js";
import { translatePage, restorePage } from "./actions.js";
import { TranslationQueue } from "./queue.js";
import { TranslationCenter } from "./ui/center.js";
import { STATUS, summarize } from "./ui/rows.js";

const running = new Set();
let queue;
let center;

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
  // Offene Batch-Seiten, damit ein Lauf nach Neuladen fortgesetzt werden kann.
  game.settings.register(MODULE_ID, "queue", { scope: "client", config: false, type: Object, default: {} });
});

Hooks.once("ready", () => {
  if (!game.user.isGM) return;
  const refreshSidebar = foundry.utils.debounce(() => ui.journal?.render(), 1000);
  queue = new TranslationQueue({
    worker: async uuid => {
      await translatePage(await fromUuid(uuid));
      refreshSidebar();
    },
    saved: game.settings.get(MODULE_ID, "queue"),
    save: state => game.settings.set(MODULE_ID, "queue", state),
    onChange: () => center?.refresh()
  });
  game.modules.get(MODULE_ID).api = { openCenter };
  ui.journal?.render(); // Seitenleiste wurde vor "ready" ohne Knopf gerendert
  if (queue.pending.length) ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Resumable", { count: queue.pending.length }));
});

function openCenter() {
  center ??= new TranslationCenter(queue);
  center.render({ force: true });
}

// Änderungen an Seiten (auch von Hand) in der Zentrale nachziehen.
Hooks.on("updateJournalEntryPage", () => center?.refresh());

// Seitenleiste: Knopf zur Zentrale und Status-Symbol je Journal.
Hooks.on("renderJournalDirectory", (app, html) => {
  if (!game.user.isGM || !queue) return;
  const root = html instanceof HTMLElement ? html : html[0];

  if (!root.querySelector(".vtt-translate-open")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vtt-translate-open";
    button.innerHTML = `<i class="fa-solid fa-language"></i> ${game.i18n.localize("VTTTRANSLATE.Center.Title")}`;
    button.addEventListener("click", openCenter);
    (root.querySelector(".header-actions") ?? root.querySelector("header") ?? root).append(button);
  }

  for (const li of root.querySelectorAll("[data-entry-id]")) {
    const entry = game.journal.get(li.dataset.entryId);
    const pages = entry?.pages.filter(p => p.type === "text") ?? [];
    if (!pages.length) continue;
    const { status, done, total } = summarize(pages.map(p => queue.statusOf(p.uuid) ?? pageStatus(p)));
    if (status === "open") continue;
    const icon = document.createElement("i");
    icon.className = `vtt-translate-status status-${status} ${STATUS[status].icon}`;
    icon.dataset.tooltip = `${game.i18n.localize(`VTTTRANSLATE.Status.${status}`)} (${done}/${total})`;
    (li.querySelector(".entry-name, .document-name") ?? li).append(icon);
  }
});

Hooks.on("getHeaderControlsJournalEntrySheet", (app, controls) => {
  if (!game.user.isGM) return;
  controls.push(
    {
      action: "vttTranslatePage",
      icon: "fa-solid fa-language",
      label: "VTTTRANSLATE.Controls.Translate",
      onClick: () => translateCurrent(currentPage(app))
    },
    {
      action: "vttRestorePage",
      icon: "fa-solid fa-rotate-left",
      label: "VTTTRANSLATE.Controls.Restore",
      onClick: () => restoreCurrent(currentPage(app))
    }
  );
});

/** Aktuell angezeigte Seite des Journal-Fensters. */
function currentPage(app) {
  const pages = app.document.pages;
  return pages.get(app.pageId) ?? pages.contents.sort((a, b) => a.sort - b.sort)[0];
}

async function translateCurrent(page) {
  if (!page || running.has(page.uuid)) return;
  running.add(page.uuid);
  ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Started", { name: page.name }));
  try {
    const result = await translatePage(page);
    if (result.failed) ui.notifications.warn(game.i18n.format("VTTTRANSLATE.Notify.Partial", { name: page.name, failed: result.failed, total: result.total }));
    else ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Done", { name: page.name }));
  } catch (err) {
    console.error(`${MODULE_ID} |`, err);
    ui.notifications.error(game.i18n.format("VTTTRANSLATE.Notify.Error", { name: page.name, error: err.message }));
  } finally {
    running.delete(page.uuid);
  }
}

async function restoreCurrent(page) {
  if (!page || !isTranslated(page)) return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Notify.NotTranslated"));
  await restorePage(page);
  ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Restored", { name: page.name }));
}
