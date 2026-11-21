# Generates the PWA icons into public/icons (needs Pillow). Run once; the PNG files are committed.
from PIL import Image, ImageDraw, ImageFont
import os
BLUE, ORANGE, WHITE = (11, 94, 215), (230, 126, 0), (255, 255, 255)
def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/Library/Fonts/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()
def draw(size, maskable):
    S = size * 4                                       # draw big, then shrink for smooth edges
    im = Image.new('RGBA', (S, S), BLUE if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if not maskable: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BLUE)
    scale = 0.62 if maskable else 0.78                 # maskable: keep everything inside the central safe zone
    box = S * scale; off = (S - box) / 2
    f = font(int(box * 0.80)); d.text((S / 2, S * 0.47), 'A', font=f, fill=WHITE, anchor='mm')
    bar_w, bar_h = box * 0.46, S * 0.045
    d.rounded_rectangle([S / 2 - bar_w / 2, off + box * 0.80, S / 2 + bar_w / 2, off + box * 0.80 + bar_h], radius=int(bar_h / 2), fill=ORANGE)
    return im.resize((size, size), Image.LANCZOS)
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons'); os.makedirs(out, exist_ok=True)
draw(192, False).save(os.path.join(out, 'icon-192.png'))
draw(512, False).save(os.path.join(out, 'icon-512.png'))
draw(512, True).save(os.path.join(out, 'icon-maskable-512.png'))
draw(180, True).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'))
draw(32, False).save(os.path.join(out, 'favicon-32.png'))
