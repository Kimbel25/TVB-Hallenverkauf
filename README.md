# TVB Hallenverkauf – Version 6.3

Turnverein Birkenfeld · Abteilung Handball · Saison 2026/2027

## Cloudflare-Passwort aus Version 6.0 weiterverwenden

Im Cloudflare-Projekt tvb-hallenverkauf unter Settings → Variables and Secrets
für Production einen neuen Eintrag anlegen:

Typ: Secret
Name: TVB_KASSIERER_PASSWORT
Wert: das gewünschte Kassierer-Passwort (Großschreibung und Leerzeichen merken)

Falls das Secret schon für Version 6.0 eingerichtet ist, nichts daran ändern.
Nur wenn es noch fehlt, wie oben beschrieben anlegen.
Den Wert ausschließlich dort eingeben, nicht in GitHub, HTML oder JSON.
Danach speichern. Die vorhandenen Dropbox-Secrets und TVB_VEREINSCODE bleiben bestehen.
TVB_SETUP_KEY gehört weiterhin nur zur vorhandenen Dropbox-Ersteinrichtung.
Für Preview-Deployments wäre das neue Secret dort zusätzlich separat einzurichten.

## Manuell aktualisieren

1. TVB-Hallenverkauf-V6.3.zip entpacken.
2. Den gesamten Inhalt des entpackten Ordners im GitHub-Repository
   Kimbel25/TVB-Hallenverkauf auf oberster Ebene hochladen. Alle mitgelieferten
   Dateien ersetzen bzw. hinzufügen und gemeinsam committen. Nicht die ZIP oder
   den umschließenden Ordner hochladen.
3. Cloudflare baut automatisch. Build bleibt npm run build, Ausgabeverzeichnis
   public, Node.js mindestens 22. Den neuesten grünen Build abwarten.
   Wird das Secret erst später ergänzt, danach erneut deployen.
4. App neu laden. Bestehende Übermittlungsversuche zuerst abschließen; anschließend
   für den neuen Ablauf „Neue Abrechnung“ wählen.
5. Beide nachfolgenden Abläufe mit Testdaten prüfen, einschließlich PDF und JSON
   in Dropbox. Das Paket wurde lokal geprüft; die echte Veröffentlichung erfolgt manuell.

## Neu in Version 6.3

- Scheine und Münzen werden wie Flaschen und Kisten mit − und + gezählt; die Anzahl
  kann auch direkt eingetippt werden. Je Sorte steht die Teilsumme (z. B. 3 × 50,00 € = 150,00 €).
- Verbindungstest: Als Vereinscode genau TVB (Großbuchstaben) eingeben und
  „Abrechnung übermitteln“ tippen. Geprüft werden Server, Cloudflare-Einstellungen,
  Dropbox-Anmeldung und der lesende Zugriff auf den Ordner „Abrechnungen“. Ist das
  Formular vollständig, wird zusätzlich ein Probe-PDF erzeugt und sofort verworfen.
  Es wird NICHTS in Dropbox gespeichert, kein Vorgang angelegt und das Formular nicht
  gesperrt. Bei Erfolg gibt es Konfetti und eine Liste der geprüften Schritte.
  Danach wird das Codefeld geleert; für die echte Übermittlung den richtigen Vereinscode eingeben.
- Wichtig: Der echte Vereinscode (Secret TVB_VEREINSCODE) darf nicht „TVB“ lauten.
  Der Test meldet diese Kollision als Warnung.
- Neuer Serverendpunkt functions/api/verbindungstest.js; keine neuen Secrets nötig.

## Neu in Version 6.2 (nur Oberfläche)

Reines Oberflächen-Update. Server, Berechnung, PDF-Layout, Dropbox-Pfade (weiterhin V6_1)
und das Datenformat 6.1 bleiben unverändert. Secrets müssen nicht angepasst werden.

- Gestaltung nach Apple-Richtlinien: gruppierte Listen wie in den iPhone-Einstellungen,
  Plus/Minus-Stepper, Schalter für die Quittungsbestätigung, Segmentauswahl für
  „Wer zählt die Kasse?“ und „Art der Kassenzählung“, Dunkelmodus, iPhone-Ränder (Notch).
