// zachle.info uptime monitor.
//
// Every 5 minutes (cron) it requests each target once and records the
// result in D1. GET /api/status returns the aggregated history that the
// site's /status page draws as bars. No visitor data is stored: the
// only rows are the monitor's own checks.

const DAY = 86400;
const HOUR = 3600;
const RETAIN_DAYS = 95;
const TIMEOUT_MS = 10000;
const SLOW_MS = 3000;

function targets(env) {
  const list = [{ id: "site", name: "Website through Cloudflare", url: env.SITE_URL }];
  if (env.ORIGIN_URL) list.push({ id: "origin", name: "Cloudflare Pages origin", url: env.ORIGIN_URL });
  return list;
}

async function checkOne(t) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(t.url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "zachle-status-monitor", "cache-control": "no-cache" },
      cf: { cacheTtl: 0 },
    });
    // Read the body so the timing covers the whole response.
    await res.arrayBuffer();
    const ms = Date.now() - started;
    return { ok: res.ok ? 1 : 0, ms, status: res.status };
  } catch (e) {
    return { ok: 0, ms: Date.now() - started, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function runChecks(env) {
  const ts = Math.floor(Date.now() / 1000);
  const results = await Promise.all(targets(env).map(async (t) => ({ t, r: await checkOne(t) })));
  const stmt = env.DB.prepare("INSERT INTO checks (ts, target, ok, ms, status) VALUES (?, ?, ?, ?, ?)");
  await env.DB.batch([
    ...results.map(({ t, r }) => stmt.bind(ts, t.id, r.ok, r.ms, r.status)),
    env.DB.prepare("DELETE FROM checks WHERE ts < ?").bind(ts - RETAIN_DAYS * DAY),
  ]);
}

// Bucket state from downtime minutes and coverage, mirroring the
// Nyerkulator status page legend.
function bucketState(total, down, interval) {
  if (!total) return "none";
  if (!down) return "up";
  const downMin = (down * interval) / 60;
  if (down / total > 0.5) return "mostly-down";
  if (downMin <= 5) return "short";
  return "outage";
}

async function buildStatus(env) {
  const now = Math.floor(Date.now() / 1000);
  const interval = Number(env.INTERVAL_SECONDS || 300);
  const since = now - 90 * DAY;
  const { results: rows } = await env.DB.prepare(
    "SELECT ts, target, ok, ms FROM checks WHERE ts >= ? ORDER BY ts ASC",
  ).bind(since).all();

  const out = { generated: now, interval, targets: [], outages: [] };
  const dayStart = (ts) => ts - (ts % DAY);
  const today = dayStart(now);
  const hourNow = now - (now % HOUR);

  for (const t of targets(env)) {
    const mine = rows.filter((r) => r.target === t.id);
    const pct = (secs) => {
      const s = mine.filter((r) => r.ts >= now - secs);
      return s.length ? Math.round((s.filter((r) => r.ok).length / s.length) * 10000) / 100 : null;
    };

    const hours = [];
    for (let i = 23; i >= 0; i--) {
      const start = hourNow - i * HOUR;
      const s = mine.filter((r) => r.ts >= start && r.ts < start + HOUR);
      const down = s.filter((r) => !r.ok).length;
      hours.push({ start, checks: s.length, down, state: bucketState(s.length, down, interval) });
    }
    const days = [];
    for (let i = 89; i >= 0; i--) {
      const start = today - i * DAY;
      const s = mine.filter((r) => r.ts >= start && r.ts < start + DAY);
      const down = s.filter((r) => !r.ok).length;
      days.push({
        start,
        checks: s.length,
        down,
        uptime: s.length ? Math.round(((s.length - down) / s.length) * 10000) / 100 : null,
        state: bucketState(s.length, down, interval),
      });
    }

    const last = mine[mine.length - 1] || null;
    // No check written for over two intervals means the monitor itself has
    // stopped (cron or D1 failing): report that instead of the last result.
    const stale = last ? now - last.ts > 2 * interval : false;

    // Outages: runs of consecutive failed checks.
    let run = null;
    for (const r of mine) {
      if (!r.ok) {
        if (!run) run = { target: t.name, from: r.ts, until: r.ts };
        else run.until = r.ts;
      } else if (run) {
        out.outages.push({ ...run, until: r.ts, ongoing: false });
        run = null;
      }
    }
    if (run) out.outages.push({ ...run, until: stale ? run.until : now, ongoing: !stale });

    const recent = mine.filter((r) => r.ts >= now - DAY && r.ok);
    out.targets.push({
      id: t.id,
      name: t.name,
      up: last && !stale ? !!last.ok : null,
      stale,
      lastCheck: last ? last.ts : null,
      lastMs: last ? last.ms : null,
      slow: last ? last.ms > SLOW_MS : false,
      avgMs24h: recent.length ? Math.round(recent.reduce((a, r) => a + r.ms, 0) / recent.length) : null,
      firstCheck: mine.length ? mine[0].ts : null,
      uptime: { d1: pct(DAY), d7: pct(7 * DAY), d30: pct(30 * DAY), d90: pct(90 * DAY) },
      hours,
      days,
    });
  }
  out.outages.sort((a, b) => b.from - a.from);
  out.outages = out.outages.slice(0, 20);
  return out;
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      runChecks(env).catch((e) => {
        console.error("status checks failed:", e && e.stack ? e.stack : e);
        throw e;
      }),
    );
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== "GET" || !url.pathname.startsWith("/api/status")) {
      return new Response("Not found", { status: 404 });
    }
    const cache = caches.default;
    const key = new Request(url.origin + "/api/status", request);
    let res = await cache.match(key);
    if (!res) {
      const body = JSON.stringify(await buildStatus(env));
      res = new Response(body, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
          "x-content-type-options": "nosniff",
        },
      });
      ctx.waitUntil(cache.put(key, res.clone()));
    }
    return res;
  },
};
