// Genera el sitio estático en dist/ a partir de src/.
// Uso: node scripts/build.mjs   (Cloudflare Pages ejecuta este mismo comando en cada push)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { perfil, disciplinas, proyectos } from '../src/data/proyectos.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist');
const SITE = (process.env.SITE_URL || 'https://alejandrohurtadomartin.pages.dev').replace(/\/$/, '');
const VERSION = Date.now().toString(36);

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = n => String(n).padStart(2, '0');
const bySlug = Object.fromEntries(proyectos.map(p => [p.slug, p]));
const missing = new Set();
const asset = src => { if (src && !existsSync(join(SRC, src))) missing.add(src); return src; };

/* Iconos ---------------------------------------------------------------- */
const ico = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  logo: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x=".5" y=".5" width="31" height="31" rx="9" fill="#1B263B" stroke="#415A77"/><path d="M13 7h6M14 7v6.2l-5.3 9.2A2.4 2.4 0 0 0 10.8 26h10.4a2.4 2.4 0 0 0 2.1-3.6L18 13.2V7" stroke="#E0E1DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.4 20h9.2" stroke="#778DA9" stroke-width="1.6" stroke-linecap="round"/><circle cx="15" cy="22.6" r="1" fill="#fff"/><circle cx="18" cy="23.3" r=".7" fill="#A7B7CC"/></svg>',
};

