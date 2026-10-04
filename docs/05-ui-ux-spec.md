# 05 – UI/UX-Spec

Ziel: Die Szene ist der Star, die UI ist ein ruhiger Rahmen darum. Max. 8 Zahlen gleichzeitig sichtbar. **Nur Hochformat** (D-002, Owner 04.10.2026: „ganz wichtig“), Orientierung in Android gesperrt.

## Layout-Zonen
```
┌──────────────────────────┐  Safe-Area oben
│ HUD: Geld · /s · ★ · ◆ ⚙ │  ≤ 56 dp, halbtransparente Pixel-Leiste
│                          │
│                          │
│        SZENE             │  Vollbild, Spiel-Pixel ganzzahlig skaliert
│   (tippbar: Fahrzeuge,   │  Kamera schwenkt, damit das gewählte
│    Gebäude, Events)      │  Gebäude über dem Panel sichtbar bleibt
│                          │
│ [Boost: Werbung]  [Ziel] │  schwebende Kacheln, nie über Fahrzeugen
├──────────────────────────┤
│ Panel (Bottom Sheet)     │  3 Höhen: Peek 96 dp · Halb 45 % · Voll
│  Peek: nächster bester   │  Peek zeigt immer „Engpass: Lagerhalle
│  Kauf + Kaufmenge        │  · 1,2 K Taler · +18 %/s“
├──────────────────────────┤
│ ⚓ Bauen  👤 Personal  🔬 Forschung  🏆 Ziele  🗺 Ären │  Navigation 64 dp
└──────────────────────────┘  Safe-Area unten (Gestenleiste)
```
- Die Szene läuft unter allen Panels weiter; bei Panel „Voll“ wird sie abgedunkelt und auf 30 fps gedrosselt.
- Scene-Höhe variabel (640–800 Spiel-Pixel, `06` §2): Kern-Komposition (Gebäude, Fahrwege) liegt im mittleren 640er-Band, oben Himmel, unten Wasser/Boden als Verlängerung.

## Design-Tokens (UI, dunkel, warm; in M1 Kontrast messen)
| Token | Wert | Rolle |
|---|---|---|
| bg | `#14161C` | App-Grund hinter der Szene |
| panel | `#1D2129` | Sheets, Karten |
| panelHigh | `#272C37` | aktive Karte, Dialoge |
| line | `#3A4150` | 1-Spiel-Pixel-Rahmen |
| text | `#F3EEE2` | warmes Weiß |
| textMuted | `#A9ABB6` | Sekundärtext |
| positive | `#7BD86F` | Zuwachs, bezahlbar |
| risk | `#FF6B6B` | nicht bezahlbar, Fehler |
| warning | `#FFB13D` | Warnung, Engpass |
| star | `#FFD95A` | Sterne |
| crystal | `#7FE3F0` | Kristalle |
| accent | je Ära (Tabelle unten) | Primär-Aktion, Auswahl |

| Ära | accent | Stimmung |
|---|---|---|
| Hafen | `#F2B544` Messing | warm, Abendsonne |
| Flughafen | `#5CC8FF` Himmelblau | klar, luftig |
| Raketenstartplatz | `#FF7A3D` Triebwerk-Orange | Hitze, Spannung |
| Mondbasis | `#C9D1E0` Mondsilber | kühl, still |
| Mars-Kolonie | `#E0603A` Rost | staubig, warm |
| Asteroidengürtel | `#B48CFF` Erz-Violett | fremd, funkelnd |
- Alle Farben nur über Tokens (CSS-Variablen). Ära-Wechsel tauscht `--accent` mit 400 ms Überblendung.
- UI-Rahmen im Pixel-Stil: 9-Slice-Panels aus dem Atlas, Kantenbreite = 1 Spiel-Pixel (= `s` Gerätepixel, `06` §3). Ecken 2 Spiel-Pixel abgeschrägt, keine weichen Radien.
- Raster 8 dp, Seitenrand 16 dp, Touch-Ziele ≥ 48 dp.

## Navigation (5 Tabs + HUD)
1. **Bauen** – Gebäude der aktuellen Ära (Standard-Tab).
2. **Personal** – angestellte Personen, tägliches Angebot.
3. **Forschung** – Baum mit 4 Ästen.
4. **Ziele** – Segmente: Aufträge · Erfolge · Ära-Ziel.
5. **Ären** – Karte aller Ären (Raumkarte von der Küste bis zum Gürtel), Wechsel, Prestige.
HUD: Geld der aktuellen Ära, Einnahmen/s, Sterne, Kristalle, Zahnrad. Tap auf Tab öffnet das Panel auf „Halb“; erneuter Tap schließt auf „Peek“.

