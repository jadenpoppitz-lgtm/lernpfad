"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "dreamz.v1";
const state = { topic: "", context: "", hours: 0, weeks: 0, level: null };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  void document.body.offsetHeight; // Animation neu starten
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

/* ---------- Backend (optional: ohne Server/Key greifen lokale Vorlagen) ---------- */
const api = (name, extra = {}) =>
  fetch("/api/" + name, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic: state.topic, context: state.context, hours: state.hours, weeks: state.weeks, ...extra }),
  }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))));

/* ---------- 1 · Eingabe ---------- */
const topic = $("topic");
const EXAMPLES = ["Excel / Tabellenkalkulation", "Gitarre spielen", "Python", "UX Design", "Projektmanagement", "Product Manager", "Präsentieren"];

(function typewriter() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return (topic.placeholder = EXAMPLES[0]);
  let i = 0, j = 0, del = false;
  const tick = () => {
    if (topic.value) { topic.placeholder = ""; return setTimeout(tick, 400); }
    const w = EXAMPLES[i];
    j += del ? -1 : 1;
    topic.placeholder = w.slice(0, j) + "|";
    let t = del ? 35 : 70;
    if (!del && j === w.length) { del = true; t = 1400; }
    else if (del && j === 0) { del = false; i = (i + 1) % EXAMPLES.length; t = 350; }
    setTimeout(tick, t);
  };
  tick();
})();

topic.addEventListener("input", () => ($("arrow").disabled = !topic.value.trim()));
$("demo").addEventListener("click", () => {
  topic.value = "Data Science";
  topic.dispatchEvent(new Event("input"));
  topic.focus();
});
$("brand").addEventListener("click", (e) => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname);
  show("s-ask");
});

$("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.topic = topic.value.trim();
  if (!state.topic) return;
  delete state.jobId;
  startSteps();
});

/* ---------- 2 · Drei Fragen, jeweils einzeln ---------- */
const STEPS = [
  { key: "context", q: "Warum willst du es lernen?", opts: [["Beruf", "Beruf"], ["Hobby", "Hobby"], ["Privates Projekt", "Privates Projekt"]] },
  { key: "hours", q: "Wie viel Zeit hast du pro Woche?", opts: [["1–2 Stunden", 2], ["3–5 Stunden", 5], ["6+ Stunden", 10]] },
  { key: "weeks", q: "Wie lange willst du lernen?", opts: [["4 Wochen", 4], ["8 Wochen", 8], ["12 Wochen", 12]] },
];

function startSteps() {
  let i = 0;
  const draw = () => {
    const s = STEPS[i];
    $("step-topic").textContent = state.topic;
    $("step-q").textContent = s.q;
    $("step-count").textContent = `0${i + 1} / 0${STEPS.length}`;
    $("step-opts").innerHTML = s.opts.map(([l, v]) => `<button type="button" data-v="${esc(v)}">${esc(l)}</button>`).join("");
    show("s-step");
  };
  $("step-opts").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const s = STEPS[i];
    state[s.key] = s.key === "context" ? b.dataset.v : +b.dataset.v;
    if (++i < STEPS.length) draw(); else runLoading();
  };
  draw();
}

