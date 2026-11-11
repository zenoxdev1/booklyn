"""Phone screenshots for the manifest and Google Play (1080x2160) and the 1024x500 feature graphic.  python3 tools/play-shots.py"""
import http.server, threading, functools, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d' % srv.server_address[1]
URL = BASE + '/app/index.html'
OUT = os.path.join(ROOT, 'app', 'screenshots'); PLAY = os.path.join(ROOT, 'docs', 'play')
with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(w, h, dsf, touch):
        c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, locale='en-GB', has_touch=touch, is_mobile=touch)
        pg = c.new_page(); pg.goto(URL); pg.evaluate("localStorage.setItem('booklyn:lang','en')"); pg.reload(); pg.wait_for_timeout(500)
        pg.click('[data-a="demo"]'); pg.wait_for_timeout(1500)
        return pg
    pg = ctx(360, 720, 3, True)
    for name, route in [('phone-campus', '#/'), ('phone-deadlines', '#/deadlines'), ('phone-module', '#/m/math'), ('phone-shop', '#/shop')]:
        pg.goto(URL + route); pg.wait_for_timeout(900)
        pg.screenshot(path=os.path.join(OUT, name + '.png'))
    pg = ctx(1280, 800, 1, False)
    pg.screenshot(path=os.path.join(OUT, 'wide-campus.png'))
    # feature graphic
    pg = b.new_context(viewport={'width': 1024, 'height': 500}).new_page()
    import base64; icon = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, 'app', 'icon-512.png'), 'rb').read()).decode()
    pg.set_content('''<style>*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;background:linear-gradient(135deg,#1d5c58,#143f3c);color:#f4f0e6;font-family:Georgia,serif;display:flex;align-items:center;padding:0 90px;gap:56px}
img{width:240px;height:240px;border-radius:52px;box-shadow:0 18px 40px rgba(0,0,0,.35)}h1{font-size:92px;letter-spacing:-2px;line-height:1}p{font-family:system-ui,sans-serif;font-size:38px;margin-top:18px;opacity:.9}</style>
<img src="%s"><div><h1>Booklyn</h1><p>Keep your lights on.</p></div>''' % icon)
    pg.wait_for_timeout(500)
    pg.screenshot(path=os.path.join(PLAY, 'feature-graphic-1024x500.png'))
    b.close()