## Screens
### Szene (immer)
- Tippbar: Fahrzeuge (Entladen), Gebäude (öffnet dessen Karte im Panel, Kamera schwenkt), Events (VIP-Schiff, Meteorit).
- Fliegende Münzen vom Fahrzeug ins HUD (max. 12 gleichzeitig, sammeln sich zu größeren Münzen), Zahl „+42“ in Pixel-Schrift steigt auf.
- Engpass-Gebäude trägt ein kleines pulsierendes Warn-Symbol (Symbol + Farbe, nie nur Farbe).
- Gesperrte Gebäude: Bauplatz mit Silhouette, Schild mit Bedingung.
### Bauen
- Karte je Gebäude: Icon (Szenen-Ausschnitt), Name, Stufe, Fortschritt zum nächsten Meilenstein („Stufe 23 · nächster Umbau bei 25“), Wirkung jetzt → nach Kauf, Kaufknopf mit Kosten.
- Kaufmenge-Schalter ×1 / ×10 / ×Max oben im Panel (bleibt gespeichert).
- Nicht bezahlbar: Knopf zeigt „Es fehlen 1,2 K“ statt grau.
- Oben angeheftet: Ziel-Gebäude der Ära mit Fortschritt.
### Personal
Karten: Porträt (Pixel, 32 × 32 Spiel-Pixel), Name, Rolle, Bonus in Klartext („+15 % Entladen im Hafen“), Stufe, Aufwerten (Kristallpreis). Tagesangebot: 3 Karten mit fester Restzeit bis Mitternacht, keine Zufallsanimation.
### Forschung
Baum als vertikale Äste (scrollbar, keine Lazy-Liste wegen Tutorial-Zielen), Knoten mit Status (gesperrt/verfügbar/fertig – Symbol + Text), Tap → Sheet mit Wirkung in Klartext und Kosten.
### Ziele
Aufträge (3 Karten, Fortschritt, Abholen, Austauschen), Erfolge (gruppiert je Ära, gesperrt sichtbar), Ära-Ziel (Ziel-Gebäude + Neustart-Vorschau).
### Ären
Vertikale Karte von unten (Hafen) nach oben (Gürtel); jede Ära als Mini-Szene mit Status, Einnahmen/s, Lieferketten-Bonus. Knöpfe „Hinreisen“ und „Neustart (+N ★)“.
### Prestige-Dialog
Vollbild-Sheet: „+N Sterne · +X % Einnahmen überall“, was zurückgesetzt wird (Geld, Gebäude dieser Ära) und was bleibt (Sterne, Forschung, Personal, Kristalle). Bestätigen per Gedrückt-Halten (1 s), nicht Doppel-Dialog. Danach: Szene „baut zurück“ in einer kurzen Animation, Sterne fliegen ins HUD.
### Rückkehr-Dialog
„Willkommen zurück – 3 h 12 min“, Ertrag je Ära, Ereignisse (Erfolge, Aufträge), Deckel-Hinweis. Knöpfe: „Einsammeln“ (Primär) · „×2 mit Werbung“ (sekundär, mit Werbe-Symbol).
### Einstellungen
Sprache (System/DE/EN), Grafikqualität (Auto/Hoch/Mittel/Sparsam), Bildrate (60/30), Animationen reduzieren, Haptik, Sound, Zahlenformat (Kurz/Wissenschaftlich), Werbe-Einwilligung ändern, Datenschutz, Impressum, Tutorial wiederholen, Spielstand exportieren (Datei teilen), Spielstand zurücksetzen (archiviert, Doppelbestätigung), Fehlerbericht kopieren, Version, Lizenzen (Schriften, Bibliotheken).

## Feedback und „Saft“
| Ereignis | Szene | UI | Haptik |
|---|---|---|---|
| Kauf | Gebäude hüpft 1 Spiel-Pixel, Staubwolke | Zahl zählt hoch | leicht |
| Meilenstein-Umbau | Gerüst 0,8 s → neuer Zustand, Funken | Banner „Lagerhalle: 2. Stockwerk“ | mittel |
| Neues Fahrzeug | erste Ankunft mit Kamera-Schwenk (abschaltbar) | Toast | leicht |
| Ziel-Gebäude | Bühne: Nacht-Feuerwerk, Kamera-Flug zur neuen Ära | Vollbild-Feier | stark |
| Event | Wetter/Effekt gleitet ein | Banner mit Restzeit | – |
Regel: eine Botschaft zur Zeit (Warteschlange, max. 3); nie über Dialogen; im Tutorial nur Banner.

## Tutorial
Siehe `03` §8. Coach-Mark = pixeliger Rahmen um das Ziel (Szene oder UI) + Sprechblase von der Hafenmeisterin (Porträt). Text max. 2 kurze Sätze. Überspringbar ab Schritt 2, wiederholbar.

## Werbung in der UI (`03` §10)
- Kachel mit Werbe-Symbol und Text „Werbung ansehen: ×2 Einnahmen 30 Min“; Restlimit sichtbar („4/6 heute“).
- Nie Primärknopf, nie im Tutorial, nie über Prestige-/Rückkehr-Entscheidung gestellt (im Rückkehr-Dialog sekundär).
- Fehler ehrlich: „Werbung lädt noch“ / „Ohne Einwilligung keine Werbung“ / „Tageslimit erreicht – morgen wieder“.

## Barrierefreiheit
- UI im DOM: echte Buttons, ARIA-Labels, logische Fokus-Reihenfolge; Android-TalkBack über WebView.
- Szene: unsichtbare Live-Region fasst zusammen („3 Schiffe am Steg, Engpass Lagerhalle“); alle Szenen-Aktionen haben UI-Gegenstücke (Entladen-Knopf, Gebäude-Liste).
- Schrift bis 200 % (`06` §4), Status nie nur über Farbe, Blinken ≤ 3 Hz, „Animationen reduzieren“ (`02` NFR-Q03).

## Lokalisierung
- `de.json` (Quelle), `en.json`; ICU-Platzhalter; `check-l10n` prüft Parität und Platzhalter.
- Zahlenformat über `l10n/format.ts` (`06` §5). Ära-Währungen als Schlüssel (`currency.harbor` = Taler / Thaler).
- EN-Texte KI-gestützt, Owner liest gegen.

## Leere/Fehler-Zustände
Jeder Screen definiert Leer-, Lade-, Fehlerzustand: Personal leer → „Dein erster Kapitän wartet im Tagesangebot“; Forschung ohne Punkte → „Forschungspunkte gibt es für Meilensteine“. Zentrierte Hinweise scrollbar (Lehre 11).

## Ton
Freundlich, knapp, **du**. Keine künstliche Dringlichkeit, kein „Nur noch heute!“.
