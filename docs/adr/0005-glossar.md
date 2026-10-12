# ADR 0005: Glossar in der Anfrage, nur relevante Einträge

Status: angenommen · 2026-10-12

## Kontext

Namen und Begriffe sollen über hunderte Seiten einheitlich übersetzt werden. Das Glossar kann einige hundert Einträge groß werden.

## Entscheidung

- Glossar als World-Setting (`{source, target, kind, suggested?}`); leeres `target` = unverändert lassen.
- Pro Seite gehen nur bestätigte Einträge mit, die im Text oder Seitentitel vorkommen (einfacher Teilstring-Vergleich, ohne Groß/Klein).
- Glossar und Hinweis stehen in der Anfrage (`input`), nicht im System-Prompt. Der System-Prompt ist dadurch für alle Seiten gleich und wird bei Anbietern mit Prompt-Caching günstiger.
- Vorschläge holt ein eigener Prompt pro Textpaket (~40k Zeichen); bekannte Begriffe werden mitgeschickt. Vorschläge sind markiert und gelten erst nach Bestätigung.

## Folgen

- Kurze Prompts, auch bei großem Glossar.
- Teilstring-Vergleich kann gelegentlich unnötige Einträge mitschicken (z. B. „Igor“ in „Igorova“) – unschädlich.
