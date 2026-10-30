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
  puntero: '<svg viewBox="0 0 20 22" aria-hidden="true"><path fill="currentColor" stroke="#111014" stroke-width="1.4" stroke-linejoin="round" d="M2 1.5 17.5 10l-6.8 2.1L7 19z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  flecha: '<svg class="garabato" viewBox="0 0 120 70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M4 12c22 34 58 44 104 30M92 26l17 16-21 12"/></svg>',
};

// Importes de la Mesa de trabajo, con el mismo formato que usa main.js al recalcularlos.
const euros = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

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
  const actual = path === '/proyectos/' ? ' aria-current="page"' : '';
  return `<header class="header">
  <a class="logo" href="/" aria-label="Inicio · ${esc(perfil.nombre)}">${siglas}</a>
  <button class="menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav"><span>Menú</span></button>
  <nav class="nav" id="nav" aria-label="Principal">
    <a href="${l('#trabajo')}">Trabajo</a>
    <a href="/proyectos/"${actual}>Proyectos</a>
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
function mesa() {
  const acentos = [['Verde', '#0E7A5A'], ['Ultramar', '#2430F0'], ['Tomate', '#E5431A'], ['Violeta', '#6C4DE6']];
  const opcion = (name, value, label, on) => `<label class="op"><input type="radio" name="${name}" value="${value}"${on ? ' checked' : ''}><span>${label}</span></label>`;
  const ingresos = 2890, gastos = 2250;
  const barra = (id, nombre, gasto, limite) => `<div class="demo-fila"><p><span>${nombre}</span><b data-v="${id}">${euros(gasto)}</b></p><div class="demo-barra"><i data-b="${id}" style="width:${Math.min(100, Math.round(gasto / limite * 100))}%"></i></div></div>`;
  return `<section class="mesa scene" id="mesa" aria-label="Mesa de trabajo">
  <div class="layer depth-0 trama" data-depth="0" aria-hidden="true"></div>
  <div class="mesa-cab layer depth-4" data-depth="4">
    <h2 data-lines>Mesa <em>de trabajo</em></h2>
    <p>Diseño y código en el mismo sitio. Este componente es real: toca los controles y mira cómo responden la interfaz y el código.</p>
  </div>
  <div class="banco layer depth-4" data-depth="4">
    <div class="panel banco-controles rv">
      <p class="panel-titulo">Datos</p>
      <label class="rango"><span>Ingresos <b data-v="r-ingresos">${euros(ingresos)}</b></span><input type="range" name="ingresos" min="500" max="5000" step="10" value="${ingresos}"></label>
      <label class="rango"><span>Gastos <b data-v="r-gastos">${euros(gastos)}</b></span><input type="range" name="gastos" min="0" max="5000" step="10" value="${gastos}"></label>
      <p class="panel-titulo">Diseño</p>
      <fieldset><legend>Tema</legend><div class="ops">${opcion('tema', 'claro', 'Claro', true)}${opcion('tema', 'oscuro', 'Oscuro')}</div></fieldset>
      <fieldset><legend>Acento</legend><div class="ops ops--color">${acentos.map(([n, c], i) => `<label class="op-color" style="--c:${c}"><input type="radio" name="acento" value="${c}"${i ? '' : ' checked'}><span class="sr">${n}</span></label>`).join('')}</div></fieldset>
      <label class="rango"><span>Radio <b data-v="r-radio">16 px</b></span><input type="range" name="radio" min="0" max="28" step="2" value="16"></label>
      <fieldset><legend>Densidad</legend><div class="ops">${opcion('espacio', '14', 'Compacta')}${opcion('espacio', '20', 'Normal', true)}${opcion('espacio', '28', 'Amplia')}</div></fieldset>
      <label class="interruptor"><input type="checkbox" name="medidas"><span>Mostrar medidas</span></label>
    </div>
    <div class="lienzo rv">
      <article class="demo" aria-label="Presupuesto de ejemplo">
        <header class="demo-cab"><span>Octubre 2026</span><span class="demo-estado" data-estado="ok" role="status">Vas bien</span></header>
        <p class="demo-etiqueta">Saldo disponible</p>
        <p class="demo-saldo" data-v="saldo">${euros(ingresos - gastos)}</p>
        ${barra('necesidades', 'Necesidades', gastos * .58, ingresos * .5)}
        ${barra('deseos', 'Deseos', gastos * .2, ingresos * .3)}
        ${barra('ahorro', 'Ahorro', gastos * .22, ingresos * .2)}
      </article>
      <p class="lienzo-pie"><span data-contraste>Contraste del acento: 5,3:1 · AA</span> <a href="/proyectos/caudal/" data-cursor="Ver">Basado en Caudal ${ico.arrow}</a></p>
    </div>
    <div class="panel banco-codigo rv">
      <p class="panel-titulo">presupuesto.css</p>
