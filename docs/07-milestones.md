# 07 – Meilensteine (Abarbeitungsliste)

Reihenfolge einhalten. Jeder Meilenstein hat Ziel, Aufgaben, **Exit-Kriterien** und **Nachweis**. Erst wenn alle Exit-Kriterien erfüllt und Nachweise gezeigt sind, weiter. Abhaken hier (`[x]`).
Abweichungen vom Owner-Plan (Begründung im Decision-Log): Capacitor-Durchstich schon in M1 (D-012), Balancing-Gate läuft ab M2 dauerhaft mit (D-013).

---
## M0 – Fundament
Ziel: sauberes Repo, lauffähiges Grundgerüst, Prüfungen aktiv.
- [x] Repo `pier-to-planets` (privat, GitHub `hubere1/pier-to-planets`), `LICENSE` (proprietär), `.gitignore`, `CHANGELOG.md`, `LICENSES.md` (Schriften, Bibliotheken).
- [x] npm-Workspaces: `packages/sim`, `packages/content`, `app` (Vite + TS strict + Preact), ESLint, Prettier, Vitest, Playwright.
- [x] `tools/check-purity.ts`, `check-l10n.ts`, `check-palette.ts`, `tools/verify.ps1`.
- [x] CI (GitHub Actions, Free-Kontingent geprüft D-020; erster Lauf grün: Run 37226856805): lint, typecheck, test, purity, l10n, palette.
- [x] Verifiziert + im Decision-Log (D-020–D-022, D-025): aktuelle Versionen PixiJS v8, Capacitor 8, `@capacitor-community/admob`, break_infinity.js, Preact; Android-Mindest-API und Play-Target-API; Glyphen ÄÖÜß€ in m6x11/m5x7.
- [x] applicationId festlegen (Vorschlag `app.piertoplanets.game`, D-011, D-023) – nach erstem Play-Upload nicht mehr änderbar.
Exit: `npm run verify` grün lokal und in CI, leere App startet im Browser.
Nachweis: CI-Lauf, Terminal-Ausgabe. **M0 abgeschlossen 04.10.2026** (verify lokal 9/9 grün, CI Run 37226856805 grün).

## M1 – Stilprobe + Geräte-Durchstich
Ziel: Look festlegen, bevor viel Grafik entsteht; Technik auf echtem Handy belegen.
- [x] Spiel-Pixel-Bühne 360 × 640–800, ganzzahlige Skalierung + Sharp-Bilinear-Rest (`06` §2), Pixel-Test auf 720/1080/1440.
- [x] Hafenszene (Parallax-Kamera D-029): 6 Parallax-Ebenen, Wasser mit Spiegelung, 3 Gebäude (Steg, Lagerhalle in 3 Ausbaustufen, Leuchtturm), Fischerboot + Containerschiff, 4 Arbeiter, Möwen, Rauch.
- [x] Generator-Pipeline: Albedo/Normal/Emissive aus Geometrie, Palette Hafen (48), Atlas, Manifest.
- [x] Licht-Pass (quantisiert + Dither), 8 Tageszeit-LUTs, Emissive-Nacht, Sonnen-Schatten, Bloom.
- [x] Debug-Regler: Tageszeit, Qualitätsstufe, Licht an/aus.
- [x] Capacitor-Android-Hülle, Debug-APK (Emulator D-027; Galaxy A51: 60 fps in allen Stufen, `docs/m1/messprotokoll.md`); Frame-Timing über Chrome Remote Debugging.
- [ ] Referenztafel (Sea of Stars, Graveyard Keeper, Eastward) neben Screenshots der Probe.
Exit: Owner-Freigabe des Looks; 60 fps (p95 ≤ 20 ms) auf Mittelklasse, ≥ 30 fps auf Low-End in Stufe „Sparsam“; Szene pixelgenau auf 3 Breiten.
Nachweis: Screenshots Tag/Goldene Stunde/Nacht, Messprotokoll, Freigabe im Decision-Log.
Stand 05.10.2026: Look freigegeben (D-030), Bildrate belegt (Messprotokoll). Offen nur noch die Referenztafel.

## M2 – Simulationskern + Ära 1 (TDD)
Ziel: komplette Regeln aus `03` §1–4, §7 für den Hafen als reines TypeScript.
- [ ] `Num`-Wrapper + Format-Tests (bis 1e300, DE/EN), `Rng`, `step()`, Commands, Notices.
- [ ] Fluss/Engpass, Gebäude-Kosten und -Meilensteine, Kaufmenge, Fahrzeuge diskret (aktiv) + Erwartungswert (offline), Äquivalenztest.
- [ ] Sterne-Prestige, Offline (4 h, 50 %), Save (Prüfsumme, Backup, Schema 1, Migrations-Gerüst).
- [ ] `content/eras/harbor.ts` mit allen 8 Gebäuden, 4 Fahrzeugstufen, Ziel-Gebäude.
- [ ] `bin/simulate.ts` mit Policies `casual|active|idle|ads`, Report `docs/balance-report.md`.
Exit: Pflichttests grün, Determinismus, Purity grün, Ära 1 erfüllt Zielkurve (`03` §9) ±30 %.
Nachweis: Testausgabe, Balance-Report.

