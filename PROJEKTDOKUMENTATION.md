# TVB Hallenverkauf – vollständige Projekt- und Übergabedokumentation

**Dokumentationsstand:** 12. November 2026  
**Zuletzt hier erstellte Anwendungsversion:** 6.3, Datenformat 6.1, Paketversion `6.3.0`  
**Verein:** Turnverein Birkenfeld · Abteilung Handball  
**Saison:** 2026/2027

Dieses Dokument fasst die für Entwicklung, Bedienung, Betrieb und Weiterarbeit wichtigen Ergebnisse dieses Chats zusammen. Es beschreibt den vorhandenen lokalen Programmstand und die getroffenen Entscheidungen. Es ist keine wortgetreue Chatkopie und enthält keine Passwort-, Token- oder Schlüsselwerte.

Der Live-Stand bei GitHub, Cloudflare und Dropbox wurde für diese Dokumentation nicht erneut abgefragt. Ein lokal erstelltes Paket ist nicht automatisch bereits veröffentlicht.

## Inhaltsverzeichnis

1. [Ziel und Projektorte](#1-ziel-und-projektorte)
2. [Getroffene Grundentscheidungen](#2-getroffene-grundentscheidungen)
3. [Funktionsumfang des Formulars](#3-funktionsumfang-des-formulars)
4. [Artikel und Lieferantenpreise](#4-artikel-und-lieferantenpreise)
5. [Kassenzählung und Rechenregeln](#5-kassenzählung-und-rechenregeln)
6. [Bedienung: Hallendienst zählt](#6-bedienung-hallendienst-zählt)
7. [Bedienung: Kassierer zählt später](#7-bedienung-kassierer-zählt-später)
8. [PDF-Belege und Vorschau](#8-pdf-belege-und-vorschau)
9. [Dropbox-Ablage und Dateinamen](#9-dropbox-ablage-und-dateinamen)
10. [Wiederholungen und Schutz gegen doppelte Ablage](#10-wiederholungen-und-schutz-gegen-doppelte-ablage)
11. [Passwörter, Signaturen und Identität](#11-passwörter-signaturen-und-identität)
12. [Technischer Aufbau und Dateien](#12-technischer-aufbau-und-dateien)
13. [Schnittstellen und Datenmodell](#13-schnittstellen-und-datenmodell)
14. [Cloudflare und manuelles Veröffentlichen](#14-cloudflare-und-manuelles-veröffentlichen)
15. [Wappen, iPhone-Icon und mobile Bedienung](#15-wappen-iphone-icon-und-mobile-bedienung)
16. [Dropbox-Meldungen am Mac](#16-dropbox-meldungen-am-mac)
17. [Versionsgeschichte](#17-versionsgeschichte)
18. [Prüfungen und ihr Aussageumfang](#18-prüfungen-und-ihr-aussageumfang)
19. [Bekannte Fehler und ihre Behebung](#19-bekannte-fehler-und-ihre-behebung)
20. [Regeln für künftige Änderungen](#20-regeln-für-künftige-änderungen)
21. [Dateien zur Übergabe und offene Grenzen](#21-dateien-zur-übergabe-und-offene-grenzen)

## 1. Ziel und Projektorte

Die Webseite erfasst Wareneinsatz, aus der Kasse bezahlte Ausgaben und den gezählten Kassenbestand eines Hallendienstes. Sie erstellt einen gemeinsamen Auswertebogen und archiviert eine PDF sowie die zugehörige JSON-Datei in Dropbox. Eine nachgelagerte Kassenzählung durch den Kassierer ist ebenfalls möglich.

| Bestandteil | Ort / Bezeichnung |
| --- | --- |
| GitHub-Repository | `Kimbel25/TVB-Hallenverkauf` |
| GitHub-Adresse | https://github.com/Kimbel25/TVB-Hallenverkauf |
| Hauptbranch des bisherigen Upload-Ablaufs | `main` |
| Cloudflare-Projekt | `tvb-hallenverkauf` |
| Bisherige Produktionsadresse | https://tvb-hallenverkauf.pages.dev/ |
| Lokaler Arbeitsordner | `/Users/martin/Documents/ChatGPT/Eigen/TVB-Hallenverkauf` |
| Lokaler Bereich mit Versionspaketen | `/Users/martin/Documents/ChatGPT/Eigen/Version-*` |
| Aktuelles vollständiges Upload-Paket | `../Version-6.1/TVB-Hallenverkauf-V6.1.zip` |

Lokale Arbeitsdateien, entpackte Versionsstände und ZIP-Pakete sind unterschiedliche Dinge. Für eine manuelle Aktualisierung das vollständige, zusammengehörige Versionspaket verwenden.

## 2. Getroffene Grundentscheidungen

- Die bestehende Ausgaben-App mit den roten Vereinsfarben bleibt die Grundlage.
- Neue Änderungen werden hier lokal programmiert, geprüft und als vollständiges ZIP bereitgestellt.
- Der Nutzer hat sich ausdrücklich für das **manuelle Hochladen in GitHub** entschieden. Eine direkte GitHub-Anbindung von ChatGPT, automatisches Pushen oder ein PR-Verfahren wurde in diesem Ablauf nicht eingerichtet.
- Cloudflare soll nach dem GitHub-Commit automatisch bauen und veröffentlichen. Ein zusätzlicher Datei-Upload bei Cloudflare ist dafür nicht vorgesehen.
- Der angegebene Cloudflare-Tarif ist **Workers Free**. Es wurde kein kostenpflichtiger Tarif aktiviert.
- PDF-Erzeugung und verbindliche Berechnung erfolgen serverseitig aus validierten Eingaben.
- Erfolg bedeutet je Übermittlungsstufe: **PDF und JSON wurden beide von Dropbox bestätigt**.
- Ein vorläufig gespeicherter Vorgang ohne Kassenzählung ist noch keine abgeschlossene Abrechnung.
- Passwortwerte und Dropbox-Zugangsdaten gehören ausschließlich in die Cloudflare-Secrets.
- Die App berechnet Auszahlungen, führt aber keine Zahlungen, Bargeldentnahmen oder Banküberweisungen aus.

## 3. Funktionsumfang des Formulars

### 3.1 Hallendienst

Erfasst werden Datum, eine oder zwei Mannschaften/Gruppen und der Name der verantwortlichen Person. Im Formular und auf neuen Belegen heißt das Feld **Name**. Der interne Datenschlüssel lautet aus Kompatibilitätsgründen weiter `person`.

Die Mannschaftsauswahl enthält in dieser Reihenfolge:

| Bereich | Auswahl |
| --- | --- |
| Senioren | Damen 1, Herren, Damen 2, Damen 3 |
| A-Jugend | männliche A-Jugend, weibliche A-Jugend |
| B-Jugend | männliche B-Jugend, weibliche B-Jugend |
| C-Jugend | männliche C-Jugend, weibliche C-Jugend |
| D-Jugend | männliche D-Jugend, weibliche D-Jugend |
| E-Jugend | männliche E-Jugend, weibliche E-Jugend |
| Weitere Jugend | gemischte F-Jugend, Minis |

Freie Gruppenbezeichnungen bleiben möglich. Ein geteilter Hallendienst kann zwei unterschiedliche Mannschaften auswählen; dieselbe Mannschaft darf nicht zweimal gewählt werden.

Datum, Mannschaftsauswahl und Name haben einheitliche Feldhöhen. Freie Gruppenfelder passen dazu.

### 3.2 Menü „⋯“ (seit 6.2, vorher Knöpfe oben seit 6.1)

Seit 6.2 liegen **Neue Abrechnung**, **JSON-Abrechnung laden** und **Kassierer-Bereich** im Menü „⋯“ rechts oben im roten Kopf. Die Kassierer-Anmeldung ist ein Blatt (Sheet) von unten mit Passwortfeld, „Freigeben“, „Offene JSON-Datei auswählen …“ und „Kassierer-Bereich sperren“. Der frühere eigene Abschnitt „Kassierer: JSON-Abrechnung laden“ und der Knopf „Neue Abrechnung“ neben der PDF-Vorschau entfallen. Nach bestätigter Übermittlung erscheint „Neue Abrechnung beginnen“ ohne Rückfrage.

Historisch (6.1): Zwischen **1. Hallendienst** und **2. Wareneinsatz plus Getränke** standen zusätzlich:

- **JSON-Abrechnung laden**
- **Neue Abrechnung**

Die vorhandenen Knöpfe weiter unten bleiben bestehen. Wird ohne bestehende Freigabe auf „JSON-Abrechnung laden“ geklickt, öffnet sich die Kassierer-Anmeldung direkt oben. Das Passwortfeld erhält den Fokus. Nach „Auswertung freigeben“ lässt sich dort „JSON-Datei auswählen“ verwenden.

„Neue Abrechnung“ verlangt eine Bestätigung, verwirft den bisherigen lokalen Vorgang und beginnt einen neuen Datensatz. Bei unklarer Übermittlung nicht vorschnell neu beginnen; siehe Abschnitt 10.

### 3.3 Wareneinsatz plus Getränke

Der Abschnitt heißt bewusst nicht mehr nur „Wareneinsatz Getränke“: Auch Hanuta/Duplo, Chips und Dosen gehören dazu. Es sind **Lieferantenkosten**, keine Verkaufspreise und keine separat eingegebenen Verkaufseinnahmen.

Mengen lassen sich direkt sowie mit Plus-/Minus-Knöpfen ändern. Symbole unterscheiden unter anderem Kisten, Flaschen und andere Verpackungsarten. Leicht wechselnde Zeilenhintergründe erleichtern das Lesen.

Pfand entfällt bei neuen Abrechnungen seit Version 6.0. Historische Daten mit Pfand bleiben für Wiederholungen erhalten.

### 3.4 Ausgaben aus der Kasse

Ein echtes Auswahlmenü bietet:

- Würstchen
- Brötchen
- Aufschnitt
- Brezeln
- Schnitzel
- Bäcker
- Metzger
- Lebensmittel
- Andere Ausgabe mit freier Texteingabe

Würstchen und Brötchen sind getrennte Positionen. Es können mehrere Ausgaben mit Betrag erfasst werden.

Die Bestätigung nennt ausdrücklich beides: **Geld wurde aus der Kasse entnommen und die zugehörigen Quittungen wurden in der Kasse hinterlegt.** Bei Ausgaben mit positivem Betrag ist die Bestätigung erforderlich.

### 3.5 Wer zählt die Kasse?

Die Auswahl lautet aktuell:

- Hallendienst zählt
- Kassierer soll zählen

Die frühere Formulierung „Kimble soll zählen“ wurde in neuen Formularen und neuen 6.1-Belegen durch die allgemeine Kassierer-Bezeichnung ersetzt. Alte Belege werden für unveränderte Wiederholungen nicht nachträglich umgestaltet.

### 3.6 Abschluss und Erfolgsmeldung

„Auswertung und Abschluss“ ist zunächst zugeklappt. Ergebnisse erscheinen erst nach serverseitiger Prüfung des Kassierer-Passworts. Es gibt eine Funktion zum erneuten Sperren.

Nach bestätigtem Upload erscheint ein hervorgehobener Dialog mit einem OK-Knopf. Der Text unterscheidet zwischen offener und kompletter Abrechnung. Ein Teilfehler darf keinen Erfolgsdialog auslösen.

### 3.7 Entfallene sonstige Bareinnahmen

Seit Version 6.1 gibt es für neue Abrechnungen keine Eingabefelder und keine PDF-Zeilen mehr für sonstige Bareinnahmen oder Spenden. Neue 6.1-Daten mit einem positiven entsprechenden Zusatzwert werden serverseitig abgelehnt.

Für Kompatibilität können die technischen Felder `sonstigeEinnahmen: 0` und `einnahmenText: ""` weiterhin in neuen JSON-Dateien vorkommen. Das ist keine erneute Erfassung von Spenden.

Bei älteren importierten Abrechnungen bleiben bereits enthaltene Einnahmen und deren ursprüngliche Rechnung erhalten. Die App zeigt vorhandene positive Werte als Hinweis auf den Altbeleg an, ohne sie zur Bearbeitung freizugeben.

### 3.9 Verbindungstest, seit 6.3

Vereinscode exakt `TVB` → statt der Übermittlung läuft ein Verbindungstest. Der Browser legt keinen Übermittlungsversuch an (kein Eintrag `tvb_submission_v41`), sperrt das Formular nicht und verwendet eine Wegwerf-ID. Der Server (`/api/verbindungstest`) prüft nacheinander: Server erreichbar, Serverkonfiguration (Warnung, falls der echte Vereinscode selbst „TVB“ ist), Dropbox-Anmeldung per Refresh-Token, lesender Zugriff auf `/Abrechnungen` (fehlender Ordner ist kein Fehler; fehlendes Leserecht nur Warnung) und – wenn das Formular lokal vollständig gültig ist – Validierung plus Probe-PDF, das verworfen wird. Antwort enthält immer `test:true, gespeichert:false`; der Browser zeigt nur dann Erfolg und Konfetti. Ein Kassierer-Passwort wird dabei nicht übertragen. Die echte Übermittlung mit Code „TVB“ bleibt am Server abgelehnt, solange der echte Vereinscode anders lautet.

### 3.8 Oberfläche nach Apple-Richtlinien, seit 6.2

- Gruppierte Listen (Inset Grouped), Systemschrift, Tippflächen mindestens 44 pt, Hell- und Dunkelmodus über `prefers-color-scheme`, iPhone-Sicherheitsränder über `env(safe-area-inset-*)`.
- Mengen über Stepper (− Zahl +); Zeilen mit Menge werden in Vereinsrot hervorgehoben. Seit 6.3 auch für Scheine und Münzen, mit Teilsumme je Sorte; die Stepper-Knöpfe (`data-zaehl`) bleiben beim Kassierer-Import bedienbar.
- Segmentauswahl für Zählzuständigkeit und Zählart. Die ursprünglichen `select`-Felder `zaehlVerantwortung` und `zaehlmodus` bleiben als unsichtbare Datenquelle bestehen (und erscheinen im Druck).
- Quittungsbestätigung als Schalter.
- Ein einziger roter Hauptknopf „Abrechnung übermitteln“; PDF-Vorschau als zurückhaltender Knopf.
- Fehler erscheinen direkt unter dem betroffenen Feld (`feldFehler`), Hinweise als kurze Einblendung oben (`toast`), Rückfragen als Dialog (`bestaetigen`). Keine `alert()`/`confirm()` mehr.
- Lade-Kreisel bei Senden, Freigeben und PDF-Vorschau; Offline-Hinweis; ohne Verbindung wird kein Sendeversuch gestartet (und kein Versuch gezählt).
- Erfolgsanimation aus `assets/feier.js` ohne externe Bibliothek: offene Abrechnung = Konfetti mit orangem Uhr-Symbol, komplette Abrechnung = Feuerwerk mit grünem Haken. Läuft im Erfolgsdialog selbst (Canvas im Dialog, damit es über dem abgedunkelten Hintergrund liegt), nur nach bestätigtem Upload, nicht bei „Bewegung reduzieren“.

## 4. Artikel und Lieferantenpreise

Aktueller serverseitiger Katalog für Version 6.0/6.1; Beträge sind Kosten je eingegebener Einheit:

| Nr. | Artikel / Einheit | Lieferantenpreis |
| --- | --- | ---: |
| 1 | Bier/Radler/Alkoholfrei – 20er Kasten | 16,00 € |
| 2 | Bier/Radler/Alkoholfrei – 24er Kasten | 20,00 € |
| 3 | Bier/Radler/Alkoholfrei – Flasche | 0,80 € |
| 4 | Cola – 24er Kasten | 18,00 € |
| 5 | Cola – Flasche | 0,80 € |
| 6 | Hochwald Limo/Apfelschorle – 20er Kasten | 21,00 € |
| 7 | Hochwald Limo/Apfelschorle – Flasche 0,5 l | 1,10 € |
| 8 | Hochwald Sprudel – 20er Kasten | 16,00 € |
| 9 | Hochwald Sprudel – Flasche 0,5 l | 0,80 € |
| 10 | ISO Sport – 20er Kasten | 18,00 € |
| 11 | ISO Sport – Flasche | 0,90 € |
| 12 | Sekt – Flasche | 6,00 € |
| 13 | Hanuta/Duplo – Stück | 0,40 € |
| 14 | Chips – Packung | 1,00 € |
| 15 | Hugo / Aperol / Spritz – Dose | 1,00 € |

Verbindliche Quelle: `lib/abrechnung.js`, Export `ARTIKEL6`. Der historische Export `ARTIKEL` enthält zusätzlich Pfand mit 0,25 € und hat eine andere Positionszuordnung. Diese beiden Kataloge nicht versehentlich gleichsetzen.

Der Server übernimmt weder Artikelbezeichnungen noch Preise oder Summen ungeprüft aus dem Browser. Er ordnet die Mengen anhand der jeweiligen Version seinem festen Katalog zu und berechnet alles neu.

## 5. Kassenzählung und Rechenregeln

### 5.1 Zeitpunkt der Zählung

Der gezählte Bestand ist der Bargeldbestand:

1. nach dem Hallenverkauf,
2. nachdem die sonstigen Ausgaben bereits aus der Kasse bezahlt wurden,
3. bevor der Wareneinsatz und die Anteile für Mannschaft/Abteilung entnommen werden.

Eine andere Reihenfolge führt zu falschen Ergebnissen und lässt sich nicht allein durch die Software korrigieren.

### 5.2 Eingabe der Zählung

Entweder wird der Gesamtbetrag eingegeben oder jede Sorte Scheine/Münzen einzeln gezählt.

Aktuelle Stückelung:

`100 €, 50 €, 20 €, 10 €, 5 €, 2 €, 1 €, 0,50 €, 0,20 €, 0,10 €, 0,05 €, 0,02 €, 0,01 €`

500- und 200-Euro-Scheine werden bei neuen Vorgängen nicht mehr angeboten. Ältere Entwürfe mit diesen Scheinen werden zur Anzeige in einen Gesamtbetrag umgerechnet, damit kein Geldwert verloren geht.

Ein leeres Betragsfeld ist keine Kassenzählung. Tatsächlich gezählte **0,00 €** sind dagegen ein gültiger Wert und führen gegebenenfalls zu einem Fehlbetrag. Bei Stückelung rechnet der Server die Anzahlen selbst zusammen; ein zusätzlich übermittelter Gesamtbetrag ist nicht maßgeblich.

### 5.3 Formeln ab Version 6.1

Alle Geldberechnungen erfolgen intern in ganzen Cent.

| Symbol | Bedeutung |
| --- | --- |
| C | Bestand nach Kassenzählung |
| A | Bereits entnommene sonstige Ausgaben |
| G | Wareneinsatz plus Getränke |
| W | Anfangsbestand und neues Wechselgeld, fest 130,00 € |

```text
Zwischensumme vor Ausgaben = C + A
Einnahmen aus Verkauf      = C + A − 130,00 €
Endbestand                = C − G
Gewinn / Verlust          = C − G − 130,00 €
```

Die sonstigen Ausgaben werden für die Rekonstruktion der Verkaufseinnahmen hinzugerechnet. Sie werden nicht ein zweites Mal vom bereits um diese Ausgaben verminderten Kassenbestand abgezogen.

Bei alten 5.0/6.0-Daten mit separat bezeichneten Bareinnahmen S gilt für die Verkaufseinnahmen weiterhin `C + A − 130,00 € − S`. S war dabei bereits mitgezählt und wurde nicht noch einmal dem Bargeld hinzugefügt.

### 5.4 Aufteilung des Gewinns

- Grundaufteilung: 50 % Mannschaft, 50 % Abteilung.
- Der **gesamte Mannschaftsanteil** wird auf den nächstgelegenen 5-Euro-Betrag gerundet.
- Genau zwischen zwei Stufen wird aufgerundet.
- Die Abteilung erhält den **genauen verbleibenden Rest**, damit die Gesamtsumme aufgeht.
- Bei zwei Mannschaften wird der gerundete Mannschaftsanteil anschließend exakt halbiert. Es gibt keine zweite Rundung auf 5 Euro je Mannschaft.
- Beide Mannschaftsnamen und deren einzelne Beträge erscheinen im Beleg.

Beispiel: Gesamtanteil Mannschaften 105,00 € → zwei Mannschaften erhalten je 52,50 €.

Für positive Gewinne wird der Mannschaftsanteil in Cent so berechnet:

```js
Math.floor((gewinnCent + 500) / 1000) * 500
```

Bei null Gewinn oder Verlust gibt es keine Gewinnauszahlungen. Ein Fehlbetrag wird ausgewiesen. Der rechnerisch verbleibende Übertrag ist höchstens 130,00 € und bei unzureichendem Endbestand entsprechend geringer. Negative rechnerische Verkaufseinnahmen werden als Prüfhinweis angezeigt und nicht stillschweigend auf null gesetzt.

### 5.5 Rechenbeispiele aus der bisherigen Entwicklung

| Größe | Beispiel 1 | Beispiel 2 |
| --- | ---: | ---: |
| Gezählt | 386,40 € | 431,00 € |
| Sonstige Ausgaben | 0,00 € | 0,00 € |
| Wareneinsatz | 56,90 € | 57,50 € |
| Verkaufseinnahmen | 256,40 € | 301,00 € |
| Endbestand | 329,50 € | 373,50 € |
| Gewinn | 199,50 € | 243,50 € |
| Mannschaften gesamt | 100,00 € | 120,00 € |
| Abteilung | 99,50 € | 123,50 € |

Die beiden Papierbeispiele wurden zuvor zur Entwicklung der Version 5.0 herangezogen. Beim zweiten Beispiel war eine handschriftliche Differenz von einem Euro aufgefallen: Der korrekte Endbestand aus den übernommenen Eingaben ist 373,50 €, nicht 374,50 €. Die Software übernimmt die berechneten Werte. Die Beispiele sind keine Aussage über den tatsächlichen aktuellen Kassenbestand.

## 6. Bedienung: Hallendienst zählt

1. Hallendienst, Mengen und Ausgaben erfassen.
2. Geldentnahme/Quittungen bestätigen, soweit erforderlich.
3. „Hallendienst zählt“ auswählen.
4. Bestand eingeben oder Scheine/Münzen zählen.
5. Falls gewünscht, Auswertung und vollständige PDF-Vorschau mit Kassierer-Passwort freigeben.
6. Mit Vereinscode übermitteln.
7. Den bestätigten Erfolgsdialog abwarten und anschließend die berechneten Entnahmen durchführen.

Die normale Übermittlung durch den Hallendienst setzt kein vorheriges Öffnen der geschützten Auswertung voraus. Die vollständige PDF-Vorschau ist dagegen mit dem Kassierer-Passwort geschützt.

Dieser Weg erzeugt direkt die Dateien mit `_komplett`. Er benötigt keine vorherige offene JSON-Datei.

## 7. Bedienung: Kassierer zählt später

### 7.1 Hallendienst übermittelt zunächst offen

1. Hallendienst, Waren und Ausgaben erfassen.
2. „Kassierer soll zählen“ auswählen.
3. Mit Vereinscode übermitteln.
4. Der Erfolgsdialog bestätigt die Ablage eines **vorläufigen Belegs und einer offenen JSON**.

Der PDF-Beleg weist ausdrücklich auf die fehlende Kassenzählung hin. Endbestand, Gewinn und Auszahlungen werden nicht mit erfundenen Nullwerten als fertige Rechnung dargestellt.

### 7.2 Kassierer ergänzt die Zählung

1. Die **originale offene JSON** aus Dropbox auf das eigene Gerät herunterladen; nicht die PDF und nicht eine bereits komplette JSON wählen.
2. Oben „JSON-Abrechnung laden“ drücken.
3. Im dort geöffneten Feld das Kassierer-Passwort eingeben und freigeben.
4. Die JSON-Datei auswählen und das Ersetzen des bisherigen Formularinhalts bestätigen.
5. Die App lässt die Echtheit der Vorlage serverseitig prüfen.
6. Datum, Name, Mannschaften, Waren, Ausgaben und Bemerkungen bleiben gesperrt. Nur die Kassenzählung ergänzen.
7. Auswertung prüfen und „Komplette Abrechnung übermitteln“ drücken.
8. Die Bestätigung für PDF **und** JSON abwarten.

Der Abschluss verwendet dieselbe Vorgangsnummer und denselben lesbaren Ordner wie die offene Vorlage. Die Dateien bekommen zusätzlich `_komplett`. Die offenen Originaldateien bleiben erhalten.

Für diesen geprüften Kassierer-Abschluss werden Kassierer-Passwort und Vorlagennachweis verwendet; der Vereinscode muss nicht noch einmal eingegeben werden.

Importiert werden nur offene, serverseitig signierte Datensätze aus Version 6.0 oder 6.1. Vollständige Vorgänge und ältere 5.0-Dateien werden über diese Funktion nicht erneut zur Bearbeitung geöffnet.

Nach Neuladen der App ist die Passwortfreigabe erneut nötig. Der importierte Entwurf kann lokal erhalten bleiben. Ein noch laufender oder unbestätigter Übermittlungsversuch muss abgeschlossen werden, bevor eine andere JSON geladen wird.

## 8. PDF-Belege und Vorschau

Die anfängliche lokale Druckansicht wurde durch eine serverseitige PDF-Vorschau ersetzt. Bei unveränderten Daten erzeugen Vorschau und Übermittlung denselben PDF-Inhalt. Die Vorschau benötigt Internet und legt selbst keine Dateien in Dropbox an.

Gestaltung neuer Belege:

- „TVB Hallenverkauf“ hervorgehoben/fett.
- Saison 2026/2027 und Vereinsbezeichnung „Turnverein Birkenfeld · Abteilung Handball“.
- Versionsangabe.
- Transparenter Vereinswappen-Rand ohne weiße rechteckige Fläche.
- Weißer, druckerfreundlicher Kopf statt eines großen roten Flächenbalkens.
- Rote Akzente und Überschriften bleiben erhalten.
- Größere Kopfdaten mit festen Beschriftungs- und Wertespalten: Datum, Mannschaft, Name.
- Trennlinien und mehr Abstand bei Summen.
- Feste Spalten für Menge, Multiplikationszeichen, Artikel und Betrag.
- Bestand nach Kassenzählung fett.
- Mannschaftsauszahlungen mit Namen und gegebenenfalls zwei Teilbeträgen.
- Vorgangsnummer klein im Fußbereich, zusammen mit Seitenangaben.

Bei vollständiger Rechnung steht vorne die Kassenauswertung; anschließend folgen Waren, Ausgaben, gegebenenfalls Stückelung und Bemerkungen. Normale vollständige Belege passen typischerweise auf zwei A4-Seiten. Lange Texte oder viele Ausgaben werden auf weitere Seiten umgebrochen. Ein vorläufiger Beleg kann kürzer sein.

Die PDF wird ohne große Laufzeitbibliothek mit einem eigenen PDF-1.7-Schreiber erzeugt. Die Noto-Sans-Schrift liegt vorkomprimiert vor. Schriftmetriken und Wappen sind vorbereitet; die Schriftdatei wird vor Verwendung anhand ihrer Prüfsumme kontrolliert. Das reduziert Laufzeitarbeit auf Workers Free.

## 9. Dropbox-Ablage und Dateinamen

Beispiel für einen neuen 6.1-Vorgang:

```text
Abrechnungen/
└── V6_1/
    ├── _Vorgaenge/
    │   └── technische Sperrdateien
    └── 2026-11-12_Hallenverkauf_Damen 1/
        ├── 2026-11-12_Hallenverkauf_Damen 1.json
        ├── 2026-11-12_Hallenverkauf_Damen 1.pdf
        ├── 2026-11-12_Hallenverkauf_Damen 1_komplett.json
        └── 2026-11-12_Hallenverkauf_Damen 1_komplett.pdf
```

Die Darstellung zeigt den zweistufigen Weg. Bei direkter Zählung durch den Hallendienst entstehen nur die kompletten Dateien.

Regeln:

- Datum zuerst, dann `Hallenverkauf`, dann Mannschaft(en).
- Der Ordnername entspricht dem Basisdateinamen ohne Erweiterung und ohne `_komplett`.
- Bei zwei Mannschaften stehen beide im Namen. Zeichen wie `/` werden durch zulässige Ersatzzeichen ersetzt.
- Namen werden normalisiert und begrenzt; bei neueren Versionen wird zusätzlich die UTF-8-Länge berücksichtigt.
- Verschiedene Vorgänge mit gleichem Datum und Team erhalten getrennte Ordner, beispielsweise mit ` (2)` oder ` (3)`. Der Zusatz erscheint entsprechend auch im Dateinamen.
- Der Code prüft bis zu 30 Namenskandidaten und meldet danach einen Konflikt.
- Offene 6.0-Datensätze werden weiter unter `V6_0` abgeschlossen; sie werden nicht in `V6_1` verschoben.
- Ältere Versionen behalten ihre historischen Ablagepfade.
- Ein zusätzlicher leerer historischer Ordner `V4_1` kann durch die gemeinsame Ordnerinitialisierung entstehen; er bestimmt nicht die Version eines aktuellen Belegs.

Die automatisch gespeicherte JSON bleibt notwendig für Archivierung und späteren Kassierer-Abschluss. Entfernt wurde früher nur der manuelle Knopf „Datensicherung JSON“, nicht die serverseitige JSON-Ablage.

## 10. Wiederholungen und Schutz gegen doppelte Ablage

Jeder Vorgang erhält eine UUID. Der Browser speichert einen begonnenen Übermittlungsversuch lokal und verwendet für Wiederholungen dieselbe Nummer sowie denselben festgeschriebenen Inhalt.

Ablauf auf dem Server:

1. Herkunft und Datenformat prüfen; eingehende Datenmenge begrenzen.
2. Eingaben validieren, Preise und Ergebnisse neu berechnen.
3. Erforderliche Berechtigungen und gegebenenfalls Vorlagensignatur prüfen.
4. PDF vollständig erzeugen, bevor der erste Dropbox-Schreibvorgang erfolgt.
5. Dropbox-Zugriff über Refresh-Token aufbauen.
6. Ausgangsdaten, Übermittlungsstufe und Ordnerzuordnung durch technische Dateien festschreiben.
7. JSON hochladen und die zurückgegebenen Metadaten prüfen.
8. PDF hochladen und ebenfalls prüfen.
9. Erst danach Erfolg zurückmelden.

Für Version 6.x werden unter `_Vorgaenge` unter anderem gespeichert:

| Datei | Zweck |
| --- | --- |
| `<id>.basis.lock` | Unveränderliche Ausgangsdaten ohne spätere Zählung |
| `<id>.offen.lock` | Festgeschriebener offener Datensatz |
| `<id>.komplett.lock` | Festgeschriebener kompletter Datensatz |
| `Ordner_<Basisname>.lock` | Belegung eines lesbaren Ordnernamens durch eine Vorgangsnummer |

Diese `.lock`-Dateien sind normale gespeicherte technische Inhalte. Der Schutz entsteht durch konfliktgeprüftes Anlegen mit unveränderlichem Inhalt, nicht durch ein externes Datenbanksystem.

Dropbox-Dateien werden mit `mode: add`, ohne automatisches Umbenennen und ohne Überschreiben abweichender Inhalte gespeichert. Bei identischem Inhalt kann dieselbe Ablage bestätigt werden. Geprüft werden Inhaltsprüfsumme, Dateigröße, Pfad und nichtleere Revision.

Die Dropbox-Inhaltsprüfsumme wird nach dem blockweisen SHA-256-Verfahren mit 4-MiB-Blöcken erzeugt. Sie ist von der HMAC-Signatur der JSON zu unterscheiden.

Netzwerkzugriffe haben je Versuch einen Abbruchtimer von 8 Sekunden. Netzfehler, HTTP 429 und Serverfehler werden begrenzt wiederholt, insgesamt höchstens drei Versuche je angefragtem Vorgang. Kurze `Retry-After`-Angaben werden berücksichtigt; längere Sperren werden einem späteren manuellen Wiederholungsversuch überlassen. Zwischen Wiederholungen liegt eine kurze ansteigende Wartezeit mit Zufallsanteil.

**Bei unklarer Übermittlung:** denselben Vorgang erneut senden. Nicht die Browserdaten löschen, nicht auf einem zweiten Gerät einen neuen Vorgang mit neuer Nummer nachbauen und nicht technische Dateien löschen. Eine Teilspeicherung ist möglich, aber kein bestätigter Gesamterfolg; der nächste gleiche Versuch soll die fehlende Datei ergänzen.

Auch eine bereits begonnene komplette Stufe ist inhaltlich festgeschrieben. Eine nachträgliche Änderung desselben Vorgangs ist keine unterstützte Korrekturfunktion. Bei einem echten Eingabefehler die Berichtigung mit dem Kassierer abstimmen.

## 11. Passwörter, Signaturen und Identität

### 11.1 Zwei unterschiedliche Zugänge

| Zugang | Aufgabe |
| --- | --- |
| Vereinscode | Normale Übermittlung durch den Hallendienst |
| Kassierer-Passwort | Freigabe der Auswertung, vollständige PDF-Vorschau, Import und geprüfter späterer Abschluss |

Das Passwort wird auf dem Server geprüft und ist nicht als fester Wert im HTML oder JavaScript hinterlegt. Im Browser bleibt die Freigabe im Arbeitsspeicher der aktuellen Sitzung. Der Wert wird nicht in `localStorage` oder in die exportierte JSON geschrieben. Nach Neuladen bzw. explizitem Sperren erneut anmelden.

### 11.2 Signatur offener Vorlagen

Die serverseitig geprüfte JSON erhält `pruefung` mit Verfahren `HMAC-SHA256` und einer Signatur. Als Grundlage dient eine kanonische JSON-Darstellung mit sortierten Objektschlüsseln. Der Schlüssel wird aus dem vorhandenen serverseitigen `DROPBOX_APP_SECRET` mit einem eigenen Kontextpräfix gebildet.

Beim Import werden die Eingaben zuerst erneut validiert und die Signatur geprüft. Inhaltliche Änderungen an der offenen Vorlage werden abgelehnt. Vom Client mitgelieferte abgeleitete Summen gelten nicht als verbindliche Eingaben und werden neu berechnet.

Für den Abschluss wird der Nachweis der offenen Ausgangsbasis mitgeführt. Die Kassenzählung darf ergänzt werden; Datum, Mannschaften, Waren und andere Ausgangsdaten dürfen nicht geändert werden. Die Sperrdateien sichern diese Vorgabe zusätzlich über die Ablage ab.

**Betriebliche Konsequenz:** Ein Wechsel von `DROPBOX_APP_SECRET` kann die Signaturprüfung noch offener Vorlagen ungültig machen. Vor einer solchen Änderung den Umgang mit offenen Abrechnungen planen. Das bloße Ändern des Kassierer-Passworts ist davon zu unterscheiden.

### 11.3 Keine persönliche Identitätsprüfung

Der Name ist frei eingegeben. Weder der Vereinscode noch das gemeinsame Kassierer-Passwort identifizieren eine einzelne Person zuverlässig. Betriebssystem-Anmeldenamen, Apple-IDs oder vermeintlich verifizierte Smartphone-Namen werden nicht automatisch ausgelesen.

Für eine persönliche Zuordnung wären individuelle Konten oder ein eigener Anmeldeablauf nötig. Dies ist bislang nicht implementiert. Eine gesperrte Ergebnisanzeige ist außerdem kein Schutz vor dem selbstständigen Nachrechnen bekannter Eingaben.

## 12. Technischer Aufbau und Dateien

Die Anwendung ist eine statische HTML-/JavaScript-Oberfläche mit Cloudflare Pages Functions. Es gibt kein Frontend-Framework und keine erforderlichen Laufzeitpakete in `package.json`. Node.js ab Version 22 wird für Build und Tests verwendet.

| Datei / Bereich | Verantwortung |
| --- | --- |
| `index.html` | Oberfläche, Mannschafts- und Ausgabenlisten, Mengen, Entwürfe, Vorschau und Übermittlung |
| `assets/ablauf.js` | Zentrale Versionskonstanten, Kassierer-Freigabe (Sheet), JSON-Import, Vorlagenschutz, Migration alter Stückelung |
| `assets/feier.js` | Konfetti/Feuerwerk nach bestätigter Übermittlung (seit 6.2, ohne externe Bibliothek) |
| `lib/abrechnung.js` | Verbindlicher Artikelkatalog, Eingabeprüfung, Normalisierung, Ergebnisdaten |
| `lib/kasse.js` | Gemeinsame Cent-Berechnung und aktuelle Stückelung für Browser und Server |
| `lib/kasse-v50.js` | Eingefrorene Rechen-/Zählregeln für historische 5.0-Daten |
| `lib/belegschutz.js` | Kanonische JSON, HMAC, offene Ausgangsbasis |
| `lib/dropbox.js` | Refresh-Token-Zugriff, begrenzte Wiederholung, Ordner/Dateien, Inhaltsprüfsumme |
| `lib/dateiname.js` | Sichere lesbare Datei- und Ordnernamen |
| `lib/pdf.js` | PDF-Generator für neue 6.1-Belege |
| `lib/pdf-v60.js` | Eingefrorener 6.0-PDF-Generator |
| `lib/pdf-v50.js`, `lib/pdf-v45.js`, `lib/pdf-v44.js`, `lib/pdf-v43.js`, `lib/pdf-v42.js` | Frühere PDF-Fassungen in der Kompatibilitätskette |
| `lib/pdf-font.js` | Vorbereitete Schriftmetriken und Prüfsumme |
| `lib/wappen.js` | Für PDF vorbereitete Wappenbilddaten inklusive Transparenz |
| `assets/fonts/NotoSans.deflate`, `OFL.txt` | Vorkomprimierte Schrift und Lizenz |
| `assets/tvb-wappen.svg` | Wappen der Webseite |
| `functions/api/submit.js` | Übermittlung, Rechteprüfung, PDF/JSON-Ablage, gemeinsame Serverfunktionen |
| `functions/api/preview.js` | Geschützte bzw. vorläufige PDF-Vorschau ohne Dropbox-Schreibvorgang |
| `functions/api/kassierer.js` | Prüfung des Kassierer-Zugangs |
| `functions/api/import.js` | Prüfung offener signierter JSON-Dateien |
| `functions/api/verbindungstest.js` | Verbindungstest mit Testcode „TVB“: prüft Server, Secrets, Dropbox-Anmeldung, lesenden Zugriff (`files/get_metadata`) und optional die PDF-Erzeugung; schreibt nie in Dropbox |
| `functions/api/health.js` | Status- und Konfigurationsindikatoren ohne Secret-Werte |
| `functions/api/dropbox/*` | Historische Einrichtungsendpunkte, aktuell deaktiviert |
| `scripts/build.mjs` | Statischen Ordner `public` erzeugen und gemeinsame Kassenlogik für Browser bereitstellen |
| `_headers` | Unter anderem `nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` |
| `_routes.json` | Pages-Functions-Routen unter `/api/*` |
| `tests/submission.test.js` | 34 vorhandene automatisierte Funktionstests |
| `README.md` | Bedien- und Aktualisierungsanleitung für den jeweiligen Stand |
| `PROJEKTDOKUMENTATION.md` | Diese übergreifende Übergabedokumentation |

Weitere Arbeits- oder Zwischenstände wie `lib/pdf-font.json`, `lib/pdf-legacy.js`, `tmp/` oder lokal installierte Werkzeuge können im Arbeitsordner vorhanden sein. Ihre bloße Existenz bedeutet nicht, dass sie Bestandteil des aktuellen 43-Dateien-Upload-Pakets sind.

### 12.1 Build

```bash
npm run build
```

Der Build erzeugt `public` neu, kopiert die vorgesehenen HTML-, Icon-, Schrift- und Konfigurationsdateien und stellt aus `lib/kasse.js` die Browserdatei `public/assets/kasse.js` bereit. Die exportierten gemeinsamen Funktionen sind dort über `globalThis.TVBKasse` verfügbar.

Nur die gezielt kopierten Dateien werden als statische Webseite veröffentlicht. Serverseitige Bibliotheken und Cloudflare-Secrets werden nicht als öffentliche Dateien in `public` kopiert.

### 12.2 Lokaler Browser-Speicher

| Schlüssel | Bedeutung |
| --- | --- |
| `tvb_hallenverkauf_v4_basis` | Aktueller Entwurf |
| `tvb_submission_v41` | Festgeschriebener Übermittlungsversuch mit Status und Daten |
| `tvb_kassierer_import_v6` | Importkontext mit Vorgangsnummer und Nachweis der offenen Vorlage |
| `tvb_pending_submission_id` | Historischer Schlüssel, den der neue Ablauf noch berücksichtigt |

Die alten Versionsnummern in den Schlüsseln sind absichtlich nicht fortlaufend umbenannt worden, damit vorhandene Entwürfe/Übermittlungen nicht verloren gehen. Sie zeigen nicht die aktuell veröffentlichte Version an.

## 13. Schnittstellen und Datenmodell

### 13.1 Endpunkte

| Methode / Pfad | Zweck |
| --- | --- |
| `GET /api/health` | Version und ausgewählte Konfigurationsindikatoren |
| `POST /api/preview` | Server-PDF als Antwort, ohne Dateien in Dropbox anzulegen |
| `POST /api/submit` | Validieren und beide Dateien bestätigt ablegen |
| `POST /api/kassierer` | Kassierer-Passwort prüfen |
| `POST /api/import` | Offene Vorlage prüfen und normalisierte Daten mit Abschlussnachweis liefern |
| `/api/dropbox/setup`, `/api/dropbox/callback`, `/api/dropbox/test` | Aktuell HTTP 410: Einrichtung abgeschlossen, Endpunkt deaktiviert |

Für die schreibenden/geschützten POST-Schnittstellen wird die Herkunft gegen die eigene URL geprüft und JSON erwartet. Die tatsächliche eingehende Größe wird auf 50.000 Byte begrenzt, nicht nur anhand eines vom Client angegebenen Headers.

`/api/health` prüft nicht den erfolgreichen Dateiupload und enthält aktuell keinen eigenen Indikator für `TVB_KASSIERER_PASSWORT`. „Server online“ ersetzt daher weder den Passworttest noch einen Dropbox-Funktionstest.

### 13.2 Zentrale Eingabe- und Ergebnisfelder

| Feld | Inhalt |
| --- | --- |
| `id` | UUID des Vorgangs, außerhalb der übertragenen `abrechnung` |
| `abrechnung.version` | Datensatz-/Belegversion, aktuell neu `6.1` |
| `datum` | Kalenderdatum im Format `YYYY-MM-DD` |
| `mannschaften` | Eine oder zwei Mannschafts-/Gruppenbezeichnungen |
| `mannschaft` | Vom Server abgeleitete zusammengefasste Bezeichnung |
| `person` | Name der verantwortlichen Person |
| `waren` | Mengen, nach Validierung auch feste Bezeichnungen/Preise und Summen |
| `ausgaben` | Ausgabentext und Betrag |
| `quittungen` | Bestätigung von Geldentnahme und Quittungsablage |
| `bemerkung` | Freier Bemerkungstext |
| `kassenVerantwortung` | `hallendienst` oder `kassierer` |
| `kasse.modus` | `betrag`, `stueckelung` oder bei offenem Vorgang `ausstehend` |
| `kasse.bestand` | Tatsächlich gezählter Betrag, bei offenem Vorgang nicht vorhanden |
| `kasse.stueckelung` | Anzahl je Stückelungsposition, wenn verwendet |
| `abschlussstatus` | Vom Server ermitteltes `offen` oder `komplett` |
| `summen` | Neu berechnete Wareneinsatz-/Ausgabensummen |
| `kassenabrechnung` | Cent-Ergebnisse; bei offenem Vorgang nicht vorhanden |
| `pruefung` | Verfahren und HMAC-Signatur der serverseitig erzeugten Daten |

Vereinscode, Kassierer-Passwort und Abschlussnachweis werden getrennt für die jeweilige Anfrage übertragen. Der Passwortwert wird nicht Teil der gespeicherten Abrechnung.

Die Antwort `status: vollständig` bedeutet technisch, dass das jeweilige PDF/JSON-Paar bestätigt ist. Für die fachliche Unterscheidung zusätzlich `abrechnungsstatus: offen` bzw. `komplett` betrachten. Eine offene Abrechnung kann also vollständig übertragen, aber fachlich noch nicht abgeschlossen sein.

### 13.3 Wichtige Validierungen

- Gültige UUID-v4-Schreibweise und reales Kalenderdatum.
- Bei 6.x exakt 15 Artikelpositionen des passenden Katalogs.
- Ganzzahlige Mengen zwischen 0 und 10.000.
- Höchstens 50 Ausgaben; einzelne Beträge nicht negativ, höchstens zwei Nachkommastellen.
- Eine oder zwei unterschiedliche Mannschaften, höchstens 55 Zeichen je Name.
- Pflichtname, begrenzte Textlängen und keine unzulässigen Steuerzeichen.
- Ausgaben über null erfordern die Quittungs-/Entnahmebestätigung.
- Kassenzählung bzw. gültiger offener Kassierer-Modus.
- Keine zusätzlichen Spendenwerte in neuen 6.1-Daten.
- Keine Übernahme manipulierter Preise oder berechneter Endwerte.
- Nicht unterstützte PDF-Zeichen werden vor dem Dropbox-Schreiben abgefangen.

## 14. Cloudflare und manuelles Veröffentlichen

### 14.1 Bisherige Projektkonfiguration

| Einstellung | Vorgesehener Wert |
| --- | --- |
| Projekt | `tvb-hallenverkauf` |
| Build Command | `npm run build` |
| Build Output Directory | `public` |
| Node.js | Mindestens Version 22 |
| Produktionsbranch | Im bisherigen Ablauf `main` |
| Tarif | Nach Nutzerangabe Workers Free |

Die ganz am Anfang erwähnte leere Build-Eingabe und das Ausgabeverzeichnis `.` sind nicht die vorgesehene Konfiguration der späteren vollständigen Pakete.

### 14.2 Secret-Namen, ohne Werte

| Secret | Zweck |
| --- | --- |
| `DROPBOX_APP_KEY` | Dropbox-Appkennung für Token-Anfrage |
| `DROPBOX_APP_SECRET` | Dropbox-Appsecret; außerdem Schlüsselgrundlage der Vorlagensignatur |
| `DROPBOX_REFRESH_TOKEN` | Erneuerbarer Dropbox-Zugriff |
| `TVB_VEREINSCODE` | Normale Vereinscode-Prüfung |
| `TVB_KASSIERER_PASSWORT` | Seit 6.0 für Kassierer-Freigabe, Import und Abschluss erforderlich |
| `TVB_SETUP_KEY` | Historische Einrichtung; kann weiter vorhanden sein, Endpunkte derzeit deaktiviert |

Bereits für 6.0 eingerichtetes `TVB_KASSIERER_PASSWORT` für 6.1 unverändert weiterverwenden. Wenn es fehlt: in Cloudflare beim Projekt unter **Settings → Variables and Secrets** für **Production** als **Secret** anlegen. Den gewünschten Wert nur dort eingeben. Für Preview-Deployments die Umgebung separat konfigurieren, falls diese genutzt werden soll.

Diese Dokumentation benötigt und enthält keinen tatsächlichen Wert. Auch keine `.env`-/`.dev.vars`-Datei mit Werten in das Upload-Paket oder GitHub aufnehmen.

### 14.3 Update Schritt für Schritt

1. Das vollständige ZIP der gewünschten Version entpacken.
2. GitHub-Repository öffnen und zur obersten Dateiliste wechseln.
3. **Add file → Upload files** wählen.
4. Den Inhalt des entpackten Anwendungsordners hochladen: Dateien und Unterordner gemeinsam, vorhandene Dateien ersetzen.
5. Nicht die ZIP selbst und nicht einen zusätzlichen umschließenden Ordner hochladen.
6. Änderungen gemeinsam committen.
7. In Cloudflare den zum neuen Commit gehörenden Build abwarten.
8. Den neuesten erfolgreichen Produktionsstand prüfen; ein älterer grüner Build bestätigt nicht automatisch den gerade fehlgeschlagenen Commit.
9. Webseite neu laden. Offene alte Übermittlungsversuche zuerst abschließen, dann bei Bedarf „Neue Abrechnung“ wählen.
10. Einen eindeutig gekennzeichneten Test mit dem Kassierer abstimmen und beide Dateien in Dropbox prüfen.

Für Version 6.1 ist kein weiterer Upload bei Cloudflare erforderlich, wenn die GitHub-Verbindung und automatische Deployments weiter aktiv sind. Werden Secrets erst nach einem Deployment geändert/ergänzt, anschließend erneut deployen.

Die reale CPU-Zeit und das Verhalten auf dem echten iPhone bzw. am echten Dropbox-Konto bleiben Prüfungen nach Veröffentlichung. Ein Tarifwechsel ist kein automatisch autorisierter Teil eines Updates.

## 15. Wappen, iPhone-Icon und mobile Bedienung

Das bereitgestellte runde TVB-Wappen sollte außerhalb des Kreises transparent sein. Für die Webseite wird die SVG verwendet. Für das PDF gibt es vorbereitete Bild- und Alphadaten. Der weiße rechteckige Außenbereich wurde damit vermieden.

Das Home-Bildschirm-Icon ist technisch ein eigener Anwendungsfall: Dafür wurden dedizierte quadratische PNGs mit rotem Hintergrund vorbereitet. Das ist nicht derselbe Transparenzwunsch wie beim freigestellten Wappen im Seiteninhalt.

Vorhandene Dateien:

- `apple-touch-icon.png` und `apple-touch-icon-precomposed.png` im Web-Stamm.
- Browser-Icon `assets/icon-32.png`.
- Weitere Icon-Dateien mit 180×180 und 100×180 Pixeln.
- Manifest-Icons `assets/app-icon-192-v44.png` und `assets/app-icon-512-v44.png`.
- `manifest.webmanifest` mit Startadresse `/`, deutschem Namen und Darstellung `standalone`.

Die 100×180-Datei ersetzt kein quadratisches Apple-Touch-Icon. Das historische `v44` in den Icon-Dateinamen ist beabsichtigt und kein Hinweis auf eine alte Rechenversion.

Bisheriges Vorgehen bei falschem iPhone-Icon: alte Home-Verknüpfung entfernen, die normale HTTPS-Startadresse direkt in Safari öffnen/neu laden und über **Teilen → Zum Home-Bildschirm** neu hinzufügen. Die tatsächliche Darstellung muss am betroffenen iPhone überprüft werden. Wegen gespeicherter Vorgänge keine Browserdaten pauschal löschen.

Für die Bedienung gilt `touch-action: manipulation` auf Bedienelementen und mindestens 16-px-Eingabeschrift. Damit soll störender Doppeltipp-/Fokus-Zoom vermieden werden; Pinch-Zoom wird nicht generell deaktiviert.

## 16. Dropbox-Meldungen am Mac

Als Benachrichtigungsweg wurde die Dropbox-Desktop-Mitteilung am Mac gewählt, keine zusätzliche E-Mail-Lösung.

- JSON und technische Dateien werden mit unterdrückten Dropbox-Mitteilungen hochgeladen.
- Der PDF-Upload unterdrückt Dropbox-Mitteilungen nicht (`mute: false`).
- Die PDF wird nach der bestätigten JSON übertragen.
- Dropbox muss am Mac laufen; die entsprechenden Mitteilungen müssen in Dropbox/macOS erlaubt sein.
- Ob und mit welchem Wortlaut eine Meldung erscheint, hängt von Dropbox und den lokalen Einstellungen ab.
- Die App sendet keine eigene native macOS-Mitteilung und keine E-Mail.

Auch das PDF einer **offenen** Abrechnung kann eine Meldung auslösen. Eine Mac-Meldung allein sagt deshalb nicht aus, dass bereits gezählt wurde. Dafür den App-Status bzw. `_komplett` prüfen.

## 17. Versionsgeschichte

Die Tabelle fasst die hier dokumentierten Entwicklungsschritte zusammen. Maßgeblich für einen konkreten alten Vorgang bleiben dessen Datensatzversion und eingefrorener PDF-Generator. Frühere Anleitungsdateien enthalten teilweise übernommene Abschnitte älterer Versionen; Pfad- oder Versionsangaben daraus nicht ungeprüft als aktuelle Vorgabe verwenden.

| Stand | Wesentliche Änderungen |
| --- | --- |
| Vor 4.1 | Bestehende Ausgaben-App; JSON-Ablage in Dropbox wurde vom Nutzer als funktionierend bestätigt. |
| 4.1 | Serverseitige validierte PDF-Erstellung; PDF und JSON gemeinsam archivieren; bestätigte Übermittlung und robuste Wiederholung/Idempotenz; Cloudflare-Kompatibilitätskorrekturen. |
| 4.1-Ergänzung | Dose Hugo/Aperol/Spritz für 1 €, Ausgaben-Vorschläge, Wappen/Transparenz; manueller JSON-Sicherungsbutton entfällt, automatische JSON bleibt. |
| 4.2 | Einheitliche Server-PDF für Vorschau und Versand; lesbare Dateinamen; größere Kopfdaten, Trennlinien und Mengenabstände; Plus-/Minus-Bedienung; Dropbox-Mac-Meldungen für PDF. |
| 4.3 | Formular- und Mobilverbesserungen: echte Ausgaben-Auswahl statt unzuverlässiger Vorschläge, Bestätigung mit Geldentnahme, Symbole, einheitliche Feldhöhen, Erfolgsdialog und druckerfreundlicher PDF-Kopf; Icon-Dateien. |
| 4.4 | Überarbeitete Home-Bildschirm-Icons; getrennte Würstchen/Brötchen und erweiterte Ausgabenarten; vollständige Mannschaftsauswahl mit freier Eingabe und zweitem Team. |
| 4.5 | Fett hervorgehobener Belegtitel; Datum/Mannschaft/Name in festen Spalten; mehr Abstand an Gesamtsummen; Saison und Handballabteilung; Klarstellung zur nicht verifizierten Absenderidentität. |
| 5.0 | Kassenzählung und gemeinsamer Auswertebogen; Anfangsbestand 130 €; Verkauf, Endbestand, Gewinn, 50/50-Aufteilung und 5-Euro-Rundung; lesbare Dropbox-Ordner; Abgleich mit Papierbeispielen. |
| 6.0 | Wareneinsatz plus Getränke ohne neues Pfand; Hallendienst oder spätere Kassierer-Zählung; keine 500-/200-Euro-Scheine; geschützte Auswertung; signierter offener JSON-Import; zweistufiger Abschluss und `_komplett`; fette Kassensumme, namentliche gleiche Aufteilung bei zwei Teams. |
| 6.1 | Neue Spenden-/Bareinnahmenerfassung entfällt; JSON-Laden und Neue Abrechnung zusätzlich oben; Passwortfeld für Import oben; Bezeichnung „Kassierer soll zählen“; alte Vorlagen bleiben kompatibel. |
| 6.2 | Reines Oberflächen-Update, Datenformat bleibt 6.1: Apple-Gestaltung mit Dunkelmodus, Menü „⋯“ mit Kassierer-Sheet, ein Hauptknopf, Konfetti/Feuerwerk nach Erfolg, Feldfehler statt Popups, Lade-Kreisel, Offline-Hinweis, zentrale Versionskonstanten. |
| 6.3 | Scheine/Münzen mit Plus-/Minus-Stepper und Teilsummen; Verbindungstest mit Vereinscode „TVB“ über `/api/verbindungstest` (Server, Konfiguration, Dropbox-Anmeldung, lesender Ablagezugriff, optional Probe-PDF) ohne jede Speicherung, mit Konfetti; 37 Tests. |

## 18. Prüfungen und ihr Aussageumfang

Für den zuletzt erstellten Stand 6.1 wurden im bisherigen Entwicklungsverlauf dokumentiert:

- **34 erfolgreiche automatisierte Funktionstests**.
- Erfolgreicher statischer Build.
- Erfolgreiches lokales Kompilieren der Cloudflare Pages Functions mit Wrangler.
- Erfolgreiche getrennte Browserprüfung mit echten lokalen Serverfunktionen und **nachgebildeter Dropbox**, ohne echte Vereinsabrechnungen zu übertragen.
- Prüfung von oberen Knöpfen und Passwortfokus, beiden Zählwegen, gesperrten Importdaten, Neuladen ohne gespeichertes Passwort, Teilfehler und Wiederholung, gleicher Vorgangsnummer sowie Handybreite.
- Gerenderte und visuell geprüfte Muster-PDFs, einschließlich vollständiger und offener Belege; im früheren 6.0-Durchlauf auch ein umfangreicher mehrseitiger Fall.
- ZIP-Integrität und Build des entpackten 6.1-Pakets.

Die 34 Tests sind in `tests/submission.test.js` enthalten. Sie decken unter anderem ab:

1. Manipulierte Preise, Bezeichnungen und Summen werden nicht übernommen.
2. Ungültige Kalenderdaten, Mengen, Texte, Beträge und Bestätigungen werden abgelehnt.
3. PDF-Erstellung ist deterministisch; lange Inhalte werden umgebrochen.
4. Fehlende/defekte Schrift oder ungeeignete Zeichen verhindern einen bestätigten Upload.
5. Erfolg nur bei bestätigtem PDF/JSON-Paar.
6. Teilupload, verlorene Antwort, gleiche Wiederholung und Konflikte.
7. Gleichzeitige Vorgänge und Namenskollisionen.
8. Begrenzte Wiederholungen und `Retry-After`.
9. Gleichheit zwischen PDF-Vorschau und übermitteltem PDF.
10. Historische Versionen, Kataloge, Pfand und Preiszuordnung.
11. Beide Papier-Rechenbeispiele, Spenden in Altversionen, Ausgaben und Stückelung.
12. Rundungsgrenzen, Restbeträge und Fehlbeträge.
13. Passwortprüfung, fehlende Serverkonfiguration und manipulierte Importvorlagen.
14. Signierter zweistufiger Abschluss und namentliche Halbierung bei zwei Teams.
15. Neue 6.1-Regeln ohne Spenden und unveränderte Unterstützung signierter 6.0-Daten.

Befehle für eine erneute lokale Prüfung:

```bash
npm test
npm run build
```

Wrangler wurde lokal als Entwicklungswerkzeug zum Kompilieren eingesetzt. Es ist keine Anwendungs-Laufzeitabhängigkeit im Upload-Paket. Die lokalen Browser-Hilfsskripte unter `tmp/ui/` verwenden einen maschinenspezifischen Playwright-/Chrome-Pfad und gehören nicht zu einer portablen Produktionsinstallation.

Die obigen Erfolge sind der protokollierte Stand der bisherigen Entwicklung. Für die reine Erstellung dieses Markdown-Dokuments wurden Code und Anleitungen gelesen, aber kein neuer Livetest, keine Veröffentlichung und keine erneute komplette Testsuite durchgeführt.

## 19. Bekannte Fehler und ihre Behebung

| Beobachtung | Ursache / bisherige Lösung |
| --- | --- |
| Buildfehler `Expected ";" but found "with"` an `pdf.js` | Der damals verwendete Bundler akzeptierte den JSON-Import mit `with {type:'json'}` nicht. Endgültig werden Schriftmetriken als JavaScript-Modul `pdf-font.js` importiert. Diese Korrektur erhalten. |
| Dropbox-Verbindungsfehler `TypeError` trotz vorhandener Secrets | Cloudflare-`fetch` darf nicht mit der Dropbox-Klasseninstanz als Empfänger aufgerufen werden. Der Client verwendet `(0, this.fetcher)(...)`. Nicht zu `this.fetcher(...)` zurückändern. |
| Unklare Netzwerkabbrüche | Begrenzte Wiederholungen sowie expliziter `AbortController` mit Timer; gleicher Vorgang kann erneut gesendet werden. |
| Erneut gestarteter alter Commit schlägt weiter fehl | Ein Retry eines alten Deployments ersetzt dessen Quellcode nicht. Den Build zum neuen korrigierten Commit prüfen. |
| Formular mit Textfeld zeigt die gewünschten Vorschläge nicht | `datalist` durch ein echtes natives Auswahlmenü mit zusätzlicher freier Eingabe ersetzt. |
| Weißes Rechteck um das Wappen | SVG bzw. Wappenbilddaten mit Alphakanal verwenden; Inhaltstransparenz getrennt vom App-Icon behandeln. |
| Falsches iPhone-Home-Icon | Dedizierte Root-Touch-Icons und quadratische Manifest-Icons; Verknüpfung nach erfolgreichem Deployment in Safari neu anlegen. |
| Störender Zoom bei schnellem Tippen | Touch-Bedienung und Eingabeschrift angepasst; am echten Gerät prüfen. |
| Passwortbereich meldet fehlende Einrichtung | `TVB_KASSIERER_PASSWORT` in der richtigen Cloudflare-Umgebung prüfen und neu deployen; keine Werte im Chat posten. |
| Import meldet veränderte/ungültige Vorlage | Originale offene 6.0-/6.1-JSON verwenden; keine manuell bearbeitete oder komplette Datei; gegebenenfalls Wechsel des Signaturschlüssels prüfen. |
| Konflikt unter gleicher Vorgangsnummer | Unterschiedlicher Inhalt unter derselben Nummer ist absichtlich gesperrt. Keine `.lock`-Dateien löschen, Berichtigung mit Kassierer klären. |
| „Erfolgreich“ ohne abgeschlossene Zählung | Offene Daten können vollständig übertragen sein. Fachlichen Status und `_komplett` unterscheiden. |

Im Chat wurde eine Übermittlung von PDF und JSON nach den Dropbox-Korrekturen vom Nutzer ausdrücklich als erfolgreich bestätigt. Das bestätigt diesen damaligen Vorgang, nicht automatisch spätere veröffentlichte Versionen.

## 20. Regeln für künftige Änderungen

### 20.1 Artikel und Preise

- Zuerst entscheiden, ab welcher **Datensatzversion** die Änderung gelten soll.
- Browserkatalog und serverseitigen Katalog gemeinsam anpassen.
- Reihenfolge, Artikelanzahl und Migration vorhandener Mengen ausdrücklich berücksichtigen.
- Historische Datensätze nicht mit neuen Positionen oder Preisen neu interpretieren.
- Vorschau, normale Übermittlung und spätere Kassierer-Vervollständigung mitprüfen.

### 20.2 PDF und Abwärtskompatibilität

Die bytegleiche Wiederholbarkeit hängt vom PDF-Generator der Datensatzversion ab. Layoutänderungen an historischen Renderern können aus einer zuvor zulässigen Wiederholung einen Inhaltskonflikt machen.

Daher: bisherige Fassung bei Bedarf einfrieren, neuen Renderer auf neue Datensatzversion beschränken und Dispatch sowie Versionsprüfung an allen betroffenen Stellen erweitern. Die Dateien `pdf-v*.js` sind kein versehentlich liegengebliebener Ballast.

### 20.3 Signierte offene Vorlagen

Feldänderungen können kanonische Signaturdaten und die Ausgangsbasis beeinflussen. Alte signierte Vorlagen müssen weiterhin in ihrer ursprünglichen Version geprüft und abgeschlossen werden können. Die Version nicht beim Import stillschweigend hochsetzen. Inhaltliche Änderungen und neue Berechnungen ausdrücklich versionieren.

### 20.4 Stellen mit Versionsabhängigkeit

Seit 6.2 stehen die Versionsangaben der Oberfläche zentral am Anfang von `assets/ablauf.js`: `APP_VERSION` (nur Anzeige), `DATENFORMAT` (Version neuer Datensätze), `NEUE_FORMATE`, `ZAEHL_FORMATE`, `BEKANNTE_FORMATE` und `SAISON`. Bei einem reinen Oberflächen-Update nur `APP_VERSION` und die `?v=`-Parameter der Skripte in `index.html` erhöhen. Die Serverdateien enthalten ihre Versionslisten weiterhin einzeln.

Bei einer neuen Datensatzversion insbesondere prüfen:

- `index.html`: Formularversion, Laden/Migration, Validierung, Antwortprüfung.
- `assets/ablauf.js`: Importkontext und Zählzuständigkeit.
- `lib/abrechnung.js`: Katalog, erlaubte Versionen, Pflichtdaten.
- `lib/pdf.js` und eingefrorene Renderer.
- `lib/dateiname.js`: Komplett-Zusatz und Namensgrenzen.
- `functions/api/submit.js`: Rechte, Signatur, Import, Ablagepfade und Stufen.
- `functions/api/health.js`, `package.json` und sichtbare Versionsangaben.
- Tests, Build-Dateien, Anleitung und vollständiges ZIP.

### 20.5 Saisonwechsel

2026/2027 ist bewusst fest eingetragen. Beim Saisonwechsel Webseitenkopf, Fuß, PDF-Köpfe/-Füße und Unterlagen prüfen. Die Datensatzversion und historische PDF-Wiederholungen dabei erhalten; ein Saisonwechsel ist nicht nur eine globale Suchen-/Ersetzen-Aktion in allen alten Renderern.

### 20.6 Geheimnisse und Veröffentlichung

- Keine Secret-Werte in Quelltext, Dokumentation, ZIP, Testbeispielen oder GitHub.
- Kein automatischer Push/Deploy ohne neuen entsprechenden Auftrag; derzeit gilt der manuelle Ablauf.
- Kein Tarifwechsel als Nebenwirkung einer Implementierung.
- Reale Tests als solche kennzeichnen und mit dem Kassierer abstimmen.
- Notwendige neue Cloudflare-Einstellungen vor dem Upload verständlich erklären.

## 21. Dateien zur Übergabe und offene Grenzen

### 21.1 Aktueller Stand

Vom Arbeitsordner aus erreichbar:

- [Aktuelles Upload-Paket](../Version-6.1/TVB-Hallenverkauf-V6.1.zip)
- [Entpackter vollständiger Anwendungsstand](../Version-6.1/TVB-Hallenverkauf-V6.1/)
- [Anleitung zum Paket](../Version-6.1/Anleitung.txt)
- [Musterbeleg offen](../Version-6.1/Muster-offen.pdf)
- [Musterbeleg komplett](../Version-6.1/Muster-komplett.pdf)
- [Aktuelle kurze Projektanleitung](README.md)

Das 6.1-ZIP enthält 43 zusammengehörige Anwendungs-/Dokumentations-/Testdateien. Die danach erstellte **vorliegende Gesamtdokumentation ist nicht rückwirkend in diesem bereits ausgegebenen ZIP enthalten**. Bei einer späteren Paketversion kann sie zusätzlich aufgenommen werden.

Frühere Versionen liegen daneben in `Version-4.1`, `Version-4.1-Ergaenzung`, `Version-4.2`, `Version-4.3`, `Version-4.4`, `Version-4.5`, `Version-5.0` und `Version-6.0`. Nicht einzelne alte Dateien unkontrolliert mit einem neuen Paket mischen.

### 21.2 Bewusst nicht implementiert / weiterhin zu prüfen

- Keine individuelle Benutzerverwaltung oder persönliche Absenderverifikation.
- Kein Auslesen des Computer-/Smartphone-Anmeldenamens.
- Keine automatische Überweisung oder Auszahlung.
- Keine E-Mail-Benachrichtigung; gewählt wurde die Dropbox-Meldung am Mac.
- Kein automatischer Import direkt aus einer in der App aufgelisteten Dropbox: Die offene JSON wird zunächst heruntergeladen und über die Dateiauswahl geladen.
- Kein nachträgliches freies Bearbeiten einer bereits begonnenen bzw. kompletten Übermittlungsstufe.
- Kein bestätigter Live-Stand der Version 6.1 allein durch diese Dokumentation.
- Reales iPhone-Verhalten, Dropbox-Desktop-Meldung und Workers-Free-CPU-Zeit müssen in der tatsächlichen Betriebsumgebung überprüft werden.
- Änderungen am Sortiment, an Preisen, Saison oder Berechtigungen erfordern gezielte Weiterentwicklung unter Erhalt der historischen Abläufe.

### 21.3 Kurze Arbeitsgrundlage für die nächste Weiterentwicklung

> Weiterarbeiten am lokalen TVB-Hallenverkauf, Stand 6.1. GitHub/Cloudflare werden vom Nutzer manuell aktualisiert. Vereinsfarben, PDF-/JSON-Paarbestätigung, unveränderliche Wiederholungen und alte signierte Vorlagen erhalten. Neue Abrechnungen ohne Pfand und ohne Spendenfelder, Anfangsbestand 130 €, Gesamt-Mannschaftsanteil 50 % auf 5 € gerundet, bei zwei Teams exakt halbiert. Spätere Kassenzählung über geschützten Import der offenen JSON; Abschluss mit gleicher ID und `_komplett`. Secret-Werte ausschließlich bei Cloudflare. Neue Änderungen erst lokal umsetzen und prüfen, dann vollständiges Upload-Paket mit Anleitung liefern.
