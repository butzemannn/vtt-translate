import { test } from "node:test";
import assert from "node:assert/strict";
import { samplePages } from "./setup.js";
import { relevantTerms, mergeSuggestions, chunkTexts, suggestTerms, compendiumTerms, mergeCompendiumTerms } from "../scripts/glossary.js";
import { plainText } from "../scripts/html.js";

const glossary = [
  { source: "Count Lugosi", target: "", kind: "name" },
  { source: "Raven Cane", target: "Rabenstock", kind: "item" },
  { source: "Igor", target: "", kind: "name", suggested: true }
];

test("Ganze Wörter, Plural erlaubt, Sonderzeichen sicher", () => {
  const g = [{ source: "Light", target: "Licht" }, { source: "Skeleton", target: "Skelett" }, { source: "Dr. Seward", target: "" }, { source: "Raven's Cane", target: "" }];
  assert.deepEqual(relevantTerms(g, "Lightning strikes two skeletons near Dr. Seward.").map(t => t.source), ["Skeleton", "Dr. Seward"]);
  assert.deepEqual(relevantTerms(g, "She casts light on Raven's Cane.").map(t => t.source), ["Light", "Raven's Cane"]);
  assert.deepEqual(relevantTerms(g, "Dr Seward"), []);
});

test("Nur bestätigte, im Text vorkommende Einträge", () => {
  const terms = relevantTerms(glossary, "The raven cane belongs to Igor.");
  assert.deepEqual(terms.map(t => t.source), ["Raven Cane"]);
});

test("Vorschläge: nur neue, als Vorschlag markiert, gleiches Ziel = bleibt", () => {
  const { glossary: merged, added } = mergeSuggestions(glossary, [
    { source: "raven cane", target: "Rabenstab", kind: "item" },
    { source: "Dr. Seward", target: "Dr. Seward", kind: "name" },
    { source: "Dr. Seward", target: "x", kind: "name" }
  ]);
  assert.equal(added, 1);
  assert.deepEqual(merged.at(-1), { source: "Dr. Seward", target: "", kind: "name", suggested: true });
  assert.equal(merged.find(g => g.source === "Raven Cane").target, "Rabenstock", "Bestehendes bleibt");
});

test("Texte werden in Pakete geteilt", () => {
  assert.deepEqual(chunkTexts(["aaaa", "bbbb", "cc"], 9).length, 2);
  assert.deepEqual(chunkTexts(["x".repeat(20)], 9), ["x".repeat(20)]);
});

test("Reiner Text ohne Tags und Link-Ziele", () => {
  const text = plainText(`<p>Door to @UUID[.abc]{Treasure Room} and @UUID[JournalEntry.x]</p><p>Roll [[/r 1d6]]</p>`);
  assert.equal(text, "Door to Treasure Room and \nRoll");
  const foyer = plainText(samplePages().find(p => p.name === "Foyer").html);
  assert.match(foyer, /Count Lugosi/);
  assert.doesNotMatch(foyer, /</);
});

test("suggestTerms fragt pro Paket und sammelt Begriffe", async () => {
  const inputs = [];
  const provider = { async translate({ input }) { inputs.push(JSON.parse(input)); return { text: JSON.stringify({ terms: [{ source: `T${inputs.length}`, target: "", kind: "name" }] }), usage: { input: 1, output: 1 } }; } };
  const progress = [];
  const result = await suggestTerms({ texts: ["a".repeat(30000), "b".repeat(30000)], provider, known: ["Strahd"], onProgress: (d, t) => progress.push(`${d}/${t}`) });
  assert.equal(inputs.length, 2);
  assert.deepEqual(inputs[0].known, ["Strahd"]);
  assert.deepEqual(result.terms.map(t => t.source), ["T1", "T2"]);
  assert.deepEqual(progress, ["0/2", "1/2", "2/2"]);
});

test("suggestTerms: höchstens 3 Pakete gleichzeitig, wenig Denkaufwand, Ergebnis in Reihenfolge", async () => {
  let active = 0, maxActive = 0;
  const efforts = [];
  const provider = {
    async translate({ input, effort }) {
      efforts.push(effort);
      active++; maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 5));
      active--;
      const n = JSON.parse(input).text[0];
      return { text: JSON.stringify({ terms: [{ source: n, target: "", kind: "name" }] }) };
    }
  };
  const texts = ["a", "b", "c", "d", "e"].map(c => c.repeat(10000));
  const { terms } = await suggestTerms({ texts, provider });
  assert.equal(maxActive, 3);
  assert.deepEqual(terms.map(t => t.source), ["a", "b", "c", "d", "e"]);
  assert.ok(efforts.every(e => e === "low"));
});

test("Kompendium-Begriffe aus Babele-Index", async () => {
  const pack = (documentName, index) => ({ documentName, getIndex: async () => index });
  const terms = await compendiumTerms([
    pack("Item", [{ name: "Feuerball", originalName: "Fireball" }, { name: "Dagger" }, { name: "Licht", flags: { babele: { originalName: "Light" } } }]),
    pack("Actor", [{ name: "Ghul", originalName: "Ghoul" }, { name: "Feuerball", originalName: "fireball" }]),
    pack("JournalEntry", [{ name: "Regeln", originalName: "Rules" }])
  ]);
  assert.deepEqual(terms.map(t => `${t.source}→${t.target}`), ["Fireball→Feuerball", "Light→Licht", "Ghoul→Ghul"]);
  assert.ok(terms.every(t => t.kind === "rules" && t.origin === "compendium"));
});

test("Kompendium-Import ersetzt alten Import, eigene Einträge haben Vorrang", () => {
  const glossary = [
    { source: "Fireball", target: "Feuerkugel", kind: "rules" },
    { source: "Old", target: "Alt", kind: "rules", origin: "compendium" }
  ];
  const { glossary: merged, imported } = mergeCompendiumTerms(glossary, [
    { source: "Fireball", target: "Feuerball", kind: "rules", origin: "compendium" },
    { source: "Ghoul", target: "Ghul", kind: "rules", origin: "compendium" }
  ]);
  assert.equal(imported, 1);
  assert.deepEqual(merged.map(g => `${g.source}→${g.target}`), ["Fireball→Feuerkugel", "Ghoul→Ghul"]);
});
