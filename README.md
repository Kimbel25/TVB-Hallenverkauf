# TVB Hallenverkauf 4.1

Ausgabenabrechnung für den Turnverein Birkenfeld 1848. Die bisherigen Preise, Ausgaben, Belegbestätigung und Farben bleiben erhalten.
Zusätzlich: Hugo / Aperol / Spritz als Dose zu 1,00 €, Ausgabevorschläge für
Würstchenbrötchen, Brezeln und Schnitzel sowie das Vereinswappen in App und PDF.
Die App verwendet das Original-SVG. Im PDF bleibt der Außenbereich des Wappens
durch eine separate Alpha-Maske transparent; die weiße Fläche im Kreis bleibt erhalten.
Der manuelle JSON-Export entfällt; die automatische Dropbox-JSON bleibt bestehen.

## Ergänzung auf einer bereits funktionierenden Version 4.1 installieren

Cloudflare-Einstellungen und Secrets unverändert lassen. Das vollständige neue Paket
entpacken und seinen Inhalt im GitHub-Hauptverzeichnis hochladen, vorhandene Dateien
ersetzen und gemeinsam committen. Nicht den übergeordneten Ordner hochladen. Den
neuesten erfolgreichen Cloudflare-Build abwarten, dann die App neu laden.

Das Paket enthält die online erprobten Korrekturen für Dropbox: Aufruf der fetch-Funktion
ohne falschen Empfänger und Zeitlimit mit AbortController. Schriftmetriken sind ein
gewöhnliches JavaScript-Modul und benötigen keine neuere JSON-Importsyntax.

Offene alte Abrechnungen mit 15 Artikeln bleiben gültig; ihre JSON- und PDF-Inhalte
bleiben unverändert und enthalten deshalb noch kein Wappen. Neue Abrechnungen haben
16 Artikel und das Wappen. Alte bereits übermittelte Dateien werden nicht verändert.

Nach dem Update für einen neuen Funktionstest auf „Neue Abrechnung“ klicken und
3 Dosen wählen: Die Getränkesumme muss 3,00 € betragen. Eine Ausgabe aus der Liste
wählen und zusätzlich eine eigene Bezeichnung ausprobieren. Mit dem Kassenwart als
Test abstimmen, dann übermitteln und PDF plus JSON in Dropbox kontrollieren.

## Erstinstallation: manuell veröffentlichen

1. Das vollständige Dateipaket entpacken. Es enthält keine Zugangsdaten.
2. In Cloudflare: Workers & Pages → tvb-hallenverkauf → Settings → Builds & deployments
   (je nach Oberfläche „Build“) → Build configuration:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `public`
   - Root directory: leer bzw. Repository-Wurzel
   - Node.js: 22 oder neuer (bei Bedarf Build-Variable `NODE_VERSION=22` setzen).
3. Im GitHub-Repository Kimbel25/TVB-Hallenverkauf alle mitgelieferten Dateien und Ordner
   auf oberster Ebene hochladen. Vorhandene Dateien ersetzen. Keinen zusätzlichen
   übergeordneten Ordner anlegen. Alles zusammen mit „Version 4.1“ committen.
   Die ZIP-Datei selbst wird nicht hochgeladen. `node_modules`, `.env`, `.dev.vars`
   und Zugangsdaten gehören nicht in GitHub.
4. Den erfolgreichen Cloudflare-Build abwarten. `/api/health` muss `version: "4.1"`
   anzeigen. Auf der Startseite muss im Fußbereich V4.1 stehen.
5. Eine mit dem Kassenwart abgestimmte Testabrechnung absenden. Erst die Meldung
   „PDF und JSON erfolgreich in Dropbox bestätigt“ gilt als erfolgreiche Übermittlung.
   Unter `/Abrechnungen/V4_1/` müssen zwei Dateien mit derselben Vorgangsnummer liegen.
   PDF öffnen, Angaben und Summe mit JSON vergleichen. In Cloudflare die CPU-Zeit und
   etwaige Fehler 1102 kontrollieren. Erst danach für den Hallendienst freigeben.

Cloudflare behält die bestehenden Secrets `TVB_VEREINSCODE`, `DROPBOX_APP_KEY`,
`DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`. Keine Werte kopieren oder weitergeben.
Die vorhandene Dropbox-Freigabe reicht aus; keine zusätzlichen Leserechte erforderlich.
Einrichtungs-, Callback- und Testendpunkt antworten nach dem Update mit HTTP 410.
Für eine spätere Neufreigabe ist eine separate, geschützte Einrichtung nötig.

Cloudflare-Dokumentation:
https://developers.cloudflare.com/pages/configuration/build-configuration/
https://developers.cloudflare.com/pages/functions/get-started/
https://developers.cloudflare.com/workers/platform/limits/

## Verhalten bei Fehlern

