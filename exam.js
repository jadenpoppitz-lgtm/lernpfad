"use strict";
// Praxisteil für Data-Science-Stellen: Fake-Terminal mit Projektordner, Datensatz und 5-Minuten-Timer.
// Läuft komplett im Browser; die Auswertung (richtige Spalte) macht der Server.

const EXAM_SECONDS = 300;
const EXAM_NUM = ["temperatur_c", "wind_kmh", "luftfeuchte_pct", "strompreis_ct", "verbrauch_kwh"];
const EXAM_COLS = ["datum", "anlage_id", ...EXAM_NUM];
const SENTINEL = -999;
const SHORT = { temperatur_c: "temp", wind_kmh: "wind", luftfeuchte_pct: "feucht", strompreis_ct: "preis", verbrauch_kwh: "verbr" };

/* ---------- Datensatz (deterministisch erzeugt) ---------- */
// Verbrauch hängt stark von der Temperatur ab (r ≈ −0,97). Acht Temperatur-Ausreißer (−999) verdecken das in den Rohdaten,
// und die Luftfeuchte (r ≈ 0,6) ist ein plausibler Fehlgriff.
function makeDataset() {
  let a = 2027;
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const N = 120, rows = [];
  for (let i = 0; i < N; i++) {
    const temp = +(11 + 9 * Math.sin((i / N) * 2 * Math.PI * 1.1) + gauss() * 2).toFixed(1);
    const wind = +Math.max(2, 18 + gauss() * 7).toFixed(1);
    const feucht = Math.round(Math.min(98, Math.max(30, 64 - 0.9 * (temp - 11) + gauss() * 7)));
    const preis = +(27 + gauss() * 4 + 0.12 * wind).toFixed(1);
    const verbr = Math.round(540 - 15 * temp + 0.9 * wind + gauss() * 22);
    rows.push({ datum: new Date(Date.UTC(2025, 0, 1 + i * 3)).toISOString().slice(0, 10), anlage_id: "A" + (1 + (i % 4)),
      temperatur_c: temp, wind_kmh: wind, luftfeuchte_pct: feucht, strompreis_ct: preis, verbrauch_kwh: verbr });
  }
  [7, 19, 33, 48, 62, 77, 91, 105].forEach((i) => (rows[i].temperatur_c = SENTINEL));
  return rows;
}