/* ---------- 3 · Loading: Mind-Map ---------- */
function runLoading() {
  show("s-load");
  const testReq = api("test").catch(() => null);
  const svg = $("map");
  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, attrs, parent = svg) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    parent.appendChild(el);
    return el;
  };
  svg.innerHTML = "";
  const core = make("g", { class: "n core" });
  make("circle", { cx: 200, cy: 200, r: 14 }, core);

  const ARMS = 6, DEPTH = 3, icons = ["▣", "≡", "▶", "↗", "≡", "▣"]; // Bild, Dokument, Video, Link
  const steps = [];
  for (let d = 0; d < DEPTH; d++)
    for (let a = 0; a < ARMS; a++) steps.push({ a, d });

  const last = Array.from({ length: ARMS }, () => ({ x: 200, y: 200 }));
  const msgs = ["Quellen werden gesammelt …", "Bilder und Dokumente werden gesichtet …", "Wissen wird geordnet …"];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) {
      $("load-text").textContent = "Dein Wissenscheck wird erstellt …";
      return testReq.then(startTest);
    }
    const { a, d } = steps[i];
    const ang = (a / ARMS) * Math.PI * 2 - Math.PI / 2 + (d % 2 ? 0.18 : -0.12);
    const r = 62 + d * 48;
    const p = { x: 200 + Math.cos(ang) * r, y: 200 + Math.sin(ang) * r };
    make("line", { x1: last[a].x, y1: last[a].y, x2: p.x, y2: p.y });
    const g = make("g", { class: "n" });
    make("rect", { x: p.x - 16, y: p.y - 16, width: 32, height: 32, rx: 16 }, g);
    make("text", { x: p.x, y: p.y }, g).textContent = icons[(a + d) % icons.length];
    last[a] = p;
    $("load-text").textContent = msgs[Math.min(2, Math.floor((i / steps.length) * 3))];
    i++;
    setTimeout(tick, 230);
  };
  tick();
}

/* ---------- 4 · Wissenscheck: Video + Fragen ---------- */
const QUESTIONS = (t) => [
  `Ich kann die Grundbegriffe von „${t}“ in eigenen Worten erklären.`,
  `Ich habe „${t}“ schon praktisch angewendet – nicht nur darüber gelesen.`,
  `Ich kann eine kleine Aufgabe in „${t}“ ohne Anleitung lösen.`,
  `Ich erkenne typische Fehler in „${t}“ und weiß, wie ich sie behebe.`,
  `Ich könnte einem Anfänger „${t}“ sinnvoll beibringen.`,
];
const OPTS = ["Gar nicht", "Ein bisschen", "Meistens", "Sicher"];
// Themenspezifische Selbsteinschätzung (Fallback ohne Claude) für die Demo „Data Science“
const DS_CHECK = [
  ["Wie sicher fühlst du dich mit Daten?", ["Ganz am Anfang", "Etwas Erfahrung", "Sehr sicher"]],
  ["Hast du schon mit Python gearbeitet?", ["Noch nie", "Ein wenig", "Regelmäßig"]],
  ["Wie gut kennst du Statistik?", ["Kaum", "Grundlagen", "Fortgeschritten"]],
  ["Hast du Erfahrung mit SQL?", ["Nein", "Grundlagen", "Ja, sicher"]],
  ["Kennst du bereits Machine Learning?", ["Noch nicht", "Theoretisch", "Praktisch"]],
].map(([q, options]) => ({ q, options }));

