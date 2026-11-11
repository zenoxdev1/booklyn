"""Browser tests for the public landing pages (4 languages) and the per-module unit labels.
Run from the repo root:  python3 tests/e2e/landing.py"""
import http.server, threading, functools, os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d' % srv.server_address[1]
FAILS = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (extra and not cond) else ''))
    if not cond: FAILS.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    for path, lang in [('/', 'en'), ('/de/', 'de'), ('/es/', 'es'), ('/fr/', 'fr')]:
        for w in (320, 360, 768, 1280):
            c = b.new_context(viewport={'width': w, 'height': 800}); pg = c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(BASE + path); pg.wait_for_timeout(300)
            over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check('%s @%d no horizontal scroll' % (lang, w), over <= 0, over)
            if w == 320:
                check('%s html lang and no page errors' % lang, pg.get_attribute('html', 'lang') == lang and not errs, errs)
                small = pg.evaluate("""()=>[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.closest('p,li')==null&&(r.height<40)}).map(e=>e.textContent.trim().slice(0,30))""")
                check('%s tap targets of links outside text are at least 40px' % lang, not small, small)
                # the demo works in this language
                pg.locator('#demo-city .fl[aria-label*="%s"]' % ({'en': 'ready', 'de': 'bereit', 'es': 'lista', 'fr': 'prêt'}[lang])).first.dispatch_event('click')
                pg.wait_for_timeout(200)
                check('%s demo shows a question' % lang, pg.locator('#d-quiz .qo button').count() == 3)
                pg.locator('#d-quiz .qo button').first.dispatch_event('click'); pg.wait_for_timeout(100)
                check('%s demo wrong answer message is translated' % lang, bool(pg.inner_text('#d-msg').strip()))
                pg.click('#d-ff'); pg.wait_for_timeout(100)
                check('%s fast-forward updates the day' % lang, '9' in pg.inner_text('#d-day'), pg.inner_text('#d-day'))
                imgs = pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length")
                pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(500)
                imgs = pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)")
                check('%s no broken images' % lang, not imgs, imgs)
            c.close()
    # the app opens in the language the landing links to
    c = b.new_context(viewport={'width': 400, 'height': 800}, locale='en-GB'); pg = c.new_page()
    pg.goto(BASE + '/fr/'); pg.click('.topact a.btn'); pg.wait_for_timeout(600)
    check('landing link /app/?lang=fr opens the app in French', pg.get_attribute('html', 'lang') == 'fr' and pg.evaluate("localStorage.getItem('booklyn:lang')") == 'fr')
    c.close()

    # unit labels: Topics / Chapters
    def mod(i, code, ul=None):
        m = {'id': 'm%d' % i, 'code': code, 'name': code + ' course', 'kw': code.lower(), 'h': 20 + i * 90, 'units': 3, 'titles': [{'topic': 'Topic ', 'chapter': 'Chapter '}.get(ul, 'Week ') + str(n) for n in (1, 2, 3)], 'base': {}}
        if ul: m['ul'] = ul
        return m
    STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'coins': 0, 'sems': [{'id': 's1', 'name': 'S1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': [mod(1, 'AAA'), mod(2, 'BBB', 'topic'), mod(3, 'CCC', 'chapter')]}]}
    c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/app/index.html'); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(500)
    pg.goto(BASE + '/app/index.html#/m/m2'); pg.wait_for_timeout(400)
    txt = pg.inner_text('main')
    check('topic module shows Topic labels', 'Topic 1' in txt and 'Week 1' not in txt, txt[:300])
    pg.goto(BASE + '/app/index.html#/m/m3'); pg.wait_for_timeout(400)
    check('chapter module shows Chapter labels', 'Chapter 1' in pg.inner_text('main'))
    pg.goto(BASE + '/app/index.html#/m/m1'); pg.wait_for_timeout(400)
    sel = pg.locator('select[data-c="ulabel"]')
    check('module page has the organised-by selector', sel.count() == 1)
    sel.select_option('topic'); pg.wait_for_timeout(400)
    st = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
    m1 = [m for m in st['sems'][0]['modules'] if m['id'] == 'm1'][0]
    check('switching to topics renames floors and stores ul', m1.get('ul') == 'topic' and m1['titles'] == ['Topic 1', 'Topic 2', 'Topic 3'], m1)
    # a floor with a custom title keeps it
    m1['titles'][1] = 'Intro to risk'
    pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", st); pg.reload(); pg.wait_for_timeout(400)
    pg.locator('select[data-c="ulabel"]').select_option('chapter'); pg.wait_for_timeout(400)
    st = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
    m1 = [m for m in st['sems'][0]['modules'] if m['id'] == 'm1'][0]
    check('custom floor name is kept, default ones follow', m1['titles'] == ['Chapter 1', 'Intro to risk', 'Chapter 3'], m1['titles'])
    pg.locator('select[data-c="ulabel"]').select_option(''); pg.wait_for_timeout(400)
    st = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
    m1 = [m for m in st['sems'][0]['modules'] if m['id'] == 'm1'][0]
    check('back to weeks removes ul', 'ul' not in m1 and m1['titles'][0] == 'Week 1', m1)
    # German
    pg.evaluate("localStorage.setItem('booklyn:lang','de')"); pg.goto(BASE + '/app/index.html#/m/m2'); pg.reload(); pg.wait_for_timeout(500)
    check('German module page says Thema', 'Thema 1' in pg.inner_text('main') or 'Topic 1' in pg.inner_text('main'))
    check('no page errors in the unit-label flow', not errs, errs)
    b.close()
print('\n%d failed' % len(FAILS) if FAILS else '\nall passed')
raise SystemExit(1 if FAILS else 0)
