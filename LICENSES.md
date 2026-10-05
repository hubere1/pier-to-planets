# Lizenzen Dritter

Wird bei jeder neuen Abhängigkeit, Schrift oder Grafik ergänzt. In der App unter
Einstellungen → Lizenzen angezeigt (docs/05).

## Schriften (D-019, D-022, D-025)
| Schrift | Autor | Lizenz | Pflicht | Status |
|---|---|---|---|---|
| m6x11plus (als „Pier Pixel“ mit eigenen Ergänzungen) | Daniel Linssen (managore) | frei mit Namensnennung | Namensnennung in Credits | gebündelt seit M3: `app/src/ui/fonts/pier-pixel.woff2`, Nennung in Einstellungen → Lizenzen |
| Pier Pixel Klein, Ergänzungen in Pier Pixel (NBSP, U+202F, ·, €) | eigenes Werk | proprietär (LICENSE) | – | gebündelt seit M3 (D-022, D-025, D-041) |
| Atkinson Hyperlegible Next | The Atkinson Hyperlegible Next Project Authors (Braille Institute) | SIL OFL 1.1 | Lizenztext mitliefern | gebündelt seit M3 (Teilmenge Latein, WOFF2); Lizenztext `app/src/ui/fonts/OFL-Atkinson.txt`, in der App unter Einstellungen → Lizenzen |

## Laufzeit-Bibliotheken (im App-Bundle)
| Paket | Lizenz |
|---|---|
| preact | MIT |
| @preact/signals | MIT |
| pixi.js | MIT |
| break_infinity.js | MIT |
| @capacitor/core, /app, /filesystem, /preferences, /haptics, /android | MIT |

Folgt mit M8: @capacitor-community/admob (MIT).

## Entwicklungswerkzeuge (nicht im Bundle)
TypeScript (Apache-2.0), Vite (MIT), Vitest (MIT), Playwright (Apache-2.0), ESLint (MIT),
typescript-eslint (MIT), Prettier (MIT), tsx (MIT), pngjs (MIT). Schrift-Werkzeug (einmalig lokal,
D-041): fontTools (MIT), brotli (MIT).
