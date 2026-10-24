# dreamz

Minimaler Prototyp einer Lern-App im Design der Figma-Vorlage (Courier Prime, schwarz auf weiß, Pill-Buttons): Thema eingeben → drei Fragen (Warum, Zeit pro Woche, Dauer in Wochen) → Mind-Map-Ladescreen → Wissenscheck mit Video → Lernplan.

Kein Build, keine Abhängigkeiten: Frontend (`index.html`, `style.css`, `app.js`) und ein winziger Node-Server (`server.js`), der die Claude API kapselt, damit der Key nie im Browser landet.

## Starten

Mit Claude (Node ≥ 18, [API-Key](https://console.anthropic.com/)):

```bash
# PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_API_KEY=sk-ant-...
node server.js        # http://localhost:3000
```

Ohne Key startet derselbe Server im **Vorlagen-Modus** (Selbsteinschätzung + Standardplan). Optional: `CLAUDE_MODEL`, `PORT`, `YOUTUBE_API_KEY` (siehe unten).

## Ablauf

1. **Eingabe** – nur Frage und Suchfeld (animierte Beispiele, Demo-Link „Data Science“); danach drei Einzelfragen: Warum (Beruf/Hobby/Privates Projekt), Zeit pro Woche (1–2 / 3–5 / 6+ Std.), Dauer (4 / 8 / 12 Wochen).
2. **Loading** – animierte Mind-Map, an jedem Arm kommen Bild-/Dokument-/Video-/Link-Knoten dazu.
3. **Wissenscheck** – eine Seite: Videokarte oben (YouTube lädt erst nach Klick, „Video überspringen ↓“), darunter alle Fragen als Pills und ein Feld „Weitere Präferenzen“. Mit `YOUTUBE_API_KEY` ein automatisch gefundenes Video, mit Claude Multiple-Choice-Fragen, ohne Key Selbsteinschätzung – mit `YOUTUBE_API_KEY` zuerst ein automatisch gefundenes, einbettbares Einführungsvideo (anschauen oder überspringen), danach mit Claude: 6 themenspezifische Multiple-Choice-Fragen (leicht → schwer) + Suchlink für ein Einführungsvideo; ohne Key: 5 Selbsteinschätzungsfragen → Startniveau 0–3.
4. **Lernplan** – so viele Wochen, wie gewählt (4/8/12); mit Claude themenspezifisch aus Niveau und Schwächen erzeugt, sonst Vorlage. Mit Wochenrhythmus und Studienbezug (Spacing, Testing-Effekt, Deliberate Practice, Interleaving, Desirable Difficulties, Habit-Bildung).

Der Stand wird im `localStorage` gespeichert.

### Videos

Setze `YOUTUBE_API_KEY` ([YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)), dann sucht der Server pro Thema ein einbettbares Einführungsvideo von etwa 15 Minuten (10–20 min, nächstes an 15) und erzeugt die Testfragen passend zu Titel und Beschreibung. Eingebettet wird über `youtube-nocookie.com`. Ohne Key bleibt es bei einem Suchlink. Grenze: Claude sieht das Video nicht (kein Transkript), die Fragen decken die üblichen Kerninhalte ab und sind bewusst auch ohne Video beantwortbar.

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
