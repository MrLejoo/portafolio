# Migrar el portafolio a otro ordenador

> Guía para mover el proyecto **Portafolio · El Alquimista Digital** a una computadora nueva y seguir trabajando igual, también con Claude.
> Creada el 08/10/2026. Complementa a [`CONTEXTO.md`](CONTEXTO.md), que explica cómo está hecho el proyecto.

---

## 1. Resumen: dónde vive cada cosa

| Qué | Dónde | ¿Hay que moverlo? |
|---|---|---|
| Código, textos, imágenes y videos optimizados | GitHub: https://github.com/MrLejoo/portafolio | No: se descarga con `git clone` |
| La web publicada | Cloudflare Pages: https://alejandrohurtadomartin.pages.dev | No: está en la nube y se publica sola con cada `git push` |
| Material original (diseños, fotos, videos) | Google Drive, carpeta «Portfolio»: https://drive.google.com/drive/folders/16OsI3h0RyfcWP-jgH0DqfEWXuGc2pqfQ | No: se vuelve a descargar con un script |
| **Scripts de trabajo** (`_fuente/*.py`, `_fuente/*.mjs`, `tree.json`) | **Solo en este ordenador**: `E:\Claude\Proyectos\Portafolio\_fuente` | **Sí, cópialos** (sección 3) |
| Copia local de Drive, capturas, fotogramas (`_fuente/drive`, `capturas`, `previa`, `frames`) | Solo en este ordenador, unos 730 MB | Opcional: se pueden regenerar |
| Herramientas (`_fuente/tools`: ffmpeg y playwright) | Solo en este ordenador, unos 94 MB | No: se reinstalan con un comando |
| Código de DiskPulse (otro proyecto) | `E:\Claude\diskpulse` | Si quieres seguir con esa app, cópialo aparte |

**No hay contraseñas ni claves en el proyecto.** Lo único que necesita acceso son tus cuentas de GitHub (**MrLejoo**) y Cloudflare, y ambas se usan iniciando sesión en el navegador.

---

## 2. Antes de dejar este ordenador

1. Comprueba que no quedan cambios sin subir. En la carpeta del proyecto ejecuta:
   ```bash
   git status
   ```
   Debe decir *"nothing to commit, working tree clean"*. Si no, pide a Claude que haga commit y push.
2. Copia a una memoria USB, a Drive o a la nube **los scripts de `_fuente`** (pesan unos pocos KB):
   ```
   _fuente/sincronizar.py        ← detecta y descarga solo lo nuevo de Drive
   _fuente/drive_tree.py         ← lee el árbol de la carpeta de Drive
   _fuente/drive_download.py     ← descarga los archivos
   _fuente/tree.json             ← el estado actual de Drive (para saber qué es nuevo)
   _fuente/novedades.json        ← última sincronización
   _fuente/procesar.py           ← convierte el material a WebP para la web
   _fuente/portadas.py           ← compone las portadas (teléfonos, ventanas, stickers)
   _fuente/capturar.py           ← capturas de webs con Edge
   _fuente/capturar_diskpulse.mjs← capturas de DiskPulse
   _fuente/medir.mjs, cls.mjs    ← miden peso, velocidad y saltos de la web
   ```
   Lo más fácil es copiar la carpeta `_fuente` entera **sin** las subcarpetas `drive`, `tools`, `previa`, `frames` y `sitios`. Si tienes espacio, también puedes llevarte `drive` (685 MB) y `capturas` (12 MB) para no descargarlas otra vez.
