# Lernpfad

Minimaler Prototyp einer Lern-App: Thema eingeben → Kontext & Zeit wählen → Mind-Map-Ladescreen → Einstiegstest → Lernplan für 3–6 Monate.

Kein Build, keine Abhängigkeiten, kein Backend: drei Dateien (`index.html`, `style.css`, `app.js`).

## Starten

Einfach `index.html` im Browser öffnen, oder:

```bash
npx serve .
```

## Ablauf

1. **Eingabe** – nur ein Feld; nach Enter erscheinen Kontext (Hobby/Beruf/…) und Wochenstunden.
2. **Loading** – animierte Mind-Map, an jedem Arm kommen Bild-/Dokument-Knoten dazu.
3. **Einstiegstest** – 5 Selbsteinschätzungsfragen + Link zu einem Einführungsvideo → Startniveau 0–3.
4. **Lernplan** – 3–6 Monate (je nach Wochenstunden), Phasen abhängig vom Niveau, mit Wochenrhythmus und Studienbezug (Spacing, Testing-Effekt, Deliberate Practice, Interleaving, Desirable Difficulties, Habit-Bildung).

Der Stand wird im `localStorage` gespeichert.

## Prototyp-Grenzen / nächste Schritte

- Plan und Test sind **Vorlagen**, keine KI-Inhalte. Nächster Schritt: kleines Backend, das die Claude API aufruft und (a) themenspezifische Testfragen / Mini-Videos, (b) themenspezifische Wochenpläne, (c) echte Quellen für die Mind-Map erzeugt.
- Die Mind-Map-Knoten sind Platzhalter-Icons; später echte Bilder/Dokumente.
- Spaced-Repetition-Karten und Fortschrittstracking pro Woche.
