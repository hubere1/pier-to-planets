# 06 – Typografie und Pixelgrafik

Owner-Vorgabe (04.10.2026): Die Pixelgrafik soll **extrem hochwertig und hochauflösend** aussehen. Dieses Dokument legt fest, wie das technisch und handwerklich erreicht wird. Die Grundlage sind Recherchen zu aktuellen Pixel-Art-Spielen mit moderner Beleuchtung (Quellen am Ende).

## 1. Qualitätsziel: „HD-Pixel“
Hochwertig heißt bei Pixelgrafik nicht „mehr Pixel um jeden Preis“, sondern: **viele echte Spiel-Pixel, jeder exakt scharf, dazu modernes Licht, das sich dem Pixelraster unterordnet.** Vorbilder und was wir von ihnen übernehmen:
| Vorbild | Übernommen |
|---|---|
| Sea of Stars | Schatten wandern und werden länger mit der Tageszeit, dynamisches Licht auf Pixel-Sprites |
| Graveyard Keeper | Tageszeit über Farb-LUTs (mehrere Tageszeiten, vom Grafiker aus Screenshots erstellt), Sprite-Schatten im Vertex-Shader gedreht, Wind-Wackeln nach Höhe |
| Eastward | dunkle Grundszene, Licht „malt“ Farbe hinein, Bloom sparsam |
| The Last Night | Licht als Hauptwerkzeug für Tiefe, viele Parallax-Ebenen |
| Owlboy | große, detailreiche Sprites mit viel Sekundäranimation |
Abnahme in M1: Owner vergleicht die Stilprobe mit einer Referenztafel aus diesen Spielen. Freigabe ist Bedingung für alle weiteren Grafik-Arbeiten.

## 2. Auflösung und Skalierung (das Fundament der Schärfe)
- **Spiel-Pixel-Bühne:** Breite fest **360**, Höhe `round(Bildschirmhöhe_px / s)`, begrenzt auf 640–800. Kern-Komposition im mittleren 640er-Band.
- **Skalierfaktor** `s = floor(Bildschirmbreite_px / 360)`:
| Gerätebreite | s | Ergebnis |
|---|---|---|
| 720 px | 2 | exakt, Vollbild-Breite |
| 1080 px (häufigste Klasse) | 3 | exakt, Vollbild-Breite |
| 1440 px | 4 | exakt, Vollbild-Breite |
| krumme Breiten (z. B. 1176) | 3 + Rest | Sharp-Bilinear: erst nearest auf 3×, dann bilinear auf Zielbreite – gleich breite Pixel ohne Flimmern |
- Die Rechnung läuft in **Gerätepixeln** (`window.innerWidth · devicePixelRatio`), nicht in CSS-px. Canvas-Größe = Gerätepixel, CSS-Größe = Gerätepixel / DPR, `image-rendering: pixelated`.
- Alles wird in die Spiel-Pixel-RenderTexture gezeichnet, erst am Ende einmal hochskaliert. **Kein Sprite wird je einzeln skaliert oder gedreht** (sonst „Mixels“). Ausnahmen: Partikel und UI-Effekte, die bewusst auf das Raster gelegt werden.
- Bewegung: Positionen intern als Kommazahl, gezeichnet immer gerundet (Pixi `roundPixels`). Kamera bewegt sich in ganzen Spiel-Pixeln; Parallax-Ebenen runden einzeln. Langsame Fahrzeuge (< 8 px/s) bewegen sich in ganzen Pixeln mit gleichmäßigem Takt statt ruckelnd.
- **Fläche:** 360 × 800 = 288 000 Spiel-Pixel – etwa die vierfache Fläche des ersten Prototyps und mehr als ein SNES-Bild (256 × 224) mal fünf. Genug für Container mit Nummern, Fenster, Rettungsboote, Kranhaken, einzelne Arbeiter.

