# TVB Hallenverkauf 4.5

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
17 Funktionstests umfassen unter anderem die Gleichheit von Vorschau und Upload,
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


## Ergänzungen 4.3

App-Icon im HTML-Head: Apple-Touch-Icon 180×180, Browser-Icon 32×32.
Zusätzlich liegt assets/icon-100x180.png bei. Alle PNGs stammen aus dem Original-SVG.
Die Symbole für Flaschen, Kisten und Dosen sind direkt eingebettete SVG-Zeichnungen.
Die Originalbezeichnungen und Preise bleiben sichtbar.

Die Ausgaben verwenden ein natives Auswahlmenü statt eines Datalist-Vorschlagsfelds.
„Andere Ausgabe …“ öffnet das freie Textfeld. Die Bestätigung nennt Geldentnahme
und Quittungen. Datum, Mannschaft und Person haben identische Feldhöhen.
Touch-action: manipulation verhindert Doppeltipp-Zoom auf Bedienelementen, ohne
Pinch-Zoom generell abzuschalten; die Schrift der Eingaben ist mindestens 16 px.

Nach bestätigtem Versand erscheint ein Dialog „Übermittlung erfolgreich“ mit einem
OK-Button. Bei einem fehlgeschlagenen oder nur teilweise bestätigten Versand wird er
nicht angezeigt. Die bereits ergänzte Dropbox-Mac-Benachrichtigung bleibt aktiviert.

Neue PDFs haben einen weißen Kopf statt des roten Flächenbalkens. Logo und wenige
rote Überschriften bleiben erhalten. Neue Abrechnungen liegen unter V4_3, alte offene
Vorgänge bleiben in ihren bisherigen Versionen und behalten deren bytegleiche PDFs.
Cloudflare-Einstellungen und Secrets unverändert lassen. Nach dem neuen grünen Build
App neu laden, „Neue Abrechnung“ wählen und als Test absprechen, bevor echte Dateien
in Dropbox geschrieben werden. Die mobile Bedienung wurde lokal geprüft; den Zoom
bitte zusätzlich auf dem tatsächlich verwendeten iPhone/Android ausprobieren.


## Version 4.4: Mannschaften, Ausgaben und iPhone-Icon

Ausgabenarten: Würstchen, Brötchen, Brezeln, Schnitzel, Bäcker, Metzger,
Lebensmittel und Andere Ausgabe. Bestehende Bezeichnungen wie Würstchenbrötchen
werden beim Laden als eigene Bezeichnung erhalten; ein früherer gemeinsamer Betrag
wird nicht automatisch aufgeteilt.

Mannschaft 1 ist Pflicht, Mannschaft 2 optional. In beiden Feldern ist eine eigene
Gruppe möglich. Senioren zuerst: Damen 1, Herren, Damen 2, Damen 3. Danach männliche
und weibliche A-, B-, C-, D-, E-Jugend, gemischte F-Jugend und Minis. Zwei ausgewählte
Teams werden als „Damen 1 / Herren“ gemeinsam in PDF und JSON geführt. Dateinamen
ersetzen den Schrägstrich durch einen Unterstrich. Auswahlen und eigene Gruppen
werden im lokalen Entwurf gespeichert. Identische doppelte Auswahlen werden abgewiesen.
Neue Abrechnungen werden unter V4_4 gespeichert. Bestehende offene Vorgänge behalten
ihre alten PDF-Fassungen und Speicherorte.

Die öffentliche Version 4.3 wurde geprüft: Ihr Icon-Verweis und ihre PNG-Datei waren
korrekt erreichbar (HTTP 200, image/png, 180×180), die PNG hatte Transparenz.
Die tatsächliche Ursache der Anzeige am betroffenen iPhone konnte nicht festgestellt
werden. 4.4 liefert zusätzlich ein geschlossenes, rotes Home-Icon, die Standarddateien
/apple-touch-icon.png und /apple-touch-icon-precomposed.png sowie ein Webmanifest mit
192er- und 512er-Icons. Die Website verweist mit einer neuen Versionskennung auf das
Icon. Die Darstellung auf dem tatsächlichen iPhone muss nach dem Update geprüft werden.
Das Wappen innerhalb der App und im PDF bleibt außen transparent.

iPhone-Test nach erfolgreicher Bereitstellung:
1. Offene Übermittlungen zuerst abschließen.
2. Bisherige Home-Bildschirm-Verknüpfung entfernen.
3. Die normale Startadresse https://tvb-hallenverkauf.pages.dev/ direkt in Safari
   öffnen und neu laden, nicht in einem eingebetteten Browser eines Messengers.
4. Teilen → Zum Home-Bildschirm. Die Icon-Vorschau prüfen und dann hinzufügen.
   Falls Safari eine Auswahl „Als Web-App öffnen“ anbietet, diese aktivieren.
5. Falls weiterhin ein falsches Icon erscheint, iOS-Version und Screenshot der
   Hinzufügen-Vorschau melden. Keine Browserdaten löschen.

Apple-Referenz:
https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

Die Einstellungen bei Cloudflare bleiben unverändert. Das neue vollständige Paket
wie bisher gemeinsam in GitHub hochladen und committen. Anschließend den neuesten
grünen Cloudflare-Build abwarten. Die tatsächliche iPhone-Installation konnte lokal
nicht getestet werden; Menü, zwei Mannschaften, freie Gruppen, Neuladen, Bestätigung,
Downloads und Icon-Dateiabruf wurden im getrennten Browser getestet.


## Ergänzung 4.5: Belegkopf und Abstände

TVB Hallenverkauf in kräftiger Schrift, Saison 2026/2027, Turnverein Birkenfeld,
Abteilung Handball und Version 4.5. Datum, Mannschaft und Name stehen links in einer
festen Beschriftungsspalte; ihre Werte beginnen alle an derselben Position. Lange
Werte werden innerhalb der Wertespalte umgebrochen. Die Gesamtsumme hat zusätzlich
8 Punkte Abstand unter der Rechenlinie. In der App heißt das Personenfeld ebenfalls
„Name“, der Datenschlüssel bleibt aus Kompatibilitätsgründen person.
Neue Abrechnungen verwenden V4_5. Die PDF-Generatoren früherer Versionen bleiben
für offene Vorgänge erhalten, damit Wiederholungen dieselben Belegbytes erzeugen.
Die Saison ist bewusst fest 2026/2027 und muss beim Saisonwechsel angepasst werden.

Absenderidentität: Es werden keine Betriebssystem-Anmeldenamen, Apple-IDs oder
vermeintlich verifizierte Gerätenamen ausgelesen. Das frei eingegebene Namensfeld
und der gemeinsame Vereinscode verifizieren keine individuelle Person. Eine spätere
Zuordnung zu persönlichen Benutzerkonten erfordert eine eigene Anmeldung, etwa
individuelle Konten oder einen bestätigten Anmeldelink. Dies ist nicht Bestandteil
von Version 4.5.
