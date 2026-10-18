// Übersetzt kurze Namen (Journale, Ordner, Szenen, Pin-Beschriftungen) gebündelt.
// Ohne Foundry-Abhängigkeit.
import { parseJson } from "./translator.js";

const NAMES_PROMPT = `You translate names from a Dungeons & Dragons 5e adventure (Curse of Strahd, gothic horror) from English into German for a German gaming group.

Each item is a short name: a journal, folder, scene (map) or map pin label. Translate it as a concise German title.
- Keep numbering, letters and punctuation (e.g. "2. Manor" → "2. Herrenhaus", "Cell b. Skeleton" → "Zelle b. Skelett").
- Proper names of persons and places stay unchanged (e.g. "Barovia", "Strahd von Zarovich") unless the glossary says otherwise.
- "glossary" (if present) is mandatory: use the given German term; "de" equal to "en" means keep it unchanged.
- "context" may tell where the name is used.
- No HTML, no quotes, no explanations. Return every id exactly once.
Answer only with JSON: {"names": [{"id": <number>, "text": "<German name>"}]}`;

const NAMES_SCHEMA = {
  type: "object",
  properties: {
    names: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, text: { type: "string" } },
        required: ["id", "text"],
        additionalProperties: false
      }
    }
  },
  required: ["names"],
  additionalProperties: false
};

const CHUNK = 80;

/** Eine Übersetzung ist brauchbar, wenn sie nicht leer ist, kein HTML enthält und nicht ausufert. */
export function validName(source, text) {
  const t = text?.trim();
  return !!t && !/[<>]/.test(t) && t.length <= Math.max(20, source.length * 3);
}

/**
 * @param {object} args
 * @param {{text: string, kind: string, context?: string}[]} args.items
 * @param {(text: string) => object[]} [args.glossaryFor]  relevante Glossar-Einträge für einen Text
 * @param {object} args.provider
 * @param {(done: number, total: number) => void} [args.onProgress]
 * @returns {Promise<{texts: (string|null)[], usage: {input: number, output: number}}>}  texts[i] = Übersetzung von items[i] oder null
 */
export async function translateNames({ items, glossaryFor = () => [], provider, onProgress = () => {} }) {
  const texts = new Array(items.length).fill(null);
  const usage = { input: 0, output: 0 };
  for (let start = 0; start < items.length; start += CHUNK) {
    const chunk = items.slice(start, start + CHUNK);
    const glossary = new Map();
    for (const item of chunk) for (const g of glossaryFor(item.text)) glossary.set(g.source, g);
    const input = JSON.stringify({
      ...(glossary.size && { glossary: [...glossary.values()].map(g => ({ en: g.source, de: g.target || g.source })) }),
      items: chunk.map((item, i) => ({ id: i, kind: item.kind, text: item.text, ...(item.context && { context: item.context }) }))
    });
    const res = await provider.translate({ system: NAMES_PROMPT, input, schema: NAMES_SCHEMA, effort: "low" });
    usage.input += res.usage?.input ?? 0;
    usage.output += res.usage?.output ?? 0;
    for (const { id, text } of parseJson(res.text).names ?? []) {
      const item = chunk[id];
      if (item && validName(item.text, text)) texts[start + id] = text.trim();
    }
    onProgress(Math.min(start + CHUNK, items.length), items.length);
  }
  return { texts, usage };
}
