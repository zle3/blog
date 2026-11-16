// Keeps carousel captions a constant height so slides don't jump.
// Moved out of the Blowfish carousel shortcode's inline <script> so it
// runs under the site's Content-Security-Policy (no 'unsafe-inline').
// Heights are re-measured from scratch on each resize (so they can shrink
// as well as grow), at most once per animation frame.
(() => {
  document.querySelectorAll("[data-caption-fix]").forEach((root) => {
    const items = Array.from(root.querySelectorAll("[data-twe-carousel-item]"));
    const captions = items.map((item) => item.querySelector("figcaption")).filter(Boolean);
    if (captions.length < 2) return;

    const fix = () => {
      captions.forEach((c) => { c.style.minHeight = ""; });
      const hidden = items.filter((item) => item.classList.contains("hidden"));
      hidden.forEach((item) => item.classList.remove("hidden"));
      const max = Math.max(...captions.map((c) => Math.ceil(c.getBoundingClientRect().height)));
      hidden.forEach((item) => item.classList.add("hidden"));
      captions.forEach((c) => { c.style.minHeight = `${max}px`; });
    };

    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => { queued = false; fix(); });
    };

    schedule();
    window.addEventListener("load", schedule, { once: true });
    window.addEventListener("resize", schedule);
  });
})();
