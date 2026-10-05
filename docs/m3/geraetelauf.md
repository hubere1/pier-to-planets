# M3 – Gerätelauf im Emulator (05.10.2026)

Exit-Kriterien M3 (`07`): Neuinstallation → erster Kauf ≤ 60 s, Kran ≤ 5 Min; Ziel-Gebäude erreichbar;
Spielstand über App-Update erhalten. Android-Prüfungen laufen im Emulator (D-027).

## Aufbau
| | |
|---|---|
| Emulator | AVD `ptp_api36`: Android 16 (API 36), Pixel-6-Profil 1080 × 2400, Systemsprache Englisch |
| Builds | Debug-APK v1 (`versionCode 1`, Web-Stand `207bf6a`) und v2 (`versionCode 2`, `versionName 0.3.0`, mit Fix D-038) |
| Steuerung | WebView über das DevTools-Protokoll (`adb forward … webview_devtools_remote_<pid>`, D-043): Boots-Tipp als echtes Maus-Ereignis in der Szene, Knöpfe per DOM-Klick, ~4 Tipps/s |
| Spielstand | `Directory.Data` = `/data/data/app.piertoplanets.game/files`, gelesen mit `adb exec-out run-as … cat` |

## 1. Spielstand übersteht App-Update (Regel 9)
1. v1 als Update über die alte M1-Hülle installiert (`adb install -r`, nie deinstalliert), gestartet:
   App legt `save.json` **und** `save.bak` an (Schreiben über `save.tmp`, Capacitor Filesystem).
2. Stand v1: Schema 1, App 0.0.0, Sim-Zeit **93,7 s**.
3. v2 (`versionCode 2`) mit `adb install -r` darüber installiert, gestartet, 16 s laufen lassen.
4. Stand v2: App 0.3.0, Sim-Zeit **165,0 s**, Rückkehr-Dialog offen (61 s abwesend).

**Ergebnis:** Der Stand aus v1 wurde geladen und fortgesetzt, Abwesenheit korrekt als Offline-Zeit verrechnet. ✔

## 2. Stoppuhr Einstieg (FR-K02)
In v2 über Einstellungen → „Spielstand zurücksetzen“ (zweimal bestätigt) neu begonnen. Der alte Stand liegt
danach als `archive_<zeit>.json` und `archive_<zeit>_bak.json` im App-Ordner – archiviert, nicht gelöscht. ✔

| Moment | ab Neustart der Seite |
|---|---|
| Szene + HUD sichtbar | 1,5 s |
| Coach „Tippe auf das Boot“ | 2,4 s |
| Tipp in der Szene trifft das Boot, Tutorial geht weiter | ✔ |
| **Erster Kauf (Kran)** | **44,3 s** (Ziel ≤ 60 s; Kran ≤ 5 Min) ✔ |

Screenshot nach dem Kauf: `emulator-api36-nach-kran.png` (Coach erklärt den Engpass, Kran als Holz-Derrick).

## 3. Gefundener Fehler (behoben in v2)
Wer die App vor dem ersten Tipp schließt, bekam beim nächsten Start kein Tutorial: Die Einstellungen wurden erst
bei der ersten Änderung gespeichert, beim zweiten Start galt der dann vorhandene Spielstand als „spielt schon“.
Jetzt werden die Einstellungen beim Erststart sofort gespeichert (D-038).

## Ergänzende Nachweise (Browser, Playwright)
- `app/e2e/game.spec.ts`: Journey (erster Kauf 45–49 s inkl. Laden), Neuladen, Rückkehr nach 5 h, Prestige,
  Ziel-Gebäude mit Feier, Sprache, Tippen auf Gebäude.
- `app/e2e/layout.spec.ts`: 360 × 640, 320 dp, 412 × 915 × 100/200 % × DE/EN ohne Überlauf, Touch-Ziele ≥ 48 dp.
- Balancing-Gate: erster Kauf bei allen 100 Installationen nach 43,8 s, Ziel-Gebäude casual an Tag 2,00.

Nicht im Emulator messbar und bewusst offen: Stoppuhr auf einem echten Gerät des Owners (D-027: nur mit Zustimmung).