// data = Antwort des Backends (Multiple Choice + Video) oder null → Selbsteinschätzung als Fallback
function startTest(data) {
  const qs = data ? data.questions : /data\s*science/i.test(state.topic) ? DS_CHECK : QUESTIONS(state.topic).map((t) => ({ q: t, options: OPTS }));
  const answers = new Array(qs.length).fill(-1);
  $("test-topic").textContent = state.topic;
  $("notes").value = "";

  // Video: erst Karte, geladen wird YouTube erst nach Klick (Datenschutz); Überspringen = einfach weiter nach unten
  const vid = data && data.video && /^[\w-]{11}$/.test(data.video.id) ? data.video : null;
  const query = data ? data.videoQuery : state.topic + " Einführung für Anfänger";
  $("test-video").innerHTML = vid
    ? `<button type="button" class="vcard" id="vplay" aria-label="Video abspielen: ${esc(vid.title)}">
         <span class="vt">${esc(vid.title)}</span><span class="play" aria-hidden="true">▶</span>
         <span class="meta"><span>Einführung · ${esc(vid.channel)}</span><span>${vid.minutes ? "ca. " + +vid.minutes + " min" : ""}</span></span></button>
       <p class="note"><a href="#test-qs" id="vskip">Video überspringen ↓</a></p>`
    : `<p class="note"><a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">▶ Einführungsvideo auf YouTube suchen</a></p>`;
  if (vid) {
    $("vplay").onclick = () => {
      $("vplay").outerHTML = `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${vid.id}?autoplay=1" title="${esc(vid.title)}" allowfullscreen ` +
        `allow="autoplay; encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe></div>`;
    };
    $("vskip").onclick = (e) => { e.preventDefault(); $("test-qs").scrollIntoView({ behavior: "smooth" }); };
  }

  $("test-qs").innerHTML = qs.map((q, i) =>
    `<div class="qh">${String(i + 1).padStart(2, "0")} — ${esc(q.q)}</div>` +
    `<div class="pills" data-q="${i}">${q.options.map((o, v) => `<button type="button" data-v="${v}">${esc(o)}</button>`).join("")}</div>`).join("");
  $("test-qs").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const box = b.parentElement;
    box.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    answers[+box.dataset.q] = +b.dataset.v;
    $("test-go").disabled = answers.includes(-1);
  };
  $("test-go").disabled = true;

  $("test-go").onclick = () => {
    let score = 0;
    const weak = [];
    answers.forEach((v, i) => {
      if (data) { if (v === qs[i].correct) score += 3; else weak.push(qs[i].q); }
      else score += (v * 3) / (qs[i].options.length - 1);
    });
    const ratio = score / (3 * qs.length);
    state.level = ratio <= 0.2 ? 0 : ratio <= 0.5 ? 1 : ratio <= 0.75 ? 2 : 3;
    finishTest(weak, $("notes").value.trim());
  };
  show("s-test");
}

