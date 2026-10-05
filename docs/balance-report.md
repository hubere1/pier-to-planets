# Balance-Report – Ära 1 Hafen

Erzeugt mit `npm run simulate -w packages/sim -- --policy all --report` (docs/03 §9, D-013).
Nicht von Hand bearbeiten. Zeiten in Tagen ab der ersten Sitzung; je Policy
8 Läufe mit unterschiedlicher Installationszeit und um ±45 Min gestreuten Sitzungen (D-035).

## Ergebnis

| Policy | Sitzungen/Tag | Ziel-Gebäude (Mittel) | Spanne | Neustarts (Mittel) | Sterne am Ziel |
|---|---|---|---|---|---|
| casual | 4 | Tag 2.00 | 1.95–2.02 | 1.00 | 14–16 |
| active | 8 | Tag 1.56 | 1.35–1.77 | 2.13 | 24–55 |
| idle | 2 | Tag 4.00 | 3.95–4.03 | 1.00 | 16–16 |
| ads | 4 | Tag 1.66 | 1.35–1.85 | 1.88 | 10–68 |

Einstieg (diskret, 3 Tipps/s): erster Kauf nach **43.8 s**, Kran nach **43.8 s**.

## Prüfungen

- ✔ **casual Zielkurve (§9):** Ziel-Gebäude im Mittel Tag 2.00, Soll 1.4–2.6
- ✔ **casual Neustarts (§9):** im Mittel 1.00, Soll 1–2
- ✔ **Werbung ≤ 25 % schneller (FR-M05):** 16.9 % schneller als casual
- ✔ **casual erreicht das Ziel:** 8/8 Läufe, im Mittel Tag 2.00
- ✔ **casual ohne Sackgasse:** jeder Tag mit Fortschritt
- ✔ **active erreicht das Ziel:** 8/8 Läufe, im Mittel Tag 1.56
- ✔ **active ohne Sackgasse:** jeder Tag mit Fortschritt
- ✔ **idle erreicht das Ziel:** 8/8 Läufe, im Mittel Tag 4.00
- ✔ **idle ohne Sackgasse:** jeder Tag mit Fortschritt
- ✔ **ads erreicht das Ziel:** 8/8 Läufe, im Mittel Tag 1.66
- ✔ **ads ohne Sackgasse:** jeder Tag mit Fortschritt
- ✔ **erster Kauf ≤ 60 s (FR-K02):** 43.8 s
- ✔ **Kran ≤ 5 Min (M3-Exit):** 43.8 s
- ✔ **Determinismus (NFR-Q07):** zwei Läufe identisch

## Annahmen dieses Laufs

- Sterne-Schwelle 4.0e+6, Ziel-Gebäude 7.0e+8 Taler
- Neustart-Hinweis ab max(10; 0.5 · Sterne) neuen Sternen (D-031)
- Werbung: Boost 6/Tag, Offline ×2 1/Tag (D-034)
- Policies: casual 4 × 3 Min (8:00, 12:30, 18:00, 21:30), active 8 × 3 Min + Tippen, idle 2 × 3 Min, ads = casual + Werbung

## Verlauf je Tag (Lauf 1 je Policy)

### casual

Neustarts: Tag 0.43 (+16 Sterne); Ziel: Tag 2.00

| Tag | Lebenseinnahmen | Sterne | Einnahmen/s | Stufen |
|---|---|---|---|---|
| 1.00 | 1.87e+8 | 16 | 2.32e+4 | pier 46, crane 93, warehouse 61, fishMarket 35, lighthouse 12, shipyard 20, customs 31 |
| 2.00 | 8.70e+8 | 16 | 2.32e+4 | pier 46, crane 93, warehouse 61, fishMarket 35, lighthouse 12, shipyard 20, customs 31 |
| 2.01 | 8.81e+8 | 16 | 6.09e+4 | pier 50, crane 122, warehouse 78, fishMarket 57, lighthouse 13, shipyard 23, customs 50 |

### active

Neustarts: Tag 0.18 (+10 Sterne), Tag 0.34 (+24 Sterne); Ziel: Tag 1.38

| Tag | Lebenseinnahmen | Sterne | Einnahmen/s | Stufen |
|---|---|---|---|---|
| 1.00 | 4.14e+8 | 34 | 2.28e+4 | pier 44, crane 54, warehouse 61, fishMarket 35, lighthouse 10, shipyard 18, customs 25 |
| 1.39 | 8.15e+8 | 34 | 9.55e+4 | pier 50, crane 113, warehouse 78, fishMarket 57, lighthouse 13, shipyard 23, customs 50 |

### idle

Neustarts: Tag 1.01 (+16 Sterne); Ziel: Tag 4.00

| Tag | Lebenseinnahmen | Sterne | Einnahmen/s | Stufen |
|---|---|---|---|---|
| 1.00 | 1.09e+7 | 0 | 1.49e+3 | pier 44, crane 31, warehouse 57, fishMarket 30, lighthouse 10, shipyard 5, customs 0 |
| 2.00 | 1.88e+8 | 16 | 2.32e+4 | pier 46, crane 93, warehouse 61, fishMarket 35, lighthouse 12, shipyard 20, customs 31 |
| 3.00 | 7.02e+8 | 16 | 2.32e+4 | pier 46, crane 93, warehouse 61, fishMarket 35, lighthouse 12, shipyard 20, customs 31 |
| 4.00 | 8.73e+8 | 16 | 2.32e+4 | pier 46, crane 93, warehouse 61, fishMarket 35, lighthouse 12, shipyard 20, customs 31 |
| 4.01 | 8.84e+8 | 16 | 6.09e+4 | pier 50, crane 122, warehouse 78, fishMarket 57, lighthouse 13, shipyard 23, customs 50 |

### ads

Neustarts: Tag 0.20 (+10 Sterne), Tag 0.59 (+45 Sterne); Ziel: Tag 1.41

| Tag | Lebenseinnahmen | Sterne | Einnahmen/s | Stufen |
|---|---|---|---|---|
| 1.00 | 3.04e+8 | 55 | 2.44e+4 | pier 44, crane 50, warehouse 57, fishMarket 29, lighthouse 8, shipyard 18, customs 19 |
| 1.42 | 8.97e+8 | 55 | 1.41e+5 | pier 50, crane 113, warehouse 78, fishMarket 57, lighthouse 13, shipyard 23, customs 50 |
