// "AI Overview" panel at the top of every blog and portfolio post.
// It looks and behaves like a live AI summary (a thinking state, then the
// text streaming in, then "Dig deeper" follow-ups), but every response is
// written ahead of time: one of the page's overviews is picked at random
// each time. The text comes from the page bundle's ai-overview.yaml, which
// layouts/partials/extend-head-uncached.html embeds as JSON. Nothing is sent
// anywhere. See docs/ai-overview.md.
// An external file (not inline) so it runs under the site's CSP.
(() => {
  const dataEl = document.getElementById("ai-overview-data");
  const host = document.querySelector(".article-content");
  if (!dataEl || !host) return;
  let data;
  try {
    data = JSON.parse(dataEl.textContent);
  } catch {
    return;
  }
  const isText = (s) => typeof s === "string" && s.trim();
  const overviews = (data.overviews || []).filter(isText);
  if (!overviews.length) return;
  const followups = (data.followups || [])
    .map((f) => ({ q: f && f.question, a: [].concat((f && f.answers) || (f && f.answer) || []).filter(isText) }))
    .filter((f) => isText(f.q) && f.a.length);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pick = (list, not) => {
    if (list.length < 2) return 0;
    let i;
    do i = Math.floor(Math.random() * list.length); while (i === not);
    return i;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 250) : ms));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Text format: paragraphs split by blank lines, "- " lines are bullets,
  // **bold** is bold, `code` is code. Everything else is plain text (no HTML).
  const inline = (parent, text) => {
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).forEach((part) => {
      if (!part) return;
      if (/^\*\*[^*]+\*\*$/.test(part)) parent.appendChild(el("strong", null, part.slice(2, -2)));
      else if (/^`[^`]+`$/.test(part)) parent.appendChild(el("code", null, part.slice(1, -1)));
      else parent.appendChild(document.createTextNode(part));
    });
  };
  const render = (text) => {
    const frag = document.createDocumentFragment();
    text.trim().split(/\n\s*\n/).forEach((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.every((l) => /^[-*] /.test(l))) {
        const ul = el("ul");
        lines.forEach((l) => inline(ul.appendChild(el("li")), l.slice(2)));
        frag.appendChild(ul);
      } else {
        inline(frag.appendChild(el("p")), lines.join(" "));
      }
    });
    return frag;
  };

  // Reveal a rendered answer a few words at a time, like a model streaming.
  const stream = async (node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push([walker.currentNode, walker.currentNode.textContent]);
    if (reduce) return;
    texts.forEach(([t]) => (t.textContent = ""));
    for (const [t, full] of texts) {
      const words = full.split(/(\s+)/);
      for (let i = 0; i < words.length; i += 6) {
        t.textContent = words.slice(0, i + 6).join("");
        await new Promise((r) => setTimeout(r, 22 + Math.random() * 40));
      }
    }
  };

  const STEPS = {
    overview: ["Reading the post", "Finding the key points", "Checking the details", "Writing a summary"],
    followup: ["Looking through the post", "Pulling the relevant parts", "Writing a response"],
  };
  const think = async (thread, kind) => {
    const box = el("div", "aio-thinking");
    const status = el("span", "aio-thinking-text", STEPS[kind][0]);
    box.append(el("span", "aio-spark aio-spark-spin", "✦"), status);
    const lines = el("div", "aio-skeleton");
    for (let i = 0; i < (kind === "overview" ? 3 : 2); i++) lines.appendChild(el("span"));
    box.appendChild(lines);
    thread.appendChild(box);
    const total = 1400 + Math.random() * 1400;
    const steps = STEPS[kind];
    for (let i = 1; i < steps.length; i++) {
      await wait(total / steps.length);
      status.textContent = steps[i];
    }
    await wait(total / steps.length);
    box.remove();
  };

  // Build the panel.
  const root = el("section", "aio");
  root.setAttribute("aria-label", "AI overview of this post");
  const toggle = el("button", "aio-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.append(el("span", "aio-spark", "✦"), el("span", "aio-title", "AI Overview"), el("span", "aio-hint", "Summarize this post"), el("span", "aio-chevron"));
  const panel = el("div", "aio-panel");
  panel.id = "aio-panel";
  panel.hidden = true;
  toggle.setAttribute("aria-controls", panel.id);
  const thread = el("div", "aio-thread");
  thread.setAttribute("aria-live", "polite");
  const deeper = el("div", "aio-deeper");
  deeper.hidden = true;
  const chips = el("div", "aio-chips");
  deeper.append(el("p", "aio-label", "Dig deeper"), chips);
  const foot = el("div", "aio-foot");
  const regen = el("button", "aio-action", "↻ Regenerate");
  regen.type = "button";
  const up = el("button", "aio-action aio-rate", "👍");
  const down = el("button", "aio-action aio-rate", "👎");
  up.type = down.type = "button";
  up.setAttribute("aria-label", "Good response");
  down.setAttribute("aria-label", "Bad response");
  const thanks = el("span", "aio-thanks");
  thanks.setAttribute("aria-live", "polite");
  foot.append(regen, up, down, thanks, el("span", "aio-note", "AI responses may include mistakes."));
  panel.append(thread, deeper, foot);
  root.append(toggle, panel);
  host.insertBefore(root, host.firstChild);

  let current = -1;
  let busy = false;
  let started = false;
  const setBusy = (on) => {
    busy = on;
    root.classList.toggle("is-busy", on);
    thread.setAttribute("aria-busy", on ? "true" : "false");
    regen.disabled = on;
    chips.querySelectorAll("button").forEach((b) => (b.disabled = on));
    foot.classList.toggle("is-hidden", on && !thread.querySelector(".aio-answer"));
  };
  const answer = async (text, cls) => {
    const out = el("div", `aio-answer ${cls || ""}`);
    out.appendChild(render(text));
    thread.appendChild(out);
    await stream(out);
  };

  const addChips = () => {
    chips.textContent = "";
    followups.forEach((f) => {
      const b = el("button", "aio-chip", f.q);
      b.type = "button";
      b.addEventListener("click", () => ask(f, b));
      chips.appendChild(b);
    });
    deeper.hidden = !followups.length;
  };

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    thread.textContent = "";
    deeper.hidden = true;
    thanks.textContent = "";
    up.classList.remove("is-on");
    down.classList.remove("is-on");
    await think(thread, "overview");
    current = pick(overviews, current);
    await answer(overviews[current]);
    addChips();
    setBusy(false);
  };

  const ask = async (f, chip) => {
    if (busy) return;
    chip.remove();
    setBusy(true);
    const q = el("p", "aio-question", f.q);
    thread.appendChild(q);
    q.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    await think(thread, "followup");
    await answer(f.a[pick(f.a)], "is-followup");
    if (!chips.children.length) deeper.hidden = true;
    setBusy(false);
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    root.classList.toggle("is-open", open);
    if (open && !started) {
      started = true;
      generate();
    }
  });
  regen.addEventListener("click", generate);
  [up, down].forEach((b) =>
    b.addEventListener("click", () => {
      up.classList.toggle("is-on", b === up);
      down.classList.toggle("is-on", b === down);
      thanks.textContent = "Thanks for the feedback";
    })
  );
})();
