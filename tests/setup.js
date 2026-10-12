// Stellt DOMParser für Node bereit und lädt die Sample-Seiten.
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

globalThis.DOMParser = new JSDOM().window.DOMParser;

const dir = new URL("../samples/", import.meta.url);

export function samplePages() {
  return readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .flatMap(f => {
      const entry = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
      return entry.pages.map(p => ({ journal: entry.name, name: p.name, html: p.text.content }));
    });
}
