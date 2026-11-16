// /status page: uptime history from the zachle-status Worker
// (/api/status, same origin) plus live checks from the visitor's browser.
(() => {
  const $ = (id) => document.getElementById(id);
  const banner = $("status-banner");
  const summary = $("status-summary");
  const since = $("status-since");
  if (!banner) return;

  const LABEL = {
    up: "Up",
    short: "Short outage",
    outage: "Outage",
    "mostly-down": "Mostly down",
    none: "No data",
  };
  const fmtDate = (ts) => new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ");
  const fmtDay = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
  const fmtPct = (v) => (v == null ? "No data" : `${v}%`);
  const ago = (secs) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return d ? `${d} days ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
  };
  const lasted = (o) => {
    const mins = Math.max(1, Math.round((o.until - o.from) / 60));
    return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const barRow = (name, buckets, titleFor) => {
    const row = el("div", "status-row");
    row.append(el("div", "status-row-name", name));
    const bars = el("div", "status-bars");
    buckets.forEach((b) => {
      const sq = el("span", "status-bar");
      sq.dataset.s = b.state;
      sq.title = titleFor(b);
      sq.setAttribute("aria-label", sq.title);
      bars.append(sq);
    });
    row.append(bars);
    return row;
  };

  const renderHistory = (data) => {
    // Banner state comes from the public site row. States:
    //   none (no checks yet) | stale (monitor stopped writing) | up | slow | down
    const site = data.targets.find((t) => t.id === "site") || data.targets[0];
    const others = data.targets.filter((t) => t !== site);
    const state = !site.lastCheck ? "none" : site.stale ? "stale" : site.up === false ? "down" : site.slow ? "slow" : "up";
    const otherDown = others.filter((t) => t.up === false).map((t) => t.name);
    banner.dataset.state = { none: "checking", stale: "slow", up: otherDown.length ? "slow" : "ok", slow: "slow", down: "down" }[state];
    summary.textContent = {
      none: "Monitoring has just started",
      stale: "Uptime monitor hasn't reported recently",
      up: otherDown.length ? `zachle.info is up (${otherDown.join(", ")} check failing)` : "zachle.info is up",
      slow: "zachle.info is up but responding slowly",
      down: "zachle.info is not responding",
    }[state];
    if (site.firstCheck) {
      since.textContent = `Monitored since ${fmtDate(site.firstCheck)} UTC (${ago(data.generated - site.firstCheck)} ago)`;
    }

    const cards = $("status-cards");
    cards.replaceChildren();
    [["d1", "Last 24 hours"], ["d7", "Last 7 days"], ["d30", "Last 30 days"], ["d90", "Last 90 days"]].forEach(([k, label]) => {
      const c = el("div", "status-card");
      c.append(el("div", "status-card-big", fmtPct(site.uptime[k])));
      data.targets.slice(1).forEach((t) => c.append(el("div", "status-card-sub", `${t.name.toLowerCase()} ${fmtPct(t.uptime[k])}`)));
      c.append(el("div", "status-card-sub", label));
      cards.append(c);
    });

    const hours = $("status-hours");
    hours.replaceChildren();
    data.targets.forEach((t) =>
      hours.append(barRow(t.name, t.hours, (b) =>
        `${fmtDate(b.start)} UTC: ${LABEL[b.state]}${b.checks ? ` (${b.checks - b.down}/${b.checks} checks ok)` : ""}`)));
    const hEnds = el("div", "status-ends");
    hEnds.append(el("span", null, "24 h ago"), el("span", null, "now"));
    hours.append(hEnds);

    const days = $("status-days");
    days.replaceChildren();
    data.targets.forEach((t) =>
      days.append(barRow(t.name, t.days, (b) =>
        `${fmtDay(b.start)}: ${LABEL[b.state]}${b.uptime != null ? ` (${b.uptime}% up)` : ""}`)));
    const dEnds = el("div", "status-ends");
    dEnds.append(el("span", null, "90 days ago"), el("span", null, "today"));
    days.append(dEnds);

    const tbody = $("status-outages");
    tbody.replaceChildren();
    if (!data.outages.length) {
      const tr = el("tr");
      const td = el("td", "status-empty", "No outages recorded.");
      td.colSpan = 4;
      tr.append(td);
      tbody.append(tr);
    }
    data.outages.forEach((o) => {
      const tr = el("tr");
      tr.append(
        el("td", null, `Not reachable: ${o.target}`),
        el("td", null, fmtDate(o.from)),
        el("td", null, o.ongoing ? "Ongoing" : fmtDate(o.until)),
        el("td", "status-num", lasted(o)),
      );
      tbody.append(tr);
    });

    $("status-history").hidden = false;
  };

  fetch("/api/status", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(renderHistory)
    .catch(() => {
      banner.dataset.state = "checking";
      summary.textContent = "Uptime history isn't available right now";
      since.textContent = "The live checks below still run from your browser.";
    });

  // ---- Live checks from this browser ----
  const SLOW_MS = 1500;
  const TIMEOUT_MS = 8000;
  const rows = Array.from(document.querySelectorAll("#status-checks [data-check]"));

  const timeOne = async (row) => {
    const url = row.dataset.check;
    const noCors = row.dataset.mode === "no-cors";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const t0 = performance.now();
    try {
      const res = await fetch(noCors ? url : `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
        method: noCors ? "GET" : "HEAD",
        mode: noCors ? "no-cors" : "same-origin",
        cache: "no-store",
        signal: ctrl.signal,
      });
      const ms = Math.round(performance.now() - t0);
      const ok = noCors ? true : res.ok;
      return { state: !ok ? "down" : ms > SLOW_MS ? "slow" : "ok", text: ok ? (noCors ? `Reachable · ${ms} ms` : `${ms} ms`) : `Error ${res.status}` };
    } catch (e) {
      return { state: "down", text: e.name === "AbortError" ? "Timed out" : "Unreachable" };
    } finally {
      clearTimeout(timer);
    }
  };

  let liveRun = 0;
  const recheck = $("status-recheck");
  const runLive = async () => {
    const run = ++liveRun; // results from older runs are ignored
    if (recheck) recheck.disabled = true;
    await Promise.all(rows.map(async (row) => {
      row.dataset.state = "checking";
      row.querySelector(".status-result").textContent = "…";
      const r = await timeOne(row);
      if (run !== liveRun) return;
      row.dataset.state = r.state;
      row.querySelector(".status-result").textContent = r.text;
    }));
    if (run === liveRun && recheck) recheck.disabled = false;
  };

  // Cloudflare's trace endpoint: edge location, HTTP and TLS versions.
  // Only those fields are shown; the visitor's IP is not displayed.
  fetch("/cdn-cgi/trace", { cache: "no-store" })
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((t) => {
      const f = Object.fromEntries(t.trim().split("\n").map((l) => l.split("=")));
      $("status-edge").textContent = f.colo || "Unknown";
      $("status-conn").textContent = [f.http, f.tls].filter(Boolean).join(" · ") || "Unknown";
    })
    .catch(() => {
      $("status-edge").textContent = "Not available";
      $("status-conn").textContent = location.protocol === "https:" ? "HTTPS" : "HTTP";
    });

  recheck?.addEventListener("click", runLive);
  runLive();
})();
