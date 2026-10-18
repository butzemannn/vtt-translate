import { test } from "node:test";
import assert from "node:assert/strict";
import { hashText, pageStatus, saveTranslation, restoreOriginal, getOriginal, setReviewed } from "../scripts/store.js";

// Minimale Seiten-Attrappe mit Foundry-ähnlichem update()/getFlag()/unsetFlag().
function fakePage(content) {
  const page = {
    text: { content },
    flags: {},
    getFlag(scope, key) { return this.flags[scope]?.[key]; },
    async update(changes) {
      for (const [path, value] of Object.entries(changes)) {
        const keys = path.split(".");
        let obj = this;
        for (const k of keys.slice(0, -1)) obj = obj[k] ??= {};
        obj[keys.at(-1)] = value;
      }
    },
    async unsetFlag(scope, key) { delete this.flags[scope][key]; }
  };
  return page;
}

test("Hash ist stabil und unterscheidet Texte", () => {
  assert.equal(hashText("abc"), hashText("abc"));
  assert.notEqual(hashText("abc"), hashText("abd"));
});

test("Status: offen → übersetzt → von Hand geändert → wiederhergestellt", async () => {
  const page = fakePage("<p>Hello</p>");
  assert.equal(pageStatus(page), "open");

  await saveTranslation(page, "<p>Hallo</p>", { model: "m", failed: 0 });
  assert.equal(pageStatus(page), "translated");
  assert.equal(getOriginal(page), "<p>Hello</p>");

  page.text.content = "<p>Hallo!</p>";
  assert.equal(pageStatus(page), "edited");

  await saveTranslation(page, "<p>Servus</p>", { model: "m", failed: 1 });
  assert.equal(pageStatus(page), "partial");
  assert.equal(getOriginal(page), "<p>Hello</p>", "Original bleibt beim zweiten Mal erhalten");

  assert.equal(await restoreOriginal(page), true);
  assert.equal(page.text.content, "<p>Hello</p>");
  assert.equal(pageStatus(page), "open");
});

test("Geprüft: übernimmt Handänderungen, neue Übersetzung setzt zurück", async () => {
  const page = fakePage("<p>Hello</p>");
  await saveTranslation(page, "<p>Hallo</p>", { model: "m", failed: 0 });
  page.text.content = "<p>Hallo!</p>";
  assert.equal(pageStatus(page), "edited");
  await setReviewed(page);
  assert.equal(pageStatus(page), "reviewed");
  await saveTranslation(page, "<p>Servus</p>", { model: "m", failed: 0 });
  assert.equal(pageStatus(page), "translated");
});

test("Seitenname: Original beim ersten Mal sichern, beim Wiederherstellen zurück", async () => {
  const page = fakePage("<p>Hello</p>");
  page.name = "Attic";
  await saveTranslation(page, "<p>Hallo</p>", { model: "m", failed: 0, title: "Dachboden" });
  assert.equal(page.name, "Dachboden");
  await saveTranslation(page, "<p>Hallo!</p>", { model: "m", failed: 0, title: "Speicher" });
  assert.equal(page.name, "Speicher");
  assert.equal(page.flags["vtt-translate"].translation.originalName, "Attic");
  await restoreOriginal(page);
  assert.equal(page.name, "Attic");
});
