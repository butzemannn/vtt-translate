# Changelog

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