<pre><code>.presupuesto {
  <i>--acento:</i> <b data-c="acento">#0E7A5A</b>;
  <i>--fondo:</i> <b data-c="fondo">#FFFFFF</b>;
  <i>--radio:</i> <b data-c="radio">16px</b>;
  <i>--espacio:</i> <b data-c="espacio">20px</b>;
}</code></pre>
      <p class="panel-titulo">regla.js</p>
<pre><code><i>const</i> limite = ingresos * .5;
<u>// <span data-c="limite">${euros(ingresos * .5)}</span></u>
<i>const</i> estado = gasto &gt; limite
  ? <b>'excedido'</b> : <b>'ok'</b>;
<u>// <span data-c="estado">'ok'</span></u></code></pre>
    </div>
  </div>
</section>`;
}

function home() {
  const orden = ['caudal', 'diskpulse', 'mixing-kit', 'stickercom-tienda', 'wander', 'velvet-spirit', 'reaccionar-vs-responder'];
  const destacados = orden.map(s => bySlug[s]);
  const I = '/assets/img';
  const muro = [
    [`${I}/caudal/resumen.webp`, `${I}/wander/pantalla-explorar.webp`, `${I}/diskpulse/mapa.webp`, `${I}/velvet/recetas-portada.webp`],
    [`${I}/mixingkit/sunrise.webp`, `${I}/webs/stickercom-home-desk.webp`, `${I}/velvet/recetas-movil-portada.webp`, `${I}/caudal/seguimiento.webp`],
    [`${I}/diskpulse/paleta.webp`, `${I}/wander/pantalla-perfil.webp`, `${I}/webs/roiexpress-desk.webp`, `${I}/mixingkit/portada.webp`],
    [`${I}/webs/wadirecto-desk.webp`, `${I}/caudal/resumen-oscuro.webp`, `${I}/mixingkit/movil-coctel.webp`, `${I}/velvet/mi-bar-portada.webp`],
  ];
  const abanico = [`${I}/webs/roiexpress-desk.webp`, `${I}/ui/checkout-process.webp`, `${I}/bokditos/portada.webp`, `${I}/webs/wadirecto-desk.webp`, `${I}/loremcraft/web-portada.webp`];
  const con = d => proyectos.filter(p => p.disciplinas.includes(d)).length;

  const body = `
<section class="hero scene" data-scene="hero" aria-label="Portada">
  <div class="layer depth-0 trama" data-depth="0" aria-hidden="true"></div>

  <div class="portal" data-depth="3">
    <div class="muro" aria-hidden="true">${muro.map(col => `<div class="muro-col">${col.map(s => img(s)).join('')}</div>`).join('')}</div>
    <div class="portal-velo" aria-hidden="true"></div>
    <p class="portal-frase"><span>Diseño la experiencia.</span> <em>Y escribo el código que la hace real.</em></p>
  </div>

  <h1 class="nombre layer depth-4" data-depth="4" aria-label="${esc(perfil.nombre)}">
    <span class="fila fila--1" aria-hidden="true">${letras('ALEJANDRO')}</span>
    <span class="fila fila--2" aria-hidden="true">${letras('HURTADO', true)}</span>
    <span class="fila fila--3" aria-hidden="true">${letras('MARTÍN')}</span>
  </h1>

  <div class="ui layer depth-5" data-depth="5" aria-hidden="true">
    <div class="sel"><i></i><i></i><i></i><i></i><span class="sel-medida"></span></div>
    <div class="puntero puntero--diseno">${ico.puntero}<span>Diseño</span></div>
    <div class="inspector">
<pre><code>&lt;h1 class="nombre"&gt;
  &lt;span&gt;<b data-fila>HURTADO</b>&lt;/span&gt;
&lt;/h1&gt;</code></pre>
      <div class="puntero puntero--codigo">${ico.puntero}<span>Código</span></div>
    </div>
  </div>

  <p class="hero-nota"><span>baja y entra por la O</span>${ico.flecha}</p>
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

<section class="mas scene" aria-label="Más proyectos">
  <a class="mas-enlace" href="/proyectos/" data-cursor="Entra">
    <div class="mas-abanico" aria-hidden="true">${abanico.map((s, i) => `<div class="mas-carta" style="--i:${i - 2}">${img(s)}</div>`).join('')}</div>
    <h2 data-lines>¿Quieres ver <em>más?</em></h2>
    <p class="mas-pie"><span>${proyectos.length} proyectos de UX/UI, desarrollo, motion y más</span> <span class="boton">Ver proyectos ${ico.arrow}</span></p>
  </a>
</section>

${mesa()}

<section class="mirada scene" aria-label="Fotografía">
  <div class="mirada-foto layer depth-3" data-depth="3">${img('/assets/img/foto/dsc00037.webp', { alt: 'Mazorca de cacao roja sobre una rama' })}</div>
  <a class="mirada-texto layer depth-4" data-depth="4" href="/proyectos/fotografia/" data-cursor="Ver"><span>También</span> <em>miro</em></a>
</section>

