# Arbeitsstand – hier weitermachen

Zuletzt aktualisiert: 04.10.2026 (Ende der Sitzung). Diese Datei sagt dem nächsten Agenten bzw. Entwickler,
wo die Arbeit steht. Bei jedem Sitzungsende aktualisieren.

## Kurzfassung
- **M0 Fundament:** abgeschlossen, CI grün.
- **M1 Stilprobe + Geräte-Durchstich:** großteils umgesetzt, **Abnahme offen**.
  Die Hafenszene läuft im Browser und im Android-Emulator, mit Licht, Tag-Nacht-Wechsel, Wasser und Spiegelungen.
- Nächster Meilenstein nach M1-Abnahme: **M2 Simulationskern** (TDD, `docs/07-milestones.md`).

## M1 – was fertig ist
- Grafik-Pipeline: `npm run art` (= `tools/gen-luts.ts` + `tools/build-atlas.ts`)
  - Palette `art/palettes/harbor.json` (48 Farben in Rampen), Generatoren `art/gen/harbor/index.ts`
  - Atlanten `art/build/harbor/atlas.{albedo,normal,emissive}.png`, LUTs `art/luts/harbor/*.png`, `art/manifest.json`
  - Austausch einzelner Grafiken: PNGs nach `art/src/<sprite-id>/<stufe>-<bild>.albedo.png` (+ `.normal`/`.emissive`)
- Renderer `app/src/render/`: Layout (`layout.ts`), Tag-Nacht (`daynight.ts`), Pipeline (`pipeline.ts`),
  Licht-Shader (`lighting/composite.ts`), Szene (`scene/harbor.ts`, `scene/sceneSprite.ts`), Bühne (`stage.ts`)
- Debug-Regler (Knopf „Debug“): Tageszeit, Tempo, Qualität, Licht an/aus, Ausbaustufe Lagerhalle, fps/p95
- URL-Parameter für Screenshots: `?hour=12&speed=0&quality=low&stage=0&light=0&debug=1&ui=0`
- Tests: Pixeltest 720/1080/1440 px (`app/e2e/pixels.spec.ts`), Szene + Debug (DE), Layout- und Tag-Nacht-Unit-Tests
- Android: Capacitor 8, randlos mit dunklen Systemleisten, läuft im Emulator `ptp_api36` (D-027)
- Screenshots zur Abnahme: `docs/m1/` (Tag, goldene Stunde, Nacht, Emulator)

## M1 – was offen ist (in dieser Reihenfolge)
1. **Owner-Freigabe des Looks** anhand `docs/m1/*.png` → Eintrag im Decision-Log.
2. **Referenztafel** (Sea of Stars, Graveyard Keeper, Eastward) neben den Screenshots – `docs/m1/referenz.md`.
3. **Parallax-Kamera:** Ebenen existieren (fern, mittel, Spiel, vorne), aber die Kamera steht still. Kameraschwenk mit
   Parallax-Faktoren aus `docs/06` §6 fehlt.
4. **fps-Messung auf echtem Gerät** (Exit-Kriterium 60 fps / p95 ≤ 20 ms, Low-End 30 fps): Im Emulator nicht aussagekräftig.
   **Vorher den Owner fragen** (D-027: Tests sonst nur im Emulator).
5. Im Android-WebView meldet WebGL „no texture bound to the unit 1/2/3/16…“ (Warnung, Bild korrekt). Ursache klären
   (vermutlich Sampler-Bindung in `pipeline.ts` vor dem ersten Render).
6. Feinschliff: Sonnenschatten kaum sichtbar, Klippen-Textur, viel leerer Himmel (Komposition), Rauch ohne Ausblenden.
7. Kein WebGL1-Fallback: Der Licht-Shader braucht WebGL2 (GLSL 300 es). Für sehr alte Geräte Stufe „Sparsam“ ohne
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
Emulator: `%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -avd ptp_api36`, adb immer mit `-s emulator-5554`.
