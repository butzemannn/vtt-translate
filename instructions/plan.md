# Plan: Foundry-Addon „vtt-translate“

Status: **Phase 2 umgesetzt, Test offen**  ·  Stand: 2026-10-12

Ablage-System in `instructions/`:
- `prompt.md`, `guidelines.md` – Vorgaben (nicht ändern)
- `plan.md` – Gesamtplan: Ziel, Entscheidungen, Phasen, offene Punkte
- `phase-XX-<name>.md` – Detailplan einer Phase, wird erst bei Start der Phase angelegt

## Ziel

Foundry-VTT-Modul, das englische Inhalte aus *Legends of Barovia* (Pyram King, Curse of Strahd) per LLM ins Deutsche übersetzt. Endziel: komplette Welt auf Deutsch. Übersetzung im Stil der Spielwelt (Gothic Horror), passend zu Textart und Verfasser.

**Alleinstellung: Bedienung.** Viele Journale mit wenigen Klicks übersetzen, jederzeit Überblick über den Stand.

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Foundry | Nur v14 (aktuell 14.368) |
| System | dnd5e (aktuelle Version zu v14) |
| LLM | Mehrere Anbieter wählbar (Claude, OpenRouter, später OpenAI, Ollama). Nutzer verwendet OpenRouter. Direkter API-Aufruf, kein Copy-Paste. |
| Original | Wird ersetzt (in place). Original als Flag gesichert, wiederherstellbar. Map-Pins bleiben dadurch gültig. |
| Ort | Übersetzt wird in der Welt (Journal-Seitenleiste), nicht im Kompendium |
| Umfang | Seite, Journal, Ordner, alles – zentral über die Übersetzungs-Zentrale |
| Prüfen | Nach dem Übersetzen in einer Prüf-Ansicht (EN/DE nebeneinander), optional |
| Eigennamen | Glossar, vom LLM vorgeschlagen, vom Nutzer bestätigt, dem LLM strikt vorgegeben |
| Stil | Pro Text angepasst: Erzähltext düster/gehoben, Briefe/Tagebücher altertümlich (Ihr/Euch) im Charakter des Verfassers, Regel-/SL-Infos sachlich |
| Formatierung | Blockweise Übersetzung (siehe unten) |
| Regelbegriffe | Offizielle deutsche 5e-Begriffe (SG, Rettungswurf, Weisheit (Wahrnehmung), dt. Zauber-/Itemnamen) |
| Gedichte/Rätsel | Nachdichten; Rätsel müssen auf Deutsch funktionieren, Lösung im SL-Text wird angepasst |
| Anrede Vorlesetext | „Ihr“ (Gruppe), z. B. „Ihr entkommt den Nebeln …“ |
| Backup | Original als Flag am Dokument (`flags.vtt-translate.original`); bewusst kein separates Kompendium |
| Weitere Inhalte | Journal-/Seitennamen, Map-Notizen, Szenennamen – je per Einstellung an/aus. Actors/Items: später. |
| Vorlesen (TTS) | Späteres Feature; Architektur hält Blocktyp und Sprecher dafür bereit |
| Nutzer | Nur GM |

## Abgrenzung zu bestehenden Modulen

| Modul | Ansatz | Schwäche |
|---|---|---|
| Phils Journal Translator | Prompt kopieren → in Web-Chat (ChatGPT, Claude …) einfügen → Antwort zurückkopieren. Hat Glossar und HTML-Erhalt. | Manuelles Copy-Paste pro Batch; bei hunderten Seiten mühsam; kein Status-Überblick |
| Journal Auto Translator | OpenAI-API, „Translate“ pro Journal | Pro Journal klicken, kein Überblick, kein Glossar/Stil, nur OpenAI |
| Comprehend Languages | DeepL, neues Journal | Kopien statt in place (Pins zeigen aufs Original), kein Spielwelt-Kontext |
| Babele | Kompendien über fertige Übersetzungsdateien | Übersetzt selbst nichts |

Unser Ansatz: **Übersetzungs-Zentrale** – ein Fenster mit Baum aller Ordner/Journale, Status pro Seite, Auswahl per Haken, Kostenschätzung, ein Klick. Lauf im Hintergrund, pausier- und fortsetzbar, Fehler blockieren nicht. Dazu: Prüf-Ansicht, „Szene vorbereiten“ (alle über Pins verlinkten Journale einer Map), optional Übersetzen beim Öffnen, Status-Symbol in der Seitenleiste.

### Harte Anforderungen (aus Erfahrung mit Phils Journal Translator)

