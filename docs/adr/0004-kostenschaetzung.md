# ADR 0004: Kostenschätzung über die OpenRouter-Preisliste

Status: angenommen · 2026-10-12

## Kontext

Vor einem Batch sollen Kosten für das gewählte Modell und Vergleichsmodelle (DeepSeek, Claude) sichtbar sein. Preise ändern sich.

## Entscheidung

- Preise live von `https://openrouter.ai/api/v1/models` (öffentlich, ohne Key, CORS erlaubt), einmal pro Sitzung. Enthält auch die Claude-Modelle zu Anthropic-Preisen; Claude-IDs werden umgerechnet (`claude-opus-5-5` → `anthropic/claude-opus-5.5`).
- Tokens werden aus Zeichen geschätzt (3,5 Zeichen/Token, Output × 1,5 für Deutsch und Denk-Tokens).
- Sobald ≥ 3 Seiten mit echtem Verbrauch übersetzt sind, wird das Verhältnis Tokens/Zeichen daraus berechnet.

## Folgen

- Keine gepflegte Preistabelle im Code.
- Ohne Internet/bei Fehler keine Kostenanzeige, Übersetzen geht trotzdem.
- Kalibrierung mischt Modelle (andere Tokenizer) – für eine Schätzung ausreichend.
