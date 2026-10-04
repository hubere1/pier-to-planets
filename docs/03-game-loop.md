# 03 – Game Loop und Spielregeln (verbindlich)

Werte mit **(A)** sind Annahmen; der Simulator darf sie um ±30 % ändern (Decision-Log-Eintrag). Alle Inhaltswerte liegen als Daten in `packages/content`, Formeln in `packages/sim`. Geld ist `Num` (D-005).

## 0. Leitidee und Spielertypen
**Ziel:** vom Fischersteg zum Asteroidenbergbau; die Szene wächst mit jedem Kauf.
| Typ | Was ihn hält | System |
|---|---|---|
| Sammler | volle Szene, alle Stufen, Erfolge | Gebäude-Meilensteine §3, Erfolge §8 |
| Optimierer | Engpass beheben, bester Kauf pro Taler | Engpass §2, Kaufmenge ×Max |
| Entdecker | neue Ära, neue Fahrzeuge, neue Mechanik | Ären §5 |
| Kurzspieler | 1–5 Minuten, Offline-Ertrag | Offline §7, tägliche Aufträge |
| Langzeitspieler | Prestige, Personal, Forschung | §4, §6 |

## 1. Die Schleife (in jeder Ära gleich)
```
 Fahrzeug kommt an ──► Waren entladen ──► Waren verkaufen ──► Geld
        ▲          (Tippen → Kran)                              │
        └──── mehr/größere Fahrzeuge ◄── Gebäude & Upgrades ◄───┘
```
Zeit: 1 s real = 1 s Spiel. Sim-Takt 10 Hz (`dt = 0,1 s`), deterministisch, Zufall aus geseedetem `Rng` im State. Commands verbrauchen keine Zeit.

## 2. Wirtschaft je Ära (Fluss mit Engpass)
Drei Stufen bilden eine Kette; die schwächste begrenzt den Fluss. Das macht „was kaufe ich als Nächstes?“ lesbar.
| Stufe | Größe | Treiber (Ära 1) |
|---|---|---|
| Ankunft `A` | Waren/s, die ankommen = Ankunftsrate λ · Ladung je Fahrzeug | Steg (Liegeplätze), Leuchtturm (λ), Werft (Fahrzeugstufe) |
| Entladen `E` | Waren/s, die entladen werden können | Tippen, Kran |
| Absatz `V` | Waren/s, die verkauft werden können | Lagerhalle (Puffer), Fischmarkt/Zoll (Absatz) |
- **Fluss** `F = min(A, E, V)`; **Einnahmen/s** `= F · Preis · Mult`.
- `Mult = (1 + 0,10 · Sterne) · Forschung · Personal · Lieferkette · Event · Werbe-Boost` (alle (A)); Boni addieren innerhalb ihrer Gruppe, Gruppen multiplizieren. Event und Werbe-Boost gleiten in 2 s ein und aus.
- **Engpass** = `argmin(A, E, V)`; die Sim liefert `bottleneck()` mit Gebäude-ID und „+X %/s, wenn eine Stufe gekauft wird“ (Wirkungsvorschau aus der Sim).
- **Aktive Darstellung:** Fahrzeuge sind diskrete Objekte (Ankunft per Poisson aus `Rng`, Ladung, Entladefortschritt). **Offline und Sim-Skript** nutzen dieselbe Rate `F` als Erwartungswert (§7). Test: Mittel über 1 h aktiv = Rate ±2 %.
- **Tippen:** jeder Tipp auf ein liegendes Fahrzeug entlädt `tapAmount` (A: 5 % der Ladung, min. 1 Ware). Ab Kran Stufe 1 entlädt der Kran automatisch; Tippen gibt dann +1 % Bonus-Ertrag des Fahrzeugs (nie Pflicht). Alternative ohne Szene: Knopf „Entladen“ (A11y).

