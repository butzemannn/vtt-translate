// Zerlegt Seiten-HTML in übersetzbare Blöcke und setzt es wieder zusammen.
// Das LLM sieht pro Block nur Text + Inline-Elemente mit Kennung k="N" (ohne Attribute).
// Foundry-Links und Enricher werden zu <x-ref>-Elementen, damit ihr Ziel geschützt ist.

// Blöcke = diese Elemente, sofern sie keinen weiteren Block enthalten.
const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "DT", "DD", "CAPTION", "FIGCAPTION"]);

// @UUID[..]{Label}, &Reference[..]{Label}, [[/r 1d6]]{Label} – Label optional.
const REF_PATTERN = /(@\w+\[[^\]]*\]|&\w+\[[^\]]*\]|\[\[.*?\]\])(?:\{([^}]*)\})?/g;

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function parseBody(html) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
}

/**
 * Zerlegt HTML in Blöcke.
 * @returns {{root: HTMLElement, blocks: {id: number, type: string, html: string, el: HTMLElement, refs: object[]}[]}}
 */
export function splitBlocks(html) {
  const root = parseBody(html);
  const blocks = [];
  for (const el of root.querySelectorAll([...BLOCK_TAGS].join(","))) {
    if (hasBlockChild(el)) continue;
    // Nichts zu übersetzen: leer oder nur Links ohne Label / Würfelformeln.
    const plain = el.textContent.replace(REF_PATTERN, (m, target, label) => label ?? "");
    if (!plain.trim()) continue;
    const type = el.closest("blockquote") ? "readaloud" : "text";
    blocks.push({ id: blocks.length, type, el, ...prepareBlock(el) });
  }
  return { root, blocks };
}

function hasBlockChild(el) {
  for (const child of el.querySelectorAll("*")) {
    if (BLOCK_TAGS.has(child.tagName)) return true;
  }
  return false;
}

/** Erzeugt die LLM-Fassung eines Blocks: Attribute raus, k-Kennung rein, Links geschützt. */
function prepareBlock(el) {
  const clone = el.cloneNode(true);
  const refs = [];
  protectRefs(clone, refs);

  const attrs = [];
  for (const child of clone.querySelectorAll("*")) {
    const k = attrs.length;
    attrs.push({ tag: child.tagName, attributes: [...child.attributes].map(a => [a.name, a.value]) });
    for (const a of [...child.attributes]) child.removeAttribute(a.name);
    child.setAttribute("k", String(k));
  }
  return { html: clone.innerHTML, attrs, refs };
}

/** Ersetzt Links/Enricher in Textknoten durch <x-ref>; Label (falls vorhanden) bleibt als Inhalt übersetzbar. */
function protectRefs(node, refs) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === ELEMENT_NODE) protectRefs(child, refs);
    if (child.nodeType !== TEXT_NODE) continue;

    const text = child.nodeValue;
    const matches = [...text.matchAll(REF_PATTERN)];
    if (!matches.length) continue;

    const doc = node.ownerDocument;
    const frag = doc.createDocumentFragment();
    let last = 0;
    for (const m of matches) {
      frag.append(text.slice(last, m.index));
      const ref = doc.createElement("x-ref");
      ref.setAttribute("data-ref", String(refs.length));
      refs.push({ target: m[1], hasLabel: m[2] !== undefined });
      if (m[2] !== undefined) ref.textContent = m[2];
      frag.append(ref);
      last = m.index + m[0].length;
    }
    frag.append(text.slice(last));
    child.replaceWith(frag);
  }
}

/**
 * Prüft eine übersetzte Block-Fassung gegen die Quelle.
 * @returns {string[]} Fehlerliste, leer = gültig
 */
export function validateBlock(block, translatedHtml) {
  const errors = [];
  const el = parseBody(translatedHtml);
  const seen = new Set();
  for (const child of el.querySelectorAll("*")) {
    const k = child.getAttribute("k");
    const src = block.attrs[Number(k)];
    if (k === null || !src) errors.push(`Unbekanntes Element <${child.tagName.toLowerCase()}>`);
    else if (seen.has(k)) errors.push(`Element k="${k}" doppelt`);
    else if (src.tag !== child.tagName) errors.push(`Element k="${k}" ist <${child.tagName.toLowerCase()}> statt <${src.tag.toLowerCase()}>`);
    if (k !== null) seen.add(k);
  }
  for (let k = 0; k < block.attrs.length; k++) {
    if (!seen.has(String(k))) errors.push(`Element k="${k}" fehlt`);
  }
  return errors;
}

/** Schreibt eine (validierte) Übersetzung in den Block zurück: Attribute und Links wiederherstellen. */
export function applyBlock(block, translatedHtml) {
  const el = parseBody(translatedHtml);
  for (const child of el.querySelectorAll("[k]")) {
    const src = block.attrs[Number(child.getAttribute("k"))];
    child.removeAttribute("k");
    for (const [name, value] of src.attributes) child.setAttribute(name, value);
  }
  for (const ref of el.querySelectorAll("x-ref")) {
    const src = block.refs[Number(ref.getAttribute("data-ref"))];
    const label = src.hasLabel ? `{${ref.textContent}}` : "";
    ref.replaceWith(src.target + label);
  }
  block.el.innerHTML = el.innerHTML;
}

/** Gesamtes HTML nach applyBlock(). */
export function joinBlocks(root) {
  return root.innerHTML;
}

/** Normalisiert HTML so, wie der Browser es serialisiert (für Vergleiche in Tests). */
export function normalizeHtml(html) {
  return parseBody(html).innerHTML;
}

/** Reiner Text einer Seite (für Glossar-Suche und -Vorschläge); Link-Ziele raus, Labels bleiben. */
export function plainText(html) {
  const text = parseBody(html.replace(/<\/(p|h\d|li|td|th|div|blockquote)>/gi, "$&\n")).textContent;
  return text.replace(REF_PATTERN, (m, target, label) => label ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

/**
 * Paart Blöcke von Original und Übersetzung (gleiche Struktur) für den Vergleich.
 * @returns {{type: string, original: string, translated: string}[] | null}  null, wenn die Struktur abweicht
 */
export function pairBlocks(originalHtml, translatedHtml) {
  const a = splitBlocks(originalHtml).blocks;
  const b = splitBlocks(translatedHtml).blocks;
  if (a.length !== b.length || a.some((block, i) => block.el.tagName !== b[i].el.tagName)) return null;
  return a.map((block, i) => ({ type: block.type, original: block.el.innerHTML, translated: b[i].el.innerHTML }));
}
