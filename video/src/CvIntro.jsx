// A 36-second intro for the CV site and LinkedIn. Same palette and story as the site:
// legacy ETL (amber squares) becomes reliable PySpark (green circles), proven by a parity check.
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import { useEffect, useState } from "react";
import {
  AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, random, spring,
  useCurrentFrame, useVideoConfig,
} from "remotion";

export const FPS = 30;
const SCENES = [
  ["intro", 150], ["convert", 270], ["parity", 210], ["numbers", 180], ["projects", 180], ["outro", 90],
];
export const DURATION = SCENES.reduce((s, [, d]) => s + d, 0); // 1080 frames = 36 s

const C = {
  bg: "#0a0e16", surface: "#111827", surface2: "#161f30", border: "#233047",
  text: "#e6edf7", muted: "#8d9bb3", accent: "#22d3ee", violet: "#a78bfa",
  legacy: "#f59e0b", spark: "#34d399", code: "#0b111c",
  okFill: "#0f2a27", // solid so the background flow never shows through

};
const SANS = "Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const fadeIn = (f, start, len = 15) => interpolate(f, [start, start + len], [0, 1], { ...clamp, easing: ease });
const rise = (f, start, len = 20, dist = 30) => interpolate(f, [start, start + len], [dist, 0], { ...clamp, easing: ease });
const fmt = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/* Fonts must be loaded before any frame is captured. */
const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(["800 120px Inter", "600 40px Inter", "400 30px Inter", "500 28px 'JetBrains Mono'", "700 28px 'JetBrains Mono'"]
      .map((f) => document.fonts.load(f)))
      .then(() => continueRender(handle), () => continueRender(handle));
  }, [handle]);
};

/* Scene wrapper: fades in and out at the edges of its sequence. */
const Scene = ({ len, children }) => {
  const f = useCurrentFrame();
  const opacity = Math.min(fadeIn(f, 0, 12), interpolate(f, [len - 12, len], [1, 0], clamp));
  return <AbsoluteFill style={{ opacity, padding: "90px 120px", justifyContent: "center" }}>{children}</AbsoluteFill>;
};

const Kicker = ({ children, color = C.accent, delay = 0 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ font: `700 26px ${MONO}`, letterSpacing: "0.16em", textTransform: "uppercase", color, opacity: fadeIn(f, delay), transform: `translateY(${rise(f, delay)}px)` }}>
      {children}
    </div>
  );
};

/* Background: lanes converge in the middle; packets are amber squares before it, green circles after. */
const Flow = ({ strength = 1 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const lanes = Array.from({ length: 12 }, (_, k) => {
    const y0 = H * (0.08 + 0.84 * (k / 11));
    return { y0, y1: H / 2 + (y0 - H / 2) * 0.35, amp: 18 + random(`amp${k}`) * 30, ph: random(`ph${k}`) * 6 };
  });
  const laneY = (l, t) => {
    const k = t < 0.55 ? t / 0.55 : (1 - t) / 0.45;
    const e = k * k * (3 - 2 * k);
    return l.y0 + (l.y1 - l.y0) * e + Math.sin(t * 6 + l.ph + f * 0.02) * l.amp * (1 - e);
  };
  const packets = Array.from({ length: 70 }, (_, i) => {
    const lane = lanes[Math.floor(random(`lane${i}`) * lanes.length)];
    const t = (random(`t${i}`) + f * (0.0016 + random(`v${i}`) * 0.0022)) % 1;
    return { x: t * W, y: laneY(lane, t), t, s: 2.5 + random(`s${i}`) * 3 };
  });
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.85 * strength }}>
      {lanes.map((l, k) => (
        <path key={k} fill="none" stroke={C.border} strokeWidth={1.2} opacity={0.6}
          d={Array.from({ length: 65 }, (_, i) => `${i ? "L" : "M"}${(i / 64) * W},${laneY(l, i / 64)}`).join("")} />
      ))}
      {packets.map((p, i) => {
        const op = 0.25 + 0.65 * Math.sin(Math.PI * p.t);
        return p.t < 0.55
          ? <rect key={i} x={p.x - p.s} y={p.y - p.s} width={p.s * 2} height={p.s * 2} fill={C.legacy} opacity={op} />
          : <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={C.spark} opacity={op} />;
      })}
    </svg>
  );
};

