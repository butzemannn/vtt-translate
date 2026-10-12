import { test } from "node:test";
import assert from "node:assert/strict";
import { calibrate, estimateCost, toOpenRouterId, loadPrices } from "../scripts/estimate.js";
import { samplePages } from "./setup.js";
import { measureHtml } from "../scripts/translator.js";

test("Claude-ID wird auf OpenRouter abgebildet", () => {
  assert.equal(toOpenRouterId("claude", "claude-opus-5-5"), "anthropic/claude-opus-5.5");
  assert.equal(toOpenRouterId("openrouter", "deepseek/deepseek-v4-pro-0813"), "deepseek/deepseek-v4-pro-0813");
});

test("Ohne genug Messdaten grobe Annahme, sonst kalibriert", () => {
  assert.equal(calibrate([]).calibrated, false);
  const s = { measure: { inputChars: 1000, outputChars: 500 }, usage: { input: 400, output: 300 } };
  const rate = calibrate([s, s, s]);
  assert.equal(rate.calibrated, true);
  assert.equal(rate.input, 0.4);
  assert.equal(rate.output, 0.6);
});

test("Kosten = Zeichen × Tokens/Zeichen × Preis", () => {
  const cost = estimateCost({ inputChars: 1e6, outputChars: 1e6 }, { input: 1e-6, output: 2e-6 }, { input: 0.5, output: 0.25 });
  assert.equal(cost, 0.5 + 0.5);
});

test("Preise werden geladen und zwischengespeichert", async () => {
  let calls = 0;
  const fetchFn = async () => { calls++; return { json: async () => ({ data: [{ id: "a/b", name: "B", pricing: { prompt: "0.000001", completion: "0.000002" } }] }) }; };
  const prices = await loadPrices(fetchFn);
  await loadPrices(fetchFn);
  assert.equal(calls, 1);
  assert.deepEqual(prices.get("a/b"), { name: "B", input: 1e-6, output: 2e-6 });
});

test("Schätzung für die Samples liegt in plausibler Größenordnung", () => {
  const totals = samplePages().map(p => measureHtml(p.html)).reduce((a, m) => ({ inputChars: a.inputChars + m.inputChars, outputChars: a.outputChars + m.outputChars, words: a.words + m.words }), { inputChars: 0, outputChars: 0, words: 0 });
  const opus = estimateCost(totals, { input: 4e-6, output: 20e-6 }, calibrate([]));
  assert.ok(totals.words > 10000 && totals.words < 20000, `Wörter: ${totals.words}`);
  assert.ok(opus > 0.3 && opus < 3, `Opus: ${opus.toFixed(2)} $`);
});
