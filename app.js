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
  delete state.jobId;
  if (!state.topic || $("go").disabled) return $("details").classList.remove("hidden");
  runLoading();
});

/* ---------- Backend (optional: ohne Server/Key greifen lokale Vorlagen) ---------- */
const api = (name, extra = {}) =>
  fetch("/api/" + name, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic: state.topic, context: state.context, hours: state.hours, ...extra }),
  }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))));

/* ---------- 2 · Loading: Mind-Map ---------- */
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

  const ARMS = 6, DEPTH = 3, icons = ["🖼️", "📄", "🎬", "🔗", "📄", "🖼️"];
  const steps = [];
  for (let d = 0; d < DEPTH; d++)
    for (let a = 0; a < ARMS; a++) steps.push({ a, d });

  const last = Array.from({ length: ARMS }, () => ({ x: 200, y: 200 }));
  const msgs = ["Quellen werden gesammelt …", "Bilder und Dokumente werden gesichtet …", "Wissen wird geordnet …"];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) {
      $("load-text").textContent = "Dein Einstiegstest wird erstellt …";
      return testReq.then(startTest);
    }
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

// data = Antwort des Backends (Multiple Choice) oder null → Selbsteinschätzung als Fallback
function startTest(data) {
  let q = 0, score = 0;
  const weak = [];
  const qs = data ? data.questions : QUESTIONS(state.topic).map((t) => ({ q: t, options: OPTS }));
  const query = data ? data.videoQuery : state.topic + " Einführung für Anfänger";
  $("intro-video").href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
  const render = () => {
    $("test-step").textContent = `Einstiegstest · ${q + 1} / ${qs.length}`;
    $("test-q").textContent = qs[q].q;
    $("test-opts").innerHTML = qs[q].options.map((o, v) => `<button data-v="${v}">${esc(o)}</button>`).join("");
  };
  $("test-opts").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.v === undefined) return;
    const v = +b.dataset.v;
    if (data) { if (v === qs[q].correct) score += 3; else weak.push(qs[q].q); }
    else score += v;
    if (++q < qs.length) return render();
    const ratio = score / (3 * qs.length);
    state.level = ratio <= 0.2 ? 0 : ratio <= 0.5 ? 1 : ratio <= 0.75 ? 2 : 3;
    $("test-opts").onclick = null;
    finishTest(weak);
  };
  const vid = data && data.video && /^[\w-]{11}$/.test(data.video.id) ? data.video : null;
  $("intro-video").classList.toggle("hidden", !!vid);
  if (vid) {
    // Erst Video (anschauen oder überspringen), danach die Fragen
    $("test-step").textContent = "Einstieg · Video";
    $("test-q").textContent = vid.title;
    $("test-opts").innerHTML =
      `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${vid.id}" title="${esc(vid.title)}" loading="lazy" allowfullscreen ` +
      `allow="encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe></div>` +
      `<p class="muted small">${esc(vid.channel)} · Danach folgen ${qs.length} Fragen.</p>` +
      `<button class="primary" id="v-go" style="margin-top:8px">Weiter zu den Fragen →</button>` +
      `<button class="ghost" id="v-skip" style="margin-top:8px">Überspringen – kenne ich schon</button>`;
    $("v-go").onclick = $("v-skip").onclick = render;
  } else render();
  show("s-test");
}

async function finishTest(weak) {
  $("test-q").textContent = "Dein Lernplan wird erstellt …";
  $("test-opts").innerHTML = "";
  const plan = await api("plan", { level: state.level, weak }).catch(() => null);
  state.plan = plan;
  localStorage.setItem(KEY, JSON.stringify(state));
  renderPlan();
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
  const ai = state.plan; // Claude-Plan vom Backend, sonst lokale Vorlage
  const months = ai ? ai.months : h >= 10 ? 3 : h >= 5 ? 4 : 6;
  const weeks = Math.round(months * 4.3);
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

  const split = [["Neues lernen", 20, "#7c9cff"], ["Üben", 50, "#4cc9a0"], ["Abrufen / testen", 20, "#f2b84b"], ["Reflektieren", 10, "#c58cff"]];
  $("plan-meta").textContent = `${ctx} · ${h} h pro Woche · Startniveau: ${LEVELS[level]}`;
  $("plan-title").textContent = `${t} in ${months} Monaten`;
  $("plan-sub").innerHTML =
    (ai && ai.summary ? esc(ai.summary) + "<br>" : "") +
    `Pro Woche <b>${sessions} Einheiten à ca. ${mins} min</b> – lieber kurz und oft.` +
    `<div class="bar">${split.map(([, p, c]) => `<i style="width:${p}%;background:${c}"></i>`).join("")}</div>` +
    `<span class="muted small">${split.map(([n, p]) => `${n} ${p} %`).join(" · ")}</span>`;
  $("plan-phases").innerHTML = html;
  $("plan-science").innerHTML = science.map(([n, d]) => `<div class="sci"><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join("");
  $("to-job").classList.toggle("hidden", !state.jobId);
  $("to-job").textContent = `Jetzt bewerben: ${state.topic} →`;
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
  if (saved && saved.level !== null) { Object.assign(state, saved); renderPlan(); }
} catch {}
