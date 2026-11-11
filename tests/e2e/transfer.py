"""Browser test: moving files between two devices of one account with a real WebRTC connection.
The server part (signalling) is replaced by a small in-memory copy of functions/api/rtc.
Run from the repo root:  python3 tests/e2e/transfer.py"""
import http.server, threading, functools, json, os, time, copy
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/app/index.html' % srv.server_address[1]
FAILS = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)[:300]) if (extra and not cond) else ''))
    if not cond: FAILS.append(name)

# ---- in-memory signalling, same rules as functions/api/_rtclib.mjs ----
ROWS = []; NEXT = [1]; LOCK = threading.Lock()
def signal(route):
    try: _signal(route)
    except Exception as e:
        print('SIGNAL ERROR', repr(e), flush=True)
        try: route.fulfill(status=500, body='{}')
        except Exception: pass
def _signal(route):
    r = route.request; m = r.method
    from urllib.parse import urlparse, parse_qs
    q = parse_qs(urlparse(r.url).query)
    status, body = 200, {'ok': False}
    with LOCK:   # no Playwright call inside the lock: fulfilling a route can run another handler
        now = int(time.time() * 1000)
        ROWS[:] = [x for x in ROWS if x['created_at'] > now - 600000]
        if m == 'GET':
            dev = q['device'][0]; since = int(q.get('since', ['0'])[0])
            rows = [x for x in ROWS if x['id'] > since and x['from_dev'] != dev and (x['to_dev'] is None or x['to_dev'] == dev)]
            body = {'ok': True, 'rows': rows[:100], 'now': now}
        else:
            b = json.loads(r.post_data or '{}')
            if m == 'POST':
                ROWS.append({'id': NEXT[0], 'from_dev': b['from'], 'to_dev': b.get('to') or None, 'session': b['session'], 'kind': b['kind'], 'payload': b['payload'], 'created_at': now}); NEXT[0] += 1
                body = {'ok': True, 'id': NEXT[0] - 1}
            elif m == 'DELETE':
                ROWS[:] = [x for x in ROWS if x['from_dev'] != b['device']]
                body = {'ok': True}
            else: status = 405
    route.fulfill(status=status, content_type='application/json', body=json.dumps(body))

def mod(i, code): return {'id': i, 'code': code, 'name': code, 'kw': '', 'h': 20, 'units': 6, 'titles': ['Week %d' % k for k in range(1, 7)], 'base': {}}
STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': [mod('mc', 'MATH')]}]}

def device(b, w, touch=False):
    c = b.new_context(viewport={'width': w, 'height': 900}, has_touch=touch, is_mobile=touch); pg = c.new_page(); errs = []; pg.set_default_timeout(20000)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    c.route('**/api/me', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'kind': 'code', 'uid': 'u1'})))
    c.route('**/api/state', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'state': None, 'updatedAt': 0}) if r.request.method == 'GET' else json.dumps({'ok': True, 'updatedAt': 1})))
    c.route('**/api/rtc/ice', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'iceServers': []})))
    c.route('**/api/rtc/signal*', signal)
    print('goto', w, flush=True); pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE)
    pg.goto(URL + '#/port'); pg.reload(); pg.wait_for_timeout(1200); print('ready', w, flush=True)
    return c, pg, errs

def add(pg, files):
    pg.evaluate("""async(list)=>{const dt=new DataTransfer();list.forEach(([n,len])=>{let s='';while(s.length<len)s+=n+' '+Math.random().toString(36)+'\\n';dt.items.add(new File([s.slice(0,len)],n,{type:'text/plain'}))});
      const i=document.getElementById('fi');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));}""", files)
    pg.wait_for_timeout(1500)

