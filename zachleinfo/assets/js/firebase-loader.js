// Loads the Firebase module after the page is idle (same behaviour as the
// upstream Blowfish inline loader), from an external file so it passes CSP.
// If the module can't load (blocked, offline), stop the counter placeholders
// pulsing and hide the like button instead of leaving them stuck.
(function () {
  var src = document.currentScript && document.currentScript.dataset.firebaseSrc;
  if (!src) return;
  var fail = function (err) {
    console.error("Firebase failed to load:", err);
    document.querySelectorAll("span[id^='views_'], span[id^='likes_']").forEach(function (n) {
      n.className = "";
      n.textContent = "–";
    });
    document.querySelectorAll("[id='button_likes']").forEach(function (b) {
      b.style.display = "none";
    });
  };
  var load = function () {
    import(src).catch(fail);
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(load, { timeout: 4000 });
  } else {
    window.addEventListener("load", function () {
      setTimeout(load, 1500);
    });
  }
})();
