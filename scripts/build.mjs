// Genera el sitio estático en dist/ a partir de src/.
// Uso: node scripts/build.mjs   (Cloudflare Pages ejecuta este mismo comando en cada push)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { perfil, disciplinas, proyectos, estilo } from '../src/data/proyectos.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist');
const SITE = (process.env.SITE_URL || 'https://alejandrohurtadomartin.pages.dev').replace(/\/$/, '');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = n => String(n).padStart(2, '0');
const bySlug = Object.fromEntries(proyectos.map(p => [p.slug, p]));
const missing = new Set();
const md5 = buf => createHash('md5').update(buf).digest('hex').slice(0, 10);

/* Recursos con huella --------------------------------------------------- *
 * Todo lo de /assets se sirve con caché de un año (ver src/static/_headers).
 * Para que un cambio llegue al instante, cada URL lleva ?v=<huella del contenido>:
 * si el archivo cambia, cambia la URL; si no cambia, el visitante reutiliza su caché. */
const hashes = new Map();
const asset = src => {
  if (!src) return src;
  if (!existsSync(join(SRC, src))) { missing.add(src); return src; }
  if (!hashes.has(src)) hashes.set(src, md5(readFileSync(join(SRC, src))));
  return `${src}?v=${hashes.get(src)}`;
};

// Ancho y alto de un WebP leyendo solo su cabecera (sin dependencias).
const dimsCache = new Map();
function dims(src) {
  if (dimsCache.has(src)) return dimsCache.get(src);
  let d = null;
  try {
    const b = readFileSync(join(SRC, src));
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8X') d = [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    else if (tipo === 'VP8 ') d = [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    else if (tipo === 'VP8L') d = [1 + (((b[22] & 0x3f) << 8) | b[21]), 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6))];
  } catch { /* se informa como faltante en asset() */ }
  dimsCache.set(src, d);
  return d;
}

// <img> con huella y tamaño declarado (evita saltos al cargar). Siempre la imagen original, a calidad completa.
function img(src, { alt = '', lazy = true, priority = false, extra = '' } = {}) {
  const d = dims(src);
  const wh = d ? ` width="${d[0]}" height="${d[1]}"` : '';
  const load = priority ? ' fetchpriority="high"' : lazy ? ' loading="lazy"' : '';
  return `<img src="${asset(src)}"${wh} alt="${esc(alt)}"${load} decoding="async"${extra}>`;
}

/* Iconos ---------------------------------------------------------------- */
const ico = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  flecha: '<svg class="garabato" viewBox="0 0 120 70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M4 12c22 34 58 44 104 30M92 26l17 16-21 12"/></svg>',
};

const siglas = perfil.nombre.split(' ').map(w => w[0]).join('');

