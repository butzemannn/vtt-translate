# Release

Quelle: Forgejo (https://git.thaele.eu/sven/vtt-translator), gespiegelt nach GitHub. Releases entstehen auf GitHub.

Manifest-URL für Foundry:

```
https://github.com/<owner>/<repo>/releases/latest/download/module.json
```

## Neue Version veröffentlichen

1. `version` in `module.json` erhöhen, Eintrag in `Changelog.md`.
2. Commit auf `main`, Tag mit gleicher Version, beides nach Forgejo pushen:
   ```bash
   git tag v0.1.1
   git push origin main v0.1.1
   ```
3. Spiegel überträgt Commit und Tag nach GitHub (bei „Sync bei Push“ sofort, sonst im Intervall).
4. GitHub Action `.github/workflows/release.yml` setzt `url`/`manifest`/`download` in `module.json`, baut `module.zip` und legt das Release an.
5. Foundry zeigt das Update unter „Add-on-Module → Updates prüfen“.

## Voraussetzungen

- GitHub-Repo öffentlich (Foundry lädt ohne Anmeldung; Actions für öffentliche Repos kostenlos).
- Push-Mirror in Forgejo mit GitHub-Token, das Scope **`workflow`** hat (sonst lehnt GitHub Pushes mit Dateien unter `.github/workflows/` ab). Fine-grained Token: Contents + Workflows „Read and write“.
- Nur auf Forgejo committen, nie auf GitHub (Spiegel überschreibt).
- Der Workflow läuft nur auf github.com (`if: github.server_url == 'https://github.com'`), auch falls Forgejo Actions aktiv sind.

## Inhalt des Zips

`module.json`, `scripts/`, `lang/`, `vendor/`, `README.md`, `Changelog.md`.

## Hinweis

`samples/` ist per `.gitignore` ausgeschlossen (kostenpflichtige Inhalte von Pyram King). Die Tests laufen deshalb nur lokal.
