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

## Bewerbungsfunnel (Unternehmen → Plattform)

1. **HR** öffnet `#/hr`, fügt die Stellenanzeige ein (Text oder .txt). Claude erzeugt Skill-Profil (Hard/Soft, Niveau, Muss/Nice), 6 Testfragen und eine Praxisaufgabe. HR prüft, streicht Unpassendes und veröffentlicht.
2. HR bekommt einen **Bewerber-Link** (in die Anzeige setzen) und ein **privates Dashboard**.
3. **Bewerber** sehen offen, was erwartet wird, und wählen: *Direkt bewerben* (Skilltest) oder *Erst vorbereiten* (Lernplan aus den Muss-Skills, danach „Jetzt bewerben“).
4. Nach dem Test sehen Bewerber ihr Ergebnis pro Skill (dasselbe wie HR) und bekommen für Lücken einen Lernplan – auch wenn es nicht klappt, bleibt das Lernziel.
5. HR sieht Bewerber nach Ergebnis sortiert, mit Skill-Aufschlüsselung. Das ist Entscheidungshilfe, kein automatisches Aussortieren.

Daten liegen in `data/db.json` (nicht im Repo). Das Dashboard ist nur über den geheimen Token-Link erreichbar.

## Prototyp-Grenzen / nächste Schritte

- Der Praxistest wird von Claude bewertet und ist nicht betrugssicher (KI-Hilfe möglich); für Finalisten ein kurzes Live-Gespräch einplanen.
- Kein Rate-Limit, keine Nutzerkonten, Token-Link statt Login, Datei statt Datenbank (DSGVO: Löschfunktion fehlt) – vor einem öffentlichen Deployment ergänzen. Außerdem – vor einem öffentlichen Deployment ergänzen, sonst kann jeder deinen Key verbrauchen.
- Studienangaben im Plan stammen vom Modell und sind nicht verifiziert.
- Die Mind-Map-Knoten sind Platzhalter-Icons; später echte Bilder/Dokumente.
- Spaced-Repetition-Karten und Fortschrittstracking pro Woche.
