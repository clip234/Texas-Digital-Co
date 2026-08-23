(function () {
  "use strict";

  /* Header shadow on scroll */
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile menu */
  var toggle = document.getElementById("menuToggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        mobileNav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileNav.classList.contains("is-open")) {
        mobileNav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* Scroll reveal — content is visible by default if this never runs */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* Contact form → Formspree */
  var form = document.getElementById("contactForm");
  if (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    var labelIdle = button ? button.textContent.trim() : "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      status.textContent = "";
      status.className = "form-status";
      if (button) {
        button.disabled = true;
        button.textContent = form.dataset.sending || "Sending…";
      }

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          if (!res.ok) throw new Error("bad status");
          form.reset();
          status.textContent = form.dataset.ok || "Message sent.";
          status.className = "form-status ok";
        })
        .catch(function () {
          status.textContent = form.dataset.err || "Something went wrong.";
          status.className = "form-status err";
        })
        .finally(function () {
          if (button) {
            button.disabled = false;
            button.textContent = labelIdle;
          }
        });
    });
  }
})();

/* ---------------------------------------------------------------
   PageSpeed check.
   Real Google PageSpeed Insights API only. If the request fails,
   the user is told it failed. No generated or estimated scores.
---------------------------------------------------------------- */
(function () {
  var form = document.getElementById('psiForm');
  if (!form) return;

  var input   = document.getElementById('psiUrl');
  var button  = document.getElementById('psiSubmit');
  var status  = document.getElementById('psiStatus');
  var results = document.getElementById('psiResults');
  var labels  = {};
  try { labels = JSON.parse(form.dataset.labels); } catch (e) { labels = {}; }

  var ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  var CATS = ['performance', 'accessibility', 'best-practices', 'seo'];

  function normalise(raw) {
    var v = (raw || '').trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      if (!/^[^\s.]+\.[^\s.]{2,}$/.test(u.hostname) && u.hostname.indexOf('.') === -1) return null;
      return u.href;
    } catch (e) { return null; }
  }

  function band(score) { return score >= 0.9 ? 'good' : score >= 0.5 ? 'ok' : 'bad'; }

  function setStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle('err', !!isError);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var url = normalise(input.value);
    results.hidden = true;
    results.innerHTML = '';

    if (!url) { setStatus(form.dataset.invalid, true); input.focus(); return; }

    button.disabled = true;
    setStatus(form.dataset.running, false);

    var query = ENDPOINT + '?url=' + encodeURIComponent(url) + '&strategy=mobile' +
                CATS.map(function (c) { return '&category=' + c; }).join('');

    fetch(query)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var cats = data && data.lighthouseResult && data.lighthouseResult.categories;
        if (!cats) throw new Error('no lighthouse result');

        var html = '';
        CATS.forEach(function (key) {
          var cat = cats[key];
          if (!cat || typeof cat.score !== 'number') return;
          var pct = Math.round(cat.score * 100);
          html += '<div class="score ' + band(cat.score) + '">' +
                    '<div class="score-value">' + pct + '</div>' +
                    '<div class="score-label">' + (labels[key] || key) + '</div>' +
                  '</div>';
        });

        if (!html) throw new Error('no categories returned');

        results.innerHTML = html;
        results.hidden = false;
        var host = data.id || url;
        setStatus(form.dataset.resultfor + ' ' + host, false);
      })
      .catch(function () {
        // Deliberately no fallback scores. A failed check reads as failed.
        results.hidden = true;
        results.innerHTML = '';
        setStatus(form.dataset.failed, true);
      })
      .then(function () { button.disabled = false; });
  });
})();
