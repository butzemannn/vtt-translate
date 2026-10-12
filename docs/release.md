# Release

Repo: https://git.thaele.eu/sven/vtt-translator (Forgejo)

Manifest-URL für Foundry:

```
https://git.thaele.eu/sven/vtt-translator/raw/branch/main/module.json
```

## Neue Version veröffentlichen

1. In `module.json` `version` **und** `download` (`…/releases/download/vX.Y.Z/module.zip`) anpassen, Eintrag in `Changelog.md`.
2. Commit auf `main`, Tag mit gleicher Version, beides pushen:
   ```bash
   git tag v0.1.1
   git push origin main v0.1.1
   ```
3. Workflow `.forgejo/workflows/release.yml` prüft Version/URL, baut `module.zip` und legt das Release an.
4. Foundry zeigt das Update unter „Add-on-Module → Updates prüfen“.

## Voraussetzungen auf Forgejo

- Repo muss **ohne Anmeldung lesbar** sein (öffentlich), sonst kann Foundry Manifest und Zip nicht laden.
- Actions im Repo aktiviert und ein Runner mit Label `docker` vorhanden.
- Falls der automatische Token keine Releases anlegen darf: Application-Token mit `write:repository` als Secret anlegen und im Workflow bei `forgejo-release` als `token` übergeben.

## Inhalt des Zips

`module.json`, `scripts/`, `lang/`, `vendor/`, `README.md`, `Changelog.md`.

## Hinweis

`samples/` ist per `.gitignore` ausgeschlossen (kostenpflichtige Inhalte von Pyram King). Die Tests laufen deshalb nur lokal.
