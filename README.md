# Lernpfad

Minimaler Prototyp einer Lern-App: Thema eingeben → Kontext & Zeit wählen → Mind-Map-Ladescreen → Einstiegstest → Lernplan für 3–6 Monate.

Kein Build, keine Abhängigkeiten: Frontend (`index.html`, `style.css`, `app.js`) und ein winziger Node-Server (`server.js`), der die Claude API kapselt, damit der Key nie im Browser landet.

## Starten

Mit Claude (Node ≥ 18, [API-Key](https://console.anthropic.com/)):

```bash
# PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_API_KEY=sk-ant-...
node server.js        # http://localhost:3000
```

Ohne Key startet derselbe Server im **Vorlagen-Modus** (Selbsteinschätzung + Standardplan). Optional: `CLAUDE_MODEL`, `PORT`.

## Ablauf

1. **Eingabe** – nur ein Feld; nach Enter erscheinen Kontext (Hobby/Beruf/…) und Wochenstunden.
2. **Loading** – animierte Mind-Map, an jedem Arm kommen Bild-/Dokument-Knoten dazu.
3. **Einstiegstest** – mit Claude: 6 themenspezifische Multiple-Choice-Fragen (leicht → schwer) + Suchlink für ein Einführungsvideo; ohne Key: 5 Selbsteinschätzungsfragen → Startniveau 0–3.
4. **Lernplan** – 3–6 Monate (je nach Wochenstunden); mit Claude themenspezifisch aus Niveau und Schwächen erzeugt, sonst Vorlage. Mit Wochenrhythmus und Studienbezug (Spacing, Testing-Effekt, Deliberate Practice, Interleaving, Desirable Difficulties, Habit-Bildung).

Der Stand wird im `localStorage` gespeichert.

## Prototyp-Grenzen / nächste Schritte

- Kein Rate-Limit und keine Authentifizierung im Server – vor einem öffentlichen Deployment ergänzen, sonst kann jeder deinen Key verbrauchen.
- Studienangaben im Plan stammen vom Modell und sind nicht verifiziert.
- Die Mind-Map-Knoten sind Platzhalter-Icons; später echte Bilder/Dokumente.
- Spaced-Repetition-Karten und Fortschrittstracking pro Woche.
