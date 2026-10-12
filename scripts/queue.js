// Warteschlange für Batch-Übersetzungen: mehrere Seiten parallel, Fehler blockieren nicht.
// Ohne Foundry-Abhängigkeit; Speichern/Laden über save/load (Client-Setting).

export class TranslationQueue {
  /**
   * @param {object} opts
   * @param {(uuid: string) => Promise<void>} opts.worker  übersetzt eine Seite, wirft bei Fehler
   * @param {number} [opts.concurrency]
   * @param {() => void} [opts.onChange]
   * @param {(state: object) => void} [opts.save]
   * @param {object} [opts.saved]  gespeicherter Zustand aus einer früheren Sitzung
   */
  constructor({ worker, concurrency = 3, onChange = () => {}, save = () => {}, saved }) {
    this.worker = worker;
    this.concurrency = concurrency;
    this.onChange = onChange;
    this.save = save;
    this.pending = [...(saved?.pending ?? [])];
    this.errors = new Map(Object.entries(saved?.errors ?? {}));
    this.active = new Set();
    this.done = 0;
    this.total = this.pending.length;
    // Gespeicherte Reste starten nicht von selbst, sondern warten auf „Fortsetzen“.
    this.paused = this.pending.length > 0;
  }

  get running() {
    return this.active.size > 0 || (!this.paused && this.pending.length > 0);
  }

  /** Status einer Seite in der Schlange: "active" | "queued" | "error" | undefined */
  statusOf(uuid) {
    if (this.active.has(uuid)) return "active";
    if (this.pending.includes(uuid)) return "queued";
    if (this.errors.has(uuid)) return "error";
  }

  add(uuids) {
    if (!this.running && !this.pending.length) {
      this.done = 0;
      this.total = 0;
    }
    for (const uuid of uuids) {
      if (this.active.has(uuid) || this.pending.includes(uuid)) continue;
      this.errors.delete(uuid);
      this.pending.push(uuid);
      this.total++;
    }
    this.paused = false;
    this.#changed();
    this.#next();
  }

  pause() {
    this.paused = true;
    this.#changed();
  }

  resume() {
    this.paused = false;
    this.#changed();
    this.#next();
  }

  /** Leert die Schlange; laufende Seiten werden noch fertig. */
  cancel() {
    this.total -= this.pending.length;
    this.pending = [];
    this.paused = false;
    this.#changed();
  }

  #next() {
    while (!this.paused && this.active.size < this.concurrency && this.pending.length) {
      const uuid = this.pending.shift();
      this.active.add(uuid);
      this.#run(uuid);
    }
  }

  async #run(uuid) {
    try {
      await this.worker(uuid);
      this.errors.delete(uuid);
    } catch (err) {
      this.errors.set(uuid, err.message ?? String(err));
    } finally {
      this.active.delete(uuid);
      this.done++;
      this.#changed();
      this.#next();
    }
  }

  #changed() {
    // Laufende Seiten mitspeichern: nach Neuladen kommen sie wieder in die Schlange.
    this.save({ pending: [...this.active, ...this.pending], errors: Object.fromEntries(this.errors) });
    this.onChange();
  }
}
