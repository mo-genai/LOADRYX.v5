/* ============================================================
   LOADRYX — hero interactivity
   - subtle canvas particles (mouse parallax)
   - Variable Proximity headline effect
   - video failure fallback
   - respects prefers-reduced-motion
   ============================================================ */

(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse      = window.matchMedia("(pointer: coarse)").matches;

  /* -- video error / loading fallback ---------------------------- */
  const media = document.querySelector(".hero-media");
  const video = document.querySelector(".hero-video");
  if (video && media) {
    const markFailed = () => media.classList.add("is-video-failed");
    video.addEventListener("error", markFailed, { once: true });
    video.addEventListener("stalled", () => {
      if (video.readyState < 2) markFailed();
    });
    // attempt autoplay (some browsers block until user gesture)
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* ignore */ });
    };
    tryPlay();
  }

  /* -- canvas particles ----------------------------------------- */
  const canvas = document.getElementById("hero-particles");
  if (canvas && !reducedMotion) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    let particles = [];
    let mouseX = -9999, mouseY = -9999;
    let rafId = 0;
    let running = true;

    const COLOR = "rgba(3, 131, 244, %a)";

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    }

    function buildParticles() {
      // density tuned for sparseness
      const target = Math.round((w * h) / 28000);
      const count = Math.max(28, Math.min(target, 70));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: Math.random() * 1.1 + 0.4,
          a: Math.random() * 0.4 + 0.15,
        });
      }
    }

    function frame() {
      if (!running) { rafId = 0; return; }
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // subtle mouse repulsion
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 14000) {
          const f = (14000 - dist2) / 14000;
          p.x += (dx / Math.sqrt(dist2 + 0.001)) * f * 0.6;
          p.y += (dy / Math.sqrt(dist2 + 0.001)) * f * 0.6;
        }

        // wrap edges
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.replace("%a", p.a.toFixed(3));
        ctx.fill();
      }

      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (rafId) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    window.addEventListener("resize", () => {
      resize();
    }, { passive: true });

    window.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }, { passive: true });

    window.addEventListener("mouseleave", () => {
      mouseX = mouseY = -9999;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });

    resize();
    start();
  }

  /* -- Variable Proximity headline ------------------------------ */
  if (!reducedMotion && !isCoarse) {
    const lines = document.querySelectorAll("[data-proximity-line]");
    if (lines.length) {
      const charsByLine = Array.from(lines).map((line) =>
        Array.from(line.querySelectorAll(".prox-char")).map((el) => ({
          el,
          baseWeight: parseInt(getComputedStyle(el).fontWeight, 10) || 400,
        }))
      );

      const RADIUS = 140;          // px of influence
      const RADIUS_SQ = RADIUS * RADIUS;
      let mx = -9999, my = -9999;
      let pending = false;

      function update() {
        pending = false;
        for (let li = 0; li < lines.length; li++) {
          const chars = charsByLine[li];
          for (let i = 0; i < chars.length; i++) {
            const { el, baseWeight } = chars[i];
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dx = mx - cx;
            const dy = my - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 < RADIUS_SQ) {
              const t = 1 - d2 / RADIUS_SQ;        // 0 .. 1
              const weight = Math.round(baseWeight + t * (900 - baseWeight) * 0.55);
              const spacing = (t * 0.06).toFixed(3);
              el.style.fontWeight = weight;
              el.style.transform = `translateY(${(-t * 1.2).toFixed(2)}px)`;
              el.style.letterSpacing = spacing + "em";
            } else if (el.style.fontWeight) {
              el.style.fontWeight = "";
              el.style.transform = "";
              el.style.letterSpacing = "";
            }
          }
        }
      }

      window.addEventListener("mousemove", (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!pending) {
          pending = true;
          requestAnimationFrame(update);
        }
      }, { passive: true });

      window.addEventListener("mouseleave", () => {
        mx = my = -9999;
        if (!pending) {
          pending = true;
          requestAnimationFrame(update);
        }
      });
    }
  }
})();
