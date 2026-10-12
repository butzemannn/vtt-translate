# ADR 0002: Original als Flag am Dokument

Status: angenommen · 2026-10-12

## Kontext

Übersetzungen ersetzen den Text (keine Kopien: keine Duplikate, Ordner und Links bleiben gültig). Das Original muss wiederherstellbar sein.

## Entscheidung

Original-HTML liegt in `flags.vtt-translate.translation.original` der Seite. Gesichert wird nur bei der ersten Übersetzung; jede weitere Übersetzung startet vom Original.

## Folgen

- Kein zusätzliches Dokument, Original wandert bei Export/Import mit.
- Spieler mit Leserecht bekommen das Original technisch mitgeliefert (per Konsole auslesbar). Akzeptiert.
- Verworfen: separates Kompendium für Originale (Zuordnung und Synchronisation zu aufwendig).
