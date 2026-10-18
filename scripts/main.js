// Einstiegspunkt: Einstellungen, Knöpfe im Journal-Fenster, Zentrale und Seitenleiste.
import { MODULE_ID, isTranslated, pageStatus, getOriginal } from "./store.js";
import { collectScenePages } from "./scene.js";
import { translatePage, restorePage } from "./actions.js";
import { TranslationQueue } from "./queue.js";
import { TranslationCenter } from "./ui/center.js";
import { STATUS, summarize } from "./ui/rows.js";
import { openGlossary, openReview, refreshWindows } from "./ui/windows.js";

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
  game.settings.register(MODULE_ID, "autoTranslate", {
    name: "VTTTRANSLATE.Settings.AutoTranslate.Name",
    hint: "VTTTRANSLATE.Settings.AutoTranslate.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, "glossary", { scope: "world", config: false, type: Object, default: { entries: [] } });
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
  game.modules.get(MODULE_ID).api = { openCenter, openGlossary, openReview, prepareScene };
  ui.journal?.render(); // Seitenleiste wurde vor "ready" ohne Knopf gerendert
  if (queue.pending.length) ui.notifications.info(game.i18n.format("VTTTRANSLATE.Notify.Resumable", { count: queue.pending.length }));
});

/** Öffnet die Zentrale; optional mit vorausgewählten Seiten. */
function openCenter({ select } = {}) {
  center ??= new TranslationCenter(queue, { prepareScene });
  if (select) center.selectOnly(select);
  center.render({ force: true });
}

/** Szene vorbereiten: alle über Pins verlinkten Seiten (plus verlinkte Gegenstände) in der Zentrale auswählen. */
function prepareScene(scene = canvas?.scene) {
  if (!scene) return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Scene.NoScene"));
  const resolve = (uuid, page) => {
    try {
      return fromUuidSync(uuid, { relative: page, strict: false });
    } catch {
      return null;
    }
  };
  const pages = collectScenePages(scene, resolve, getOriginal);
  if (!pages.length) return ui.notifications.warn(game.i18n.format("VTTTRANSLATE.Scene.NoPages", { name: scene.name }));
  const open = pages.filter(p => ["open", "partial"].includes(pageStatus(p)));
  ui.notifications.info(game.i18n.format("VTTTRANSLATE.Scene.Prepared", { name: scene.name, total: pages.length, open: open.length }));
  openCenter({ select: open.map(p => p.uuid) });
}

// Kontextmenü der Szenen-Seitenleiste (v14: label/icon/visible/onClick).
Hooks.on("getSceneContextOptions", (app, items) => {
  items.push({
    label: game.i18n.localize("VTTTRANSLATE.Scene.Prepare"),
    icon: "fa-solid fa-language",
    visible: () => game.user.isGM && !!queue,
    onClick: (event, target) => prepareScene(game.scenes.get(target.closest("[data-entry-id]")?.dataset.entryId))
  });
});

// Optional: noch offene Seiten beim ersten Öffnen eines Journals übersetzen.
Hooks.on("renderJournalEntrySheet", (app, element, context, options) => {
  if (!options?.isFirstRender || !game.user.isGM || !queue || !game.settings.get(MODULE_ID, "autoTranslate")) return;
  const open = app.document.pages.filter(p => p.type === "text" && pageStatus(p) === "open" && !queue.statusOf(p.uuid));
  if (!open.length) return;
  queue.add(open.map(p => p.uuid));
  ui.notifications.info(game.i18n.format("VTTTRANSLATE.Scene.AutoStarted", { name: app.document.name, count: open.length }));
});

// Änderungen an Seiten (auch von Hand) in der Zentrale nachziehen.
Hooks.on("updateJournalEntryPage", () => {
  center?.refresh();
  refreshWindows();
});

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
      action: "vttReviewPage",
      icon: "fa-solid fa-magnifying-glass",
      label: "VTTTRANSLATE.Review.Open",
      onClick: () => openReview([currentPage(app)?.uuid].filter(Boolean))
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
