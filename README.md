# TVB Hallenverkauf 4.2

## Manuelles Update

Die ZIP entpacken und ihren gesamten Inhalt in der Hauptansicht des GitHub-Repositorys
Kimbel25/TVB-Hallenverkauf über Add file → Upload files hochladen. Vorhandene Dateien
ersetzen und gemeinsam committen. Nicht den übergeordneten Ordner oder die ZIP hochladen.
Cloudflare-Einstellungen und Secrets bleiben unverändert: Build `npm run build`,
Ausgabeordner `public`. Den neuesten grünen Build abwarten und die App neu laden.

## Neu

- „PDF ansehen / herunterladen“ erzeugt denselben Serverbeleg wie die Übermittlung.
  Die Vorschau benötigt Internet, aber keinen Vereinscode. Sie schreibt nichts in Dropbox.
- Namen wie `2026-11-04_Hallenverkauf_Damen 1.pdf`, entsprechend für JSON.
  Ungültige Dateinamenzeichen werden ersetzt. Zwei Abrechnungen derselben Mannschaft
  am selben Tag bleiben durch getrennte Vorgangsordner voneinander unabhängig.
- Größere Kopfdaten, Vorgangsnummer im Fuß, Trennlinien, feste Mengenspalte,
  hervorgehobene Schlussrechnung, transparentes Wappen.
- Plus/Minus-Tasten für Mengen und leicht abwechselnde Zeilenhintergründe.
- Automatische JSON-Speicherung bleibt bestehen; kein manueller JSON-Export.

## Speicherung und sichere Wiederholung

Neue Abrechnungen liegen unter `/Abrechnungen/V4_2/<Vorgangsnummer>/` mit den lesbaren
Dateinamen. Unter `/Abrechnungen/V4_2/_Vorgaenge/` liegen technische `.lock`-Dateien
mit dem festgeschriebenen Datensatz. Diese werden vor den Belegen angelegt, damit
geänderte Namen, Mannschaften oder Daten unter derselben Nummer keine Duplikate erzeugen.
Bitte die technischen Dateien nicht löschen oder bearbeiten. JSON und PDF werden
weiterhin einzeln auf Pfad, Größe, Revision und Dropbox-Inhaltsprüfsumme kontrolliert.
Erfolg wird erst nach Bestätigung beider Dateien angezeigt. Wiederholungen verwenden
dieselbe Nummer und denselben Datensatz; abweichende Inhalte werden nicht überschrieben.

Offene 4.1-Abrechnungen behalten ihren bisherigen Beleg und Speicherort. Neue Belege
verwenden 4.2. Bereits gespeicherte Abrechnungen werden nicht nachträglich umgestaltet.
Nach dem Update „Neue Abrechnung“ wählen, um das neue Layout auszuprobieren.

## Prüfen

Eine markierte Testabrechnung vorbereiten, PDF herunterladen und dann unverändert
übermitteln. In Dropbox PDF und JSON öffnen; die Vorschau muss mit der übertragenen
PDF übereinstimmen. Datum, Mannschaft, Ausgaben und Summen prüfen. Den Kassenwart
informieren, dass der Test nicht verbucht werden soll.

Lokal: Node.js 22+, `npm test` und `npm run build`. Keine Laufzeitabhängigkeiten.
16 Funktionstests umfassen unter anderem die Gleichheit von Vorschau und Upload,
Dateinamen mit Umlauten, Konflikte nach Datumsänderung, Teilfehler und Wiederholung.
Der Browser wurde zusätzlich mit simulierten Antworten geprüft. Keine echten
Vereinsabrechnungen wurden bei den lokalen Tests gesendet.

Dropbox-Secrets bleiben ausschließlich bei Cloudflare. Im Paket sind keine Secrets.
Die bekannten Cloudflare-Korrekturen für fetch-Aufruf, Zeitlimit und Schriftimport
bleiben erhalten. Auf Workers Free die reale CPU-Zeit nach dem Upload prüfen.
Mac-Meldungen: Der PDF-Upload unterdrückt Dropbox-Benachrichtigungen nicht mehr.
JSON und technische Dateien bleiben stumm. Die PDF wird erst nach bestätigter JSON
hochgeladen. Dropbox entscheidet anhand seiner Desktop-Einstellungen über die Anzeige;
eine konkrete Meldung oder deren Wortlaut ist dadurch nicht garantiert. Dropbox muss
auf dem Mac angemeldet sein und laufen, Mitteilungen müssen in Dropbox und macOS
erlaubt sein. Bitte mit einer neuen markierten Testabrechnung prüfen. Es wird keine
zusätzliche E-Mail oder eigene macOS-Mitteilung versendet.
