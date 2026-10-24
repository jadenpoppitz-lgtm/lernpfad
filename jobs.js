"use strict";
// Bewerbungsfunnel: HR lädt Anzeige hoch → Bewerber wählt Kurs oder direkten Skilltest → HR sieht Ergebnisse.
// Nutzt $, esc, show, state, api, renderPlan aus app.js.

const HRKEY = "dreamz.hr";

// Demo-Anzeige (fiktiv) für die Unternehmensseite
const DEMO_JOB = {
  title: "Praktikum Data Science (m/w/d)",
  company: "Lumora Analytics",
  text: `Praktikum Data Science (m/w/d) – Lumora Analytics

Lumora Analytics GmbH · Leipzig · Hybrid (2–3 Tage im Büro) · ab März 2027, 6 Monate

Über uns
Lumora Analytics ist ein Analytics-Startup mit rund 60 Mitarbeitenden. Wir helfen mittelständischen Industrie- und Energieunternehmen, ihre Daten nutzbar zu machen, von der Absatzprognose bis zur vorausschauenden Wartung von Anlagen. Unser Team aus Data Scientists, Data Engineers und Fachberatern arbeitet eng an echten Kundenprojekten.

Deine Aufgaben
- Du unterstützt unser Data-Science-Team bei der Entwicklung von Prognosemodellen, z. B. für Energieverbrauch, Nachfrage oder Maschinenausfälle
- Du bereitest Daten aus verschiedenen Quellen auf (Sensordaten, ERP-Systeme, Zeitreihen) und führst explorative Analysen durch
- Du trainierst, evaluierst und vergleichst ML-Modelle (Regression, Gradient Boosting, einfache neuronale Netze)
- Du visualisierst Ergebnisse in Dashboards und bereitest sie verständlich für Kunden auf
- Du arbeitest an einem eigenen kleinen Projekt, das du am Ende des Praktikums vor dem Team präsentierst

Dein Profil
- Laufendes Studium in Wirtschaftsingenieurwesen, Informatik, Mathematik, Elektrotechnik oder einem vergleichbaren Fach
- Gute Kenntnisse in Python (pandas, NumPy, scikit-learn), erste Erfahrung mit SQL
- Grundverständnis von Statistik und Machine Learning
- Von Vorteil: Erfahrung mit Zeitreihenanalyse, Git oder einem Cloud-Umfeld (z. B. Azure, AWS)
- Analytisches Denken und Freude daran, technische Ergebnisse auch Nicht-Expert:innen zu erklären
- Sehr gute Deutsch- und gute Englischkenntnisse

Was wir bieten
- Vergütung von 1.900 € brutto im Monat
- Feste Ansprechperson und wöchentliche 1:1-Gespräche
- Echte Verantwortung in Kundenprojekten statt Kaffee kochen
- Möglichkeit, deine Abschlussarbeit bei uns zu schreiben
- Flexible Arbeitszeiten, Deutschlandticket-Zuschuss, Team-Events

Bewerbung
Sende uns deinen Lebenslauf, einen aktuellen Notenspiegel und ein paar Sätze, warum dich Data Science reizt. Ein Anschreiben ist nicht zwingend nötig. Ansprechpartnerin: Jana Reuter, Talent Acquisition.

Fiktives Beispiel: Unternehmen, Ansprechperson und Konditionen sind frei erfunden.`,
};
const view = (html) => { $("s-view").innerHTML = html; show("s-view"); };
const call = (method, url, body) =>
  fetch(url, { method, headers: { "content-type": "application/json" }, body: body && JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
const base = () => location.origin + location.pathname;
const tags = (s) => `<span class="tag">${s.type === "soft" ? "Soft" : "Hard"} · Niveau ${s.level}</span><span class="tag ${s.must ? "must" : ""}">${s.must ? "Muss" : "Nice-to-have"}</span>`;
const meter = (p) => `<div class="meter"><i style="width:${p}%"></i></div>`;
const hrTokens = () => { try { return JSON.parse(localStorage.getItem(HRKEY) || "{}"); } catch { return {}; } };

/* ---------- HR: Anzeige hochladen ---------- */
function hrUpload(text = "", msg = "") {
  view(`<p class="muted"><a href="#">← Zurück</a> · Für Unternehmen</p>
    <h1>Stellenanzeige hochladen</h1>
    <p>Daraus entstehen Skill-Profil, Skilltest und ein Vorbereitungskurs für Bewerber. Du prüfst es kurz und veröffentlichst.</p>
    <details class="demo">
      <summary>Demo-Anzeige: ${esc(DEMO_JOB.title)} – ${esc(DEMO_JOB.company)}</summary>
      <pre>${esc(DEMO_JOB.text)}</pre>
      <button type="button" id="jdemo">Diese Anzeige verwenden</button>
    </details>
    <textarea id="jt" placeholder="Text der Stellenanzeige hier einfügen …">${esc(text)}</textarea>
    <input type="file" id="jf" accept=".txt,.md" class="small muted">
    <button class="primary" id="jgo">Profil erstellen</button><p id="jmsg" class="muted">${esc(msg)}</p>`);
  $("jdemo").onclick = () => { $("jt").value = DEMO_JOB.text; $("jt").scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("jf").onchange = (e) => e.target.files[0] && e.target.files[0].text().then((t) => ($("jt").value = t));
  $("jgo").onclick = async () => {
    const t = $("jt").value;
    if (!t.trim()) return;
    // Kurzer Ladescreen, währenddessen Profil, Test und passender Kurs entstehen
    showWait("Dein Profil wird erstellt");
    const swap = setTimeout(() => showWait("Passender Kurs wird zusammengestellt"), 1600);
    try {
      const [draft] = await Promise.all([call("POST", "/api/job/parse", { text: t }), wait(3200)]);
      clearTimeout(swap);
      review(draft);
    } catch (e) {
      clearTimeout(swap);
      hrUpload(t, "Fehlgeschlagen: " + e.message + " (Läuft der Server mit ANTHROPIC_API_KEY?)");
    }
  };
}

function coursePreview(c) {
  let from = 1;
  return c.phases.map((p) => {
    const to = from + p.weeks - 1;
    const r = from === to ? `Woche ${from}` : `Woche ${from}–${to}`;
    from = to + 1;
    return `<div class="phase"><span class="when">${r}</span><b>${esc(p.name)}</b><ul>${p.tasks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }).join("");
}

/* ---------- HR: Entwurf prüfen & veröffentlichen ---------- */
function review(d) {
  const draw = () => {
    view(`<p class="muted">Schritt 2 · Prüfen</p>
      <input class="field" id="rt" value="${esc(d.title)}" aria-label="Titel">
      <input class="field" id="rc" value="${esc(d.company)}" placeholder="Firma" aria-label="Firma" style="margin-top:8px">
      <h3>Skill-Profil</h3>
      ${d.skills.map((s, i) => `<div class="row"><span>${esc(s.name)}${tags(s)}</span>
        <span><label class="small muted"><input type="checkbox" data-must="${i}" ${s.must ? "checked" : ""}> Muss</label>
        <button class="x" data-rm-skill="${i}" aria-label="Entfernen">×</button></span></div>`).join("")}
      <h3>Skilltest</h3>
      ${d.questions.map((q, i) => `<div class="row"><span>${esc(q.q)} <span class="tag">${esc(q.skill)}</span></span>
        <button class="x" data-rm-q="${i}" aria-label="Entfernen">×</button></div>`).join("")}
      <h3>Praxisteil</h3>
      <label class="small"><input type="checkbox" id="rex" ${d.exam === "terminal" ? "checked" : ""}> Data-Science-Terminal (5 Minuten) + Erklärvideo statt Textaufgabe</label>
      <textarea id="rk" style="margin-top:10px">${esc(d.task)}</textarea>
      ${d.course ? `<h3>Vorbereitungskurs für Bewerber</h3>
        <p class="muted small">${esc(d.course.summary)} ${d.course.weeks} Wochen – Bewerber sehen diesen Kurs, wenn sie sich erst vorbereiten wollen.</p>
        ${coursePreview(d.course)}` : ""}
      <p class="note">Bewerber sehen Profil und Anforderungen offen. Der Test ist eine Entscheidungshilfe für dich – die Entscheidung bleibt bei Menschen.</p>
      <button class="primary" id="pub">Veröffentlichen</button><p id="pmsg" class="muted"></p>`);
    const sync = () => { d.title = $("rt").value; d.company = $("rc").value; d.task = $("rk").value; d.exam = $("rex").checked ? "terminal" : null; };
    $("s-view").onclick = (e) => {
      const t = e.target;
      if (t.dataset.rmSkill) { sync(); d.skills.splice(+t.dataset.rmSkill, 1); draw(); }
      if (t.dataset.rmQ) { sync(); d.questions.splice(+t.dataset.rmQ, 1); draw(); }
    };
    $("s-view").onchange = (e) => { if (e.target.dataset.must) { sync(); d.skills[+e.target.dataset.must].must = e.target.checked; draw(); } };
    $("pub").onclick = async () => {
      sync();
      try {
        const r = await call("POST", "/api/job", { draft: d });
        const all = hrTokens(); all[r.id] = r.token; localStorage.setItem(HRKEY, JSON.stringify(all));
        view(`<h1>Veröffentlicht ✓</h1>
          <h3>Link für Bewerber</h3><p class="link"><a href="#/j/${r.id}">${base()}#/j/${r.id}</a></p>
          <h3>Dein Dashboard (privat, nicht teilen)</h3><p class="link"><a href="#/hr/${r.id}/${r.token}">${base()}#/hr/${r.id}/${r.token}</a></p>
          <p class="note">Setze den Bewerber-Link direkt in deine Stellenanzeige.</p>`);
      } catch (e) { $("pmsg").textContent = "Fehlgeschlagen: " + e.message; }
    };
  };
  draw();
}

/* ---------- Bewerber: Einstieg ---------- */
async function jobLanding(id) {
  let j;
  try { j = await call("GET", "/api/job/" + id); } catch { return view(`<h1>Stelle nicht gefunden</h1><a href="#">Zur Startseite</a>`); }
  view(`<p class="muted">${esc(j.company || "Stellenangebot")}</p><h1>${esc(j.title)}</h1>
    <p>So läuft die Bewerbung: Es gibt keinen Lebenslauf-Filter. Du zeigst in einem kurzen Skilltest, was du kannst – oder bereitest dich vorher gezielt vor.</p>
    <h3>Das wird erwartet</h3>
    ${j.skills.map((s) => `<div class="row"><span>${esc(s.name)}</span><span>${tags(s)}</span></div>`).join("")}
    <p class="note">Der Test: ${j.questions.length} Fragen zu diesen Skills${j.exam === "terminal" ? ", ein Praxisteil im Terminal (5 Minuten) und ein kurzes Erklärvideo" : j.task ? " + 1 Praxisaufgabe" : ""}. Das Unternehmen sieht dein Ergebnis pro Skill – du siehst es auch.</p>
    <div class="stack" style="margin-top:24px">
      <button class="primary" id="b-apply" style="margin:0">Direkt bewerben – Skilltest starten</button>
      <button id="b-learn">Erst vorbereiten – Lernplan für diese Stelle</button>
      <select id="hrs" class="field" aria-label="Zeit pro Woche"><option value="2">1–2 Stunden pro Woche</option><option value="5" selected>3–5 Stunden pro Woche</option><option value="10">6+ Stunden pro Woche</option></select>
      ${j.course ? "" : `<select id="wks" class="field" aria-label="Dauer"><option value="4">4 Wochen</option><option value="8" selected>8 Wochen</option><option value="12">12 Wochen</option></select>`}
    </div>`);
  $("b-apply").onclick = () => (location.hash = `#/j/${id}/apply`);
  $("b-learn").onclick = () => learnFor(j, id, j.skills.filter((s) => s.must).map((s) => `${s.name} (Niveau ${s.level})`), +$("hrs").value, $("wks") ? +$("wks").value : 8);
}

// Kurs: Lernplan aus den Anforderungen der Stelle, danach geht es mit "Jetzt bewerben" zurück
async function learnFor(j, id, weak, hours, weeks) {
  Object.assign(state, { topic: j.title, context: "Beruf", hours: hours || state.hours || 5, weeks: weeks || state.weeks || 8, level: 1, jobId: id });
  $("b-learn") && ($("b-learn").textContent = "Lernplan wird erstellt …");
  // Direkt vorbereiten: der von HR geprüfte Kurs der Stelle; nach dem Test (Lücken): neuer, persönlicher Plan
  if (j.course && !weak.some((w) => w.includes("Lücke"))) { state.plan = j.course; state.weeks = j.course.weeks; }
  else state.plan = await api("plan", { level: 1, weak }).catch(() => null);
  localStorage.setItem(KEY, JSON.stringify(state));
  renderPlan();
}

/* ---------- Bewerber: Skilltest ---------- */
async function applyView(id) {
  let j;
  try { j = await call("GET", "/api/job/" + id); } catch { return view(`<h1>Stelle nicht gefunden</h1>`); }
  const terminal = j.exam === "terminal";
  view(`<p class="muted"><a href="#/j/${id}">← ${esc(j.title)}</a></p><h1>Skilltest</h1>
    ${terminal ? `<p class="muted small">Ablauf: ${j.questions.length} Fragen → Praxisteil im Terminal (5 Minuten) → kurzes Erklärvideo</p>` : ""}
    <input class="field" id="an" placeholder="Dein Name" aria-label="Name" style="margin-top:16px">
    <input class="field" id="ac" placeholder="E-Mail (optional)" aria-label="Kontakt" style="margin-top:8px">
    ${j.questions.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.q)}</legend>
      ${q.options.map((o, v) => `<label class="opt"><input type="radio" name="q${i}" value="${v}"> ${esc(o)}</label>`).join("")}</fieldset>`).join("")}
    ${!terminal && j.task ? `<fieldset><legend>Praxisaufgabe</legend><p class="muted small">${esc(j.task)}</p><textarea id="ap" placeholder="Deine Lösung und warum du sie so gewählt hast …"></textarea></fieldset>` : ""}
    <button class="primary" id="asub">${terminal ? "Weiter zum Praxisteil →" : "Abschicken"}</button><p id="amsg" class="muted"></p>`);
  $("asub").onclick = () => {
    if (!$("an").value.trim()) return ($("amsg").textContent = "Bitte gib deinen Namen an.");
    const answers = j.questions.map((_, i) => { const c = document.querySelector(`input[name=q${i}]:checked`); return c ? +c.value : -1; });
    const base = { name: $("an").value, contact: $("ac").value, answers };
    if (terminal) examIntro(j, id, base);
    else sendApplication(j, id, { ...base, practical: $("ap") ? $("ap").value : "" }, null);
  };
}

/* ---------- Praxisteil: Terminal mit 5-Minuten-Timer ---------- */
function examIntro(j, id, base) {
  view(`<p class="eyebrow">Praxisteil</p><h1>Daten im Terminal analysieren</h1>
    <p>Du bekommst einen Projektordner mit einem Datensatz und ein Terminal. Finde in <b>5 Minuten</b> die Variable, die am stärksten mit dem Verbrauch zusammenhängt.</p>
    <ul class="muted"><li>Die Aufgabe steht in <code>README.md</code>, Hilfe gibt <code>help</code>.</li><li>Gib deine Antwort mit <code>submit &lt;spalte&gt;</code> ab.</li><li>Danach nimmst du ein kurzes Video auf, in dem du erklärst, warum du so vorgegangen bist.</li></ul>
    <button class="primary" id="exstart">Aufgabe starten – Timer läuft ab dem Klick</button>`);
  $("exstart").onclick = () => {
    view(`<div id="exam-box"></div>`);
    startTerminal($("exam-box"), (t) => videoStep(j, id, { ...base, terminal: t }));
  };
}

/* ---------- Erklärvideo hochladen ---------- */
const VIDEO_OK = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
function videoStep(j, id, payload) {
  view(`<p class="eyebrow">Letzter Schritt</p><h1>Erkläre dein Vorgehen</h1>
    <p>${payload.terminal.timedOut ? "Die Zeit ist abgelaufen. " : ""}Lade ein kurzes Video hoch (max. 3 Minuten, mp4, webm oder mov, bis 150 MB, auf der Online-Demo max. 4 MB), in dem du erklärst, <b>warum</b> du so vorgegangen bist: Welche Schritte hast du gemacht, was hast du geprüft und wie sicher bist du dir?</p>
    <input type="file" id="vf" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" style="margin-top:16px">
    <div class="meter wide" id="vbar" hidden><i style="width:0"></i></div>
    <p id="vmsg" class="muted small"></p>
    <div class="stack"><button class="primary" id="vsend" style="margin-top:8px">Bewerbung abschicken</button>
    <button class="ghost" id="vskip" style="margin-top:0">Ohne Video abschicken</button></div>`);
  const go = (file) => { $("vsend").disabled = $("vskip").disabled = true; sendApplication(j, id, payload, file); };
  $("vsend").onclick = () => {
    const f = $("vf").files[0];
    const type = f && (VIDEO_OK[f.name.split(".").pop().toLowerCase()] || (Object.values(VIDEO_OK).includes(f.type) ? f.type : ""));
    if (!f) return ($("vmsg").textContent = "Bitte wähle ein Video aus oder sende ohne Video.");
    if (!type) return ($("vmsg").textContent = "Nur mp4, webm oder mov.");
    if (f.size > 150 * 1024 * 1024) return ($("vmsg").textContent = "Das Video ist größer als 150 MB.");
    go({ file: f, type });
  };
  $("vskip").onclick = () => go(null);
}

function putVideo(id, r, v, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `/api/job/${id}/video?app=${encodeURIComponent(r.appId)}&t=${encodeURIComponent(r.upToken)}`);
    x.setRequestHeader("content-type", v.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      if (x.status === 200) return resolve();
      let m = "";
      try { m = JSON.parse(x.responseText).error; } catch {}
      reject(new Error(m || (x.status === 413 ? "Video zu groß für diesen Server" : "Fehler " + x.status)));
    };
    x.onerror = () => reject(new Error("Netzwerkfehler"));
    x.send(v.file);
  });
}

async function sendApplication(j, id, payload, video) {
  const msg = $("vmsg") || $("amsg");
  if (msg) msg.textContent = "Bewerbung wird ausgewertet …";
  let r;
  try { r = await call("POST", `/api/job/${id}/apply`, payload); }
  catch (e) { return view(`<h1>Das hat nicht geklappt</h1><p class="muted">${esc(e.message)}</p><a href="#/j/${id}">Zurück zur Stelle</a>`); }
  let videoState = video ? "ok" : "none";
  if (video) {
    const bar = $("vbar");
    bar.hidden = false;
    try { await putVideo(id, r, video, (p) => { bar.firstElementChild.style.width = Math.round(p * 100) + "%"; msg.textContent = `Video wird hochgeladen … ${Math.round(p * 100)} %`; }); }
    catch (e) { videoState = "failed:" + e.message; }
  }
  resultView(j, id, r, videoState);
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function resultView(j, id, r, videoState = "none") {
  view(`<p class="muted">${esc(j.title)}</p><h1>Deine Bewerbung ist eingegangen ✓</h1>
    <p>Testergebnis: <b>${r.score} %</b>${r.terminal ? ` <span class="muted small">(Fragen ${r.mcScore} %, Praxisteil ${r.terminal.correct ? "✓" : "✗"})</span>` : ""}</p>
    ${Object.entries(r.per).map(([s, p]) => `<div class="row"><span>${esc(s)}</span><span class="small muted">${p.right}/${p.total} ${meter((100 * p.right) / p.total)}</span></div>`).join("")}
    ${r.terminal ? `<h3>Praxisteil im Terminal</h3><p>${r.terminal.correct ? "✓ Du hast die richtige Variable gefunden" : "✗ Die abgegebene Variable war nicht die richtige"}${r.terminal.seconds ? ` · Zeit ${mmss(r.terminal.seconds)}` : ""}</p>` : ""}
    ${r.practical ? `<h3>Praxisaufgabe: ${r.practical.score}/3</h3><p class="muted">${esc(r.practical.feedback)}</p>` : ""}
    ${videoState === "ok" ? `<p class="note">Dein Erklärvideo wurde hochgeladen.</p>` : videoState.startsWith("failed") ? `<p class="note">Das Video konnte nicht hochgeladen werden (${esc(videoState.slice(7))}). Deine Bewerbung ist trotzdem gespeichert.</p>` : r.terminal ? `<p class="note">Du hast kein Erklärvideo hochgeladen.</p>` : ""}
    <p class="note">Das Unternehmen sieht genau diese Ergebnisse.</p>
    ${r.gaps.length ? `<h3>Hier kannst du zulegen</h3><p>${r.gaps.map(esc).join(", ")}</p><button class="primary" id="gapplan" style="margin-top:8px">Lernplan für diese Lücken</button>` : ""}`);
  if (r.gaps.length) $("gapplan").onclick = () => { $("gapplan").textContent = "Lernplan wird erstellt …"; learnFor(j, id, r.gaps.map((g) => g + " (Lücke im Test)"), state.hours, state.weeks); };
}

/* ---------- HR: Dashboard ---------- */
async function dashboard(id, token) {
  const tk = token || hrTokens()[id] || "";
  let d;
  try { d = await call("GET", `/api/job/${id}/applicants?token=${encodeURIComponent(tk)}`); }
  catch { return view(`<h1>Kein Zugriff</h1><a href="#">Zur Startseite</a>`); }
  view(`<p class="muted">Dashboard</p><h1>${esc(d.title)}</h1>
    <p class="link">Bewerber-Link: <a href="#/j/${id}">${base()}#/j/${id}</a></p>
    <h3>${d.apps.length} Bewerbung${d.apps.length === 1 ? "" : "en"}</h3>
    ${d.apps.map((a) => `<div class="phase"><b>${esc(a.name)} · ${a.score} %${a.practical ? ` · Praxis ${a.practical.score}/3` : ""}</b>
      ${a.contact ? `<span class="muted small">${esc(a.contact)}</span>` : ""}
      ${Object.entries(a.per).map(([s, p]) => `<div class="row"><span class="small">${esc(s)}</span>${meter((100 * p.right) / p.total)}</div>`).join("")}
      ${a.practical ? `<p class="muted small">${esc(a.practical.feedback)}</p>` : ""}
      ${a.terminal ? `<p class="small" style="margin-top:12px"><b>Terminal:</b> ${a.terminal.correct ? "✓ richtig" : "✗ falsch"} (Antwort: ${esc(a.terminal.answer || "keine")}) · ${a.terminal.timedOut ? "Zeit abgelaufen" : mmss(a.terminal.seconds)} · Daten bereinigt: ${a.terminal.cleaned ? "ja" : "nein"} · ${a.terminal.cmds.length} Befehle</p>
        <details class="small muted"><summary>Befehlsverlauf</summary><pre>${esc(a.terminal.cmds.join("\n") || "–")}</pre></details>` : ""}
      ${a.hasVideo ? `<video controls preload="metadata" style="width:100%;border-radius:20px;margin-top:12px" src="/api/job/${id}/video/${a.id}?token=${encodeURIComponent(tk)}"></video>` : a.terminal ? `<p class="muted small">Kein Erklärvideo.</p>` : ""}</div>`).join("") || `<p class="muted">Noch keine Bewerbungen.</p>`}
    <p class="note">Die Reihenfolge ist eine Entscheidungshilfe, kein Urteil. Bitte prüfe Ergebnisse immer im Gespräch.</p>`);
}

/* ---------- Router ---------- */
function route() {
  const p = location.hash.replace(/^#\/?/, "").split("/");
  if (p[0] === "hr") return p[1] ? dashboard(p[1], p[2]) : hrUpload();
  if (p[0] === "j" && p[1]) return p[2] === "apply" ? applyView(p[1]) : jobLanding(p[1]);
  show(state.level === null ? "s-ask" : "s-plan");
}
addEventListener("hashchange", route);
if (location.hash.length > 2) route();