## 3. Sprite-Handwerk
### Größen
| Objekt | Spiel-Pixel | Detail-Beispiel |
|---|---|---|
| Kleine Fahrzeuge (Fischerboot, Rover) | 48–64 | Netz, Fischer, Positionslichter |
| Große Fahrzeuge (Containerschiff, Jumbo, Rakete) | 96–128 (Rakete bis 160 hoch) | einzelne Container in 4 Farben, Fenster, Rettungsboote, Brücke |
| Gebäude | 64–128 | Fenster mit Innenlicht, Rohre, Schilder, Ausbau-Module |
| Arbeiter, Passagiere | 6–10 hoch | 4-Frame-Gang, Werkzeug |
| Porträts (Personal) | 32 × 32 | Gesicht, Uniform je Ära |
### Regeln
- Klare Silhouette zuerst; Außenkontur farbig (dunklere Rampenfarbe, nicht schwarz), außer bei Fahrzeugen vor hellem Himmel.
- **Farbrampen mit Farbton-Verschiebung:** Schatten kühler, Lichter wärmer; 4–6 Stufen je Material.
- Keine Verläufe ohne Raster: Übergänge über Dithering (Schachbrett, 2×2/4×4 Bayer) oder Clusterbildung.
- Keine einzelnen „Waisen“-Pixel, keine Treppchen mit ungleichen Stufen in Linien (1-2-1-2 statt 1-3-1).
- Animation: 8–12 Bilder/s für Figuren und Kräne, Wasser 6 Bilder/s, Lichter 2–4 Bilder/s. Sekundärbewegung (Fahnen, Rauch, Wellen am Rumpf) für Lebendigkeit.
- **Ausbaustufen als Module:** Gebäude bestehen aus Teilen (Sockel, Stockwerk, Dach, Anbau, Kran, Schild), die bei Meilensteinen dazukommen. Weniger Zeichenaufwand, mehr sichtbares Wachstum.

## 4. Licht – modern, aber pixelgetreu
Recherche-Befund: Normal-Maps in voller Auflösung lassen Pixel-Art „glatt und 3D“ wirken und verlieren den handgezeichneten Charakter. Deshalb:
1. **Licht wird pro Spiel-Pixel berechnet**, nicht pro Bildschirm-Pixel (der Licht-Pass läuft auf der 360er-Bühne).
2. **Quantisiert:** `N·L` wird auf 3–4 Stufen gerundet (Cel-Shading-Prinzip, Rampentextur), Übergänge mit 4×4-Bayer-Dither statt Verlauf.
3. **Normalen sind gerundet:** Generatoren schreiben Normalen auf 8 Richtungen + „flach“ gerundet. Handgemalte Normal-Maps folgen derselben Palette (9 Normalfarben).
4. **Maps je Sprite:** Albedo (Palette), Normal (9 Werte), Emissive (Fenster, Lampen, Triebwerke). Optional Höhe (1 Kanal) für Schattenwurf von Gebäuden auf den Boden.
5. **Lichtquellen:** 1 gerichtete (Sonne/Mond, Winkel und Farbe aus Tageszeit) + bis 16 Punktlichter (Leuchtturm-Kegel, Laternen, Triebwerke, Mondbasis-Strahler). Lichter mit „Licht-Sprite“ (gepixelte Form statt runder Kreis).
6. **Bloom** nur auf Emissive, gerastert auf Spiel-Pixel, schwach (Nacht-Lichter, Raketenflamme).
7. Umsetzung als eigener PixiJS-v8-Filter (pixi-lights ist nicht v8-kompatibel). Kosten: 288 000 Fragmente × wenige Lichter – auf Mittelklasse unkritisch, in M1 gemessen.

## 5. Tag-Nacht-Wechsel
- Zyklus: **24 Spielminuten** = ein Tag (A), rein kosmetisch (D-017): Wirtschaft unabhängig von der Uhrzeit (Offline-Gleichheit, keine Zeitfaktoren).
- **8 Stützpunkte** je Ära: Morgengrauen, Sonnenaufgang, Vormittag, Mittag, Nachmittag, Goldene Stunde, Blaue Stunde, Nacht. Je Stützpunkt eine 3D-LUT (Streifen 256 × 16 bzw. 1024 × 32), dazwischen gemischt.
- LUT-Herstellung: Screenshot der Szene → in Bildbearbeitung umfärben („mach daraus Abend“) → LUT exportieren (Workflow von Graveyard Keeper). Danach Rücknahme auf die Palette prüfen (keine fremden Farben außer Licht).
- Emissive wird **nach** der LUT addiert, damit Fenster nachts wirklich leuchten.
- Himmel: eigene Ebene mit Farbbändern (gedithert), Sonne/Mond als Sprites auf Bahn, Sterne nachts (funkeln 2 Bilder/s, „Animationen reduzieren“ = still).
- Schatten-Sprites werden mit dem Sonnenwinkel verzerrt und verlängert; nachts weiche Schatten der Punktlichter (nur Gebäude, Qualitätsstufe „Hoch“).