Vor dem ersten Versand speichert die App Vorgangsnummer und unveränderliche Eingaben
auf demselben Gerät. Während eines offenen Vorgangs bleiben die Abrechnungsfelder
gesperrt. „Erneut übermitteln“ verwendet dieselben Daten und dieselbe Nummer, auch
nach Neuladen. „Neue Abrechnung“ wird erst nach bestätigter Übermittlung freigegeben.
Ein erster HTTP-400-Eingabefehler wird vor allen Dropbox-Schreibvorgängen erkannt
und gibt das Formular zur Korrektur frei.

Nach einem Teilfehler kann die JSON-Datei bereits vorliegen. Nicht manuell löschen,
nicht auf einem anderen Gerät neu erfassen und keine neue Vorgangsnummer erzwingen.
Die Wiederholung ergänzt die PDF-Datei. Bei einem Datenkonflikt (HTTP 409) muss der
Kassenwart die vorhandenen Dateien prüfen. Die App überschreibt sie nicht.
Ein noch offener Vorgang aus Version 4.0 wird ausdrücklich angezeigt und muss vor
einer neuen Übermittlung mit dem Kassenwart geklärt werden. Vorhandene 4.0-Dateien
werden nicht automatisch migriert oder nachträglich ergänzt.

Die lokale Druckvorschau ist eine optionale Gerätekopie. Die in Dropbox abgelegte PDF
wird immer auf dem Server aus denselben validierten Daten wie die JSON erstellt.
Die Serversummen und Artikelpreise werden unabhängig vom Browser berechnet.

## Technik und Prüfungen

- Keine Laufzeitabhängigkeiten und kein externer PDF-Dienst. `npm run build` benötigt
  nur Node.js und kopiert ausschließlich die statischen Dateien nach `public/`.
- `functions/` bleibt im Repository-Hauptverzeichnis. Cloudflare baut die Functions.
  `lib/`, Tests und README werden nicht als Website veröffentlicht.
- PDF 1.7, A4, eingebettete Noto-Sans-Schrift, Unicode-Zeichentabelle, automatische
  Umbrüche und Seitenzahlen. Nicht verfügbare Zeichen werden vor Upload abgewiesen.
  Die Originalschrift wird vorkomprimiert ausgeliefert und per SHA-256 verifiziert.
  Die Schriftlizenz liegt unter `assets/fonts/OFL.txt`.
- Die serverseitige Erstellung wurde für Workers Free vereinfacht. Das ist keine
  Garantie für das CPU-Limit auf Cloudflare: dort gelten 10 ms pro Request. Die reale
  CPU-Zeit muss nach dem Deployment mit typischen und langen Abrechnungen geprüft
  werden. Der Tarif wird von diesem Paket nicht geändert.
- Dropbox erhält zuerst die kanonische JSON, danach die deterministische PDF.
  Die globale Vorgangsnummer bildet den Dateipfad; Datum und Mannschaft können
  dadurch keinen Konflikt umgehen. Pro Nummer entstehen genau diese beiden Ziele.
- Uploads verwenden `mode:add`, `autorename:false`, `strict_conflict:false` und den
  Dropbox-Content-Hash. Identischer Inhalt liefert bestätigte Metadaten, abweichender
  Inhalt einen Konflikt. Größe, Pfad, Revision und Hash werden kontrolliert.
- Netzwerkfehler, HTTP 429 und 5xx werden höchstens dreimal mit Wartezeit wiederholt.
  Ein langes Retry-After wird dem nächsten manuellen Versuch überlassen.
- Origin-, Format-, Größen-, Typ-, Datums- und Betragsprüfung. Keine ungeprüften
  Browserfelder in der gespeicherten JSON. Keine Secrets oder personenbezogenen
  Daten in Serverlogs und keine Dropbox-Rohfehler in Browserantworten.
- Web Locks verhindern parallelen Versand in mehreren Tabs desselben Browsers.
  Andere Geräte mit neuen Nummern lassen sich ohne zusätzliche Geschäftsvorgangs-ID
  nicht automatisch als dieselbe Abrechnung erkennen. Lokale Browserdaten deshalb
  bei einem offenen Vorgang nicht löschen.
- PDFs sind innerhalb dieses Versionsstands bytegleich. Bei späteren Änderungen
  am PDF-Format oder Artikelkatalog müssen offene Vorgänge zuerst abgeschlossen
  oder mit dem Kassenwart geklärt werden.

Lokal: `npm test` führt die Tests mit Node.js 22+ aus. Es werden ausschließlich
nachgebildete Dropbox-Antworten und erfundene Daten verwendet. Die PDF-Beispiele
entstehen unter `tmp/pdfs/`. Die Dropbox-API wurde nicht mit echten Vereinsdaten
beschrieben. Kompilierung als Cloudflare Function und Browserprüfung wurden
zusätzlich durchgeführt; die Livebereitstellung erfolgt manuell durch den Betreiber.
