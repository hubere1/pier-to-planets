# 01 – Produkt-Brief

## Vision
Ein ruhiges, ehrliches Idle-Aufbauspiel, in dem man **sieht**, wie aus einem Fischersteg ein Raumhafen wird. Upgrades und Zahlen treiben das Spiel, die detailreiche Pixelszene belohnt jeden Kauf sichtbar. Sessions von 1–5 Minuten, 3–5 Mal am Tag; Abwesenheit wird belohnt, nie bestraft.

## Zielgruppe
- Primär: Erwachsene 18–45, Casual, mögen Idle-/Tycoon-Spiele (Vorbilder im Genre: Idle Miner, Idle Port, Egg Inc.) und Pixel-Art.
- Sprachen: Deutsch (Quelle), Englisch (D-014).
- Geräte: Android-Mittelklasse, Hochformat, ~6", ab Android 8 (genaue Mindest-API in M0 an Capacitor-Version anpassen).

## Spielidee in einem Satz je Ebene
| Ebene | Inhalt |
|---|---|
| Sekunden | Fahrzeuge kommen an, Waren werden entladen, Münzen fliegen ins HUD. |
| Minuten | Gebäude kaufen und aufstufen, Engpass beheben, Szene wächst. |
| Stunden | Offline-Ertrag einsammeln, tägliche Aufträge, Events. |
| Tage | Neustart einer Ära für Sterne, Ziel-Gebäude bauen, nächste Ära. |
| Wochen | Sechs Ären, Personal, Forschungsbaum, Erfolge, endlose Asteroidenfelder. |

## Geschäftsmodell (harte Randbedingungen)
- **Null laufende Kosten.** Kein Backend, keine Cloud, keine kostenpflichtigen SDKs. Einmalig: Google-Play-Entwicklerkonto (25 US-$, in M10 neu prüfen).
- **Einnahmen: nur freiwillige Rewarded Ads (D-010).** Keine Interstitials, keine Banner, keine käuflichen Kristalle. Das Spiel ist ohne Werbung vollständig schaffbar; Werbung beschleunigt um höchstens ~25 %.

## Erfolgskriterien (Hypothesen, nach 4 Wochen Live-Daten neu bewerten)
| Metrik | Ziel |
|---|---|
| Erster Gebäudekauf | ≤ 60 s nach Start, ≥ 95 % |
| Erste Kran-Automatisierung | ≤ 5 Min |
| Rewarded Ads pro DAU | ≥ 2 (ohne Druck, Limits `03` §10) |
| D1 / D7 / D30 Retention | ≥ 40 % / 15 % / 6 % |
| Ära 2 erreicht | ≥ 50 % der D2-Spieler |
| Ära 6 erreicht | ≥ 10 % der Installs |
| Crash-free Sessions | ≥ 99,5 % |
| Play-Bewertung | ≥ 4,4 |

Grafik-Anspruch (Owner): extrem hochwertige, hochauflösende Pixelgrafik, Umsetzung in `06`.

Messung nur über Play Console (Android vitals, Bewertungen) und optional lokale, anonyme Analytics nach Einwilligung (Entscheidung in M8).

## Scope V1.0
Sechs Ären mit je ~8 Gebäuden, 3–4 Fahrzeugstufen, eigener Mechanik; zwei Prestige-Ebenen (Sterne, Ära-Aufbruch); Personal; Forschungsbaum; Erfolge; Events; tägliche Aufträge; Offline-Fortschritt (4 h → 24 h); Tag-Nacht-Wechsel; Tutorial; lokaler Save mit Backup; DE + EN; Android über Capacitor.

## Nicht-Ziele V1.0 (Interfaces/Stubs nur)
Cloud-Save (Play Games, später), Bestenlisten, Multiplayer, Querformat, iOS-Build, Audio-Musik (Soundeffekte optional in M8), Lootboxen, Abo, Echtgeld-Kristalle (ohne Owner-Entscheidung).

## Offene Owner-Fragen (aus dem Plan)
| Frage | Stand |
|---|---|
| Hochformat oder Querformat? | **Hochformat**, Owner-Vorgabe (D-002). |
| Endgültiger Name | **„Pier to Planets – Vom Hafen ins All“** (Vorschlag D-011), Markenprüfung vor M10. |
| Geld verdienen | **Freiwillige Rewarded Ads**, Owner-Vorgabe (D-010). |

## Risiken
| Risiko | Gegenmaßnahme |
|---|---|
| WebView-Performance auf Mittelklasse zu schwach | Capacitor-Durchstich schon in M1 (D-012), Performance-Budget in `02`, niedrige Render-Auflösung + Upscaling |
| Code-generierte Pixelgrafik wirkt steril | Stilprobe M1 mit Owner-Freigabe, Manifest erlaubt späteren Austausch einzelner Sprites (D-015) |
| Grafik-Umfang (6 Ären × ~8 Gebäude × Ausbaustufen) | Baukasten-Generatoren je Ära, Ausbaustufen als Module (Stockwerk, Kranarm), Priorisierung Hafen zuerst |
| Spielzeit zu kurz/lang | Balancing-Gate ab M2 laufend, Zielkurve ±30 % |
| Zahlen-Überlauf/Rechenfehler | `Num`-Wrapper, Property-Tests bis 1e300+, Format-Tests |
| Save-Verlust (WebView-Speicher gelöscht) | Datei über Capacitor Filesystem statt `localStorage`, Backup-Datei, Android Auto Backup (D-009) |
| Zeitmanipulation | Offline-Deckel pro Rückkehr, Uhr rückwärts = 0; ohne Bestenliste akzeptiert |
