// Glossar: einheitliche Namen/Begriffe. Einträge {source, target, kind, suggested?}; leeres target = bleibt.
// Ohne Foundry-Abhängigkeit (Speichern macht der Aufrufer).
import { parseJson } from "./translator.js";

const SUGGEST_PROMPT = `You prepare a glossary for translating a Dungeons & Dragons 5e adventure (Curse of Strahd, gothic horror) from English into German.

List every term in the text that must be translated consistently:
- proper names of persons, places, organizations, ships, deities (kind "name")
- named or notable items, artifacts, books (kind "item")
- spells, monsters, conditions, rules terms (kind "rules")

For each give the German rendering:
- personal names and place names that are real names (e.g. "Strahd von Zarovich", "Barovia", "Vallaki") stay unchanged
- descriptive names get a fitting German name (e.g. "Raven Cane" → "Rabenstock")
- spells, monsters, conditions and rules terms use the official German D&D 5e names
Skip common words. Each term once. Answer only with JSON: {"terms": [{"source": "...", "target": "...", "kind": "name|item|rules"}]}`;

const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    terms: {
      type: "array",
      items: {
        type: "object",
        properties: { source: { type: "string" }, target: { type: "string" }, kind: { type: "string", enum: ["name", "item", "rules"] } },
        required: ["source", "target", "kind"],
        additionalProperties: false
      }
    }
  },
  required: ["terms"],
  additionalProperties: false
};

// Zeichen pro Anfrage für Vorschläge (ca. 3k Tokens) und parallele Anfragen.
const CHUNK_CHARS = 12000;
const CONCURRENCY = 3;

const key = term => term.trim().toLowerCase();

// Ganzes Wort, ohne Groß/Klein, englischer Plural erlaubt ("Skeleton" findet "skeletons", "Light" nicht "lightning").
const patterns = new Map();
function termPattern(source) {
  let re = patterns.get(source);
  if (!re) {
    const escaped = source.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?:s|es)?(?![\\p{L}\\p{N}])`, "iu");
    patterns.set(source, re);
  }
  return re;
}

/** Bestätigte Einträge, die im Text vorkommen (nur diese gehen in den Prompt). */
export function relevantTerms(glossary, text) {
  const lower = text.toLowerCase();
  // Schneller Vorfilter per Teilstring, genaue Wortprüfung nur für Kandidaten.
  return glossary.filter(g => !g.suggested && g.source?.trim() && lower.includes(key(g.source)) && termPattern(g.source).test(text));
}

/** Neue Vorschläge anhängen; vorhandene Einträge (auch bestätigte) bleiben unverändert. */
export function mergeSuggestions(glossary, terms) {
  const known = new Set(glossary.map(g => key(g.source)));
  const added = [];
  for (const t of terms) {
    const source = t.source?.trim();
    if (!source || known.has(key(source))) continue;
    known.add(key(source));
    added.push({ source, target: t.target?.trim() === source ? "" : (t.target?.trim() ?? ""), kind: t.kind ?? "name", suggested: true });
  }
  return { glossary: [...glossary, ...added], added: added.length };
}

/**
 * Begriffspaare aus Kompendien, die Babele übersetzt hat (z. B. deutsche dnd5e-Module).
 * Babele hinterlegt den englischen Namen als originalName bzw. flags.babele.originalName.
 * @param {{documentName: string, getIndex: Function}[]} packs
 */
export async function compendiumTerms(packs) {
  const terms = new Map();
  for (const pack of packs) {
    if (!["Item", "Actor"].includes(pack.documentName)) continue;
    const index = await pack.getIndex({ fields: ["flags.babele.originalName"] });
    for (const e of index) {
      const original = e.originalName ?? e.flags?.babele?.originalName;
      if (!original || !e.name || original === e.name || terms.has(key(original))) continue;
      terms.set(key(original), { source: original, target: e.name, kind: "rules", origin: "compendium" });
    }
  }
  return [...terms.values()];
}

/** Kompendium-Einträge ersetzen; eigene Einträge haben Vorrang und bleiben unverändert. */
export function mergeCompendiumTerms(glossary, terms) {
  const own = glossary.filter(g => g.origin !== "compendium");
  const known = new Set(own.map(g => key(g.source)));
  const imported = terms.filter(t => !known.has(key(t.source)));
  return { glossary: [...own, ...imported], imported: imported.length };
}

/** Texte in Pakete bis maxChars aufteilen (ein sehr langer Text bildet ein eigenes Paket). */
export function chunkTexts(texts, maxChars = CHUNK_CHARS) {
  const chunks = [];
  let current = "";
  for (const text of texts) {
    if (current && current.length + text.length > maxChars) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n\n---\n\n" : "") + text;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Fragt Glossar-Vorschläge für Texte ab (Pakete parallel).
 * @param {{texts: string[], provider: object, known?: string[], onProgress?: (done: number, total: number) => void}} args
 * @returns {Promise<{terms: object[], usage: {input: number, output: number}}>}
 */
export async function suggestTerms({ texts, provider, known = [], onProgress = () => {} }) {
  const chunks = chunkTexts(texts.filter(Boolean));
  const results = new Array(chunks.length);
  const usage = { input: 0, output: 0 };
  let next = 0;
  let done = 0;
  onProgress(0, chunks.length);

  async function work() {
    while (next < chunks.length) {
      const i = next++;
      // Bereits bekannte Begriffe mitschicken, damit sie nicht erneut vorgeschlagen werden.
      const input = JSON.stringify({ known: known.slice(0, 500), text: chunks[i] });
      console.info(`vtt-translate | Namen: Paket ${i + 1}/${chunks.length} (${chunks[i].length} Zeichen) gestartet`);
      const res = await provider.translate({ system: SUGGEST_PROMPT, input, schema: SUGGEST_SCHEMA, effort: "low" });
      usage.input += res.usage?.input ?? 0;
      usage.output += res.usage?.output ?? 0;
      results[i] = parseJson(res.text).terms ?? [];
      console.info(`vtt-translate | Namen: Paket ${i + 1}/${chunks.length} fertig, ${results[i].length} Begriffe`);
      onProgress(++done, chunks.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, work));
  return { terms: results.flat(), usage };
}
