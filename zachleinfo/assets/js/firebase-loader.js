// Loads the Firebase module after the page is idle (same behaviour as the
// upstream Blowfish inline loader), from an external file so it passes CSP.
(function () {
  var src = document.currentScript && document.currentScript.dataset.firebaseSrc;
  if (!src) return;
  var load = function () {
    import(src);
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(load, { timeout: 4000 });
  } else {
    window.addEventListener("load", function () {
      setTimeout(load, 1500);
    });
  }
})();