const mean = (v) => v.reduce((x, y) => x + y, 0) / v.length;
const std = (v) => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
function pearson(x, y) {
  const mx = mean(x), my = mean(y);
  let s = 0, sx = 0, sy = 0;
  for (let i = 0; i < x.length; i++) { s += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
  return s / Math.sqrt(sx * sy);
}

/* ---------- Dateisystem ---------- */
const README = `# Verbrauchsanalyse – Lumora Analytics

Aufgabe (5 Minuten):
Finde heraus, welche Variable in data/energie_2025.csv am stärksten
mit verbrauch_kwh zusammenhängt (positiv oder negativ).

Die Daten kommen direkt aus der Anlagen-Sensorik.
Hilfe zu den Werkzeugen: help

Antwort abgeben:  submit <spaltenname>`;
const NOTIZEN = `Kunde (Stadtwerke) vermutet, dass der Verbrauch vor allem vom Wetter abhängt.
Bitte prüfen und eine klare Aussage liefern, welche Größe den Verbrauch am besten erklärt.`;
const SENSOREN = `Sensor-Doku
- temperatur_c: Außentemperatur in °C
- wind_kmh: Windgeschwindigkeit
- luftfeuchte_pct: relative Luftfeuchte in %
- strompreis_ct: Börsenstrompreis in ct/kWh
Hinweis: Bei Sensorausfall schreibt das System den Wert -999.`;

function makeFs() {
  return { projekt: { dir: {
    "README.md": { text: README },
    "notizen.txt": { text: NOTIZEN },
    data: { dir: { "energie_2025.csv": { csv: { cols: EXAM_COLS, rows: makeDataset() } }, "sensoren.txt": { text: SENSOREN } } },
  } } };
}

const csvLine = (cols, r) => cols.map((c) => r[c]).join(",");

/* ---------- Terminal ---------- */
function startTerminal(container, onDone) {
  const root = makeFs();
  let cwd = ["projekt"];
  const metrics = { cmds: [], described: false, cleaned: false };
  const history = [];
  let hpos = 0, finished = false;
  const startedAt = Date.now();

  container.innerHTML = `
    <div class="exam-head"><p class="eyebrow">Praxisteil · Terminal</p><div id="tm" class="timer" aria-live="off">05:00</div></div>
    <div class="exam">
      <aside class="files" id="files" aria-label="Projektordner"></aside>
      <div class="term" id="term">
        <div class="tout" id="tout" aria-live="polite"></div>
        <form id="tform"><label id="tprompt" for="tin"></label><input id="tin" autocomplete="off" autocapitalize="off" spellcheck="false"></form>
      </div>
    </div>`;
  const $t = (id) => container.querySelector("#" + id);
  const tout = $t("tout"), tin = $t("tin");

  const node = (parts) => parts.reduce((n, p) => (n && n.dir ? n.dir[p] : undefined), { dir: root });
  const resolve = (p) => {
    let parts = p.startsWith("/") || p.startsWith("~") ? [] : [...cwd];
    for (const seg of p.replace(/^~/, "").split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") parts.pop(); else parts.push(seg);
    }
    return parts;
  };
  const prompt = () => `analyst@lumora:~/${cwd.join("/")}$ `;
  const print = (text = "", cls = "") => {
    const d = document.createElement("div");
    d.className = "line " + cls;
    d.textContent = text;
    tout.appendChild(d);
    tout.scrollTop = tout.scrollHeight;
  };
  const csvText = (f) => [f.csv.cols.join(","), ...f.csv.rows.map((r) => csvLine(f.csv.cols, r))];
  const textOf = (n) => (n.csv ? csvText(n) : n.text.split("\n"));
  const pad = (s, n) => String(s).padEnd(n), rpad = (s, n) => String(s).padStart(n);

  const drawFiles = () => {
    const rows = [];
    const walk = (dir, depth, path) => Object.entries(dir).sort(([a, x], [b, y]) => (!!y.dir - !!x.dir) || a.localeCompare(b)).forEach(([name, n]) => {
      const full = [...path, name];
      if (n.dir) { rows.push(`<div class="fdir" style="padding-left:${depth * 14}px">▾ ${name}/</div>`); walk(n.dir, depth + 1, full); }
      else rows.push(`<button type="button" class="ffile" data-path="${full.join("/")}" style="margin-left:${depth * 14}px">${name}</button>`);
    });
    walk(root, 0, []);
    $t("files").innerHTML = rows.join("");
  };
  const setPrompt = () => { $t("tprompt").textContent = prompt(); };

  const numeric = (f, cols) => cols.map((c) => f.csv.rows.map((r) => r[c]));
  const needCsv = (arg) => {
    if (!arg) { print("Bitte eine CSV-Datei angeben, z. B. describe data/energie_2025.csv", "err"); return null; }
    const path = resolve(arg), n = node(path);
    if (!n) { print(`${arg}: Datei nicht gefunden`, "err"); return null; }
    if (!n.csv) { print(`${arg}: keine CSV-Datei`, "err"); return null; }
    return { n, path };
  };

  const finish = (answer, timedOut) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    tin.disabled = true;
    print(timedOut ? "⏱ Zeit abgelaufen." : `Antwort gespeichert: ${answer}`, "ok");
    setTimeout(() => onDone({ answer: answer || "", timedOut, seconds: Math.min(EXAM_SECONDS, Math.round((Date.now() - startedAt) / 1000)), ...metrics }), 1400);
  };

  const COMMANDS = {
    help() {
      ["Befehle:", "  ls, cd <ordner>, pwd, cat <datei>, head [-n N] <datei>, wc -l <datei>, clear",
        "  describe <csv>               Kennzahlen je Spalte",
        "  corr <csv> [spalte spalte]   Korrelation nach Pearson (ohne Spalten: Matrix)",
        "  clean <csv>                  entfernt Zeilen mit Fehlwerten, speichert <name>_clean.csv",
        "  submit <spalte>              Antwort abgeben"].forEach((l) => print(l));
    },
    pwd() { print("/home/analyst/" + cwd.join("/")); },
    clear() { tout.innerHTML = ""; },
    ls(args) {
      const n = args[0] ? node(resolve(args[0])) : node(cwd);
      if (!n) return print(`ls: ${args[0]}: Ordner nicht gefunden`, "err");
      if (!n.dir) return print(args[0]);
      print(Object.entries(n.dir).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => (v.dir ? k + "/" : k)).join("   ") || "(leer)");
    },
    cd(args) {
      const parts = args[0] ? resolve(args[0]) : ["projekt"];
      const n = node(parts);
      if (!parts.length) return print("cd: außerhalb des Projekts nicht erlaubt", "err");
      if (!n || !n.dir) return print(`cd: ${args[0]}: Ordner nicht gefunden`, "err");
      cwd = parts; setPrompt();
    },
    cat(args) {
      const n = args[0] && node(resolve(args[0]));
      if (!n) return print(args[0] ? `cat: ${args[0]}: Datei nicht gefunden` : "cat: Datei angeben", "err");
      if (n.dir) return print(`cat: ${args[0]}: ist ein Ordner`, "err");
      const lines = textOf(n);
      if (lines.length > 25) { lines.slice(0, 25).forEach((l) => print(l)); print(`… (${lines.length - 25} weitere Zeilen – nutze head, describe oder corr)`, "dim"); }
      else lines.forEach((l) => print(l));
    },
    head(args) {
      let n = 5;
      const i = args.indexOf("-n");
      if (i >= 0) { n = Math.min(50, Math.max(1, +args[i + 1] || 5)); args = args.filter((_, j) => j !== i && j !== i + 1); }
      const f = args[0] && node(resolve(args[0]));
      if (!f || f.dir) return print(args[0] ? `head: ${args[0]}: Datei nicht gefunden` : "head: Datei angeben", "err");
      textOf(f).slice(0, n + (f.csv ? 1 : 0)).forEach((l) => print(l));
    },
    wc(args) {
      const f = args[1] && node(resolve(args[1]));
      if (args[0] !== "-l" || !f || f.dir) return print("Benutzung: wc -l <datei>", "err");
      print(`${textOf(f).length} ${args[1]}`);
    },
    describe(args) {
      const r = needCsv(args[0]); if (!r) return;
      metrics.described = true;
      print(pad("", 16) + ["count", "mean", "std", "min", "max"].map((h) => rpad(h, 9)).join(""));
      EXAM_NUM.forEach((c) => {
        const v = r.n.csv.rows.map((x) => x[c]);
        print(pad(c, 16) + [v.length, mean(v).toFixed(2), std(v).toFixed(2), Math.min(...v).toFixed(2), Math.max(...v).toFixed(2)].map((x) => rpad(x, 9)).join(""));
      });
    },
    corr(args) {
      const r = needCsv(args[0]); if (!r) return;
      const rows = r.n.csv.rows;
      if (args.length >= 3) {
        const [a, b] = [args[1], args[2]];
        if (!EXAM_NUM.includes(a) || !EXAM_NUM.includes(b)) return print(`Spalten: ${EXAM_NUM.join(", ")}`, "err");
        return print(`r(${a}, ${b}) = ${pearson(rows.map((x) => x[a]), rows.map((x) => x[b])).toFixed(3)}   (n = ${rows.length})`);
      }
      print(pad("", 16) + EXAM_NUM.map((c) => rpad(SHORT[c], 8)).join(""));
      EXAM_NUM.forEach((a) => print(pad(a, 16) + EXAM_NUM.map((b) => rpad(pearson(rows.map((x) => x[a]), rows.map((x) => x[b])).toFixed(2), 8)).join("")));
      print(`n = ${rows.length}`, "dim");
    },
    clean(args) {
      const r = needCsv(args[0]); if (!r) return;
      const kept = r.n.csv.rows.filter((x) => EXAM_NUM.every((c) => Number.isFinite(x[c]) && x[c] !== SENTINEL));
      const dir = node(r.path.slice(0, -1)).dir, name = r.path[r.path.length - 1].replace(/\.csv$/, "") + "_clean.csv";
      dir[name] = { csv: { cols: r.n.csv.cols, rows: kept } };
      metrics.cleaned = true;
      print(`${r.n.csv.rows.length - kept.length} Zeilen mit Fehlwerten entfernt. Gespeichert als ${name} (${kept.length} Zeilen).`);
      drawFiles();
    },
    submit(args) {
      const col = (args[0] || "").replace(/["']/g, "");
      if (!col) return print("Benutzung: submit <spaltenname>", "err");
      if (!EXAM_NUM.includes(col) || col === "verbrauch_kwh") return print(`Unbekannte oder ungültige Spalte. Möglich: ${EXAM_NUM.filter((c) => c !== "verbrauch_kwh").join(", ")}`, "err");
      finish(col, false);
    },
  };

  const run = (line) => {
    print(prompt() + line, "cmd");
    const parts = line.trim().split(/\s+/);
    const cmd = parts.shift();
    if (!cmd) return;
    metrics.cmds.push(line.trim().slice(0, 120));
    if (/^(python3?|pip|jupyter|ipython|pandas|R)$/i.test(cmd)) return print("Python ist in dieser Demo-Umgebung nicht installiert. Nutze die Werkzeuge aus `help`.", "err");
    if (COMMANDS[cmd] && cmd !== "constructor") COMMANDS[cmd](parts);
    else print(`${cmd}: Befehl nicht gefunden (help zeigt alle Befehle)`, "err");
  };

  $t("tform").onsubmit = (e) => {
    e.preventDefault();
    if (finished) return;
    const line = tin.value;
    tin.value = "";
    if (line.trim()) { history.push(line); hpos = history.length; }
    run(line);
  };
  tin.onkeydown = (e) => {
    if (e.key === "ArrowUp" && hpos > 0) { tin.value = history[--hpos]; e.preventDefault(); }
    if (e.key === "ArrowDown") { tin.value = hpos < history.length - 1 ? history[++hpos] : ((hpos = history.length), ""); e.preventDefault(); }
  };
  $t("term").onclick = () => tin.focus();
  $t("files").onclick = (e) => { const b = e.target.closest("button"); if (b && !finished) run("cat " + b.dataset.path); };

  const timer = setInterval(() => {
    const left = Math.max(0, EXAM_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
    $t("tm").textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
    $t("tm").classList.toggle("low", left <= 60);
    if (!left) finish("", true);
  }, 250);

  drawFiles(); setPrompt();
  print("dreamz-shell 1.0 – tippe `help` für alle Befehle. Die Aufgabe steht in projekt/README.md.", "dim");
  tin.focus();
}