/* ---------- 1. Intro ---------- */
const Intro = ({ len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tag = "Legacy ETL → PySpark on cloud";
  const typed = tag.slice(0, Math.max(0, Math.floor((f - 40) / 1.6)));
  const s = spring({ frame: f - 6, fps, config: { damping: 200 } });
  return (
    <Scene len={len}>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 140px" }}>
        <Kicker delay={4}>Lead ETL / Data Engineer · Indonesia</Kicker>
        <div style={{ font: `800 150px/1.02 ${SANS}`, letterSpacing: "-0.045em", color: C.text, marginTop: 28, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
          Bagus Budi Laksono
        </div>
        <div style={{ font: `500 54px ${MONO}`, color: C.accent, marginTop: 36, minHeight: 70 }}>
          {typed}<span style={{ display: "inline-block", width: 26, height: 56, background: C.accent, marginLeft: 6, verticalAlign: -8, opacity: Math.floor(f / 15) % 2 ? 0 : 1 }} />
        </div>
        <div style={{ font: `400 36px/1.5 ${SANS}`, color: C.muted, marginTop: 34, maxWidth: 1250, opacity: fadeIn(f, 95, 20) }}>
          I rebuild legacy ETL jobs as <span style={{ color: C.spark, fontWeight: 600 }}>reliable, tested PySpark pipelines</span>, and prove them with record-level parity checks.
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

/* ---------- 2. Legacy graph → PySpark ---------- */
const NODES = [
  ["INPUT FILE", "orders.dat"], ["REFORMAT", "clean & cast"], ["FILTER", "valid rows"],
  ["JOIN", "add bean origin"], ["ROLLUP", "sales per store"], ["OUTPUT TABLE", "sales_by_store"],
];
const CODE = [
  [0, 'schema = T.StructType([...])          # explicit, no inference'],
  [0, 'raw = spark.read.option("mode", "FAILFAST").schema(schema).csv(src)'],
  [1, 'clean = raw.select(F.upper(F.trim("sku")).alias("sku"), ...)'],
  [1, '    F.expr("try_cast(line_amount AS DECIMAL(18,2))")'],
  [2, 'is_valid = F.coalesce(cond, F.lit(False))   # null-safe'],
  [2, 'valid, rejects = clean.filter(is_valid), clean.filter(~is_valid)'],
  [3, 'enriched = valid.join(F.broadcast(dim), "sku", "left")'],
  [4, 'daily = enriched.groupBy("sale_date", "store_id", "bean_origin")'],
  [4, '    .agg(F.count("*"), F.sum("line_amount"))'],
  [5, '# idempotent: a re-run replaces only that day'],
  [5, 'daily.write.mode("overwrite").partitionBy("sale_date").parquet(out)'],
];
const Convert = ({ len }) => {
  const f = useCurrentFrame();
  const step = 30; // frames per component
  const t0 = 40;
  const active = Math.min(NODES.length - 1, Math.floor((f - t0) / step));
  return (
    <Scene len={len}>
      <Kicker color={C.legacy}>Legacy component → PySpark</Kicker>
      <div style={{ font: `800 62px/1.1 ${SANS}`, letterSpacing: "-0.03em", color: C.text, marginTop: 18, opacity: fadeIn(f, 6) }}>
        From a legacy ETL graph to reliable PySpark
      </div>
      <div style={{ display: "flex", gap: 56, marginTop: 50, alignItems: "flex-start" }}>
        <div style={{ width: 440, display: "flex", flexDirection: "column", gap: 18 }}>
          {NODES.map(([type, name], i) => {
            const on = f >= t0 + i * step;
            const isActive = on && i === active;
            return (
              <div key={type} style={{
                padding: "14px 22px", borderRadius: 14, background: isActive ? "#2a2214" : C.surface2,
                border: `2px solid ${isActive ? C.legacy : C.border}`, opacity: 0.35 + 0.65 * fadeIn(f, t0 + i * step - 20, 18),
                boxShadow: isActive ? "0 0 30px rgba(245,158,11,.35)" : "none",
              }}>
                <div style={{ font: `700 18px ${MONO}`, letterSpacing: "0.1em", color: isActive ? C.legacy : C.muted }}>{type}</div>
                <div style={{ font: `600 30px ${SANS}`, color: C.text, marginTop: 2 }}>{name}</div>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, background: C.code, border: `1px solid ${C.border}`, borderRadius: 18, padding: "26px 0", minHeight: 720 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "0 30px 18px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ font: `700 18px ${MONO}`, color: C.spark, background: "rgba(52,211,153,.14)", padding: "6px 10px", borderRadius: 6 }}>PYSPARK</span>
            <span style={{ font: `500 22px ${MONO}`, color: C.muted }}>coffee_sales_summary.py</span>
          </div>
          <div style={{ paddingTop: 16 }}>
            {CODE.map(([node, line], i) => {
              const start = t0 + node * step + (CODE.filter(([n], j) => n === node && j < i).length) * 10;
              const chars = Math.max(0, Math.floor((f - start) * 3.2));
              const isActive = node === active;
              return (
                <div key={i} style={{
                  font: `500 25px/1.75 ${MONO}`, whiteSpace: "pre", padding: "0 30px",
                  color: line.trim().startsWith("#") ? "#637399" : "#d6deeb",
                  background: isActive && chars > 0 ? "rgba(52,211,153,.10)" : "transparent",
                  boxShadow: isActive && chars > 0 ? `inset 5px 0 0 ${C.spark}` : "none",
                }}>
                  {line.slice(0, chars) || " "}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Scene>
  );
};

/* ---------- 3. Parity ---------- */
const METRICS = [["Row count", 1284512, 0], ["Rejected rows", 2031, 0], ["Σ gross_sales", 98765432.1, 2], ["Distinct keys", 412907, 0]];
const Parity = ({ len }) => {
  const f = useCurrentFrame();
  const col = (title, color, delay) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ font: `700 24px ${MONO}`, letterSpacing: "0.12em", color, opacity: fadeIn(f, delay) }}>{title}</div>
      {METRICS.map(([name, value, d], i) => {
        const start = 30 + i * 18;
        const p = interpolate(f, [start, start + 40], [0, 1], { ...clamp, easing: ease });
        const done = p >= 1;
        return (
          <div key={name} style={{
            display: "flex", justifyContent: "space-between", padding: "20px 26px", borderRadius: 14,
            background: done ? C.okFill : C.surface2, border: `2px solid ${done ? "rgba(52,211,153,.6)" : C.border}`,
          }}>
            <span style={{ font: `400 30px ${SANS}`, color: C.muted }}>{name}</span>
            <span style={{ font: `700 32px ${MONO}`, color: C.text }}>{fmt(value * p, d)}</span>
          </div>
        );
      })}
    </div>
  );
  const verdict = fadeIn(f, 130, 18);
  return (
    <Scene len={len}>
      <Kicker color={C.spark}>Prove it · demo data</Kicker>
      <div style={{ font: `800 62px/1.1 ${SANS}`, letterSpacing: "-0.03em", color: C.text, marginTop: 18 }}>
        Done means the same answer as legacy
      </div>
      <div style={{ display: "flex", gap: 60, marginTop: 56 }}>
        {col("LEGACY OUTPUT", C.legacy, 10)}
        {col("PYSPARK OUTPUT", C.spark, 16)}
      </div>
      <div style={{
        marginTop: 46, display: "flex", alignItems: "center", gap: 26, padding: "24px 30px", borderRadius: 18,
        background: C.okFill, border: "2px solid rgba(52,211,153,.6)",
        opacity: verdict, transform: `scale(${0.96 + 0.04 * verdict})`,
      }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: C.spark, color: "#032b1f", display: "grid", placeItems: "center", font: `800 38px ${SANS}` }}>✓</div>
        <div style={{ font: `600 38px ${SANS}`, color: C.text }}>
          0 mismatches <span style={{ color: C.muted, fontWeight: 400 }}>across counts, checksums and a field-by-field diff</span>
        </div>
      </div>
    </Scene>
  );
};

/* ---------- 4. Numbers ---------- */
const STATS = [[7, "+", "years in enterprise ETL\n(telco scale)"], [3300, "+", "legacy jobs inventoried\nfor migration"], [4500, "+", "pipeline runners\nauto-generated"], [100, "%", "record-level parity\nvs legacy output"]];
const Numbers = ({ len }) => {
  const f = useCurrentFrame();
  return (
    <Scene len={len}>
      <Kicker>From real work · details under NDA</Kicker>
      <div style={{ font: `800 62px/1.1 ${SANS}`, letterSpacing: "-0.03em", color: C.text, marginTop: 18 }}>
        A telco's legacy ETL, moving to PySpark on cloud
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, marginTop: 90 }}>
        {STATS.map(([n, suffix, label], i) => {
          const start = 20 + i * 14;
          const p = interpolate(f, [start, start + 45], [0, 1], { ...clamp, easing: ease });
          return (
            <div key={label} style={{
              padding: "40px 34px", borderRadius: 22, background: C.surface, border: `2px solid ${C.border}`,
              opacity: fadeIn(f, start - 6), transform: `translateY(${rise(f, start - 6, 22, 40)}px)`,
            }}>
              <div style={{ font: `800 96px/1 ${SANS}`, letterSpacing: "-0.04em", color: C.text }}>{fmt(Math.round(n * p))}{suffix}</div>
              <div style={{ font: `400 28px/1.4 ${SANS}`, color: C.muted, marginTop: 20, whiteSpace: "pre-line" }}>{label}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

/* ---------- 5. Projects ---------- */
const PROJECTS = [
  ["legacy-etl-to-pyspark", "Open source · PySpark", "The same approach in public code: 14 tests, CI on PySpark 3.5 and 4.0.", C.spark],
  ["Pipeline Playground", "In-browser sandbox", "Switch the reliability guards off and watch the parity check catch it.", C.accent],
  ["Job Hunt Copilot", "Claude-powered tool", "Fit score, tailored CV and cover letter, Gmail draft and tracker.", C.violet],
  ["ONE.Charity", "Web3 · Solidity", "Zero-fee donations, milestone-based release, 38 contract tests.", "#f472b6"],
  ["Titik Asal Kopi", "Next.js · TypeScript", "E-commerce with WhatsApp checkout and privacy-first order tracking.", C.legacy],
  ["Loka Journey", "Travel + jastip site", "CSV-driven catalogs, admin panels and a server-side key proxy.", "#60a5fa"],
];
const Projects = ({ len }) => {
  const f = useCurrentFrame();
  return (
    <Scene len={len}>
      <Kicker color={C.violet}>Built & building</Kicker>
      <div style={{ font: `800 62px/1.1 ${SANS}`, letterSpacing: "-0.03em", color: C.text, marginTop: 18 }}>
        Data engineering by day. Products end to end.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26, marginTop: 54 }}>
        {PROJECTS.map(([name, meta, desc, color], i) => {
          const start = 14 + i * 9;
          return (
            <div key={name} style={{
              padding: "28px 30px", borderRadius: 20, background: C.surface, border: `2px solid ${C.border}`,
              borderTop: `5px solid ${color}`, opacity: fadeIn(f, start), transform: `translateY(${rise(f, start, 22, 36)}px)`,
            }}>
              <div style={{ font: `700 20px ${MONO}`, color, letterSpacing: "0.04em" }}>{meta}</div>
              <div style={{ font: `800 38px/1.15 ${SANS}`, color: C.text, marginTop: 10, letterSpacing: "-0.02em" }}>{name}</div>
              <div style={{ font: `400 26px/1.45 ${SANS}`, color: C.muted, marginTop: 12 }}>{desc}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

/* ---------- 6. Outro ---------- */
const Outro = ({ len }) => {
  const f = useCurrentFrame();
  return (
    <Scene len={len}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ font: `800 104px/1.05 ${SANS}`, letterSpacing: "-0.04em", color: C.text, opacity: fadeIn(f, 0, 18), transform: `translateY(${rise(f, 0, 22, 30)}px)` }}>
          Got a legacy pipeline<br />that needs to move?
        </div>
        <div style={{ font: `500 44px ${MONO}`, color: C.accent, marginTop: 48, opacity: fadeIn(f, 18) }}>yuzansama.github.io/CV</div>
        <div style={{ font: `500 34px ${MONO}`, color: C.muted, marginTop: 16, opacity: fadeIn(f, 26) }}>github.com/yuzansama</div>
      </AbsoluteFill>
    </Scene>
  );
};

const VIEWS = { intro: Intro, convert: Convert, parity: Parity, numbers: Numbers, projects: Projects, outro: Outro };

export const CvIntro = () => {
  useFonts();
  const f = useCurrentFrame();
  // Background flow is strongest on the intro and outro, quieter behind the dense scenes.
  const strength = interpolate(f, [0, 130, 160, DURATION - 100, DURATION - 70], [1, 1, 0.35, 0.35, 0.6], clamp);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: "radial-gradient(60% 50% at 20% 30%, rgba(167,139,250,.14), transparent 70%), radial-gradient(50% 40% at 85% 70%, rgba(34,211,238,.10), transparent 70%)" }} />
      <Flow strength={strength} />
      {SCENES.map(([id, len]) => {
        const View = VIEWS[id];
        const seq = <Sequence key={id} from={from} durationInFrames={len} name={id}><View len={len} /></Sequence>;
        from += len;
        return seq;
      })}
    </AbsoluteFill>
  );
};