Dort störte: Copy-Paste, doppelte Journale, zerstörte Ordnerstruktur, fehlerhaft angepasste Links.

- **Keine neuen Dokumente.** Nur bestehende Seiten werden per `update()` geändert. Kein Anlegen, Kopieren, Verschieben.
- **Ordnerstruktur bleibt unverändert.** Ordner, Sortierung, Rechte (`ownership`) werden nicht angefasst.
- **Links müssen nicht angepasst werden.** IDs bleiben gleich, also bleiben alle `@UUID`-Links und Map-Pins gültig. Link-Ziele sind geschützt (Platzhalter), nur das sichtbare Label wird übersetzt. Fehlt ein Platzhalter in der Antwort → Block wird nicht gespeichert.
- **Kein Copy-Paste.** Direkter API-Aufruf.

## Hintergrund (Recherche)

- Journale: `JournalEntry` → `JournalEntryPage`; Text als HTML in `page.text.content`.
- Map-Pins = `Note`-Dokumente einer Szene, verweisen per ID auf Journal und ggf. Seite. In-place-Übersetzung lässt die Verweise intakt.
- Inhalte enthalten Formatierung (Überschriften, Vorlesekästen, Tabellen, Bilder), Foundry-Links (`@UUID[...]{Label}`) und dnd5e-Enricher (`[[/check dex 15]]`).
- LLM-Aufruf direkt aus dem Browser des GM; API-Key als Client-Setting nur beim GM.

## Umgang mit Formatierung

Blockweise Übersetzung:
1. HTML parsen und in Blöcke zerlegen (`p`, `h1–h6`, `li`, Tabellenzellen, `blockquote`, …). Die Struktur drumherum (Container, Klassen, Bilder) fasst das LLM nicht an.
2. Inline-Formatierung im Block bleibt erhalten (`<strong>`, `<em>`, Links), damit Sätze als Ganzes übersetzt werden.
3. Geschützte Teile (`@UUID[...]`, `[[...]]`, `@Embed`) werden durch Platzhalter ersetzt; nur das Label von Links wird übersetzt.
4. Blöcke einer Seite gehen nummeriert in einer Anfrage ans LLM (lange Seiten in mehreren), Antwort als JSON.
5. Prüfen pro Block: gleiche Tags, alle Platzhalter vorhanden. Sonst Block erneut anfragen.

Vorteile: Struktur bleibt sicher erhalten, lange Seiten lassen sich aufteilen, Prüf-Ansicht kann absatzweise vergleichen, Blocktyp (z. B. Vorlesekasten) ist für TTS später bekannt.

### Befund aus `samples/` (3 Journale, 60 Seiten, ~15k Wörter)

- Modul-ID `legends-of-barovia-pk`; Journale liegen in der Welt (`curse-of-strahd`) in einem gemeinsamen Ordner. Foundry 14.368, dnd5e 6.0.6.
- Inhalt: Death House, umbenannt (Count Lugosi, Dr. Seward, Igor, Sir Spenser …) → Glossar wichtig.
- Alle Seiten `type: text`, HTML. Eine Seite = ein Raum, max. ~1.000 Wörter → **eine Anfrage pro Seite** reicht, Chunking nur als Notfall.
- Wiederkehrendes Muster:
  - Bild oben (`<img class="centered">`)
  - **Vorlesekasten**: `<blockquote><div style="background-color:ivory"><p style="padding-left:10px">…</p></div></blockquote>` → Blocktyp `readaloud` (Stil: Erzähler, „Ihr“; später TTS)
  - SL-Text: `p`, `h3`/`h4`, `ul > li > p`
  - Fußzeile: `<hr>` + Link „D&D Beyond: 1. Entrance“ (externe URL, Label übersetzen)
- Unsauberes HTML: verschachtelte doppelte `<span style="text-decoration:underline">`, `<br><br>` statt Absätzen, leere `<p></p>` → unverändert lassen, nur Text tauschen.
- Links:
  - `@UUID[JournalEntry.X.JournalEntryPage.Y]` **ohne Label** → Foundry zeigt den Namen des Ziels. Kein Text zu übersetzen; wird automatisch deutsch, sobald die Zielseite (z. B. Item-Journal) übersetzt ist.
  - `@UUID[.id]{Treasure Room}` mit Label → nur Label übersetzen.
  - Externe `<a href>` (D&D Beyond, Ko-fi, pyramking.com) → URL schützen, Linktext übersetzen.