## 3. Gebäude
- Kosten Stufe n → n+1: `basis_g · wachstum_g^n`, `wachstum_g` ∈ [1,07; 1,15] (A), je Gebäude in `content`.
- Wirkung je Stufe: linear `+wirkung_g` auf seine Stufe der Kette (§2).
- **Meilensteine** bei Stufe 10 / 25 / 50 / 100 / 200 / 300 …: Wirkung ×2 (A) **und** sichtbarer Umbau in der Szene (z. B. Lagerhalle: 2. Stockwerk bei 10, Rolltor bei 25, Kran auf dem Dach bei 50). Der Fortschrittsbalken zeigt den nächsten Meilenstein, nicht die nächste Stufe.
- **Kaufmenge** ×1 / ×10 / ×Max: Gesamtkosten geometrisch summiert (`costFor(n)`), ×Max = größtes n mit Deckung.
- Gesperrte Gebäude sind als Silhouette in der Szene sichtbar, mit Bedingung.

## 4. Prestige (zwei Ebenen)
### 4.1 Neustart einer Ära → Sterne
- `SterneMöglich(Ära) = floor( 10 · (Lebenseinnahmen_Ära / Schwelle_Ära)^0,5 )` (A); beim Neustart erhält man `SterneMöglich − bereits erhaltene`.
- Neustart setzt Geld, Gebäude und Fahrzeuge **dieser Ära** zurück; Sterne, Forschung, Personal, Kristalle, Erfolge bleiben.
- Jeder Stern: +10 % Einnahmen in **allen** Ären (A), additiv.
- Vorschau aus der Sim: „+N Sterne · +X % Einnahmen · nächster Durchlauf ca. Y-mal schneller“. Hinweis „Neustart lohnt sich“ erst ab `N ≥ max(1; 0,5 · Sterne)` (A), nie als Druck.
### 4.2 Aufbruch in die nächste Ära
- Jede Ära hat ein **Ziel-Gebäude** (Kosten in `content`, so gesetzt, dass die Neustarts aus §9 nötig sind). Fertig = nächste Ära frei, Feier-Moment, Kamera fliegt zur neuen Szene.
- Wechsel zwischen Ären jederzeit über die Ären-Karte. **Jede Ära hat ihre eigene Währung** (Taler, Dollar, Credits, Mond-Credits, Mars-Rubel, Platin-Credits) (D-006).
- **Lieferkette:** Jede abgeschlossene Ära läuft weiter und gibt der jeweils nächsten Ära einen thematischen Bonus: `1 + 0,25 · log10(1 + Einnahmen/s_alt / Referenz_alt)` (A, gedeckelt bei ×3). Beispiele: Hafen → Treibstoff für Raketen, Flughafen → Ingenieure für die Montagehalle.

