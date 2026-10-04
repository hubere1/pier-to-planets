# Dokumenten-Index – Source of Truth

Reihenfolge der Autorität bei Widersprüchen: Decision-Log > Game-Loop > Requirements > Architektur > UI/UX > Typografie & Grafik > übrige.

| Nr | Datei | Inhalt | Wann lesen |
|---|---|---|---|
| – | `../AGENTS.md` | Regeln für Agenten/Entwickler | immer zuerst |
| 01 | `01-product-brief.md` | Vision, Zielgruppe, Erfolgskriterien, Scope, Nicht-Ziele, Risiken | vor jedem Feature |
| 02 | `02-requirements.md` | Funktionale + nicht-funktionale Anforderungen, Budgets, Definition of Done | vor jedem Task |
| 03 | `03-game-loop.md` | Schleife, Formeln, Ären, Währungen, Prestige, Systeme, Zielkurve | vor Sim-/Balancing-Arbeit |
| 04 | `04-architecture.md` | Pakete, Sim-Vertrag, Takt, Renderer, Save, Plattform, Asset-Pipeline | vor Code |
| 05 | `05-ui-ux-spec.md` | Layout-Zonen, Navigation, Screens, Komponenten, Feedback, A11y, l10n | vor UI-Arbeit |
| 06 | `06-typography-pixel-art.md` | Schriften, Typo-Skala, Zahlenformat, Pixel-Raster, Paletten, Animation | vor UI- und Grafik-Arbeit |
| 07 | `07-milestones.md` | Abarbeitbare Meilensteine M0–M10 mit Exit-Kriterien | täglich |
| – | `decisions/decision-log.md` | Alle Entscheidungen D-001… | bei Zweifel |

Quelle: Owner-Plan „Pixelhafen: Vom Hafen ins All“ (04.10.2026) + Owner-Vorgaben vom selben Tag (Hochformat, Name, Werbung, HD-Pixelgrafik). Spielname: „Pier to Planets“ (D-011). Die Docs hier präzisieren ihn; wo sie abweichen, steht der Grund im Decision-Log.

## Pflege
- Jede Spielzahl im Code verweist auf einen Abschnitt in `03` (Kommentar `// spec §x.y`) oder liegt in `packages/content`.
- Werte mit **(A)** sind Annahmen. Ändert der Simulator sie, werden `03` und Decision-Log im selben Commit angepasst.
