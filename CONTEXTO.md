# Portafolio · El Alquimista Digital · Contexto del proyecto

> Última actualización: **07/10/2026**. Si trabajas en este proyecto en un chat nuevo, **lee este archivo antes de empezar**. Responde siempre en español.

## 1. Qué es

Portafolio de **Alejandro Hurtado** («El Alquimista Digital»): diseño UX/UI, desarrollo web, copywriting, ilustración, motion y fotografía. Cada proyecto tiene su página de caso de estudio con **intención, reto, roadmap paso a paso, decisiones, galería, cifras y aprendizaje**.

- Estética: oscura, de «sitio para desarrolladores» (referencia: Appwrite en Refero), retícula de fondo, etiquetas monoespaciadas, cursor `_` parpadeante.
- Paleta (Coolors): `#0D1B2A` fondo · `#1B263B` superficies · `#415A77` líneas/acento · `#778DA9` texto secundario · `#E0E1DD` y **blanco** para el texto.
- Tipografías: Space Grotesk (títulos), Inter (texto), JetBrains Mono (etiquetas).

## 2. Estructura

```
src/data/proyectos.mjs   ← TODO el contenido (perfil + proyectos). Editar aquí.
src/css/estilos.css      ← sistema visual (tokens en :root)
src/css/fuentes.css      ← @font-face de las fuentes propias (src/assets/fonts)
src/js/main.js           ← animaciones e interacciones (sin dependencias)
src/assets/img|video     ← imágenes WebP y videos ya optimizados (sí van a git)
src/static/              ← favicon, _headers (se copian tal cual)
scripts/build.mjs        ← genera dist/: portada, /proyectos/<slug>/, 404, sitemap, robots, llms.txt
scripts/variantes.py     ← versiones de 800 px (-800w.webp) para srcset; ejecutar tras añadir imágenes
_fuente/                 ← NO va a git: copia de Drive, capturas, scripts de procesado
```

- `npm run build` genera `dist/`. `npm run dev` lo genera y lo sirve en http://localhost:5190.
- El build **falla** si un proyecto apunta a una imagen que no existe (así no se publica nada roto).
- La URL pública se define con la variable `SITE_URL` (por defecto `https://alejandrohurtadomartin.pages.dev`).

### Tipos de galería (`galeria[].tipo` en proyectos.mjs)
`img` (captura ampliable) · `scroll` (pantalla larga que se recorre al pasar el cursor) · `grid` (mosaico; con `movil: true` se muestran en teléfonos) · `video` / `videos` (vertical con portada) · `zoom` (tablero enorme para ampliar) · `copy` (textos publicitarios) · `insights` (cifras + citas) · `stickers` · `fotos`.

## 3. Material de Google Drive (carpeta «Portfolio»)

Enlace: https://drive.google.com/drive/folders/16OsI3h0RyfcWP-jgH0DqfEWXuGc2pqfQ

Cuando el usuario diga que **subió archivos nuevos**:

1. `python _fuente/sincronizar.py` → vuelve a leer Drive, **descarga solo lo nuevo o modificado** y escribe `_fuente/novedades.json` con la lista de `nuevos`, `modificados` y `eliminados_en_drive`. Lo que ya se tenía no se vuelve a bajar.
2. Revisar solo lo que aparece en `novedades.json` y decidir si es un proyecto nuevo o material para uno existente.
3. Optimizar para la web (ver `_fuente/procesar.py` y `_fuente/portadas.py`; videos con `_fuente/tools/node_modules/ffmpeg-static/ffmpeg.exe`, 720 px, CRF 26) y guardarlo en `src/assets/...`.
4. Añadir o ampliar la ficha en `src/data/proyectos.mjs`, `npm run build`, revisar y publicar.

Historial de sincronizaciones:
- 07/10/2026: descarga inicial (356 archivos) y, en la misma sesión, nuevo `Videos animados/making-of.mp4` → proyecto «StickerCom · Reel y making of».
- 07/10/2026: nuevo `Videos animados/reaccionar-vs-responder.mp4` → proyecto «Reaccionar vs Responder» (Motion, animación 3D). Fotogramas en `src/assets/img/reaccionar/`, portada en `_fuente/portadas.py`. Herramientas e intención redactadas por Claude: confirmar con el usuario.
- 07/10/2026: **DiskPulse** (app de escritorio, código en `E:\Claude\diskpulse`, instalada en `%LOCALAPPDATA%\Programs\DiskPulse`). Capturas con `_fuente/capturar_diskpulse.mjs` (playwright-core + Edge, servidor `python app.py --no-open`), escaneando `_fuente\drive` para no mostrar archivos personales. Entra en destacados y AirBijagos sale de ellos a petición del usuario.

Herramientas usadas por los scripts: Python 3 con Pillow, PyMuPDF, numpy y scipy; Edge sin ventana para capturas (`_fuente/capturar.py`).

## 4. Textos que conviene que el usuario revise

