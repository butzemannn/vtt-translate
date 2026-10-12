// Wählt den Provider anhand der Einstellungen.
import { createClaudeProvider } from "./claude.js";

const FACTORIES = {
  claude: createClaudeProvider
};

export function createProvider(name, options) {
  const factory = FACTORIES[name];
  if (!factory) throw new Error(`Unbekannter Anbieter: ${name}`);
  return factory(options);
}
