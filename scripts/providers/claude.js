// Provider für Claude (Anthropic). Aufruf direkt aus dem Browser des GM.
import Anthropic from "../../vendor/anthropic-sdk.mjs";

export function createClaudeProvider({ apiKey, model }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return {
    /** @returns {Promise<string>} JSON-Text gemäß schema */
    async translate({ system, input, schema }) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: input }],
        output_config: { effort: "medium", format: { type: "json_schema", schema } },
        // Bei Ablehnung durch Sicherheitsfilter (z. B. Horror-Szenen) automatisch passendes Ersatzmodell.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default"
      });

      if (response.stop_reason === "refusal") throw new Error("Claude hat die Übersetzung abgelehnt.");
      if (response.stop_reason === "max_tokens") throw new Error("Antwort zu lang (max_tokens erreicht).");
      const text = response.content.find(b => b.type === "text")?.text;
      if (!text) throw new Error("Leere Antwort von Claude.");
      return text;
    }
  };
}
