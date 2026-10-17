# Software Tycoon

Rundenbasiertes Software-Firmen-Spiel fürs Handy. Start 1985 im Kinderzimmer mit einem alten Laptop und 6.000 $. Das Ziel ist, das wertvollste Software-Unternehmen der Welt zu werden, und zwar mit eigenem Betriebssystem, das mindestens 40 % Marktanteil hat.

Das Spiel ist in Vanilla HTML/CSS/JS mit ES-Modules geschrieben, braucht keinen Build-Step und kein Backend. Es läuft als PWA.

## Spielen

- **Online:** `https://jannis-commits.github.io/TechGame/`
- **Aufs Handy (Galaxy A15 / Chrome):** Seite öffnen → ⋮-Menü → *Zum Startbildschirm hinzufügen* (oder *App installieren*). Danach startet es wie eine App, im Hochformat und auch offline.
- **Lokal:** im Repo-Root `python3 -m http.server 8000` und dann `http://localhost:8000/TechGame/` öffnen. Per `file://` funktionieren ES-Modules nicht.

## Deployen (GitHub Pages)

Das Repo `jannis-commits.github.io` ist eine User-Page: GitHub Pages veröffentlicht automatisch den Branch `main`. Einen eigenen Workflow braucht es nicht.

1. Änderungen auf einem Branch committen und einen Pull Request nach `main` mergen (oder direkt auf `main` pushen).
2. Nach etwa einer Minute ist die neue Version unter `/TechGame/` online. Den Status siehst du im Repo unter *Actions → pages build and deployment*.
3. Der Service Worker arbeitet *network-first*: Wenn du online bist, lädt das Spiel immer die neueste Version. Offline nimmt er die zuletzt geladene.
4. Wenn du `sw.js` selbst änderst, erhöhe dort `CACHE` (z. B. `swtycoon-v2`), damit alte Caches gelöscht werden.

## Spielstand

- Wird nach jeder Aktion in `localStorage` gespeichert (`swtycoon-save`, Prestige separat in `swtycoon-meta`).
- **Export/Import:** ⚙️ → *Code exportieren* liefert einen Text-Code (`SWT1:…`), den du sichern oder auf einem anderen Gerät importieren kannst.
- **Versionen:** `SAVE_VERSION` in `js/state.js`. Wenn sich das Datenmodell ändert, erhöhst du die Version und trägst eine Funktion in `MIGRATIONS` ein. Alte Spielstände werden beim Laden automatisch migriert.

## Debug-Modus

⚙️ öffnen und **7× auf die Versionsnummer** tippen. Dann kannst du dir Geld geben, Wochen oder Jahre vorspulen, Forschung abschließen, Projekte fertigstellen und jedes Event auslösen.

## Spielsysteme

