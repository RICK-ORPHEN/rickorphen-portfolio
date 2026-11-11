import sys, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]; which = sys.argv[2] if len(sys.argv) > 2 else 'desktop'
vp = {'desktop': {'width': 1440, 'height': 810}, 'mobile': {'width': 390, 'height': 780}}[which]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport=vp, device_scale_factor=1, has_touch=(which == 'mobile'), is_mobile=(which == 'mobile'))
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    pg.goto('http://localhost:4173/', wait_until='networkidle')
    pg.mouse.move(vp['width'] * 0.7, vp['height'] * 0.35)
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{out}/{which}-1-hero.png')
    for i, sel in enumerate(['#works', '#about', '#contact']):
        pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{behavior:'instant'}})")
        if sel == '#works': pg.evaluate("window.scrollBy(0, 260)")
        pg.wait_for_timeout(2200)
        pg.screenshot(path=f'{out}/{which}-{i+2}-{sel[1:]}.png')
    print('\n'.join(logs[:20]) or 'no console errors')
    print(json.dumps(pg.evaluate("({w: document.documentElement.scrollWidth, vw: innerWidth, webgl: !document.documentElement.classList.contains('no-webgl'), fonts: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)})")))
    b.close()