/* Plantilla común ------------------------------------------------------- */
function layout({ title, description, path, image, body, bodyClass = '' }) {
  const url = SITE + path;
  const og = SITE + (image || '/assets/img/og.jpg');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0D1B2A">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_VE">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap">
<link rel="stylesheet" href="/css/estilos.css?v=${VERSION}">
</head>
<body class="${bodyClass}">
<a class="skip" href="#contenido">Saltar al contenido</a>
<div class="bg-grid" aria-hidden="true"></div><div class="bg-glow" aria-hidden="true"></div><div class="bg-noise" aria-hidden="true"></div>
${header(path)}
<main id="contenido">
${body}
</main>
${footer()}
<script src="/js/main.js?v=${VERSION}" defer></script>
</body>
</html>`;
}

function header(path) {
  const home = path === '/';
  const l = h => (home ? h : '/' + h);
  return `<header class="header">
  <div class="wrap">
    <a class="logo" href="/" aria-label="Inicio · El Alquimista Digital">${ico.logo}<span>alquimista<em>.digital</em></span></a>
    <span class="status"><i></i>Disponible para proyectos</span>
    <button class="menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav"><span></span></button>
    <nav class="nav" id="nav" aria-label="Principal">
      <a href="${l('#proyectos')}">Proyectos</a>
      <a href="${l('#proceso')}">Proceso</a>
      <a href="${l('#sobre-mi')}">Sobre mí</a>
      <a class="btn" href="${l('#contacto')}">Hablemos ${ico.arrow}</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="footer">
  <div class="wrap">
    <span>© <span data-year>2026</span> ${esc(perfil.nombre)} · ${esc(perfil.marca)}</span>
    <nav aria-label="Contacto">
      <a href="mailto:${perfil.email}">Correo</a>
      <a href="https://wa.me/${perfil.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
      <a href="${perfil.figma}" target="_blank" rel="noopener">Figma</a>
    </nav>
    <span>Hecho a mano en ${esc(perfil.ciudad)}</span>
  </div>
</footer>`;
}

/* Piezas ---------------------------------------------------------------- */
const coverOf = p => p.portada ? asset(p.portada) : null;

function typeCover(p) {
  const m = p.metricas?.[0];
  return `<div class="cover-type"><small>${esc(p.disciplinas.join(' · '))}</small><b>${esc(m ? m.v : p.titulo)}</b><small>${esc(m ? m.l : p.subtitulo)}</small></div>`;
}

function card(p, size, i) {
  const c = coverOf(p);
  return `<a class="card card--${size} reveal" style="--d:${(i % 3) * 0.08}s" href="/proyectos/${p.slug}/">
    <div class="card-media">${c ? `<img src="${c}" alt="" loading="lazy" decoding="async">` : typeCover(p)}</div>
    <span class="card-arrow">${ico.arrow}</span>
    <div class="card-body">
      <div class="card-top"><span>${esc(p.disciplinas.slice(0, 2).join(' · '))}</span><span>${esc(p.anio)}</span></div>
      <h3>${esc(p.titulo)}</h3>
      <p>${esc(p.resumen)}</p>
    </div>
  </a>`;
}

function stickersList(limit) {
  const dir = join(SRC, 'assets/img/stickers');
  const all = readdirSync(dir).flatMap(col => readdirSync(join(dir, col)).filter(f => !f.startsWith('japanese')).map(f => `/assets/img/stickers/${col}/${f}`));
  const step = Math.max(1, Math.floor(all.length / limit));
  return all.filter((_, i) => i % step === 0).slice(0, limit);
}

/* Portada --------------------------------------------------------------- */
function home() {
  const destacados = proyectos.filter(p => p.destacado);
  const sizes = ['xl', 'l', 'l', 'xl', 'm', 'm', 'm'];
  const counts = Object.fromEntries(disciplinas.map(d => [d, proyectos.filter(p => p.disciplinas.includes(d)).length]));
  const marquee = ['Investigación UX', 'Diseño de interfaces', 'Prototipado en Figma', 'Desarrollo web', 'Supabase', 'Cloudflare', 'Copywriting', 'Ilustración', 'Motion', 'SEO técnico', 'Fotografía', 'Estrategia de marketing'];
  const stickers = stickersList(22);

  const body = `
<section class="hero">
  <div class="wrap">
    <div>
      <span class="kicker reveal">Portafolio · ${esc(perfil.ciudad)}</span>
      <h1 data-split>Diseño, escribo y construyo productos <span class="soft">que la gente entiende</span><span class="cursor"></span></h1>
      <p class="hero-lead reveal" style="--d:.35s">Soy <strong>${esc(perfil.nombre)}</strong>: diseñador UX/UI, desarrollador web y copywriter. Del primer minuto de investigación al código en producción, con una idea fija: que cada pantalla tenga una razón de existir.</p>
      <div class="hero-cta reveal" style="--d:.5s">
        <a class="btn" href="#proyectos">Ver proyectos ${ico.arrow}</a>
        <a class="btn btn--ghost" href="#contacto">Escríbeme</a>
      </div>
      <div class="hero-stats reveal" style="--d:.65s">
        <div><b data-count>${proyectos.length}</b><span>proyectos</span></div>
        <div><b data-count>${disciplinas.length}</b><span>disciplinas</span></div>
        <div><b data-count>200+</b><span>ilustraciones</span></div>
        <div><b>1</b><span>tienda en producción</span></div>
      </div>
    </div>
    <div class="terminal reveal" style="--d:.25s" aria-label="Perfil en formato de código">
      <div class="terminal-bar"><i></i><i></i><i></i><span>~/alquimista — perfil.json</span></div>
<pre data-type><span class="t-prompt">$</span> cat perfil.json
{
  <span class="t-key">"nombre"</span>: <span class="t-str">"${esc(perfil.nombre)}"</span>,
  <span class="t-key">"alias"</span>: <span class="t-str">"${esc(perfil.marca)}"</span>,
  <span class="t-key">"hago"</span>: [
    <span class="t-str">"investigación UX"</span>,
    <span class="t-str">"interfaces en Figma"</span>,
    <span class="t-str">"webs que se publican solas"</span>,
    <span class="t-str">"textos que venden"</span>
  ],
  <span class="t-key">"stack"</span>: [<span class="t-str">"Figma"</span>, <span class="t-str">"JS"</span>, <span class="t-str">"Supabase"</span>, <span class="t-str">"Cloudflare"</span>],
  <span class="t-key">"idiomas"</span>: [<span class="t-str">"español"</span>, <span class="t-str">"inglés"</span>],
  <span class="t-key">"disponible"</span>: <span class="t-str">true</span>
}
<span class="t-com">// convierto ideas sueltas en productos que funcionan</span></pre>
    </div>
  </div>
</section>

<div class="marquee" aria-hidden="true"><div class="marquee-track">${[...marquee, ...marquee].map(m => `<span>${m}</span>`).join('')}</div></div>

<section class="section" id="proyectos">
  <div class="wrap">
    <div class="section-head">
      <span class="kicker">01 — Trabajo seleccionado</span>
      <h2 data-split>Proyectos que cuentan cómo pienso</h2>
      <p class="reveal">Cada caso explica la intención, el reto y el camino completo, paso a paso, desde la primera pregunta hasta el resultado.</p>
    </div>
    <div class="bento">${destacados.map((p, i) => card(p, sizes[i] || 'm', i)).join('')}</div>
  </div>
</section>

<section class="section" id="indice" style="padding-top:0">
  <div class="wrap">
    <div class="section-head section-head--row">
      <div style="display:grid;gap:18px"><span class="kicker">02 — Índice completo</span><h2 data-split>Todo el archivo</h2></div>
      <div class="filters" role="group" aria-label="Filtrar por disciplina">
        <button class="chip" data-filter="*" aria-pressed="true">Todo<sup>${proyectos.length}</sup></button>
        ${disciplinas.map(d => `<button class="chip" data-filter="${esc(d)}" aria-pressed="false">${esc(d)}<sup>${counts[d]}</sup></button>`).join('')}
      </div>
    </div>
    <p class="sr" id="index-live" aria-live="polite"></p>
    <ul class="index">
      ${proyectos.map((p, i) => `<li data-tags="${esc(p.disciplinas.join('|'))}"><a href="/proyectos/${p.slug}/" data-img="${coverOf(p) || ''}">
        <span class="n">${pad(i + 1)}</span><span class="t">${esc(p.titulo)}</span><span class="d">${esc(p.disciplinas.join(' · '))}</span><span class="y">${esc(p.anio)}</span>${ico.arrow}
      </a></li>`).join('')}
    </ul>
  </div>
  <div class="preview" aria-hidden="true"><img alt=""></div>
</section>

<section class="section" id="laboratorio" style="padding-top:0">
  <div class="wrap">
    <div class="section-head">
      <span class="kicker">03 — Laboratorio</span>
      <h2 data-split>Un poco de juego</h2>
      <p class="reveal">Algunas de las más de 200 ilustraciones que dibujé para StickerCom. Arrástralas, ordénalas o haz un desastre.</p>
    </div>
    <div class="lab reveal">
      <div class="lab-hint"><b>arrástrame</b><span>Ilustraciones de StickerCom</span></div>
      ${stickers.map(s => `<div class="sticker"><img src="${asset(s)}" alt="" loading="lazy" draggable="false"></div>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="proceso">
  <div class="wrap">
    <div class="section-head">
      <span class="kicker">04 — Proceso</span>
      <h2 data-split>Cómo trabajo, en commits</h2>
      <p class="reveal">No hay dos proyectos iguales, pero casi todos pasan por estas etapas. A veces en seis meses, a veces en una noche.</p>
    </div>
    <div class="log">
      <span class="log-fill" data-progress></span>
      ${[
        ['a1f3e9c', 'descubrir', 'Escuchar antes de dibujar', 'Entrevistas, encuestas, analítica y conversaciones reales con el negocio. Busco el problema verdadero, no el que aparece en el brief.'],
        ['b72d014', 'definir', 'Poner el problema en una frase', 'Affinity mapping, arquetipos y métricas de éxito. Si no se puede medir, todavía no está definido.'],
        ['c09e5aa', 'diseñar', 'Probar ideas baratas', 'Wireframes, sistema de diseño y prototipos en Figma. Iterar en diseño cuesta horas; en código, semanas.'],
        ['d4b8c71', 'escribir', 'Las palabras también son interfaz', 'Microcopy, mensajes de error, titulares y llamadas a la acción. El texto decide si un botón se pulsa.'],
        ['e61f2d3', 'construir', 'Del prototipo a producción', 'HTML, CSS y JavaScript ligeros, bases de datos con reglas de seguridad y publicación automática en cada cambio.'],
        ['f3a7b90', 'medir', 'Aprender y volver a empezar', 'Analítica, mapas de calor y lo que dicen los clientes. Cada versión es la hipótesis de la siguiente.'],
      ].map(([h, f, t, d]) => `<div class="log-item"><span class="log-dot"></span><div class="reveal"><div class="log-meta"><span class="hash">${h}</span><span>feat(${f})</span></div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="sobre-mi">
  <div class="wrap about">
    <div>
      <span class="kicker">05 — Sobre mí</span>
      <div class="about-text" style="margin-top:22px">
        <p class="reveal">Me llaman El Alquimista Digital porque me gusta mezclar disciplinas que casi siempre viven separadas.</p>
        <p class="reveal">Vengo del marketing: lideré el departamento de marketing de Beacon 212, donde aprendí que una buena idea sin números no convence a nadie. Me formé como diseñador UX/UI y en la universidad llevé Wander, una app de viajes, desde la investigación hasta el prototipo final.</p>
        <p class="reveal">Hoy diseño y construyo productos completos. StickerCom empezó como ilustraciones en una mesa y terminó siendo una tienda online con pagos, base de datos y publicación automática. Trabajo con la IA como copiloto para llegar más lejos y más rápido, sin delegarle las decisiones.</p>
      </div>
    </div>
    <div class="skills">
      ${[
        ['UX/UI', 'Figma · Maze · Hotjar', 'Investigación, arquitectura de información, prototipos de alta fidelidad y sistemas de diseño.'],
        ['Desarrollo web', 'JS · Supabase · Cloudflare', 'Sitios rápidos y accesibles, tiendas con pagos, paneles de administración y SEO técnico.'],
        ['Copywriting', 'ES · EN', 'Landings, anuncios de respuesta directa, correos en frío, guiones y microcopy de producto.'],
        ['Diseño gráfico', 'Illustrator · Photoshop', 'Ilustración, piezas para redes, gran formato y archivos listos para imprenta.'],
        ['Motion y foto', 'Video · Cámara', 'Reels de producto, making of y fotografía que entrena el ojo para componer.'],
      ].map(([t, s, d], i) => `<div class="skill reveal" style="--d:${i * .06}s"><h3>${t}<span>${s}</span></h3><p>${d}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="contact" id="contacto">
  <div class="wrap">
    <span class="kicker reveal">06 — Contacto</span>
    <h2 data-split>¿Tienes una idea? Hagámosla real<span class="cursor"></span></h2>
    <p class="reveal">Cuéntame qué quieres construir. Respondo personalmente, normalmente en menos de 24 horas.</p>
    <div class="contact-actions reveal">
      <a class="btn" href="https://wa.me/${perfil.whatsapp}?text=${encodeURIComponent('Hola Alejandro, vi tu portafolio y quiero contarte un proyecto.')}" target="_blank" rel="noopener">Escribir por WhatsApp ${ico.arrow}</a>
      <button class="btn btn--ghost copy-mail" data-mail="${perfil.email}"><span class="toast" role="status">¡Correo copiado!</span>Copiar mi correo</button>
    </div>
  </div>
</section>`;

  return layout({
    title: `${perfil.nombre} · Diseñador UX/UI, desarrollador y copywriter`,
    description: `Portafolio de ${perfil.nombre} (${perfil.marca}): casos de UX/UI, desarrollo web, copywriting, ilustración, motion y fotografía, con la intención y el roadmap de cada proyecto.`,
    path: '/',
    body,
  });
}

/* Galería de un proyecto ------------------------------------------------ */
function phone(item) {
  if (item.scroll) return `<div class="phone"><div class="phone-screen scrollshot" tabindex="0"><img src="${asset(item.scroll)}" alt="${esc(item.alt)}" loading="lazy"><span class="scroll-hint">pasa el cursor ↓</span></div></div>`;
  return `<div class="phone"><div class="phone-screen"><img src="${asset(item.src)}" alt="${esc(item.alt)}" loading="lazy"></div></div>`;
}

function video(item) {
  return `<div><div class="phone"><div class="phone-screen" data-video><video src="${asset(item.src)}" poster="${asset(item.poster)}" preload="none" playsinline aria-label="${esc(item.alt)}"></video><button class="video-play" aria-label="Reproducir: ${esc(item.alt)}"><span>${ico.play}</span></button></div></div>${item.cap ? `<p class="phone-cap">${esc(item.cap)}</p>` : ''}</div>`;
}

function gallery(p) {
  return p.galeria.map(g => {
    const cap = g.cap ? `<figcaption>${esc(g.cap)}</figcaption>` : '';
    switch (g.tipo) {
      case 'img':
        return `<figure class="figure reveal"><button class="frame frame--browser zoomable" data-zoom="${asset(g.src)}" data-alt="${esc(g.alt)}" data-fit aria-label="Ampliar: ${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></button>${cap}</figure>`;
      case 'zoom':
        return `<figure class="figure reveal"><button class="frame zoomable" data-zoom="${asset(g.src)}" data-alt="${esc(g.alt)}" aria-label="Recorrer: ${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"><span class="scroll-hint">clic para ampliar</span></button>${cap}</figure>`;
      case 'scroll':
        return `<figure class="figure reveal"><div class="frame frame--browser scrollshot" tabindex="0"><img src="${asset(g.src)}" alt="${esc(g.alt)}" loading="lazy"><span class="scroll-hint">pasa el cursor para recorrer ↓</span></div>${cap}</figure>`;
      case 'video':
        return `<figure class="figure reveal"><div class="phones">${video(g)}</div>${cap}</figure>`;
      case 'videos':
        return `<figure class="figure reveal"><div class="phones">${g.items.map(video).join('')}</div>${cap}</figure>`;
      case 'grid':
        if (g.movil) return `<figure class="figure reveal"><div class="phones">${g.items.map(phone).join('')}</div>${cap}</figure>`;
        return `<figure class="figure reveal"><div class="grid-figs">${g.items.map(it => `<button class="frame zoomable" data-zoom="${asset(it.src)}" data-alt="${esc(it.alt)}" data-fit aria-label="Ampliar: ${esc(it.alt)}"><img src="${it.src}" alt="${esc(it.alt)}" loading="lazy"></button>`).join('')}</div>${cap}</figure>`;
      case 'copy':
        return `<div class="copy-wall">${g.piezas.map((c, i) => `<div class="copy-piece reveal" style="--d:${(i % 3) * .07}s"><span>${esc(c.k)}</span><p>“${esc(c.t)}”</p></div>`).join('')}</div>`;
      case 'insights':
        return `<div class="insights">${p.metricas.map(m => `<div class="insight"><b style="font:600 var(--step-3)/1 var(--font-display);color:#fff">${esc(m.v)}</b><cite>${esc(m.l)}</cite><div class="bar"><i style="--w:${parseInt(m.v)}%"></i></div></div>`).join('')}${g.citas.map(c => `<div class="insight"><blockquote>“${esc(c.q)}”</blockquote><cite>${esc(c.c)}</cite></div>`).join('')}</div>`;
      case 'stickers':
        return `<figure class="figure reveal"><div class="sticker-grid">${stickersList(72).map(s => `<img src="${s}" alt="" loading="lazy">`).join('')}</div><figcaption>Una muestra de las colecciones: Disney, F1, Friends, Harry Potter, TBBT, Travel, Boho y personalizadas.</figcaption></figure>`;
      case 'fotos': {
        const files = readdirSync(join(SRC, 'assets/img/foto')).filter(f => f.endsWith('-sm.webp'));
        return `<div class="photos">${files.map((f, i) => `<button class="reveal" style="--d:${(i % 3) * .06}s" data-zoom="/assets/img/foto/${f.replace('-sm', '')}" data-fit data-alt="Fotografía ${i + 1}" aria-label="Ampliar fotografía ${i + 1}"><img src="/assets/img/foto/${f}" alt="Fotografía ${i + 1} de la serie" loading="lazy"></button>`).join('')}</div>`;
      }
      default:
        return '';
    }
  }).join('');
}

/* Página de proyecto ---------------------------------------------------- */
function projectPage(p, i) {
  const next = proyectos[(i + 1) % proyectos.length];
  const c = coverOf(p);
  const chapters = [
    ['intencion', 'Intención'], ['reto', 'El reto'], ['roadmap', 'Roadmap'],
    p.decisiones.length && ['decisiones', 'Decisiones'], ['galeria', 'El trabajo'],
    p.metricas.length && p.galeria[0].tipo !== 'insights' && ['resultados', 'En cifras'], ['aprendizaje', 'Aprendizaje'],
  ].filter(Boolean);
  const label = id => { const k = chapters.findIndex(ch => ch[0] === id); return `<span class="chapter-label"><b>${pad(k + 1)}</b>/ ${pad(chapters.length)} · ${chapters[k][1]}</span>`; };

  const body = `
<div class="progress" aria-hidden="true"></div>
<section class="p-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Ruta"><a href="/">inicio</a><span>/</span><a href="/#indice">proyectos</a><span>/</span><span aria-current="page">${p.slug}</span></nav>
    <div class="p-tags reveal">${p.disciplinas.map(d => `<span class="tag">${esc(d)}</span>`).join('')}</div>
    <h1 data-split>${esc(p.titulo)}</h1>
    <p class="p-sub reveal" style="--d:.3s">${esc(p.subtitulo)}</p>
    ${p.enlace ? `<div class="p-cta reveal" style="--d:.4s"><a class="btn" href="${p.enlace.url}" target="_blank" rel="noopener">${esc(p.enlace.label)} ${ico.arrow}</a></div>` : ''}
    <dl class="meta reveal" style="--d:.45s">
      <div><dt>Rol</dt><dd>${esc(p.rol)}</dd></div>
      <div><dt>Año</dt><dd>${esc(p.anio)}</dd></div>
      <div><dt>Duración</dt><dd>${esc(p.duracion)}</dd></div>
      <div><dt>Equipo</dt><dd>${esc(p.equipo)}</dd></div>
      <div><dt>Herramientas</dt><dd>${esc(p.herramientas.join(', '))}</dd></div>
    </dl>
    <div class="p-cover">${c ? `<img src="${c}" alt="Portada de ${esc(p.titulo)}" fetchpriority="high">` : typeCover(p)}</div>
  </div>
</section>

<div class="wrap p-layout">
  <nav class="toc" aria-label="Capítulos">${chapters.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav>
  <div>
    <section class="chapter" id="intencion">${label('intencion')}<p class="lead-quote reveal">${esc(p.intencion)}</p></section>
    <section class="chapter" id="reto">${label('reto')}<div class="prose reveal"><p>${esc(p.reto)}</p></div></section>
    <section class="chapter" id="roadmap">${label('roadmap')}
      <h2 data-split>Cómo se hizo, paso a paso</h2>
      <ol class="roadmap" style="list-style:none;margin:0;padding:0">
        <span class="log-fill" data-progress aria-hidden="true"></span>
        ${p.roadmap.map((r, k) => `<li class="rm-step"><span class="rm-node">${pad(k + 1)}</span><div class="rm-card reveal"><span class="fase">${esc(r.fase)}</span><h3>${esc(r.titulo)}</h3><p>${esc(r.texto)}</p></div></li>`).join('')}
      </ol>
    </section>
    ${p.decisiones.length ? `<section class="chapter" id="decisiones">${label('decisiones')}<h2 data-split>Decisiones que marcaron el resultado</h2><div class="decisions">${p.decisiones.map((d, k) => `<div class="decision reveal" style="--d:${(k % 2) * .08}s"><span>decisión_${pad(k + 1)}</span><h3>${esc(d.t)}</h3><p>${esc(d.d)}</p></div>`).join('')}</div></section>` : ''}
    <section class="chapter" id="galeria">${label('galeria')}<h2 data-split>El trabajo</h2><div class="gallery">${gallery(p)}</div></section>
    ${chapters.some(ch => ch[0] === 'resultados') ? `<section class="chapter" id="resultados">${label('resultados')}<div class="metrics reveal">${p.metricas.map(m => `<div class="metric"><b data-count>${esc(m.v)}</b><span>${esc(m.l)}</span></div>`).join('')}</div></section>` : ''}
    <section class="chapter" id="aprendizaje">${label('aprendizaje')}<div class="learning reveal"><p>${esc(p.aprendizaje)}</p></div></section>
  </div>
</div>

<a class="next" href="/proyectos/${next.slug}/">
  <div class="wrap">
    <div><span class="kicker">Siguiente proyecto</span><h2 style="margin-top:18px">${esc(next.titulo)}</h2><p class="muted" style="margin-top:14px;max-width:44ch">${esc(next.resumen)}</p></div>
    <div class="next-media">${coverOf(next) ? `<img src="${coverOf(next)}" alt="" loading="lazy">` : typeCover(next)}</div>
  </div>
</a>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada"><button class="lightbox-close" aria-label="Cerrar">${ico.close}</button><img alt=""></div>`;

  return layout({
    title: `${p.titulo} · Caso de estudio · ${perfil.nombre}`,
    description: p.resumen,
    path: `/proyectos/${p.slug}/`,

    body,
  });
}

/* Generación ------------------------------------------------------------ */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const d of ['assets', 'css', 'js']) cpSync(join(SRC, d), join(OUT, d), { recursive: true });
cpSync(join(SRC, 'static'), OUT, { recursive: true });

const write = (rel, html) => { const f = join(OUT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); };
write('index.html', home());
proyectos.forEach((p, i) => {
  p.relacionados?.forEach(r => { if (!bySlug[r]) console.warn(`! ${p.slug}: relacionado inexistente "${r}"`); });
  write(`proyectos/${p.slug}/index.html`, projectPage(p, i));
});
write('404.html', layout({
  title: 'Página no encontrada · El Alquimista Digital', description: 'Esta página no existe.', path: '/404',
  body: `<section class="hero"><div class="wrap" style="display:block"><span class="kicker">Error 404</span><h1 data-split>Esta fórmula no existe<span class="cursor"></span></h1><p class="hero-lead">La página que buscas se movió o nunca existió.</p><div class="hero-cta"><a class="btn" href="/">Volver al inicio ${ico.arrow}</a></div></div></section>`,
}));

const urls = ['/', ...proyectos.map(p => `/proyectos/${p.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('llms.txt', `# ${perfil.nombre} · ${perfil.marca}\n\n> ${perfil.rol}. ${perfil.ciudad}.\n\n## Proyectos\n${proyectos.map(p => `- [${p.titulo}](${SITE}/proyectos/${p.slug}/): ${p.resumen}`).join('\n')}\n\n## Contacto\n- ${perfil.email}\n`);

if (missing.size) { console.error('Faltan archivos:\n' + [...missing].join('\n')); process.exit(1); }
console.log(`Sitio generado en dist/ · ${urls.length} páginas · ${SITE}`);
