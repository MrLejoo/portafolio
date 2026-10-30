// Interacciones y escenas del portafolio. GSAP, ScrollTrigger y Lenis llegan unidos a este archivo (ver build.mjs).
// Sin movimiento (prefers-reduced-motion) no se añade html.fx: la página queda apilada y estática.
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const pideQuietud = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Quien tiene las animaciones reducidas ve la versión estática, pero puede activarlas con un botón.
  const leerPreferencia = () => { try { return localStorage.getItem('animaciones'); } catch { return null; } };
  const guardarPreferencia = v => { try { v ? localStorage.setItem('animaciones', v) : localStorage.removeItem('animaciones'); } catch { /* sin almacenamiento: dura hasta recargar */ } };
  const forzado = pideQuietud && leerPreferencia() === 'si';
  const reduce = pideQuietud && !forzado;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ancho = matchMedia('(min-width: 900px)').matches;
  const root = document.documentElement;
  const G = window.gsap, ST = window.ScrollTrigger;
  const fx = !reduce && !!G && !!ST;
  let lenis = null;

  if (fx) {
    root.classList.add('fx');
    G.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
    if (fine && window.Lenis) {
      lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    }
  }

  /* Menú móvil y anclas ---------------------------------------------------- */
  const menuBtn = $('.menu-btn');
  menuBtn?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open);
    $('span', menuBtn).textContent = open ? 'Cerrar' : 'Menú';
  });
  $$('.nav a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    if (menuBtn) $('span', menuBtn).textContent = 'Menú';
  }));
  if (lenis) $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (t) { e.preventDefault(); lenis.scrollTo(t); }
  }));

  /* Titulares: palabras enmascaradas --------------------------------------- */
  const partir = el => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'linea';
          const s = document.createElement('span'); s.textContent = part;
          w.append(s); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  };

  // Frases que se encienden palabra a palabra con el scroll.
  const luz = el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="pal">${w}</span>`).join(' ');
  };

  if (fx) {
    $$('[data-lines]').forEach(el => {
      partir(el);
      G.from($$('.linea > span', el), { yPercent: 110, rotate: 4, duration: 1, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('.rv').forEach(el => G.from(el, { y: 34, autoAlpha: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 94%', once: true } }));
    $$('[data-luz]').forEach(el => {
      luz(el);
      G.to($$('.pal', el), { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 52%', scrub: .4 } });
    });
    $$('.figure, .copy-piece, .insight').forEach(el => G.from(el, { y: 70, rotate: 1.6, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
  }

  /* Portada: del póster al muro entrando por la O -------------------------- */
  const hero = $('.hero');
  if (hero && fx) {
    const nombre = $('.nombre'), portal = $('.portal'), o = $('.o'), pegados = $$('.pegado');
    // El hueco de la O: centro y radios en proporción al tamaño de la letra.
    const K = { cy: .52, rx: .2, ry: .29 };
    let cx, cy, rx, ry;
    const medir = () => {
      G.set(nombre, { scale: 1, clearProps: 'transformOrigin' });
      // Se mide sobre la fila, que no se mueve durante la entrada de las letras.
      const r = o.getBoundingClientRect(), f = o.parentElement.getBoundingClientRect(), h = hero.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(o).fontSize);
      cx = r.left + r.width / 2 - h.left; cy = f.top + f.height * K.cy - h.top;
      rx = fs * K.rx; ry = fs * K.ry;
      G.set(nombre, { transformOrigin: `${cx}px ${cy}px` });
    };
    const zoom = { s: 1 };
    const pintar = () => {
      G.set(nombre, { scale: Math.min(zoom.s, 30), force3D: false });
      portal.style.clipPath = `ellipse(${rx * zoom.s}px ${ry * zoom.s}px at ${cx}px ${cy}px)`;
    };
    medir(); pintar();
    ST.addEventListener('refreshInit', () => { medir(); pintar(); });
    document.fonts?.ready.then(() => { medir(); pintar(); ST.refresh(); });

    // Entrada: letras que caen y stickers que se pegan de golpe.
    G.from($$('.l', nombre), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: { each: .03, from: 'random' } });
    G.from(pegados, { scale: 2.1, autoAlpha: 0, rotate: () => G.utils.random(-40, 40), duration: .55, ease: 'back.out(2.4)', stagger: .07, delay: .55 });
    G.from('.hero-nota, .hero-rol', { autoAlpha: 0, duration: .8, delay: 1.5 });
    G.fromTo('.garabato path', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, delay: 1.7, ease: 'power2.inOut' });

    const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: ancho ? '+=340%' : '+=280%', pin: true, scrub: .5, anticipatePin: 1 } });
    tl.to('.hero-nota, .hero-rol', { autoAlpha: 0, duration: .08 }, 0);
    pegados.forEach(p => {
      const r = p.getBoundingClientRect(), dx = r.left + r.width / 2 - innerWidth / 2, dy = r.top + r.height / 2 - innerHeight / 2;
      tl.to(p, { x: dx * 1.5, y: dy * 1.5, rotate: G.utils.random(-70, 70), autoAlpha: 0, duration: .24, ease: 'power2.in' }, 0);
    });
    tl.to(zoom, { s: 70, duration: .5, ease: 'expo.in', onUpdate: pintar }, .04);
    tl.set(nombre, { autoAlpha: 0 }, .55);
    tl.set(portal, { clipPath: 'none' }, .56);
    tl.fromTo('.muro', { rotate: -7, scale: 1.3 }, { rotate: 0, scale: 1, duration: .55 }, .1);
    $$('.muro-col').forEach((c, i) => tl.to(c, { yPercent: i % 2 ? 14 : -14, duration: .9 }, .1));
    tl.to('.portal-velo', { opacity: 1, duration: .14 }, .62);
    tl.set('.portal-frase', { visibility: 'visible' }, .62);
    tl.fromTo('.portal-frase span, .portal-frase em', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .14, stagger: .06, ease: 'power3.out' }, .63);

    // Parallax leve de la trama según la profundidad.
    G.to('.hero .trama', { yPercent: -8, scrollTrigger: { trigger: hero, start: 'top top', end: '+=340%', scrub: true } });
  } else if (hero && !fx) {
    $$('.pegado').forEach(p => { p.style.position = 'absolute'; });
  }

  if (!fine) { const n = $('.hero-nota span'); if (n) n.textContent = 'desliza hacia abajo'; }

  /* Stickers que se despegan (portada) ------------------------------------- */
  const arrastre = (el, { limite, alSoltar } = {}) => {
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' && !el.classList.contains('sticker')) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
      el.style.zIndex = ++arrastre.z;
      el._x ??= 0; el._y ??= 0; el._r ??= 0;
      const ox = e.clientX - el._x, oy = e.clientY - el._y;
      let lx = e.clientX, vx = 0;
      const move = ev => {
        vx = ev.clientX - lx; lx = ev.clientX;
        let x = ev.clientX - ox, y = ev.clientY - oy;
        if (limite) [x, y] = limite(x, y);
        el._x = x; el._y = y;
        el.style.transform = `translate(${x}px, ${y}px) rotate(${el._r + vx * .9}deg)`;
      };
      const up = () => {
        el.classList.remove('is-drag');
        el._r += vx * .9;
        el.style.transform = `translate(${el._x}px, ${el._y}px) rotate(${el._r}deg)`;
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        alSoltar?.();
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  };
  arrastre.z = 5;
  // Un envoltorio interior evita pelearse con los transform de GSAP en el sticker de portada.
  if (fine) $$('.pegado').forEach(p => {
    const inner = document.createElement('div');
    inner.className = 'pegado-in';
    inner.append(...p.childNodes);
    p.append(inner);
    arrastre(inner);
  });

  /* Carteles: scroll horizontal en escritorio, pila en móvil --------------- */
  const carril = $('.carril');
  if (carril && fx) {
    const seccion = $('.trabajo');
    if (ancho) {
      const dist = () => carril.scrollWidth - innerWidth;
      const mov = G.to(carril, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: seccion, pin: true, scrub: .6, start: 'top top', end: () => `+=${dist() * .78}`, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.cartel').forEach(c => {
        $$('.capa', c).forEach(k => G.fromTo(k, { x: () => 110 * k.dataset.v }, { x: () => -110 * k.dataset.v, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: mov, start: 'left right', end: 'right left', scrub: true } }));
        G.fromTo($('h3', c), { xPercent: 5 }, { xPercent: -3, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: mov, start: 'left right', end: 'right left', scrub: true } });
      });
    } else {
      $$('.cartel').forEach(c => $$('.capa', c).forEach(k => G.from(k, { y: 70 * k.dataset.v, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 70%', once: true } })));
    }
  }

  /* Foto a sangre: ventana que se abre ------------------------------------- */
  const mirada = $('.mirada');
  if (mirada && fx) {
    const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: mirada, start: 'top top', end: '+=130%', pin: true, scrub: .5 } });
    tl.fromTo('.mirada-foto', { clipPath: 'inset(32% 34% 32% 34% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
      .fromTo('.mirada-foto img', { scale: 1.5 }, { scale: 1, duration: 1 }, 0)
      .fromTo('.mirada-texto', { color: '#111014', scale: .86 }, { color: '#ffffff', scale: 1, duration: .55 }, .1);
  }

  /* Hablemos: letras que saltan -------------------------------------------- */
  const hablemos = $('.hablemos');
  if (hablemos && fx) {
    G.from($$('.l', hablemos), { yPercent: 110, rotate: () => G.utils.random(-14, 14), duration: 1, ease: 'back.out(1.7)', stagger: .045, scrollTrigger: { trigger: hablemos, start: 'top 92%', once: true } });
    if (fine) $$('.l', hablemos).forEach(l => l.addEventListener('pointerenter', () => G.fromTo(l, { y: 0 }, { y: -26, rotate: G.utils.random(-10, 10), duration: .2, yoyo: true, repeat: 1, ease: 'power2.out', onComplete: () => G.set(l, { rotate: 0 }) })));
  }
  if (fx) $$('.sello').forEach((s, i) => G.from(s, { scale: 0, rotate: -50, duration: .8, delay: i * .1, ease: 'back.out(2)', scrollTrigger: { trigger: s, start: 'top 92%', once: true } }));

  /* Portada del caso: se endereza con el scroll ---------------------------- */
  const cp = $('.c-portada');
  if (cp && fx) {
    G.from(cp, { y: 80, rotate: 2.5, autoAlpha: 0, duration: 1.2, ease: 'expo.out' });
    G.to($('img', cp) || cp, { scale: 1.07, ease: 'none', scrollTrigger: { trigger: cp, start: 'top 40%', end: 'bottom top', scrub: true } });
  }

  /* Contadores ------------------------------------------------------------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const raw = el.textContent;
      const m = raw.match(/^([^\d]*)([\d.,]+)(.*)$/);
      if (!m || reduce || /→|\//.test(raw)) return;
      const target = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
      const decimals = (m[2].split(',')[1] || '').length;
      const t0 = performance.now(), dur = 1300;
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - k, 4));
        el.textContent = m[1] + v.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + m[3];
        if (k < 1) requestAnimationFrame(tick); else el.textContent = raw;
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* Archivo: filtros y vista previa flotante ------------------------------- */
  const chips = $$('.chip[data-filter]');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
    $$('.indice li').forEach(li => { li.hidden = f !== '*' && !li.dataset.tags.split('|').includes(f); });
    const shown = $$('.indice li:not([hidden])');
    if (fx) { G.fromTo(shown, { x: -24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .5, stagger: .03, ease: 'expo.out', overwrite: true }); ST.refresh(); }
    const live = $('#index-live');
    if (live) live.textContent = `${shown.length} proyectos`;
  }));
  const preview = $('.preview');
  if (preview && fine) {
    const img = $('img', preview);
    let x = 0, y = 0, tx = 0, ty = 0, raf;
    const loop = () => {
      x += (tx - x) * .14; y += (ty - y) * .14;
      preview.style.transform = `translate(${x + 26}px, ${y - 120}px) rotate(${(tx - x) * .035}deg)`;
      raf = requestAnimationFrame(loop);
    };
    $$('.indice a').forEach(a => {
      a.addEventListener('pointerenter', () => {
        if (!a.dataset.img) return;
        img.src = a.dataset.img;
        preview.classList.add('is-on');
        if (!raf) loop();
      });
      a.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
      a.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    });
  }

  /* Mesa de juego ---------------------------------------------------------- */
  const lab = $('.lab');
  if (lab) {
    const items = $$('.sticker', lab);
    const place = () => {
      const W = lab.clientWidth, H = lab.clientHeight;
      // Retícula barajada con desorden: reparte los stickers por toda la mesa sin amontonarlos.
      const vis = items.filter(s => s.offsetWidth);
      const cols = Math.ceil(Math.sqrt(vis.length * W / H)), rows = Math.ceil(vis.length / cols);
      const celdas = Array.from({ length: cols * rows }, (_, i) => i).sort(() => Math.random() - .5);
      vis.forEach((s, k) => {
        const sz = s.offsetWidth, cw = W / cols, ch = H / rows;
        s._x = Math.max(0, Math.min(W - sz, (celdas[k] % cols + .5) * cw - sz / 2 + (Math.random() - .5) * cw * .5));
        s._y = Math.max(0, Math.min(H - sz, (Math.floor(celdas[k] / cols) + .5) * ch - sz / 2 + (Math.random() - .5) * ch * .5));
        s._r = Math.random() * 40 - 20;
        if (fx) G.to(s, { x: s._x, y: s._y, rotate: s._r, duration: .9, ease: 'expo.out', delay: k * .012, overwrite: true, onComplete: () => { G.set(s, { clearProps: 'transform' }); s.style.transform = `translate(${s._x}px, ${s._y}px) rotate(${s._r}deg)`; } });
        else s.style.transform = `translate(${s._x}px, ${s._y}px) rotate(${s._r}deg)`;
      });
    };
    place();
    $('[data-revolver]')?.addEventListener('click', place);
    items.forEach(s => arrastre(s, { limite: (x, y) => [Math.max(-30, Math.min(lab.clientWidth - s.offsetWidth + 30, x)), Math.max(-30, Math.min(lab.clientHeight - s.offsetHeight + 30, y))] }));
    let rt, w0 = innerWidth;
    addEventListener('resize', () => { if (innerWidth === w0) return; w0 = innerWidth; clearTimeout(rt); rt = setTimeout(place, 200); });
  }

  /* Barra de lectura ------------------------------------------------------- */
  const bar = $('.progress');
  if (bar) {
    const set = () => {
      const h = root.scrollHeight - innerHeight;
      bar.style.setProperty('--p', h > 0 ? (scrollY / h).toFixed(4) : 0);
    };
    addEventListener('scroll', () => requestAnimationFrame(set), { passive: true });
    set();
  }
  $('.c-historia')?.addEventListener('toggle', () => { if (fx) ST.refresh(); });

  /* Capturas largas: duración del recorrido según su altura ---------------- */
  $$('.scrollshot').forEach(box => {
    const img = $('img', box);
    const set = () => {
      const travel = img.offsetHeight - box.clientHeight;
      box.style.setProperty('--dur', `${Math.max(2, travel / 260)}s`);
      box.style.setProperty('--h', `${box.clientHeight}px`);
    };
    img.complete ? set() : img.addEventListener('load', set);
    addEventListener('resize', set);
  });

  /* Videos con portada ----------------------------------------------------- */
  $$('[data-video]').forEach(box => {
    const v = $('video', box);
    $('.video-play', box)?.addEventListener('click', () => {
      v.controls = true;
      v.play();
      box.classList.add('is-playing');
    });
  });

  /* Lightbox para imágenes ampliables -------------------------------------- */
  const lb = $('.lightbox');
  if (lb) {
    const lbImg = $('img', lb);
    let opener;
    const close = () => { lb.classList.remove('is-open'); document.body.style.overflow = ''; lenis?.start(); opener?.focus(); };
    $$('[data-zoom]').forEach(el => el.addEventListener('click', () => {
      opener = el;
      lbImg.src = el.dataset.zoom;
      lbImg.alt = el.dataset.alt || '';
      lbImg.className = el.dataset.fit !== undefined ? 'fit' : '';
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      lenis?.stop();
      $('.lightbox-close', lb).focus();
    }));
    lb.addEventListener('click', e => { if (e.target !== lbImg || lbImg.className === 'fit') close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('is-open')) close(); });
  }

  /* Copiar el correo -------------------------------------------------------- */
  $$('.copy-mail').forEach(btn => btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.mail); } catch { location.href = 'mailto:' + btn.dataset.mail; return; }
    btn.classList.add('is-copied');
    setTimeout(() => btn.classList.remove('is-copied'), 1800);
  }));

  /* Cursor con etiqueta ----------------------------------------------------- */
  const cursor = $('.cursor');
  if (cursor && fine && fx) {
    root.classList.add('cursor-activo');
    const qx = G.quickTo(cursor, 'x', { duration: .25, ease: 'power3' }), qy = G.quickTo(cursor, 'y', { duration: .25, ease: 'power3' });
    addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); });
    const txt = $('span', cursor);
    document.addEventListener('pointerover', e => {
      const t = e.target.closest?.('[data-cursor]');
      cursor.classList.toggle('is-on', !!t);
      if (t) txt.textContent = t.dataset.cursor;
    });
  }

  /* Botón para activar o quitar las animaciones ---------------------------- */
  const animBtn = $('.anim-btn');
  if (animBtn && pideQuietud) {
    animBtn.hidden = false;
    if (forzado) {
      animBtn.textContent = 'Quitar animaciones';
      animBtn.classList.add('anim-btn--pie');
      $('.footer')?.append(animBtn);
    }
    animBtn.addEventListener('click', () => { guardarPreferencia(forzado ? null : 'si'); location.reload(); });
  }

  /* Año del pie */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
