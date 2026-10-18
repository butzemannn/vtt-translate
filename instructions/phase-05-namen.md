# Phase 5: Namen

Status: **umgesetzt (0.7.0) – Test in Foundry offen**  ·  Gesamtplan: `plan.md`

## Ziel

Nicht nur Texte, sondern auch Namen deutsch: Seiten, Journale, Ordner, Szenen, Pins.

## Umfang

1. **Seitennamen** in derselben Anfrage wie der Seitentext (Block-Typ `title`, keine Zusatzkosten). Einstellung „Seitennamen mit übersetzen“ (an). Original in `translation.originalName`, Wiederherstellen setzt ihn zurück. Links ohne Label zeigen danach automatisch den deutschen Namen.
2. **Kurze Namen gebündelt** (`names.js`, 80 pro Anfrage, wenig Denkaufwand, Glossar gilt): Journal-Namen, Ordner (Journale + Szenen), Szenennamen (`name`, `navName`), Pin-Beschriftungen (`text`, nur wenn gesetzt).
3. **Dialog „Namen“** in der Zentrale: Arten anhaken, Zähler offen/übersetzt, „Offene übersetzen“ / „Wiederherstellen“.
4. Speichern gebündelt je Dokumentart bzw. je Szene (`updateDocuments` / `updateEmbeddedDocuments`). Original je Feld in `flags.vtt-translate.names.<feld>`.

## Ergebnis (2026-10-18)

- Automatische Tests: 64/64.
- Unsicher (nur in Foundry prüfbar): `DialogV2.wait` mit Formular-Checkboxen (`button.form`).
