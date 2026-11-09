# TVB Hallenverkauf 5.0

Gemeinsame Kassen- und Ausgabenabrechnung für die Handballabteilung des
Turnverein Birkenfeld, Saison 2026/2027.

## Manuell aktualisieren

1. Das vollständige neue ZIP-Paket entpacken.
2. Im GitHub-Repository Kimbel25/TVB-Hallenverkauf den gesamten entpackten Inhalt auf
   oberster Ebene hochladen, vorhandene Dateien ersetzen und gemeinsam committen.
   Nicht den übergeordneten Ordner oder die ZIP selbst hochladen.
3. Cloudflare-Einstellungen und Secrets bleiben unverändert: Build `npm run build`,
   Ausgabeverzeichnis `public`, Node.js 22 oder neuer. Den neuesten grünen Build abwarten.
4. App neu laden. Nach Abschluss eventuell offener älterer Vorgänge „Neue Abrechnung“
   wählen und einen mit dem Kassenwart abgestimmten Funktionstest durchführen.
5. Die reale CPU-Zeit auf Workers Free sowie PDF und JSON nach dem Livetest prüfen.

## So wird abgerechnet

1. Hallendienst, Getränkemengen und Ausgaben aus der Kasse wie bisher erfassen.
   Würstchen, Brötchen und Aufschnitt sind eigene Ausgabearten; weitere und freie
   Bezeichnungen bleiben möglich. Entnommene Beträge mit Quittungen bestätigen.
2. Nach dem Hallenverkauf die Kasse zählen. Sonstige Ausgaben sind zu diesem Zeitpunkt
   bereits entnommen. Getränkegeld und Auszahlungen an Mannschaft und Abteilung
   dürfen noch nicht entnommen sein.
3. Entweder den gezählten Gesamtbetrag eingeben oder „Scheine und Münzen einzeln
   zählen“ auswählen und die Anzahl jeder Sorte erfassen. Die Stückelung wird auch
   auf dem Server erneut addiert; ein daneben übertragener Gesamtbetrag wird ignoriert.
4. Sonstige Bareinnahmen, etwa eine Spende, optional gesondert angeben und beschreiben.
   Diese müssen im gezählten Bestand bereits enthalten sein. Sie werden nicht
   ein zweites Mal zum Bargeld addiert.
5. Die Auswertung, den gemeinsamen PDF-Beleg und die Auszahlungen prüfen. Erst
   danach die Abrechnung übermitteln und die Geldentnahmen entsprechend vornehmen.

Die App führt keine Zahlungen und keine Banküberweisung aus. Sie berechnet die
Beträge, die für Getränke, Mannschaft und Abteilung bereitzulegen sind. Bei zwei
Mannschaften ist der Mannschaftsbetrag der gemeinsame Anteil; eine interne weitere
Aufteilung zwischen den beiden Mannschaften wird nicht vorgegeben.

## Verbindliche Rechenregeln

Alle Berechnungen erfolgen in ganzen Cent. Der Anfangsbestand und das benötigte
Wechselgeld für den nächsten Hallendienst sind immer 130,00 Euro.

- Zwischensumme vor Ausgaben = gezählter Kassenbestand + bereits entnommene Ausgaben.
- Einnahmen aus Verkauf = Zwischensumme − 130 Euro − sonstige mitgezählte Einnahmen.
- Endbestand = gezählter Kassenbestand − Wareneinsatz Getränke.
- Gewinn / Verlust = Endbestand − 130 Euro neues Wechselgeld.
- Mannschaft = 50 % des positiven Gewinns, auf den nächstgelegenen 5-Euro-Betrag gerundet.
  Genau zwischen zwei 5-Euro-Stufen wird nach oben gerundet (z. B. 2,50 → 5 Euro).
- Abteilung = positiver Gewinn − tatsächlich gerundeter Mannschaftsbetrag.
  So gehen keine Rest-Cent verloren; nur der Mannschaftsbetrag wird gerundet.
- Bei Verlust gibt es keine Gewinnauszahlungen. Der fehlende Betrag für Getränkegeld
  und den neuen 130-Euro-Bestand wird ausdrücklich angezeigt. Negative rechnerische
  Verkaufseinnahmen werden zur Überprüfung markiert und nicht stillschweigend auf null gesetzt.

Browser und Server verwenden dieselbe Rechenfunktion aus lib/kasse.js. Der Server
übernimmt keine vom Browser gelieferten Ergebniswerte oder veränderten Getränkepreise.
Die 130 Euro, der Anteil und die Rundungsregel können nicht im Formular verändert werden.
Eine Kassenzählung ist bei neuen 5.0-Abrechnungen Pflicht. Null Euro ist als tatsächlich
gezählter Bestand zulässig und führt entsprechend zu einem Fehlbetrag.

## Gemeinsamer Auswertebogen