/* Plantilla común ------------------------------------------------------- */
function layout({ title, description, path, image, body, bodyClass = '', bg = '#2430F0' }) {
  const url = SITE + path;
  const og = SITE + asset(image || '/assets/img/og.jpg');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(perfil.nombre)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="${bg}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_VE">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${PRELOAD_FONTS}
<link rel="stylesheet" href="${CSS_URL}">
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#contenido">Saltar al contenido</a>
${header(path)}
<main id="contenido">
${body}
</main>
${footer()}
<div class="cursor" aria-hidden="true"><span></span></div>
<button class="anim-btn" type="button" hidden>Activar animaciones</button>
<script src="${JS_URL}" defer></script>
</body>
</html>`;
}

function header(path) {
  const home = path === '/';
  const l = h => (home ? h : '/' + h);
  return `<header class="header">
  <a class="logo" href="/" aria-label="Inicio · ${esc(perfil.nombre)}">${siglas}</a>
  <button class="menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav"><span>Menú</span></button>
  <nav class="nav" id="nav" aria-label="Principal">
    <a href="${l('#trabajo')}">Trabajo</a>
    <a href="${l('#archivo')}">Archivo</a>
    <a href="${l('#mesa')}">Mesa</a>
    <a href="${l('#sobre-mi')}">Yo</a>
    <a href="${l('#contacto')}">Hablemos</a>
  </nav>
</header>`;
}

function footer() {
  return `<footer class="footer">
  <span>© <span data-year>2026</span> ${esc(perfil.nombre)}</span>
  <nav aria-label="Contacto">
    <a href="mailto:${perfil.email}">Correo</a>
    <a href="https://wa.me/${perfil.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="${perfil.figma}" target="_blank" rel="noopener">Figma</a>
  </nav>
  <span>Hecho a mano en ${esc(perfil.ciudad)}</span>
</footer>`;
}

/* Piezas ---------------------------------------------------------------- */
const coverOf = p => p.portada || null;
const tono = p => estilo[p.slug] || { bg: '#F5F0E6', ink: '#111014' };

function typeCover(p) {
  const m = p.metricas?.[0];
  return `<div class="cover-type"><b>${esc(m ? m.v : p.titulo)}</b><small>${esc(m ? m.l : p.subtitulo)}</small></div>`;
}

function stickersList(limit) {
  const dir = join(SRC, 'assets/img/stickers');
  const all = readdirSync(dir).flatMap(col => readdirSync(join(dir, col)).filter(f => !f.startsWith('japanese')).map(f => `/assets/img/stickers/${col}/${f}`));
  const step = Math.max(1, Math.floor(all.length / limit));
  return all.filter((_, i) => i % step === 0).slice(0, limit);
}

// Título enorme letra a letra; la O de HURTADO es la puerta al muro de trabajos.
const letras = (t, puerta) => [...t].map((c, i) => `<span class="l${puerta && i === t.length - 1 ? ' o' : ''}">${c}</span>`).join('');

function capa(c) {
  const pos = `style="--x:${c.x};--y:${c.y};--w:${c.w};--r:${c.r}deg" data-v="${c.v}"`;
  if (c.tipo === 'tel') return `<div class="capa capa--tel" ${pos}><div class="phone"><div class="phone-screen">${img(c.src)}</div></div></div>`;
  if (c.tipo === 'pan') return `<div class="capa capa--pan" ${pos}>${img(c.src)}</div>`;
  return `<div class="capa capa--libre" ${pos}>${img(c.src)}</div>`;
}

function cartel(p, i) {
  const t = tono(p), nombre = p.titulo.replace('StickerCom · ', '');
  return `<a class="cartel" href="/proyectos/${p.slug}/" style="--bg:${t.bg};--ink:${t.ink};--n:${nombre.length}" data-cursor="Ver">
    <span class="cartel-n">${pad(i + 1)}</span>
    <div class="cartel-escena" aria-hidden="true">${(t.capas || []).map(capa).join('')}</div>
    <div class="cartel-pie">
      <small>${esc(p.disciplinas.slice(0, 2).join(' · '))}</small>
      <h3>${esc(nombre)}</h3>
    </div>
  </a>`;
}

/* Portada --------------------------------------------------------------- */
function home() {
  const destacados = proyectos.filter(p => p.destacado);
  const counts = Object.fromEntries(disciplinas.map(d => [d, proyectos.filter(p => p.disciplinas.includes(d)).length]));
  const S = '/assets/img/stickers', P = '/assets/img/posts';
  const stickers = stickersList(24);
  const pegados = [
    [`${S}/disney/pelota-pixar.webp`, 71, 4, 12, -14],
    [`${S}/friends/friends-19.webp`, 56, 10, 15, 9],
    [`${S}/boho/boho-5.webp`, 2, 37, 11, -9],
    [`${S}/disney/nemo.webp`, 28, 40, 13, 7],
    [`${S}/personalizadas/pizza-planet.webp`, 60, 69, 15, -6],
    [`${S}/f1/box.webp`, 38, 2, 8, 11],
    [`${S}/tbbt/tbbt-10.webp`, 82, 66, 10, 14],
    [`${S}/personalizadas/nike.webp`, 40, 68, 12, -11],
    [`${S}/travel/travel-13.webp`, 4, 8, 11, 12],
  ];
  const muro = [
    [`${P}/disney/post-1.webp`, `${P}/f1/69.webp`, `${P}/harry-potter/79.webp`, `${P}/disney/post-21.webp`],
    [`${P}/boho/101.webp`, `${P}/disney/post-17.webp`, `${P}/friends/friends-13.webp`, `${P}/travel/105.webp`],
    [`${P}/disney/post-23.webp`, `${P}/the-big-bang-theory/88.webp`, `${P}/f1/65.webp`, `${P}/disney/post-29.webp`],
    [`${P}/travel/109.webp`, `${P}/boho/103.webp`, `${P}/travel/103.webp`, `${P}/boho/102.webp`],
  ];
  const pasos = [
    ['Escuchar', 'Busco el problema verdadero, no el que aparece en el brief.', '#FFD53D', '#14110A', `${S}/friends/friends-17.webp`],
    ['Definir', 'Si no se puede medir, todavía no está definido.', '#FF4A1F', '#14110A', `${S}/tbbt/tbbt-10.webp`],
    ['Dibujar', 'Iterar en diseño cuesta horas; en código, semanas.', '#FF8CC6', '#2A0B1C', `${S}/boho/boho-3.webp`],
    ['Escribir', 'El texto decide si un botón se pulsa.', '#B8A6FF', '#14103A', `${S}/friends/friends-22.webp`],
    ['Construir', 'Del prototipo a producción, sin soltar el detalle.', '#0E7A5A', '#F5F0E6', `${S}/disney/castillo-disney.webp`],
    ['Medir', 'Cada versión es la hipótesis de la siguiente.', '#2430F0', '#FFFFFF', `${S}/f1/week.webp`],
  ];

  const body = `
<section class="hero scene" data-scene="hero" aria-label="Portada">
  <div class="layer depth-0 trama" data-depth="0" aria-hidden="true"></div>

  <div class="portal" data-depth="3">
    <div class="muro" aria-hidden="true">${muro.map((col, i) => `<div class="muro-col">${col.map(s => img(s, { lazy: false })).join('')}</div>`).join('')}</div>
    <div class="portal-velo" aria-hidden="true"></div>
    <p class="portal-frase"><span>Dibujo, compongo, animo.</span> <em>Y si hace falta, también lo construyo.</em></p>
  </div>

  <h1 class="nombre layer depth-4" data-depth="4" aria-label="${esc(perfil.nombre)}">
    <span class="fila fila--1" aria-hidden="true">${letras('ALEJANDRO')}</span>
    <span class="fila fila--2" aria-hidden="true">${letras('HURTADO', true)}</span>
    <span class="fila fila--3" aria-hidden="true">${letras('MARTÍN')}</span>
  </h1>

  <div class="pegados layer depth-5" data-depth="5" aria-hidden="true">
    ${pegados.map(([s, x, y, w, r]) => `<div class="pegado" data-cursor="Despega" style="--x:${x};--y:${y};--w:${w};--r:${r}deg">${img(s, { lazy: false, extra: ' draggable="false"' })}</div>`).join('')}
  </div>

  <p class="hero-nota"><span>despega los stickers</span>${ico.flecha}</p>
  <p class="hero-rol">${esc(perfil.rol)}</p>
</section>

<section class="trabajo" id="trabajo" aria-label="Trabajo seleccionado">
  <div class="carril">
    <div class="carril-intro">
      <h2 data-lines>Trabajo <em>seleccionado</em></h2>
      <p class="mano">sigue bajando ↓ se mueve de lado</p>
    </div>
    ${destacados.map(cartel).join('')}
  </div>
</section>

<section class="archivo scene" id="archivo" aria-label="Archivo">
  <div class="layer depth-0 trama trama--tinta" data-depth="0" aria-hidden="true"></div>
  <div class="layer depth-4" data-depth="4">
    <h2 class="gigante" data-lines>Archivo</h2>
    <div class="filtros" role="group" aria-label="Filtrar por disciplina">
      <button class="chip" data-filter="*" aria-pressed="true">Todo<sup>${proyectos.length}</sup></button>
      ${disciplinas.map(d => `<button class="chip" data-filter="${esc(d)}" aria-pressed="false">${esc(d)}<sup>${counts[d]}</sup></button>`).join('')}
    </div>
    <p class="sr" id="index-live" aria-live="polite"></p>
    <ul class="indice">
      ${proyectos.map(p => { const t = tono(p); return `<li data-tags="${esc(p.disciplinas.join('|'))}" style="--bg:${t.bg};--ink:${t.ink}"><a href="/proyectos/${p.slug}/" data-img="${coverOf(p) ? asset(coverOf(p)) : ''}" data-cursor="Ver">
        <span class="t">${esc(p.titulo)}</span><span class="d">${esc(p.disciplinas[0])}</span><span class="y">${esc(p.anio.slice(-4))}</span>
      </a></li>`; }).join('')}
    </ul>
  </div>
  <div class="preview" aria-hidden="true"><img alt=""></div>
</section>

<section class="mirada scene" aria-label="Fotografía">
  <div class="mirada-foto layer depth-3" data-depth="3">${img('/assets/img/foto/dsc00037.webp', { alt: 'Mazorca de cacao roja sobre una rama' })}</div>
  <a class="mirada-texto layer depth-4" data-depth="4" href="/proyectos/fotografia/" data-cursor="Ver"><span>También</span> <em>miro</em></a>
</section>

<section class="mesa scene" id="mesa" aria-label="Mesa de juego con ilustraciones">
  <div class="layer depth-0 tapete" data-depth="0" aria-hidden="true"></div>
  <div class="mesa-rotulo layer depth-4" data-depth="4">
    <h2 data-lines>Mesa <em>de juego</em></h2>
    <p class="mano">más de 200 stickers dibujados por mí. haz un desastre.</p>
    <button class="boton boton--mini" data-revolver>Revolver</button>
  </div>
  <div class="lab">${stickers.map(s => `<div class="sticker" data-cursor="Arrastra">${img(s, { extra: ' draggable="false"' })}</div>`).join('')}</div>
</section>

<section class="pasos" id="proceso" aria-label="Cómo trabajo">
  ${pasos.map(([t, d, bg, ink, s], i) => `<article class="paso scene" style="--bg:${bg};--ink:${ink};--i:${i}">
    <div class="layer depth-3 paso-sticker" data-depth="3" aria-hidden="true">${img(s)}</div>
    <div class="layer depth-4 paso-texto" data-depth="4">
      <span class="paso-n">${i + 1}/${pasos.length}</span>
      <h3>${t}</h3>
      <p>${d}</p>
    </div>
  </article>`).join('')}
</section>

<section class="yo scene" id="sobre-mi" aria-label="Sobre mí">
  <div class="layer depth-4" data-depth="4">
    <p class="yo-frase" data-luz>Vengo del marketing, me formé en UX/UI y dibujo stickers. Mezclo disciplinas que casi siempre viven separadas, y las junto hasta que algo se pueda tocar.</p>
    <div class="sellos" aria-label="En cifras">
      <div class="sello sello--a"><b data-count>${proyectos.length}</b><span>proyectos</span></div>
      <div class="sello sello--b"><b data-count>200+</b><span>ilustraciones</span></div>
      <div class="sello sello--c"><b data-count>${disciplinas.length}</b><span>disciplinas</span></div>
    </div>
    <ul class="oficios">${['UX/UI', 'Ilustración', 'Motion', 'Copywriting', 'Fotografía', 'Desarrollo web'].map(o => `<li>${o}</li>`).join('')}</ul>
  </div>
</section>

<section class="contacto scene" id="contacto" aria-label="Contacto">
  <div class="layer depth-0 trama" data-depth="0" aria-hidden="true"></div>
  <div class="layer depth-4" data-depth="4">
    <h2 class="hablemos" aria-label="Hablemos"><span aria-hidden="true">${letras('Hablemos')}</span></h2>
    <p class="mano">cuéntame qué quieres hacer</p>
    <div class="contacto-botones">
      <a class="boton" href="https://wa.me/${perfil.whatsapp}?text=${encodeURIComponent('Hola Alejandro, vi tu portafolio y quiero contarte un proyecto.')}" target="_blank" rel="noopener" data-cursor="Va">WhatsApp ${ico.arrow}</a>
      <button class="boton boton--linea copy-mail" data-mail="${perfil.email}"><span class="toast" role="status">¡Correo copiado!</span>Copiar correo</button>
    </div>
  </div>
</section>`;

  return layout({
    title: `${perfil.nombre} · Diseñador`,
    description: `Portafolio de ${perfil.nombre}: interfaces, ilustración, motion, copywriting y fotografía.`,
    path: '/',
    body,
    bodyClass: 'portada',
  });
}

/* Galería de un proyecto ------------------------------------------------ */
function phone(item) {
  if (item.scroll) return `<div class="phone"><div class="phone-screen scrollshot" tabindex="0">${img(item.scroll, { alt: item.alt })}<span class="scroll-hint">pasa el cursor ↓</span></div></div>`;
  return `<div class="phone"><div class="phone-screen">${img(item.src, { alt: item.alt })}</div></div>`;
}

function video(item) {
  return `<div><div class="phone"><div class="phone-screen" data-video><video src="${asset(item.src)}" poster="${asset(item.poster)}" preload="none" playsinline aria-label="${esc(item.alt)}"></video><button class="video-play" aria-label="Reproducir: ${esc(item.alt)}"><span>${ico.play}</span></button></div></div>${item.cap ? `<p class="phone-cap">${esc(item.cap)}</p>` : ''}</div>`;
}

const zoomBtn = (src, alt, cls, fit = true, hint = '') =>
  `<button class="${cls} zoomable" data-zoom="${asset(src)}" data-alt="${esc(alt)}"${fit ? ' data-fit' : ''} aria-label="${fit ? 'Ampliar' : 'Recorrer'}: ${esc(alt)}">${img(src, { alt })}${hint}</button>`;

function gallery(p) {
  return p.galeria.map(g => {
    const cap = g.cap ? `<figcaption>${esc(g.cap)}</figcaption>` : '';
    switch (g.tipo) {
      case 'img':
        return `<figure class="figure reveal">${zoomBtn(g.src, g.alt, 'frame frame--browser')}${cap}</figure>`;
      case 'zoom':
        return `<figure class="figure reveal">${zoomBtn(g.src, g.alt, 'frame', false, '<span class="scroll-hint">clic para ampliar</span>')}${cap}</figure>`;
      case 'scroll':
        return `<figure class="figure reveal"><div class="frame frame--browser scrollshot" tabindex="0">${img(g.src, { alt: g.alt })}<span class="scroll-hint">pasa el cursor para recorrer ↓</span></div>${cap}</figure>`;
      case 'video':
        return `<figure class="figure reveal"><div class="phones">${video({ ...g, cap: null })}</div>${cap}</figure>`;
      case 'videos':
        return `<figure class="figure reveal"><div class="phones">${g.items.map(video).join('')}</div>${cap}</figure>`;
      case 'grid':
        if (g.movil) return `<figure class="figure reveal"><div class="phones">${g.items.map(phone).join('')}</div>${cap}</figure>`;
        return `<figure class="figure reveal"><div class="grid-figs">${g.items.map(it => zoomBtn(it.src, it.alt, 'frame')).join('')}</div>${cap}</figure>`;
      case 'copy':
        return `<div class="copy-wall">${g.piezas.map((c, i) => `<div class="copy-piece reveal" style="--d:${(i % 3) * .07}s"><span>${esc(c.k)}</span><p>“${esc(c.t)}”</p></div>`).join('')}</div>`;
      case 'insights':
        return `<div class="insights">${p.metricas.map(m => `<div class="insight"><b style="font:600 var(--step-3)/1 var(--font-display);color:#fff">${esc(m.v)}</b><cite>${esc(m.l)}</cite><div class="bar"><i style="--w:${parseInt(m.v)}%"></i></div></div>`).join('')}${g.citas.map(c => `<div class="insight"><blockquote>“${esc(c.q)}”</blockquote><cite>${esc(c.c)}</cite></div>`).join('')}</div>`;
      case 'stickers':
        return `<figure class="figure reveal"><div class="sticker-grid">${stickersList(72).map(s => img(s)).join('')}</div><figcaption>Una muestra de las colecciones: Disney, F1, Friends, Harry Potter, TBBT, Travel, Boho y personalizadas.</figcaption></figure>`;
      case 'fotos': {
        const files = readdirSync(join(SRC, 'assets/img/foto')).filter(f => f.endsWith('-sm.webp'));
        return `<div class="photos">${files.map((f, i) => `<button class="reveal" style="--d:${(i % 3) * .06}s" data-zoom="${asset('/assets/img/foto/' + f.replace('-sm', ''))}" data-fit data-alt="Fotografía ${i + 1}" aria-label="Ampliar fotografía ${i + 1}">${img('/assets/img/foto/' + f, { alt: `Fotografía ${i + 1} de la serie` })}</button>`).join('')}</div>`;
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
  const t = tono(p), tn = tono(next);
  const cifras = p.metricas.length && p.galeria[0].tipo !== 'insights';

  const body = `
<div class="progress" aria-hidden="true"></div>
<section class="c-hero scene" data-scene="caso" style="--bg:${t.bg};--ink:${t.ink}">
  <div class="layer depth-0 trama" data-depth="0" aria-hidden="true"></div>
  <div class="layer depth-4 c-cabeza" data-depth="4">
    <a class="c-volver" href="/#archivo">← Archivo</a>
    <h1 data-lines>${esc(p.titulo)}</h1>
    <p class="c-sub rv">${esc(p.subtitulo)}</p>
    <p class="c-meta rv">${esc(p.disciplinas.join(' · '))} — ${esc(p.anio)}</p>
    ${p.enlace ? `<a class="boton rv" href="${p.enlace.url}" target="_blank" rel="noopener">${esc(p.enlace.label)} ${ico.arrow}</a>` : ''}
  </div>
  <div class="c-portada layer depth-3" data-depth="3">${c ? img(c, { alt: `Portada de ${p.titulo}`, priority: true }) : typeCover(p)}</div>
</section>

${cifras ? `<section class="c-cifras" style="--bg:${t.bg};--ink:${t.ink}" aria-label="En cifras">${p.metricas.map(m => `<div class="rv"><b data-count>${esc(m.v)}</b><span>${esc(m.l)}</span></div>`).join('')}</section>` : ''}

<section class="c-obra" id="galeria" aria-label="El trabajo"><div class="gallery">${gallery(p)}</div></section>

<section class="c-final" style="--bg:${t.bg};--ink:${t.ink}" aria-label="Aprendizaje">
  <p data-luz>${esc(p.aprendizaje)}</p>
</section>

<details class="c-historia">
  <summary data-cursor="Abre"><span>La historia completa</span><i aria-hidden="true">+</i></summary>
  <div class="c-historia-cuerpo">
    <h2>La intención</h2><p>${esc(p.intencion)}</p>
    <h2>El reto</h2><p>${esc(p.reto)}</p>
    <h2>Paso a paso</h2>
    <ol class="c-pasos">${p.roadmap.map(r => `<li><span>${esc(r.fase)}</span><h3>${esc(r.titulo)}</h3><p>${esc(r.texto)}</p></li>`).join('')}</ol>
    ${p.decisiones.length ? `<h2>Decisiones</h2><div class="c-decisiones">${p.decisiones.map(d => `<div><h3>${esc(d.t)}</h3><p>${esc(d.d)}</p></div>`).join('')}</div>` : ''}
    <dl class="c-ficha">
      <div><dt>Rol</dt><dd>${esc(p.rol)}</dd></div>
      <div><dt>Duración</dt><dd>${esc(p.duracion)}</dd></div>
      <div><dt>Equipo</dt><dd>${esc(p.equipo)}</dd></div>
      <div><dt>Herramientas</dt><dd>${esc(p.herramientas.join(', '))}</dd></div>
    </dl>
  </div>
</details>

<a class="siguiente" href="/proyectos/${next.slug}/" style="--bg:${tn.bg};--ink:${tn.ink}" data-cursor="Ver">
  <small>Siguiente</small>
  <h2>${esc(next.titulo)}</h2>
  <div class="siguiente-img" aria-hidden="true">${coverOf(next) ? img(coverOf(next)) : typeCover(next)}</div>
</a>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada"><button class="lightbox-close" aria-label="Cerrar">${ico.close}</button><img alt=""></div>`;

  return layout({
    title: `${p.titulo} · ${perfil.nombre}`,
    description: p.resumen,
    path: `/proyectos/${p.slug}/`,
    body,
    bodyClass: 'caso',
    bg: t.bg,
  });
}