- „Neue Abrechnung“, „JSON-Abrechnung laden“ und „Kassierer-Bereich“ liegen jetzt
  dezent im Menü „⋯“ oben rechts. Die Kassierer-Anmeldung öffnet sich als Blatt von unten.
  Die doppelten Knöpfe in der Mitte und unten entfallen.
- Nur noch „Abrechnung übermitteln“ ist ein roter Hauptknopf; „PDF-Vorschau ansehen“ ist
  bewusst zurückhaltend gestaltet. Nach erfolgreicher Übermittlung erscheint
  „Neue Abrechnung beginnen“ (ohne Rückfrage, da die Daten in Dropbox liegen).
- Erfolgsanimation: offene Abrechnung (Kassierer zählt später) mit Konfetti und
  orangem Symbol, komplette Abrechnung mit Feuerwerk und grünem Haken. Nur nach
  bestätigtem Upload. Bei „Bewegung reduzieren“ (iPhone-Bedienungshilfen) keine Animation.
- Fehlermeldungen erscheinen direkt am betroffenen Feld statt als Browser-Popup; die
  Seite scrollt dorthin. Rückfragen erscheinen als iPhone-typischer Dialog.
- Lade-Kreisel beim Senden, Freigeben und bei der PDF-Vorschau; Hinweis bei fehlender
  Internetverbindung (Senden wird dann gar nicht erst versucht).
- Versionsangaben stehen zentral am Anfang von assets/ablauf.js
  (APP_VERSION, DATENFORMAT, NEUE_FORMATE, SAISON).

Hinweis für das iPhone: Die geänderte Statusleisten-Darstellung wirkt bei einem bereits
auf dem Home-Bildschirm abgelegten Symbol erst nach erneutem „Zum Home-Bildschirm“.

## Neu in Version 6.1

Sonstige Bareinnahmen/Spenden entfallen bei neuen Abrechnungen vollständig im
Formular und auf dem Beleg. Der gesamte gezählte Bestand fließt in die Berechnung ein.
„JSON-Abrechnung laden“ und „Neue Abrechnung“ (seit 6.2 im Menü „⋯“ oben rechts).
Beim Laden ohne Freigabe öffnet sich zuerst das Passwortfeld.
Passwort eingeben, „Freigeben“ tippen, danach „Offene JSON-Datei auswählen …“.
Die Auswahl der zuständigen Person heißt jetzt „Kassierer soll zählen“.

## Weg A: Hallendienst zählt

Warenmengen und sonstige Ausgaben wie bisher erfassen. „Wareneinsatz plus Getränke“
umfasst auch Hanuta/Duplo und Chips. Pfand entfällt bei neuen Abrechnungen.
Bei „Kasse zählen“ den Hallendienst auswählen. Erst dann erscheinen die Zählfelder.
Gesamtbestand direkt eingeben oder Scheine und Münzen einzeln zählen. 500- und
200-Euro-Scheine werden nicht mehr angeboten. Tatsächlich gezählte null Euro
sind zulässig und werden als Fehlbetrag behandelt, ein leeres Feld ist keine Zählung.

Sonstige Ausgaben müssen zum Zeitpunkt der Zählung bereits entnommen sein;
Wareneinsatz und Gewinnauszahlungen dürfen noch nicht entnommen sein.
Ein zusätzliches Feld für sonstige Bareinnahmen gibt es nicht mehr.

„Auswertung und Abschluss“ bleibt zugeklappt. Zum Ansehen aufklappen und mit dem
Kassierer-Passwort freigeben. Auch die fertige PDF-Vorschau verlangt dieses Passwort.
Die reine Übermittlung durch den Hallendienst benötigt weiterhin den Vereinscode.
Nach bestätigtem Upload heißen PDF und JSON hinten _komplett.

## Weg B: Kassierer soll zählen

1. Warenmengen und Ausgaben erfassen.
2. „Kassierer soll zählen“ auswählen. Es wird kein Kassenbestand erfunden.
3. Mit Vereinscode übermitteln. Die App bestätigt ausdrücklich die Ablage einer
   OFFENEN Abrechnung. PDF und JSON liegen in Dropbox, Gewinn und Auszahlungen
   sind noch nicht berechnet. Diese Dateinamen haben noch kein _komplett.
