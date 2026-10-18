// Übersetzungs-Zentrale: alle Journale mit Status, Auswahl, Kostenschätzung und Batch-Steuerung.
import { MODULE_ID, pageStatus, getOriginal, getTranslation } from "../store.js";
import { plainText } from "../html.js";
import { suggestTerms, mergeSuggestions } from "../glossary.js";
import { openGlossary, openReview } from "./windows.js";
import { measureHtml } from "../translator.js";
import { loadPrices, calibrate, estimateCost, estimateSeconds, formatDuration, toOpenRouterId, COMPARE_MODELS } from "../estimate.js";
import { buildRows, STATUS } from "./rows.js";
import { pageContext, restorePage, currentProvider, getGlossary, setGlossary } from "../actions.js";
import { CONCURRENCY } from "../queue.js";
import { NAME_KINDS, nameTargets, applyNames, restoreNames } from "../name-targets.js";
import { translateNames } from "../names.js";
import { relevantTerms } from "../glossary.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const TEMPLATES = `modules/${MODULE_ID}/templates/center`;

export class TranslationCenter extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "vtt-translate-center",
    classes: ["vtt-translate-center"],
    window: { title: "VTTTRANSLATE.Center.Title", icon: "fa-solid fa-language", resizable: true },
    position: { width: 680, height: 760 },
    actions: {
      toggleExpand: TranslationCenter.#onToggleExpand,
      toggleSelect: TranslationCenter.#onToggleSelect,
      selectOpen: TranslationCenter.#onSelectOpen,
      clearSelection: TranslationCenter.#onClearSelection,
      translate: TranslationCenter.#onTranslate,
      pause: TranslationCenter.#onPause,
      resume: TranslationCenter.#onResume,
      cancel: TranslationCenter.#onCancel,
      restore: TranslationCenter.#onRestore,
      glossary: () => openGlossary(),
      suggest: TranslationCenter.#onSuggest,
      review: TranslationCenter.#onReview,
      scene: function () { this.prepareScene?.(); },
      names: TranslationCenter.#onNames
    }
  };

  static PARTS = {
    controls: { template: `${TEMPLATES}/controls.hbs` },
    list: { template: `${TEMPLATES}/list.hbs`, scrollable: [""] },
    footer: { template: `${TEMPLATES}/footer.hbs` }
  };

  /** @param {import("../queue.js").TranslationQueue} queue */
  /** @param {{prepareScene?: Function}} [hooks]  Rückruf für „Aktuelle Szene“ */
  constructor(queue, { prepareScene } = {}, options) {
    super(options);
    this.queue = queue;
    this.prepareScene = prepareScene;
    this.selected = new Set();
    this.expanded = new Set();
    this.collapsed = new Set();
    this.filter = "all";
    this.search = "";
    this.measures = new Map(); // uuid → {html, measure}, damit nicht bei jedem Rendern neu gezählt wird
    this.refresh = foundry.utils.debounce(() => this.rendered && this.render({ parts: ["list", "footer"] }), 300);
  }

  /** Auswahl ersetzen und die betroffenen Journale/Ordner aufklappen. */
  selectOnly(uuids) {
    this.selected = new Set(uuids);
    this.filter = "all";
    this.search = "";
    for (const uuid of uuids) {
      const entry = fromUuidSync(uuid)?.parent;
      if (!entry) continue;
      this.expanded.add(entry.id);
      for (let folder = entry.folder; folder; folder = folder.folder) this.collapsed.delete(folder.id);
    }
  }

  statusOf = page => this.queue.statusOf(page.uuid) ?? pageStatus(page);

  async _prepareContext(options) {
    const statusLabel = s => game.i18n.localize(`VTTTRANSLATE.Status.${s}`);
    const { rows } = buildRows({
      folders: game.folders.filter(f => f.type === "JournalEntry"),
      entries: game.journal.contents,
      statusOf: this.statusOf,
      selected: this.selected,
      expanded: this.expanded,
      collapsed: this.collapsed,
      filter: this.filter,
      search: this.search
    });
    for (const row of rows) {
      row.icon = STATUS[row.status].icon;
      row.statusLabel = statusLabel(row.status);
      row.indent = row.depth * 18;
      row.error = row.kind === "page" ? this.queue.errors.get(row.uuid) : undefined;
    }

    const filters = ["all", ...Object.keys(STATUS)].map(value => ({ value, label: value === "all" ? game.i18n.localize("VTTTRANSLATE.Center.FilterAll") : statusLabel(value), selected: value === this.filter }));
    const q = this.queue;
    const samples = this.#translatedFlags();
    // Restzeit: laufende Seiten zur Hälfte, wartende voll.
    const remainingChars = q.pending.reduce((sum, u) => sum + (this.#measure(fromUuidSync(u))?.outputChars ?? 0), 0)
      + [...q.active].reduce((sum, u) => sum + (this.#measure(fromUuidSync(u))?.outputChars ?? 0) / 2, 0);
    const eta = q.running && !q.paused ? estimateSeconds(remainingChars, samples, CONCURRENCY) : null;
    return {
      rows,
      filters,
      search: this.search,
      summary: await this.#summary(samples),
      suggesting: this.suggesting,
      queue: { running: q.running, paused: q.paused, hasPending: q.pending.length > 0, done: q.done, total: q.total, percent: q.total ? Math.round((q.done / q.total) * 100) : 0, errors: q.errors.size, eta: eta === null ? null : formatDuration(eta) }
    };
  }

  #translatedFlags() {
    return game.journal.contents.flatMap(e => e.pages.contents).map(getTranslation).filter(Boolean);
  }

  /** Anzahl, Wörter, Kosten und Dauer der Auswahl. */
  async #summary(samples) {
    const totals = { inputChars: 0, outputChars: 0, words: 0 };
    for (const uuid of this.selected) {
      const m = this.#measure(fromUuidSync(uuid));
      if (!m) continue;
      totals.inputChars += m.inputChars;
      totals.outputChars += m.outputChars;
      totals.words += m.words;
    }

    const rate = calibrate(samples);
    const seconds = estimateSeconds(totals.outputChars, samples, CONCURRENCY);
    const current = toOpenRouterId(game.settings.get(MODULE_ID, "provider"), game.settings.get(MODULE_ID, "model"));
    let costs = [];
    try {
      const prices = await loadPrices();
      costs = [...new Set([current, ...COMPARE_MODELS])]
        .filter(id => prices.has(id))
        .map(id => ({ name: prices.get(id).name, current: id === current, cost: estimateCost(totals, prices.get(id), rate).toFixed(2) }));
    } catch (err) {
      console.warn(`${MODULE_ID} | Preise nicht ladbar`, err);
    }
    return { pages: this.selected.size, words: totals.words.toLocaleString(), costs, calibrated: rate.calibrated, samples: rate.count, time: seconds === null ? null : formatDuration(seconds) };
  }

  #measure(page) {
    if (!page) return;
    const html = getOriginal(page);
    const cached = this.measures.get(page.uuid);
    if (cached?.html === html) return cached.measure;
    const measure = measureHtml(html, pageContext(page));
    this.measures.set(page.uuid, { html, measure });
    return measure;
  }

  // Scroll-Position der Liste über das Neuzeichnen retten.
  _preRender(context, options) {
    this.scrollTop = this.element?.querySelector(".vtt-list-scroll")?.scrollTop ?? this.scrollTop;
    return super._preRender(context, options);
  }

  _onRender(context, options) {
    const list = this.element.querySelector(".vtt-list-scroll");
    if (list && this.scrollTop) list.scrollTop = this.scrollTop;
    for (const box of this.element.querySelectorAll("input[data-indeterminate]")) box.indeterminate = true;
    if (options.parts.includes("controls")) {
      const search = this.element.querySelector("input[name=search]");
      search.addEventListener("input", foundry.utils.debounce(() => { this.search = search.value; this.render({ parts: ["list", "footer"] }); }, 250));
      this.element.querySelector("select[name=filter]").addEventListener("change", ev => { this.filter = ev.target.value; this.render({ parts: ["list", "footer"] }); });
    }
  }

  #rowUuids(target) {
    const row = target.closest("[data-uuids]");
    return row ? row.dataset.uuids.split(",") : [];
  }

  static #onToggleExpand(event, target) {
    const { kind, id } = target.closest("[data-kind]").dataset;
    const set = kind === "folder" ? this.collapsed : this.expanded;
    set.has(id) ? set.delete(id) : set.add(id);
    this.render({ parts: ["list"] });
  }

  static #onToggleSelect(event, target) {
    const uuids = this.#rowUuids(target);
    const select = target.checked;
    for (const uuid of uuids) select ? this.selected.add(uuid) : this.selected.delete(uuid);
    this.render({ parts: ["list", "footer"] });
  }

  static #onSelectOpen() {
    const { visible } = buildRows({ folders: game.folders.filter(f => f.type === "JournalEntry"), entries: game.journal.contents, statusOf: this.statusOf, selected: this.selected, expanded: this.expanded, collapsed: this.collapsed, filter: "all", search: this.search });
    for (const uuid of visible) {
      if (["open", "partial", "error"].includes(this.statusOf(fromUuidSync(uuid)))) this.selected.add(uuid);
    }
    this.render({ parts: ["list", "footer"] });
  }

  static #onClearSelection() {
    this.selected.clear();
    this.render({ parts: ["list", "footer"] });
  }

  static async #onTranslate() {
    const uuids = [...this.selected];
    if (!uuids.length) return;
    const pages = uuids.map(u => fromUuidSync(u)).filter(Boolean);
    const again = pages.filter(p => ["translated", "partial"].includes(pageStatus(p))).length;
    const edited = pages.filter(p => pageStatus(p) === "edited").length;
    if (again || edited) {
      const ok = await DialogV2.confirm({
        window: { title: "VTTTRANSLATE.Center.ConfirmTitle" },
        content: `<p>${game.i18n.format("VTTTRANSLATE.Center.ConfirmAgain", { again, edited })}</p>`
      });
      if (!ok) return;
    }
    this.selected.clear();
    this.queue.add(pages.map(p => p.uuid));
  }

  /** Seiten der Auswahl in Baumreihenfolge. */
  #selectedPages() {
    const { visible } = buildRows({ folders: game.folders.filter(f => f.type === "JournalEntry"), entries: game.journal.contents, statusOf: this.statusOf, selected: this.selected, expanded: this.expanded, collapsed: this.collapsed });
    return visible.filter(u => this.selected.has(u)).map(u => fromUuidSync(u)).filter(Boolean);
  }

  static async #onSuggest() {
    const pages = this.#selectedPages();
    if (!pages.length || this.suggesting) return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Center.SelectFirst"));
    const ok = await DialogV2.confirm({
      window: { title: "VTTTRANSLATE.Glossary.SuggestTitle" },
      content: `<p>${game.i18n.format("VTTTRANSLATE.Glossary.SuggestConfirm", { count: pages.length })}</p>`
    });
    if (!ok) return;

    this.suggesting = "…";
    this.render({ parts: ["footer"] });
    const note = ui.notifications.info(game.i18n.localize("VTTTRANSLATE.Glossary.Suggesting"), { progress: true });
    try {
      const { provider } = currentProvider();
      const texts = pages.map(p => `# ${p.parent.name} – ${p.name}\n${plainText(getOriginal(p))}`);
      const { terms } = await suggestTerms({
        texts,
        provider,
        known: getGlossary().map(g => g.source),
        onProgress: (done, total) => {
          this.suggesting = `${done}/${total}`;
          this.render({ parts: ["footer"] });
          note?.update?.({ pct: total ? done / total : 0, message: game.i18n.format("VTTTRANSLATE.Glossary.SuggestingProgress", { done, total }) });
        }
      });
      const { glossary, added } = mergeSuggestions(getGlossary(), terms);
      await setGlossary(glossary);
      ui.notifications.info(game.i18n.format("VTTTRANSLATE.Glossary.Suggested", { count: added }));
      openGlossary({ filter: "suggested" });
    } catch (err) {
      console.error(`${MODULE_ID} |`, err);
      ui.notifications.error(game.i18n.format("VTTTRANSLATE.Glossary.SuggestError", { error: err.message }));
    } finally {
      note?.remove?.();
      this.suggesting = false;
      this.render({ parts: ["footer"] });
    }
  }

  /** Prüf-Ansicht: ausgewählte übersetzte Seiten, sonst alle ungeprüften. */
  static #onReview() {
    let pages = this.#selectedPages().filter(p => pageStatus(p) !== "open");
    if (!pages.length) {
      const { visible } = buildRows({ folders: game.folders.filter(f => f.type === "JournalEntry"), entries: game.journal.contents, statusOf: this.statusOf, selected: this.selected, expanded: this.expanded, collapsed: this.collapsed });
      pages = visible.map(u => fromUuidSync(u)).filter(p => p && ["translated", "partial", "edited"].includes(pageStatus(p)));
    }
    if (!pages.length) return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Review.Empty"));
    openReview(pages.map(p => p.uuid));
  }

  /** Dialog: Journal-, Ordner-, Szenennamen und Pin-Beschriftungen übersetzen oder wiederherstellen. */
  static async #onNames() {
    const world = () => ({
      journals: game.journal.contents,
      folders: game.folders.filter(f => ["JournalEntry", "Scene"].includes(f.type)),
      scenes: game.scenes.contents
    });
    const rows = NAME_KINDS.map(kind => {
      const targets = nameTargets([kind], world());
      const done = targets.filter(t => t.translated).length;
      const label = game.i18n.localize(`VTTTRANSLATE.Names.Kind.${kind}`);
      const counts = game.i18n.format("VTTTRANSLATE.Names.Counts", { open: targets.length - done, done });
      return `<label class="vtt-name-kind"><input type="checkbox" name="${kind}" checked> ${label} <small>(${counts})</small></label>`;
    }).join("");

    const choice = await DialogV2.wait({
      window: { title: "VTTTRANSLATE.Names.Title" },
      content: `<p>${game.i18n.localize("VTTTRANSLATE.Names.Intro")}</p>${rows}`,
      buttons: [
        { action: "translate", label: "VTTTRANSLATE.Names.Translate", icon: "fa-solid fa-language", default: true, callback: (event, button) => ({ action: "translate", kinds: NAME_KINDS.filter(k => button.form.elements[k]?.checked) }) },
        { action: "restore", label: "VTTTRANSLATE.Names.Restore", icon: "fa-solid fa-rotate-left", callback: (event, button) => ({ action: "restore", kinds: NAME_KINDS.filter(k => button.form.elements[k]?.checked) }) },
        { action: "cancel", label: "Cancel" }
      ],
      rejectClose: false
    });
    if (!choice?.kinds?.length) return;

    if (choice.action === "restore") {
      const count = await restoreNames(nameTargets(choice.kinds, world()));
      return ui.notifications.info(game.i18n.format("VTTTRANSLATE.Names.Restored", { count }));
    }

    const targets = nameTargets(choice.kinds, world()).filter(t => !t.translated);
    if (!targets.length) return ui.notifications.info(game.i18n.localize("VTTTRANSLATE.Names.Nothing"));
    const note = ui.notifications.info(game.i18n.localize("VTTTRANSLATE.Names.Running"), { progress: true });
    try {
      const { provider } = currentProvider();
      const glossary = getGlossary();
      const { texts } = await translateNames({
        items: targets,
        glossaryFor: text => relevantTerms(glossary, text),
        provider,
        onProgress: (done, total) => note?.update?.({ pct: done / total })
      });
      const count = await applyNames(targets, texts);
      ui.notifications.info(game.i18n.format("VTTTRANSLATE.Names.Done", { count, total: targets.length }));
    } catch (err) {
      console.error(`${MODULE_ID} |`, err);
      ui.notifications.error(game.i18n.format("VTTTRANSLATE.Names.Error", { error: err.message }));
    } finally {
      note?.remove?.();
      this.render({ parts: ["list"] });
    }
  }

  static #onPause() { this.queue.pause(); }
  static #onResume() { this.queue.resume(); }
  static #onCancel() { this.queue.cancel(); }

  static async #onRestore() {
    const pages = [...this.selected].map(u => fromUuidSync(u)).filter(p => p && pageStatus(p) !== "open");
    if (!pages.length) return ui.notifications.warn(game.i18n.localize("VTTTRANSLATE.Notify.NotTranslated"));
    const ok = await DialogV2.confirm({
      window: { title: "VTTTRANSLATE.Center.RestoreTitle" },
      content: `<p>${game.i18n.format("VTTTRANSLATE.Center.ConfirmRestore", { count: pages.length })}</p>`
    });
    if (!ok) return;
    for (const page of pages) await restorePage(page);
    this.selected.clear();
    ui.notifications.info(game.i18n.format("VTTTRANSLATE.Center.Restored", { count: pages.length }));
    this.render({ parts: ["list", "footer"] });
  }
}