## 6. Lebendigkeit (Ebenen und Effekte)
| Ebene (hinten → vorne) | Inhalt Hafen | Parallax |
|---|---|---|
| 1 Himmel | Verlauf, Sonne/Mond, Sterne | 0 |
| 2 Fern | Hügel, Stadt-Silhouette, Wolken | 0,1 |
| 3 Mittel | Leuchtturm-Klippe, ferne Schiffe | 0,3 |
| 4 Spiel | Gebäude, Fahrzeuge, Arbeiter | 1,0 |
| 5 Wasser | Spiegelung + Wellen | 1,0 |
| 6 Vorne | Möwen, Pfähle, Nebelschwaden | 1,3 |
- **Wasser-Spiegelung:** gespiegelter Streifen der Spiel-Ebene, Versatz per Sinus in ganzen Pixeln, Farbe über Wasser-Rampe abgedunkelt; Lichter spiegeln sich als gestrichelte Bahnen.
- **Rauch/Dampf:** Partikel auf dem Raster, 3–4 Größenstufen, Palette der Ära.
- **Wind:** Vertex-Shader verbiegt Fahnen, Gras, Seile nach Höhe (oben stark, unten fest).
- **Arbeiter:** kleine Figuren mit festen Wegen (Kran ↔ Lager), Anzahl wächst mit Gebäudestufen.
- Ära-Wechsel im Licht-Thema: Mond ohne Atmosphäre = harte Schatten, schwarzer Himmel, keine LUT-Färbung des Himmels; Mars = Staubdunst-Ebene, blaue Sonnenuntergänge.

## 7. Paletten
- Je Ära ≤ 48 Farben in Rampen (`art/palettes/<ära>.json`), plus 9 Normalfarben (getrennt) und Emissive-Farben.
- Startpaletten (Grundton): Hafen warm (Messing, Teer, Seeblau, Rostrot), Flughafen klar (Himmelblau, Asphalt, Signalgelb), Rakete (Beton, Triebwerksorange, Warnstreifen), Mond (Grau-Rampen, kühles Weiß, Gold-Folie), Mars (Rost, Ocker, Kuppelgrün), Gürtel (Tiefviolett, Eisblau, Platin, Erz-Akzente).
- `check-palette` in CI prüft jedes Albedo-PNG gegen die Palette.

## 8. Wie die Grafik entsteht
- **Code-generiert (Standard, D-015):** Generatoren bauen Objekte aus Geometrie (Quader, Zylinder, Profile, Module) und schreiben Albedo, Normal und Emissive aus **derselben Geometrie**. Vorteil: exakte, konsistente Normalen und Ausbaustufen, die man nicht von Hand zeichnen muss. Nachbearbeitung: Pixel-Cleanup-Pass (Waisen-Pixel entfernen, Konturen schließen, Treppchen glätten).
- **Handgezeichnet (optional, später):** Figuren, Porträts und Schlüsselobjekte in Aseprite mit Ebenen `albedo` / `normal` / `emissive`; Export per Aseprite-CLI (`--batch --split-layers --sheet --data`). Ersetzt die generierte Datei unter derselben Manifest-ID.
- **Atlanten:** je Ära ≤ 2048 × 2048 (auf praktisch allen Android-Geräten unterstützt, 4096 nur fast überall), je Map ein Atlas mit identischem Layout.

