# Arbeitsstand – hier weitermachen

Zuletzt aktualisiert: 05.10.2026. Diese Datei sagt dem nächsten Agenten bzw. Entwickler,
wo die Arbeit steht. Bei jedem Sitzungsende aktualisieren.

## Kurzfassung
- **M0 Fundament:** abgeschlossen.
- **M1 Stilprobe + Geräte-Durchstich:** Look freigegeben (D-030), 60 fps auf Gerät belegt; nur Referenztafel offen.
- **M2 Simulationskern + Ära 1:** abgeschlossen.
- **M3 Ära 1 komplett spielbar:** abgeschlossen 05.10.2026 (Version 0.3.0, `versionCode 2`). `npm run verify` lokal
  grün (30 Playwright-Tests, 212 Vitest-Tests, Gate grün), **CI grün auf `6c1d894`** (Run 37326605189, 14,6 Min;
  Job-Limit danach auf 30 Min angehoben). Nachweise: `docs/m3/geraetelauf.md` + Screenshots in `docs/m3/`.
- Nächster Meilenstein: **M4 Ära 2 Flughafen + Ära-Wechsel** (`docs/07-milestones.md`).

## M3 – was fertig ist
- **Sitzung** `app/src/loop/session.ts`: 10-Hz-Schritte (max. 10 je Frame), `prev`/`alpha` für Interpolation,
  Commands sofort ohne Zeit, Autosave alle 10 s / nach Kauf / bei Pause, < 60 s nahtlos, sonst `offline()`,
  `halt()` vor dem Archivieren, liest nie über einen Stand aus neuerer App.
- **Plattform** `app/src/platform/`: `FileSaveStore` (save.tmp → save.json, vorige → save.bak, defekt →
  `corrupt_*`, Neustart → `archive_*`), Backends Capacitor Filesystem / IndexedDB / Speicher, Lifecycle, Clock, Haptik.
- **Szene** `app/src/render/scene/`: `harborLayout.ts` (Plätze aller Gebäude, Liegeplätze, Reede, D-037),
  `vehicleTracker.ts` (Sim-Fahrzeuge → Positionen), `harbor.ts` (Stufen, Silhouetten, Gerüst, Funken, Arbeiter,
  Lichter, `hitTest`, `rectOf`). Kamera ±120 mit `focus()`. Debug-Vorgaben `?preset=fresh|early|mid|full`,
  `?mem=1` (Speicher-Spielstand), Debug-Knopf nur mit `?debug=0|1` oder im Dev-Server.
- **UI** `app/src/ui/`: HUD, Panel (Peek/Halb/Voll) mit Bauen/Ziele/Ären, Gebäudekarten, Prestige-Dialog,
  Rückkehr-Dialog, Einstellungen, Coach (`tutorial/tutorial.ts` = Zustandsautomat, D-038), Feier-Ebene
  (`fx/messages.ts` = Warteschlange), Live-Region, Entladen-Knopf. Einstellungen in `settings.ts` (D-042).
- **Grafik**: `art/gen/harbor/buildings.ts` (Kran, Fischmarkt, Zollhaus, Werft, Raumhafen-Anleger, Kutter, Frachter,
  Gerüst, Schild, Funken, Kistenstapel, Porträt), UI-Rahmen/Symbole `tools/build-ui.ts` mit `art/palettes/ui.json`.
- **Schriften** `app/src/ui/fonts/` (D-041), Neubau nur bei Bedarf: `python tools/fonts/build_fonts.py`
  (braucht fontTools + brotli; Quellen in `tools/fonts/src/`).
- **Sim-Ergänzungen**: `buildingCard.effectAfter/effectKind`, `sceneView.stockFill`, Notice `vehicle.newTier`,
  erstes Boot 3-fache Ladung (`FIRST_BOAT_LOAD`, D-040), Gate-Einstieg über 100 Installationen.
- Entscheidungen D-037 bis D-043.

## Für M4 wichtig
- Mehr-Ären-State und Save-Migration: Schema 1 → 2 braucht eine Fixture aus M3 (z. B. aus
  `docs/m3/geraetelauf.md`-Lauf oder per `?preset=full` erzeugt und mit `serializeSave` geschrieben).
- Ära-Wechsel: `--accent` je Ära (Token), Kamera-Flug beim Aufbruch (D-039 hat ihn auf M4 verschoben),
  Ziel-Feier zeigt derzeit „Flughafen folgt mit dem nächsten Update“ – Text in `celebrate.goal.text` ersetzen.
- Ären-Tab ist ein Platzhalter (Hafen + gesperrter Flughafen) in `ui/panel/Tabs.tsx`.
- Renderer kennt nur die Hafenszene; `stage.ts` lädt fest `loadEra('harbor')`.

## Offene Punkte (kein Blocker)
- M1: Referenztafel (Sea of Stars, Graveyard Keeper, Eastward) neben den Screenshots – `docs/m1/referenz.md`.
- Feinschliff Grafik: Kran-Gittermast wirkt dünn, Werft-Rumpf eher Schale als Schiff, Sonnenschatten kaum sichtbar.
- Bei 200 % Schrift bleibt im halben Panel wenig Platz für Karten (scrollt, nichts abgeschnitten).
- Stoppuhr auf einem echten Gerät des Owners steht aus (Emulator: 44,3 s; D-027 – nur mit Zustimmung).
- Kein WebGL1-Fallback (Licht-Shader braucht WebGL2).

## Nützliche Befehle
```
npm install                      # einmalig
npm run verify                   # alle Prüfungen (Windows: tools/verify.ps1)
npm run dev                      # Browser, Handy im LAN
npm run art                      # Grafik + Manifest + UI-Rahmen neu bauen
npm run android:sync             # Web-Build in die Android-Hülle kopieren
cd android && gradlew.bat assembleDebug   # Debug-APK (JDK 21 nötig, D-026)
```
Emulator: `%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -avd ptp_api36`, adb immer mit `-s emulator-5554`.
Spielstand im Emulator lesen: `adb -s emulator-5554 exec-out run-as app.piertoplanets.game cat files/save.json`.
Updates immer mit `adb install -r` drüber installieren, nie deinstallieren (Regel 9).
