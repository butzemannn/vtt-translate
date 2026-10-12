# Phase 2: Übersetzungs-Zentrale + Batch

Status: **abgeschlossen (0.3.1)**  ·  Gesamtplan: `plan.md`

## Ziel

Viele Journale mit wenigen Klicks übersetzen, jederzeit Überblick über den Stand.

## Umfang

1. **Zentrale** (ApplicationV2-Fenster, Knopf in der Journal-Seitenleiste)
   - Liste: Ordner → Journale → Seiten, eingerückt, Journale aufklappbar
   - Status pro Seite: offen, übersetzt, teilweise, von Hand geändert, Fehler, in Arbeit; Summe pro Journal/Ordner
   - Auswahl per Haken auf jeder Ebene; Filter nach Status, Suche nach Namen
   - Fußzeile: Anzahl Seiten, Wörter, Kostenschätzung
   - Aktionen: Übersetzen, Pause/Fortsetzen, Abbrechen, Original wiederherstellen (Auswahl)
2. **Warteschlange** (`queue.js`)
   - 3 Seiten parallel, Fehler blockieren nicht
   - Offene Seiten werden gespeichert (Client-Setting) → nach Neuladen fortsetzbar
3. **Status** (`status.js`)
   - Hash der geschriebenen Übersetzung im Flag → spätere Handänderung erkennbar
   - Handgeänderte Seiten nur nach Rückfrage neu übersetzen
4. **Kostenschätzung** (`estimate.js`)
   - Preise live von OpenRouter (`/api/v1/models`, ohne Key)
   - Vergleich: aktuelles Modell, DeepSeek V4 Pro 0813, Claude Sonnet 5.5, Claude Opus 5.5
   - Tokens aus Zeichenzahl geschätzt; sobald echte Verbrauchsdaten vorliegen (im Flag gespeichert), wird damit kalibriert
5. **Seitenleiste**: Status-Symbol je Journal
6. Doku, Changelog, Version 0.3.0

## Nicht in Phase 2

Prüf-Ansicht, Glossar-Editor, „Szene vorbereiten“, Seitennamen.

## Test

- Automatisch: Warteschlange (Parallelität, Pause, Fehler), Schätzung, Status-Hash
- Manuell in Foundry: Ordner mit allen 3 Sample-Journalen übersetzen; Pause/Fortsetzen; Neuladen mitten im Lauf; Wiederherstellen eines Journals

## Ergebnis (2026-10-12)

- Umgesetzt wie geplant. Automatische Tests: 36/36 (Warteschlange, Baum, Schätzung, Status, Templates).
- Unsicher (nur in Foundry prüfbar): DOM der v14-Seitenleiste (`.header-actions`, `[data-entry-id]`), Scroll-Erhalt der Liste beim Neuzeichnen.
