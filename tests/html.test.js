import { test } from "node:test";
import assert from "node:assert/strict";
import { samplePages } from "./setup.js";
import { splitBlocks, validateBlock, applyBlock, joinBlocks, normalizeHtml } from "../scripts/html.js";

const pages = samplePages();

test("Samples vorhanden", () => {
  assert.ok(pages.length > 0);
});

test("Zerlegen und unverändert zurückschreiben ergibt das Original", () => {
  for (const page of pages) {
    const { root, blocks } = splitBlocks(page.html);
    for (const block of blocks) {
      assert.deepEqual(validateBlock(block, block.html), [], `${page.name} #${block.id}`);
      applyBlock(block, block.html);
    }
    assert.equal(joinBlocks(root), normalizeHtml(page.html), page.name);
  }
});

test("LLM-Fassung enthält keine Attribute und keine Link-Ziele", () => {
  for (const page of pages) {
    for (const block of splitBlocks(page.html).blocks) {
      assert.doesNotMatch(block.html, /style=|href=|src=|@UUID|\[\[/, `${page.name} #${block.id}`);
    }
  }
});

test("Vorlesekasten wird als readaloud erkannt", () => {
  const foyer = pages.find(p => p.name === "Foyer");
  const types = splitBlocks(foyer.html).blocks.map(b => b.type);
  assert.deepEqual(types, ["readaloud", "text", "text"]);
});

test("Link-Label wird übersetzt, Ziel bleibt", () => {
  const html = `<p>Geheimtür zum @UUID[.bG2ZlBNexKuWd7U5]{Treasure Room} und @UUID[JournalEntry.a.JournalEntryPage.b], [[/r 1d6]] gp</p>`;
  const { root, blocks } = splitBlocks(html);
  assert.equal(blocks.length, 1);
  const translated = blocks[0].html.replace("Treasure Room", "Schatzkammer");
  assert.deepEqual(validateBlock(blocks[0], translated), []);
  applyBlock(blocks[0], translated);
  assert.equal(joinBlocks(root),
    `<p>Geheimtür zum @UUID[.bG2ZlBNexKuWd7U5]{Schatzkammer} und @UUID[JournalEntry.a.JournalEntryPage.b], [[/r 1d6]] gp</p>`);
});

test("Elemente dürfen umgestellt werden", () => {
  const html = `<p>The <strong style="x">Raven Cane</strong> hides a <em>rapier</em>.</p>`;
  const { root, blocks } = splitBlocks(html);
  const translated = `Im <em k="1">Rapier</em> steckt der <strong k="0">Rabenstock</strong>.`;
  assert.deepEqual(validateBlock(blocks[0], translated), []);
  applyBlock(blocks[0], translated);
  assert.equal(joinBlocks(root), `<p>Im <em>Rapier</em> steckt der <strong style="x">Rabenstock</strong>.</p>`);
});

test("Fehlende, doppelte, fremde oder geänderte Elemente werden erkannt", () => {
  const { blocks } = splitBlocks(`<p>A <strong>b</strong> @UUID[x]{c}</p>`);
  const b = blocks[0];
  assert.equal(validateBlock(b, `A b`).length, 2);
  assert.match(validateBlock(b, `<strong k="0">b</strong><strong k="0">b</strong><x-ref k="1">c</x-ref>`)[0], /doppelt/);
  assert.match(validateBlock(b, `<strong k="0">b</strong><x-ref k="1">c</x-ref><b>neu</b>`)[0], /Unbekannt/);
  assert.match(validateBlock(b, `<em k="0">b</em><x-ref k="1">c</x-ref>`)[0], /statt/);
});

test("Blöcke nur aus Links ohne Label werden übersprungen", () => {
  const { blocks } = splitBlocks(`<ul><li><p><em>@UUID[JournalEntry.a]</em></p></li><li><p>Dagger</p></li></ul>`);
  assert.deepEqual(blocks.map(b => b.html), ["Dagger"]);
});

test("Blöcke für den Vergleich paaren", async () => {
  const { pairBlocks } = await import("../scripts/html.js");
  const pairs = pairBlocks(`<blockquote><p>You enter.</p></blockquote><p>DC 15</p>`, `<blockquote><p>Ihr tretet ein.</p></blockquote><p>SG 15</p>`);
  assert.deepEqual(pairs, [
    { type: "readaloud", original: "You enter.", translated: "Ihr tretet ein." },
    { type: "text", original: "DC 15", translated: "SG 15" }
  ]);
  assert.equal(pairBlocks(`<p>a</p><p>b</p>`, `<p>a b</p>`), null);
});
