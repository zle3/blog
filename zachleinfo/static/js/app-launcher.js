// App launcher: the 9-dot "Apps" menu in the header (layouts/partials/app-launcher.html).
// Shared with travel.zachle.info: keep this file identical on both sites.
//
// The panel is a native popover (popovertarget), so it already opens, closes on
// Escape, and closes on an outside click without this script. This adds:
//   - aria-expanded kept in sync on the button
//   - positioning under the button, kept inside the viewport
//   - focus moves to the first tile on open, back to the button on close
//   - arrow keys, Home, and End move between tiles; Tab out of the panel closes it
//   - closing after an app is picked (and on back/forward cache restore)
//   - a class-based fallback for browsers without the Popover API
(() => {
  const root = document.querySelector(".app-launcher");
  if (!root) return;
  const button = root.querySelector(".app-launcher__button");
  const panel = root.querySelector(".app-launcher__panel");
  if (!button || !panel) return;

  const native = typeof panel.showPopover === "function";
  const tiles = () => Array.from(panel.querySelectorAll(".app-launcher__tile"));
  const isOpen = () => (native ? panel.matches(":popover-open") : panel.classList.contains("is-open"));
  const GAP = 8;

  const place = () => {
    const r = button.getBoundingClientRect();
    const w = panel.offsetWidth;
    const vw = document.documentElement.clientWidth;
    const left = Math.min(Math.max(GAP, r.right - w), vw - w - GAP);
    panel.style.top = `${Math.round(r.bottom + GAP)}px`;
    panel.style.left = `${Math.round(Math.max(GAP, left))}px`;
    panel.style.right = "auto";
  };

  const onOpened = () => {
    button.setAttribute("aria-expanded", "true");
    place();
    const first = tiles()[0];
    if (first) first.focus({ preventScroll: true });
  };

  const onClosed = () => {
    button.setAttribute("aria-expanded", "false");
    const active = document.activeElement;
    // Return focus to the button unless the person moved it somewhere else
    // (clicked into a field, tabbed past the panel).
    if (!active || active === document.body || panel.contains(active)) {
      button.focus({ preventScroll: true });
    }
  };

  const open = () => {
    if (isOpen()) return;
    if (native) panel.showPopover();
    else { panel.classList.add("is-open"); onOpened(); }
  };

  const close = () => {
    if (!isOpen()) return;
    if (native) panel.hidePopover();
    else { panel.classList.remove("is-open"); onClosed(); }
  };

  if (native) {
    panel.addEventListener("toggle", (e) => {
      if (e.newState === "open") onOpened();
      else onClosed();
    });
  } else {
    // No Popover API: drive it ourselves.
    button.removeAttribute("popovertarget");
    button.addEventListener("click", () => (isOpen() ? close() : open()));
  }

  // Outside click or tap closes it. Native light dismiss usually gets there
  // first; this covers the fallback and any browser that misses a touch.
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !root.contains(e.target)) close();
  });

  root.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      button.focus({ preventScroll: true });
      return;
    }
    const list = tiles();
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % list.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + list.length) % list.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Move to the nearest tile in the next or previous row; with one row,
      // behave like Right and Left.
      const down = e.key === "ArrowDown";
      const cur = list[i].getBoundingClientRect();
      let best = -1;
      let bestScore = Infinity;
      list.forEach((t, j) => {
        const r = t.getBoundingClientRect();
        const dy = down ? r.top - cur.bottom : cur.top - r.bottom;
        if (dy < -1) return;
        const score = dy * 1000 + Math.abs(r.left - cur.left);
        if (score < bestScore) { bestScore = score; best = j; }
      });
      next = best >= 0 ? best : (down ? (i + 1) % list.length : (i - 1 + list.length) % list.length);
    }
    if (next >= 0) {
      e.preventDefault();
      list[next].focus();
    }
  });

  // Tabbing out of the panel closes it.
  panel.addEventListener("focusout", (e) => {
    if (isOpen() && e.relatedTarget && !root.contains(e.relatedTarget)) close();
  });

  // Picking an app closes the panel (same-tab navigation follows).
  panel.addEventListener("click", (e) => {
    if (e.target.closest(".app-launcher__tile")) close();
  });

  window.addEventListener("resize", () => { if (isOpen()) place(); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) close(); });
})();