4. Als Kassierer die originale offene JSON aus Dropbox auf den Computer laden.
5. In der App über „⋯“ → „JSON-Abrechnung laden“ öffnen, den Kassierer-Bereich mit dem
   Passwort freigeben und anschließend die offene JSON auswählen.
6. Nach der Prüfung sind Datum, Namen, Mannschaften, Mengen, Ausgaben, gegebenenfalls alte Einnahmen
   und Bemerkungen gesperrt. Nur noch die Kassenzählung ergänzen.
   Ältere vorhandene Einnahmen bleiben unverändert erhalten und erscheinen als Altbeleg-Hinweis.
7. „Komplette Abrechnung übermitteln“ drücken. Es werden neue PDF und JSON mit
   _komplett im selben lesbaren Ordner und unter derselben Vorgangsnummer abgelegt.
   Die offenen Originaldateien bleiben erhalten. Ein weiterer Vereinscode ist für
   diesen bereits geprüften Kassierer-Abschluss nicht erforderlich.

Der Import akzeptiert nur unveränderte, serverseitig signierte offene JSON-Dateien
aus Version 6.0 und 6.1. Fertige Dateien und alte 5.0-Dateien werden nicht erneut geöffnet.
Die mitgelieferten Muster-PDFs enthalten erfundene Namen und dienen nur der Ansicht.
Es wird bewusst keine importierbare Muster-JSON mitgeliefert.

Das Passwort bleibt nur für die geöffnete App im Arbeitsspeicher. Nach Neuladen
oder „Auswertung sperren“ erneut eingeben. Der importierte Entwurf kann lokal
weiterbearbeitet werden; das Passwort wird weder lokal gespeichert noch exportiert.
Ein offener Übermittlungsversuch muss zuerst abgeschlossen werden, bevor eine andere
JSON geladen werden kann. Für einen anderen Vorgang „Neue Abrechnung“ wählen.

## Berechnung und Mannschaften

Anfangsbestand und neues Wechselgeld: immer 130 Euro.
Zwischensumme = gezählter Bestand + bereits entnommene Ausgaben.
Verkaufseinnahmen bei neuen Abrechnungen = Zwischensumme − 130 Euro.
Bei importierten älteren Belegen bleibt die bisherige Berechnung mit deren
mitgezählten sonstigen Einnahmen erhalten, ebenso deren ursprüngliches PDF-Layout.
Endbestand = gezählter Bestand − Wareneinsatz plus Getränke.
Gewinn/Verlust = Endbestand − 130 Euro neues Wechselgeld.

Der gesamte Mannschaftsanteil beträgt 50 % des positiven Gewinns, gerundet auf
nächstgelegene 5 Euro; genau dazwischen wird aufgerundet. Die Abteilung erhält
den genauen Rest. Bei zwei Mannschaften wird der gerundete Gesamtanteil exakt
halbiert und mit beiden Mannschaftsnamen ausgewiesen: beispielsweise 105 Euro
insgesamt, je 52,50 Euro. Es gibt keine zweite 5-Euro-Rundung je Mannschaft.
Bei einer Mannschaft steht deren Name beim Auszahlungsbetrag. Bei Verlust gibt
es keine Gewinnauszahlung; die fehlenden Mittel werden angezeigt.

Die App berechnet die Entnahmen, führt aber keine Zahlungen oder Überweisungen aus.
Der Server prüft Eingaben, Stückelung und feste Preise neu und übernimmt keine
vom Browser vorgegebenen Rechenergebnisse. Gezählt wird in ganzen Cent.
Der Bestand nach Kassenzählung erscheint im PDF fett. Druckfreundliches Layout,
Wappen, freie Mannschaftseingaben, zweiter Hallendienst und Ausgabenliste bleiben erhalten.

## Dateien und Wiederholungen

Beispiel: Abrechnungen/V6_1/2026-11-09_Hallenverkauf_Damen 1/

Offen:
2026-11-09_Hallenverkauf_Damen 1.json
2026-11-09_Hallenverkauf_Damen 1.pdf

Komplett:
2026-11-09_Hallenverkauf_Damen 1_komplett.json
2026-11-09_Hallenverkauf_Damen 1_komplett.pdf