3. Opcional, para que Claude recuerde tus preferencias: copia la carpeta de memoria de Claude, `C:\Users\mrlej\.claude\projects\E--Claude-Proyectos-StickerCom\memory\`. Contiene, por ejemplo, la preferencia de responder siempre en español. No es imprescindible: `CONTEXTO.md` ya lo indica.

---

## 3. En el ordenador nuevo

### 3.1 Instalar los programas
Abre PowerShell y ejecuta, uno por uno:

```bash
winget install Git.Git
```
```bash
winget install OpenJS.NodeJS.LTS
```
```bash
winget install Python.Python.3.12
```

Cierra y vuelve a abrir PowerShell después de instalar. Versiones con las que funciona hoy: Node 24, Python 3.12 y Git 2.x (mínimo Node 18). Microsoft Edge ya viene con Windows y lo usan los scripts de capturas.

### 3.2 Descargar el proyecto
Elige la carpeta donde quieras trabajar, por ejemplo `E:\Claude\Proyectos`, y ejecuta:

```bash
git clone https://MrLejoo@github.com/MrLejoo/portafolio.git Portafolio
```

- Si Windows muestra **"Connect to GitHub"**, pulsa **Sign in with your browser** y autoriza con la cuenta **MrLejoo**.
- El `MrLejoo@` de la dirección es intencional: así Windows guarda esta cuenta aparte de la de StickerCom (`contactstickercom-code`) si también trabajas en ella en ese ordenador.

Configura tu firma para los cambios de este proyecto:

```bash
cd Portafolio
```
```bash
git config user.name "Alejandro Hurtado"
```
```bash
git config user.email "contactoelalquimistadigital@gmail.com"
```
```bash
git config core.autocrlf false
```

### 3.3 Instalar dependencias y ver la web en local
```bash
npm install
```
```bash
npm run dev
```
Abre http://localhost:5190. Si ves el portafolio, el proyecto está funcionando. Ciérralo con Ctrl+C.

### 3.4 Recuperar los scripts de trabajo
1. Pega la carpeta `_fuente` que copiaste en el paso 2 dentro de `Portafolio`, de modo que quede `Portafolio\_fuente\sincronizar.py`. No va a GitHub: el `.gitignore` ya la excluye.
2. Instala las librerías de Python:
   ```bash
   pip install pillow pymupdf numpy scipy
   ```
3. Instala las herramientas de video y capturas:
   ```bash
   cd _fuente
   ```
   ```bash
   mkdir tools
   ```
   ```bash
   cd tools
   ```
   ```bash
   npm init -y
   ```
   ```bash
   npm install ffmpeg-static@5 playwright-core@1
   ```
4. Si no copiaste `drive`, vuelve a la carpeta `_fuente` y descarga tu material de Drive (unos 690 MB, tarda unos minutos):
   ```bash
   cd ..
   ```
   ```bash
   python sincronizar.py
   ```
   Como `tree.json` viene del ordenador viejo, solo marcará como "nuevo" lo que hayas subido a Drive después de la migración, y descargará los archivos que falten en la carpeta local.

### 3.5 Vista previa dentro de Claude Code (opcional)
Para que Claude pueda abrir la web en su navegador integrado, crea el archivo `Portafolio\.claude\launch.json` con este contenido (la carpeta `.claude` tampoco se sube a GitHub):

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "portafolio",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["-y", "http-server", "dist", "-p", "5190", "-c-1"],
      "port": 5190
    }
  ]
}
```

---

## 4. Cloudflare: no hay que hacer nada

Cloudflare Pages está conectado a GitHub, no a tu ordenador. Desde el ordenador nuevo, cada `git push` a `main` sigue publicando la web en 1-2 minutos. Su configuración, por si algún día hay que rehacerla:

| Ajuste | Valor |
|---|---|
| Proyecto | `alejandrohurtadomartin` |
| Rama de producción | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variables | `SITE_URL = https://alejandrohurtadomartin.pages.dev` · `NODE_VERSION = 20` |

Cualquier otra rama crea una **vista previa** en `https://<rama>.alejandrohurtadomartin.pages.dev`, útil para probar cambios grandes antes de publicarlos.

---

## 5. Seguir trabajando con Claude en el ordenador nuevo

Abre Claude Code en la carpeta `Portafolio` y empieza con un mensaje como este:

> Lee `CONTEXTO.md` y `MIGRACION.md` antes de empezar. Estoy en un ordenador nuevo; comprueba que todo funciona (`git pull`, `npm run build`) y respóndeme siempre en español.

Lo que Claude encontrará en `CONTEXTO.md`:
- La estructura del proyecto y cómo editar el contenido (`src/data/proyectos.mjs`).
- El flujo para incorporar lo que subas a Drive (`python _fuente/sincronizar.py`).
- Los tipos de galería, las decisiones de rendimiento (imágenes siempre a calidad completa) y los textos pendientes de revisar.

---

## 6. Lista de comprobación

- [ ] En el ordenador viejo, `git status` limpio.
- [ ] Scripts de `_fuente` copiados (y, si quieres, `drive` y `capturas`).
- [ ] Git, Node y Python instalados en el nuevo.
- [ ] `git clone` hecho e inicio de sesión con **MrLejoo**.
- [ ] `npm install` y `npm run dev` muestran la web en http://localhost:5190.
- [ ] `_fuente` pegada, `pip install …` y herramientas de `_fuente/tools` instaladas.
- [ ] `python _fuente/sincronizar.py` funciona.
- [ ] Prueba de publicación: un cambio pequeño, `git push` y verlo en https://alejandrohurtadomartin.pages.dev.

---

## 7. Estado del proyecto al migrar (08/10/2026)

- **19 páginas**: la portada, 16 casos de estudio, la página de error 404 y los archivos para buscadores.
- **Proyectos destacados:** StickerCom, DiskPulse, Wander, Velvet & Spirit, StickerCom · Ilustración, StickerCom · Reel y making of, Reaccionar vs Responder.
- **Resto del índice:** AirBijagos, LoremCraft → Texto Chimbo, BoKditos, WaDirecto, ROI Express, Beacon 212, campañas en inglés, MaiGourmet, Exploraciones tipográficas, Checkout y registro, Fotografía.
- **Último cambio:** imágenes de nuevo a calidad completa (sin versiones reducidas). Se mantienen la caché con huellas, las fuentes propias, el tamaño declarado de las imágenes y la política de seguridad.
- **Pendientes:**
  - revisar los textos redactados por Claude (sección 4 de `CONTEXTO.md`);
  - dominio propio (opcional);
  - activar Cloudflare Web Analytics (opcional);
  - enlaces públicos de WaDirecto, Texto Chimbo y ROI Express si se publican.