## M3 – Ära 1 komplett spielbar
Ziel: Hafen von Start bis Ziel-Gebäude, mit Speichern, Offline und Sternen.
- [ ] Alle 8 Hafengebäude mit Ausbaustufen (Meilensteine 10/25/50/100/200), alle Fahrzeuge, Arbeiter-Anzahl nach Stufe.
- [ ] Takt, Interpolation, Lifecycle, Autosave, Rückkehr-Dialog.
- [ ] UI: HUD, Panel (3 Höhen), Bauen-Tab, Kaufmenge, Engpass-Peek, Prestige-Dialog, Einstellungen (Grundumfang), Tokens, 9-Slice-Rahmen, Schriften.
- [ ] Tutorial (`03` §8), Feier-Ebene (Kauf, Meilenstein, Ziel-Gebäude).
- [ ] DE + EN vollständig.
Exit: Neuinstallation → erster Kauf ≤ 60 s, Kran ≤ 5 Min; Ziel-Gebäude erreichbar; Save über App-Update erhalten.
Nachweis: Journey-Test (Playwright), Stoppuhr auf Gerät, UI-Goldens 360 × 640/320 dp/200 %.

## M4 – Ära 2 + Ära-Wechsel
- [ ] Flughafen: Szene, 8 Gebäude, 3 Fahrzeuge, Wetter-Mechanik (gleitend), Palette, LUTs.
- [ ] Mehrere Ären im State, Ären-Tab mit Karte, eigene Währung je Ära, Lieferkette.
- [ ] Kamera-Flug beim Ära-Aufbruch, Save-Migration auf Mehr-Ären-Schema mit Fixture aus M3.
Exit: Spieler wechselt frei zwischen Hafen und Flughafen; alte Ära liefert weiter; Gate grün für Ära 1–2.
Nachweis: Tests, Gate-Report, Screenshots.

## M5 – Systeme
- [ ] Forschungsbaum (~40 Knoten, 4 Äste), Offline-Verlängerung.
- [ ] Personal (feste Preise, Tagesangebot, Aufwerten), Exploit-Proben beide Richtungen.
- [ ] Erfolge (~120), Kristalle, Zeitsprung.
- [ ] Events je Ära (gleitend, Cooldown, Determinismus), tägliche Aufträge (FakeClock-Tests).
Exit: alle Systeme aus UI bedienbar; Gate grün inkl. Systeme; kein System schneller als das Kernspiel (Lehre 6).
Nachweis: Tests, Gate-Report.

## M6 – Ären 3 bis 6
- [ ] Raketenstartplatz (Startfenster), Mondbasis (Sauerstoff), Mars (Bevölkerung), Asteroidengürtel (endlose Felder) – je Szene, Palette, LUTs, Mechanik, Content.
- [ ] Licht-Besonderheiten je Ära (Mond: harte Schatten, schwarzer Himmel; Mars: Staubdunst).
- [ ] Endlos-Test: 1000 Asteroidenfelder ohne Überlauf/NaN.
Exit: alle Ären spielbar, Gate grün für den Gesamtverlauf.
Nachweis: Tests, Screenshots je Ära × 3 Tageszeiten.

## M7 – Balancing
- [ ] Gesamtkurve `03` §9 mit allen Policies, mehrere Seeds; Sackgassen, dominante Strategien, Prestige-Zeitpunkte prüfen.
- [ ] Werbe-Wirkung ≤ 25 % Beschleunigung (`ads` vs. `casual`).
- [ ] Jede Zahländerung in `03` + Decision-Log.
Exit: Abnahme aller Policies; Owner spielt 3 Tage auf dem Gerät und bestätigt das Tempo.
Nachweis: `docs/balance-report.md`, Owner-Notiz.

## M8 – Werbung, Politur, A11y, Performance
- [ ] AdMob (Test-IDs) über `RewardedAds`, 5 Platzierungen (`03` §10), Limits, Fehlertexte; UMP-Flow + „Einwilligung ändern“.
- [ ] A11y-Audit (TalkBack, 200 %, Kontrast, Nicht-Farbe), „Animationen reduzieren“.
- [ ] Performance gegen `02`-Budgets auf 3 Geräteklassen, automatische Qualitätsstufe.
- [ ] Soundeffekte (optional), Haptik, App-Icon, Splash, Store-Grafiken.
Exit: Budgets erreicht, Audit-Liste leer oder begründet; Test-Ad-Belohnung nur nach Callback belegt.
Nachweis: Messprotokolle, Screenshots, Testvideo Ad-Flow.

## M9 – Android-Release-Build und Closed Test
- [ ] Aktuelle Play-Richtlinien, Anforderungen für neue Entwicklerkonten (Pflicht-Testphase), AdMob-/UMP-/Data-Safety-Vorgaben neu lesen (Regel 11).
- [ ] Owner: Upload-Key erzeugen (nie im Repo), `key.properties` lokal, Release-AAB (Minify, kein WebView-Debugging).
- [ ] Produktions-AdMob-IDs, `app-ads.txt` (kostenlos über GitHub Pages), Datenschutzerklärung, Data Safety, Content-Rating.
- [ ] Closed Test mit Testern, Feedback, Update-über-Update-Test.
Exit: keine Blocker, Release-Checkliste vollständig.
Nachweis: Play-Console-Screenshots, Testbericht.

## M10 – Play Store
- [ ] Markenprüfung Name „Pier to Planets“ (Play Store, EUIPO/DPMA) – Owner.
- [ ] Listing DE/EN: Icon, Feature-Grafik, Screenshots (Tag/Nacht, mehrere Ären), Beschreibung ehrlich zur Werbung („nur freiwillige Werbung“).
- [ ] Entwicklerkonto (einmalig 25 US-$, aktuell prüfen) – Owner.
- [ ] Gestaffelter Rollout 10 % → 50 % → 100 %, Monitoring (Android vitals, Bewertungen).
Exit: stabil 2 Wochen, KPI-Review gegen `01` dokumentiert.
