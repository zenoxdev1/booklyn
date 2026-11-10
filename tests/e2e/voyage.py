"""Browser tests: the port opens the Learning Port, importing plays the boat voyage (one colour per subject), back to the campus.
Run from the repo root:  python3 tests/e2e/voyage.py"""
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

def mod(i, code, kw, h):
    return {'id': 'm%d' % i, 'code': code, 'name': code + ' course', 'kw': kw, 'h': h, 'units': 4, 'titles': ['One', 'Two', 'Three', 'Four'], 'base': {}}
STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False,
  'modules': [mod(1, 'NET', 'network', 215), mod(2, 'DAT', 'data', 20), mod(3, 'LAW', 'law', 130)]}]}

def fresh(b, reduce=False):
    c = b.new_context(viewport={'width': 1100, 'height': 900}, reduced_motion='reduce' if reduce else 'no-preference')
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(500)
    return c, pg, errs

def add_files(pg, files):
    pg.goto(URL + '#/port'); pg.wait_for_timeout(300)
    pg.set_input_files('#fi', [{'name': n, 'mimeType': 'text/plain', 'buffer': t.encode()} for n, t in files]); pg.wait_for_timeout(900)

FILES = [('NET_week1_a.txt', 'aaa net'), ('NET_week1_b.txt', 'bbb net'), ('DAT_week2_c.txt', 'ccc data')]

with sync_playwright() as p:
    b = p.chromium.launch()
    c, pg, errs = fresh(b)
    # the Port page can always go back to the campus
    pg.goto(URL + '#/port'); pg.wait_for_timeout(300)
    check('Port page has a back button to the campus', pg.locator('main button[data-to="#/"]').count() == 1 and '← Campus' in pg.inner_text('main'))
    pg.click('main button[data-to="#/"]'); pg.wait_for_timeout(300)
    check('back button leads to the campus', pg.evaluate('location.hash') in ('#/', '', '#'), pg.evaluate('location.hash'))
    # the port in the city opens the Learning Port
    check('the city has a clickable port', pg.locator('.cityv .portbtn').count() == 1)
    pg.locator('.cityv .phit').click(force=True); pg.wait_for_timeout(400)
    check('clicking the port opens the Learning Port', pg.evaluate('location.hash') == '#/port' and 'learning port' in pg.inner_text('main').lower(), pg.evaluate('location.hash'))

    # import: two subjects, so two boats of two colours
    add_files(pg, FILES)
    pg.click('[data-a="import"]')
    seen = {'boat': 0, 'colors': set(), 'small': 0, 'arrive': 0}
    for _ in range(120):
        pg.wait_for_timeout(120)
        r = pg.evaluate("""()=>({n:document.querySelectorAll('.voy #deptg .mv .vboat').length,
          h:[...document.querySelectorAll('.voy #deptg .mv .vboat')].map(e=>e.getAttribute('style')),
          a:document.querySelectorAll('.voy .bgrp.arrive').length,done:!!document.querySelector('.voy [data-a="go"][data-to="#/"]')})""")
        seen['boat'] = max(seen['boat'], r['n']); seen['arrive'] = max(seen['arrive'], r['a'])
        for s in r['h']:
            seen['colors'].add(s.split(';')[0])
        if seen['boat'] == 1 and not seen.get('shot'):
            pg.screenshot(path='/tmp/voyage1.png'); seen['shot'] = 1
        if r['done']: break
    check('boats appeared while importing', seen['boat'] >= 1, seen)
    check('one colour per subject (two subjects, two colours)', len(seen['colors']) == 2, seen['colors'])
    check('a building lit up when its delivery arrived', seen['arrive'] >= 1, seen)
    check('voyage finishes with a way to the campus', pg.locator('.voy [data-a="go"][data-to="#/"]').count() == 1)
    check('card shows Delivered and a legend per subject', 'Delivered' in pg.inner_text('.voy') and 'NET · 2' in pg.inner_text('.voy') and 'DAT · 1' in pg.inner_text('.voy'), pg.inner_text('.voy'))
    pg.screenshot(path='/tmp/voyage2.png')
    pg.click('.voy [data-a="vskip"]'); pg.wait_for_timeout(200)
    check('closing removes the card', pg.locator('.voy').count() == 0)

    # skip while sailing
    add_files(pg, [('NET_week2_x.txt', 'x net'), ('LAW_week1_y.txt', 'y law')])
    pg.click('[data-a="import"]'); pg.wait_for_timeout(500)
    check('card is there while sailing', pg.locator('.voy #deptg').count() == 1)
    pg.click('.voy [data-a="vskip"]'); pg.wait_for_timeout(300)
    check('skip stops everything', pg.locator('.voy').count() == 0 and pg.locator('.voy #deptg').count() == 0)
    check('the files are imported anyway', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).lastImport.length") == 2)
    # leaving the page ends the voyage cleanly
    add_files(pg, [('NET_week3_z.txt', 'z net')])
    pg.click('[data-a="import"]'); pg.wait_for_timeout(400)
    pg.goto(URL + '#/'); pg.wait_for_timeout(500)
    pg.goto(URL + '#/port'); pg.wait_for_timeout(300)
    check('no voyage left behind after leaving the page', pg.locator('.voy').count() == 0)
    check('no page errors (voyage)', not errs, errs)
    c.close()

    # reduced motion: no animation card at all
    c, pg, errs = fresh(b, True)
    add_files(pg, FILES); pg.click('[data-a="import"]'); pg.wait_for_timeout(1200)
    check('reduced motion: no voyage', pg.locator('.voy').count() == 0 and 'Imported' in pg.inner_text('main'))
    check('no page errors (reduced motion)', not errs, errs)
    c.close()
    b.close()
print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASS')
sys.exit(1 if FAILS else 0)
