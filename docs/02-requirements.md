# 02 – Requirements

Jede Anforderung hat eine ID, Priorität (**M** = Muss V1.0, **S** = Soll, **K** = Kann) und einen Nachweis. Meilensteine (`07`) verweisen auf diese IDs.

## Funktionale Anforderungen

### Kern (FR-K)
| ID | Prio | Anforderung | Nachweis |
|---|---|---|---|
| FR-K01 | M | Spielschleife je Ära: Ankunft → Entladen → Verkauf → Kauf (`03` §1) | Sim-Test „Schleife erzeugt Einnahmen“ |
| FR-K02 | M | Erster Kauf in ≤ 60 s ohne Tutorial-Wissen möglich | Journey-Test, Stoppuhr am Gerät |
| FR-K03 | M | Entladen per Tippen bis zur ersten Kran-Stufe, danach automatisch; Tippen bleibt als kleiner Bonus | Sim-Test, UI-Test |
| FR-K04 | M | Kaufmenge ×1 / ×10 / ×Max, Kosten aus Sim-Funktion | Unit-Test `costFor(n)` |
| FR-K05 | M | Engpass-Anzeige: Die Sim nennt das Gebäude, das gerade begrenzt (`bottleneck()`) | Unit-Test je Ära |
| FR-K06 | M | Jede Gebäudestufe mit Meilenstein (10/25/50/100/200) verändert die Szene sichtbar | Screenshot-Test je Meilenstein |
| FR-K07 | M | Kein Kauf ohne Deckung; gesperrte Aktion nennt den Grund | Unit- + UI-Test |

### Progression (FR-P)
| ID | Prio | Anforderung | Nachweis |
|---|---|---|---|
| FR-P01 | M | Sechs Ären, je ~8 Gebäude, 3–4 Fahrzeugstufen, eigene Waren und Mechanik | Content-Test (Vollständigkeit) |
| FR-P02 | M | Neustart einer Ära → Sterne; Vorschau „+N Sterne · +X % Einnahmen“ vor Bestätigung | Unit-Test, UI-Test |
| FR-P03 | M | Ziel-Gebäude schaltet nächste Ära frei; alte Ären laufen weiter und liefern einen Lieferketten-Bonus | Sim-Test |
| FR-P04 | M | Ära 6 endlos: neue Asteroidenfelder mit steigenden Werten | Sim-Test 1000 Felder ohne Überlauf |
| FR-P05 | M | Forschungsbaum, äraübergreifend (u. a. Offline-Zeit 4 → 24 h) | Unit-Test Voraussetzungen |
| FR-P06 | M | Personal (Kapitäne, Piloten, Astronauten …) mit festen Preisen, keine Zufallsziehung (D-007) | Unit-Test, Exploit-Probe |
| FR-P07 | M | Erfolge mit Kristall-Belohnung | Unit-Test |
| FR-P08 | S | Events (Sturm, VIP-Schiff, Meteorschauer …), gleiten ein und aus | Unit-Test „kein Sprung“ |
| FR-P09 | S | Drei tägliche Aufträge, Reset um lokale Mitternacht | Unit-Test mit FakeClock |
| FR-P10 | M | Offline-Fortschritt bis Deckel, Rückkehr-Dialog mit Ertrag und Ereignissen | Unit-Test, Integrationstest |

### Monetarisierung (FR-M, D-010)
| ID | Prio | Anforderung | Nachweis |
|---|---|---|---|
| FR-M01 | M | Nur Rewarded Ads, immer freiwillig, klar als „Werbung“ gekennzeichnet; keine Interstitials, keine Banner | Review-Checkliste |
| FR-M02 | M | Belohnung erst nach echtem `onUserEarnedReward`; Abbruch = keine Belohnung | Test mit Fake-AdManager |
| FR-M03 | M | UMP-Einwilligung vor dem ersten Ad-Request; „Einwilligung ändern“ in den Einstellungen | Gerätetest EEA-Debug |
| FR-M04 | M | Tageslimits sichtbar, ehrliche Fehlermeldung (lädt / keine Einwilligung / Limit) | UI-Test |
| FR-M05 | M | Spielzeit-Ziele (`03` §9) werden **ohne** Werbung erreicht; Werbung verkürzt um höchstens ~25 % | Balancing-Gate Policy `ads` vs. `noAds` |

### Plattform (FR-X)
| ID | Prio | Anforderung | Nachweis |
|---|---|---|---|
| FR-X01 | M | Autosave alle 10 s, nach jedem Kauf, bei `pause` | Integrationstest |
| FR-X02 | M | Save als Datei (Capacitor Filesystem), Prüfsumme, Backup, Migrationen ab Schema 1 | Unit-Tests, Fixtures |
| FR-X03 | M | Läuft vollständig offline (Werbung ausgenommen) | Flugmodus-Test |
| FR-X04 | M | Deutsch + Englisch, Sprachwechsel ohne Neustart | `check-l10n`, UI-Test |
| FR-X05 | S | Haptik bei Kauf/Meilenstein (abschaltbar) | Gerätetest |
| FR-X06 | K | Soundeffekte (abschaltbar, Standard an), keine Musik in V1.0 | Gerätetest |
| FR-X07 | K | Cloud-Save über Play Games (V1.1) | – |

## Nicht-funktionale Anforderungen

