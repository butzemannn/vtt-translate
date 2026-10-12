# Phase 1: Grundgerüst

Status: **abgeschlossen**  ·  Gesamtplan: `plan.md`

## Ziel

Eine einzelne Journal-Seite per Knopf mit Claude übersetzen und wiederherstellen. Formatierung, Links und Enricher bleiben intakt. Grundlage für Zentrale und Batch (Phase 2).

## Umfang

1. **Modul-Gerüst** – `module.json` (id `vtt-translate`, nur v14, dnd5e), `scripts/main.js`, `lang/de.json`, `lang/en.json`.
2. **Settings**
   - `provider` (world): vorerst nur `claude`
   - `model` (world): Default `claude-opus-5-5`
   - `apiKey` (client): nur im Browser des GM
3. **`html.js`** – Seite in Blöcke zerlegen und wieder zusammensetzen
   - Blöcke: `p`, `h1–h6`, `li` (ohne eigenes `p`), `td`/`th`; leere Blöcke überspringen
   - Blocktyp: `readaloud` (innerhalb `blockquote`), sonst `text`
   - Platzhalter für `@UUID[...]`, `@Embed[...]`, `[[...]]`, `href`-Ziele; Label von Links bleibt übersetzbar
   - Prüfung: gleiche Tags und alle Platzhalter in der Antwort
4. **Provider Claude** – `providers/claude.js`, Schnittstelle `translate(systemPrompt, input) → output`
5. **`translator.js`** – System-Prompt (Stil, Regelbegriffe, Rätsel, „Ihr“ im Vorlesetext, Glossar-Platzhalter), Kontext (Journal, Ordner, Seite), Blöcke als nummeriertes JSON rein/raus, ein Retry bei fehlerhaften Blöcken
6. **`store.js`** – Original als Flag sichern (nur beim ersten Mal), Übersetzung per `update()` schreiben, Status-Flag, Wiederherstellen
7. **UI** – Im Journal-Fenster (nur GM): „Seite übersetzen“, „Original wiederherstellen“; Benachrichtigung bei Erfolg/Fehler
8. **Doku** – `README.md`, `Changelog.md`, `docs/adr/0001-kein-build-schritt.md`, `docs/adr/0002-original-als-flag.md`, `docs/adr/0003-blockweise-uebersetzung.md`

## Nicht in Phase 1

Zentrale, Batch, Glossar-Editor, Prüf-Ansicht, Seitennamen, weitere Anbieter.

## Zu Beginn prüfen

- v14-API: Hook/Methode für Knöpfe im Journal-Fenster (ApplicationV2 `getHeaderControls…`) und Kontextmenüs
- Claude-Anbindung im Browser: offizielles SDK als vorgebündelte ESM-Datei vs. `fetch` → ADR 0001
- Anthropic-API: aktuelles Request-Format, Structured Output für die JSON-Antwort

## Test

- `html.js` per Node-Test gegen die Seiten aus `samples/` (Zerlegen → Zusammensetzen ohne Übersetzung = identisches HTML; Platzhalter-Prüfung)
- Manuell in Foundry: Seiten „Foyer“, „Secret Room“, „Sir Spenser's Sarcophagus“, „Count's Lair“ (lang) übersetzen und wiederherstellen; Links, Würfel, Vorlesekasten prüfen
- Probeübersetzung Opus 5.5 vs. Sonnet 5.5 → Standardmodell festlegen

## Ergebnis (2026-10-12)

- Umgesetzt wie geplant. Automatische Tests: 11/11 grün (alle 60 Sample-Seiten bleiben beim Zurückschreiben identisch).
- v14-API: Knöpfe über Hook `getHeaderControlsJournalEntrySheet(app, controls)` mit `onClick`; aktuelle Seite über `app.pageId`.
- Claude: SDK gebündelt (ADR 0001), Structured Output (`output_config.format`), Fallback-Modell bei Ablehnung (`fallbacks: "default"`).
- Zusätzlich OpenRouter als Anbieter (0.2.0). Test in Foundry mit DeepSeek über OpenRouter erfolgreich (2026-10-12).

## Fertig, wenn

- Die Testseiten sind übersetzt, sehen formatiert aus wie vorher, alle Links und Würfel funktionieren.
- Wiederherstellen liefert exakt das Original.
- Kein neues Dokument entstanden, Ordnerstruktur unverändert.
