import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
names = {
 'cockpit':'401954-5ywgkp','opdocs':'427033-cykjks','keyless':'415188-dg63uf',
 'studio':'877199-k7sjv8','corp':'988867-8v4vpn','academy':'995551-yo1cv5',
 'body':'432980-3yai34','jibungoto':'446807-lrb668',
}
crops = {'opdocs': (0, 62, 968, 744), 'keyless': (0, 0, 968, 682)}
# the mouse pointer sits at about (485, 380) in these captures: cover it with the plain background beside it
cursor = {'cockpit': 0, 'keyless': 0, 'opdocs': 0}
import glob, os
def halftone(im, cell=7, color=(27,44,224)):
    g = np.asarray(im.convert('L'), dtype=np.float32)/255.0
    H, W = g.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    c, s = np.cos(np.pi/4), np.sin(np.pi/4)
    u = xx*c + yy*s; v = -xx*s + yy*c
    cu = (np.floor(u/cell)+0.5)*cell; cv = (np.floor(v/cell)+0.5)*cell
    px = np.clip(cu*c - cv*s, 0, W-1).astype(int); py = np.clip(cu*s + cv*c, 0, H-1).astype(int)
    lum = g[py, px]
    ink = (1-lum) if g.mean() > 0.4 else np.clip(lum*2.6, 0, 1)**0.8
    r = np.sqrt(np.clip(ink, 0, 1))*cell*0.74
    d = np.hypot(u-cu, v-cv)
    a = np.clip(r - d + 0.6, 0, 1)
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = color
    rgba[..., 3] = (a*255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')
for name, key in names.items():
    f = glob.glob(os.path.join(src, f'*{key}*'))[0]
    im = Image.open(f).convert('RGB')
    if name in cursor: im.paste(im.crop((506, 364, 530, 398)), (476, 364))
    if name in crops: im = im.crop(crops[name])
    W, H = im.size
    # paint over the mouse pointer captured near the centre of the frame
    bx0, by0, bx1, by1 = int(W*0.485), int(H*0.47), int(W*0.525), int(H*0.60)
    patch = im.crop((bx0-(bx1-bx0)-6, by0, bx0-6, by1))
    if name == 'studio':
        im.paste(patch, (bx0, by0))
    im = im.resize((1200, round(H*1200/W)), Image.LANCZOS)
    im.save(os.path.join(out, f'{name}.webp'), quality=82)
    halftone(im).save(os.path.join(out, f'{name}-ht.webp'), lossless=False, quality=80)
    print(name, im.size)
