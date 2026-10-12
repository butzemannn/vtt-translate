# VTT Translate

Foundry-VTT-Modul (v14), das Journal-Seiten per LLM ins Deutsche übersetzt – im Stil der Spielwelt, mit erhaltener Formatierung und Links. Entwickelt für *Legends of Barovia* (Curse of Strahd, dnd5e).

## Stand

Version 0.2.0 – einzelne Seite übersetzen und wiederherstellen. Anbieter: Claude (Anthropic) oder OpenRouter. Plan: `instructions/plan.md`.

## Installation

Foundry → Add-on-Module → Modul installieren → Manifest-URL:

```
https://github.com/<owner>/<repo>/releases/latest/download/module.json
```

Danach in der Welt aktivieren → Einstellungen → VTT Translate → Anbieter, Modell und API-Key eintragen.

Für Entwicklung alternativ per Symlink: `ln -s /pfad/zu/vtt-translate <Foundry-Data>/modules/vtt-translate`. Releases: `docs/release.md`.

## Benutzung

Journal öffnen → Menü oben rechts im Fenster → **Seite übersetzen** bzw. **Original wiederherstellen**. Nur für den GM sichtbar.

## Entwicklung

```bash
npm install
npm test                                  # Tests gegen samples/
npm run vendor                            # Anthropic-SDK neu bündeln (vendor/)
API_KEY=... node tools/try-page.js "Foyer" <modell> [claude|openrouter]   # Probeübersetzung → out/
```

Doku: `docs/`, Architekturentscheidungen: `docs/adr/`, Änderungen: `Changelog.md`.
