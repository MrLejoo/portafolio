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
    const nombre = $('.nombre'), portal = $('.portal'), o = $('.o');
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
    ST.addEventListener('refresh', () => { medir(); pintar(); });
    // La fuente definitiva cambia el tamaño de la letra: se vuelve a medir cada vez que eso ocurre.
    let primera = true;
    new ResizeObserver(() => { medir(); pintar(); if (primera) primera = false; else ST.refresh(); }).observe(o);

    // Entrada: letras que caen.
    G.from($$('.l', nombre), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: { each: .03, from: 'random' } });
    G.from('.hero-nota, .hero-rol', { autoAlpha: 0, duration: .8, delay: 1.5 });
    G.fromTo('.garabato path', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, delay: 1.7, ease: 'power2.inOut' });

    const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: ancho ? '+=340%' : '+=280%', pin: true, scrub: .5, anticipatePin: 1 } });
    tl.to('.hero-nota, .hero-rol', { autoAlpha: 0, duration: .08 }, 0);
    tl.fromTo('.ui', { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 1.12, duration: .1 }, 0);
    tl.to(zoom, { s: 70, duration: .5, ease: 'expo.in', onUpdate: pintar }, .04);
    tl.set(nombre, { autoAlpha: 0 }, .55);
    tl.set(portal, { clipPath: 'none' }, .56);
    tl.fromTo('.muro', { rotate: -7, scale: 1.3 }, { rotate: 0, scale: 1, duration: .55 }, .1);
    $$('.muro-col').forEach((c, i) => tl.to(c, { yPercent: i % 2 ? 14 : -14, duration: .9 }, .1));
    // El velo oscurece el muro para que el hueco de la O se lea como hueco; se aclara al entrar y vuelve para la frase.
    tl.fromTo('.portal-velo', { opacity: 1 }, { opacity: .2, duration: .26 }, .2);
    tl.to('.portal-velo', { opacity: 1, duration: .14 }, .62);
    tl.set('.portal-frase', { visibility: 'visible' }, .62);
    tl.fromTo('.portal-frase span, .portal-frase em', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .14, stagger: .06, ease: 'power3.out' }, .63);

    // Parallax leve de la trama según la profundidad.
    G.to('.hero .trama', { yPercent: -8, scrollTrigger: { trigger: hero, start: 'top top', end: '+=340%', scrub: true } });
  }

  /* Portada: el nombre como elemento en edición, en diseño y en código ------ */
  const ui = $('.ui');
  if (ui) {
    const sel = $('.sel', ui), medida = $('.sel-medida', ui), dedo = $('.puntero--diseno', ui), texto = $('[data-fila]', ui);
    const filas = $$('.fila');
    let actual = 1, encima = false;
    const marcar = i => {
      actual = i;
      const l = $$('.l', filas[i]), h = hero.getBoundingClientRect(), f = filas[i].getBoundingClientRect();
      const x = l[0].getBoundingClientRect().left - h.left - 8, w = l[l.length - 1].getBoundingClientRect().right - h.left + 8 - x;
      const y = f.top - h.top, alto = f.height;
      Object.assign(sel.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${alto}px` });
      dedo.style.left = `${Math.min(x + w - 4, innerWidth - 96)}px`;
      dedo.style.top = `${y + alto - 4}px`;
      medida.textContent = `${Math.round(w)} × ${Math.round(alto)}`;
      texto.textContent = l.map(c => c.textContent).join('');
      ui.classList.add('listo');
    };
    // Solo se recoloca con la portada en reposo: durante la entrada por la O el nombre está escalado.
    const enReposo = () => scrollY < 40;
    new ResizeObserver(() => { if (enReposo()) marcar(actual); }).observe($('.o'));
    if (fx) setInterval(() => { if (!encima && enReposo()) marcar((actual + 1) % filas.length); }, 3000);
    if (fine) {
      hero.addEventListener('pointermove', e => {
        encima = true;
        const i = filas.findIndex(f => e.clientY < f.getBoundingClientRect().bottom);
        if (i >= 0 && i !== actual && enReposo()) marcar(i);
      });
      hero.addEventListener('pointerleave', () => { encima = false; });
    }
    if (fx) G.to('.puntero--codigo', { x: 9, y: -7, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

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

  /* ¿Quieres ver más?: el abanico se abre con el scroll --------------------- */
  const abanico = $('.mas-abanico');
  if (abanico && fx) G.fromTo(abanico, { '--abre': .12 }, { '--abre': 1, ease: 'none', scrollTrigger: { trigger: '.mas', start: 'top 85%', end: 'top 15%', scrub: .5 } });

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

  /* Proyectos: filtros ------------------------------------------------------ */
  const chips = $$('.chip[data-filter]');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
    $$('.obras li').forEach(li => { li.hidden = f !== '*' && !li.dataset.tags.split('|').includes(f); });
    const shown = $$('.obras li:not([hidden])');
    // Si la franja de filtros ya estaba fija, se vuelve al inicio de la lista filtrada.
    const tope = $('.obras').getBoundingClientRect().top + scrollY - $('.filtros').offsetHeight - 16;
    if (scrollY > tope) lenis ? lenis.scrollTo(tope, { immediate: true }) : scrollTo(0, tope);
    if (fx) { G.fromTo(shown, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, stagger: .03, ease: 'expo.out', overwrite: true, clearProps: 'transform' }); ST.refresh(); }
    $('#index-live').textContent = `${shown.length} proyectos`;
  }));

  /* Mesa de trabajo: el componente, sus controles y su código ---------------- */
  const banco = $('.banco');
  if (banco) {
    const demo = $('.demo', banco), campo = n => $(`[name="${n}"]`, banco);
    const marcado = n => $(`[name="${n}"]:checked`, banco).value;
    const euros = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    const poner = (attr, k, v) => {
      const el = $(`[data-${attr}="${k}"]`, banco);
      if (el.textContent === v) return;
      el.textContent = v;
      if (attr !== 'c') return;
      el.classList.add('cambia');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('cambia')));
    };
    const luz = hex => {
      const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4));
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    };
    const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
    const pintar = () => {
      const ingresos = +campo('ingresos').value, gastos = +campo('gastos').value;
      const oscuro = marcado('tema') === 'oscuro', fondo = oscuro ? '#14171F' : '#FFFFFF', acento = marcado('acento');
      const radio = campo('radio').value, espacio = marcado('espacio');
      const set = (k, v) => demo.style.setProperty(k, v);
      set('--acento', acento); set('--fondo', fondo); set('--radio', `${radio}px`); set('--espacio', `${espacio}px`);
      set('--rojo', oscuro ? '#FF7A6B' : '#D3201B'); set('--ambar', oscuro ? '#F2B84B' : '#A06600');
      set('--texto-demo', oscuro ? '#F5F0E6' : '#111014'); set('--linea', oscuro ? 'rgba(245, 240, 230, .14)' : 'rgba(17, 16, 20, .1)');
      demo.classList.toggle('con-medidas', campo('medidas').checked);

      const filas = { necesidades: [gastos * .58, ingresos * .5], deseos: [gastos * .2, ingresos * .3], ahorro: [gastos * .22, ingresos * .2] };
      Object.entries(filas).forEach(([k, [gasto, limite]]) => {
        poner('v', k, euros(gasto));
        const b = $(`[data-b="${k}"]`, banco);
        b.style.width = `${Math.min(100, gasto / limite * 100)}%`;
        b.classList.toggle('excede', k !== 'ahorro' && gasto > limite);
      });
      const saldo = ingresos - gastos, excedido = filas.necesidades[0] > filas.necesidades[1];
      const estado = saldo < 0 ? 'mal' : excedido || filas.deseos[0] > filas.deseos[1] ? 'aviso' : 'ok';
      const chip = $('.demo-estado', banco);
      chip.dataset.estado = estado;
      chip.textContent = { ok: 'Vas bien', aviso: 'Al límite', mal: 'Te pasaste' }[estado];
      poner('v', 'saldo', euros(saldo));
      $('[data-v="saldo"]', banco).classList.toggle('es-negativo', saldo < 0);
      poner('v', 'r-ingresos', euros(ingresos)); poner('v', 'r-gastos', euros(gastos)); poner('v', 'r-radio', `${radio} px`);

      poner('c', 'acento', acento.toUpperCase()); poner('c', 'fondo', fondo); poner('c', 'radio', `${radio}px`); poner('c', 'espacio', `${espacio}px`);
      poner('c', 'limite', euros(filas.necesidades[1])); poner('c', 'estado', excedido ? "'excedido'" : "'ok'");
      const r = contraste(acento, fondo);
      $('[data-contraste]', banco).textContent = `Contraste del acento: ${r.toFixed(1).replace('.', ',')}:1 · ${r >= 4.5 ? 'AA' : 'no llega a AA'}`;
    };
    banco.addEventListener('input', pintar);
    pintar();
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
