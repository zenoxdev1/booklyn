"""Re-creates the three landing screenshots from the demo semester.  python3 tools/shots.py"""
import http.server, threading, functools, os, io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/app/index.html' % srv.server_address[1]
def save(png, name, size):
    im = Image.open(io.BytesIO(png)).convert('RGB').resize(size, Image.LANCZOS)
    im.save(os.path.join(ROOT, 'assets', name), 'WEBP', quality=82, method=6)
with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(w, h, dsf):
        c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, locale='en-GB')
        pg = c.new_page(); pg.goto(URL); pg.evaluate("localStorage.setItem('booklyn:lang','en')"); pg.reload(); pg.wait_for_timeout(500)
        pg.click('[data-a="demo"]'); pg.wait_for_timeout(1500)
        return pg
    pg = ctx(1100, 720, 1)
    save(pg.screenshot(), 'shot-campus.webp', (1100, 720))
    pg = ctx(390, 760, 2)
    save(pg.screenshot(), 'shot-phone.webp', (780, 1520))
    pg.goto(URL + '#/shop'); pg.wait_for_timeout(900)
    save(pg.screenshot(), 'shot-shop.webp', (780, 1520))
    b.close()
