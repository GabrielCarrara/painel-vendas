from PIL import Image
from pathlib import Path

src = Path(
    r"C:\Users\gabri\.cursor\projects\c-Users-gabri-painel-vendas\assets"
    r"\c__Users_gabri_AppData_Roaming_Cursor_User_workspaceStorage_5f2953b8719e7f4bdf3039b186ca496d_images_F_nix_SEM_FUNDO-6b1ab96a-3d88-44a7-9354-380654e1a87a.png"
)
img = Image.open(src).convert("RGBA")
w, h = img.size
px = img.load()

removed = 0
text_px = 0
kept = 0

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        mx = max(r, g, b)
        mn = min(r, g, b)
        sat = mx - mn

        # Fundo preto sólido (quase sem saturação)
        if mx <= 10 and sat <= 8:
            px[x, y] = (0, 0, 0, 0)
            removed += 1
            continue

        # Texto carvão (~29,29,27) e antialias do texto → preto sólido
        if mx <= 75 and sat <= 22:
            # Intensidade relativa ao fundo: quanto mais claro, mais opaco o preto
            strength = min(255, int(255 * (mx / 35.0)))
            px[x, y] = (18, 18, 18, max(a, strength if mx >= 12 else a))
            if mx >= 12:
                px[x, y] = (18, 18, 18, 255)
            text_px += 1
            continue

        # Fênix colorida e acento laranja do X — manter
        kept += 1

# Recortar ao conteúdo opaco
bbox = img.getbbox()
cropped = img.crop(bbox)
pad = 24
out = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
out.paste(cropped, (pad, pad), cropped)

out1 = Path(r"c:\Users\gabri\painel-vendas\src\assets\logo-preta.png")
out2 = Path(r"c:\Users\gabri\painel-vendas\public\logo-preta.png")
preview = Path(r"c:\Users\gabri\painel-vendas\src\assets\logo-preta-preview-white.png")
out.save(out1)
out.save(out2)

white = Image.new("RGB", out.size, (255, 255, 255))
white.paste(out, mask=out.split()[-1])
white.save(preview)

print(f"size={out.size} removed={removed} text={text_px} color={kept} bytes={out1.stat().st_size}")
