// Click-to-enlarge for every image in an article body and every carousel
// slide. Click an image and it opens full-screen (the original file, fitted
// to the screen); click again anywhere, or scroll, and it closes. Esc and
// the close button work too. In a carousel, the arrow keys, side buttons,
// and sideways swipes step through its slides while enlarged.
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
      <button type="button" class="lightbox-btn lightbox-close" data-act="close" aria-label="Close">✕</button>
    </div>
    <div class="lightbox-stage"><img alt=""></div>
    <p class="lightbox-caption"></p>
    <button type="button" class="lightbox-nav lightbox-prev" data-act="prev" aria-label="Previous image">‹</button>
    <button type="button" class="lightbox-nav lightbox-next" data-act="next" aria-label="Next image">›</button>`;
  document.body.appendChild(dialog);

  const big = dialog.querySelector(".lightbox-stage img");
  const count = dialog.querySelector(".lightbox-count");
  const caption = dialog.querySelector(".lightbox-caption");
  let group = [];
  let index = 0;
  let trigger = null;

  const show = (i) => {
    index = (i + group.length) % group.length;
    const img = group[index];
    big.src = fullSrc(img);
    big.alt = img.alt || "";
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

  // Any click closes it, except on the carousel's previous/next buttons.
  dialog.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "prev") show(index - 1);
    else if (act === "next") show(index + 1);
    else dialog.close();
  });

  // Scrolling closes it too: a mouse wheel or trackpad scroll, or a vertical
  // swipe on a touch screen. A sideways swipe steps through a carousel.
  dialog.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) > 4) dialog.close();
  }, { passive: false });
  let touch = null;
  dialog.addEventListener("touchstart", (e) => {
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  dialog.addEventListener("touchmove", (e) => {
    if (!touch) return;
    const dx = e.touches[0].clientX - touch.x;
    const dy = e.touches[0].clientY - touch.y;
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
      touch = null;
      dialog.close();
    } else if (Math.abs(dx) > 50 && group.length > 1) {
      touch = null;
      show(index + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
  dialog.addEventListener("touchend", () => { touch = null; }, { passive: true });

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && group.length > 1) show(index - 1);
    else if (e.key === "ArrowRight" && group.length > 1) show(index + 1);
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
