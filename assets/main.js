(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 1800);
  }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (e) { toast("Copy failed. Select the text manually."); }
  }

  /* ---------- Theme ---------- */
  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  }
  if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = currentTheme();
  $("#themeBtn").addEventListener("click", toggleTheme);

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const navLinks = $("#navLinks");
  const burger = $("#burgerBtn");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  $$("a", navLinks).forEach(a => a.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  }));
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      $$("a", navLinks).forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(s => sectionObs.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach(el => revealObs.observe(el));

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) return;
    const t0 = performance.now();
    const dur = 1400;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString("en-US") + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const statObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); statObs.unobserve(e.target); } });
  });
  $$("[data-count]").forEach(el => statObs.observe(el));

  /* ---------- Typed roles ---------- */
  const roles = [
    "Legacy ETL → PySpark on cloud",
    "Ab Initio, reverse-engineered",
    "parity-proven migrations",
    "pipelines that are safe to re-run",
    "and full-stack products on the side",
  ];
  const typedEl = $("#typed");
  if (!reduceMotion) {
    let r = 0, i = roles[0].length, deleting = true;
    const tick = () => {
      const word = roles[r];
      if (deleting) {
        i--;
        if (i <= 0) { deleting = false; r = (r + 1) % roles.length; }
      } else {
        i++;
        if (i >= roles[r].length) { deleting = true; typedEl.textContent = roles[r]; return setTimeout(tick, 2200); }
      }
      typedEl.textContent = (deleting ? word : roles[r]).slice(0, Math.max(0, i));
      setTimeout(tick, deleting ? 28 : 55);
    };
    setTimeout(tick, 2600);
  }

  /* ---------- Hero canvas: legacy (amber) packets flowing into spark (green) ---------- */
  const canvas = $("#flowCanvas");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, lanes = [], packets = [], raf = 0;
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 700 ? 7 : 12;
    lanes = Array.from({ length: n }, (_, k) => {
      const y0 = H * (0.08 + 0.84 * (k / (n - 1)));
      return { y0, y1: H * 0.5 + (y0 - H * 0.5) * 0.35, amp: 18 + Math.random() * 30, ph: Math.random() * 6 };
    });
    packets = Array.from({ length: W < 700 ? 26 : 60 }, () => ({
      lane: Math.floor(Math.random() * n), t: Math.random(), v: 0.0009 + Math.random() * 0.0016, s: 1.2 + Math.random() * 1.8,
    }));
  }
  function laneY(l, t, time) {
    // Converge toward the middle at x≈0.55 (the "transform" point), then fan out again.
    const mid = 0.55;
    const k = t < mid ? t / mid : (1 - t) / (1 - mid);
    const ease = k * k * (3 - 2 * k);
    return l.y0 + (l.y1 - l.y0) * ease + Math.sin(t * 6 + l.ph + time * 0.0006) * l.amp * (1 - ease);
  }
  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    const legacy = cssVar("--legacy"), spark = cssVar("--spark"), border = cssVar("--border");
    ctx.lineWidth = 1;
    lanes.forEach(l => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const y = laneY(l, x / W, time);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = border; ctx.globalAlpha = 0.55; ctx.stroke();
    });
    ctx.globalAlpha = 1;
    packets.forEach(p => {
      p.t += p.v;
      if (p.t > 1) { p.t = 0; p.lane = Math.floor(Math.random() * lanes.length); }
      const x = p.t * W, y = laneY(lanes[p.lane], p.t, time);
      ctx.beginPath();
      ctx.fillStyle = p.t < 0.55 ? legacy : spark;
      ctx.globalAlpha = 0.25 + 0.6 * Math.sin(Math.PI * p.t);
      if (p.t < 0.55) ctx.rect(x - p.s, y - p.s, p.s * 2, p.s * 2);   // legacy = squares
      else ctx.arc(x, y, p.s, 0, Math.PI * 2);                          // spark = circles
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }
  setupCanvas();
  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(setupCanvas, 150); });
  if (reduceMotion) { draw(0); cancelAnimationFrame(raf); }
  else {
    const heroObs = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) raf = requestAnimationFrame(draw);
    });
    heroObs.observe($(".hero"));
  }

  /* ---------- Converter: legacy graph ↔ PySpark ---------- */
  const CODE = [
    [null, 'from pyspark.sql import SparkSession, functions as F, types as T'],
    [null, ''],
    [null, 'spark = SparkSession.builder.appName("daily_usage_rollup").getOrCreate()'],
    [null, 'cfg, run_date = load_config(), args.run_date      # paths come from config, not code'],
    [null, ''],
    ["input", '# INPUT FILE  ←  legacy record format becomes an explicit schema'],
    ["input", 'schema = T.StructType([T.StructField(c, T.StringType()) for c in'],
    ["input", '    ["event_id", "account_id", "product_cd", "event_ts", "amount"]])'],
    ["input", 'raw = (spark.read.option("sep", "|").option("mode", "FAILFAST")'],
    ["input", '      .schema(schema).csv(f"{cfg.landing}/events/{run_date}/"))'],
    [null, ''],
    ["reformat", '# REFORMAT  ←  each transform rule is one explicit expression'],
    ["reformat", 'clean = raw.select('],
    ["reformat", '    "event_id", "account_id",'],
    ["reformat", '    F.upper(F.trim("product_cd")).alias("product_cd"),'],
    ["reformat", '    F.to_timestamp("event_ts", "yyyyMMddHHmmss").alias("event_ts"),'],
    ["reformat", '    F.col("amount").cast("decimal(18,2)").alias("amount"),'],
    ["reformat", ')'],
    [null, ''],
    ["filter", '# FILTER BY EXPRESSION  ←  select / deselect ports'],
    ["filter", 'is_valid = F.coalesce(                     # null-safe: no row can vanish'],
    ["filter", '    F.col("event_ts").isNotNull() & (F.col("amount") >= 0), F.lit(False))'],
    ["filter", 'valid   = clean.filter(is_valid)'],
    ["filter", 'rejects = clean.filter(~is_valid).withColumn("reject_reason", F.lit("invalid_ts_or_amount"))'],
    [null, ''],
    ["join", '# JOIN  ←  lookup on product_cd (small dimension → broadcast, no shuffle)'],
    ["join", 'dim = spark.table("ref.dim_product").select("product_cd", "category")'],
    ["join", 'enriched = valid.join(F.broadcast(dim), "product_cd", "left")'],
    [null, ''],
    ["rollup", '# ROLLUP  ←  key {account_id, event_date, category}'],
    ["rollup", 'daily = (enriched'],
    ["rollup", '    .withColumn("event_date", F.to_date("event_ts"))'],
    ["rollup", '    .groupBy("account_id", "event_date", "category")'],
    ["rollup", '    .agg(F.count("*").alias("events"), F.sum("amount").alias("total_amount")))'],
    [null, ''],
    ["output", '# OUTPUT TABLE  ←  idempotent: re-running a day replaces only that day'],
    ["output", 'spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")'],
    ["output", '(daily.write.mode("overwrite").partitionBy("event_date")'],
    ["output", '      .parquet(f"{cfg.curated}/daily_usage/"))'],
    ["output", 'rejects.write.mode("overwrite").parquet(f"{cfg.quarantine}/events/{run_date}/")'],
    [null, ''],
    [null, 'log_counts(raw=raw, valid=valid, rejects=rejects, out=daily)   # feeds the parity check'],
  ];

  const STEPS = {
    input: {
      title: "Input File → explicit schema",
      legacy: 'record\n  string("|")  event_id;\n  string("|")  account_id;\n  string("|")  product_cd;\n  string("|")  event_ts;\n  string("\\n") amount;\nend;',
      note: "The legacy record format (DML) becomes a <b>StructType</b>. No schema inference, and <b>FAILFAST</b> on malformed rows: types are a contract, so drift fails loudly instead of corrupting data.",
    },
    reformat: {
      title: "Reformat → select() expressions",
      legacy: "out :: reformat(in) =\nbegin\n  out.product_cd :: string_upcase(string_lrtrim(in.product_cd));\n  out.event_ts   :: (datetime(\"YYYYMMDDHH24MISS\")) in.event_ts;\n  out.amount     :: (decimal(18,2)) in.amount;\n  out.*          :: in.*;\nend;",
      note: "Each transform rule maps 1:1 to a column expression. Every cast is <b>explicit and precision-matched</b> (decimal(18,2), not float), so the output matches legacy to the cent.",
    },
    filter: {
      title: "Filter by Expression → valid + quarantine",
      legacy: "select_expr:  !is_null(in.event_ts) && in.amount >= 0\nout     → next component\ndeselect → reject file",
      note: "The select/deselect ports become two DataFrames. The predicate is wrapped in <b>coalesce(…, false)</b> because in SQL a NULL comparison would drop the row from <em>both</em> outputs. Rejects are <b>quarantined with a reason</b>, never silently lost.",
    },
    join: {
      title: "Join + Lookup → broadcast join",
      legacy: "join  key: {product_cd}\n      record_required0: true   (outer on in0)\nin1 ← lookup dim_product",
      note: "A small reference table is <b>broadcast</b> to every executor, so there is no shuffle. A left join keeps the legacy outer-join semantics: unmatched events are kept, not dropped.",
    },
    rollup: {
      title: "Rollup → groupBy().agg()",
      legacy: "rollup  key: {account_id, event_date, category}\nout.events       :: count(1);\nout.total_amount :: sum(in.amount);",
      note: "The rollup key becomes the <b>groupBy</b> columns, and each aggregate maps directly. Spark plans the shuffle and partial aggregation that the legacy graph had to configure by hand.",
    },
    output: {
      title: "Output Table → idempotent partition write",
      legacy: "output table  daily_usage\nload mode: truncate & insert\nlayout: 8-way MFS partition",
      note: "<b>Dynamic partition overwrite</b> makes the job safe to re-run: a retry or backfill for one day replaces only that day's partition. Stage-level counts are logged for reconciliation and on-call.",
    },
  };

  function highlight(src) {
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const re = /(#.*$)|(f?"(?:[^"\\]|\\.)*")|\b(from|import|as|for|in|not|and|or|True|False|None)\b|\b(\d+(?:\.\d+)?)\b|\b(spark|F|T|cfg)\b|\b([A-Za-z_]\w*)(?=\()/g;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const [tok] = m;
      const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : m[4] ? "n" : m[5] ? "b" : "f";
      out += `<span class="tk-${cls}">${esc(tok)}</span>`;
      last = m.index + tok.length;
    }
    return out + esc(src.slice(last));
  }

  const codeEl = $("#code");
  codeEl.innerHTML = CODE.map(([step, line]) =>
    `<span class="ln"${step ? ` data-step="${step}"` : ""}>${highlight(line) || " "}</span>`).join("");

  const explain = $("#explain");
  const dagNodes = $$("#dag .node");
  const dagEdges = $$("#dag .edge");
  const order = ["input", "reformat", "filter", "join", "rollup", "output"];
  let active = null;

  function selectStep(step, { scroll = true } = {}) {
    active = step;
    dagNodes.forEach(n => n.classList.toggle("is-on", n.dataset.step === step));
    dagEdges.forEach(e => e.classList.toggle("is-on", e.dataset.step === step));
    codeEl.classList.add("has-focus");
    const lines = $$(".ln", codeEl);
    lines.forEach(l => l.classList.toggle("is-on", l.dataset.step === step));
    const first = lines.find(l => l.dataset.step === step);
    if (scroll && first) {
      // Scroll inside the code box only; never jump the page.
      codeEl.scrollTo({ top: first.offsetTop - 40, behavior: reduceMotion ? "auto" : "smooth" });
    }
    const s = STEPS[step];
    explain.innerHTML =
      `<h4><span class="tag tag--legacy">${String(order.indexOf(step) + 1).padStart(2, "0")}</span>${s.title}</h4>` +
      `<pre>${s.legacy.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre><p>${s.note}</p>`;
  }

  dagNodes.forEach(n => {
    n.addEventListener("click", () => { stopPlay(); selectStep(n.dataset.step); });
    n.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stopPlay(); selectStep(n.dataset.step); }
    });
  });
  codeEl.addEventListener("click", e => {
    const ln = e.target.closest(".ln[data-step]");
    if (ln) { stopPlay(); selectStep(ln.dataset.step, { scroll: false }); }
  });

  const playBtn = $("#playBtn");
  let playTimer = null;
  function stopPlay() {
    clearInterval(playTimer); playTimer = null;
    playBtn.setAttribute("aria-pressed", "false");
    $(".play-ico", playBtn).textContent = "▶";
    $(".play-lbl", playBtn).textContent = "Walk through";
  }
  playBtn.addEventListener("click", () => {
    if (playTimer) return stopPlay();
    let i = active ? (order.indexOf(active) + 1) % order.length : 0;
    selectStep(order[i]);
    playBtn.setAttribute("aria-pressed", "true");
    $(".play-ico", playBtn).textContent = "■";
    $(".play-lbl", playBtn).textContent = "Stop";
    playTimer = setInterval(() => {
      i++;
      if (i >= order.length) return stopPlay();
      selectStep(order[i]);
    }, 3200);
  });

  $("#copyCodeBtn").addEventListener("click", () => copy(CODE.map(c => c[1]).join("\n"), "PySpark code copied"));

  // Start on "filter": the most interesting reliability detail.
  const convObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !active) { selectStep("filter"); convObs.disconnect(); }
  }, { threshold: 0.3 });
  convObs.observe($(".converter"));

  /* ---------- Parity reconciliation ---------- */
  const parityBtn = $("#parityBtn");
  const fill = $("#parityFill");
  const log = $("#parityLog");
  const result = $("#parityResult");
  const fmt = (v, d) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const phases = [
    "reading legacy output…",
    "reading pyspark output…",
    "comparing row counts…",
    "comparing checksums…",
    "hashing rows (sha256 per key)…",
    "field-by-field diff…",
  ];
  let running = false;
  parityBtn.addEventListener("click", () => {
    if (running) return;
    running = true;
    parityBtn.disabled = true;
    result.hidden = true;
    const dds = $$("#parity dd");
    dds.forEach(dd => { dd.textContent = "—"; dd.parentElement.classList.remove("is-match"); });
    const total = reduceMotion ? 1 : 3400;
    const t0 = performance.now();
    const frame = now => {
      const p = Math.min(1, (now - t0) / total);
      fill.style.width = (p * 100).toFixed(1) + "%";
      log.textContent = p < 1 ? phases[Math.min(phases.length - 1, Math.floor(p * phases.length))] : "done: 0 mismatches";
      dds.forEach((dd, idx) => {
        const row = idx % 4;                // same metric on both sides lands together
        const start = 0.15 + row * 0.18;
        const local = Math.max(0, Math.min(1, (p - start) / 0.25));
        if (local > 0) {
          const d = Number(dd.dataset.decimals || 0);
          dd.textContent = fmt(Number(dd.dataset.target) * local, d);
          if (local === 1) dd.parentElement.classList.add("is-match");
        }
      });
      if (p < 1) requestAnimationFrame(frame);
      else { result.hidden = false; running = false; parityBtn.disabled = false; parityBtn.textContent = "Run again"; }
    };
    requestAnimationFrame(frame);
  });

  /* ---------- Migration playbook ---------- */
  const PLAYBOOK = [
    {
      t: "Reverse-engineer the legacy job",
      d: "Before rewriting anything, I extract what the job really does, which is often not what the docs say.",
      li: ["Parse graph, plan and parameter-set metadata (.mp, .plan, .pset, .xfr, .dml) into JSON DAGs",
           "Resolve parameters per environment; detect disabled components and phases",
           "Interactive DAG views for lineage and impact analysis"],
      out: "→ machine-readable spec for every job",
    },
    {
      t: "Map, inventory & plan waves",
      d: "Field-level mapping per feed, dependency analysis, and a clear scope so the migration can be planned and tracked.",
      li: ["3,300+ jobs inventoried; 1,300+ in scope; retirement candidates flagged",
           "Dependency mapping across plans and sub-graphs",
           "Delivery in batches/waves with owners and sign-off"],
      out: "→ scoped backlog, not a big-bang rewrite",
    },
    {
      t: "Rebuild: shared engine + small rule modules",
      d: "Every feed looks different, but most of the work is the same. I build the common part once and generate the rest.",
      li: ["Engine-as-library: collect / parse / distribute engines with self-contained per-feed rules",
           "Unified orchestrator with dry-run and debug flags",
           "Code generators produced 4,500+ runners and their docs"],
      out: "→ consistent, reviewable, testable jobs",
    },
    {
      t: "Prove parity against legacy",
      d: "Run old and new side by side on the same input and reconcile until there are zero unexplained differences.",
      li: ["Row counts, rejected rows, checksums, distinct keys",
           "Field-by-field diff on hashed rows",
           "Every mismatch root-caused, including defects in the legacy output itself"],
      out: "→ 100% record-level parity before cut-over",
    },
    {
      t: "Run it reliably on the cloud",
      d: "The job is packaged for a managed cloud data platform and built to be operated, not just executed.",
      li: ["Object storage in/out; Snowflake and Hive as targets",
           "Idempotent partition writes for retries and backfills",
           "Stage-level counts and structured logs for monitoring"],
      out: "→ jobs on-call can trust",
    },
  ];
  const stepBtns = $$("#steps button");
  const stepPanel = $("#stepPanel");
  function showStep(i) {
    stepBtns.forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
    const s = PLAYBOOK[i];
    stepPanel.innerHTML = `<div><h4>${s.t}</h4><p>${s.d}</p><p class="steps__out">${s.out}</p></div>` +
      `<ul>${s.li.map(x => `<li>${x}</li>`).join("")}</ul>`;
    // Re-trigger the entrance animation.
    stepPanel.style.animation = "none"; void stepPanel.offsetWidth; stepPanel.style.animation = "";
  }
  stepBtns.forEach((b, i) => {
    b.addEventListener("click", () => showStep(i));
    b.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = (i + (e.key === "ArrowRight" ? 1 : -1) + stepBtns.length) % stepBtns.length;
      stepBtns[n].focus(); showStep(n);
    });
  });
  showStep(0);

  /* ---------- Project filters ---------- */
  const projects = $$("#projectGrid .project");
  const filterBtns = $$(".filters .chip");
  filterBtns.forEach(btn => btn.addEventListener("click", () => {
    clearSkill();
    filterBtns.forEach(b => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
    const f = btn.dataset.filter;
    projects.forEach(p => p.classList.toggle("is-hidden", f !== "all" && p.dataset.cat !== f));
  }));

  /* ---------- Skill → project highlighting ---------- */
  const skillChips = $$("#skillGroups .chip");
  const hint = $("#skillHint");
  let activeSkill = null;
  function clearSkill() {
    activeSkill = null;
    skillChips.forEach(c => c.classList.remove("is-on"));
    projects.forEach(p => p.classList.remove("is-dim", "is-lit"));
    hint.textContent = "";
  }
  skillChips.forEach(chip => chip.addEventListener("click", () => {
    if (activeSkill === chip) return clearSkill();
    activeSkill = chip;
    const key = chip.dataset.skill;
    skillChips.forEach(c => c.classList.toggle("is-on", c === chip));
    filterBtns.forEach(b => { b.classList.toggle("is-on", b.dataset.filter === "all"); b.setAttribute("aria-pressed", String(b.dataset.filter === "all")); });
    let hits = [];
    projects.forEach(p => {
      const on = p.dataset.skills.split(" ").includes(key);
      p.classList.remove("is-hidden");
      p.classList.toggle("is-lit", on);
      p.classList.toggle("is-dim", !on);
      if (on) hits.push($("h3", p).firstChild.textContent.trim());
    });
    hint.innerHTML = hits.length
      ? `<b>${chip.textContent}</b> → used in ${hits.join(", ")}. <a href="#projects">View projects ↑</a>`
      : `<b>${chip.textContent}</b> → day-to-day work at XL Axiata.`;
  }));

  /* ---------- Copy email ---------- */
  const emailBtn = $("#copyEmail");
  emailBtn.addEventListener("click", () => copy(emailBtn.dataset.email, "Email copied"));

  /* ---------- Command palette ---------- */
  const palette = $("#palette");
  const pInput = $("#paletteInput");
  const pList = $("#paletteList");
  const go = id => () => document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  const COMMANDS = [
    { label: "Legacy → PySpark walkthrough", hint: "section", run: go("migration") },
    { label: "Run parity reconciliation", hint: "demo", run: () => { go("parity")(); setTimeout(() => parityBtn.click(), 500); } },
    { label: "Experience", hint: "section", run: go("experience") },
    { label: "Projects", hint: "section", run: go("projects") },
    { label: "Skills", hint: "section", run: go("skills") },
    { label: "Contact", hint: "section", run: go("contact") },
    { label: "Download CV (PDF)", hint: "file", run: () => { const a = document.createElement("a"); a.href = "cv_bagus_budi_laksono_2026.pdf"; a.download = ""; a.click(); } },
    { label: "Copy email address", hint: "action", run: () => copy(emailBtn.dataset.email, "Email copied") },
    { label: "Toggle light / dark theme", hint: "action", run: toggleTheme },
    { label: "ONE.Charity live demo", hint: "link ↗", run: () => window.open("https://onecharity.vercel.app/", "_blank", "noopener") },
    { label: "lokaglobalpacific.com", hint: "link ↗", run: () => window.open("https://lokaglobalpacific.com", "_blank", "noopener") },
    { label: "GitHub profile", hint: "link ↗", run: () => window.open("https://github.com/yuzansama", "_blank", "noopener") },
  ];
  let pItems = [], pSel = 0, lastFocus = null;
  function renderPalette() {
    const q = pInput.value.trim().toLowerCase();
    pItems = COMMANDS.filter(c => c.label.toLowerCase().includes(q));
    pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
    pList.innerHTML = pItems.length
      ? pItems.map((c, i) => `<li role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === pSel}">${c.label}<small>${c.hint}</small></li>`).join("")
      : `<li aria-disabled="true">No match</li>`;
    pInput.setAttribute("aria-activedescendant", pItems.length ? `pal-${pSel}` : "");
  }
  function openPalette() {
    lastFocus = document.activeElement;
    palette.hidden = false; pInput.value = ""; pSel = 0; renderPalette();
    setTimeout(() => pInput.focus(), 0);
  }
  function closePalette() { palette.hidden = true; if (lastFocus) lastFocus.focus(); }
  function runPalette(i) { const c = pItems[i]; if (!c) return; closePalette(); c.run(); }
  $("#paletteBtn").addEventListener("click", openPalette);
  palette.addEventListener("click", e => {
    if (e.target.dataset.close !== undefined) return closePalette();
    const li = e.target.closest("li[data-i]");
    if (li) runPalette(Number(li.dataset.i));
  });
  pInput.addEventListener("input", () => { pSel = 0; renderPalette(); });
  pInput.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); pSel = (pSel + 1) % Math.max(1, pItems.length); renderPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pSel = (pSel - 1 + pItems.length) % Math.max(1, pItems.length); renderPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); runPalette(pSel); }
  });
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    else if (e.key === "Escape" && !palette.hidden) closePalette();
  });
})();