/* Generación ------------------------------------------------------------ */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });
cpSync(join(SRC, 'static'), OUT, { recursive: true });

const write = (rel, html) => { const f = join(OUT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); };

// CSS (fuentes + estilos) y JS minificados con esbuild; si no está instalado, se publican tal cual.
let esbuild = null;
try { esbuild = await import('esbuild'); } catch { console.warn('! esbuild no está instalado (npm install): CSS y JS sin minificar'); }
const minify = async (code, loader) => esbuild ? (await esbuild.transform(code, { loader, minify: true, target: 'es2019' })).code : code;
const css = await minify(readFileSync(join(SRC, 'css/fuentes.css'), 'utf8') + readFileSync(join(SRC, 'css/estilos.css'), 'utf8'), 'css');
// GSAP, ScrollTrigger y Lenis se sirven desde el propio sitio, unidos al JS principal (sin terceros).
const vendor = ['gsap', 'ScrollTrigger', 'lenis'].map(f => readFileSync(join(SRC, `js/vendor/${f}.min.js`), 'utf8')).join(';\n');
const js = vendor + ';\n' + await minify(readFileSync(join(SRC, 'js/main.js'), 'utf8'), 'js');
write('css/estilos.css', css);
write('js/main.js', js);
const CSS_URL = `/css/estilos.css?v=${md5(css)}`;
const JS_URL = `/js/main.js?v=${md5(js)}`;
// Precarga de las dos fuentes visibles en la primera pantalla (títulos y texto).
const PRELOAD_FONTS = readdirSync(join(SRC, 'assets/fonts'))
  .filter(f => /^(bricolage|inter)/.test(f))
  .map(f => `<link rel="preload" href="/assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('\n');
write('index.html', home());
proyectos.forEach((p, i) => {
  p.relacionados?.forEach(r => { if (!bySlug[r]) console.warn(`! ${p.slug}: relacionado inexistente "${r}"`); });
  write(`proyectos/${p.slug}/index.html`, projectPage(p, i));
});
write('404.html', layout({
  title: `Página no encontrada · ${perfil.nombre}`, description: 'Esta página no existe.', path: '/404', bodyClass: 'caso',
  body: `<section class="perdido"><h1>404</h1><p class="mano">este sticker se despegó</p><a class="boton" href="/">Volver al inicio ${ico.arrow}</a></section>`,
}));

const urls = ['/', ...proyectos.map(p => `/proyectos/${p.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('llms.txt', `# ${perfil.nombre}\n\n> ${perfil.rol}. ${perfil.ciudad}.\n\n## Proyectos\n${proyectos.map(p => `- [${p.titulo}](${SITE}/proyectos/${p.slug}/): ${p.resumen}`).join('\n')}\n\n## Contacto\n- ${perfil.email}\n`);

if (missing.size) { console.error('Faltan archivos:\n' + [...missing].join('\n')); process.exit(1); }
console.log(`Sitio generado en dist/ · ${urls.length} páginas · CSS ${(css.length / 1024).toFixed(1)} KB · JS ${(js.length / 1024).toFixed(1)} KB${esbuild ? ' (minificados)' : ''} · ${SITE}`);
