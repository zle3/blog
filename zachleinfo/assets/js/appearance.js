// Site override of Blowfish appearance.js. Change from upstream: the
// theme is decided by one function, resolveAppearance(), used on load, when
// the OS setting changes, on reset (right-click the switcher) and when
// another tab changes it, so the page, the saved choice and the switcher
// never disagree. Precedence: saved choice > OS setting (if auto) > site default.
const sitePreference = document.documentElement.getAttribute("data-default-appearance");
const autoAppearance = document.documentElement.getAttribute("data-auto-appearance") === "true";
const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const readSaved = () => {
  try {
    const v = localStorage.getItem("appearance");
    return v === "dark" || v === "light" ? v : null;
  } catch (e) {
    return null;
  }
};
const writeSaved = (v) => {
  try {
    v ? localStorage.setItem("appearance", v) : localStorage.removeItem("appearance");
  } catch (e) {}
};
const resolveAppearance = () => {
  const saved = readSaved();
  if (saved) return saved;
  if (autoAppearance && darkQuery) return darkQuery.matches ? "dark" : "light";
  return sitePreference === "dark" ? "dark" : "light";
};
// Applies a mode to the page. UI extras (meta, tooltip, logo, mermaid) are
// refreshed through window.__appearanceUI once the DOM is ready.
const applyAppearance = (mode) => {
  document.documentElement.classList.toggle("dark", mode === "dark");
  if (window.__appearanceUI) window.__appearanceUI(mode);
};

applyAppearance(resolveAppearance());

if (darkQuery) {
  darkQuery.addEventListener("change", () => {
    if (!readSaved()) applyAppearance(resolveAppearance());
  });
}
window.addEventListener("storage", (event) => {
  if (event.key === "appearance" || event.key === null) applyAppearance(resolveAppearance());
});

// Mermaid dark mode support
var updateMermaidTheme = () => {
  if (typeof mermaid !== 'undefined') {
    const isDark = document.documentElement.classList.contains("dark");

    const mermaids = document.querySelectorAll('pre.mermaid');
    mermaids.forEach(e => {
      if (e.getAttribute('data-processed')) {
        // Already rendered, clean the processed attributes
        e.removeAttribute('data-processed');
        // Replace the rendered HTML with the stored text
        e.innerHTML = e.getAttribute('data-graph');
      } else {
        // First time, store the text
        e.setAttribute('data-graph', e.textContent);
      }
    });

    if (isDark) {
      initMermaidDark();
      mermaid.run();
    } else {
      initMermaidLight();
      mermaid.run();
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const switchers = [
    document.getElementById("appearance-switcher"),
    document.getElementById("appearance-switcher-mobile"),
  ].filter(Boolean);

  // Load the i18n translations for the tooltips
  const darkLabel = {{ i18n "footer.dark_appearance" | jsonify }};
  const lightLabel = {{ i18n "footer.light_appearance" | jsonify }};

  const updateTooltip = (mode) => {
    // If the page is dark, the next action switches to light
    const label = mode === "dark" ? lightLabel : darkLabel;
    switchers.forEach((el) => {
      el.setAttribute("aria-label", label);
      el.setAttribute("title", label);
    });
  };

  window.__appearanceUI = (mode) => {
    updateMeta();
    updateMermaidTheme();
    updateTooltip(mode);
    window.updateLogo?.(mode);
  };
  window.__appearanceUI(getTargetAppearance());

  switchers.forEach((el) => {
    el.addEventListener("click", () => {
      const next = getTargetAppearance() === "dark" ? "light" : "dark";
      writeSaved(next);
      applyAppearance(next);
    });
    // Right-click resets to automatic: forget the saved choice and re-resolve.
    el.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      writeSaved(null);
      applyAppearance(resolveAppearance());
    });
  });
});


var updateMeta = () => {
  var elem, style;
  elem = document.querySelector('body');
  style = getComputedStyle(elem);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', style.backgroundColor);
}

{{ if and (.Site.Params.Logo) (.Site.Params.SecondaryLogo) }}
{{ $primaryLogo := resources.Get .Site.Params.Logo }}
{{ $secondaryLogo := resources.Get .Site.Params.SecondaryLogo }}
{{ if and ($primaryLogo) ($secondaryLogo) }}
var updateLogo = (targetAppearance) => {
  var imgElems = document.querySelectorAll("img.logo");
  var logoContainers = document.querySelectorAll("span.logo");
  
  targetLogoPath = 
    targetAppearance == "{{ .Site.Params.DefaultAppearance }}" ?
    "{{ $primaryLogo.RelPermalink }}" : "{{ $secondaryLogo.RelPermalink }}"
  for (const elem of imgElems) {
    elem.setAttribute("src", targetLogoPath)
  }

  {{ if eq $primaryLogo.MediaType.SubType "svg" }}
  targetContent = 
    targetAppearance == "{{ .Site.Params.DefaultAppearance }}" ?
    `{{ $primaryLogo.Content | safeHTML }}` : `{{ $secondaryLogo.Content | safeHTML }}`
  for (const container of logoContainers) {
    container.innerHTML = targetContent;
  }
  {{ end }}
}
{{ end }}
{{- end }}

var getTargetAppearance = () => {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

window.addEventListener("DOMContentLoaded", (event) => {
  const scroller = document.getElementById("top-scroller");
  const footer = document.getElementById("site-footer");
  if(scroller && footer && scroller.getBoundingClientRect().top > footer.getBoundingClientRect().top) {
    scroller.hidden = true;
  }
});
