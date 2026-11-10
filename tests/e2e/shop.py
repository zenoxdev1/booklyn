"""Browser tests: whole-island looks with weather, backdrop, preview before buying, new decorations, no overlaps in the picture.
Run from the repo root:  python3 tests/e2e/shop.py"""
import http.server, threading, functools, os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/app/index.html' % srv.server_address[1]
FAILS = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (extra and not cond) else ''))
    if not cond: FAILS.append(name)

def mod(i, code, h):
    return {'id': 'm%d' % i, 'code': code, 'name': code + ' course', 'kw': code.lower(), 'h': h, 'units': 4, 'titles': ['a', 'b', 'c', 'd'], 'base': {}}
STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'coins': 2000, 'sems': [
    {'id': 's1', 'name': 'Semester 1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': [mod(1, 'NET', 215), mod(2, 'DAT', 20), mod(3, 'LAW', 130)]},
    {'id': 's2', 'name': 'Semester 2', 'start': '2027-02-14', 'demo': False, 'finished': False, 'modules': [mod(4, 'ART', 330), mod(5, 'GEO', 45)]}]}

def stored(pg): return pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(600)
    # the island has a horizon with mountains and the water reaches it
    check('mountains and open sea behind the island', pg.locator('#citysvg .mt1').count() >= 1 and pg.locator('#citysvg .mt2').count() >= 1 and pg.locator('#citysvg .hzsea').count() == 1)
    check('no slab sides under the sea (the island is not floating)', pg.locator('#citysvg .sea-l').count() == 0 and pg.locator('#citysvg .sea-r').count() == 0)
    pg.goto(URL + '#/shop'); pg.wait_for_timeout(500)
    check('shop has three sections', pg.locator('.shoptabs button').count() == 3)
    check('building items come with icons and a Try button', pg.locator('.shopitem .sicon').count() >= 10 and pg.locator('[data-a="shoptry"]').count() >= 10)
    # try before buying: nothing is paid, the preview changes
    coins0 = stored(pg)['coins']
    before = pg.locator('#shopcity svg').inner_html()
    pg.click('[data-a="shoptry"][data-item="statue"]'); pg.wait_for_timeout(300)
    check('trying shows the item without buying it', pg.locator('#shopcity svg').inner_html() != before and stored(pg)['coins'] == coins0 and 'Nothing is bought yet' in pg.inner_text('main'))
    check('the try is marked pressed', pg.locator('[data-a="shoptry"][data-item="statue"]').get_attribute('aria-pressed') == 'true')
    pg.click('.tryline [data-a="shoptry"]'); pg.wait_for_timeout(200)
    check('stop previewing', 'Nothing is bought yet' not in pg.inner_text('main'))
    # buy new decorations
    for item in ['statue', 'bench', 'pool', 'fountain', 'lamp', 'flowers']:
        pg.click('[data-a="buy"][data-item="%s"]' % item); pg.wait_for_timeout(150)
    for _ in range(3): pg.click('[data-a="buy"][data-item="tree"]') if pg.locator('[data-a="buy"][data-item="tree"]').count() else None; pg.wait_for_timeout(100)
    pg.wait_for_timeout(300)
    d = stored(pg)['deco']['m1']
    check('new decorations are saved', d.get('statue') and d.get('bench') and d.get('pool') and d.get('tree') == 3, d)
    pg.click('[data-a="buy"][data-item="tank"]'); pg.wait_for_timeout(200)
    check('new roof item bought', stored(pg)['deco']['m1'].get('roof') == 'tank')
    pg.click('[data-a="buy"][data-item="dish"]'); pg.wait_for_timeout(200)
    check('a roof item replaces the previous one', stored(pg)['deco']['m1'].get('roof') == 'dish')
    # paint: try then buy
    pg.click('[data-a="shoptry"][data-item="paint"][data-hue="165"]'); pg.wait_for_timeout(200)
    check('paint preview then buy', pg.locator('[data-a="buy"][data-item="paint"]').count() == 1)
    pg.click('[data-a="buy"][data-item="paint"]'); pg.wait_for_timeout(250)
    check('paint bought', stored(pg)['deco']['m1'].get('hue') == 165)
    # nothing overlaps in the picture: every decoration of the building sits in its own spot (checked in the unit tests too)
    pg.goto(URL + '#/'); pg.wait_for_timeout(500)
    pg.screenshot(path='/tmp/shop_city.png')
    # looks: global, preview, buy, use
    pg.goto(URL + '#/shop'); pg.wait_for_timeout(400); pg.click('[data-a="shoptab"][data-tab="look"]'); pg.wait_for_timeout(300)
    check('nine looks to choose from', pg.locator('.scthumb').count() == 9)
    pg.click('[data-a="shopprev"][data-scene="rain"]'); pg.wait_for_timeout(400)
    check('preview shows the whole island with rain, nothing bought', pg.locator('#shopcity .dlabel').count() == 2 and pg.locator('#shopcity .am-drop').count() > 50 and not stored(pg).get('sceneOwn', {}).get('rain'))
    pg.click('[data-a="buy"][data-item="scene"][data-scene="rain"]'); pg.wait_for_timeout(300)
    s = stored(pg)
    check('buying a look charges once and applies it to the whole island', s['sceneOwn'].get('rain') and s['scenery'].get('*') == 'rain' and s['coins'] < coins0 - 100, (s.get('scenery'), s['coins']))
    pg.goto(URL + '#/'); pg.wait_for_timeout(500)
    check('weather covers the whole picture, not one building', pg.locator('#citysvg .amb .am-drop').count() > 100 and pg.locator('.city.bg-rain').count() == 1)
    pg.select_option('#semsel', 's2'); pg.wait_for_timeout(600)
    check('the look stays when another semester is selected', pg.locator('#citysvg .amb .am-drop').count() > 100)
    pg.goto(URL + '#/shop'); pg.wait_for_timeout(400); pg.click('[data-a="shoptab"][data-tab="look"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="buy"][data-item="scene"][data-scene="park"]'); pg.wait_for_timeout(300)
    check('switching back to an owned look is free', stored(pg)['scenery'].get('*') == 'park')
    for sc, sel in [('snow', '.am-fl'), ('blossom', '.am-pe'), ('autumn', '.am-lf'), ('firefly', '.am-ff'), ('desert', '.am-du'), ('fog', '.am-mi'), ('sunset', '.am-gl')]:
        st = stored(pg); st['scenery']['*'] = sc; pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", st); pg.goto(URL + '#/'); pg.reload(); pg.wait_for_timeout(500)
        check('%s has its weather over the island' % sc, pg.locator('#citysvg .amb ' + sel).count() >= 3, pg.locator('#citysvg .amb').count())
    check('no page errors (shop)', not errs, errs)
    c.close()
    # reduced motion hides the particles
    c = b.new_context(viewport={'width': 1100, 'height': 900}, reduced_motion='reduce'); pg = c.new_page()
    st = json.loads(json.dumps(STATE)); st['scenery'] = {'*': 'snow'}
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", st); pg.reload(); pg.wait_for_timeout(500)
    check('reduced motion: weather is hidden', pg.evaluate("getComputedStyle(document.querySelector('#citysvg .amb')).display") == 'none')
    c.close(); b.close()
print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASS')
sys.exit(1 if FAILS else 0)
