# Arbeitsstand – hier weitermachen

Zuletzt aktualisiert: 05.10.2026. Diese Datei sagt dem nächsten Agenten bzw. Entwickler,
wo die Arbeit steht. Bei jedem Sitzungsende aktualisieren.

## Kurzfassung
- **M0 Fundament:** abgeschlossen. **CI grün** auf Stand `e780c94` (Run 37281812046, inkl. Pixeltests per Software-WebGL).
- **M1 Stilprobe + Geräte-Durchstich:** Look freigegeben (D-030), 60 fps auf Gerät belegt; nur Referenztafel offen.
  Die Hafenszene läuft im Browser und im Android-Emulator, mit Licht, Tag-Nacht-Wechsel, Wasser und Spiegelungen.
- Nächster Meilenstein nach M1-Abnahme: **M2 Simulationskern** (TDD, `docs/07-milestones.md`).

## M1 – was fertig ist
- Grafik-Pipeline: `npm run art` (= `tools/gen-luts.ts` + `tools/build-atlas.ts`)
  - Palette `art/palettes/harbor.json` (48 Farben in Rampen), Generatoren `art/gen/harbor/index.ts`
  - Atlanten `art/build/harbor/atlas.{albedo,normal,emissive}.png`, LUTs `art/luts/harbor/*.png`, `art/manifest.json`
  - Austausch einzelner Grafiken: PNGs nach `art/src/<sprite-id>/<stufe>-<bild>.albedo.png` (+ `.normal`/`.emissive`)
- Renderer `app/src/render/`: Layout (`layout.ts`), Tag-Nacht (`daynight.ts`), Pipeline (`pipeline.ts`),
  Licht-Shader (`lighting/composite.ts`), Szene (`scene/harbor.ts`, `scene/sceneSprite.ts`), Bühne (`stage.ts`)
- Parallax-Kamera (D-029, `render/camera.ts`): Wisch-Schwenk ±40 px mit Auslaufen, Ebenen-Faktoren aus `docs/06` §6
- Debug-Regler (Knopf „Debug“): Tageszeit, Tempo, Qualität, Licht an/aus, Ausbaustufe Lagerhalle, Kamera, fps/p95
- URL-Parameter für Screenshots: `?hour=12&speed=0&quality=low&stage=0&cam=-40&light=0&debug=1&ui=0`
- WebGL-Warnung „no texture bound to the unit n“ im Android-WebView behoben (leere Textur auf freie Einheiten,
  `stage.ts` + `pipeline.ts`); im Emulator 30 s ohne Warnung geprüft
- Tests: Pixeltest 720/1080/1440 px (`app/e2e/pixels.spec.ts`), Szene + Debug (DE), Kamera (Wischen, pixelgenau bei
  −40/−17/40), Layout-, Tag-Nacht- und Kamera-Unit-Tests
- Android: Capacitor 8, randlos mit dunklen Systemleisten, läuft im Emulator `ptp_api36` (D-027)
- Screenshots zur Abnahme: `docs/m1/` (Tag, goldene Stunde, Nacht, Emulator)

## M1 – was offen ist (in dieser Reihenfolge)
Erledigt am 05.10.2026: **Owner-Freigabe des Looks** (D-030) und **fps-Messung auf Gerät** (Galaxy A51: 60 fps,
p95 16,7 ms in allen Stufen, `docs/m1/messprotokoll.md`).
1. **Referenztafel** (Sea of Stars, Graveyard Keeper, Eastward) neben den Screenshots – `docs/m1/referenz.md`.
   Letzter Haken für M1.
2. Feinschliff (kein Abnahme-Blocker): Sonnenschatten kaum sichtbar, Klippen-Textur, viel leerer Himmel (Komposition), Rauch ohne Ausblenden.
3. Kein WebGL1-Fallback: Der Licht-Shader braucht WebGL2 (GLSL 300 es). Für sehr alte Geräte Stufe „Sparsam“ ohne
   eigenen Shader prüfen.

## Nützliche Befehle
```
npm install                      # einmalig
npm run verify                   # alle Prüfungen (Windows: tools/verify.ps1)
npm run dev                      # Browser, Handy im LAN
npm run art                      # Grafik + Manifest neu bauen
npm run android:sync             # Web-Build in die Android-Hülle kopieren
cd android && gradlew.bat assembleDebug   # Debug-APK (JDK 21 nötig, D-026)
```
Emulator (aktuell beendet, bei Bedarf neu starten): `%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -avd ptp_api36`, adb immer mit `-s emulator-5554`.
