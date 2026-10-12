// Probeübersetzung einer Sample-Seite ohne Foundry (für Modellvergleich).
// Aufruf: API_KEY=... node tools/try-page.js "<Seitenname>" [modell] [anbieter: claude|openrouter]
// Ergebnis: out/<Seitenname>.<modell>.html (Original und Übersetzung untereinander)
import { mkdirSync, writeFileSync } from "node:fs";
import { samplePages } from "../tests/setup.js";
import { translateHtml } from "../scripts/translator.js";
import { createProvider } from "../scripts/providers/index.js";

const [pageName, model = "claude-opus-5-5", providerName = "claude"] = process.argv.slice(2);
const page = samplePages().find(p => p.name === pageName);
if (!page) {
  console.error(`Seite nicht gefunden. Vorhanden:\n${samplePages().map(p => p.name).join("\n")}`);
  process.exit(1);
}

const provider = createProvider(providerName, { apiKey: process.env.API_KEY, model });
const started = Date.now();
const result = await translateHtml({ html: page.html, context: { journal: page.journal, folder: "", page: page.name }, provider });

mkdirSync("out", { recursive: true });
const file = `out/${pageName.replace(/[^\w-]+/g, "_")}.${model.replace(/[^\w.-]+/g, "_")}.html`;
writeFileSync(file, `<meta charset="utf-8"><h1>${page.name} – ${model}</h1><h2>Deutsch</h2>${result.html}<hr><h2>Original</h2>${page.html}`);
console.log(`${file} – ${result.total - result.failed}/${result.total} Absätze, ${((Date.now() - started) / 1000).toFixed(1)} s, Tokens ${result.usage.input} rein / ${result.usage.output} raus`);
