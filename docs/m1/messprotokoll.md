# M1 – Messprotokoll Bildrate (echtes Gerät)

Exit-Kriterium M1 (`07`, `02` NFR): 60 fps, p95-Frame ≤ 20 ms auf Mittelklasse; ≥ 30 fps auf Low-End in Stufe „Sparsam“.

## Gerät und Aufbau (05.10.2026)
| | |
|---|---|
| Gerät | Samsung Galaxy A51 (SM-A515F), Owner-Gerät, Messung mit Owner-Zustimmung (D-027) |
| SoC / GPU / RAM | Exynos 9611 (2019) / Mali-G72 MP3 / 4 GB |
| System | Android 13, WebView 153.0.8010.36, Display 1080 × 2400 @ 60 Hz |
| Build | Debug-APK, Stand `a35052e` (inkl. Parallax-Kamera D-029, WebGL-Fix) |
| Bühne | 411 × 832 CSS-px, DPR 2,625 → Skalierung ×3, 360 × 728 Spiel-Pixel, ohne Sharp-Bilinear |
| Szene | Hafen, Nacht (alle Punktlichter, Leuchtturm-Kegel, Sterne), Kamera still, kein Touch |
| Zustand | am Ladekabel, Akku 91 %, Akkutemperatur 23,2 → 23,8 °C |

## Methode
1. `requestAnimationFrame`-Abstände über Chrome Remote Debugging (CDP, `adb forward … webview_devtools_remote_<pid>`),
   je Qualitätsstufe 3 s Aufwärmen + 20 s Messung, Debug-Panel geschlossen.
2. Gegenprobe Render-Seite: `adb shell dumpsys gfxinfo app.piertoplanets.game` über 15 s (Stufe „Hoch“).

## Ergebnis
| Stufe | Bilder | fps | p50 | p95 | p99 | max | > 20 ms | > 34 ms |
|---|---|---|---|---|---|---|---|---|
| Hoch | 1203 | 60,1 | 16,7 ms | 16,7 ms | 16,8 ms | 16,8 ms | 0 | 0 |
| Mittel | 1202 | 60,1 | 16,7 ms | 16,7 ms | 16,8 ms | 16,8 ms | 0 | 0 |
| Sparsam | 1202 | 60,1 | 16,7 ms | 16,7 ms | 16,8 ms | 16,8 ms | 0 | 0 |

`gfxinfo` (Hoch, 15 s): 910 Bilder, 1 Jank (0,11 %), 0 verpasste VSyncs, 0 langsame UI-Thread-Bilder,
GPU-Zeit Median 13 ms. (Die gfxinfo-Perzentile 23–25 ms sind die Pipeline-Latenz bis zur Anzeige, nicht der Bildabstand.)

## Bewertung
- **Mittelklasse-Kriterium erfüllt** – sogar auf einem Gerät unterhalb der Referenz (Snapdragon 6-Serie) in allen Stufen.
- **Reserve:** Die GPU ist in „Hoch“ zu ca. 80 % ausgelastet (13 von 16,7 ms). Neue Effekte (weitere Lichter, Ären mit
  Staubdunst) in M4/M6 jeweils hier nachmessen; die automatische Stufenwahl (`04` § Qualitätsstufen) fängt schwächere Geräte ab.
- **Low-End (2–3 GB) nicht direkt gemessen:** Kein solches Gerät verfügbar. „Sparsam“ hält auf dem A51 60 fps;
  Nachmessung auf einem Low-End-Gerät spätestens im geschlossenen Test (M9).
- **Offen:** Dauerlast über ≥ 10 min (Wärmedrosselung) – Nachmessung in M8 (Performance-Pass).
