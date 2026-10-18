import { test } from "node:test";
import assert from "node:assert/strict";
import { collectScenePages } from "../scripts/scene.js";

const page = (uuid, content = "", sort = 0) => ({ uuid, type: "text", documentName: "JournalEntryPage", sort, content });
const items = { gun: page("items.gun"), cane: page("items.cane") };
const foyer = page("manor.foyer", "Take the @UUID[JournalEntry.items.JournalEntryPage.cane]{Raven Cane}", 1);
const hall = page("manor.hall", "See @UUID[.foyer] and @UUID[Actor.x]", 2);
const manor = { pages: [hall, foyer, { uuid: "manor.img", type: "image" }] };
const crypt = page("crypt.entry");

const resolve = target => ({
  "JournalEntry.items.JournalEntryPage.cane": items.cane,
  ".foyer": foyer,
  "Actor.x": { documentName: "Actor", uuid: "Actor.x" }
})[target] ?? null;

test("Pins mit Seite, Pins auf ganze Journale, verlinkte Seiten eine Ebene", () => {
  const scene = { notes: [{ page: crypt }, { entry: manor }, { entry: manor, page: foyer }, { entry: null }] };
  const pages = collectScenePages(scene, resolve, p => p.content);
  assert.deepEqual(pages.map(p => p.uuid), ["crypt.entry", "manor.foyer", "manor.hall", "items.cane"]);
});

test("Keine Notizen → leer", () => {
  assert.deepEqual(collectScenePages({ notes: [] }, resolve, p => p.content), []);
});
