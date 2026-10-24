"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "lernpfad.v1";
const state = { topic: "", context: "", hours: 0, level: null };

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
}

/* ---------- 1 · Eingabe ---------- */
const topic = $("topic");
const ready = () => ($("go").disabled = !(state.context && state.hours));

topic.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (topic.value.trim()) $("details").classList.remove("hidden");
  }
});

document.querySelectorAll(".chips").forEach((box) =>
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    box.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    state[box.dataset.key] = box.dataset.key === "hours" ? +b.dataset.v : b.dataset.v;
    ready();
  })
);

$("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.topic = topic.value.trim();
  if (!state.topic || $("go").disabled) return $("details").classList.remove("hidden");
  runLoading();
});

/* ---------- 2 · Loading: Mind-Map ---------- */
function runLoading() {
  show("s-load");
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

  const ARMS = 6, DEPTH = 3, icons = ["🖼️", "📄", "🎬", "🔗", "📄", "🖼️"];
  const steps = [];
  for (let d = 0; d < DEPTH; d++)
    for (let a = 0; a < ARMS; a++) steps.push({ a, d });

  const last = Array.from({ length: ARMS }, () => ({ x: 200, y: 200 }));
  const msgs = ["Quellen werden gesammelt …", "Bilder und Dokumente werden gesichtet …", "Wissen wird geordnet …"];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) return setTimeout(startTest, 600);
    const { a, d } = steps[i];
    const ang = (a / ARMS) * Math.PI * 2 - Math.PI / 2 + (d % 2 ? 0.18 : -0.12);
    const r = 62 + d * 48;
    const p = { x: 200 + Math.cos(ang) * r, y: 200 + Math.sin(ang) * r };
    make("line", { x1: last[a].x, y1: last[a].y, x2: p.x, y2: p.y });
    const g = make("g", { class: "n" });
    make("rect", { x: p.x - 16, y: p.y - 16, width: 32, height: 32, rx: 8 }, g);
    make("text", { x: p.x, y: p.y }, g).textContent = icons[(a + d) % icons.length];
    last[a] = p;
    $("load-text").textContent = msgs[Math.min(2, Math.floor((i / steps.length) * 3))];
    i++;
    setTimeout(tick, 230);
  };
  tick();
}

/* ---------- 3 · Einstiegstest ---------- */
const QUESTIONS = (t) => [
  `Ich kann die Grundbegriffe von „${t}“ in eigenen Worten erklären.`,
  `Ich habe „${t}“ schon praktisch angewendet – nicht nur darüber gelesen.`,
  `Ich kann eine kleine Aufgabe in „${t}“ ohne Anleitung lösen.`,
  `Ich erkenne typische Fehler in „${t}“ und weiß, wie ich sie behebe.`,
  `Ich könnte einem Anfänger „${t}“ sinnvoll beibringen.`,
];
const OPTS = ["Gar nicht", "Ein bisschen", "Meistens", "Sicher"];

function startTest() {
  let q = 0, score = 0;
  const qs = QUESTIONS(state.topic);
  $("intro-video").href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(state.topic + " Einführung für Anfänger");
  const render = () => {
    $("test-step").textContent = `Einstiegstest · ${q + 1} / ${qs.length}`;
    $("test-q").textContent = qs[q];
    $("test-opts").innerHTML = OPTS.map((o, v) => `<button data-v="${v}">${o}</button>`).join("");
  };
  $("test-opts").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    score += +b.dataset.v;
    if (++q < qs.length) return render();
    state.level = score <= 3 ? 0 : score <= 7 ? 1 : score <= 11 ? 2 : 3;
    localStorage.setItem(KEY, JSON.stringify(state));
    renderPlan();
  };
  render();
  show("s-test");
}

/* ---------- 4 · Lernplan ---------- */
const LEVELS = ["Einsteiger", "Grundlagen vorhanden", "Fortgeschritten", "Sicher"];
const WEIGHTS = [[3, 3, 3, 1.5], [1.5, 3, 3, 1.5], [0, 3, 3, 2], [0, 1.5, 3, 3]];
const PROJECT = {
  "Hobby": "ein kleines Projekt, das dir Freude macht",
  "Beruf": "ein echtes Problem aus deinem Arbeitsalltag",
  "Studium / Schule": "eine Aufgabe im Stil deiner nächsten Prüfung",
  "Eigenes Projekt": "den ersten nutzbaren Teil deines Projekts",
};

function phases(t, ctx) {
  return [
    { name: "Fundament", tasks: [`Überblick über „${t}“: die 10 wichtigsten Begriffe und Konzepte`, "Jede Einheit mit 5 Abruffragen ohne Hilfsmittel starten", "Täglich kurz üben statt einmal lang"] },
    { name: "Aufbau", tasks: ["Gezielt an deiner schwächsten Teilfertigkeit arbeiten (Deliberate Practice)", "Übungen verschiedener Typen mischen statt blockweise zu üben", "Wöchentlich ein Selbsttest mit Auswertung der Fehler"] },
    { name: "Anwendung", tasks: [`Bauen/Lösen: ${PROJECT[ctx]}`, "Ohne Anleitung arbeiten, erst danach Lösungen vergleichen", "Ergebnis jemandem zeigen oder erklären und Feedback holen"] },
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
  const months = h >= 10 ? 3 : h >= 5 ? 4 : 6;
  const weeks = Math.round(months * 4.3);
  const sessions = Math.min(7, Math.ceil(h / 1.5));
  const mins = Math.round((h * 60) / sessions / 5) * 5;
  const w = WEIGHTS[level], sum = w.reduce((a, b) => a + b, 0);

  let from = 1;
  const html = phases(t, ctx).map((p, i) => {
    if (!w[i]) return "";
    const len = Math.max(1, Math.round((w[i] / sum) * weeks));
    const to = Math.min(weeks, from + len - 1);
    const range = from === to ? `Woche ${from}` : `Woche ${from}–${to}`;
    from = to + 1;
    return `<div class="phase"><span class="when">${range}</span><b>${p.name}</b><ul>${p.tasks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }).join("");

  const split = [["Neues lernen", 20, "#7c9cff"], ["Üben", 50, "#4cc9a0"], ["Abrufen / testen", 20, "#f2b84b"], ["Reflektieren", 10, "#c58cff"]];
  $("plan-meta").textContent = `${ctx} · ${h} h pro Woche · Startniveau: ${LEVELS[level]}`;
  $("plan-title").textContent = `${t} in ${months} Monaten`;
  $("plan-sub").innerHTML =
    `Pro Woche <b>${sessions} Einheiten à ca. ${mins} min</b> – lieber kurz und oft.` +
    `<div class="bar">${split.map(([, p, c]) => `<i style="width:${p}%;background:${c}"></i>`).join("")}</div>` +
    `<span class="muted small">${split.map(([n, p]) => `${n} ${p} %`).join(" · ")}</span>`;
  $("plan-phases").innerHTML = html;
  $("plan-science").innerHTML = SCIENCE.map(([n, d]) => `<div class="sci"><b>${n}</b><span>${d}</span></div>`).join("");
  show("s-plan");
}

$("restart").addEventListener("click", () => {
  localStorage.removeItem(KEY);
  location.reload();
});

/* ---------- Start ---------- */
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && saved.level !== null) { Object.assign(state, saved); renderPlan(); }
} catch {}
