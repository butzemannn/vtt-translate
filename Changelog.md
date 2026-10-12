# Changelog

## 0.4.0 – 2026-10-12

- **Glossar** (Zentrale → Glossar): Namen und Begriffe EN → DE, leeres Deutsch = bleibt; wird beim Übersetzen strikt verwendet (nur Einträge, die auf der Seite vorkommen)
- **Namen vorschlagen**: LLM liest die ausgewählten Seiten und schlägt Glossar-Einträge vor; Vorschläge gelten erst nach dem Übernehmen
- **Prüf-Ansicht**: Original und Übersetzung absatzweise nebeneinander; Geprüft, Bearbeiten, Neu übersetzen mit Hinweis, Original wiederherstellen; Start aus der Zentrale oder dem Journal-Menü
- Neuer Status „Geprüft“
- Glossar und Hinweis stehen in der Anfrage statt im System-Prompt (Prompt-Caching beim Anbieter)

## 0.3.1 – 2026-10-12

- Zentrale: Restzeit während des Laufs und geschätzte Dauer der Auswahl (aus gemessener Dauer pro Seite, ab 3 Seiten)
- Zentrale: Suchleiste und Filter fest oben, nur die Liste scrollt; Scroll-Position bleibt beim Aktualisieren erhalten
- Suchleiste einheitlich formatiert

## 0.3.0 – 2026-10-12

- **Übersetzungs-Zentrale** (Knopf in der Journal-Seitenleiste): alle Ordner/Journale/Seiten mit Status, Filter, Suche, Auswahl per Haken
- Batch-Übersetzung über Warteschlange (3 parallel), Pause/Fortsetzen/Abbrechen, Fortschritt; offene Seiten überstehen Neuladen
- Kostenschätzung der Auswahl mit Live-Preisen von OpenRouter (aktuelles Modell, DeepSeek V4 Pro, Claude Sonnet/Opus 5.5); kalibriert sich an echten Verbrauchsdaten
- Status „von Hand geändert“ (Hash der Übersetzung); Rückfrage vor erneutem Übersetzen
- Original für ganze Auswahl wiederherstellen
- Status-Symbol je Journal in der Seitenleiste
- Provider liefern Token-Verbrauch; wird an der Seite gespeichert

## 0.2.0 – 2026-10-12

- Neuer Anbieter OpenRouter (`scripts/providers/openrouter.js`): Modell frei wählbar, Structured Output mit Fallback für Modelle ohne Unterstützung
- JSON-Antworten werden tolerant gelesen (Codeblöcke/Text drumherum)
- `tools/try-page.js`: Anbieter als drittes Argument, Key über `API_KEY`

## 0.1.0 – 2026-10-12

- Modul-Gerüst für Foundry v14 (`module.json`, Sprachdateien de/en)
- Einstellungen: Anbieter, Modell (Standard `claude-opus-5-5`), API-Key (nur im Browser)
- Blockweise HTML-Übersetzung (`scripts/html.js`): Attribute, Links und Würfelformeln geschützt, Prüfung jeder Antwort
- Übersetzer mit Stil-Prompt und einem Wiederholungsversuch für fehlerhafte Absätze (`scripts/translator.js`)
- Claude-Anbindung über gebündeltes Anthropic-SDK (`vendor/anthropic-sdk.mjs`)
- Original als Flag sichern, Wiederherstellen (`scripts/store.js`)
- Knöpfe „Seite übersetzen“ / „Original wiederherstellen“ im Journal-Fenster (nur GM)
- Release über GitHub Actions (Spiegel von Forgejo): Tag `vX.Y.Z` → `module.zip` + `module.json`, Installation per Manifest-URL
- Tests gegen die Sample-Journale, Skript für Probeübersetzungen (`tools/try-page.js`)
