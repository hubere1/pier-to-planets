# 04 – Architektur

## Prinzipien
Rein und testbar unten (Sim), schnell und austauschbar oben (Renderer, UI, Plattform). Offline-first. Kein Backend. Der Renderer zeigt an, er entscheidet nichts.

## Stack (D-001; Versionen in M0 gegen offizielle Quellen prüfen, Regel 11)
| Schicht | Wahl | Grund |
|---|---|---|
| Sprache | TypeScript (strict) | ein Code für Sim, Renderer, UI, Tools |
| Build | Vite | schneller Dev-Server, Handy-Test im LAN-Browser |
| Renderer | PixiJS v8 (WebGL2, WebGL1-Fallback) | GPU-Batching, Filter/Shader, große Community |
| UI-Overlay | DOM + Preact (+ Signals) | echte Schrift-Skalierung, Screenreader, Layout per CSS (D-004) |
| Große Zahlen | break_infinity.js hinter `Num` | schnell, reicht bis 1e9e15 (D-005) |
| Native Hülle | Capacitor 8 (Android, minSdk laut Capacitor ≥ 24) | Web-Code als App, Plugins für Dateien/Lifecycle/Ads |
| Werbung | `@capacitor-community/admob` (MIT, Capacitor 8, Rewarded + UMP) | kostenlos; Capawesome-Plugin ist Teil eines Bezahl-Abos → verworfen (Regel 8) |
| Tests | Vitest (Sim/Logik), Playwright (UI, Render-Goldens) | kostenlos, CI-tauglich |

## Struktur
```
packages/sim/src/
  num/            Num-Wrapper (break_infinity), Format-unabhängig
  rng/            seeded Rng (Zustand im State, serialisierbar)
  model/          GameState, EraState, Building, Vehicle, Staff, Research, Quest
  engine/         step(), Commands, Notices
  econ/           Fluss, Engpass, Kosten, Multiplikatoren
  eras/           harbor/ airport/ rocket/ moon/ mars/ belt/  (je Mechanik)
  prestige/ research/ staff/ achievements/ events/ quests/ offline/
  save/           serialize, checksum, migrate.ts, schema.ts
  views/          abgeleitete Single-Source-Funktionen für UI (§ Views)
  bin/simulate.ts Balancing-CLI, bin/trace.ts Einzellauf
packages/content/ eras/*.ts (Gebäude, Fahrzeuge, Waren, Kurven, Ziel-Gebäude), achievements, research, staff
app/src/
  main.ts, loop/ (Takt, Interpolation, Lifecycle)
  render/         stage, camera, layers/, lighting/, daynight/, fx/, eras/<ära>/scene.ts
  ui/             components/, screens/, sheets/, hud/, tutorial/, fx/ (Feier-Ebene)
  platform/       storage, lifecycle, ads, consent, haptics, share (Interfaces + Capacitor-Impl. + Fakes)
  l10n/           de.json, en.json, format.ts
art/
  palettes/<ära>.json   48 Farben + Rampen
  gen/<ära>/*.ts        Generatoren (albedo/normal/emissive aus derselben Geometrie)
  src/*.aseprite        handgezeichnete Ersetzungen (optional)
  luts/<ära>/<tageszeit>.png
  manifest.json         ID → Atlas, Frames, Maps, Anker, Ausbaustufen
tools/  check-purity.ts, check-l10n.ts, check-palette.ts, build-atlas.ts
```

