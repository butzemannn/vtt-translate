// Wählt den Provider anhand der Einstellungen.
// Schnittstelle: translate({system, input, schema}) → {text, usage: {input, output}}
import { createClaudeProvider } from "./claude.js";
import { createOpenRouterProvider } from "./openrouter.js";

const FACTORIES = {
  claude: createClaudeProvider,
  openrouter: createOpenRouterProvider
};

export function createProvider(name, options) {
  const factory = FACTORIES[name];
  if (!factory) throw new Error(`Unbekannter Anbieter: ${name}`);
  return factory(options);
}
