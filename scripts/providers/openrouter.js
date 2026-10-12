// Provider für OpenRouter (OpenAI-kompatible API, viele Modelle). Aufruf direkt aus dem Browser.
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function createOpenRouterProvider({ apiKey, model }) {
  async function request(body) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "VTT Translate"
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      const err = new Error(`OpenRouter ${res.status}: ${data.error?.message ?? res.statusText}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    /** @returns {Promise<{text: string, usage: {input: number, output: number}}>} */
    async translate({ system, input, schema }) {
      const body = {
        model,
        max_tokens: 16000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input }
        ]
      };

      let data;
      try {
        data = await request({ ...body, response_format: { type: "json_schema", json_schema: { name: "translation", strict: true, schema } } });
      } catch (err) {
        // Nicht jedes Modell kann Structured Output → ohne erneut; der Prompt verlangt ohnehin JSON.
        if (err.status !== 400 && err.status !== 404) throw err;
        data = await request(body);
      }

      const choice = data.choices?.[0];
      if (choice?.finish_reason === "length") throw new Error("Antwort zu lang (max_tokens erreicht).");
      if (choice?.finish_reason === "content_filter") throw new Error("Modell hat die Übersetzung abgelehnt.");
      const text = choice?.message?.content;
      if (!text) throw new Error("Leere Antwort von OpenRouter.");
      return { text, usage: { input: data.usage?.prompt_tokens ?? 0, output: data.usage?.completion_tokens ?? 0 } };
    }
  };
}
