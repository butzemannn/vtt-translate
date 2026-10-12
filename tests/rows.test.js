import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRows, summarize } from "../scripts/ui/rows.js";

const page = (uuid, name, sort = 0) => ({ uuid, name, sort, type: "text" });
const folders = [
  { id: "f1", name: "Death House", folder: null, sort: 0 },
  { id: "f2", name: "Unterordner", folder: "f1", sort: 0 }
];
const entries = [
  { id: "e1", name: "2. Manor", folder: "f1", sort: 1, pages: [page("p1", "Foyer", 1), page("p2", "Main Hall", 2), { uuid: "img", name: "Bild", type: "image" }] },
  { id: "e2", name: "3. Crypt", folder: "f2", sort: 0, pages: [page("p3", "Crypt")] },
  { id: "e3", name: "Ohne Ordner", folder: null, sort: 0, pages: [page("p4", "Notiz")] }
];
const status = { p1: "translated", p2: "open", p3: "error", p4: "open" };
const base = { folders, entries, statusOf: p => status[p.uuid], selected: new Set(), expanded: new Set(), collapsed: new Set() };

test("Baum: Ordner, Unterordner, Journale, nur Textseiten", () => {
  const { rows } = buildRows({ ...base, expanded: new Set(["e1"]) });
  assert.deepEqual(rows.map(r => `${r.depth}:${r.kind}:${r.name}`), [
    "0:folder:Death House",
    "1:folder:Unterordner",
    "2:entry:3. Crypt",
    "1:entry:2. Manor",
    "2:page:Foyer",
    "2:page:Main Hall",
    "0:entry:Ohne Ordner"
  ]);
});

test("Summen pro Ordner und Journal", () => {
  const { rows } = buildRows(base);
  const death = rows.find(r => r.id === "f1");
  assert.equal(death.total, 3);
  assert.equal(death.done, 1);
  assert.equal(death.status, "error");
  assert.equal(rows.find(r => r.id === "e1").status, "partial");
});

test("Filter und Suche", () => {
  const open = buildRows({ ...base, filter: "open" });
  assert.deepEqual(open.visible, ["p2", "p4"]);
  const search = buildRows({ ...base, search: "foy" });
  assert.deepEqual(search.visible, ["p1"]);
  assert.ok(search.rows.some(r => r.kind === "page" && r.name === "Foyer"), "Suche klappt Journale auf");
});

test("Auswahl: Ordner teilweise ausgewählt", () => {
  const { rows } = buildRows({ ...base, selected: new Set(["p1"]) });
  const death = rows.find(r => r.id === "f1");
  assert.equal(death.checked, false);
  assert.equal(death.indeterminate, true);
  assert.deepEqual(death.uuids, ["p3", "p1", "p2"]);
});

test("Zugeklappter Ordner zeigt keine Kinder, Seiten bleiben auswählbar", () => {
  const { rows, visible } = buildRows({ ...base, collapsed: new Set(["f1"]) });
  assert.deepEqual(rows.map(r => r.name), ["Death House", "Ohne Ordner"]);
  assert.deepEqual(visible.sort(), ["p1", "p2", "p3", "p4"]);
});

test("summarize", () => {
  assert.equal(summarize(["translated", "edited"]).status, "translated");
  assert.equal(summarize(["translated", "queued"]).status, "active");
  assert.equal(summarize(["open"]).status, "open");
});