## 5. Die sechs Ären
Jede Ära: ~8 Gebäude, 3–4 Fahrzeugstufen, eigene Waren, eine eigene Mechanik, ein Ziel-Gebäude. Zahlenbasis je Ära ×1e6 gegenüber der vorigen (A).
| # | Ära | Fahrzeuge | Waren | Gebäude (Ziel fett) | Eigene Mechanik |
|---|---|---|---|---|---|
| 1 | Hafen | Fischerboot, Kutter, Frachter, Containerschiff | Fisch, Kisten, Container | Steg, Kran, Lagerhalle, Fischmarkt, Leuchtturm, Werft, Zollhaus, **Raumhafen-Anleger** | Tippen entlädt, bis Kräne übernehmen |
| 2 | Flughafen | Propellermaschine, Jet, Jumbo | Passagiere, Fracht, Post | Landebahn, Terminal, Tower, Hangar, Gepäckband, Frachtzentrum, Radar, **Raumfahrt-Terminal** | Wetter: Nebel −30 %, Sturm −50 % Ankunft (A), Radar senkt den Abzug; gleitet ein |
| 3 | Raketenstartplatz | Kleinrakete, Schwerlastrakete, Booster (wiederverwendbar) | Satelliten, Versorgungskapseln | Startrampe, Montagehalle, Treibstofftank, Kontrollzentrum, Landezone, Radarschüssel, Besucherzentrum, **Orbitalstation** | Startfenster: Countdown, Tippen im grünen Fenster +50 % für diesen Start (A); Kontrollzentrum ab Stufe 25 startet automatisch mit „gut“ (+20 %) |
| 4 | Mondbasis | Mondfähre, Rover, Frachtlander | Mondgestein, Helium-3, Wasser-Eis | Wohnmodul, Bohrturm, Solarfeld, Landeplatz, Sauerstoffwerk, Labor, Silo, **Massenbeschleuniger** | Sauerstoff als Grenze: Gebäude brauchen O₂-Kapazität; Balken „O₂ 82 / 100“ |
| 5 | Mars-Kolonie | Kolonieschiff, Staubgleiter, Frachtshuttle | Kolonisten, Nahrung, Bauteile | Kuppel, Gewächshaus, Fabrik, Raumhafen, Wasseraufbereitung, Wohnturm, Werkstatt, **Sprungtor-Fundament** | Bevölkerung: Kolonisten kommen mit Schiffen, arbeiten automatisch in Gebäuden; Effizienz = Arbeiter/Bedarf |
| 6 | Asteroidengürtel | Bergbauschiff, Schleppdrohne, Mutterschiff | Platin, Eis, exotische Erze | Raffinerie, Sprungtor, Raumwerft, Station, Erzsilo, Drohnenhangar, Scanner, Handelsposten | **Endlos:** Feld n erschöpft sich nach Menge `M_n`; Sprung zu Feld n+1 mit Werten ×1,5 (A) und neuer Optik (Farbe, Gesteinsform) |
- Die Mechaniken gehen offline als Erwartungswert in `F` ein (Wetter: mittlerer Abzug; Startfenster: „gut“ nur mit Kontrollzentrum, sonst „normal“). Perfektes Timing ist Bonus, nie Bedingung für die Zielkurve.

## 6. Systeme
| System | Regeln |
|---|---|
| **Personal** | Kapitäne (Hafen), Piloten (Flughafen), Astronauten (ab Ära 3). Je Person ein Bonus (z. B. „+15 % Entladen im Hafen“). Erwerb: **tägliches Angebot von 3 bekannten Personen** zu festem Kristallpreis + fest an Erfolge gebunden. Aufwerten mit Kristallen (Stufe 1–10, +Bonus je Stufe). Keine Zufallsziehungen, keine Duplikate (D-007). Max. 1 Person je Gebäude-Slot. |
| **Forschungsbaum** | Forschungspunkte aus Meilensteinen (§3) und Erfolgen. ~40 Knoten in 4 Ästen: Logistik (Tempo), Handel (Preis), Automatik (Offline 4 → 8 → 12 → 24 h, Offline-Effizienz 50 → 100 %), Technik (Ära-Mechaniken). Gilt für alle Ären. |
| **Kristalle** | Aus Erfolgen, täglichen Aufträgen, seltenen Events, Werbung (begrenzt, §10). Nicht käuflich (D-010). Ausgaben: Personal, Zeitsprung (1 h Ertrag sofort, Preis steigt je Tag), Forschung beschleunigen. |
| **Erfolge** | Feste Ziele je Ära und global („1.000 Schiffe abgefertigt“, „Leuchtturm Stufe 100“), je mit Kristallen und ggf. Forschungspunkten. ~120 Erfolge. |
| **Events** | Ära-spezifisch: Sturm (Ankunft −, Preise +), VIP-Kreuzfahrtschiff (tippen = 5 Min Ertrag), Meteorschauer (Erz-Bonus), Sonnenwind … Nur aktiv, 1 Event je 8–15 Min (A), Cooldown, deterministisch, gleiten ein/aus. |
| **Tägliche Aufträge** | 3 pro Tag aus einem Pool („Kaufe 20 Stufen im Hafen“, „Fertige 50 Jets ab“), Reset lokale Mitternacht, 1 kostenloser Austausch/Tag. Belohnung: Kristalle. Verpasste Tage verfallen ohne Strafe. |