Ein PDF enthält vorn die vollständige Kassenrechnung mit Gewinn, Auszahlungen und
Übertrag. Dahinter stehen alle Getränkemengen und Ausgaben sowie gegebenenfalls die
gezählten Scheine und Münzen. Normale Abrechnungen passen auf zwei A4-Seiten;
lange Listen werden automatisch auf weitere Seiten umgebrochen. Kopf und Wappen
bleiben druckerfreundlich. Vorschau und Übermittlung erzeugen bei unverändertem
Datensatz bytegleiche PDF-Inhalte. Die Vorschau benötigt Internetzugang und schreibt
keine Dropbox-Dateien. Die JSON enthält die geprüften Eingaben und Cent-Ergebnisse.

## Lesbare Dropbox-Ordner und sichere Wiederholungen

Neue Abrechnungen liegen beispielsweise hier:

Abrechnungen/V5_0/2026-11-09_Hallenverkauf_Damen 1/
  2026-11-09_Hallenverkauf_Damen 1.pdf
  2026-11-09_Hallenverkauf_Damen 1.json

Bei mehreren Abrechnungen derselben Mannschaft am gleichen Datum erhalten Ordner
und Dateien den Zusatz (2), (3) usw. Unterschiedliche Vorgänge werden nicht überschrieben.
Zwei Mannschaften erscheinen gemeinsam; unzulässige Dateinamenzeichen werden ersetzt.

Der Unterordner _Vorgaenge enthält technische Sperrdateien für Vorgangsnummern und
Ordnerbelegung. Diese schützen vor doppelten Ablagen und geänderten Daten unter
derselben Nummer. Die technischen Dateien bitte nicht löschen oder bearbeiten.
Die Auswahl eines belegten Namens ist auch bei parallelen Übermittlungen abgesichert.
JSON und PDF werden anhand von Größe, Pfad, Revision und Dropbox-Inhaltsprüfsumme
bestätigt. Erst wenn beide bestätigt sind, erscheint der Erfolgsdialog. Ein Teilfehler
wird mit derselben Nummer und im gleichen lesbaren Ordner wiederholt. Nach unklarer
Übermittlung keine Browserdaten löschen und die Abrechnung nicht auf einem anderen
Gerät mit neuer Nummer erneut anlegen. Bei Datenkonflikt den Kassenwart kontaktieren.

Vorhandene Dateien werden nicht automatisch umbenannt oder neu berechnet. Offene
Abrechnungen früherer Versionen behalten ihre alte PDF-Fassung und ihren Speicherort
und können ohne nachträglich erfundene Kassenzählung abgeschlossen werden.

## Mac-Meldung und iPhone-Icon

Nur der fertige PDF-Upload unterdrückt Dropbox-Meldungen nicht; JSON und technische
Dateien bleiben stumm. Dropbox muss auf dem Mac laufen und Mitteilungen müssen in
Dropbox und macOS erlaubt sein. Ob und wie Dropbox einen Hinweis zeigt, bleibt von
seinen Einstellungen abhängig. Es wird keine E-Mail und keine eigene macOS-Meldung gesendet.
Die bestehenden Home-Icons und Mannschaftsauswahlen mit freier Eingabe bleiben erhalten.

## Abgleich mit den bereitgestellten Papierbelegen

Beleg 07.11.2026: gezählt 386,40; Ausgaben 0; Getränke 56,90; Verkauf 256,40;
Endbestand 329,50; Gewinn 199,50; Mannschaft 100,00; Abteilung 99,50 Euro.

Beleg 08.11.2026: gezählt 431,00; Ausgaben 0; Getränke 57,50; Verkauf 301,00;
korrekter Endbestand 373,50; Gewinn 243,50; Mannschaft 120,00; Abteilung 123,50 Euro.
Die Handschrift nennt 374,50 Endbestand und 124,50 Abteilung: Das ist bei den
abgelesenen Eingaben eine Rechendifferenz von einem Euro, die nicht übernommen wird.
Der mitgelieferte Musterbeleg nutzt die Zahlen des ersten Belegs mit einem erfundenen Namen.

## Prüfungen und Grenzen

Lokal: `npm test` und `npm run build` mit Node.js 22+. Keine Laufzeitabhängigkeiten.
Die 26 Funktionstests prüfen auch beide Papierbeispiele, Rundungsgrenzen, Spenden,
Ausgaben, Stückelung, manipulierte Eingaben, Fehlbeträge, parallele Namenskollisionen,
Teilübertragung, Wiederholung und gleiche Vorschau-/Upload-Inhalte. Die Bedienung wurde
zusätzlich im getrennten Browser mit nachgebildeten Antworten geprüft. Der echte
Dropbox-Livetest erfolgt nach der manuellen Veröffentlichung durch den Betreiber.

Zugangsdaten gehören ausschließlich in die Cloudflare-Secrets TVB_VEREINSCODE,
DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN. Keine Werte im Paket.
Es werden weder Betriebssystem-Anmeldenamen noch Apple-IDs ausgelesen. Der frei
eingegebene Name und der gemeinsame Vereinscode identifizieren keine Einzelperson.
Die Saison ist fest 2026/2027 und muss beim Saisonwechsel angepasst werden.