<section class="yo scene" id="sobre-mi" aria-label="Sobre mí">
  <div class="layer depth-4" data-depth="4">
    <p class="yo-frase" data-luz>Diseño productos digitales y también los construyo. Vengo del marketing: empiezo por lo que necesita el negocio y no suelto el trabajo hasta que funciona en producción.</p>
    <div class="cifras" aria-label="En cifras">
      <div class="rv"><b data-count>${proyectos.length}</b><span>proyectos</span></div>
      <div class="rv"><b data-count>${con('UX/UI')}</b><span>con UX/UI</span></div>
      <div class="rv"><b data-count>${con('Desarrollo')}</b><span>desarrollados por mí</span></div>
    </div>
    <div class="oficios">
      <div class="rv"><h3>UX/UI</h3><p>Investigación con usuarios, prototipado, sistemas de diseño, Figma</p></div>
      <div class="rv"><h3>Desarrollo</h3><p>JavaScript, Python, Supabase, Three.js, Cloudflare</p></div>
      <div class="rv"><h3>Además</h3><p>Motion, copywriting, ilustración, fotografía</p></div>
    </div>
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
    title: `${perfil.nombre} · Diseñador UX/UI y desarrollador`,
    description: `Portafolio de ${perfil.nombre}: productos digitales diseñados y desarrollados de principio a fin, además de motion, copywriting y fotografía.`,
    path: '/',
    body,
    bodyClass: 'portada',
  });
}

/* Proyectos ------------------------------------------------------------- */
function catalogo() {
  const counts = Object.fromEntries(disciplinas.map(d => [d, proyectos.filter(p => p.disciplinas.includes(d)).length]));
  // Primero el producto: UX/UI y desarrollo pesan igual; después, cada disciplina en su orden.
  const peso = p => Math.max(1, Math.min(...p.disciplinas.map(d => disciplinas.indexOf(d))));
  const lista = [...proyectos].sort((a, b) => peso(a) - peso(b));

  const body = `
<section class="catalogo" aria-label="Proyectos">
  <div class="catalogo-cab">
    <h1 class="gigante" data-lines>Proyectos</h1>
  </div>
  <div class="filtros" role="group" aria-label="Filtrar por disciplina">
    <button class="chip" data-filter="*" aria-pressed="true">Todo<sup>${proyectos.length}</sup></button>
    ${disciplinas.map(d => `<button class="chip" data-filter="${esc(d)}" aria-pressed="false">${esc(d)}<sup>${counts[d]}</sup></button>`).join('')}
  </div>
  <p class="sr" id="index-live" aria-live="polite"></p>
  <ul class="obras">
    ${lista.map((p, i) => { const t = tono(p), c = coverOf(p); return `<li data-tags="${esc(p.disciplinas.join('|'))}"><a class="obra" href="/proyectos/${p.slug}/" style="--bg:${t.bg};--ink:${t.ink}" data-cursor="Ver">
      <div class="obra-img">${c ? img(c, { lazy: i > 3 }) : typeCover(p)}</div>
      <h2>${esc(p.titulo)}</h2>
      <p><span>${esc(p.disciplinas.slice(0, 2).join(' · '))}</span><span>${esc(p.anio.slice(-4))}</span></p>
    </a></li>`; }).join('')}
  </ul>
</section>`;

  return layout({
    title: `Proyectos · ${perfil.nombre}`,
    description: `Todos los proyectos de ${perfil.nombre}: UX/UI, desarrollo, motion, copywriting, diseño gráfico y fotografía.`,
    path: '/proyectos/',
    body,
    bodyClass: 'caso',
    bg: '#F5F0E6',
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
    <a class="c-volver" href="/proyectos/">← Proyectos</a>
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
write('proyectos/index.html', catalogo());
proyectos.forEach((p, i) => {
  p.relacionados?.forEach(r => { if (!bySlug[r]) console.warn(`! ${p.slug}: relacionado inexistente "${r}"`); });
  write(`proyectos/${p.slug}/index.html`, projectPage(p, i));
});
write('404.html', layout({
  title: `Página no encontrada · ${perfil.nombre}`, description: 'Esta página no existe.', path: '/404', bodyClass: 'caso',
  body: `<section class="perdido"><h1>404</h1><p class="mano">esta pantalla no está en el flujo</p><a class="boton" href="/">Volver al inicio ${ico.arrow}</a></section>`,
}));

const urls = ['/', '/proyectos/', ...proyectos.map(p => `/proyectos/${p.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('llms.txt', `# ${perfil.nombre}\n\n> ${perfil.rol}. ${perfil.ciudad}.\n\n## Proyectos\n${proyectos.map(p => `- [${p.titulo}](${SITE}/proyectos/${p.slug}/): ${p.resumen}`).join('\n')}\n\n## Contacto\n- ${perfil.email}\n`);

if (missing.size) { console.error('Faltan archivos:\n' + [...missing].join('\n')); process.exit(1); }
console.log(`Sitio generado en dist/ · ${urls.length} páginas · CSS ${(css.length / 1024).toFixed(1)} KB · JS ${(js.length / 1024).toFixed(1)} KB${esbuild ? ' (minificados)' : ''} · ${SITE}`);
