(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ---------- Theme ---------- */
  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = currentTheme();
  $("#themeBtn").addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });

  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }

  /* ---------- Sample data (fictional) ---------- */
  const CATALOG = [
    "AR-01|Arabika Gayo",
    "AR-02|Arabika Kintamani",
    "RB-01|Robusta Temanggung",
    "BL-01|House Blend",
  ].join("\n");

  const CLEAN = [
    "T1001|PWK-01|AR-01|20261027071503|28500.75",
    "T1002|PWK-01|BL-01|20261027073210|24000.50",
    "T1003|BDG-02|AR-02|20261027080145|41250.30",
    "T1004|BDG-02|AR-02|20261027081522|41250.30",
    "T1005|JKT-03|RB-01|20261027090011|22750.25",
    "T1006|JKT-03|AR-01|20261027091547|28500.75",
    "T1007|PWK-01|RB-01|20261027101200|22750.25",
    "T1008|BDG-02|BL-01|20261027103000|24000.50",
    "T1009|JKT-03|AR-02|20261028070512|41250.30",
    "T1010|BDG-02|AR-01|20261028071233|28500.75",
    "T1011|PWK-01|AR-02|20261028074501|41250.30",
    "T1012|JKT-03|RB-01|20261028080907|22750.25",
    "T1013|PWK-01|BL-01|20261028090030|24000.50",
    "T1014|BDG-02|AR-02|20261028093318|41250.30",
  ].join("\n");

  const MESSY = [
    "T1001|PWK-01|AR-01|20261027071503|28500.75",
    "T1002|PWK-01|BL-01|20261027073210|24000.50",
    "T1003|BDG-02|AR-02|20261027080145|41250.30",
    "T1004|BDG-02| ar-02 |20261027081522|41250.30",
    "T1005|JKT-03|RB-01|20261027090011|22750.25",
    "T1006|JKT-03|AR-01|20261027091547|28500.75",
    "T1007|PWK-01|LT-99|20261027101200|36500.40",
    "T1008|BDG-02|BL-01|2026-10-27 10:30|24000.50",
    "T1009|JKT-03|AR-02|20261027110405|",
    "T1010|PWK-01|AR-01|20261027113020|-28500.75",
    "T1011|PWK-01|rb-01|20261027120501|22750.25",
    "T1012|JKT-03|BL-01|20261027123344|24000.50",
    "T1013|BDG-02|AR-01|20261028070512|28500.75",
    "T1014|BDG-02|AR-01|20261028071233|28500.75",
    "T1015|PWK-01|AR-02|20261028074501|41250.30",
    "T1016|JKT-03|RB-01|20261028080907|22750.25",
    "T1017|JKT-03|RB-01|20261028081455|22750.25",
    "T1018|PWK-01|BL-01|20261028090030|24000.50",
    "T1019|BDG-02|AR-02|20261028093318|abc",
    "T1020|JKT-03|AR-01|20261028100145|28500.75",
    "T1021|PWK-01|LT-99|20261028103002|36500.40",
    "T1022|BDG-02| bl-01|20261028110511|24000.50",
  ].join("\n");

  const BROKEN = CLEAN.split("\n").map((l, i) => (i === 6 ? "T1007|PWK-01|RB-01|20261027101200" : l)).join("\n");
  const PRESETS = { clean: CLEAN, messy: MESSY, broken: BROKEN };

  /* ---------- Engine: a tiny model of the Spark SQL semantics that matter here ---------- */
  const FIELDS = ["ticket_no", "store_id", "sku", "sold_at", "line_amount"];

  function parseTs(s) {
    if (s == null || !/^\d{14}$/.test(s)) return null;           // to_timestamp → NULL when unparseable
    const [y, mo, d, h, mi, se] = [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8), s.slice(8, 10), s.slice(10, 12), s.slice(12, 14)].map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || h > 23 || mi > 59 || se > 59) return null;
    return { date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` };
  }

  // decimal(18,2) → integer cents (exact). float → IEEE-754 single precision, like Spark's FloatType.
  function parseAmount(s, decimal) {
    if (s == null) return null;
    const t = s.trim();
    const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(t);
    if (!m) return null;                                         // cast → NULL when not a number
    if (!decimal) return Math.fround(Number(t));
    const frac = (m[3] || "").padEnd(3, "0");
    let cents = Number(m[2]) * 100 + Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0);
    return m[1] === "-" ? -cents : cents;
  }

  const and3 = (a, b) => (a === false || b === false) ? false : (a === null || b === null) ? null : true;
  const not3 = a => (a === null ? null : !a);

  function parseCatalog(text) {
    const map = new Map();
    text.split("\n").forEach(line => {
      if (!line.trim()) return;
      const [sku, origin] = line.split("|");
      if (sku != null && origin != null) map.set(sku.trim(), origin.trim());
    });
    return map;
  }

  /**
   * Runs the job. `o.legacy` is the reference implementation: the behaviour the legacy graph had.
   * Returns stage counts, the rollup result, rejects, rows lost by 3-valued logic, etc.
   */
  function runJob(ordersText, catalogText, o) {
    const lines = ordersText.split("\n").map((l, i) => ({ l: l.replace(/\r$/, ""), n: i + 1 })).filter(x => x.l.trim() !== "");
    const catalog = parseCatalog(catalogText);
    const res = { input: lines.length, malformed: 0, rejects: [], lost: [], valid: 0, joinDropped: 0, lookupMissByCase: 0, groups: [] };

    // INPUT
    const raw = [];
    for (const { l, n } of lines) {
      let f = l.split("|");
      if (f.length !== FIELDS.length) {
        if (o.legacy) { res.rejects.push({ line: n, ticket: f[0] || "", reason: "malformed_record", rawLine: l }); continue; }
        if (o.mode === "FAILFAST") {
          res.error = { line: n, got: f.length, text: l };
          return res;
        }
        res.malformed++;                                          // PERMISSIVE: pad with NULL / drop extras
        f = f.slice(0, FIELDS.length);
        while (f.length < FIELDS.length) f.push(null);
      }
      raw.push({ n, f: f.map(v => (v === "" ? null : v)), rawLine: l });   // empty string is read as NULL
    }

    // REFORMAT
    const clean = raw.map(({ n, f, rawLine }) => {
      const [ticket, store, sku0, ts, amt] = f;
      const sku = sku0 == null ? null : (o.trimUpper ? sku0.trim().toUpperCase() : sku0);
      return { n, rawLine, ticket, store, sku, sku0, ts: parseTs(ts), amt: parseAmount(amt, o.decimal) };
    });

    // FILTER (SQL three-valued logic)
    const minUnits = o.decimal ? Math.round(o.minAmount * 100) : o.minAmount;
    const valid = [];
    for (const r of clean) {
      let cond = and3(r.ts !== null, r.amt === null ? null : r.amt >= minUnits);
      if (o.nullSafe) cond = cond === null ? false : cond;      // coalesce(cond, false)
      const reason = r.ts === null ? "bad_sold_at" : r.amt === null ? "bad_line_amount" : "below_min_amount";
      if (cond === true) valid.push(r);
      else if (not3(cond) === true) res.rejects.push({ line: r.n, ticket: r.ticket, reason, rawLine: r.rawLine });
      else res.lost.push({ line: r.n, ticket: r.ticket, reason, rawLine: r.rawLine });   // in neither output
    }
    res.valid = valid.length;

    // JOIN with ref.sku_catalog
    const enriched = [];
    for (const r of valid) {
      const origin = r.sku == null ? undefined : catalog.get(r.sku);
      if (origin === undefined && r.sku0 != null && catalog.has(r.sku0.trim().toUpperCase())) res.lookupMissByCase++;
      if (origin === undefined && o.join === "inner") { res.joinDropped++; continue; }
      enriched.push({ ...r, origin: origin === undefined ? null : origin });
    }
    res.enriched = enriched.length;

    // ROLLUP
    const groups = new Map();
    for (const r of enriched) {
      const g = { sale_date: r.ts.date };
      if (o.byStore) g.store_id = r.store;
      if (o.byOrigin) g.bean_origin = r.origin;
      const key = keyOf(g);
      if (!groups.has(key)) groups.set(key, { ...g, key, tickets: 0, gross: 0, exact: o.decimal });
      const acc = groups.get(key);
      acc.tickets++;
      acc.gross += r.amt;                                         // cents (exact) or float values summed as double
    }
    res.groups = Array.from(groups.values()).sort(sortRows);
    return res;
  }

  const keyOf = g => [g.sale_date, g.store_id, g.bean_origin].map(v => (v === undefined ? "" : v === null ? "∅" : v)).join("\u0001");
  function sortRows(a, b) {
    return (a.sale_date || "").localeCompare(b.sale_date || "") ||
      String(a.store_id ?? "").localeCompare(String(b.store_id ?? "")) ||
      String(a.bean_origin ?? "~").localeCompare(String(b.bean_origin ?? "~"));
  }
  // Exact decimal value as a string, so comparisons are not fooled by float formatting.
  function moneyStr(row) {
    if (row.exact) {
      const neg = row.gross < 0, c = Math.abs(row.gross);
      return (neg ? "-" : "") + Math.floor(c / 100) + "." + String(c % 100).padStart(2, "0");
    }
    return String(row.gross);
  }
  function moneyFmt(row) {
    const s = moneyStr(row);
    const [i, d] = s.split(".");
    const int = Number(i).toLocaleString("en-US");
    return d === undefined ? int + ".00" : int + "." + (d.length < 2 ? d.padEnd(2, "0") : d);
  }
  // Sum of gross_sales: exact cents when every row is decimal, otherwise a double (rows may mix after append runs).
  const sumMoney = rows => {
    const exact = rows.every(r => r.exact);
    return exact
      ? { gross: rows.reduce((s, r) => s + r.gross, 0), exact }
      : { gross: rows.reduce((s, r) => s + (r.exact ? r.gross / 100 : r.gross), 0), exact };
  };

  /* ---------- Target table (persisted across runs: that's what makes re-runs interesting) ---------- */
  const table = new Map();   // sale_date partition → rows
  let runs = 0;

  function writeTable(groups, mode) {
    const parts = new Map();
    groups.forEach(g => { if (!parts.has(g.sale_date)) parts.set(g.sale_date, []); parts.get(g.sale_date).push(g); });
    parts.forEach((rows, p) => {
      if (mode === "overwrite" || !table.has(p)) table.set(p, rows.map(r => ({ ...r })));
      else table.get(p).push(...rows.map(r => ({ ...r })));
    });
    return Array.from(parts.keys());
  }

  /* ---------- Reconciliation ---------- */
  function reconcile(act, exp, written) {
    const parts = new Set([...exp.groups.map(g => g.sale_date), ...written]);
    const actual = [];
    parts.forEach(p => (table.get(p) || []).forEach(r => actual.push(r)));
    actual.sort(sortRows);

    const expByKey = new Map(exp.groups.map(g => [g.key, g]));
    const seen = new Map();
    const rows = [];            // for the output table view
    const diffs = [];
    for (const r of actual) {
      const n = (seen.get(r.key) || 0) + 1;
      seen.set(r.key, n);
      const e = expByKey.get(r.key);
      let status = "ok", note = "";
      if (!e) { status = "extra"; note = "not in legacy output"; }
      else if (n > 1) { status = "dup"; note = "duplicate key"; }
      else {
        const bad = [];
        if (e.tickets !== r.tickets) bad.push(`tickets ${e.tickets} → ${r.tickets}`);
        if (r.exact ? moneyStr(e) !== moneyStr(r) : Number(moneyStr(e)) !== r.gross) bad.push(`gross ${moneyFmt(e)} → ${moneyFmt(r)}`);
        if (bad.length) { status = "diff"; note = bad.join(", "); }
      }
      rows.push({ r, status, note });
      if (status !== "ok") diffs.push({ key: r, status, note });
    }
    exp.groups.forEach(e => {
      if (!seen.has(e.key)) { rows.push({ r: e, status: "missing", note: "missing vs legacy" }); diffs.push({ key: e, status: "missing", note: "missing vs legacy" }); }
    });
    rows.sort((a, b) => sortRows(a.r, b.r));

    const sumT = a => a.reduce((s, r) => s + r.tickets, 0);
    const em = sumMoney(exp.groups), am = sumMoney(actual);
    const moneyEq = am.exact ? em.gross === am.gross : Number(moneyStr(em)) === am.gross;
    const checks = [
      { label: "Output rows", exp: exp.groups.length, act: actual.length },
      { label: "Σ tickets", exp: sumT(exp.groups), act: sumT(actual) },
      { label: "Σ gross_sales", exp: moneyFmt(em), act: moneyFmt(am), ok: moneyEq },
      { label: "Rejected rows", exp: exp.rejects.length, act: act.rejects.length },
      { label: "Rows accounted for", exp: `${exp.input} of ${exp.input}`, act: `${act.input - act.lost.length} of ${act.input}`, ok: act.lost.length === 0 },
      { label: "Row-level diff", exp: "0 diffs", act: `${diffs.length} diff${diffs.length === 1 ? "" : "s"}`, ok: diffs.length === 0 },
    ];
    checks.forEach(c => { if (c.ok === undefined) c.ok = String(c.exp) === String(c.act); });
    return { checks, rows, diffs, pass: checks.every(c => c.ok), dup: diffs.some(d => d.status === "dup"), moneyEq };
  }

  /* ---------- PySpark code that matches the current settings ---------- */
  function genCode(o) {
    const W = (text, warn) => ({ text, warn: !!warn });
    const min = Number.isInteger(o.minAmount) ? String(o.minAmount) : String(o.minAmount);
    const L = [
      W('from pyspark.sql import SparkSession, functions as F, types as T'),
      W(''),
      W('spark = SparkSession.builder.appName("coffee_sales_summary").getOrCreate()'),
      W('cfg, run_date = load_config(), args.run_date'),
      W(''),
      W('schema = T.StructType([T.StructField(c, T.StringType()) for c in'),
      W('    ["ticket_no", "store_id", "sku", "sold_at", "line_amount"]])'),
      o.mode === "FAILFAST"
        ? W('raw = (spark.read.option("sep", "|").option("mode", "FAILFAST")')
        : W('raw = (spark.read.option("sep", "|").option("mode", "PERMISSIVE")   # ⚠ bad lines become NULLs', true),
      W('      .schema(schema).csv(f"{cfg.landing}/orders/{run_date}/"))'),
      W(''),
      W('clean = raw.select('),
      W('    "ticket_no", "store_id",'),
      o.trimUpper
        ? W('    F.upper(F.trim("sku")).alias("sku"),')
        : W('    F.col("sku"),                                  # ⚠ raw key, no trim/upper', true),
      W('    F.to_timestamp("sold_at", "yyyyMMddHHmmss").alias("sold_at"),'),
      o.decimal
        ? W('    F.col("line_amount").cast("decimal(18,2)").alias("line_amount"),')
        : W('    F.col("line_amount").cast("float").alias("line_amount"),   # ⚠ binary float', true),
      W(')'),
      W(''),
      ...(o.nullSafe
        ? [W('is_valid = F.coalesce('),
           W(`    F.col("sold_at").isNotNull() & (F.col("line_amount") >= ${min}), F.lit(False))`)]
        : [W(`is_valid = F.col("sold_at").isNotNull() & (F.col("line_amount") >= ${min})   # ⚠ may be NULL`, true)]),
      W('valid   = clean.filter(is_valid)'),
      W('rejects = clean.filter(~is_valid).withColumn("reject_reason",'),
      W('    F.when(F.col("sold_at").isNull(), "bad_sold_at")'),
      W('     .when(F.col("line_amount").isNull(), "bad_line_amount")'),
      W('     .otherwise("below_min_amount"))'),
      W(''),
      W('dim = spark.table("ref.sku_catalog").select("sku", "bean_origin")'),
      o.join === "left"
        ? W('enriched = valid.join(F.broadcast(dim), "sku", "left")')
        : W('enriched = valid.join(F.broadcast(dim), "sku", "inner")   # ⚠ drops unknown SKUs', true),
      W(''),
      W('daily = (enriched'),
      W('    .withColumn("sale_date", F.to_date("sold_at"))'),
      W(`    .groupBy(${["sale_date", o.byStore && "store_id", o.byOrigin && "bean_origin"].filter(Boolean).map(c => `"${c}"`).join(", ")})`),
      W('    .agg(F.count("*").alias("tickets"), F.sum("line_amount").alias("gross_sales")))'),
      W(''),
      ...(o.write === "overwrite"
        ? [W('spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")'),
           W('(daily.write.mode("overwrite").partitionBy("sale_date")')]
        : [W('(daily.write.mode("append").partitionBy("sale_date")     # ⚠ re-runs add duplicates', true)]),
      W('      .parquet(f"{cfg.curated}/sales_by_store/"))'),
      W('rejects.write.mode("overwrite").parquet(f"{cfg.quarantine}/orders/{run_date}/")'),
    ];
    return L;
  }

  function highlight(src) {
    const re = /(#.*$)|(f?"(?:[^"\\]|\\.)*")|\b(from|import|as|for|in|not|and|or|True|False|None)\b|\b(\d+(?:\.\d+)?)\b|\b(spark|F|T|cfg)\b|\b([A-Za-z_]\w*)(?=\()/g;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : m[4] ? "n" : m[5] ? "b" : "f";
      out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  /* ---------- UI ---------- */
  const ordersEl = $("#orders"), catalogEl = $("#catalog");
  const DEFAULTS = { mode: "FAILFAST", trimUpper: true, decimal: true, nullSafe: true, join: "left", minAmount: 0, byStore: true, byOrigin: true, write: "overwrite" };

  function readOpts() {
    const min = Number($("#optMin").value);
    return {
      mode: $('input[name="mode"]:checked').value,
      trimUpper: $("#optTrim").checked,
      decimal: $("#optDecimal").checked,
      nullSafe: $("#optNullSafe").checked,
      join: $('input[name="join"]:checked').value,
      minAmount: Number.isFinite(min) ? min : 0,
      byStore: $("#optByStore").checked,
      byOrigin: $("#optByOrigin").checked,
      write: $('input[name="write"]:checked').value,
    };
  }
  function applyOpts(o) {
    $(`input[name="mode"][value="${o.mode}"]`).checked = true;
    $("#optTrim").checked = o.trimUpper;
    $("#optDecimal").checked = o.decimal;
    $("#optNullSafe").checked = o.nullSafe;
    $(`input[name="join"][value="${o.join}"]`).checked = true;
    $("#optMin").value = o.minAmount;
    $("#optByStore").checked = o.byStore;
    $("#optByOrigin").checked = o.byOrigin;
    $(`input[name="write"][value="${o.write}"]`).checked = true;
  }
  const legacyOf = o => ({ ...o, legacy: true, trimUpper: true, decimal: true, nullSafe: true, join: "left" });

  function renderCode() {
    const lines = genCode(readOpts());
    $("#genCode").innerHTML = lines.map(l => `<span class="ln${l.warn ? " is-warn" : ""}">${highlight(l.text) || " "}</span>`).join("");
  }

  // Tabs
  const tabs = $$('.tabs [role="tab"]');
  function showTab(id) {
    tabs.forEach(t => {
      const on = t.id === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => showTab(t.id));
    t.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); showTab(n.id);
    });
  });

  // Stage strip
  const stageEls = Object.fromEntries($$("#stages li").map(li => [li.dataset.stage, li]));
  function setStage(name, value, sub, cls) {
    const li = stageEls[name];
    li.classList.remove("is-ok", "is-warn", "is-bad", "is-active");
    if (cls) li.classList.add(cls);
    $("b", li).textContent = value;
    $("small", li).innerHTML = sub;
  }
  function resetStages() {
    Object.keys(stageEls).forEach(k => setStage(k, "–", $("small", stageEls[k]).dataset.orig || $("small", stageEls[k]).innerHTML));
  }
  Object.values(stageEls).forEach(li => { $("small", li).dataset.orig = $("small", li).innerHTML; });

  // Challenges
  const CH_KEY = "pg-challenges";
  let done = new Set();
  try { done = new Set(JSON.parse(store.get(CH_KEY) || "[]")); } catch (e) { done = new Set(); }
  function renderChallenges(fresh = []) {
    $$("#challenges li").forEach(li => {
      li.classList.toggle("is-done", done.has(li.dataset.ch));
      li.classList.toggle("is-new", fresh.includes(li.dataset.ch));
    });
    $("#chScore").textContent = done.size;
  }
  const CH_NAMES = Object.fromEntries($$("#challenges li").map(li => [li.dataset.ch, $("b", li).textContent]));
  function award(list) {
    const fresh = list.filter(c => !done.has(c));
    fresh.forEach(c => done.add(c));
    store.set(CH_KEY, JSON.stringify([...done]));
    renderChallenges(fresh);
    if (fresh.length) toast(`Challenge found: ${fresh.map(c => CH_NAMES[c]).join(", ")}${done.size === 7 ? ". All 7! 🎉" : ""}`);
  }
  $("#chReset").addEventListener("click", () => { done.clear(); store.set(CH_KEY, "[]"); renderChallenges(); });

  // Verdict
  function verdict(state, title, text) {
    const v = $("#verdict");
    v.dataset.state = state;
    $(".verdict__icon", v).textContent = { pass: "✓", fail: "✗", stopped: "■", idle: "?" }[state];
    $("#verdictTitle").textContent = title;
    $("#verdictText").innerHTML = text;
  }

  function groupCells(g, o) {
    return `<td>${esc(g.sale_date)}</td>` +
      (o.byStore ? `<td>${g.store_id == null ? '<span class="null">NULL</span>' : esc(g.store_id)}</td>` : "") +
      (o.byOrigin ? `<td>${g.bean_origin == null ? '<span class="null">NULL</span>' : esc(g.bean_origin)}</td>` : "") +
      `<td class="num">${g.tickets}</td><td class="num">${esc(moneyFmt(g))}</td>`;
  }
  function groupHead(o) {
    return `<tr><th>sale_date</th>${o.byStore ? "<th>store_id</th>" : ""}${o.byOrigin ? "<th>bean_origin</th>" : ""}<th class="num">tickets</th><th class="num">gross_sales</th><th>vs legacy</th></tr>`;
  }

  /* ---------- Run ---------- */
  let busy = false;
  const sleep = ms => new Promise(r => setTimeout(r, reduceMotion ? 0 : ms));

  async function run() {
    if (busy) return;
    busy = true;
    $("#runBtn").disabled = true;
    const o = readOpts();
    const act = runJob(ordersEl.value, catalogEl.value, o);
    const exp = runJob(ordersEl.value, catalogEl.value, legacyOf(o));
    renderCode();
    resetStages();

    // Animate the stages left to right.
    const order = ["input", "reformat", "filter", "join", "rollup", "write"];
    for (const s of order) {
      stageEls[s].classList.add("is-active");
      await sleep(170);
      if (act.error && s === "input") break;
      stageEls[s].classList.remove("is-active");
    }

    if (act.error) {
      setStage("input", act.input, `<em class="bad-txt">line ${act.error.line}: ${act.error.got} fields, expected 5</em>`, "is-bad");
      ["reformat", "filter", "join", "rollup", "write"].forEach(s => setStage(s, "–", "not run"));
      verdict("stopped", "Job failed loudly. Nothing was written.",
        `Line ${act.error.line} has ${act.error.got} fields instead of 5 (<code>${esc(act.error.text)}</code>). FAILFAST stopped the job before it wrote anything, so the target table is untouched. ` +
        `That's the safe outcome: fix the file and re-run. (Switch to PERMISSIVE to see the other option.)`);
      $("#tab-parity").innerHTML = `<p class="muted-p">No reconciliation: the job stopped at INPUT. Target table unchanged.</p>`;
      $("#runInfo").textContent = `Run aborted at ${new Date().toLocaleTimeString()}. Target table unchanged.`;
      award(["failfast"]);
      showTab("t-parity");
      busy = false; $("#runBtn").disabled = false;
      return;
    }

    runs++;
    const written = writeTable(act.groups, o.write);
    const rec = reconcile(act, exp, written);

    setStage("input", act.input, act.malformed ? `<em class="warn-txt">${act.malformed} malformed → NULLs</em>` : "rows read", act.malformed ? "is-warn" : "is-ok");
    setStage("reformat", act.input - 0, "cast &amp; clean", "is-ok");
    setStage("filter", act.valid,
      `valid · ${act.rejects.length} quarantined` + (act.lost.length ? ` · <em class="bad-txt">${act.lost.length} lost</em>` : ""),
      act.lost.length ? "is-bad" : "is-ok");
    setStage("join", act.enriched,
      act.joinDropped ? `<em class="bad-txt">${act.joinDropped} dropped</em>` : act.lookupMissByCase ? `<em class="warn-txt">${act.lookupMissByCase} missed lookup</em>` : "enriched",
      act.joinDropped ? "is-bad" : act.lookupMissByCase ? "is-warn" : "is-ok");
    setStage("rollup", act.groups.length, "groups", "is-ok");
    const tableRows = written.reduce((s, p) => s + (table.get(p) || []).length, 0);
    setStage("write", tableRows, `${o.write === "overwrite" ? "overwrote" : "appended to"} ${written.length} partition${written.length === 1 ? "" : "s"}` + (rec.dup ? ` · <em class="bad-txt">duplicates</em>` : ""), rec.dup ? "is-bad" : "is-ok");

    // Parity report
    const hints = [];
    if (act.lost.length) hints.push(`<b>${act.lost.length} row(s) vanished</b> from both outputs: with <code>line_amount</code> NULL, the filter condition is NULL, and both <code>filter(cond)</code> and <code>filter(~cond)</code> skip it. Turn on <b>Null-safe filter</b>.`);
    if (!o.decimal && !rec.moneyEq) hints.push(`Totals drift because <code>float</code> can't store values like 41250.30 exactly. A strict field-level diff catches it. Use <b>Exact money</b> (<code>decimal(18,2)</code>).`);
    if (act.joinDropped) hints.push(`<b>${act.joinDropped} order(s)</b> with an unknown SKU were dropped by the <b>inner</b> join. Legacy kept them with a NULL origin. Use a <b>left</b> join.`);
    if (act.lookupMissByCase) hints.push(`<b>${act.lookupMissByCase} order(s)</b> like <code>" ar-02 "</code> missed the catalog because the key wasn't normalized. Turn on <b>Normalize keys</b>.`);
    if (rec.dup) hints.push(`The same day was written twice in <b>append</b> mode, so the totals are double-counted. <b>Partition overwrite</b> makes re-runs idempotent.`);
    if (act.malformed) hints.push(`PERMISSIVE turned ${act.malformed} malformed line(s) into NULLs. The guards still caught them here, but in production you would rather stop (FAILFAST) and know about it.`);

    const ch = rec.checks.map(c => `<li class="${c.ok ? "is-ok" : "is-bad"}"><span class="ic">${c.ok ? "✓" : "✗"}</span><span>${esc(c.label)}</span>` +
      `<span class="v"><small>LEGACY</small>${esc(c.exp)}</span><span class="v"><small>PYSPARK</small>${esc(c.act)}</span></li>`).join("");
    const diffRows = rec.diffs.slice(0, 8).map(d => `<li>${esc([d.key.sale_date, d.key.store_id, d.key.bean_origin].filter(v => v !== undefined).map(v => v ?? "NULL").join(" · "))}: <b>${esc(d.status)}</b>, ${esc(d.note)}</li>`).join("");
    $("#tab-parity").innerHTML =
      `<ul class="checks">${ch}</ul>` +
      (rec.diffs.length ? `<h3 class="pg-sub">Row-level differences</h3><ul class="pg-note">${diffRows}${rec.diffs.length > 8 ? `<li>…and ${rec.diffs.length - 8} more</li>` : ""}</ul>` : "") +
      (hints.length ? `<div class="hints"><b>What happened</b><ul>${hints.map(h => `<li>${h}</li>`).join("")}</ul></div>` : "");

    // Output table
    const stMap = { ok: ["ok", "st--ok", ""], diff: ["diff", "st--bad", "r-bad"], dup: ["dup", "st--bad", "r-bad"], extra: ["extra", "st--warn", "r-warn"], missing: ["missing", "st--bad", "r-missing"] };
    $("#tab-output").innerHTML =
      `<div class="tbl-wrap"><table class="tbl"><thead>${groupHead(o)}</thead><tbody>` +
      rec.rows.map(({ r, status, note }) => {
        const [label, cls, rowCls] = stMap[status];
        return `<tr class="${rowCls}">${groupCells(r, o)}<td><span class="st ${cls}" title="${esc(note)}">${label}</span></td></tr>`;
      }).join("") +
      `</tbody></table></div><p class="pg-note">Rows currently in the target partitions (${written.map(esc).join(", ")}), compared key by key with the legacy output. Run #${runs}.</p>`;

    // Quarantine
    const rejRows = act.rejects.map(r => `<tr><td>${r.line}</td><td>${esc(r.ticket ?? "")}</td><td><span class="st st--warn">${esc(r.reason)}</span></td><td>${esc(r.rawLine)}</td></tr>`).join("");
    const lostRows = act.lost.map(r => `<tr class="r-bad"><td>${r.line}</td><td>${esc(r.ticket ?? "")}</td><td><span class="st st--bad">LOST</span></td><td>${esc(r.rawLine)}</td></tr>`).join("");
    $("#rejCount").textContent = act.rejects.length + (act.lost.length ? `+${act.lost.length}` : "");
    $("#tab-rejects").innerHTML = (rejRows || lostRows)
      ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>line</th><th>ticket_no</th><th>reason</th><th>raw record</th></tr></thead><tbody>${rejRows}${lostRows}</tbody></table></div>` +
        (lostRows ? `<p class="pg-note"><b class="bad-txt">LOST</b> rows are not in the quarantine at all. They are shown here only so you can see them.</p>` : "")
      : `<p class="muted-p">No rejected rows.</p>`;

    if (rec.pass) {
      verdict("pass", "0 mismatches: matches legacy", `Counts, checksums and every row match the legacy output. ${act.rejects.length} row(s) quarantined with a reason, none lost. Ready for cut-over.`);
    } else {
      const failed = rec.checks.filter(c => !c.ok).map(c => c.label);
      verdict("fail", `Parity failed: ${failed.length} check${failed.length === 1 ? "" : "s"} red`, `${esc(failed.join(", "))}. See <b>What happened</b> in the parity report.`);
    }
    $("#runInfo").textContent = `Run #${runs} at ${new Date().toLocaleTimeString()} · ${o.write} · table holds ${[...table.values()].reduce((s, r) => s + r.length, 0)} row(s).`;

    const got = [];
    if (rec.pass) got.push("green");
    if (act.lost.length) got.push("lost");
    if (!o.decimal && !rec.moneyEq) got.push("drift");
    if (act.lookupMissByCase) got.push("lookup");
    if (act.joinDropped) got.push("inner");
    if (rec.dup) got.push("dup");
    award(got);
    showTab("t-parity");
    const st = $("#stages").getBoundingClientRect();
    if (st.top > window.innerHeight - 120) $("#stages").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    busy = false; $("#runBtn").disabled = false;
  }

  function resetTable(msg = true) {
    table.clear(); runs = 0;
    $("#runInfo").textContent = "Target table is empty. Press Run.";
    if (msg) toast("Target table cleared");
  }

  /* ---------- Wire up ---------- */
  $("#runBtn").addEventListener("click", run);
  $("#resetTableBtn").addEventListener("click", () => resetTable());
  $("#resetAllBtn").addEventListener("click", () => {
    applyOpts(DEFAULTS);
    ordersEl.value = MESSY; catalogEl.value = CATALOG;
    resetTable(false); resetStages(); renderCode();
    verdict("idle", "Defaults restored", "Press Run to reconcile against the legacy output.");
    $$(".pg-presets .chip").forEach(c => c.classList.toggle("is-on", c.dataset.preset === "messy"));
  });
  $$(".pg-presets .chip").forEach(btn => btn.addEventListener("click", () => {
    ordersEl.value = PRESETS[btn.dataset.preset];
    $$(".pg-presets .chip").forEach(c => c.classList.toggle("is-on", c === btn));
    resetTable(false);
    toast(`Loaded "${btn.textContent}". Target table cleared.`);
  }));
  $$(".pg-cfg input").forEach(i => i.addEventListener("change", renderCode));
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
  });

  ordersEl.value = MESSY;
  catalogEl.value = CATALOG;
  $('.pg-presets .chip[data-preset="messy"]').classList.add("is-on");
  renderCode();
  renderChallenges();
})();