## 7. Offline
- Rückkehr nach ≥ 60 s Abwesenheit: Ertrag = `F_alle Ären · Mult(ohne Event/Werbe-Boost) · Effizienz · min(Abwesenheit, Deckel)`.
- Deckel 4 h → per Forschung 8/12/24 h; Effizienz 50 % → per Forschung 100 % (A). Uhr rückwärts = 0; Sprung > 30 Tage = Deckel.
- Offline-Ereignisse (Meilensteine durch Auto-Käufe gibt es nicht, aber Erfolge durch Abfertigungs-Zähler, Aufträge) gehen als Notices an den Rückkehr-Dialog und den Feed (Lehre 3).
- Rückkehr-Dialog: Ertrag, Zeit, Deckel-Hinweis („Forschung verlängert auf 8 h“), optional „×2 per Werbung“ (§10).

## 8. Erste 10 Minuten (Tutorial)
| Zeit | Moment | Erlebnis |
|---|---|---|
| 0:00 | Morgendämmerung, ein Fischerboot legt an | Coach: „Tippe auf das Boot“ |
| 0:20 | Erste Taler fliegen ins HUD | Coach: „Kauf den Steg“ (Stufe 2) |
| 0:45 | zweites Boot, Steg wächst | Kaufmenge-Schalter erklärt |
| 2:00 | Kran wird bezahlbar | Kran entlädt automatisch, Tippen wird Bonus |
| 4:00 | Engpass-Hinweis zeigt Lagerhalle | Engpass-Konzept erklärt |
| 6:00 | Lagerhalle Stufe 10: zweites Stockwerk | erster Meilenstein-Umbau (Feier) |
| 8:00 | Leuchtturm frei, Nacht bricht an | Licht-Moment: Leuchtturm erhellt die Bucht |
| 10:00 | Ziele-Tab zeigt Raumhafen-Anleger als Silhouette | Fernziel gesetzt, Tutorial endet |
Tutorial überspringbar ab Schritt 2, keine Werbung und keine Events während des Tutorials.

## 9. Zielkurve (Balancing-Gate)
Spieler-Policy `casual`: 4 Sessions/Tag à 3 Min, kauft immer den besten Engpass-Kauf, Neustart bei Hinweis, ohne Werbung.
| Ära | Ziel-Dauer | Neustarts | Erreicht nach etwa |
|---|---|---|---|
| 1 Hafen | 1–2 Tage | 1–2 | Tag 2 |
| 2 Flughafen | 3 Tage | 2–3 | Tag 5 |
| 3 Raketenstartplatz | 5 Tage | 3–4 | Tag 10 |
| 4 Mondbasis | 6 Tage | 4–5 | Tag 16 |
| 5 Mars-Kolonie | 8 Tage | 5–6 | Tag 24 |
| 6 Asteroidengürtel | endlos | beliebig | alle Erfolge Woche 4–6 |
Weitere Policies: `active` (8 Sessions/Tag, tippt), `idle` (2 Sessions/Tag), `ads` (wie casual + alle Werbe-Boni). Abnahme: `casual` ±30 %, `idle` erreicht Ära 6 ≤ Tag 45, `ads` höchstens 25 % schneller als `casual`, keine Sackgasse (jede Policy schreitet in jeder 24-h-Spanne voran).

## 10. Werbung (Monetarisierung, D-010)
Nur **Rewarded Ads**, freiwillig, Kachel mit Aufschrift „Werbung“, nie Primärknopf, nie im Tutorial, nie vor einer Entscheidung.
| Platzierung | Belohnung (A) | Limit |
|---|---|---|
| Rückkehr-Dialog | Offline-Ertrag ×2 | 1 je Rückkehr |
| Boost-Kachel im HUD | Einnahmen ×2 für 30 Min, stapelt bis 4 h Restzeit | 6/Tag |
| VIP-Event | Event-Belohnung ×3 | je Event |
| Tägliche Aufträge | +1 zusätzlicher Austausch | 1/Tag |
| Kristall-Kiste | 5 Kristalle | 3/Tag |
Laufender Boost sperrt die Kachel nicht, zeigt aber die Restzeit; bei voller Restzeit ist sie gesperrt mit Grund. Keine Ad-Belohnung ohne `onUserEarnedReward`.