## 9. Typografie
### Schriften (alle gebündelt, offline, freie Lizenz)
| Rolle | Schrift | Lizenz | Einsatz |
|---|---|---|---|
| Pixel-Anzeige | **m6x11plus** (Daniel Linssen, D-022) | frei mit Namensnennung | HUD-Zahlen, Titel, Knöpfe, Szenen-Zahlen („+42“) |
| Pixel-Klein | **Pier Pixel Klein** (eigene Schrift, 5 × 7-Raster, D-025) | proprietär (eigenes Werk) | Schilder in der Szene, kleine Badges |
| Fließtext | **Atkinson Hyperlegible Next** | SIL OFL 1.1 | Beschreibungen, Dialoge, Tutorial, Einstellungen |
- M0-Prüfung (erledigt, D-022): Glyphen für `ÄÖÜäöüß€` und geschütztes Leerzeichen in m6x11plus. Fehlen sie, ergänzen wir sie selbst als abgeleitete Schrift „Pier Pixel“ (eigene Glyphen, Lizenz in `LICENSES.md`), im selben Raster.
- Pixel-Schriften erscheinen **nur in ganzzahligen Vielfachen ihres Rasters** in Gerätepixeln: Schriftgröße = `11 · k · s / DPR` CSS-px (m6x11), `k` ∈ {1, 2}. Damit bleibt jeder Schrift-Pixel exakt auf dem Spiel-Pixel-Raster.
- In der Szene (PixiJS) als BitmapFont aus denselben Glyphen, gezeichnet in der Spiel-Pixel-Bühne.
### Typo-Skala (Ausgangswerte bei s = 3)
| Stil | Schrift | Größe | Verwendung |
|---|---|---|---|
| `display` | m6x11 ×2 | 22 Spiel-Pixel Zeilenhöhe | Feier-Titel, Ära-Name |
| `hudNumber` | m6x11 ×1 | 11 + 3 Abstand | Geld, Einnahmen/s |
| `button` | m6x11 ×1 | 11 | Kaufknöpfe, Tabs |
| `label` | Pier Pixel Klein ×1 | 7 + 2 | Badges, Stufen |
| `body` | Atkinson Next 16 px / 1,4 | CSS-px | Beschreibungen |
| `bodySmall` | Atkinson Next 14 px / 1,4 | CSS-px | Hilfstexte |
### Skalierung bis 200 %
- Fließtext (Atkinson) skaliert stufenlos mit der Systemschrift.
- Pixel-Schrift springt: Systemschrift ≥ 130 % → `k = 2` für `button`/`hudNumber`; Zeilen umbrechen statt abschneiden. Layout-Test auf 320 dp + 200 %.
### Ziffern
- Zahlen im HUD und auf Knöpfen in gleich breiten Ziffern (m6x11-Ziffern in M0 prüfen; sonst Ziffern im BitmapFont auf feste Breite setzen). CSS `font-variant-numeric: tabular-nums` für Atkinson.

## 10. Zahlenformat
- Unter 1 Mio.: voll mit Tausendertrenner („42.380 Taler“, EN „42,380 Thaler“).
- Ab 1 Mio.: eine Nachkommastelle + Suffix, immer abgerundet. DE: Mio., Mrd., Bio., EN: M, B, T; ab 1e15 in beiden Sprachen gleich: Qa, Qi, Sx, Sp, Oc, No, Dc, danach aa, ab, … zz (bis unter 1e2064), darüber wissenschaftlich (D-033).
- Einstellung „Wissenschaftlich“: `4,2e45`.
- Geschütztes Leerzeichen zwischen Zahl und Einheit; Rate mit „/s“ ohne Leerzeichen.
- Alle Formate kommen aus `l10n/format.ts`, getestet bis 1e300 und für DE/EN.

## Quellen (Recherche 04.10.2026)
- Graveyard Keeper – LUT-Tageszeiten, Schatten im Vertex-Shader, Wind: <https://slava.lazybeargames.com/graveyard-keeper-how-the-graphics-effects-are-made>
- Normal-Maps für Pixel-Art, Grenzen hoher Auflösung: <https://arxiv.org/pdf/2212.09692>, <https://yaksoy.github.io/dynapix/>
- Pixel-Art mit PBR-Licht (handgemalte Normalen): <https://80.lv/articles/exploring-next-gen-pixel-art-with-real-time-dynamic-lighting>
- Sea of Stars, dynamische Schatten nach Tageszeit: <https://foro3d.com/2026/julio/sea-of-stars-pixel-art-de-16-bits-con-iluminacion-dinamica-en-unity.html>
- Licht pro Texel / quantisiert: <https://discussions.unity.com/t/the-quest-for-efficient-per-texel-lighting/700574>, <https://forum.godotengine.org/t/pixel-perfect-cell-shading-with-normal-maps/103199>
- Sharp-Bilinear-Skalierung: <https://godotshaders.com/shader/adjustable-strength-sharp-linear-interpolation/>
- PixiJS v8 `roundPixels`, `scaleMode 'nearest'`, Performance: <https://pixijs.com/8.x/guides/concepts/performance-tips>, <https://pixijs.com/blog/pixi-v8-launches>
- pixi-lights (nicht v8): <https://www.npmjs.com/package/pixi-lights>
- Texturgrößen Android WebGL2: <https://web3dsurvey.com/webgl2/parameters/MAX_TEXTURE_SIZE>
- Aseprite-CLI: <https://www.aseprite.org/cli/>
- Schriften: <https://managore.itch.io/m6x11>, <https://github.com/googlefonts/atkinson-hyperlegible>
