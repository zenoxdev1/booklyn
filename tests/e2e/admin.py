"""Browser tests: admin accounts (unlimited coins) and the dev tools gate.
Run from the repo root:  python3 tests/e2e/admin.py"""
import http.server, threading, functools, json, os, sys
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

MODS = [{'id': 'm1', 'code': 'NET', 'name': 'Networks', 'kw': 'network', 'h': 215, 'units': 4, 'titles': ['One', 'Two', 'Three', 'Four'], 'base': {}}]
def state(coins): return {'schema': 1, 'name': 'T', 'activeSem': 's1', 'coins': coins, 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': MODS}]}

def open_page(b, me, coins=0, unl=False, dev=False):
    c = b.new_context(viewport={'width': 1100, 'height': 1000}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/api/me', lambda r: r.fulfill(status=200 if me else 401, content_type='application/json', body=json.dumps(me or {'ok': False})))
    pg.goto(URL)
    pg.evaluate("a=>{localStorage.setItem('booklyn:state',JSON.stringify(a[0]));if(a[1])localStorage.setItem('booklyn:unl','1');if(a[2])localStorage.setItem('booklyn:dev','1');}", [state(coins), unl, dev])
    pg.reload(); pg.wait_for_timeout(700)
    return c, pg, errs
def coins(pg): pg.wait_for_timeout(400); return pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).coins")

with sync_playwright() as p:
    b = p.chromium.launch()

    # a normal signed-in account sees no admin tools
    c, pg, errs = open_page(b, {'ok': True, 'kind': 'email', 'email': 'user@x.ch', 'uid': '5', 'admin': False}, coins=10)
    pg.goto(URL + '#/settings'); pg.wait_for_timeout(600)
    check('normal account: no admin tools', pg.locator('#devtools').count() == 0)
    check('normal account: unlimited flag in storage does nothing', pg.evaluate("localStorage.setItem('booklyn:unl','1')") is None)
    c.close()

    # admin account: tools are open, coins can be set, unlimited makes the shop free
    c, pg, errs = open_page(b, {'ok': True, 'kind': 'email', 'email': 'boss@x.ch', 'uid': '1', 'admin': True}, coins=0)
    pg.goto(URL + '#/settings'); pg.wait_for_selector('#devtools', timeout=5000)
    check('admin account: the tools show and say so', 'Admin tools' in pg.inner_text('#devtools') and 'This account is an admin' in pg.inner_text('#devtools'))
    pg.fill('#admcoins', '12345'); pg.click('[data-a="tcoinsset"]')
    check('admin can set an exact coin balance', coins(pg) == 12345, coins(pg))
    pg.click('[data-a="tcoins"][data-n="100000"]')
    check('admin can add 100,000 coins', coins(pg) == 112345, coins(pg))
    pg.fill('#admcoins', '-5'); pg.click('[data-a="tcoinsset"]'); pg.wait_for_timeout(200)
    check('a negative balance is refused', coins(pg) == 112345)
    pg.fill('#admcoins', '999999999'); pg.click('[data-a="tcoinsset"]'); pg.wait_for_timeout(200)
    check('an absurd balance is refused', coins(pg) == 112345)

    pg.fill('#admcoins', '0'); pg.click('[data-a="tcoinsset"]')
    check('without unlimited, an empty purse cannot buy', coins(pg) == 0)
    pg.goto(URL + '#/shop'); pg.wait_for_timeout(500)
    dis = pg.locator('[data-a="buy"][data-item="shield"]').is_disabled()
    check('shop Buy is disabled with 0 coins', dis and coins(pg) == 0, (dis, coins(pg)))
    pg.goto(URL + '#/settings'); pg.wait_for_selector('#devtools')
    pg.check('input[data-c="unl"]'); pg.wait_for_timeout(500)
    check('unlimited tops the balance up', coins(pg) == 999999, coins(pg))
    pg.goto(URL + '#/shop'); pg.wait_for_timeout(500)
    en = not pg.locator('[data-a="buy"][data-item="shield"]').is_disabled()
    check('unlimited: Buy is enabled', en)
    pg.click('[data-a="buy"][data-item="shield"]'); pg.wait_for_timeout(300)
    sh = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).shields||0")
    check('unlimited: a purchase works and costs nothing', sh == 1 and coins(pg) == 999999, (sh, coins(pg)))
    check('no page errors (admin)', not errs, errs)
    c.close()

    # signed out: even with the old dev flag the public tools stay hidden when not on a local address is covered by devOn();
    # here (local address) the flag still works for developers
    c, pg, errs = open_page(b, None, coins=0, dev=True)
    pg.goto(URL + '#/settings'); pg.wait_for_timeout(600)
    check('local development address: ?dev flag still opens the testing tools', pg.locator('#devtools').count() == 1 and 'Testing tools' in pg.inner_text('#devtools'))
    check('testing tools do not offer unlimited coins', pg.locator('input[data-c="unl"]').count() == 0)
    c.close()

    # signing out removes admin powers
    c, pg, errs = open_page(b, {'ok': True, 'kind': 'email', 'email': 'boss@x.ch', 'uid': '1', 'admin': True}, coins=0, unl=True)
    pg.route('**/api/auth/logout', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
    pg.goto(URL + '#/settings'); pg.wait_for_selector('#devtools')
    check('admin shows unlimited as on', pg.locator('input[data-c="unl"]').is_checked())
    pg.evaluate("document.querySelector('[data-a=sylogout]')&&document.querySelector('[data-a=sylogout]').click()"); pg.wait_for_timeout(600)
    check('after sign-out the admin tools disappear', pg.locator('#devtools').count() == 0)
    c.close()
    b.close()

print('\nALL PASSED' if not FAILS else '\nFAILED: ' + ', '.join(FAILS))
sys.exit(1 if FAILS else 0)
