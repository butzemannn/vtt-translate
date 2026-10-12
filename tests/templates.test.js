// Prüft, dass die Templates kompilieren und mit typischen Daten rendern (Foundry-Helfer nachgebildet).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Handlebars from "handlebars";
import { buildRows, STATUS } from "../scripts/ui/rows.js";

Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("localize", (key, opts) => `${key}${JSON.stringify(opts.hash)}`);
const render = (name, ctx) => Handlebars.compile(readFileSync(new URL(`../templates/center/${name}.hbs`, import.meta.url), "utf8"))(ctx);

test("list.hbs rendert Ordner, Journale und Seiten", () => {
  const { rows } = buildRows({
    folders: [{ id: "f", name: "Ordner", folder: null }],
    entries: [{ id: "e", name: "Journal", folder: "f", pages: [{ uuid: "JournalEntry.e.JournalEntryPage.p", name: "Foyer", type: "text" }] }],
    statusOf: () => "translated", selected: new Set(), expanded: new Set(["e"]), collapsed: new Set()
  });
  for (const r of rows) Object.assign(r, { icon: STATUS[r.status].icon, indent: r.depth * 18 });
  const html = render("list", { rows });
  assert.match(html, /data-kind="folder"/);
  assert.match(html, /data-uuids="JournalEntry.e.JournalEntryPage.p"/);
  assert.match(html, /fa-circle-check/);
});

test("footer.hbs und controls.hbs rendern", () => {
  const footer = render("footer", { summary: { pages: 2, words: "100", costs: [{ name: "X", cost: "0.10", current: true }] }, queue: { total: 3, done: 1, percent: 33, running: true, paused: false } });
  assert.match(footer, /data-action="pause"/);
  assert.match(footer, /~0.10 \$/);
  assert.match(render("controls", { filters: [{ value: "all", label: "Alle", selected: true }] }), /<option value="all" selected>/);
});
