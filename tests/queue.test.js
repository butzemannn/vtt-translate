import { test } from "node:test";
import assert from "node:assert/strict";
import { TranslationQueue } from "../scripts/queue.js";

// Worker, dessen Aufrufe einzeln von außen abgeschlossen werden.
function controlledWorker() {
  const calls = new Map();
  const worker = uuid => new Promise((resolve, reject) => calls.set(uuid, { resolve, reject }));
  return { worker, calls };
}

const tick = () => new Promise(r => setTimeout(r, 0));

test("Höchstens concurrency Seiten gleichzeitig", async () => {
  const { worker, calls } = controlledWorker();
  const q = new TranslationQueue({ worker, concurrency: 2 });
  q.add(["a", "b", "c"]);
  assert.deepEqual([...calls.keys()], ["a", "b"]);
  assert.equal(q.statusOf("c"), "queued");

  calls.get("a").resolve();
  await tick();
  assert.deepEqual([...calls.keys()], ["a", "b", "c"]);
  assert.equal(q.done, 1);
});

test("Fehler werden gemerkt und blockieren nicht", async () => {
  const q = new TranslationQueue({ worker: async uuid => { if (uuid === "b") throw new Error("kaputt"); }, concurrency: 1 });
  q.add(["a", "b", "c"]);
  for (let i = 0; i < 5; i++) await tick();
  assert.equal(q.done, 3);
  assert.equal(q.statusOf("b"), "error");
  assert.equal(q.errors.get("b"), "kaputt");
  assert.equal(q.running, false);
});

test("Pause hält neue Seiten an, Fortsetzen macht weiter", async () => {
  const { worker, calls } = controlledWorker();
  const q = new TranslationQueue({ worker, concurrency: 1 });
  q.add(["a", "b"]);
  q.pause();
  calls.get("a").resolve();
  await tick();
  assert.equal(calls.has("b"), false);
  q.resume();
  assert.equal(calls.has("b"), true);
});

test("Zustand wird gespeichert und nach Neuladen pausiert übernommen", async () => {
  let saved;
  const { worker } = controlledWorker();
  const q = new TranslationQueue({ worker, concurrency: 1, save: s => (saved = s) });
  q.add(["a", "b"]);
  assert.deepEqual(saved.pending, ["a", "b"]);

  const restored = new TranslationQueue({ worker, saved });
  assert.equal(restored.paused, true);
  assert.deepEqual(restored.pending, ["a", "b"]);
});

test("Abbrechen leert die Schlange", async () => {
  const { worker, calls } = controlledWorker();
  const q = new TranslationQueue({ worker, concurrency: 1 });
  q.add(["a", "b", "c"]);
  q.cancel();
  calls.get("a").resolve();
  await tick();
  assert.equal(calls.size, 1);
  assert.equal(q.running, false);
  assert.equal(q.total, 1);
});
