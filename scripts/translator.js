// Übersetzt eine Seite: Blöcke bilden, Prompt bauen, Provider aufrufen, prüfen, zurückschreiben.
// Bewusst ohne Foundry-Abhängigkeit, damit es in Node testbar ist.
import { splitBlocks, validateBlock, applyBlock, joinBlocks } from "./html.js";

const SYSTEM_PROMPT = `You translate content of a Dungeons & Dragons 5e adventure (Curse of Strahd, gothic horror) from English into German for a German gaming group.

Style:
- Read-aloud boxes (type "readaloud") are narrated to the players: atmospheric, dark, elevated German prose. Address the group as "Ihr/Euch/Euer".
- Letters, diaries, inscriptions: old-fashioned language matching the age and character of the author.
- GM text (type "text"): clear, factual German.
- Poems and riddles: re-create them in German (rhythm, rhyme if the original rhymes). A riddle must work in German; adapt its answer accordingly when it appears.
- Rules terms: use the official German D&D 5e terminology, e.g. "DC 15 Intelligence (Investigation) check" → "SG-15-Intelligenzwurf (Nachforschungen)", "passive Perception" → "passive Weisheit (Wahrnehmung)", "saving throw" → "Rettungswurf", "gp" → "GM", spell and item names with their official German names.
- Proper names of persons and places stay unchanged unless the glossary says otherwise.

Format:
- Each block is an HTML fragment. Translate only the text.
- Keep every element with its k attribute exactly once and with the same tag. You may reorder elements and move text in or out of them where German grammar requires it. Do not add elements or attributes.
- <x-ref> elements are links: translate their text if they have any, keep empty ones empty.
- Blocks belong together (e.g. lines of a poem): use the context, but return exactly one translation per block id.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, html: { type: "string" } },
        required: ["id", "html"],
        additionalProperties: false
      }
    }
  },
  required: ["blocks"],
  additionalProperties: false
};

function buildSystem(glossary) {
  if (!glossary?.length) return SYSTEM_PROMPT;
  const lines = glossary.map(g => `- ${g.source} → ${g.target || g.source}`);
  return `${SYSTEM_PROMPT}\n\nGlossary (mandatory):\n${lines.join("\n")}`;
}

function buildInput(context, blocks, notes = {}) {
  return JSON.stringify({
    context,
    blocks: blocks.map(b => ({ id: b.id, type: b.type, html: b.html, ...(notes[b.id] && { fix: notes[b.id] }) }))
  });
}

async function requestBlocks(provider, system, context, blocks, notes) {
  const text = await provider.translate({ system, input: buildInput(context, blocks, notes), schema: RESPONSE_SCHEMA });
  const result = new Map();
  for (const b of JSON.parse(text).blocks ?? []) result.set(b.id, b.html);
  return result;
}

/**
 * Übersetzt das HTML einer Seite.
 * @param {object} args
 * @param {string} args.html            Original-HTML
 * @param {object} args.context         z. B. {journal, folder, page}
 * @param {{source:string,target:string}[]} [args.glossary]
 * @param {{translate: Function}} args.provider
 * @returns {Promise<{html: string, failed: number, total: number}>}
 */
export async function translateHtml({ html, context, glossary, provider }) {
  const { root, blocks } = splitBlocks(html);
  if (!blocks.length) return { html, failed: 0, total: 0 };

  const system = buildSystem(glossary);
  let pending = blocks;
  let notes = {};

  // Erster Versuch für alle Blöcke, zweiter nur für fehlerhafte (mit Fehlerhinweis).
  for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
    const result = await requestBlocks(provider, system, context, pending, notes);
    const retry = [];
    notes = {};
    for (const block of pending) {
      const translated = result.get(block.id);
      const errors = translated === undefined ? ["Block fehlt in der Antwort"] : validateBlock(block, translated);
      if (errors.length) {
        retry.push(block);
        notes[block.id] = errors.join("; ");
      } else {
        applyBlock(block, translated);
      }
    }
    pending = retry;
  }

  // Fehlgeschlagene Blöcke bleiben im Original stehen.
  return { html: joinBlocks(root), failed: pending.length, total: blocks.length };
}
