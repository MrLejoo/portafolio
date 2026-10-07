# Genera versiones de 800 px ("-800w.webp") de las imágenes grandes de src/assets/img.
# El build las usa en srcset para que los móviles descarguen la mitad de datos.
# Uso (requiere Pillow): python scripts/variantes.py   ← ejecútalo tras añadir imágenes nuevas.
# Omite stickers, miniaturas ya reducidas, variantes existentes y capturas muy largas (se recorren con scroll).
import os, glob
from PIL import Image

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets', 'img')
ANCHO = 800
nuevas = 0
for ruta in glob.glob(os.path.join(RAIZ, '**', '*.webp'), recursive=True):
    rel = os.path.relpath(ruta, RAIZ).replace('\\', '/')
    if rel.startswith('stickers/') or rel.endswith(('-800w.webp', '-sm.webp')):
        continue
    destino = ruta[:-5] + '-800w.webp'
    with Image.open(ruta) as im:
        w, h = im.size
        if w <= ANCHO * 1.25 or h > w * 2.2:
            continue
        if os.path.exists(destino) and os.path.getmtime(destino) >= os.path.getmtime(ruta):
            continue
        im.resize((ANCHO, round(h * ANCHO / w)), Image.LANCZOS).save(destino, 'WEBP', quality=78, method=6)
        nuevas += 1
print(f'{nuevas} variantes nuevas de {ANCHO} px')