## Kernvertrag der Simulation
```ts
step(s: GameState, cmds: Command[], ctx: { dt: number; mode: 'active' | 'offline' }): { state: GameState; notices: Notice[] }
```
- Rein, deterministisch, kein IO. Zufall aus `s.rng`, Zeit nur über `dt` und `ctx`.
- Commands: `Buy(era, building, amount)`, `TapVehicle(era, vehicleId)`, `Unload(era)` (A11y), `SetBuyAmount`, `ResetEra(era)`, `BuildGoal(era)`, `SwitchEra(era)`, `Research(node)`, `HireStaff(id)`, `UpgradeStaff(id)`, `AssignStaff(id, slot)`, `ClaimAchievement(id)`, `ClaimQuest(id)`, `RerollQuest(id)`, `ResolveEvent(id, choice)`, `TimeWarp`, `ApplyReward(kind)`, `ClaimOffline(boosted)`.
- Notices tragen immer `ref` + `args` (Lehre 10 aus Bootstrapped), DE/EN-Mapping in der App.
- `offline(s, seconds)`: Erwartungswert über `F` (§2 in `03`), keine diskreten Fahrzeuge, liefert Notices (Zähler-Erfolge, Aufträge).

### Views (Single Source für die UI)
`hud(s)`, `buildingCard(s, era, id)`, `costFor(s, era, id, n)`, `bottleneck(s, era)`, `prestigePreview(s, era)`, `offlinePreview(s, seconds)`, `goalProgress(s, era)`, `researchNode(s, id)`, `staffOffer(s, day)`, `questList(s, day)`, `rewardAvailability(s, kind, now)`. Die UI rechnet nichts nach.

### Szenen-Zustand für den Renderer
`sceneView(s, era)` liefert pro Gebäude die **Ausbaustufe** (aus Meilensteinen) und pro Fahrzeug Position im Ablauf (`approach | docked | unloading(0..1) | leaving`) + Ladung. Der Renderer interpoliert zwischen zwei Sim-Zuständen (Alpha aus Akkumulator).

## Takt und Lifecycle (`app/src/loop`)
- `requestAnimationFrame` → Akkumulator → feste Sim-Schritte à 0,1 s (max. 10 Schritte je Frame, Rest verwerfen bei Ruckler) → Render mit Interpolation.
- `@capacitor/app` `appStateChange`/`pause`: Zeit merken (`savedAtWallMs`), speichern, Schleife stoppen. `resume`: Abwesenheit < 60 s → nahtlos, sonst `offline()` + Rückkehr-Dialog.
- Wanduhr nur in `platform/clock` (`Date.now()`), nie in der Sim.
- Bildrate: 60 fps in Szene, 30 fps bei offenem Vollbild-Panel oder 10 s ohne Bewegung in der Szene (Akku).

## Renderer (`app/src/render`) – Details in `06`
- **Native Bühne:** RenderTexture in Spiel-Pixeln, Breite 360, Höhe `round(Gerätehöhe / s)` (640–800, D-002). Alles wird darin gezeichnet und gerastert.
- **Skalierung:** `s = floor(Gerätebreite_px / 360)` (720 → 2, 1080 → 3, 1440 → 4). Ausgabe per `nearest` ganzzahlig. Bleibt ein Rest, wird mit Sharp-Bilinear (nearest auf s, dann bilinear auf Zielbreite) skaliert – keine ungleich breiten Pixel, kein Flimmern.
- **Pipeline je Frame:**
  1. G-Puffer (Spiel-Pixel-Auflösung): Albedo, Normalen, Emissive (je Sprite aus dem Atlas, gleiche UV).
  2. Licht-Pass: Sonne/Mond (gerichtet, Winkel aus Tageszeit) + bis zu 16 Punktlichter, `N·L` in 3–4 Stufen quantisiert, Übergänge mit 4×4-Bayer-Dither.
  3. Schatten: Sprite-Schatten als verzerrte Silhouetten, Länge/Richtung aus Sonnenwinkel (im Vertex-Shader).
  4. Farbabstufung: 3D-LUT der Tageszeit (zwei LUTs gemischt), Emissive danach addiert (Lichter bleiben nachts hell).
  5. Effekte: Wasser-Spiegelung (gespiegelter Streifen + Sinus-Versatz in ganzen Pixeln), Partikel auf dem Pixelraster, Nebel/Wolken-Ebenen.
  6. Upscale auf den Bildschirm (s.o.).
