"use strict";
// Bewerbungsfunnel: HR lädt Anzeige hoch → Bewerber wählt Kurs oder direkten Skilltest → HR sieht Ergebnisse.
// Nutzt $, esc, show, state, api, renderPlan aus app.js.

const HRKEY = "dreamz.hr";
const view = (html) => { $("s-view").innerHTML = html; show("s-view"); };
const call = (method, url, body) =>
  fetch(url, { method, headers: { "content-type": "application/json" }, body: body && JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
const base = () => location.origin + location.pathname;
const tags = (s) => `<span class="tag">${s.type === "soft" ? "Soft" : "Hard"} · Niveau ${s.level}</span><span class="tag ${s.must ? "must" : ""}">${s.must ? "Muss" : "Nice-to-have"}</span>`;
const meter = (p) => `<div class="meter"><i style="width:${p}%"></i></div>`;
const hrTokens = () => { try { return JSON.parse(localStorage.getItem(HRKEY) || "{}"); } catch { return {}; } };

/* ---------- HR: Anzeige hochladen ---------- */
function hrUpload() {
  view(`<p class="muted"><a href="#">← Zurück</a> · Für Unternehmen</p>
    <h1>Stellenanzeige hochladen</h1>
    <p>Daraus entstehen Skill-Profil, Skilltest und ein Vorbereitungskurs für Bewerber. Du prüfst es kurz und veröffentlichst.</p>
    <textarea id="jt" placeholder="Text der Stellenanzeige hier einfügen …"></textarea>
    <input type="file" id="jf" accept=".txt,.md" class="small muted">
    <button class="primary" id="jgo">Profil erstellen</button><p id="jmsg" class="muted"></p>`);
  $("jf").onchange = (e) => e.target.files[0] && e.target.files[0].text().then((t) => ($("jt").value = t));
  $("jgo").onclick = async () => {
    if (!$("jt").value.trim()) return;
    $("jgo").disabled = true; $("jmsg").textContent = "Anzeige wird ausgewertet …";
    try { review(await call("POST", "/api/job/parse", { text: $("jt").value })); }
    catch (e) { $("jgo").disabled = false; $("jmsg").textContent = "Fehlgeschlagen: " + e.message + " (Läuft der Server mit ANTHROPIC_API_KEY?)"; }
  };
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
      <h3>Praxisaufgabe</h3><textarea id="rk">${esc(d.task)}</textarea>
      <p class="note">Bewerber sehen Profil und Anforderungen offen. Der Test ist eine Entscheidungshilfe für dich – die Entscheidung bleibt bei Menschen.</p>
      <button class="primary" id="pub">Veröffentlichen</button><p id="pmsg" class="muted"></p>`);
    const sync = () => { d.title = $("rt").value; d.company = $("rc").value; d.task = $("rk").value; };
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
    <p class="note">Der Test: ${j.questions.length} Fragen zu diesen Skills${j.task ? " + 1 Praxisaufgabe" : ""}. Das Unternehmen sieht dein Ergebnis pro Skill – du siehst es auch.</p>
    <div class="stack" style="margin-top:24px">
      <button class="primary" id="b-apply" style="margin:0">Direkt bewerben – Skilltest starten</button>
      <button id="b-learn">Erst vorbereiten – Lernplan für diese Stelle</button>
      <select id="hrs" class="field" aria-label="Zeit pro Woche"><option value="2">1–2 Stunden pro Woche</option><option value="5" selected>3–5 Stunden pro Woche</option><option value="10">6+ Stunden pro Woche</option></select>
      <select id="wks" class="field" aria-label="Dauer"><option value="4">4 Wochen</option><option value="8" selected>8 Wochen</option><option value="12">12 Wochen</option></select>
    </div>`);
  $("b-apply").onclick = () => (location.hash = `#/j/${id}/apply`);
  $("b-learn").onclick = () => learnFor(j, id, j.skills.filter((s) => s.must).map((s) => `${s.name} (Niveau ${s.level})`), +$("hrs").value, +$("wks").value);
}

// Kurs: Lernplan aus den Anforderungen der Stelle, danach geht es mit "Jetzt bewerben" zurück
async function learnFor(j, id, weak, hours, weeks) {
  Object.assign(state, { topic: j.title, context: "Beruf", hours: hours || state.hours || 5, weeks: weeks || state.weeks || 8, level: 1, jobId: id });
  $("b-learn") && ($("b-learn").textContent = "Lernplan wird erstellt …");
  state.plan = await api("plan", { level: 1, weak }).catch(() => null);
  localStorage.setItem(KEY, JSON.stringify(state));
  renderPlan();
}

/* ---------- Bewerber: Skilltest ---------- */
async function applyView(id) {
  let j;
  try { j = await call("GET", "/api/job/" + id); } catch { return view(`<h1>Stelle nicht gefunden</h1>`); }
  view(`<p class="muted"><a href="#/j/${id}">← ${esc(j.title)}</a></p><h1>Skilltest</h1>
    <input class="field" id="an" placeholder="Dein Name" aria-label="Name">
    <input class="field" id="ac" placeholder="E-Mail (optional)" aria-label="Kontakt" style="margin-top:8px">
    ${j.questions.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.q)}</legend>
      ${q.options.map((o, v) => `<label class="opt"><input type="radio" name="q${i}" value="${v}"> ${esc(o)}</label>`).join("")}</fieldset>`).join("")}
    ${j.task ? `<fieldset><legend>Praxisaufgabe</legend><p class="muted small">${esc(j.task)}</p><textarea id="ap" placeholder="Deine Lösung und warum du sie so gewählt hast …"></textarea></fieldset>` : ""}
    <button class="primary" id="asub">Abschicken</button><p id="amsg" class="muted"></p>`);
  $("asub").onclick = async () => {
    const answers = j.questions.map((_, i) => { const c = document.querySelector(`input[name=q${i}]:checked`); return c ? +c.value : -1; });
    if (!$("an").value.trim()) return ($("amsg").textContent = "Bitte gib deinen Namen an.");
    $("asub").disabled = true; $("amsg").textContent = "Wird ausgewertet …";
    try {
      const r = await call("POST", `/api/job/${id}/apply`, { name: $("an").value, contact: $("ac").value, answers, practical: $("ap") ? $("ap").value : "" });
      resultView(j, id, r);
    } catch (e) { $("asub").disabled = false; $("amsg").textContent = "Fehlgeschlagen: " + e.message; }
  };
}

function resultView(j, id, r) {
  view(`<p class="muted">${esc(j.title)}</p><h1>Deine Bewerbung ist eingegangen ✓</h1>
    <p>Testergebnis: <b>${r.score} %</b></p>
    ${Object.entries(r.per).map(([s, p]) => `<div class="row"><span>${esc(s)}</span><span class="small muted">${p.right}/${p.total} ${meter((100 * p.right) / p.total)}</span></div>`).join("")}
    ${r.practical ? `<h3>Praxisaufgabe: ${r.practical.score}/3</h3><p class="muted">${esc(r.practical.feedback)}</p>` : ""}
    <p class="note">Das Unternehmen sieht genau diese Ergebnisse.</p>
    ${r.gaps.length ? `<h3>Hier kannst du zulegen</h3><p>${r.gaps.map(esc).join(", ")}</p><button class="primary" id="gapplan" style="margin-top:8px">Lernplan für diese Lücken</button>` : ""}`);
  if (r.gaps.length) $("gapplan").onclick = () => { $("gapplan").textContent = "Lernplan wird erstellt …"; learnFor(j, id, r.gaps.map((g) => g + " (Lücke im Test)"), state.hours, state.weeks); };
}

/* ---------- HR: Dashboard ---------- */
async function dashboard(id, token) {
  let d;
  try { d = await call("GET", `/api/job/${id}/applicants?token=${encodeURIComponent(token || hrTokens()[id] || "")}`); }
  catch { return view(`<h1>Kein Zugriff</h1><a href="#">Zur Startseite</a>`); }
  view(`<p class="muted">Dashboard</p><h1>${esc(d.title)}</h1>
    <p class="link">Bewerber-Link: <a href="#/j/${id}">${base()}#/j/${id}</a></p>
    <h3>${d.apps.length} Bewerbung${d.apps.length === 1 ? "" : "en"}</h3>
    ${d.apps.map((a) => `<div class="phase"><b>${esc(a.name)} · ${a.score} %${a.practical ? ` · Praxis ${a.practical.score}/3` : ""}</b>
      ${a.contact ? `<span class="muted small">${esc(a.contact)}</span>` : ""}
      ${Object.entries(a.per).map(([s, p]) => `<div class="row"><span class="small">${esc(s)}</span>${meter((100 * p.right) / p.total)}</div>`).join("")}
      ${a.practical ? `<p class="muted small">${esc(a.practical.feedback)}</p>` : ""}</div>`).join("") || `<p class="muted">Noch keine Bewerbungen.</p>`}
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