Bei direkter Zählung durch den Hallendienst entstehen nur die kompletten Dateien.
Bei Namenskollisionen erhalten getrennte Vorgänge den Zusatz (2), (3) usw.
Zwei Mannschaften erscheinen gemeinsam. Der Ordner selbst erhält kein _komplett.
Technische Dateien im Unterordner _Vorgaenge nicht löschen oder bearbeiten.

Je Übermittlungsstufe bestätigt die App erst dann Erfolg, wenn PDF UND JSON anhand
von Pfad, Größe, Revision und Dropbox-Inhaltsprüfsumme geprüft sind. Bei Teilfehlern
denselben Vorgang erneut übermitteln. Bereits bestätigte Inhalte werden wiederverwendet;
geänderte Daten unter derselben Nummer werden abgelehnt. Nach unklarer Übermittlung
keine Browserdaten löschen oder auf einem zweiten Gerät einen neuen Vorgang anlegen.
Auch der fertige Kassierer-Abschluss ist nach dem ersten Versuch unveränderlich.
Bei einem echten inhaltlichen Fehler den Kassenwart zur Berichtigung kontaktieren.

Ältere bereits angelegte Vorgänge bleiben kompatibel: alte Preise, Pfand, Stückelung,
PDF-Layout und Ablagepfade werden bei Wiederholungen erhalten. Ein alter noch nicht
übermittelter Entwurf mit Pfand wird im alten Format fortgesetzt; ältere Stückelungen
werden zur Anzeige verlustfrei in den Gesamtbetrag umgerechnet.

## Passwort und Echtheitsprüfung

Die Freigabe wird auf dem Server geprüft; kein fest eingebautes Passwort im Quelltext.
Die offene Vorlage erhält einen HMAC-Nachweis. Inhaltlich geänderte Ausgangsdaten
werden beim Import abgelehnt; zusätzlich verhindern Dropbox-Sperrdateien Änderungen
an den Ausgangsdaten und an einer bereits begonnenen Abschlussstufe.
Die Signatur verwendet den vorhandenen serverseitigen DROPBOX_APP_SECRET.
Eine spätere Änderung dieses Secrets erfordert einen geplanten Umgang mit noch
offenen Vorlagen, deren alte Signaturen danach nicht mehr gültig sind.
Der gemeinsame Kassiererzugang ist keine persönliche Identitätsprüfung. Name und
Betriebssystem-Anmeldename werden nicht automatisch verifiziert oder ausgelesen.

## Mac und iPhone

Beim PDF-Upload dürfen Dropbox-Mitteilungen erscheinen, JSON und technische Dateien
bleiben stumm. Das gilt für offene UND komplette Belege: Eine Mac-Meldung allein
bestätigt noch keine abgeschlossene Kassenzählung. Dafür _komplett bzw. den Status
in der App prüfen. Dropbox muss laufen und macOS-Mitteilungen müssen erlaubt sein.
Die vorhandenen iPhone-Home-Icons bleiben erhalten.

## Prüfstand

37 lokale Funktionstests (seit 6.3 inkl. Verbindungstest): alte Versionen, Preisprüfung, Spenden, Rundungen, Fehlbeträge,
Stückelung, parallele Ordnernamen, Teilfehler/Wiederholung, geschützte PDF-Vorschau,
signierter Import, manipulierte Vorlagen und zweistufiger Abschluss.
Zusätzlich Browserprüfung der oberen Knöpfe, Passwortöffnung und fehlenden Einnahmenfelder
sowie der echten lokalen Serverfunktionen mit nachgebildeter
Dropbox: beide Zählwege, Passwortprüfung, gesperrte Ausgangsdaten, Neuladen,
Teilübertragung mit Wiederholung, Passwort nicht im Browserspeicher sowie Handyansicht.
PDF-Beispiele und langer mehrseitiger Beleg wurden gerendert und visuell geprüft.
Cloudflare-Pages-Functions werden lokal gebaut. Keine echten Abrechnungen hochgeladen;
Dropbox-Livetest und reale CPU-Zeit auf Workers Free nach Veröffentlichung prüfen.

Entwicklung: npm test und npm run build. Keine Laufzeitabhängigkeiten.
Saisonwechsel erfordert Anpassung der fest eingetragenen Saison 2026/2027.
