# Fotosim

Interaktiver Foto-Simulator für Einsteiger: Was passiert mit **Schärfe**, **Belichtung** und **Rauschen**, wenn man an Brennweite, Blende, Belichtungszeit, ISO oder Sensorgröße dreht?

- Schärfekurve über die Entfernung, mit verschiebbaren Personen und Hintergrund
- Balken für Belichtung, Rauschen und Bewegung
- „Wofür reicht das Foto?“: wie viele echte Details im Bild stecken, was sie kostet, und bis zu welcher Bildschirm- oder Druckgröße das Foto gut aussieht
- Digitalzoom: Ausschnitt vergrößern, bis Rauschen, Unschärfe und Pixel sichtbar werden
- Vereinfachtes Kamerabild, das Unschärfe, Ausschnitt, Helligkeit und Rauschen zeigt
- Kameramodi A, P, Av, Tv, M mit kurzer Erklärung, Blitz mit Reichweite
- Vom Handy bis Mittelformat, dazu grobe Kosten für Kamera, Objektiv und Stativ
- Startet vereinfacht: Sonne, Vollformat, nur Lichtsituation, Blende, Belichtungszeit und Brennweite – „Alle Einstellungen“ zeigt den Rest

Das Ergebnis ist **eine einzige HTML-Datei**. Sie läuft offline im Browser, auf Desktop und Handy.

> Status: Gerüst und Rechenmodell stehen, die Oberfläche ist in Arbeit.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests des Rechenmodells
npm run build      # -> dist/index.html (alles eingebettet)
```

Details zu Funktionen, Formeln und Aufbau: [SPEC.md](SPEC.md) (englisch).

## Lizenz

MIT
