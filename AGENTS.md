# AGENTS.md – Pier to Planets

Verbindliche Arbeitsanweisung für alle KI-Agenten und Entwickler in diesem Repo.
Source of Truth ist `docs/` (Index: `docs/00-index.md`). Bei Widerspruch gewinnt: `docs/decisions/decision-log.md` > `docs/03-game-loop.md` > übrige Docs > Code-Kommentare.

## 1. Projekt in einem Absatz
Pier to Planets (DE-Untertitel „Vom Hafen ins All“, D-011) ist ein Idle-Aufbauspiel für Android im Hochformat: vom Fischerhafen über sechs Ären bis zum Bergbau im Asteroidengürtel. Rund 4–6 Wochen bis zur letzten Ära, danach Endlos-Inhalt. Web-Spiel (TypeScript + PixiJS), mit Capacitor als Android-App verpackt. Kein Backend, keine laufenden Kosten, Einnahmen nur über freiwillige Rewarded Ads (D-010). Hochauflösende Pixelgrafik (360 × 640, ganzzahlig skaliert), Tag-Nacht-Wechsel, sichtbares Wachstum.

## 2. Arbeitsregeln
1. **Doku vor Code.** Vor jedem Meilenstein den Abschnitt in `docs/07-milestones.md` lesen. Abweichung → erst Doku + Decision-Log, dann Code.
2. **Nicht raten, nicht fragen, wenn entscheidbar.** Aus den Docs entscheidbar → entscheiden. Sonst beste Lösung nach Produktprinzipien (§3), als `D-xxx` festhalten, weiterarbeiten. Nur bei Irreversiblem (Store-Einreichung, Signing-Key, Geld, Name, Löschen von Daten) den Owner fragen.
3. **TDD für Verhalten.** Simulation zuerst roter Test, dann grün, dann Refactor. Bugfix: zuerst Regressionstest.
4. **Simulation bleibt rein.** `packages/sim` importiert kein PixiJS, kein DOM, kein Capacitor; kein `Date.now()`, kein `Math.random()`, kein `performance.now()`. Zeit und Zufall kommen als Parameter. `tools/check-purity.ts` prüft das in CI.
5. **Große Zahlen nur über `Num`.** Geld, Preise, Kosten laufen über den Wrapper `packages/sim/src/num/` (intern break_infinity, D-005). Nie `number` für Spielwährung, nie direkt die Bibliothek importieren.
6. **Renderer entscheidet nichts.** PixiJS zeigt den Sim-Zustand an und interpoliert Bewegung. Spielrelevante Ereignisse (Ankunft, Entladung, Verkauf) entstehen nur in der Sim.
7. **Keine Logik in UI-Komponenten.** UI sendet Commands, liest abgeleitete Views aus der Sim.
8. **Keine Backend-Abhängigkeit.** Jeder Dienst mit laufenden Kosten, Account- oder Netzpflicht ist verboten, außer der Owner genehmigt ihn im Decision-Log.
9. **Spielstände überleben jedes Update – ab dem ersten Tester-Build.** Laden ist tolerant (fehlende Felder → Startwert). Jede Schema-Änderung: `saveSchemaVersion` +1, Migration in `packages/sim/src/save/migrate.ts`, Fixture mit echtem Alt-Save in `packages/sim/test/fixtures/` + Test. „Neu starten“ archiviert, löscht nie. `versionCode` monoton steigend, Update drüber installieren, nie deinstallieren.
10. **Evidenz vor Fertig-Meldung.** Fertig erst, wenn die Prüfbefehle aus `docs/02-requirements.md` §„Definition of Done“ gelaufen sind und die Ausgabe gezeigt wurde. Jede sichtbare Änderung per Screenshot (Browser 360 × 640 oder Gerät) angesehen.
11. **Aktuelle Regeln und Versionen lesen.** Paketversionen (PixiJS, Capacitor, Vite, break_infinity), Google-Play-Vorgaben, AdMob/UMP und Data Safety aus offiziellen Quellen neu lesen. Nichts aus dem Gedächtnis.
12. **Kleine, atomare Commits** nach Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `art:`).
13. **Nutzertexte nie hartkodiert.** Alle Strings in `app/src/l10n/de.json` (Quelle) und `en.json`. `tools/check-l10n.ts` prüft Parität.
14. **Keine Dark Patterns.** Keine Lootboxen, keine Timer-Erpressung, keine erzwungene Werbung, keine Belohnung vor echtem Reward-Callback, kein Kauf von Spielvorteilen gegen Echtgeld ohne Owner-Entscheidung.
15. **Jede Grafik ist austauschbar.** Sprites werden nur über ihre ID aus `art/manifest.json` geladen, nie über Dateipfade im Code (D-015).