/* ---------- 5 · Kurs wird erstellt ---------- */
function showWait(text) {
  $("wobble").innerHTML = [...text]
    .map((c, i) => `<span style="animation-delay:${(i * 0.07).toFixed(2)}s">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");
  show("s-wait");
}

async function finishTest(weak, notes) {
  showWait("Dein Kurs wird erstellt");
  const [plan] = await Promise.all([api("plan", { level: state.level, weak, notes }).catch(() => null), wait(1800)]);
  state.plan = plan;
  localStorage.setItem(KEY, JSON.stringify(state));
  renderPlan();
}

/* ---------- 6 · Lernplan ---------- */
const LEVELS = ["Einsteiger", "Grundlagen vorhanden", "Fortgeschritten", "Sicher"];
const WEIGHTS = [[3, 3, 3, 1.5], [1.5, 3, 3, 1.5], [0, 3, 3, 2], [0, 1.5, 3, 3]];
const PROJECT = {
  "Beruf": "ein echtes Problem aus deinem Arbeitsalltag",
  "Hobby": "ein kleines Projekt, das dir Freude macht",
  "Privates Projekt": "den ersten nutzbaren Teil deines Projekts",
};

function phases(t, ctx) {
  return [
    { name: "Fundament", tasks: [`Überblick über „${t}“: die 10 wichtigsten Begriffe und Konzepte`, "Jede Einheit mit 5 Abruffragen ohne Hilfsmittel starten", "Täglich kurz üben statt einmal lang"] },
    { name: "Aufbau", tasks: ["Gezielt an deiner schwächsten Teilfertigkeit arbeiten (Deliberate Practice)", "Übungen verschiedener Typen mischen statt blockweise zu üben", "Wöchentlich ein Selbsttest mit Auswertung der Fehler"] },
    { name: "Anwendung", tasks: [`Bauen/Lösen: ${PROJECT[ctx] || PROJECT.Hobby}`, "Ohne Anleitung arbeiten, erst danach Lösungen vergleichen", "Ergebnis jemandem zeigen oder erklären und Feedback holen"] },
    { name: "Vertiefung & Transfer", tasks: ["Alte Themen in Abständen wiederholen (nach 1, 3, 7, 21 Tagen)", "Neue, schwierigere Varianten ausprobieren", "Nächste Ziele festlegen und Lernpfad anpassen"] },
  ];
}

const SCIENCE = [
  ["Verteiltes Lernen", "Wiederholung in wachsenden Abständen schlägt Pauschal-Lernen (Ebbinghaus 1885; Cepeda et al. 2006)."],
  ["Abrufpraxis", "Sich selbst abfragen festigt stärker als Wiederlesen (Roediger & Karpicke 2006)."],
  ["Gezieltes Üben", "Verbesserung entsteht durch Übung knapp über dem aktuellen Können mit Feedback (Ericsson et al. 1993)."],
  ["Gemischtes Üben", "Aufgabentypen zu mischen (Interleaving) verbessert Transfer und Unterscheidungsfähigkeit (Rohrer & Taylor 2007)."],
  ["Erwünschte Schwierigkeit", "Etwas Anstrengung beim Lernen verlangsamt kurzfristig, hilft langfristig (Bjork 1994)."],
  ["Gewohnheit", "Feste Zeit und Ort lassen Routinen im Mittel nach etwa 2 Monaten automatisch werden (Lally et al. 2010)."],
];

function renderPlan() {
  const { topic: t, context: ctx, hours: h, level } = state;
  const ai = state.plan; // Claude-Plan vom Backend, sonst lokale Vorlage
  const weeks = ai && ai.weeks ? ai.weeks : state.weeks || 8;
  const sessions = Math.min(7, Math.ceil(h / 1.5));
  const mins = Math.round((h * 60) / sessions / 5) * 5;
  const w = WEIGHTS[level], sum = w.reduce((a, b) => a + b, 0);

  const list = ai
    ? ai.phases.map((p) => ({ name: p.name, tasks: p.tasks || [], len: Math.max(1, +p.weeks || 1) }))
    : phases(t, ctx).map((p, i) => ({ ...p, len: w[i] ? Math.max(1, Math.round((w[i] / sum) * weeks)) : 0 }));
  let from = 1;
  const html = list.map((p) => {
    if (!p.len) return "";
    const to = from + p.len - 1;
    const range = from === to ? `Woche ${from}` : `Woche ${from}–${to}`;
    from = to + 1;
    return `<div class="phase"><span class="when">${range}</span><b>${esc(p.name)}</b><ul>${p.tasks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }).join("");
  const science = ai && ai.science ? ai.science.map((s) => [s.name, s.text]) : SCIENCE;

  const split = [["Neues lernen", 20, "#111"], ["Üben", 50, "#555"], ["Abrufen / testen", 20, "#999"], ["Reflektieren", 10, "#ccc"]];
  $("plan-meta").textContent = `${t} · ${ctx} · ${h} Std. pro Woche · ${LEVELS[level]}`;
  $("plan-title").textContent = `${t} in ${weeks} Wochen`;
  $("plan-sub").innerHTML =
    (ai && ai.summary ? esc(ai.summary) + "<br>" : "") +
    `Pro Woche <b>${sessions} Einheiten à ca. ${mins} min</b> – lieber kurz und oft.` +
    `<div class="bar">${split.map(([, p, c]) => `<i style="width:${p}%;background:${c}"></i>`).join("")}</div>` +
    `<span class="muted small">${split.map(([n, p]) => `${n} ${p} %`).join(" · ")}</span>`;
  $("plan-phases").innerHTML = html;
  $("plan-science").innerHTML = science.map(([n, d]) => `<div class="sci"><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join("");
  $("to-job").classList.toggle("hidden", !state.jobId);
  $("to-job").textContent = `Jetzt bewerben: ${t} →`;
  $("to-job").onclick = () => (location.hash = `#/j/${state.jobId}/apply`);
  show("s-plan");
}

$("restart").addEventListener("click", () => {
  localStorage.removeItem(KEY);
  location.href = location.pathname;
});

/* ---------- Start ---------- */
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && saved.level !== null && saved.level !== undefined) { Object.assign(state, saved); renderPlan(); }
} catch {}
