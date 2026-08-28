# SternDesOstens – Kicktipp AI (Premium PWA)

## Was diese Version kann
- iPhone-/Android-Web-App (PWA), installierbar auf dem Home-Bildschirm
- 9 Bundesliga-Tipps mit editierbaren Ergebnissen
- Sicherheits-Prozent, Bank-Tipps und Überraschungswarnungen
- Analyseansicht für Form, Verletzungen, Sperren und Startelf-Sicherheit
- Tippbilanz mit lokalen Ergebnis-Eingaben
- Tipps als Text kopieren
- JSON importieren/exportieren
- Kicktipp-Link speichern und direkt öffnen
- Offline-Nutzung nach dem ersten Laden
- Optionaler Live-Daten-Endpunkt (JSON)

## Wichtig
Diese App kann ohne eine offizielle Kicktipp-Schnittstelle keine Tipps automatisch in dein Kicktipp-Konto schreiben oder absenden.
Live-Verletzungen, Sperren, Aufstellungen usw. benötigen eine Datenquelle/API oder einen eigenen JSON-Endpunkt.

## iPhone-Installation
1. Den Ordner auf einen Webserver laden (z. B. GitHub Pages, Netlify, Vercel oder eigener Webspace).
2. Die HTTPS-Adresse in Safari öffnen.
3. Teilen → „Zum Home-Bildschirm“ → „Hinzufügen“.
4. Danach startet die App im Standalone-Modus.

## Live-Datenformat
Der konfigurierte Endpunkt soll JSON in derselben Struktur wie `data.json` liefern.
