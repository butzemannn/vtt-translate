import { test } from "node:test";
import assert from "node:assert/strict";
import { translateNames, validName } from "../scripts/names.js";

test("Plausibilitätsprüfung für Namen", () => {
  assert.equal(validName("Manor", "Herrenhaus"), true);
  assert.equal(validName("Manor", ""), false);
  assert.equal(validName("Manor", "<b>Herrenhaus</b>"), false);
  assert.equal(validName("Attic", "x".repeat(100)), false);
});

test("Namen in Paketen à 80, Glossar nur relevante Einträge, ungültige bleiben null", async () => {
  const inputs = [];
  const provider = {
    async translate({ input, effort }) {
      const data = JSON.parse(input);
      inputs.push({ data, effort });
      return { text: JSON.stringify({ names: data.items.map(i => ({ id: i.id, text: i.text === "Bad" ? "" : `DE ${i.text}` })) }), usage: { input: 1, output: 1 } };
    }
  };
  const items = Array.from({ length: 100 }, (_, i) => ({ text: i === 5 ? "Bad" : `Name ${i}`, kind: "journal" }));
  items[0] = { text: "Barovia Manor", kind: "scene", context: "Szene" };
  const progress = [];
  const { texts, usage } = await translateNames({
    items,
    glossaryFor: text => (text.includes("Barovia") ? [{ source: "Barovia", target: "" }] : []),
    provider,
    onProgress: (d, t) => progress.push(`${d}/${t}`)
  });
  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].data.items.length, 80);
  assert.deepEqual(inputs[0].data.glossary, [{ en: "Barovia", de: "Barovia" }]);
  assert.equal(inputs[1].data.glossary, undefined);
  assert.equal(inputs[0].effort, "low");
  assert.equal(texts[0], "DE Barovia Manor");
  assert.equal(texts[5], null);
  assert.equal(texts[99], "DE Name 99");
  assert.deepEqual(progress, ["80/100", "100/100"]);
  assert.deepEqual(usage, { input: 2, output: 2 });
});