META = """new Promise(r=>{const q=indexedDB.open('booklyn');q.onsuccess=()=>{const t=q.result.transaction(['meta','blobs']);const ms=t.objectStore('meta').getAll(),bk=t.objectStore('blobs').getAllKeys(),bv=t.objectStore('blobs').getAll();
  t.oncomplete=async()=>{const out={};for(const m of ms.result){const blob=bv.result[bk.result.indexOf(m.id)];const h=blob?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>('0'+x.toString(16)).slice(-2)).join(''):null;
  out[m.name]={id:m.id,status:m.status,mod:m.mod,unit:m.unit,size:m.size,hash:h,metaHash:m.hash}};r(out)}}})"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
    
    ca, pa, ea = device(b, 1100)          # the computer
    cb, pb, eb = device(b, 412, True)           # the phone
    add(pa, [('MATH_week02_notes.txt', 3000), ('MATH_week03_big.txt', 2_500_000), ('MATH_week04_slides.txt', 60_000)])
    pa.click('[data-a="import"]'); pa.wait_for_timeout(1000)
    pa.wait_for_selector('[data-a="xsend"]'); pb.wait_for_selector('[data-a="xrecv"]')
    A = pa.evaluate(META)
    check('the computer holds three imported files', len(A) == 3 and all(v['status'] == 'imported' for v in A.values()), A)
    check('both devices see the move-files card', pa.locator('[data-a="xsend"]').count() == 1 and pb.locator('[data-a="xrecv"]').count() == 1)
    check('the phone offers Receive first', pb.evaluate("document.querySelector('#xfer [data-a]').dataset.a") == 'xrecv')

    # ---- full transfer ----
    pb.click('[data-a="xrecv"]'); pb.wait_for_timeout(500)
    check('receiver is told to press Send on the other device', 'Send my files' in pb.inner_text('#xfer'))
    pa.click('[data-a="xsend"]')
    pb.wait_for_selector('[data-a="xyes"]', timeout=30000)
    ask = pb.inner_text('#xfer')
    check('receiver is asked before anything is stored', '3 files' in ask and pb.evaluate(META) == {}, ask)
    pb.click('[data-a="xyes"]')
    pa.wait_for_function("document.querySelector('#xfer')&&document.querySelector('#xfer').innerText.includes('Done.')", timeout=60000)
    pb.wait_for_function("document.querySelector('#xfer')&&document.querySelector('#xfer').innerText.includes('Done.')", timeout=20000)
    B = pb.evaluate(META)
    check('all three files arrived', sorted(B) == sorted(A), B.keys())
    check('same ids, module, floor and status', all(B[k]['id'] == A[k]['id'] and B[k]['mod'] == A[k]['mod'] and B[k]['unit'] == A[k]['unit'] and B[k]['status'] == A[k]['status'] for k in A), (A, B))
    check('content is identical (SHA-256 of the stored bytes)', all(B[k]['hash'] == A[k]['hash'] for k in A))
    check('both sides say how many files were moved', 'Files moved: 3' in pa.inner_text('#xfer') and 'Files moved: 3' in pb.inner_text('#xfer'), (pa.inner_text('#xfer'), pb.inner_text('#xfer')))
    pa.click('[data-a="xclose"]'); pb.click('[data-a="xclose"]'); pb.wait_for_timeout(500)
    check('no connection messages are left on the server after a transfer', [x['kind'] for x in ROWS] == [], [x['kind'] for x in ROWS])

    # ---- the floors on the phone now have files ----
    pb.goto(URL + '#/m/mc'); pb.wait_for_timeout(800)
    mt = pb.inner_text('body')
    check('the phone module page now shows files on the floors', '1 file' in mt and mt.count('No files yet') <= 3, mt[:500])

    # ---- nothing missing: second run moves nothing ----
    pa.goto(URL + '#/port'); pb.goto(URL + '#/port'); pa.wait_for_timeout(600); pb.wait_for_timeout(600)
    pb.click('[data-a="xrecv"]'); pb.wait_for_timeout(400); pa.click('[data-a="xsend"]')
    try: pa.wait_for_function("document.querySelector('#xfer')&&document.querySelector('#xfer').innerText.includes('Nothing to move')", timeout=40000)
    except Exception:
        print('DEBUG A:', pa.inner_text('#xfer').replace('\n', ' | '), '\nDEBUG B:', pb.inner_text('#xfer').replace('\n', ' | '), '\nROWS', [(x['kind'], x['from_dev'][:4], x['to_dev'] and x['to_dev'][:4], x['session'][:4]) for x in ROWS], flush=True)
    check('a second run says there is nothing to move', 'Nothing to move' in pa.inner_text('#xfer'))
    pb.wait_for_function("document.querySelector('#xfer')&&document.querySelector('#xfer').innerText.includes('Nothing to move')", timeout=20000)
    pa.click('[data-a="xclose"]'); pb.click('[data-a="xclose"]')

    # ---- the receiver can say no ----
    add(pa, [('MATH_week05_extra.txt', 5000)]); pa.click('[data-a="import"]'); pa.wait_for_timeout(800)
    pb.click('[data-a="xrecv"]'); pb.wait_for_timeout(400); pa.click('[data-a="xsend"]')
    pb.wait_for_selector('[data-a="xno"]', timeout=30000)
    check('only the missing file is offered', '1 file' in pb.inner_text('#xfer'), pb.inner_text('#xfer'))
    pb.click('[data-a="xno"]')
    pa.wait_for_function("document.querySelector('#xfer')&&document.querySelector('#xfer').innerText.includes('declined')", timeout=30000)
    check('declining stores nothing', 'MATH_week05_extra.txt' not in pb.evaluate(META))
    pa.click('[data-a="xclose"]')

    # ---- cancel while waiting ----
    pa.click('[data-a="xsend"]'); pa.wait_for_timeout(400)
    pa.click('[data-a="xcancel"]'); pa.wait_for_timeout(300)
    check('cancelling returns to the start', pa.locator('[data-a="xsend"]').count() == 1 or 'Cancelled' in pa.inner_text('#xfer'))
    check('no page errors on either device', not ea and not eb, (ea, eb))
    b.close()

print('\nFAILED: %s' % FAILS if FAILS else '\nALL PASS')
raise SystemExit(1 if FAILS else 0)
