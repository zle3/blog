// Click-to-enlarge for every image in an article body and every carousel
// slide. Opens the original full-resolution file in a full-screen dialog:
// fit to the screen first, click (or press Z) for actual size and drag or
// scroll to pan (only offered when the file is bigger than the screen). Arrow keys and buttons step through a carousel's slides.
// Esc, the close button, or a click on the backdrop closes it.
// An external file (not inline) so it runs under the site's CSP.
(() => {
  const SELECTOR = ".article-content img, [data-twe-carousel-item] img";
  const images = Array.from(document.querySelectorAll(SELECTOR)).filter(
    (img) => !img.closest("a") && !img.classList.contains("no-lightbox")
  );
  if (!images.length) return;

  const fullSrc = (img) => img.dataset.zoomSrc || img.currentSrc || img.src;
  const captionOf = (img) => {
    const fig = img.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    const slideCap = img.closest("[data-twe-carousel-item]")?.querySelector("figcaption");
    return ((cap || slideCap)?.textContent || "").trim();
  };
  const groupOf = (img) => {
    const carousel = img.closest("[data-twe-carousel-init]");
    return carousel ? images.filter((i) => carousel.contains(i)) : [img];
  };

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "Enlarged image");
  dialog.innerHTML = `
    <div class="lightbox-bar">
      <span class="lightbox-count" aria-live="polite"></span>
      <button type="button" class="lightbox-btn" data-act="size" aria-pressed="false">Actual size</button>
      <a class="lightbox-btn" data-act="open" target="_blank" rel="noopener">Open original</a>
      <button type="button" class="lightbox-btn lightbox-close" data-act="close" aria-label="Close">✕</button>
    </div>
    <div class="lightbox-stage"><img alt=""></div>
    <p class="lightbox-caption"></p>
    <button type="button" class="lightbox-nav lightbox-prev" data-act="prev" aria-label="Previous image">‹</button>
    <button type="button" class="lightbox-nav lightbox-next" data-act="next" aria-label="Next image">›</button>`;
  document.body.appendChild(dialog);

  const stage = dialog.querySelector(".lightbox-stage");
  const big = stage.querySelector("img");
  const count = dialog.querySelector(".lightbox-count");
  const caption = dialog.querySelector(".lightbox-caption");
  const sizeBtn = dialog.querySelector('[data-act="size"]');
  const openLink = dialog.querySelector('[data-act="open"]');
  let group = [];
  let index = 0;
  let trigger = null;

  const setActual = (on, point) => {
    dialog.classList.toggle("is-actual", on);
    sizeBtn.setAttribute("aria-pressed", String(on));
    sizeBtn.textContent = on ? "Fit to screen" : "Actual size";
    if (on && point) {
      // Keep the clicked spot under the pointer after zooming in.
      requestAnimationFrame(() => {
        stage.scrollLeft = point.x * big.naturalWidth - stage.clientWidth / 2;
        stage.scrollTop = point.y * big.naturalHeight - stage.clientHeight / 2;
      });
    }
  };

  const show = (i) => {
    index = (i + group.length) % group.length;
    const img = group[index];
    setActual(false);
    sizeBtn.hidden = true;
    big.onload = () => {
      // Actual size only helps when the file is bigger than the screen space.
      sizeBtn.hidden = big.naturalWidth <= stage.clientWidth && big.naturalHeight <= stage.clientHeight;
      dialog.classList.toggle("no-actual", sizeBtn.hidden);
    };
    big.src = fullSrc(img);
    big.alt = img.alt || "";
    openLink.href = big.src;
    caption.textContent = captionOf(img);
    caption.hidden = !caption.textContent;
    const many = group.length > 1;
    count.textContent = many ? `${index + 1} / ${group.length}` : "";
    dialog.classList.toggle("is-group", many);
  };

  const open = (img) => {
    trigger = img;
    group = groupOf(img);
    show(group.indexOf(img));
    dialog.showModal();
    document.documentElement.classList.add("lightbox-open");
  };

  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("lightbox-open");
    big.removeAttribute("src");
    trigger?.focus({ preventScroll: true });
  });

  dialog.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") dialog.close();
    else if (act === "prev") show(index - 1);
    else if (act === "next") show(index + 1);
    else if (act === "size") setActual(!dialog.classList.contains("is-actual"));
    else if (e.target === big && !sizeBtn.hidden) {
      const r = big.getBoundingClientRect();
      const actual = dialog.classList.contains("is-actual");
      setActual(!actual, actual ? null : { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    } else if (e.target === stage || e.target === dialog) dialog.close();
  });

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && group.length > 1) show(index - 1);
    else if (e.key === "ArrowRight" && group.length > 1) show(index + 1);
    else if ((e.key === "z" || e.key === "Z") && !sizeBtn.hidden) setActual(!dialog.classList.contains("is-actual"));
  });

  // Drag to pan in actual-size mode.
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!dialog.classList.contains("is-actual") || e.pointerType === "touch") return;
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop, moved: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    stage.scrollLeft = drag.left - dx;
    stage.scrollTop = drag.top - dy;
  });
  window.addEventListener("pointerup", () => {
    if (drag?.moved) stage.addEventListener("click", (e) => e.stopPropagation(), { capture: true, once: true });
    drag = null;
  });

  // Carousel slides overlap (stacked floats), so a click can land on the
  // slide wrapper rather than the image: open the active slide's image.
  document.querySelectorAll("[data-twe-carousel-init]").forEach((carousel) => {
    carousel.addEventListener("click", (e) => {
      if (e.target.closest("button, a, figcaption")) return;
      const item = e.target.closest("[data-twe-carousel-item]");
      if (!item) return;
      const active = carousel.querySelector("[data-twe-carousel-item][data-twe-carousel-active] img") || item.querySelector("img");
      if (active && images.includes(active)) {
        e.preventDefault();
        open(active);
      }
    });
    carousel.querySelectorAll("[data-twe-carousel-item] .single_hero_background").forEach((el) => el.classList.add("lightbox-trigger"));
  });

  images.forEach((img) => {
    img.classList.add("lightbox-trigger");
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `Enlarge image${img.alt ? `: ${img.alt}` : ""}`);
    if (!img.closest("[data-twe-carousel-init]")) {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        open(img);
      });
    }
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(img);
      }
    });
  });
})();