- Enricher: nur `[[/r 1d10+10]]` gefunden → komplett schützen.
- Itemnamen stehen als fett/kursiv/unterstrichen im Text („Raven Cane“, „Spell Scroll: Bless“) → Glossar/Regelbegriffe.
- Gedichte: eine Zeile = ein `<p>` → Blöcke eines Vorlesekastens gemeinsam im Kontext übersetzen, Zeilenzahl bleibt.
- Kosten-Hochrechnung: diese 3 Journale ≈ 1 $ mit Opus 5.5.

## Architektur (grob)

```
module.json
scripts/
  main.js          – Hooks, Settings, Einstiegspunkte
  providers/       – ein Adapter pro LLM: translate(systemPrompt, input) → output
  html.js          – Blöcke zerlegen/zusammensetzen, Platzhalter, Prüfung
  translator.js    – Prompt (Stil, Glossar, Kontext), Aufruf, Retry
  store.js         – Original sichern, Übersetzung schreiben, wiederherstellen, Status
  queue.js         – Hintergrund-Lauf: Warteschlange, Fortschritt, Pause, Fortsetzen
  ui/              – Zentrale, Prüf-Ansicht, Glossar-Editor
lang/de.json, en.json
```

Alles läuft im Browser des GM. Kein eigener Server, kein Build-Schritt (Entscheidung zum SDK → ADR in Phase 1).

## Phasen

1. **Grundgerüst** – module.json, Settings, Claude-Provider, Blockzerlegung, Übersetzung einer Seite, Backup + Wiederherstellen. Test an echten Journalen.
2. **Zentrale + Batch** – Baum mit Status, Auswahl, Kostenschätzung, Hintergrund-Lauf, Status in der Seitenleiste.
3. **Qualität + Prüfen** – Stil-Prompt verfeinern, Glossar mit Vorschlägen, Prüf-Ansicht, „neu übersetzen mit Hinweis“.
4. **Am Spieltisch** – „Szene vorbereiten“, optional Übersetzen beim Öffnen.
5. **Weitere Inhalte** – Journal-/Seitennamen, Map-Notizen, Szenennamen.
6. **Weitere Anbieter** – OpenAI, Ollama. (OpenRouter vorgezogen in 0.2.0, da Nutzer es verwendet.)
7. *(später)* Vorlesen (TTS) mit Erzähler-/NSC-Stimmen.
8. *(später)* Actors/Items.

Begleitend: `README.md`, `Changelog.md`, `docs/`, `docs/adr/` gemäß Guidelines.

## Aufwand & Kosten (Schätzung)

Annahme: CoS + Erweiterung ≈ 300–500k englische Wörter → ca. 0,7–1,2 Mio. Input-Tokens inkl. HTML, ähnlich viel Output.

| Modell (Input/Output pro 1 Mio. Tokens) | geschätzt für alles |
|---|---|
| Claude Opus 5.5 ($4 / $20) | ca. 20–45 $ |
| Claude Sonnet 5.5 ($2 / $10) | ca. 10–25 $ |
| Claude Haiku 5.5 ($0,10 / $0,50) | ca. 1–2 $ (schwächere Qualität) |

Sehr grob; das Addon zeigt vor jedem Lauf eine Schätzung. Batch-API (−50 %) später prüfen.

## Ausblick: Vorlesen (TTS)

- Anbieter-Optionen: ElevenLabs (beste Qualität, viele dt. Stimmen), OpenAI TTS (günstiger), Browser-Sprachausgabe (kostenlos, roboterhaft).
- Audio einmal erzeugen, als MP3 in der Welt speichern, über Foundry an alle Spieler abspielen.
- Stimmen: Erzähler für Vorlese-/Erzähltext; eigene Stimme pro Verfasser (z. B. Brief von Strahd). Das LLM kann Blocktyp und Sprecher schon beim Übersetzen mitliefern.
- Bestehende Module (Archive of Voices Pro, NOVA Multi-AI) zielen auf NSC-Dialoge, nicht auf Journal-Vorlesen.
- Kosten vor Umsetzung schätzen.

## Offene Punkte

- [x] Beispiel-Journale analysiert → siehe „Befund aus `samples/`“.
- [x] Modell: Nutzer verwendet DeepSeek über OpenRouter, Test in Foundry erfolgreich (2026-10-12).
- [x] Claude-Anbindung: SDK vorgebündelt → `docs/adr/0001-kein-build-schritt.md`.
- [x] Erfahrungen mit Phils Journal Translator → siehe „Harte Anforderungen“.