- **Qualitätsstufen** (automatisch nach Frame-Messung in den ersten 10 s, manuell in Einstellungen): `Hoch` (alles), `Mittel` (8 Lichter, keine Spiegel-Verzerrung), `Sparsam` (keine Normalen, nur LUT + Emissive, 2 Parallax-Ebenen).
- Eigene Pixi-v8-Filter/Shader (pixi-lights unterstützt v8 nicht, D-016). WebGPU nicht nötig.

## Asset-Pipeline (D-015)
1. Generator (`art/gen`, TypeScript, Node, `@napi-rs/canvas` o. ä. – in M0 prüfen) zeichnet jedes Objekt als Geometrie (Quader, Zylinder, Kegel, Profile) und schreibt **gleichzeitig** Albedo (palettengebunden), Normalen (aus der echten Geometrie, auf 8 Richtungen gerundet) und Emissive (Fenster, Lampen) als PNG.
2. Handgezeichnete Ersetzungen: Aseprite-Datei mit Ebenen `albedo`, `normal`, `emissive`; Export per `aseprite --batch --split-layers --sheet … --data …` in denselben Ordner.
3. `tools/build-atlas.ts` packt je Ära Atlanten ≤ 2048 × 2048 (Albedo/Normal/Emissive mit identischem Layout), schreibt `manifest.json`.
4. Code lädt nur `manifest.get('harbor.warehouse', stage)`. Austausch einer Grafik = Datei ersetzen, Atlas neu bauen.
5. `check-palette.ts`: Albedo nutzt nur Palettenfarben der Ära; Normalen nur erlaubte Richtungen; Atlasgröße ≤ 2048.

## Save
- Datei `save.json` im App-Datenordner (`@capacitor/filesystem`, `Directory.Data`), nicht `localStorage` (kann von WebView/System geleert werden).
- Header `{ schemaVersion, checksum (SHA-256 über Payload), savedAtWallMs, appVersion }`; `Num` als String.
- Schreiben: `save.tmp` → `rename` → vorherige gute Datei als `save.bak`. Laden: `save.json` → `save.bak` → defekte Datei nach `corrupt_<zeit>.json` verschieben, nie löschen.
- Migrationen ab Schema 1 (Regel 9). Neuere Version als die App → Hinweis „App aktualisieren“, Datei unangetastet.
- Android Auto Backup an, Regeln nur für `save.json`/`save.bak`. Einstellungen über `@capacitor/preferences`.
- Browser-Entwicklung: dieselbe `SaveStore`-Schnittstelle mit IndexedDB-Implementierung.

## Plattform-Interfaces
| Interface | Android | Browser (Dev) | Test |
|---|---|---|---|
| `SaveStore` | Capacitor Filesystem | IndexedDB | In-Memory |
| `Lifecycle` | `@capacitor/app` | `visibilitychange` | Fake |
| `Clock` | `Date.now()` | dito | FakeClock |
| `RewardedAds` (load/isReady/show → Reward) | `@capacitor-community/admob` | Fake (Knopf „Belohnung simulieren“) | Fake |
| `Consent` | UMP über AdMob-Plugin | Fake | Fake |
| `Haptics` | `@capacitor/haptics` | NoOp | NoOp |
| `CloudSave` | NoOp (V1.1 Play Games) | NoOp | NoOp |
Die Sim kennt keines davon; Werbung wirkt nur über den Command `ApplyReward`.

## Fehlerbehandlung
Alle Plattform-Aufrufe mit Fallback (Ad nicht geladen → Hinweis; Save fehlgeschlagen → nächster Versuch + Hinweis nach 3 Fehlern). Globaler Fehlerfänger (`window.onerror`, `unhandledrejection`) schreibt in eine rotierende lokale Logdatei (≤ 200 KB); Einstellungen → „Fehlerbericht kopieren“. WebGL-Kontextverlust: Renderer neu aufbauen, Sim läuft weiter.

## Sicherheit / Datenschutz
Keine Konten, keine personenbezogenen Daten außer der Werbe-ID durch AdMob (nach UMP). Release-Build: Minify, Source-Maps nicht im Bundle, `android:debuggable=false`, WebView-Debugging nur in Debug-Builds.
