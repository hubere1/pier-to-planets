# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach SemVer.
Android-`versionCode` steigt monoton (AGENTS Regel 9).

## [Unreleased]

### Hinzugefügt
- M0 Fundament: npm-Workspaces (`packages/sim`, `packages/content`, `app`), TypeScript strict,
  ESLint, Prettier, Vitest, Playwright.
- Prüfwerkzeuge `check:purity`, `check:l10n`, `check:palette` mit eigenen Tests; `npm run verify`
  und `tools/verify.ps1`.
- CI-Workflow (GitHub Actions, nur Linux).
- Leere App (Vite + Preact) mit DE/EN-Texten im Hochformat.
- M1 Stilprobe: Grafik-Pipeline (Palette, Generatoren, Atlas, Manifest, LUTs), HD-Pixel-Renderer mit
  quantisiertem Licht, Tag-Nacht-Wechsel, Wasser-Spiegelung, Bloom, Hafenszene, Debug-Regler, Pixeltests.
- Android-Hülle (Capacitor 8), randlos mit dunklen Systemleisten.
- M2 Simulationskern: `Num` (break_infinity), geseedeter `Rng`, `step()` mit Commands und Notices,
  Fluss mit Engpass, Kosten/Meilensteine/Kaufmenge, diskrete Fahrzeuge und Erwartungswert,
  Sterne-Prestige, Offline-Ertrag, Werbe-Belohnungen mit Tageslimits, Spielstand (Schema 1,
  SHA-256-Prüfsumme, Backup-Auswahl, Migrationen), Views für die UI.
- Inhalte Ära 1 Hafen: 7 Gebäude, Ziel-Gebäude Raumhafen-Anleger, 4 Fahrzeugstufen.
- Zahlenformat DE/EN bis 1e300 (`app/src/l10n/format.ts`).
- Balancing-Gate `npm run simulate -w packages/sim -- --policy all` mit Report `docs/balance-report.md`.
- M3 Ära 1 spielbar (Version 0.3.0, `versionCode 2`): Spielsitzung mit 10-Hz-Takt, Interpolation,
  Autosave (10 s, nach Kauf, bei Pause), Spielstand als Datei mit Backup (Capacitor Filesystem,
  Browser IndexedDB), Rückkehr-Dialog; Hafenszene nach Sim-Zustand mit allen 8 Gebäuden in je
  6 Ausbaustufen, Kutter und Frachter, Bauplätzen, Gerüst und Funken beim Meilenstein; HUD,
  Bottom Sheet mit Peek/Bauen/Ziele/Ären, Prestige-Dialog (Gedrückt-Halten), Einstellungen,
  Tutorial mit der Hafenmeisterin, Feier-Ebene, fliegende Münzen, Haptik, DE/EN ohne Neustart;
  Schriften Pier Pixel, Pier Pixel Klein, Atkinson Hyperlegible Next; UI-Rahmen und Symbole.

### Geändert
- Erstes Boot nach Spielstart und Neustart bringt die 3-fache Ladung; das Gate misst den Einstieg
  über 100 Installationen (D-040). Kamera-Schwenk ±120 Spiel-Pixel (D-037).
