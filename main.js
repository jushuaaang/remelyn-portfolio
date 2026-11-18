(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hasGsap = typeof window.gsap !== "undefined";
  let lenis = null;

  /* ── Timecode (25 fps) ── */
  const tc = (sec) => {
    const f = Math.floor((sec % 1) * 25);
    const s = Math.floor(sec) % 60, m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600);
    return [h, m, s, f].map((x) => String(x).padStart(2, "0")).join(":");
  };

  /* ── Project bin thumbnails ── */
  const binClips = ["ugc-03", "ugc-05", "clay", "brand-02", "ugc-09", "ugc-11", "brand-04", "ugc-04", "ugc-12"];
  $("[data-bin]").innerHTML = binClips.map((c) =>
    `<figure class="bin__item"><img src="assets/v/${c}.jpg" alt="" loading="lazy"><figcaption>${c.toUpperCase()}.mp4</figcaption></figure>`).join("");

  /* ── Sequence ruler ── */
  $(".seq__ruler").innerHTML = Array.from({ length: 8 }, (_, i) => `<span>${tc(i * 4)}</span>`).join("");

  /* ── "PORTFOLIO" built out of timeline clips ── */
  const G = { // rows → [start, length] segments on a 4-unit cell
    P: [[[0, 4]], [[0, 1], [3, 1]], [[0, 4]], [[0, 1]], [[0, 1]]],
    O: [[[0, 4]], [[0, 1], [3, 1]], [[0, 1], [3, 1]], [[0, 1], [3, 1]], [[0, 4]]],
    R: [[[0, 4]], [[0, 1], [3, 1]], [[0, 4]], [[0, 1], [2, 1]], [[0, 1], [3, 1]]],
    T: [[[0, 4]], [[1.5, 1]], [[1.5, 1]], [[1.5, 1]], [[1.5, 1]]],
    F: [[[0, 4]], [[0, 1]], [[0, 3]], [[0, 1]], [[0, 1]]],
    L: [[[0, 1]], [[0, 1]], [[0, 1]], [[0, 1]], [[0, 4]]],
    I: [[[0, 1]], [[0, 1]], [[0, 1]], [[0, 1]], [[0, 1]]],
  };
  const host = $(".seq__clips");
  const word = host.dataset.word.split("");
  const widths = word.map((ch) => (ch === "I" ? 1 : 4));
  const gap = 1.1;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
  let x0 = 0;
  word.forEach((ch, li) => {
    G[ch].forEach((segs, row) => segs.forEach(([s, l]) => {
      const el = document.createElement("span");
      el.className = "seq__clip" + (row >= 3 ? " is-audio" : "");
      el.style.left = `${((x0 + s) / total) * 100}%`;
      el.style.width = `${(l / total) * 100}%`;
      el.style.top = `${row * 20 + 1.5}%`;
      el.style.height = "17%";
      el.dataset.letter = li;
      host.appendChild(el);
    }));
    x0 += widths[li] + gap;
  });

  /* ── Video reels ── */
  $$("[data-reel]").forEach((h) => {
    const name = h.dataset.reel;
    for (let i = 1; i <= +h.dataset.count; i++) {
      const id = String(i).padStart(2, "0");
      const base = `assets/v/${name}-${id}`;
      h.insertAdjacentHTML("beforeend",
        `<button class="phone" data-src="${base}.mp4" aria-label="Play ${name === "ugc" ? "UGC ad" : "brand ad"} ${i}">
          <video muted loop playsinline preload="none" poster="${base}.jpg"></video>
          <span class="phone__tag">${name.toUpperCase()}_${id}.mp4</span></button>`);
    }
  });
  const vids = $$(".phone video");
  vids.forEach((v) => { v.src = v.closest(".phone").dataset.src; });
  const io = new IntersectionObserver((es) => es.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting && !reduce) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: "100px" });
  vids.forEach((v) => io.observe(v));

  /* ── Viewer ── */
  const viewer = $(".viewer"), vv = $(".viewer__video");
  let lastFocus = null;
  const openViewer = (src, audio) => {
    lastFocus = document.activeElement; vv.src = src; vv.muted = !audio; viewer.hidden = false;
    vv.play().catch(() => {}); $(".viewer__close").focus(); lenis && lenis.stop();
  };
  const closeViewer = () => {
    vv.pause(); vv.removeAttribute("src"); vv.load(); viewer.hidden = true;
    lenis && lenis.start(); lastFocus && lastFocus.focus();
  };
  document.addEventListener("click", (e) => { const p = e.target.closest(".phone"); if (p) openViewer(p.dataset.src, "audio" in p.dataset); });
  $(".viewer__close").addEventListener("click", closeViewer);
  viewer.addEventListener("click", (e) => { if (e.target === viewer) closeViewer(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !viewer.hidden) closeViewer(); });

  /* ── Copy email ── */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; } catch { b.textContent = "Press ⌘C"; }
    setTimeout(() => (b.textContent = "Copy"), 1800);
  }));

  /* ── Running REC timecode ── */
  const recTc = $("[data-tc]"); const t0 = performance.now();
  if (!reduce) (function tick() { recTc.textContent = tc((performance.now() - t0) / 1000); requestAnimationFrame(tick); })();

  /* ── Bottom scroll timeline ── */
  const nav = $(".nav");
  const sections = $$("[data-clip]");
  const clipsHost = $(".timeline__clips"), head = $(".timeline__head"), scrollTc = $("[data-scrolltc]");
  const clips = sections.map((s) => {
    const b = document.createElement("button");
    b.className = "timeline__clip"; b.type = "button"; b.tabIndex = -1; b.textContent = s.dataset.clip;
    b.addEventListener("click", () => (lenis ? lenis.scrollTo(s) : s.scrollIntoView({ behavior: "smooth" })));
    clipsHost.appendChild(b); return b;
  });
  const sizeClips = () => {
    const H = document.documentElement.scrollHeight;
    sections.forEach((s, i) => (clips[i].style.flex = `${s.offsetHeight / H} 1 0`));
  };
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    head.style.left = `${p * 100}%`;
    scrollTc.textContent = tc(p * 92);
    nav.classList.toggle("is-shown", scrollY > innerHeight * 0.7);
    const mid = scrollY + innerHeight * 0.45;
    sections.forEach((s, i) => { const top = s.getBoundingClientRect().top + scrollY; clips[i].classList.toggle("is-on", mid >= top && mid < top + s.offsetHeight); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { sizeClips(); onScroll(); });
  addEventListener("load", () => { sizeClips(); onScroll(); });
  sizeClips(); onScroll();

  /* ── Smooth scroll ── */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11 });
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href"));
      if (t) { e.preventDefault(); lenis.scrollTo(t); }
    }));
  }

  /* ── Cursor + index peek ── */
  const cursor = $(".cursor"), peek = $(".peek"), pv = $(".peek video");
  if (fine && !reduce) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, px = x, py = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
    (function loop() {
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; px += (x - px) * 0.1; py += (y - py) * 0.1;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      peek.style.transform = `translate(${px + 120}px, ${py}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => cursor.classList.toggle("is-play", !!e.target.closest(".phone")));
    $$("[data-peek]").forEach((a) => {
      a.addEventListener("pointerenter", () => {
        if (!pv.src.endsWith(a.dataset.peek)) pv.src = a.dataset.peek;
        pv.play().catch(() => {}); peek.classList.add("is-on");
      });
      a.addEventListener("pointerleave", () => { peek.classList.remove("is-on"); pv.pause(); });
    });
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  /* ── Split text ── */
  $$(".split").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map((w) => `<span class="w">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
  });
  $$("[data-words]").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="wd">${w}</span>`).join(" ");
  });

  if (!hasGsap || reduce) {
    document.body.classList.remove("is-loading");
    $$(".about__lead .wd").forEach((w) => (w.style.opacity = 1));
    $$("[data-countup]").forEach((n) => (n.textContent = n.dataset.countup));
    return;
  }

  /* ════════════ GSAP choreography ════════════ */
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const mm = gsap.matchMedia();

  /* 1. Leader countdown → the workspace opens → clips drop onto the timeline → playhead scrubs */
  const num = $(".leader__num"), sweep = $(".leader__sweep");
  const seqClips = $$(".seq__clip");
  const seqHead = $(".seq__head");
  lenis && lenis.stop();
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  [3, 2, 1].forEach((n, i) => {
    intro.call(() => (num.textContent = n), null, i * 0.4)
      .fromTo(sweep, { "--a": "0deg" }, { "--a": "360deg", duration: 0.4, ease: "none" }, i * 0.4);
  });
  intro
    .to(".leader", { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, 1.2)
    .call(() => document.body.classList.remove("is-loading"), null, 1.5)
    .from(".app", { scale: 0.92, y: 60, autoAlpha: 0, duration: 1.3 }, 1.4)
    .from(".bin__item", { autoAlpha: 0, y: 14, stagger: 0.04, duration: 0.6 }, 1.8)
    .from(".fx__list li", { autoAlpha: 0, x: 14, stagger: 0.06, duration: 0.6 }, 1.9)
    .from(".monitor__screen > img", { scale: 1.3, duration: 2 }, 1.5)
    .from(seqClips, {
      x: () => gsap.utils.random(200, 600), autoAlpha: 0, duration: 0.9, ease: "power4.out",
      stagger: { each: 0.018, from: "start" },
    }, 1.9)
    .fromTo(seqHead, { left: "14px" }, { left: "calc(100% - 16px)", duration: 2.2, ease: "power1.inOut" }, 2.1)
    .from(".monitor__track", { scale: 1.6, autoAlpha: 0, duration: 0.6, ease: "back.out(2)" }, 2.4)
    .from(".lower-third__name .line", { yPercent: 105, duration: 1 }, 2.6)
    .from(".lower-third__role .line", { yPercent: 105, duration: 0.8 }, 2.8)
    .from(".hero__cta > *", { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.1 }, 2.8)
    .call(() => lenis && lenis.start(), null, 2.2);

  // light up each letter's clips as the playhead passes it
  intro.add(() => {
    gsap.fromTo(seqClips, { filter: "brightness(1)" }, {
      filter: "brightness(1.6)", duration: 0.15, yoyo: true, repeat: 1,
      stagger: (i, el) => +el.dataset.letter * 0.22,
    });
  }, 2.2);

  // face-tracking box drifts like a live tracker
  gsap.to(".monitor__track", { x: 6, y: -4, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.to(".kf", { scale: 1.5, duration: 0.5, ease: "power2.inOut", yoyo: true, repeat: -1, stagger: 0.25 });
  gsap.to(".wheels i", { rotate: 360, duration: 14, ease: "none", repeat: -1, stagger: { each: -3 } });

  // scrolling away: the app tilts back like a screen being pushed away
  gsap.to(".app", {
    scale: 0.94, rotateX: 8, transformPerspective: 1400, transformOrigin: "50% 100%", ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(seqHead, {
    left: "14px", ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  /* 2. Headings: characters cut in */
  $$(".big.split, .contact__title, .index__title").forEach((t) => {
    gsap.set(t, { overflow: "hidden", paddingBottom: "0.04em" });
    gsap.from($$(".ch", t), {
      yPercent: 115, duration: 1, ease: "expo.out", stagger: 0.025,
      scrollTrigger: { trigger: t, start: "top 88%" },
    });
  });

  /* 3. Index rows slate in */
  gsap.from(".index__list li", {
    clipPath: "inset(0 100% 0 0)", duration: 1.1, ease: "expo.inOut", stagger: 0.07,
    scrollTrigger: { trigger: ".index__list", start: "top 85%" },
  });
  gsap.to(".spark--sm", { rotate: 360, duration: 10, ease: "none", repeat: -1 });

  /* 4. About */
  gsap.to(".about__lead .wd", {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: ".about__lead", start: "top 80%", end: "bottom 45%", scrub: true },
  });
  gsap.fromTo(".about__photo", { clipPath: "inset(14% 10% 14% 10% round 10px)" }, {
    clipPath: "inset(0% 0% 0% 0% round 10px)", ease: "none",
    scrollTrigger: { trigger: ".about", start: "top 90%", end: "top 30%", scrub: true },
  });
  gsap.fromTo(".about__photo img", { yPercent: -10 }, {
    yPercent: 0, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true },
  });
  $$("[data-countup]").forEach((n) => gsap.fromTo(n, { textContent: 0 }, {
    textContent: +n.dataset.countup, snap: { textContent: 1 }, duration: 1.4, ease: "power2.out",
    scrollTrigger: { trigger: n, start: "top 90%" },
  }));

  /* 5. UGC film strip runs through the gate */
  mm.add("(min-width: 901px)", () => {
    const track = $(".strip__track");
    const dist = () => track.scrollWidth - innerWidth;
    const st = { trigger: ".ugc", start: "top top", end: () => `+=${dist()}`, scrub: 0.6, invalidateOnRefresh: true };
    gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { ...st, pin: ".ugc__pin" } });
    gsap.to(".strip__holes", { backgroundPositionX: () => `-${dist()}px`, ease: "none", scrollTrigger: st });
    gsap.fromTo(".strip__track .phone", { rotate: -3 }, { rotate: 3, ease: "none", scrollTrigger: st });
  });
  gsap.from(".strip__track .phone", {
    yPercent: 30, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.05,
    scrollTrigger: { trigger: ".strip", start: "top 85%" },
  });

  /* 6. Claymation: the "O" swells into the clip */
  const clayO = $(".clay__o");
  gsap.fromTo(clayO, { scale: 0.6, rotate: -20 }, {
    scale: 1, rotate: 0, ease: "none",
    scrollTrigger: { trigger: ".clay", start: "top 80%", end: "center 55%", scrub: true },
  });
  mm.add("(min-width: 901px)", () => {
    gsap.fromTo(".clay__pixar", { rotate: 8, y: 80 }, {
      rotate: -3, y: 0, ease: "none",
      scrollTrigger: { trigger: ".clay__extra", start: "top bottom", end: "center 55%", scrub: true },
    });
  });
  gsap.to(".clay__marks svg", { rotate: 180, ease: "none", stagger: 0.1, scrollTrigger: { trigger: ".clay", start: "top bottom", end: "bottom top", scrub: true } });

  /* 7. Brand ads deal from a stack, sparkles spin */
  mm.add("(min-width: 901px)", () => {
    const cards = $$(".brand__fan .phone");
    gsap.from(cards, {
      x: (i) => (cards.length - 1 - i) * -70, y: (i) => i * 10, rotate: (i) => (i - 2) * 6, ease: "none",
      scrollTrigger: { trigger: ".brand", start: "top 85%", end: "center 60%", scrub: true },
    });
  });
  $$(".spark--a, .spark--b, .spark--c").forEach((s, i) => {
    gsap.to(s, { rotate: i % 2 ? -360 : 360, ease: "none", scrollTrigger: { trigger: s.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(s, { scale: 0, duration: 1, ease: "back.out(3)", scrollTrigger: { trigger: s.parentElement, start: "top 75%" } });
  });

  /* 8. Folders & tracks */
  gsap.from(".folder", {
    y: 80, rotate: (i) => (i % 2 ? 4 : -4), autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.08,
    scrollTrigger: { trigger: ".folders", start: "top 85%" },
  });
  gsap.from(".track", {
    clipPath: "inset(0 100% 0 0)", duration: 1.1, ease: "expo.inOut", stagger: 0.1,
    scrollTrigger: { trigger: ".tracks", start: "top 85%" },
  });

  /* 9. Marquee reacts to scroll speed and direction */
  const loopTw = gsap.to(".marquee__track", { xPercent: -50, duration: 24, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    onUpdate: (s) => {
      const v = Math.min(Math.abs(s.getVelocity()) / 300, 5), dir = s.direction < 0 ? -1 : 1;
      gsap.to(loopTw, { timeScale: (1 + v) * dir, duration: 0.2, overwrite: true });
      gsap.to(loopTw, { timeScale: dir, duration: 1.2, delay: 0.25 });
    },
  });

  ScrollTrigger.addEventListener("refresh", () => { sizeClips(); onScroll(); });
})();
