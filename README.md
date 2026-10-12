# VTT Translate

Foundry-VTT-Modul (v14), das Journal-Seiten per LLM ins Deutsche übersetzt – im Stil der Spielwelt, mit erhaltener Formatierung und Links. Entwickelt für *Legends of Barovia* (Curse of Strahd, dnd5e).

## Stand

Version 0.3.0 – Übersetzungs-Zentrale mit Batch und Kostenschätzung. Anbieter: Claude (Anthropic) oder OpenRouter. Plan: `instructions/plan.md`.

## Installation

Foundry → Add-on-Module → Modul installieren → Manifest-URL:

```
https://github.com/<owner>/<repo>/releases/latest/download/module.json
```

Danach in der Welt aktivieren → Einstellungen → VTT Translate → Anbieter, Modell und API-Key eintragen.

Für Entwicklung alternativ per Symlink: `ln -s /pfad/zu/vtt-translate <Foundry-Data>/modules/vtt-translate`. Releases: `docs/release.md`.

## Benutzung (nur GM)

- **Viele Seiten:** Journal-Seitenleiste → **Übersetzungs-Zentrale** → Seiten/Journale/Ordner anhaken (oder „Offene auswählen“) → Kosten prüfen → **Übersetzen**. Läuft im Hintergrund, Pause/Fortsetzen möglich.
- **Eine Seite:** Journal öffnen → Menü oben rechts → **Seite übersetzen** bzw. **Original wiederherstellen**.

## Entwicklung

```bash
npm install
npm test                                  # Tests gegen samples/
npm run vendor                            # Anthropic-SDK neu bündeln (vendor/)
API_KEY=... node tools/try-page.js "Foyer" <modell> [claude|openrouter]   # Probeübersetzung → out/
```

Doku: `docs/`, Architekturentscheidungen: `docs/adr/`, Änderungen: `Changelog.md`.
