import { test } from "node:test";
import assert from "node:assert/strict";
import { samplePages } from "./setup.js";
import { translateHtml } from "../scripts/translator.js";
import { normalizeHtml } from "../scripts/html.js";

// Fake-Provider: gibt die Blöcke über eine Funktion verändert zurück und zählt Aufrufe.
function fakeProvider(transform) {
  const calls = [];
  return {
    calls,
    async translate({ input }) {
      const { blocks } = JSON.parse(input);
      calls.push(blocks);
      return JSON.stringify({ blocks: blocks.map(b => ({ id: b.id, html: transform(b, calls.length) })) });
    }
  };
}

const context = { journal: "J", folder: "", page: "P" };

test("Echo-Übersetzung lässt alle Sample-Seiten unverändert", async () => {
  for (const page of samplePages()) {
    const provider = fakeProvider(b => b.html);
    const result = await translateHtml({ html: page.html, context, provider });
    assert.equal(result.failed, 0);
    assert.equal(result.html, normalizeHtml(page.html), page.name);
    assert.ok(provider.calls.length <= 1);
  }
});

test("Fehlerhafter Block wird einmal mit Hinweis erneut angefragt", async () => {
  const html = `<p>One <em>two</em></p><p>Three</p>`;
  const provider = fakeProvider((b, call) => (call === 1 && b.id === 0 ? "Eins zwei" : b.html.replace("One", "Eins").replace("Three", "Drei")));
  const result = await translateHtml({ html, context, provider });
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(provider.calls[1].map(b => b.id), [0]);
  assert.match(provider.calls[1][0].fix, /fehlt/);
  assert.equal(result.failed, 0);
  assert.equal(result.html, `<p>Eins <em>two</em></p><p>Drei</p>`);
});

test("Dauerhaft fehlerhafter Block bleibt im Original", async () => {
  const html = `<p>One <em>two</em></p><p>Three</p>`;
  const provider = fakeProvider(b => (b.id === 0 ? "kaputt" : "Drei"));
  const result = await translateHtml({ html, context, provider });
  assert.equal(result.failed, 1);
  assert.equal(result.html, `<p>One <em>two</em></p><p>Drei</p>`);
});
