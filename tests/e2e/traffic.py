"""Browser tests: cars and people on the streets, shop tab, try before buying, saved purchases, calm mode.
Run from the repo root:  python3 tests/e2e/traffic.py"""
import http.server, threading, functools, os, sys
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
def state(**kw):
    s = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'coins': 20, 'sems': [
        {'id': 's1', 'name': 'Semester 1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': [mod(1, 'NET', 215), mod(2, 'DAT', 20), mod(3, 'LAW', 130), mod(4, 'ART', 330)]}]}
    s.update(kw); return s
OWN = {'cars': [{'id': 'c1', 't': 'sedan', 'h': 5}, {'id': 'c2', 't': 'bus', 'h': 120}, {'id': 'c3', 't': 'taxi', 'h': 48}],
       'peds': [{'id': 'p1', 'k': 'person', 'h': 200}, {'id': 'p2', 'k': 'dog', 'h': 30}, {'id': 'p3', 'k': 'kid', 'h': 320}, {'id': 'p4', 'k': 'jogger', 'h': 55}]}
def stored(pg): return pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
def load(pg, s, hash_='#/'):
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", s); pg.goto(URL + hash_); pg.reload(); pg.wait_for_timeout(700)
def sorted_ok(pg):
    ds = pg.evaluate("Array.from(document.querySelectorAll('#deptg > g[data-d]')).map(e=>+e.getAttribute('data-d'))")
    return all(ds[i] <= ds[i + 1] + 1e-9 for i in range(len(ds) - 1)), len(ds)

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    load(pg, state(traffic=OWN))
    check('owned cars and people appear on the campus', pg.locator('#deptg .mv[data-k="tr"] .vcar').count() == 3 and pg.locator('#deptg .mv[data-k="tr"] .vped').count() == 4,
          (pg.locator('#deptg .mv[data-k="tr"] .vcar').count(), pg.locator('#deptg .mv[data-k="tr"] .vped').count()))
    a = pg.locator('#deptg .mv[data-k="tr"]').first.inner_html(); h1 = pg.locator('#deptg').inner_html(); pg.wait_for_timeout(1200)
    check('they move', pg.locator('#deptg').inner_html() != h1)
    ok, n = sorted_ok(pg)
    check('cars and people sit among the buildings by depth (never drawn over a building in front)', ok and n > 5, n)
    # many frames: still sorted and counts stable
    allok = True
    for _ in range(8):
        pg.wait_for_timeout(250); o, _n = sorted_ok(pg); allok = allok and o
    check('depth order holds while they move', allok)
    check('no taxi/other overflow: every mover is inside the picture', pg.evaluate("""()=>{const v=document.querySelector('#citysvg').viewBox.baseVal;
      return Array.from(document.querySelectorAll('#deptg .mv[data-k=tr]')).every(e=>{const q=e.getBBox();return q.x>v.x&&q.x+q.width<v.x+v.width&&q.y>v.y&&q.y+q.height<v.y+v.height;});}"""))
    check('movers do not catch clicks', pg.evaluate("getComputedStyle(document.querySelector('#deptg .mv[data-k=tr] .vcar')).pointerEvents") == 'none')
    check('no page errors', not errs, errs)

    # shop tab
    load(pg, state(traffic={'cars': [], 'peds': []}), '#/shop')
    pg.click('[data-a="shoptab"][data-tab="traf"]'); pg.wait_for_timeout(500)
    check('traffic tab lists 6 cars and 4 people at 1 coin', pg.locator('[data-a="trbuy"]').count() == 10 and pg.locator('[data-a="trtry"]').count() == 10)
    coins0 = stored(pg)['coins']
    pg.click('[data-a="trtry"][data-type="bus"]'); pg.wait_for_timeout(500)
    check('try shows the item with a marker, charges nothing', pg.locator('#shopcity .trring').count() == 1 and stored(pg)['coins'] == coins0 and 'Nothing is bought yet' in pg.inner_text('main'))
    check('the try drives (it is a car in the picture)', pg.locator('#shopcity .mv[data-k="tr"] .vcar').count() == 1)
    pg.click('[data-a="trhue"][data-h="265"]'); pg.wait_for_timeout(400)
    check('colour change keeps the preview', pg.locator('#shopcity .trring').count() == 1 and '265' in (pg.locator('#shopcity .vcar').first.get_attribute('style') or ''))
    pg.click('[data-a="trbuy"][data-type="bus"]'); pg.wait_for_timeout(500)
    s = stored(pg)
    check('buying costs 1 coin and is saved', s['coins'] == coins0 - 1 and len(s['traffic']['cars']) == 1 and s['traffic']['cars'][0]['t'] == 'bus' and s['traffic']['cars'][0]['h'] == 265, s.get('traffic'))
    check('the try marker is gone and the bought bus drives', pg.locator('#shopcity .trring').count() == 0 and pg.locator('#shopcity .mv[data-k="tr"] .vcar').count() == 1)
    pg.click('[data-a="trbuy"][data-type="dog"]'); pg.wait_for_timeout(500)
    s = stored(pg)
    check('a person can be bought too', len(s['traffic']['peds']) == 1 and s['traffic']['peds'][0]['k'] == 'dog' and s['coins'] == coins0 - 2)
    pg.reload(); pg.wait_for_timeout(700)
    pg.click('[data-a="shoptab"][data-tab="traf"]'); pg.wait_for_timeout(500)
    check('purchases survive a reload', pg.locator('#shopcity .vcar').count() == 1 and pg.locator('#shopcity .vped').count() == 1)
    pg.click('[data-a="trdel"]'); pg.wait_for_timeout(500)
    check('send away removes it', len(stored(pg)['traffic']['cars']) + len(stored(pg)['traffic']['peds']) == 1)

    # not enough coins
    load(pg, state(coins=0, traffic={'cars': [], 'peds': []}), '#/shop')
    pg.click('[data-a="shoptab"][data-tab="traf"]'); pg.wait_for_timeout(400)
    check('buy is disabled without coins, with a reason', pg.locator('[data-a="trbuy"]:not([disabled])').count() == 0 and 'more coins needed' in pg.inner_text('main'))

    # streets full
    full = {'cars': [{'id': 'f%d' % i, 't': 'sedan', 'h': 10} for i in range(12)], 'peds': []}
    load(pg, state(coins=50, traffic=full), '#/shop')
    pg.click('[data-a="shoptab"][data-tab="traf"]'); pg.wait_for_timeout(400)
    n = pg.locator('#shopcity .vcar').count(); txt = pg.inner_text('main')
    check('when the streets are full cars cannot be bought', pg.locator('[data-a="trbuy"][data-kind="car"]:not([disabled])').count() == 0 and 'The streets are full' in txt and n <= 12, n)

    # calm mode: a still picture
    c2 = b.new_context(viewport={'width': 1100, 'height': 900}, reduced_motion='reduce'); q = c2.new_page()
    load(q, state(traffic=OWN))
    h1 = q.locator('#deptg').inner_html(); q.wait_for_timeout(1000)
    check('reduced motion: they are shown but stand still', q.locator('#deptg .mv[data-k="tr"]').count() == 7 and q.locator('#deptg').inner_html() == h1)

    # off-screen: no work while the picture is not visible
    load(pg, state(traffic=OWN))
    pg.evaluate("window.scrollTo(0, 99999)"); pg.set_viewport_size({'width': 1100, 'height': 300})
    pg.evaluate("document.querySelector('.city').style.marginTop='1500px'"); pg.wait_for_timeout(300)
    h1 = pg.locator('#deptg').inner_html(); pg.wait_for_timeout(800)
    check('paused while off-screen', pg.locator('#deptg').inner_html() == h1)
    b.close()
print('FAILS:', FAILS); sys.exit(1 if FAILS else 0)
