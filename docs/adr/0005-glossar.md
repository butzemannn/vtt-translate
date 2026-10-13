# ADR 0005: Glossar in der Anfrage, nur relevante Einträge

Status: angenommen · 2026-10-12

## Kontext

Namen und Begriffe sollen über hunderte Seiten einheitlich übersetzt werden. Das Glossar kann einige hundert Einträge groß werden.

## Entscheidung

- Glossar als World-Setting (`{source, target, kind, suggested?}`); leeres `target` = unverändert lassen.
- Pro Seite gehen nur bestätigte Einträge mit, die im Text oder Seitentitel als ganzes Wort vorkommen (ohne Groß/Klein, englischer Plural erlaubt). Vorfilter per Teilstring, damit auch Tausende Einträge schnell sind (~2 ms/Seite bei 3.000).
- Glossar und Hinweis stehen in der Anfrage (`input`), nicht im System-Prompt. Der System-Prompt ist dadurch für alle Seiten gleich und wird bei Anbietern mit Prompt-Caching günstiger.
- Vorschläge holt ein eigener Prompt pro Textpaket (~12k Zeichen, 3 parallel); bekannte Begriffe werden mitgeschickt. Vorschläge sind markiert und gelten erst nach Bestätigung.
- Kompendium-Import: Babele hinterlegt bei übersetzten Einträgen den englischen Namen (`originalName` / `flags.babele.originalName`). Daraus werden Einträge `kind: "rules"`, `origin: "compendium"`. Eigene Einträge haben Vorrang; ein neuer Import ersetzt den alten.

## Folgen

- Kurze Prompts, auch bei großem Glossar.
- Regel-Einträge (z. B. „Light“ → „Licht“) können auch bei normalen Wörtern greifen; der Prompt weist an, sie nur für das Spielelement zu verwenden.
- Externe Wörterbücher (z. B. dnddeutsch.de) sind nicht angebunden: keine dokumentierte API/Nutzungsbedingungen gefunden.