Varios textos se **redactaron a partir del material** porque no había descripción completa. Revisar y corregir en `proyectos.mjs`:
- **Años** de Wander, Velvet & Spirit, LoremCraft, Beacon 212, campañas EN, MaiGourmet, tipografía, interfaces y fotografía (estimados).
- Intención y roadmap de **Velvet & Spirit, MaiGourmet, Exploraciones tipográficas, Checkout/registro, Fotografía, WaDirecto, ROI Express** (redactados por Claude).
- Biografía de «Sobre mí» (portada, en `scripts/build.mjs`).
- Las cifras de Wander, AirBijagos y Beacon 212 salen de sus documentos en Drive.

## 5. Publicación (GitHub + Cloudflare Pages)

- **GitHub:** https://github.com/MrLejoo/portafolio (público, rama `main`). El remoto es `https://MrLejoo@github.com/MrLejoo/portafolio.git`: el usuario va en la URL para que Windows guarde esta credencial aparte de la de StickerCom (`contactstickercom-code`).
- **Cloudflare Pages:** proyecto `alejandrohurtadomartin` → https://alejandrohurtadomartin.pages.dev. Framework preset **None** · Build command `npm run build` · Output `dist` · variables `SITE_URL` y `NODE_VERSION=20`.
- Cada `git push` a `main` publica en producción en 1-2 minutos.
- **Ramas de prueba:** cualquier otra rama publica una vista previa en `https://<rama>.alejandrohurtadomartin.pages.dev` (con `noindex`). Úsala para cambios grandes: probar ahí y luego `git merge --ff-only` a `main`. Ejemplo: la rama `rendimiento`.

## 5b. Rendimiento y escala (07/10/2026)

**No hay base de datos ni servidor propio**: es un sitio estático servido desde la red de Cloudflare. No hay consultas que optimizar ni tablas que indexar; si algún día se añade algo dinámico (formulario de contacto, comentarios, contador de visitas), ver «Si se añade algo dinámico» abajo.

Lo que garantiza que aguante mucho tráfico:
- **Caché con huellas:** `build.mjs` añade `?v=<md5 del contenido>` a cada imagen, video, CSS y JS. `_headers` los guarda en caché un año (`immutable`). Si un archivo cambia, cambia su URL; si no cambia, el visitante reutiliza su caché entre publicaciones. El HTML va con `max-age=0` para que cada publicación se vea al instante.
- **Sin terceros:** fuentes servidas desde el sitio (sin Google Fonts) y precargadas. 0 peticiones externas.
- **Imágenes responsive:** `-800w.webp` + `srcset/sizes`; `width/height` leídos de la cabecera WebP para evitar saltos (CLS 0). El build avisa si una imagen grande no tiene variante.
- **CSS/JS minificados** con esbuild (devDependency; Cloudflare lo instala con `npm install`).
- **Seguridad:** `Content-Security-Policy` solo permite recursos propios (+ Cloudflare Web Analytics por si se activa). Si se añade un recurso externo (p. ej. un video de YouTube), hay que añadir su dominio a la CSP en `src/static/_headers`.

Mediciones (visitante nuevo sin caché, recorriendo la página completa):

| Página | Antes | Después |
|---|---|---|
| Portada en móvil | 0,96 MB · LCP 1,4 s · CLS 0,23 · 4 peticiones externas | 0,61 MB · LCP 0,8 s · CLS 0 · 0 externas |
| DiskPulse en móvil | 0,64 MB · LCP 1,0 s | 0,29 MB · LCP 0,6 s |

Prueba de carga (autocannon, 20 s): ~25.000 peticiones, **0 respuestas de error del servidor** y la misma latencia mediana (~135 ms) con 20 o con 100 conexiones simultáneas. Los únicos fallos con 100 conexiones fueron de conexión en el equipo de prueba (desaparecen con 20), no de Cloudflare. Scripts: `_fuente/medir.mjs` (peso, LCP, CLS) y `_fuente/cls.mjs`.

Límites a tener en cuenta (plan gratuito de Cloudflare Pages): ancho de banda y peticiones a archivos estáticos sin límite; 500 publicaciones al mes; máximo 20.000 archivos por publicación y 25 MB por archivo (los videos van a 720p por eso).

**Si se añade algo dinámico:** usar una Cloudflare Pages Function o Supabase; índices en las columnas por las que se filtra u ordena; RLS en Supabase; límite de envíos por IP y captcha (Turnstile) en formularios; y nunca hacer que la portada dependa de una consulta (mejor generar los datos en el build).

**Para replicar el portafolio** (otra persona u otra marca): copiar el repositorio, cambiar `src/data/proyectos.mjs` (perfil y proyectos), las imágenes de `src/assets` y la paleta de `:root` en `estilos.css`; crear un proyecto de Cloudflare Pages con la misma configuración y `SITE_URL` propia.

## 6. Pendientes

1. Dominio propio (opcional): añadirlo en Cloudflare Pages → Custom domains y actualizar `SITE_URL`.
2. Activar Cloudflare Web Analytics (opcional; la CSP ya lo permite).
3. Que el usuario revise los textos de la sección 4.
4. Opcional: enlaces públicos de WaDirecto, Texto Chimbo y ROI Express cuando estén publicados (campo `enlace` en cada proyecto).
