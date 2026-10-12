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
  assert.match(render("footer", { summary: { pages: 1, words: "1", costs: [], time: "5 Min." }, queue: { total: 2, done: 1, running: true, eta: "3 Min." } }), /Remaining.*3 Min/);
  assert.match(render("controls", { filters: [{ value: "all", label: "Alle", selected: true }] }), /<option value="all" selected>/);
});

const renderFile = (file, ctx) => Handlebars.compile(readFileSync(new URL(`../templates/${file}.hbs`, import.meta.url), "utf8"))(ctx);

test("Glossar-Templates rendern Vorschläge und Felder", () => {
  const kinds = [{ value: "name", label: "Name", selected: true }];
  const list = renderFile("glossary/list", { entries: [{ index: 3, source: "Raven Cane", target: "", kind: "name", suggested: true, kinds }] });
  assert.match(list, /data-index="3" class="suggested"/);
  assert.match(list, /data-action="accept"/);
  assert.match(list, /placeholder="Raven Cane"/);
  assert.match(renderFile("glossary/controls", { filters: [], suggested: 2 }), /acceptAll/);
});

test("Prüf-Ansicht rendert Paare und Rückfall auf ganze Seite", () => {
  const paired = renderFile("review", { page: { name: "Foyer", journal: "Manor" }, pairs: [{ type: "readaloud", original: "<b>You</b>", translated: "<b>Ihr</b>" }], hasNext: true });
  assert.match(paired, /vtt-pair readaloud/);
  assert.match(paired, /<b>Ihr<\/b>/);
  assert.match(paired, /data-action="approve"/);
  const open = renderFile("review", { page: { name: "X" }, translatedOnly: true, originalHtml: "<p>a</p>" });
  assert.doesNotMatch(open, /data-action="approve"/);
  assert.match(renderFile("review", { empty: true }), /Review.Empty/);
});
