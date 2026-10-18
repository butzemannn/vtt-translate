# Phase 4: Am Spieltisch

Status: **umgesetzt (0.6.0) – Test in Foundry offen**  ·  Gesamtplan: `plan.md`

## Ziel

Übersetzen genau dann, wenn es gebraucht wird – ohne alles vorab zu übersetzen.

## Umfang

1. **Szene vorbereiten** (`scene.js`)
   - Seiten aller Map-Pins einer Szene (Pin mit Seite → Seite, Pin auf Journal → alle Textseiten)
   - plus per `@UUID` verlinkte Seiten, eine Ebene (z. B. Gegenstände)
   - Einstieg: Kontextmenü der Szenen-Seitenleiste, Knopf „Aktuelle Szene“ in der Zentrale
   - Öffnet die Zentrale mit diesen Seiten ausgewählt → Kosten/Dauer sichtbar, ein Klick auf Übersetzen
2. **Beim Öffnen übersetzen** (World-Setting, aus): öffnet der GM ein Journal mit offenen Seiten, kommen sie in die Warteschlange

## Ergebnis (2026-10-18)

- Automatische Tests: 57/57 (Seiten-Sammlung mit Pins, Journalen, Links).
- v14-Kontextmenü: `label`/`icon`/`visible`/`onClick` (statt `name`/`callback`/`condition`).
- Unsicher (nur in Foundry prüfbar): Hook `getSceneContextOptions`, `fromUuidSync` mit relativen Links.
