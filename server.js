// Minimaler Backend-Server ohne Abhängigkeiten (Node >= 18).
// Liefert die statischen Dateien aus und kapselt die Claude API, damit der Key nie im Browser landet.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages";
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

const STATIC = { "/": "index.html", "/index.html": "index.html", "/style.css": "style.css", "/app.js": "app.js" };
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };

async function claude(system, user) {
  if (!API_KEY) throw Object.assign(new Error("ANTHROPIC_API_KEY fehlt"), { status: 503 });
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw Object.assign(new Error("Claude API " + r.status), { status: 502 });
  const text = (await r.json()).content.map((b) => b.text || "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error("Keine JSON-Antwort"), { status: 502 });
  return JSON.parse(m[0]);
}

const SYS = "Du bist ein Lerncoach, der sich an Ergebnissen der Lernpsychologie orientiert. Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach, auf Deutsch.";

const handlers = {
  // Einstiegstest: 6 Multiple-Choice-Fragen von leicht nach schwer + Suchbegriff für ein Einführungsvideo
  async test({ topic, context }) {
    const out = await claude(SYS,
      `Thema: "${topic}". Kontext: ${context}.\n` +
      `Erstelle einen Einstiegstest, der das aktuelle Können prüft: 6 Multiple-Choice-Fragen, aufsteigend von Anfänger- bis Fortgeschrittenen-Niveau, ` +
      `je 4 Antwortoptionen, genau eine richtig.\n` +
      `Format: {"videoQuery": "YouTube-Suchbegriff für ein Einführungsvideo", "questions": [{"q": "...", "options": ["...","...","...","..."], "correct": 0}]}`);
    const qs = (out.questions || []).filter((q) => q.q && Array.isArray(q.options) && q.options.length === 4 && q.correct >= 0 && q.correct < 4);
    if (qs.length < 3) throw Object.assign(new Error("Test unbrauchbar"), { status: 502 });
    return { videoQuery: String(out.videoQuery || topic + " Einführung"), questions: qs };
  },

  // Lernplan auf Basis des Testergebnisses
  async plan({ topic, context, hours, level, weak }) {
    const months = hours >= 10 ? 3 : hours >= 5 ? 4 : 6;
    const out = await claude(SYS,
      `Thema: "${topic}". Kontext: ${context}. Zeit: ${hours} Stunden pro Woche, Dauer: ${months} Monate (${Math.round(months * 4.3)} Wochen).\n` +
      `Startniveau laut Test: ${level} von 3 (0 = Anfänger, 3 = sicher). Schwächen: ${(weak || []).join("; ") || "keine bekannt"}.\n` +
      `Erstelle einen konkreten Lernplan mit 4 Phasen, die zusammen genau ${Math.round(months * 4.3)} Wochen füllen. ` +
      `Nutze Spaced Repetition, Abrufpraxis, Deliberate Practice, Interleaving. Aufgaben müssen themenspezifisch und konkret sein (je Phase 3-4).\n` +
      `Format: {"summary": "1-2 Sätze", "phases": [{"name": "...", "weeks": 4, "tasks": ["..."]}], ` +
      `"science": [{"name": "Konzept", "text": "Wie es in diesem Plan angewendet wird (Studie, Jahr)"}]}  (science: 4-5 Einträge)`);
    if (!Array.isArray(out.phases) || !out.phases.length) throw Object.assign(new Error("Plan unbrauchbar"), { status: 502 });
    return { months, ...out };
  },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 10000) { reject(Object.assign(new Error("zu groß"), { status: 413 })); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch { reject(Object.assign(new Error("ungültiges JSON"), { status: 400 })); } });
  });
}

function clean(b) {
  const hours = [2, 5, 10, 20].includes(+b.hours) ? +b.hours : 5;
  return {
    topic: String(b.topic || "").trim().slice(0, 100),
    context: String(b.context || "Hobby").slice(0, 40),
    hours,
    level: Math.min(3, Math.max(0, +b.level || 0)),
    weak: Array.isArray(b.weak) ? b.weak.slice(0, 6).map((s) => String(s).slice(0, 200)) : [],
  };
}

http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  const send = (code, type, body) => { res.writeHead(code, { "content-type": type }); res.end(body); };

  if (req.method === "POST" && url.startsWith("/api/") && handlers[url.slice(5)]) {
    try {
      const body = clean(await readBody(req));
      if (!body.topic) return send(400, "application/json", '{"error":"topic fehlt"}');
      send(200, "application/json", JSON.stringify(await handlers[url.slice(5)](body)));
    } catch (e) {
      console.error(url, e.message);
      send(e.status || 500, "application/json", JSON.stringify({ error: e.message }));
    }
    return;
  }
  const file = req.method === "GET" && STATIC[url];
  if (!file) return send(404, "text/plain", "Not found");
  send(200, TYPES[path.extname(file)], fs.readFileSync(path.join(__dirname, file)));
}).listen(PORT, () => console.log(`Lernpfad auf http://localhost:${PORT}` + (API_KEY ? "" : "  (ohne ANTHROPIC_API_KEY: Vorlagen-Modus)")));
