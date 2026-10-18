# VTT Translate

Foundry-VTT-Modul (v14), das Journal-Seiten per LLM ins Deutsche übersetzt – im Stil der Spielwelt, mit erhaltener Formatierung und Links. Entwickelt für *Legends of Barovia* (Curse of Strahd, dnd5e).

## Stand

Version 0.7.0 – Übersetzungs-Zentrale mit Batch und Kostenschätzung, Glossar mit Vorschlägen, Prüf-Ansicht. Anbieter: Claude (Anthropic) oder OpenRouter. Plan: `instructions/plan.md`.

## Installation

Foundry → Add-on-Module → Modul installieren → Manifest-URL:

```
https://github.com/<owner>/<repo>/releases/latest/download/module.json
```

Danach in der Welt aktivieren → Einstellungen → VTT Translate → Anbieter, Modell und API-Key eintragen.

Für Entwicklung alternativ per Symlink: `ln -s /pfad/zu/vtt-translate <Foundry-Data>/modules/vtt-translate`. Releases: `docs/release.md`.

## Benutzung (nur GM)

- **Viele Seiten:** Journal-Seitenleiste → **Übersetzungs-Zentrale** → Seiten/Journale/Ordner anhaken (oder „Offene auswählen“) → Kosten prüfen → **Übersetzen**. Läuft im Hintergrund, Pause/Fortsetzen möglich.
- **Glossar:** Zentrale → Glossar → **Aus Kompendien** (offizielle deutsche Zauber-/Item-/Monsternamen, wenn ein deutsches dnd5e-Übersetzungsmodul mit Babele aktiv ist). Dann Seiten auswählen → **Namen vorschlagen** → prüfen und übernehmen. Am besten vor dem ersten großen Lauf.
- **Prüfen:** Zentrale → **Prüfen** (Auswahl oder alle ungeprüften) → absatzweise EN/DE vergleichen, ggf. mit Hinweis neu übersetzen.
- **Vor der Sitzung:** Szenen-Seitenleiste → Rechtsklick auf Szene → **Szene vorbereiten** (oder Zentrale → **Aktuelle Szene**) → Übersetzen.
- **Automatisch:** Einstellung „Beim Öffnen übersetzen“ – Journale werden übersetzt, sobald der GM sie öffnet.
- **Namen:** Seitennamen kommen automatisch mit. Journal-, Ordner-, Szenennamen und Pin-Beschriftungen: Zentrale → **Namen**.
- **Eine Seite:** Journal öffnen → Menü oben rechts → **Seite übersetzen** bzw. **Original wiederherstellen**.

## Entwicklung

```bash
npm install
npm test                                  # Tests gegen samples/
npm run vendor                            # Anthropic-SDK neu bündeln (vendor/)
API_KEY=... node tools/try-page.js "Foyer" <modell> [claude|openrouter]   # Probeübersetzung → out/
```

Doku: `docs/`, Architekturentscheidungen: `docs/adr/`, Änderungen: `Changelog.md`.
