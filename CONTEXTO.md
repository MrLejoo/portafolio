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
src/js/main.js           ← animaciones e interacciones (sin dependencias)
src/assets/img|video     ← imágenes WebP y videos ya optimizados (sí van a git)
src/static/              ← favicon, _headers (se copian tal cual)
scripts/build.mjs        ← genera dist/: portada, /proyectos/<slug>/, 404, sitemap, robots, llms.txt
_fuente/                 ← NO va a git: copia de Drive, capturas, scripts de procesado
```

- `npm run build` genera `dist/`. `npm run dev` lo genera y lo sirve en http://localhost:5190.
- El build **falla** si un proyecto apunta a una imagen que no existe (así no se publica nada roto).
- La URL pública se define con la variable `SITE_URL` (por defecto `https://alquimista-digital.pages.dev`).

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

Herramientas usadas por los scripts: Python 3 con Pillow, PyMuPDF, numpy y scipy; Edge sin ventana para capturas (`_fuente/capturar.py`).

## 4. Textos que conviene que el usuario revise

Varios textos se **redactaron a partir del material** porque no había descripción completa. Revisar y corregir en `proyectos.mjs`:
- **Años** de Wander, Velvet & Spirit, LoremCraft, Beacon 212, campañas EN, MaiGourmet, tipografía, interfaces y fotografía (estimados).
- Intención y roadmap de **Velvet & Spirit, MaiGourmet, Exploraciones tipográficas, Checkout/registro, Fotografía, WaDirecto, ROI Express** (redactados por Claude).
- Biografía de «Sobre mí» (portada, en `scripts/build.mjs`).
- Las cifras de Wander, AirBijagos y Beacon 212 salen de sus documentos en Drive.

## 5. Publicación (GitHub + Cloudflare Pages)

Pendiente de conectar (ver sección 6 cuando se haga). Configuración prevista en Cloudflare Pages:
- Framework preset: **None** · Build command: `npm run build` · Build output directory: `dist` · Variable `SITE_URL` con la URL final.
- Cada `git push` a `main` publica automáticamente.

## 6. Pendientes

1. Crear la cuenta/repositorio de GitHub y el proyecto de Cloudflare Pages, y conectarlos.
2. Ajustar `SITE_URL` (y dominio propio si se compra).
3. Que el usuario revise los textos de la sección 4.
4. Opcional: enlaces públicos de WaDirecto, Texto Chimbo y ROI Express cuando estén publicados (campo `enlace` en cada proyecto).
