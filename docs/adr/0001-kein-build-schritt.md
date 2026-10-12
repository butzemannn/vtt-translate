# ADR 0001: Kein Build-Schritt, SDK vorgebündelt

Status: angenommen · 2026-10-12

## Kontext

Foundry lädt Modul-JavaScript direkt im Browser. Für Claude soll das offizielle Anthropic-SDK genutzt werden; es ist ein npm-Paket.

## Entscheidung

- Modulcode ist reines JavaScript (ES-Module), ohne Build.
- Das SDK wird einmalig mit esbuild zu `vendor/anthropic-sdk.mjs` gebündelt (`npm run vendor`) und eingecheckt.
- npm wird nur für Entwicklung genutzt (Tests, Vendoring).

## Folgen

- Änderungen sind nach F5 sofort sichtbar.
- SDK-Update = Version in `package.json` anheben, `npm run vendor`.
- Aufruf direkt aus dem Browser (`dangerouslyAllowBrowser`). Der API-Key liegt nur im Browser des GM (Client-Setting).