### Grafik-Qualität (NFR-G) – Owner-Pflicht: „extrem hochwertig, hochauflösend“
| ID | Prio | Anforderung | Nachweis |
|---|---|---|---|
| NFR-G01 | M | Szene in nativer Auflösung 360 × 640–800 Spiel-Pixeln, ganzzahlig skaliert (`06` §2) – jeder Spiel-Pixel ist ein exaktes Quadrat aus s × s Gerätepixeln | Screenshot-Pixeltest auf 720/1080/1440 px Breite |
| NFR-G02 | M | Keine Unschärfe, kein Subpixel-Flimmern: `nearest`, Kamera und Sprites auf Spiel-Pixel gerastert | Golden-Diff, Kamerafahrt-Test |
| NFR-G03 | M | Dynamisches Licht je Spiel-Pixel (Normal- + Emissive-Maps), in 3–4 Stufen quantisiert, Licht bleibt „Pixel-Art“ statt weichem 3D-Look | Stilprobe M1, Owner-Freigabe |
| NFR-G04 | M | Tag-Nacht über Farb-LUTs (≥ 6 Tageszeiten), weich überblendet; Lichter (Fenster, Leuchtturm) leuchten nachts | Screenshot-Reihe 24 Stützpunkte |
| NFR-G05 | M | Gebäude/Fahrzeuge 64–128 Spiel-Pixel, je mindestens 3 sichtbare Ausbaustufen | Content-Test, Screenshot |
| NFR-G06 | M | Pro Ära Palette ≤ 48 Farben (+ Licht/LUT-Ergebnisfarben); `check-palette` in CI | CI |
| NFR-G07 | M | Lebendigkeit: ≥ 6 Animationsquellen gleichzeitig (Wasser, Rauch, Arbeiter, Lichter, Wolken, Fahrzeuge), Parallax 4–6 Ebenen | Stilprobe |
| NFR-G08 | M | Jede Grafik einzeln per Manifest-ID austauschbar (Code-generiert ↔ handgezeichnet) | Test: Austausch eines Sprites ohne Codeänderung |

### Performance (NFR-P) – in M1 auf echtem Gerät messen, in M9 bestätigen
| Größe | Budget |
|---|---|
| Bildrate Szene (Mittelklasse, z. B. Snapdragon 6-Serie, 4 GB RAM) | 60 fps, p95-Frame ≤ 20 ms |
| Low-End (2–3 GB RAM) | 30 fps stabil (Qualitätsstufe „Sparsam“: Licht ohne Normalen, 2 Parallax-Ebenen) |
| Sim-Takt (10 Hz) | < 1 ms je Schritt |
| Offline-Berechnung 24 h | < 50 ms |
| Kaltstart bis Szene sichtbar | ≤ 3 s |
| Save schreiben | < 30 ms |
| App-Größe (AAB-Download) | ≤ 60 MB |
| Grafikspeicher (Texturen) | ≤ 160 MB; Atlanten ≤ 2048 × 2048 (100 % Android-Abdeckung) |
| Akku | Render-Schleife stoppt im Hintergrund; Bildrate im Menü/bei Stillstand auf 30 fps drosseln |

### Qualität und Zugänglichkeit (NFR-Q)
| ID | Prio | Anforderung |
|---|---|---|
| NFR-Q01 | M | Kontrast UI-Text ≥ 4,5:1, Status nie nur über Farbe |
| NFR-Q02 | M | UI auf 320 dp Breite und 200 % Schrift ohne Abschneiden |
| NFR-Q03 | M | „Animationen reduzieren“ (System + Einstellung): keine Kamerawackler, kein Blinken > 3 Hz, Szene bleibt lebendig, aber ruhig |
| NFR-Q04 | M | Touch-Ziele ≥ 48 dp; jede Szenen-Aktion auch über einen UI-Knopf erreichbar (Screenreader) |
| NFR-Q05 | M | Zahlen bis 1e308 (break_infinity bis 1e9e15) ohne Rechenfehler, Format-Tests DE/EN |
| NFR-Q06 | M | Keine personenbezogenen Daten, keine Konten; Data Safety ehrlich (AdMob-Werbe-ID) |
| NFR-Q07 | M | Determinismus: gleicher Seed + Commands → gleicher Zustand |

## Definition of Done (jeder Task)
- [ ] Test zuerst geschrieben (Commit-Reihenfolge oder PR-Notiz).
- [ ] `npm run lint`, `npm run typecheck` ohne Fehler.
- [ ] `npm test` (sim + app) grün, Ausgabe im PR.
- [ ] `check:purity`, `check:l10n`, `check:palette` grün.
- [ ] Balancing-Gate grün, falls Zahlen/Formeln berührt.
- [ ] Doku + Decision-Log aktualisiert, falls Verhalten/Zahl geändert.
- [ ] UI/Grafik: Screenshot 360 × 640 und 320 dp/200 % angesehen, DE + EN, „Animationen reduzieren“ geprüft.
- [ ] Neues Save-Feld → Schema-Version, Migration, Fixture.
- [ ] Kein neuer laufender Kostenfaktor.

## Testpyramide
1. **Unit (sim, Vitest)** – Hauptlast, TDD.
2. **Property/Simulation** – `bin/simulate.ts`: keine NaN/Inf, Geld ≥ 0, Determinismus, Zielkurve.
3. **Render-Goldens** – Szene mit festem Seed + fester Tageszeit, Pixel-Vergleich (Playwright, WebGL im Headless-Chrome).
4. **UI (Playwright)** – Kernscreens 360 × 640, 320 × 640, 412 × 915, DE/EN, Schrift 100/200 %.
5. **Gerät** – Performance-Messung (Chrome Remote Debugging, Frame-Timing), Lifecycle, Ads, Save über Update.
