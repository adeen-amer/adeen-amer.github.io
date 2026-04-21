(function () {
  "use strict";

  var THEME_KEY = "adeen-theme";
  var doc = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(value) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (e) {
      /* ignore */
    }
  }

  function getSystemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      doc.setAttribute("data-theme", theme);
    } else {
      doc.removeAttribute("data-theme");
    }
  }

  function resolvedTheme() {
    var t = getStoredTheme();
    if (t === "dark" || t === "light") return t;
    return getSystemDark() ? "dark" : "light";
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored === "dark" || stored === "light") {
      applyTheme(stored);
    } else {
      applyTheme(getSystemDark() ? "dark" : "light");
    }

    var toggles = document.querySelectorAll("[data-theme-toggle]");
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = resolvedTheme() === "dark" ? "light" : "dark";
        setStoredTheme(next);
        applyTheme(next);
        btn.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
      });
    });

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (!getStoredTheme()) applyTheme(getSystemDark() ? "dark" : "light");
      });
    }
  }

  function initMobileNav() {
    var openBtn = document.querySelector("[data-nav-open]");
    var drawer = document.querySelector("[data-mobile-drawer]");
    if (!openBtn || !drawer) return;

    var panel = drawer.querySelector(".mobile-drawer__panel");
    var backdrop = drawer.querySelector(".mobile-drawer__backdrop");
    var closeBtns = drawer.querySelectorAll("[data-nav-close]");

    function setOpen(open) {
      drawer.classList.toggle("is-open", open);
      openBtn.setAttribute("aria-expanded", open ? "true" : "false");
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) {
        var first = panel.querySelector("a");
        if (first) first.focus();
      } else {
        openBtn.focus();
      }
    }

    openBtn.addEventListener("click", function () {
      setOpen(!drawer.classList.contains("is-open"));
    });

    closeBtns.forEach(function (el) {
      el.addEventListener("click", function () {
        setOpen(false);
      });
    });

    drawer.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  function initScrollReveal() {
    if (!window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var els = document.querySelectorAll('.reveal:not([data-reveal-watched="1"])');
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    els.forEach(function (el) {
      el.setAttribute("data-reveal-watched", "1");
      io.observe(el);
    });
  }

  function initProjectFilters() {
    var root = document.querySelector("[data-project-grid]");
    if (!root) return;

    function setFilter(cat) {
      var buttons = root.querySelectorAll("[data-filter]");
      var cards = root.querySelectorAll("[data-project-card]");
      buttons.forEach(function (btn) {
        var f = btn.getAttribute("data-filter");
        var match = f === "*" ? cat === "*" : f === cat;
        btn.setAttribute("aria-pressed", match ? "true" : "false");
      });

      cards.forEach(function (card) {
        var cats = (card.getAttribute("data-categories") || "").split(/\s+/);
        var show = cat === "*" || cats.indexOf(cat) !== -1;
        card.hidden = !show;
      });
    }

    if (!root.dataset.filterDelegated) {
      root.dataset.filterDelegated = "1";
      root.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-filter]");
        if (!btn || !root.contains(btn)) return;
        setFilter(btn.getAttribute("data-filter") || "*");
      });
    }

    setFilter("*");
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function initProjectsFromJson() {
    var mount = document.querySelector("[data-projects-json]");
    if (!mount) return;

    var url = mount.getAttribute("data-projects-json");
    if (!url) return;

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("Failed to load projects");
        return r.json();
      })
      .then(function (data) {
        var projects = data.projects || [];
        var frag = document.createDocumentFragment();

        projects.forEach(function (p) {
          var article = document.createElement("article");
          article.className = "card project-card reveal";
          article.setAttribute("data-project-card", "");
          article.setAttribute("data-categories", (p.categories || []).join(" "));

          var tags = (p.categories || [])
            .map(function (c) {
              var label =
                c === "product"
                  ? "Product"
                  : c === "data"
                    ? "Data"
                    : c === "creative"
                      ? "Creative"
                      : c;
              var cls =
                c === "product" ? "tag tag--pm" : c === "data" ? "tag tag--data" : c === "creative" ? "tag tag--creative" : "tag";
              return '<span class="' + cls + '">' + label + "</span>";
            })
            .join("");

          article.innerHTML =
            '<a href="' +
            escapeAttr(p.href || "#") +
            '" class="card__media"><img src="' +
            escapeAttr(p.thumb || "") +
            '" alt="' +
            escapeAttr(p.imageAlt || p.title || "Project") +
            '" loading="lazy" width="640" height="400"></a><div class="card__body"><div class="tag-row">' +
            tags +
            '</div><h3><a class="card__link" href="' +
            escapeAttr(p.href || "#") +
            '">' +
            escapeHtml(p.title || "Project") +
            "</a></h3><p>" +
            escapeHtml(p.tagline || "") +
            "</p></div>";

          frag.appendChild(article);
        });

        mount.appendChild(frag);
        initProjectFilters();
        initScrollReveal();
      })
      .catch(function () {
        mount.innerHTML =
          '<p class="form-status form-status--error" role="alert">Projects could not be loaded. Please refresh the page.</p>';
      });
  }

  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    var statusEl = form.querySelector("[data-form-status]");

    function showStatus(type, message) {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.hidden = false;
      statusEl.className = "form-status form-status--" + type;
      statusEl.setAttribute("role", "alert");
    }

    function clearFieldErrors() {
      form.querySelectorAll(".field-error").forEach(function (el) {
        el.remove();
      });
      form.querySelectorAll("[aria-invalid]").forEach(function (input) {
        input.removeAttribute("aria-invalid");
      });
    }

    function addFieldError(input, msg) {
      input.setAttribute("aria-invalid", "true");
      var err = document.createElement("p");
      err.className = "field-error";
      err.id = input.id + "-error";
      err.textContent = msg;
      input.setAttribute("aria-describedby", err.id);
      input.parentNode.appendChild(err);
    }

    form.addEventListener("submit", function (e) {
      clearFieldErrors();
      var valid = true;
      var name = form.querySelector("#contact-name");
      var email = form.querySelector("#contact-email");
      var subject = form.querySelector("#contact-subject");
      var message = form.querySelector("#contact-message");

      if (name && !name.value.trim()) {
        addFieldError(name, "Please enter your name.");
        valid = false;
      }
      if (email) {
        var em = email.value.trim();
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          addFieldError(email, "Please enter a valid email address.");
          valid = false;
        }
      }
      if (subject && !subject.value.trim()) {
        addFieldError(subject, "Please add a subject.");
        valid = false;
      }
      if (message && !message.value.trim()) {
        addFieldError(message, "Please write a short message.");
        valid = false;
      }

      if (!valid) {
        e.preventDefault();
        showStatus("error", "Fix the highlighted fields, then try again.");
        return;
      }

      showStatus("ok", "Submitting… You will leave this site to confirm delivery with the form provider.");
    });
  }

  initTheme();
  initMobileNav();
  initProjectFilters();
  initProjectsFromJson();
  initScrollReveal();
  initContactForm();
})();
