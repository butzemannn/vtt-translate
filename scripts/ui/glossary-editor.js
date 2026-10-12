// Glossar-Editor: Einträge bearbeiten, Vorschläge übernehmen oder verwerfen.
import { MODULE_ID } from "../store.js";
import { getGlossary, setGlossary } from "../actions.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class GlossaryEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "vtt-translate-glossary",
    classes: ["vtt-translate-glossary"],
    window: { title: "VTTTRANSLATE.Glossary.Title", icon: "fa-solid fa-book-atlas", resizable: true },
    position: { width: 640, height: 700 },
    actions: {
      add: GlossaryEditor.#onAdd,
      remove: GlossaryEditor.#onRemove,
      accept: GlossaryEditor.#onAccept,
      acceptAll: GlossaryEditor.#onAcceptAll,
      rejectAll: GlossaryEditor.#onRejectAll
    }
  };

  static PARTS = {
    controls: { template: `modules/${MODULE_ID}/templates/glossary/controls.hbs` },
    list: { template: `modules/${MODULE_ID}/templates/glossary/list.hbs`, scrollable: [""] }
  };

  filter = "all";
  search = "";

  async _prepareContext() {
    const term = this.search.trim().toLowerCase();
    const entries = getGlossary()
      .map((e, index) => ({ ...e, index }))
      .filter(e => this.filter === "all" || (this.filter === "suggested") === !!e.suggested)
      .filter(e => !term || e.source.toLowerCase().includes(term) || e.target.toLowerCase().includes(term));
    const all = getGlossary();
    const kinds = ["name", "item", "rules"].map(value => ({ value, label: game.i18n.localize(`VTTTRANSLATE.Glossary.Kind.${value}`) }));
    for (const e of entries) e.kinds = kinds.map(k => ({ ...k, selected: k.value === e.kind }));
    return {
      entries,
      search: this.search,
      filters: ["all", "suggested", "confirmed"].map(value => ({ value, label: game.i18n.localize(`VTTTRANSLATE.Glossary.Filter.${value}`), selected: value === this.filter })),
      count: all.length,
      suggested: all.filter(e => e.suggested).length
    };
  }

  _onRender(context, options) {
    if (options.parts.includes("controls")) {
      const search = this.element.querySelector("input[name=search]");
      search.addEventListener("input", foundry.utils.debounce(() => { this.search = search.value; this.render({ parts: ["list"] }); }, 250));
      this.element.querySelector("select[name=filter]").addEventListener("change", ev => { this.filter = ev.target.value; this.render({ parts: ["list"] }); });
    }
    // Änderungen in Feldern sofort speichern.
    for (const input of this.element.querySelectorAll("[data-field]")) {
      input.addEventListener("change", ev => this.#update(Number(ev.target.closest("[data-index]").dataset.index), { [ev.target.dataset.field]: ev.target.value.trim() }));
    }
  }

  async #update(index, changes) {
    const entries = getGlossary();
    entries[index] = { ...entries[index], ...changes };
    await setGlossary(entries);
  }

  async #save(entries) {
    await setGlossary(entries);
    this.render({ parts: ["controls", "list"] });
  }

  static #index(target) {
    return Number(target.closest("[data-index]").dataset.index);
  }

  static #onAdd() {
    this.filter = "all";
    this.search = "";
    this.#save([{ source: "", target: "", kind: "name" }, ...getGlossary()]);
  }

  static #onRemove(event, target) {
    const entries = getGlossary();
    entries.splice(GlossaryEditor.#index(target), 1);
    this.#save(entries);
  }

  static #onAccept(event, target) {
    const entries = getGlossary();
    delete entries[GlossaryEditor.#index(target)].suggested;
    this.#save(entries);
  }

  static #onAcceptAll() {
    this.#save(getGlossary().map(({ suggested, ...e }) => e));
  }

  static #onRejectAll() {
    this.#save(getGlossary().filter(e => !e.suggested));
  }
}
