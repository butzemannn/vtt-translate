# Dokumentation

## Aufbau

| Datei | Aufgabe |
|---|---|
| `scripts/main.js` | Einstellungen, Knöpfe im Journal-Fenster, Seitenleiste, Start der Warteschlange |
| `scripts/actions.js` | Eine Seite übersetzen/wiederherstellen (Foundry-Seite) |
| `scripts/queue.js` | Warteschlange: parallel, Pause, Fehler merken, Zustand speichern |
| `scripts/estimate.js` | Kostenschätzung ([ADR 0004](adr/0004-kostenschaetzung.md)) |
| `scripts/ui/center.js`, `templates/center/` | Übersetzungs-Zentrale |
| `scripts/ui/rows.js` | Baumzeilen der Zentrale: Filter, Auswahl, Statussummen |
| `scripts/translator.js` | Prompt, Anfrage, Prüfung, Wiederholung |
| `scripts/html.js` | HTML in Blöcke zerlegen / zusammensetzen ([ADR 0003](adr/0003-blockweise-uebersetzung.md)) |
| `scripts/store.js` | Übersetzung speichern, Original sichern/wiederherstellen ([ADR 0002](adr/0002-original-als-flag.md)) |
| `scripts/providers/` | Ein Adapter pro LLM: `translate({system, input, schema}) → JSON-Text`. Vorhanden: `claude` (Anthropic-SDK), `openrouter` (fetch, OpenAI-kompatibel) |
| `vendor/` | Gebündeltes Anthropic-SDK ([ADR 0001](adr/0001-kein-build-schritt.md)) |

## Ablauf „Seite übersetzen“

1. Original holen (Flag oder aktueller Text)
2. Blöcke bilden, eine Anfrage mit Kontext (Journal, Ordner, Seite)
3. Antwort prüfen, fehlerhafte Blöcke einmal neu anfragen
4. Text ersetzen, Original + Status als Flag speichern

## Status einer Seite

| Status | Bedeutung |
|---|---|
| offen | kein Flag |
| übersetzt / teilweise | aus Flag; teilweise = einzelne Absätze englisch geblieben |
| von Hand geändert | Inhalt passt nicht mehr zum gespeicherten Hash |
| wartet / in Arbeit / Fehler | nur in der Warteschlange (Fehler bis zum nächsten Versuch) |

## Daten

- Seite: `flags.vtt-translate.translation = { original, status, hash, model, usage, measure, translatedAt }`
  - `usage` = echte Tokens, `measure` = Zeichenzahlen der Anfrage → Kalibrierung der Schätzung
- Client-Setting `vtt-translate.queue = { pending: [uuid], errors: {uuid: text} }` – nach Neuladen pausiert, „Fortsetzen“ startet erneut
