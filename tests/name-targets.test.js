import { test } from "node:test";
import assert from "node:assert/strict";
import { nameTargets, applyNames, restoreNames } from "../scripts/name-targets.js";

// Dokument-Attrappen mit gebündeltem Update wie in Foundry.
function makeWorld() {
  const log = [];
  const apply = (doc, changes) => {
    for (const [path, value] of Object.entries(changes)) {
      if (path === "_id") continue;
      const keys = path.split(".");
      let obj = doc;
      for (const k of keys.slice(0, -1)) obj = obj[k] ??= {};
      obj[keys.at(-1)] = value;
    }
  };
  const cls = (name, docs) => ({ updateDocuments: async updates => { log.push(`${name}:${updates.length}`); for (const u of updates) apply(docs().find(d => d.id === u._id), u); } });
  const journals = [], scenes = [];
  const Journal = cls("JournalEntry", () => journals);
  const Scene = cls("Scene", () => scenes);
  journals.push({ id: "j1", name: "2. Manor", documentName: "JournalEntry", constructor: Journal, folder: { name: "Death House" } });
  const scene = { id: "s1", name: "Death House", navName: "", documentName: "Scene", constructor: Scene, uuid: "Scene.s1", notes: [] };
  scene.updateEmbeddedDocuments = async (type, updates) => { log.push(`${type}@s1:${updates.length}`); for (const u of updates) apply(scene.notes.find(n => n.id === u._id), u); };
  scene.notes.push({ id: "n1", text: "Foyer", documentName: "Note", parent: scene }, { id: "n2", text: "", documentName: "Note", parent: scene });
  scenes.push(scene);
  return { world: { journals, folders: [], scenes }, log, journals, scene };
}

test("Ziele: leere Felder (navName, Pin ohne Text) werden übersprungen", () => {
  const { world } = makeWorld();
  const targets = nameTargets(["journal", "scene", "note"], world);
  assert.deepEqual(targets.map(t => `${t.kind}:${t.field}:${t.text}:${t.context}`), ["journal:name:2. Manor:Death House", "scene:name:Death House:", "note:text:Foyer:Death House"]);
  assert.ok(targets.every(t => !t.translated));
});

test("Übersetzen speichert gebündelt mit Original, erneutes Sammeln liefert Original, Wiederherstellen", async () => {
  const { world, log, journals, scene } = makeWorld();
  let targets = nameTargets(["journal", "scene", "note"], world);
  const count = await applyNames(targets, ["2. Herrenhaus", null, "Eingangshalle"]);
  assert.equal(count, 2);
  assert.deepEqual(log, ["JournalEntry:1", "Note@s1:1"]);
  assert.equal(journals[0].name, "2. Herrenhaus");
  assert.equal(scene.notes[0].text, "Eingangshalle");

  targets = nameTargets(["journal", "note"], world);
  assert.deepEqual(targets.map(t => [t.text, t.translated]), [["2. Manor", true], ["Foyer", true]]);

  assert.equal(await restoreNames(targets), 2);
  assert.equal(journals[0].name, "2. Manor");
  assert.equal(scene.notes[0].text, "Foyer");
  assert.equal(nameTargets(["journal"], world)[0].translated, false);
});
