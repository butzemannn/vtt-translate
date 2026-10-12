# Dokumentation

## Aufbau

| Datei | Aufgabe |
|---|---|
| `scripts/main.js` | Einstellungen, Knöpfe im Journal-Fenster |
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

## Daten an der Seite

`flags.vtt-translate.translation = { original, status: "translated" | "partial", model, translatedAt }`
