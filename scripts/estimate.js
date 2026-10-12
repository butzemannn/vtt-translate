// Kostenschätzung: Zeichen → Tokens (grob oder kalibriert) × Preise von OpenRouter.
const PRICES_URL = "https://openrouter.ai/api/v1/models";

// Vergleichsmodelle in der Zentrale (OpenRouter-IDs).
export const COMPARE_MODELS = [
  "deepseek/deepseek-v4-pro-0813",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-opus-5.5"
];

// Grobe Annahmen ohne Messdaten: Zeichen pro Token; Output-Zuschlag für Deutsch + Denk-Tokens.
const CHARS_PER_TOKEN = 3.5;
const OUTPUT_FACTOR = 1.5;

let pricesPromise;

/** Preise pro Token je Modell-ID, einmal pro Sitzung geladen. */
export function loadPrices(fetchFn = fetch) {
  pricesPromise ??= fetchFn(PRICES_URL)
    .then(res => res.json())
    .then(({ data }) => new Map(data.map(m => [m.id, { name: m.name, input: Number(m.pricing.prompt), output: Number(m.pricing.completion) }])))
    .catch(err => {
      pricesPromise = undefined; // beim nächsten Mal erneut versuchen
      throw err;
    });
  return pricesPromise;
}

/** Modell-ID des Addons → OpenRouter-ID (Claude direkt: claude-opus-5-5 → anthropic/claude-opus-5.5). */
export function toOpenRouterId(provider, model) {
  if (provider === "openrouter") return model;
  if (provider === "claude") return `anthropic/${model.replace(/-(\d+)-(\d+)$/, "-$1.$2")}`;
  return model;
}

/**
 * Tokens pro Zeichen aus bereits übersetzten Seiten (measure + usage im Flag).
 * Ohne genug Daten: grobe Annahme.
 * @param {{measure?: object, usage?: object}[]} samples
 */
export function calibrate(samples) {
  let inChars = 0, outChars = 0, inTokens = 0, outTokens = 0, count = 0;
  for (const s of samples) {
    if (!s?.measure?.inputChars || !s.usage?.input) continue;
    inChars += s.measure.inputChars;
    outChars += s.measure.outputChars;
    inTokens += s.usage.input;
    outTokens += s.usage.output;
    count++;
  }
  if (count < 3) return { input: 1 / CHARS_PER_TOKEN, output: OUTPUT_FACTOR / CHARS_PER_TOKEN, calibrated: false, count };
  return { input: inTokens / inChars, output: outTokens / outChars, calibrated: true, count };
}

/**
 * Kosten in Dollar für die Summe der Zeichen.
 * @param {{inputChars: number, outputChars: number}} totals
 * @param {{input: number, output: number}} price  Dollar pro Token
 * @param {{input: number, output: number}} rate   Tokens pro Zeichen
 */
export function estimateCost(totals, price, rate) {
  return totals.inputChars * rate.input * price.input + totals.outputChars * rate.output * price.output;
}
