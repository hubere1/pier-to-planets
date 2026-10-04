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
