import { test } from "node:test";
import assert from "node:assert/strict";
import { createOpenRouterProvider } from "../scripts/providers/openrouter.js";
import { parseJson } from "../scripts/translator.js";

// fetch-Attrappe: liefert nacheinander die übergebenen Antworten und merkt sich die Requests.
function mockFetch(responses) {
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push(JSON.parse(init.body));
    const { status = 200, body } = responses.shift();
    return { ok: status < 400, status, statusText: "", json: async () => body };
  };
  return requests;
}

const ok = content => ({ body: { choices: [{ finish_reason: "stop", message: { content } }], usage: { prompt_tokens: 7, completion_tokens: 3 } } });
const args = { system: "s", input: "i", schema: { type: "object" } };

test("Sendet Structured Output und liefert den Text", async () => {
  const requests = mockFetch([ok('{"blocks":[]}')]);
  const { text } = await createOpenRouterProvider({ apiKey: "k", model: "m" }).translate(args);
  assert.equal(text, '{"blocks":[]}');
  assert.equal(requests[0].response_format.type, "json_schema");
  assert.equal(requests[0].model, "m");
});

test("Liefert den Verbrauch", async () => {
  mockFetch([ok("{}")]);
  const { usage } = await createOpenRouterProvider({ apiKey: "k", model: "m" }).translate(args);
  assert.deepEqual(usage, { input: 7, output: 3 });
});

test("Ohne Structured Output erneut, wenn das Modell es nicht kann", async () => {
  const requests = mockFetch([{ status: 400, body: { error: { message: "response_format not supported" } } }, ok("{}")]);
  await createOpenRouterProvider({ apiKey: "k", model: "m" }).translate(args);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].response_format, undefined);
});

test("Andere Fehler werden durchgereicht", async () => {
  mockFetch([{ status: 401, body: { error: { message: "No auth" } } }]);
  await assert.rejects(createOpenRouterProvider({ apiKey: "k", model: "m" }).translate(args), /401: No auth/);
});

test("JSON auch aus Codeblock lesbar", () => {
  assert.deepEqual(parseJson('Hier:\n```json\n{"blocks":[{"id":0,"html":"x"}]}\n```'), { blocks: [{ id: 0, html: "x" }] });
});

test("Denkaufwand wird als reasoning gesendet, Zeitlimit gesetzt", async () => {
  let init;
  globalThis.fetch = async (url, i) => { init = i; return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: "{}" } }] }) }; };
  await createOpenRouterProvider({ apiKey: "k", model: "m" }).translate({ ...args, effort: "low" });
  assert.deepEqual(JSON.parse(init.body).reasoning, { effort: "low" });
  assert.ok(init.signal, "AbortSignal gesetzt");
});

test("Zeitüberschreitung gibt verständlichen Fehler", async () => {
  globalThis.fetch = async () => { const e = new Error("timeout"); e.name = "TimeoutError"; throw e; };
  await assert.rejects(createOpenRouterProvider({ apiKey: "k", model: "m" }).translate(args), /Keine Antwort von OpenRouter nach 5 Min/);
});
