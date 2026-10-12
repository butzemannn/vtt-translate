# ADR 0003: Blockweise Übersetzung

Status: angenommen · 2026-10-12

## Kontext

Seiten sind formatiertes HTML (Vorlesekästen, Listen, Bilder, Inline-Formatierung), enthalten Foundry-Links (`@UUID[...]{Label}`) und Würfelformeln (`[[/r 1d6]]`). Das LLM darf Struktur und Link-Ziele nicht verändern.

## Entscheidung

- Seite wird in Blöcke zerlegt (`p`, `h1–h6`, `li`, `td`, … ohne weitere Blöcke darin). Alles außerhalb bleibt unangetastet.
- Pro Block sieht das LLM nur Text und Inline-Elemente; Attribute werden durch `k="N"` ersetzt und danach wiederhergestellt.
- Links/Enricher werden zu `<x-ref>`; nur ein vorhandenes Label wird übersetzt. Blöcke ohne übersetzbaren Text werden nicht gesendet.
- Alle Blöcke einer Seite gehen in einer Anfrage (JSON mit Schema). Jede Antwort wird geprüft (jedes `k` genau einmal, gleicher Tag, nichts Neues). Fehlerhafte Blöcke: ein Wiederholungsversuch mit Fehlerhinweis, danach bleibt der Block englisch (Status `partial`).
- Blocktyp `readaloud` (innerhalb `blockquote`) steuert den Stil; später auch Vorlesen (TTS).

## Folgen

- Formatierung und Links bleiben garantiert erhalten; das LLM darf Inline-Elemente für die deutsche Satzstellung umstellen.
- Grenze: Text direkt in einem Element, das zusätzlich Blöcke enthält (z. B. `<li>Text<ul>…</ul></li>`), wird nicht übersetzt. In den Samples nicht vorhanden.
