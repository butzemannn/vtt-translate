# Phase 3: Qualität + Prüfen

Status: **abgeschlossen (0.5.0)**  ·  Gesamtplan: `plan.md`

## Ziel

Einheitliche Namen über das ganze Abenteuer und eine bequeme Kontrolle der Übersetzungen.

## Umfang

1. **Glossar** (`glossary.js`, World-Setting)
   - Einträge `{source, target, kind}`; leeres `target` = bleibt unverändert
   - Pro Seite gehen nur Einträge in den Prompt, die im Text vorkommen (spart Tokens)
2. **Glossar-Vorschläge**
   - Aus der Auswahl in der Zentrale: Texte in Paketen ans LLM, Antwort = Liste von Namen/Begriffen mit Vorschlag
   - Vorschläge landen markiert im Glossar; erst nach Bestätigung gelten sie
3. **Glossar-Editor** (Fenster): Tabelle bearbeiten, Vorschläge übernehmen/verwerfen, „Alle übernehmen“, Suche
4. **Prüf-Ansicht** (Fenster)
   - Absatzweise EN | DE nebeneinander (gleiche Blockstruktur), Vorlesekästen hervorgehoben
   - Aktionen: Geprüft, Bearbeiten (Seiten-Editor), Neu übersetzen mit Hinweis, Original wiederherstellen
   - Vor/Zurück durch die Liste; Start aus der Zentrale (Auswahl oder alle ungeprüften) oder über das Journal-Menü
5. **Status „geprüft“** in Zentrale und Seitenleiste
6. Doku, Changelog, Version 0.4.0

## Nicht in Phase 3

Automatische Glossar-Vorschläge während der Übersetzung (ggf. später).

## Test

- Automatisch: Glossar-Filter/Zusammenführen, Vorschlags-Parsing, Hinweis im Prompt, Status „geprüft“, Block-Paarung der Prüf-Ansicht
- Manuell: Vorschläge für „2. Manor“ holen, übernehmen, Seite neu übersetzen; Prüf-Ansicht für die Sample-Journale durchklicken

## Ergebnis (2026-10-12)

- Umgesetzt wie geplant. Automatische Tests: 47/47.
- Unsicher (nur in Foundry prüfbar): `TextEditor.implementation.enrichHTML` in der Prüf-Ansicht, Fortschrittsanzeige der Benachrichtigung (`{progress: true}`).