| System | Kurz |
| --- | --- |
| Projekte | Kategorie, Plattform(en), Zielgruppe, Features, Geschäftsmodell, Preis, Budget, Testing-Wochen, Team. Phasen: Konzept → Entwicklung → Testing → Release |
| Qualität | Team-Skill, Design-Anteil, Feature-Passung zur Zielgruppe, Tech-Level gegenüber der Ära, Budget, Bugs |
| Produkte | Nutzer, Bewertung (1–5 ★), Marktanteil, Aktualität (veraltet mit der Zeit), Support-Team fixt Bugs und bringt Patches, Updates v2, v3 … |
| Markt | Alle Firmen konkurrieren mit derselben Formel um Marktsegmente (Privat/Business/Entwickler). Preis-Elastizität, Hype, Ruf, Plattform-Reichweite |
| Plattformen | Die Reichweite von DOS/Windows, Mac, Linux, iOS, Android ergibt sich live aus den OS-Marktanteilen. Dein eigenes OS wird selbst zur Plattform |
| Team & Büro | Einzelne MA mit Skill, Tempo, Moral, Gehalt und Level. Büro-Plätze begrenzen das Team. Hardware gibt Tempo-Bonus, Crunch geht auf Kosten der Moral |
| Forschung | 7 Branches, 53 Knoten. Schaltet Kategorien, Features und Plattformen frei und gibt Boni. Wer eine Ära verschläft, verliert Anteile |
| Rivalen | Microsoft, Apple, IBM, Oracle, Adobe, EA, Netscape, Amazon, Google, Meta und fiktive Firmen. Jede hat eine Strategie, releast Produkte, führt Preiskämpfe, kauft Firmen und kann pleitegehen |
| Finanzen | Kredite, Investoren-Runden mit Zielen und Deadlines, Börsengang mit Quartalszahlen. 8 Wochen im Minus = Game Over |
| Ökosystem | Eigenes OS → Drittentwickler → Apps → mehr Nutzer. App-Store mit Provision, Vorinstallation mit Kartellrisiko |
| Events | Über 30 Events, viele mit Entscheidungen, dazu historische Momente (Y2K, Dotcom, 2008, Pandemie, KI-Hype) |
| Prestige | Nach dem Sieg wählst du 1 aus 3 dauerhaften Boosts für alle folgenden Runs |

## Content erweitern

Alle Inhalte und Balancing-Werte liegen in `config/`. Normalerweise musst du nur dort etwas anfassen.

| Datei | Inhalt |
| --- | --- |
| `balance.js` | **Zentrale Balancing-Werte**: Startgeld, Formel-Konstanten, Bug-Raten, Markt, Finanzen, Siegbedingung |
| `productTypes.js` | Produktkategorien: Marktgröße pro Jahr, Zielgruppen, Referenzpreise, Aufwand, Lebensdauer |
| `features.js` | Features je Kategorie: Aufwand, Passung pro Zielgruppe, benötigte Forschung |
| `research.js` | Tech Tree: Knoten, Kosten, Voraussetzungen, Effekte |
| `eras.js` | Ären und ihre Schlüssel-Technologie |
| `platforms.js` | Zielplattformen |
| `businessModels.js` | Geschäftsmodelle |
| `rivals.js` | Rivalen, Strategien und Produktpläne |
| `events.js` | Events mit Bedingungen und Optionen (Effekt-Schlüssel stehen oben in der Datei) |
| `roles.js`, `offices.js`, `marketing.js`, `finance.js`, `prestige.js`, `tutorial.js` | Rollen und Namen, Büros und Hardware, Kampagnen, Investoren-Runden, Boosts, Onboarding |

Beispiel für ein neues Feature in `config/features.js` unter der passenden Kategorie:

```js
['g_vr', 'VR-Modus', 0.7, [1, 0.2, 0.8], 'ai_deep'],   // id, Name, Aufwand, Passung [Privat, Business, Dev], Forschung
```

Wenn du eine neue Datei hinzufügst, musst du sonst nichts eintragen. Der Service Worker cacht alles, was das Spiel lädt.

## Code-Struktur

```
TechGame/
  config/        Content & Balancing (reine Daten)
  js/engine/     Spiellogik ohne DOM: turn, projects, market, staff, research, rivals, finance, ecosystem, events …
  js/ui/         Screens als HTML-Strings: dashboard, projects, products, team, research, market, settings, modal
  js/main.js     Rendering, Tabs, Aktionen (data-act → Handler)
  js/state.js    Spielstand, Speichern, Migration, Export/Import
  tools/sim.mjs  Headless-Simulation zum Balancen
  tools/icons.mjs  erzeugt die PWA-Icons
```

## Balancing testen

```sh
node tools/sim.mjs 45 3            # 45 Jahre, 3 Seeds, einfacher Bot
node tools/sim.mjs 45 1 --smart    # Bot, der gezielt auf das eigene OS spielt
node tools/sim.mjs 3 1 --weekly    # Woche-für-Woche-Ausgabe für den Early Game
```
