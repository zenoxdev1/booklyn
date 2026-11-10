"""Browser tests: all semesters on one connected island, focus on the selected semester, only it is interactive, see-all button.
Run from the repo root:  python3 tests/e2e/island.py"""
import http.server, threading, functools, os, sys, re
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

def mod(i, code, h, units=4):
    return {'id': 'm%d' % i, 'code': code, 'name': code + ' course', 'kw': code.lower(), 'h': h, 'units': units, 'titles': ['t%d' % u for u in range(units)], 'base': {}}
def sem(i, name, mods):
    return {'id': 's%d' % i, 'name': name, 'start': '2026-0%d-14' % (i + 1), 'demo': False, 'finished': i == 1, 'modules': mods}
STATE = {'schema': 1, 'name': 'T', 'activeSem': 's2', 'sems': [
    sem(1, 'Semester 1', [mod(1, 'NET', 215), mod(2, 'DAT', 20), mod(3, 'LAW', 130), mod(4, 'MAT', 300), mod(5, 'PRG', 60)]),
    sem(2, 'Semester 2', [mod(6, 'ECO', 170), mod(7, 'BIO', 90)]),
    sem(3, 'Semester 3', [mod(8, 'ART', 330), mod(9, 'GEO', 45), mod(10, 'CHE', 250)])]}

def tr(pg):
    t = pg.evaluate("document.querySelector('#cityg').getAttribute('transform')")
    m = re.match(r'translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)', t)
    return tuple(float(x) for x in m.groups())

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(700)
    pg.locator('.city').first.screenshot(path='/tmp/island_focus.png')
    check('one island with a district per semester', pg.locator('#citysvg .bgrp').count() == 10 and pg.locator('#citysvg .dlabel').count() == 3, pg.locator('#citysvg .bgrp').count())
    check('one shared port', pg.locator('#citysvg .portbtn').count() == 1)
    check('every district has a pier', pg.locator('#citysvg .umb').count() == 3)
    check('only the selected semester is interactive', pg.locator('#citysvg .bgrp[data-a="go"]').count() == 2, pg.locator('#citysvg .bgrp[data-a="go"]').count())
    check('other districts are dimmed but visible', pg.locator('#citysvg .dim .bgrp').count() >= 8)
    k0 = tr(pg)[2]
    check('the selected district is zoomed in', k0 > 1.05, tr(pg))
    # select another semester: the view glides there
    pg.select_option('#semsel', 's1'); pg.wait_for_timeout(120)
    mid = tr(pg); pg.wait_for_timeout(700); end = tr(pg)
    check('selecting a semester moves the view smoothly', mid != end and end != tr(pg) or mid != end, (mid, end))
    check('selection changes which district is interactive', pg.locator('#citysvg .bgrp[data-a="go"]').count() == 5 and 's1' == pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).activeSem"))
    pg.locator('.city').first.screenshot(path='/tmp/island_s1.png')
    # all together
    check('see-all button exists', pg.locator('[data-a="cityall"]').count() == 1)
    pg.click('[data-a="cityall"]'); pg.wait_for_timeout(800)
    check('see all: whole island in view', tr(pg)[2] == 1.0 and 'Focus on this semester' in pg.inner_text('.cityrow'), tr(pg))
    check('see all: buildings of the selected semester stay clickable', pg.locator('#citysvg .bgrp[data-a="go"]').count() == 5)
    pg.locator('.city').first.screenshot(path='/tmp/island_all.png')
    pg.click('[data-a="cityall"]'); pg.wait_for_timeout(800)
    check('back to focus', tr(pg)[2] > 1.05 and 'See all semesters' in pg.inner_text('.cityrow'))
    pg.select_option('#semsel', 's3'); pg.wait_for_timeout(900)
    check('third semester focused', pg.locator('#citysvg .bgrp[data-a="go"]').count() == 3)
    # a click on a building of the selected semester opens it
    pg.locator('#citysvg .bgrp[data-a="go"]').first.dispatch_event('click'); pg.wait_for_timeout(400)
    check('selected district building opens', '#/m/' in pg.evaluate('location.hash'), pg.evaluate('location.hash'))
    # the port from the island
    pg.goto(URL + '#/'); pg.wait_for_timeout(500)
    pg.locator('.cityv .phit').click(force=True); pg.wait_for_timeout(400)
    check('port opens the Learning Port from any semester', pg.evaluate('location.hash') == '#/port')
    pg.click('main button[data-to="#/"]'); pg.wait_for_timeout(500)
    check('back to the campus keeps the semester', pg.locator('#semsel').input_value() == 's3')
    check('no page errors (island)', not errs, errs)
    c.close()
    # single semester stays exactly as before
    c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    st = dict(STATE); st['sems'] = STATE['sems'][:1]; st['activeSem'] = 's1'
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", st); pg.reload(); pg.wait_for_timeout(700)
    check('one semester: no labels, no see-all button, view at 1:1', pg.locator('.dlabel').count() == 0 and pg.locator('[data-a="cityall"]').count() == 0 and tr(pg) == (0.0, 0.0, 1.0), tr(pg))
    check('no page errors (single)', not errs, errs)
    c.close(); b.close()
print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASS')
sys.exit(1 if FAILS else 0)
