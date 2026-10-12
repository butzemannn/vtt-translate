// Wählt den Provider anhand der Einstellungen.
// Schnittstelle: translate({system, input, schema, effort?}) → {text, usage: {input, output}}
// effort: "low" | "medium" | "high" – Denkaufwand, falls das Modell es unterstützt.
import { createClaudeProvider } from "./claude.js";
import { createOpenRouterProvider } from "./openrouter.js";

// Alle Provider haben ein Zeitlimit von 5 Min. pro Anfrage (Fehler statt endlosem Warten).
const FACTORIES = {
  claude: createClaudeProvider,
  openrouter: createOpenRouterProvider
};

export function createProvider(name, options) {
  const factory = FACTORIES[name];
  if (!factory) throw new Error(`Unbekannter Anbieter: ${name}`);
  return factory(options);
}
