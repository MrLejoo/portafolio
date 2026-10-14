// Interacciones del portafolio: sin dependencias, respetando prefers-reduced-motion.
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Cabecera: fondo al hacer scroll y se esconde al bajar ------------------ */
  const header = $('.header');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header?.classList.toggle('is-scrolled', y > 20);
    header?.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menú móvil */
  const menuBtn = $('.menu-btn');
  menuBtn?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('.nav a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }));

  /* Texto dividido en palabras para la entrada ----------------------------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const s = document.createElement('span');
            s.style.setProperty('--i', i++);
            s.textContent = part;
            w.append(s);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('cursor')) walk(n);
      });
    };
    walk(el);
    el.classList.add('split');
  });

  /* Aparición al entrar en pantalla ---------------------------------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  $$('.reveal, .split, .p-cover, .rm-step, .log-item, .insight, [data-count]').forEach(el => io.observe(el));

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
      const t0 = performance.now(), dur = 1400;
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - k, 4));
        el.textContent = m[1] + v.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + m[3];
        if (k < 1) requestAnimationFrame(tick); else el.textContent = raw;
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* Efecto "decodificar" en textos marcados -------------------------------- */
  const glyphs = '!<>-_\\/[]{}=+*^?#01';
  const scramble = el => {
    const text = el.dataset.text || el.textContent;
    el.dataset.text = text;
    if (reduce) return;
    let frame = 0;
    const queue = [...text].map((c, i) => ({ c, start: Math.floor(Math.random() * 12) + i * .6, end: Math.floor(Math.random() * 12) + 14 + i * .6 }));
    const run = () => {
      let out = '', done = 0;
      queue.forEach(q => {
        if (frame >= q.end) { out += q.c; done++; }
        else if (frame >= q.start && q.c !== ' ') out += glyphs[Math.floor(Math.random() * glyphs.length)];
        else out += q.c === ' ' ? ' ' : '';
      });
      el.textContent = out;
      frame++;
      if (done < queue.length) requestAnimationFrame(run);
    };
    run();
  };
  $$('[data-scramble]').forEach(el => {
    const sio = new IntersectionObserver(([e]) => { if (e.isIntersecting) { scramble(el); sio.disconnect(); } });
    sio.observe(el);
    if (fine) el.addEventListener('mouseenter', () => scramble(el));
  });

  /* Terminal que se escribe sola ------------------------------------------- */
  const term = $('[data-type]');
  if (term) {
    const html = term.innerHTML;
    if (!reduce) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const tokens = [];
      const collect = (node, wrap) => node.childNodes.forEach(n => {
        if (n.nodeType === 3) [...n.textContent].forEach(ch => tokens.push({ ch, wrap }));
        else collect(n, n.className);
      });
      collect(tmp, null);
      // Reserva el alto final antes de vaciarla: así escribir no empuja el contenido de abajo (CLS).
      term.style.minHeight = `${term.offsetHeight}px`;
      term.innerHTML = '';
      let i = 0, cur = null, curCls;
      const caret = document.createElement('span');
      caret.className = 'cursor';
      term.append(caret);
      const step = () => {
        const n = Math.min(tokens.length, i + (tokens[i]?.ch === '\n' ? 1 : 3));
        for (; i < n; i++) {
          const t = tokens[i];
          if (!cur || curCls !== t.wrap) {
            cur = t.wrap ? Object.assign(document.createElement('span'), { className: t.wrap }) : document.createTextNode('');
            curCls = t.wrap;
            term.insertBefore(cur, caret);
          }
          cur.textContent += t.ch;
        }
        if (i < tokens.length) setTimeout(step, tokens[i - 1]?.ch === '\n' ? 140 : 16);
      };
      setTimeout(step, 700);
    }
  }

  /* Luz que sigue al cursor en las tarjetas -------------------------------- */
  if (fine) $$('.card').forEach(card => card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* Índice: filtros y vista previa flotante -------------------------------- */
  const chips = $$('.chip[data-filter]');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
    $$('.index li').forEach(li => { li.hidden = f !== '*' && !li.dataset.tags.split('|').includes(f); });
    const shown = $$('.index li:not([hidden])');
    shown.forEach((li, k) => { li.style.animation = 'none'; li.offsetHeight; li.style.animation = reduce ? '' : `fade .5s ${k * 40}ms both`; });
    const live = $('#index-live');
    if (live) live.textContent = `${shown.length} proyectos`;
  }));
  const preview = $('.preview');
  if (preview && fine) {
    const img = $('img', preview);
    let x = 0, y = 0, tx = 0, ty = 0, raf;
    const loop = () => {
      x += (tx - x) * .16; y += (ty - y) * .16;
      preview.style.transform = `translate(${x + 24}px, ${y - 110}px) rotate(${(tx - x) * .03}deg)`;
      raf = requestAnimationFrame(loop);
    };
    $$('.index a').forEach(a => {
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

  /* Laboratorio: stickers que se arrastran --------------------------------- */
  const lab = $('.lab');
  if (lab) {
    const items = $$('.sticker', lab);
    const place = () => {
      const W = lab.clientWidth, H = lab.clientHeight;
      items.forEach((s, k) => {
        const sz = s.offsetWidth || 110;
        const a = (k / items.length) * Math.PI * 2 + Math.random() * .4;
        const rx = (W / 2 - sz * .7) * (.45 + Math.random() * .55), ry = (H / 2 - sz * .7) * (.45 + Math.random() * .55);
        s._x = W / 2 + Math.cos(a) * rx - sz / 2;
        s._y = H / 2 + Math.sin(a) * ry - sz / 2;
        s._r = Math.random() * 30 - 15;
        s.style.transform = `translate(${s._x}px, ${s._y}px) rotate(${s._r}deg)`;
      });
    };
    place();
    let z = 1;
    items.forEach(s => {
      s.addEventListener('pointerdown', e => {
        e.preventDefault();
        s.setPointerCapture(e.pointerId);
        s.classList.add('is-drag');
        s.style.zIndex = ++z;
        const ox = e.clientX - s._x, oy = e.clientY - s._y;
        let lx = e.clientX, vx = 0;
        const move = ev => {
          vx = ev.clientX - lx; lx = ev.clientX;
          s._x = Math.max(-30, Math.min(lab.clientWidth - s.offsetWidth + 30, ev.clientX - ox));
          s._y = Math.max(-30, Math.min(lab.clientHeight - s.offsetHeight + 30, ev.clientY - oy));
          s.style.transform = `translate(${s._x}px, ${s._y}px) rotate(${s._r + vx * .8}deg)`;
        };
        const up = () => {
          s.classList.remove('is-drag');
          s._r += vx * .8;
          s.style.transform = `translate(${s._x}px, ${s._y}px) rotate(${s._r}deg)`;
          s.removeEventListener('pointermove', move);
          s.removeEventListener('pointerup', up);
          s.removeEventListener('pointercancel', up);
        };
        s.addEventListener('pointermove', move);
        s.addEventListener('pointerup', up);
        s.addEventListener('pointercancel', up);
      });
    });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(place, 200); });
  }

  /* Líneas de progreso (proceso y roadmap) y barra de lectura -------------- */
  const fills = $$('[data-progress]');
  const bar = $('.progress');
  const tocLinks = $$('.toc a');
  const chapters = tocLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const onFrame = () => {
    const vh = innerHeight;
    fills.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * .62 - r.top) / r.height));
      el.parentElement.style.setProperty('--p', p.toFixed(3));
    });
    if (bar) {
      const h = document.documentElement.scrollHeight - vh;
      bar.style.setProperty('--p', h > 0 ? (scrollY / h).toFixed(4) : 0);
    }
    if (chapters.length) {
      let active = 0;
      chapters.forEach((c, k) => { if (c.getBoundingClientRect().top < vh * .4) active = k; });
      tocLinks.forEach((a, k) => a.classList.toggle('is-active', k === active));
    }
  };
  addEventListener('scroll', () => requestAnimationFrame(onFrame), { passive: true });
  onFrame();

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
    const close = () => { lb.classList.remove('is-open'); document.body.style.overflow = ''; opener?.focus(); };
    $$('[data-zoom]').forEach(el => el.addEventListener('click', () => {
      opener = el;
      lbImg.src = el.dataset.zoom;
      lbImg.alt = el.dataset.alt || '';
      lbImg.className = el.dataset.fit !== undefined ? 'fit' : '';
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
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

  /* Año del pie */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
