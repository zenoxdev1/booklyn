"""Browser tests: Android "Share > Booklyn" (share target through the service worker) and
"Combine both" when the cloud copy and this device differ.
Run from the repo root:  python3 tests/e2e/share_sync.py"""
import http.server, threading, functools, json, os, copy
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d' % srv.server_address[1]
URL = BASE + '/app/index.html'
FAILS = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (extra and not cond) else ''))
    if not cond: FAILS.append(name)

def mod(i, code): return {'id': i, 'code': code, 'name': code, 'kw': '', 'h': 20, 'units': 4, 'titles': ['Week %d' % k for k in range(1, 5)], 'base': {}}
STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': [mod('mc', 'MATH')]}], 'lit': {'mc:1': 5}}

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- share target ----------
    c = b.new_context(viewport={'width': 412, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_function("navigator.serviceWorker.controller!==null||true"); pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); pg.wait_for_timeout(600)
    pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE)
    pg.reload(); pg.wait_for_function("navigator.serviceWorker.controller!==null", timeout=15000); pg.wait_for_timeout(300)
    check('manifest declares a share target', json.load(open(os.path.join(ROOT, 'app', 'manifest.webmanifest')))['share_target']['action'] == '/app/share-target')
    post = """async()=>{const fd=new FormData();
      fd.append('files',new File(['Slides about limits'],'MATH_week02_limits.txt',{type:'text/plain'}));
      fd.append('files',new File(['Second shared note'],'Notes shared from Drive.txt',{type:'text/plain'}));
      const r=await fetch('/app/share-target',{method:'POST',body:fd,redirect:'manual'});
      const k=await caches.open('booklyn-share');return [r.type,(await k.keys()).length];}"""
    t, n = pg.evaluate(post)
    check('the service worker answers the POST with a redirect and keeps both files', t == 'opaqueredirect' and n == 2, (t, n))
    pg.goto(URL + '?shared=1#/port'); pg.wait_for_timeout(1200)
    body = pg.inner_text('body')
    check('the Port reports both shared files as added', '2 files added' in body, body[-300:])
    check('the cache is emptied after the import', pg.evaluate("caches.open('booklyn-share').then(c=>c.keys()).then(k=>k.length)") == 0)
    check('?shared is removed from the address', 'shared=' not in pg.url, pg.url)
    # sharing the same file again does not create a duplicate
    pg.evaluate(post); pg.reload(); pg.wait_for_timeout(1200)
    names = pg.evaluate("new Promise(r=>{const q=indexedDB.open('booklyn');q.onsuccess=()=>{const t=q.result.transaction('meta');t.objectStore('meta').getAll().onsuccess=e=>r(e.target.result.map(x=>x.name))}})")
    check('the same file shared twice is stored once', sorted(names) == ['MATH_week02_limits.txt', 'Notes shared from Drive.txt'], names)
    check('no page errors while sharing', not errs, errs)
    # a new service worker version keeps files that wait in the cache
    pg.evaluate("caches.open('booklyn-share').then(c=>c.put('shared/keep',new Response('x',{headers:{'X-Name':'keep.txt'}})))")
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())"); pg.wait_for_timeout(500)
    check('cache booklyn-share is not removed by SW activation', pg.evaluate("caches.keys().then(k=>k.includes('booklyn-share'))"))
    # offline notice and the phone tip
    c.set_offline(True); pg.wait_for_timeout(300)
    check('offline notice appears when the connection drops', pg.is_visible('#offline') and 'offline' in pg.inner_text('#offline').lower())
    c.set_offline(False); pg.wait_for_timeout(300)
    check('offline notice disappears when back online', not pg.is_visible('#offline'))
    c.close()
    c = b.new_context(viewport={'width': 412, 'height': 900}, has_touch=True, is_mobile=True); pg = c.new_page()
    pg.goto(URL); pg.wait_for_timeout(500); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.goto(URL + '#/port'); pg.reload(); pg.wait_for_timeout(800)
    t2 = dict(STATE); t2['lastImport'] = ['gone-1', 'gone-2']
    pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", t2); pg.reload(); pg.wait_for_timeout(1000)
    txt = pg.inner_text('body')
    check('Port has no Undo, no Imported card and no sample-files prompt when this device holds no imported files', 'Undo this import' not in txt and 'Nothing waiting' not in txt and 'sample files' not in txt, txt[-400:])
    check('phones see the Share tip in the Port', pg.locator('[data-tip="share"]').count() == 1)
    c.close()
    c = b.new_context(viewport={'width': 1200, 'height': 900}); pg = c.new_page()
    pg.goto(URL); pg.wait_for_timeout(500); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.goto(URL + '#/port'); pg.reload(); pg.wait_for_timeout(800)
    check('desktop does not see the Share tip', pg.locator('[data-tip="share"]').count() == 0)
    c.close()

    # ---------- courses that are not organised by weeks: file names with topics, chapters or a leading number ----------
    TS = copy.deepcopy(STATE)
    em = mod('ec', 'ECON'); em['ul'] = 'topic'; em['kw'] = 'business'; em['units'] = 8; em['titles'] = ['Topic %d' % k for k in range(1, 9)]
    wm = mod('mw', 'LAW'); wm['kw'] = 'contracts'
    TS['sems'][0]['modules'] = [em, wm]
    c = b.new_context(viewport={'width': 412, 'height': 900}); pg = c.new_page()
    pg.goto(URL); pg.wait_for_timeout(600); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", TS); pg.goto(URL + '#/port'); pg.reload(); pg.wait_for_timeout(800)
    pg.evaluate("""async()=>{const f=n=>new File(['x '+n],n,{type:'text/plain'});
      const dt=new DataTransfer();['ECON Topic 3 inflation.txt','05_Business_Cycle.txt','Thema 2 business.txt','Kapitel 4 ECON.txt','07_contracts.txt'].forEach(n=>dt.items.add(f(n)));
      const i=document.getElementById('fi');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));}""")
    pg.wait_for_timeout(1500)
    rows = pg.evaluate("new Promise(r=>{const q=indexedDB.open('booklyn');q.onsuccess=()=>{const t=q.result.transaction('meta');t.objectStore('meta').getAll().onsuccess=e=>r(Object.fromEntries(e.target.result.map(x=>[x.name,[x.mod,x.unit,x.flag]])))}})")
    check('"Topic 3" in the name puts the file on floor 3', rows.get('ECON Topic 3 inflation.txt', [0, 0])[:2] == ['ec', 3], rows)
    check('a leading number is the floor in a topic module', rows.get('05_Business_Cycle.txt', [0, 0])[:2] == ['ec', 5], rows)
    check('"Thema 2" is understood', rows.get('Thema 2 business.txt', [0, 0])[:2] == ['ec', 2], rows)
    check('"Kapitel 4" is understood', rows.get('Kapitel 4 ECON.txt', [0, 0])[:2] == ['ec', 4], rows)
    check('a leading number is NOT used in a module organised by weeks (it goes to check)', rows.get('07_contracts.txt', [0, 0, 0])[2] is True, rows)
    c.close()

    # ---------- Combine both ----------
    remote = copy.deepcopy(STATE)
    remote['sems'].append({'id': 's2', 'name': 'Sem 2', 'start': '2027-02-15', 'demo': False, 'finished': False, 'modules': [mod('mx', 'PHYS')]})
    remote['lit'] = {'mc:2': 9, 'mx:1': 7}
    pushed = []
    c = b.new_context(viewport={'width': 412, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    c.route('**/api/me', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'kind': 'code', 'uid': 'u1'})))
    def state(r):
        if r.request.method == 'GET': r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'state': remote, 'updatedAt': 500}))
        else:
            pushed.append(json.loads(r.request.post_data)); r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'updatedAt': 501}))
    c.route('**/api/state', state)
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("s=>{localStorage.setItem('booklyn:state',JSON.stringify(s));localStorage.setItem('booklyn:sync',JSON.stringify({base:300,last:1,uid:'u1',dirty:true}))}", STATE)
    pg.goto(URL + '#/account'); pg.reload(); pg.wait_for_timeout(1500); pg.wait_for_selector('[data-a="symerge"]', timeout=10000)
    check('conflict offers Combine both next to the two old choices', pg.locator('[data-a="sycloud"]').count() == 1 and pg.locator('[data-a="sydevice"]').count() == 1)
    pg.click('[data-a="symerge"]'); pg.wait_for_timeout(800)
    check('the merged copy was pushed on top of the cloud copy', len(pushed) == 1 and pushed[0]['base'] == 500, [x.get('base') for x in pushed])
    if pushed:
        st = pushed[0]['state']
        check('both semesters are in the merged copy', sorted(s['id'] for s in st['sems']) == ['s1', 's2'], [s['id'] for s in st['sems']])
        check('lights from both sides are kept', set(st['lit']) == {'mc:1', 'mc:2', 'mx:1'}, st['lit'])
    check('a safety copy of this device was kept', pg.evaluate("!!localStorage.getItem('booklyn:state.beforesync')"))
    check('the conflict notice is gone', pg.locator('[data-a="symerge"]').count() == 0)
    check('no page errors while merging', not errs, errs)
    c.close(); b.close()

print('\nFAILED: %s' % FAILS if FAILS else '\nALL PASS')
raise SystemExit(1 if FAILS else 0)