## 3. Produktprinzipien (Tie-Breaker)
1. Fairness und Zufriedenheit vor kurzfristigem Umsatz.
2. **Die Szene ist der Lohn.** Jeder Kauf verändert sichtbar die Pixelwelt; Zahlen erklären, die Szene begeistert.
3. Verständlich oben, tief darunter. Max. 8 Zahlen gleichzeitig sichtbar (HUD + offenes Panel).
4. Offline-first, kostenlos im Betrieb.
5. Einfach vor clever. Lieber 6 polierte Ären als 10 halbe.
6. Messbar: Jede Spielzeit-Aussage wird durch `bin/simulate.ts` belegt, nicht durch Bauchgefühl.

## 4. Repo-Landkarte
```
AGENTS.md              diese Datei
README.md              Einstieg
docs/                  Source of Truth
packages/sim/          reines TypeScript: Simulation, Zahlen, Save, Balancing-CLI
packages/content/      Ären, Gebäude, Fahrzeuge, Waren als Daten (Single Source)
app/                   Vite-Web-App: Renderer (PixiJS), UI-Overlay, Plattform
art/                   Sprite-Generatoren, Paletten, manifest.json
android/               von Capacitor erzeugt (eingecheckt, ohne Secrets)
tools/                 Checks, Build-Skripte
.github/workflows/     CI (kostenlos)
```

## 5. Standard-Prüfbefehle
```
npm run lint && npm run typecheck          # alle Pakete
npm test -w packages/sim                   # Vitest, Sim
npm run simulate -w packages/sim -- --policy all   # Balancing-Gate
npm test -w app                            # UI-/Render-Tests (Vitest + Playwright)
npm run check:purity && npm run check:l10n && npm run check:palette
npm run build && npx cap sync android      # ab M1 (Durchstich)
cd android && ./gradlew bundleRelease      # ab M9
```

## 6. Übernommene Lehren aus Bootstrapped (nicht wiederholen)
Fehler → Regel. Neue Funde hier ergänzen.
1. **Spielstand-Verlust bei Tester-Updates** → Regel 9 gilt ab Tag 1, nicht erst nach Release.
2. **Commands verbrauchen keine Zeit.** Zeit läuft nur im Takt, nie durch Taps oder offene Dialoge.
3. **Ereignisse der Abwesenheit gehen nicht verloren.** Offline-Berechnung liefert ihre Notices an Rückkehr-Dialog und Feed.
4. **Kein Kauf ohne Deckung**, die UI nennt den Grund („Es fehlen noch 1,2 K Taler“), nie stumm graue Buttons.
5. **UI zeigt Werte aus der Sim-Funktion**, nie aus Tabellen nachgerechnet (Kosten, Prestige-Vorschau, Offline-Ertrag).
6. **Optionale Systeme nie stärker als das Kernspiel.** Jedes neue Bonus-System bekommt Exploit-Proben in beide Richtungen: „lässt es sich ausnutzen“ und „lohnt es sich je“.
7. **Neue Boni ersetzen laufende Effekte nie**, sie addieren mit Deckel.
8. **Zufalls- und Zeitfaktoren nie sprunghaft.** Event-Multiplikatoren gleiten ein und aus.
9. **„Animationen reduzieren“ ernst nehmen:** lesbare Inhalte bleiben gleich lang stehen, nur Bewegung entfällt.
10. **Eine Botschaft zur Zeit.** Kein Event-Banner über Tutorial, Prestige-Dialog oder Rückkehr-Dialog.
11. **Layout auf 320 dp und 200 % Schrift prüfen**, leere Zustände inklusive.
12. **Zahlenformat:** geschütztes Leerzeichen vor Einheit; Kurzform ab 1 Mio. („4,2 Mio.“, „4,2 Qa“), darunter voll ausgeschrieben.
13. **Massenersetzungen in JSON** nur mit Funktions-Replacement, danach auf Steuerzeichen prüfen.

## 7. Änderungsprotokoll
Änderungen an dieser Datei: Eintrag im Decision-Log mit Begründung.
