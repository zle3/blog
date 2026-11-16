// Honors prefers-reduced-motion for autoplaying media. Videos that start
// with autoplay are tagged once (data-rm-managed) so they stay managed no
// matter how many times the setting changes:
//   reduce on  -> pause, show poster, keep controls so people can choose to play
//   reduce off -> resume autoplay
(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("video[autoplay]").forEach((v) => { v.dataset.rmManaged = "1"; });

  const apply = () => {
    document.querySelectorAll("video[data-rm-managed]").forEach((v) => {
      if (mq.matches) {
        v.autoplay = false;
        v.controls = true;
        v.pause();
        try { v.currentTime = 0; } catch (_) {}
      } else {
        v.autoplay = true;
        v.play().catch(() => {});
      }
    });
  };
  if (mq.matches) apply();
  mq.addEventListener("change", apply);
})();
