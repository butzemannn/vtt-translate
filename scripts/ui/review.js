// Prüf-Ansicht: Original und Übersetzung absatzweise nebeneinander, mit Aktionen pro Seite.
import { MODULE_ID, getOriginal, pageStatus, setReviewed } from "../store.js";
import { pairBlocks } from "../html.js";
import { translatePage, restorePage } from "../actions.js";
import { STATUS } from "./rows.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ReviewView extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "vtt-translate-review",
    classes: ["vtt-translate-review"],
    window: { title: "VTTTRANSLATE.Review.Title", icon: "fa-solid fa-magnifying-glass", resizable: true },
    position: { width: 1000, height: 780 },
    actions: {
      prev: ReviewView.#onPrev,
      next: ReviewView.#onNext,
      approve: ReviewView.#onApprove,
      edit: ReviewView.#onEdit,
      retranslate: ReviewView.#onRetranslate,
      restore: ReviewView.#onRestore
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/review.hbs`, scrollable: [".vtt-compare"] }
  };

  uuids = [];
  index = 0;
  busy = false;

  /** Öffnet die Ansicht für eine Liste von Seiten-UUIDs. */
  show(uuids, index = 0) {
    this.uuids = uuids;
    this.index = Math.min(index, Math.max(uuids.length - 1, 0));
    this.render({ force: true });
  }

  get page() {
    return fromUuidSync(this.uuids[this.index]);
  }

  async _prepareContext() {
    const page = this.page;
    if (!page) return { empty: true };
    const status = pageStatus(page);
    const original = getOriginal(page);
    const translated = status === "open" ? "" : page.text.content;
    const enrich = html => foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { relativeTo: page });

    const pairs = translated ? pairBlocks(original, translated) : null;
    for (const pair of pairs ?? []) {
      pair.original = await enrich(pair.original);
      pair.translated = await enrich(pair.translated);
    }
    return {
      page: { name: page.name, journal: page.parent.name },
      status, statusLabel: game.i18n.localize(`VTTTRANSLATE.Status.${status}`), icon: STATUS[status].icon,
      position: `${this.index + 1}/${this.uuids.length}`,
      hasPrev: this.index > 0,
      hasNext: this.index < this.uuids.length - 1,
      translatedOnly: !translated,
      pairs,
      // Ohne passende Blockstruktur (z. B. nach Handänderung): beide Seiten komplett.
      originalHtml: pairs ? null : await enrich(original),
      translatedHtml: pairs || !translated ? null : await enrich(translated),
      busy: this.busy
    };
  }

  #go(delta) {
    this.index = Math.max(0, Math.min(this.uuids.length - 1, this.index + delta));
    this.render();
  }

  static #onPrev() { this.#go(-1); }
  static #onNext() { this.#go(1); }

  static async #onApprove() {
    await setReviewed(this.page);
    if (this.index < this.uuids.length - 1) this.#go(1);
    else this.render();
  }

  static #onEdit() {
    this.page.sheet.render(true);
  }

  static async #onRetranslate() {
    const page = this.page;
    const hint = this.element.querySelector("input[name=hint]")?.value.trim();
    this.busy = true;
    this.render();
    try {
      const result = await translatePage(page, { hint });
      if (result.failed) ui.notifications.warn(game.i18n.format("VTTTRANSLATE.Notify.Partial", { name: page.name, failed: result.failed, total: result.total }));
    } catch (err) {
      console.error(`${MODULE_ID} |`, err);
      ui.notifications.error(game.i18n.format("VTTTRANSLATE.Notify.Error", { name: page.name, error: err.message }));
    } finally {
      this.busy = false;
      this.render();
    }
  }

  static async #onRestore() {
    await restorePage(this.page);
    this.render();
  }
}
