"""Browser regression tests: failed imports, quiz rules (5 questions, 4 right), cache refresh, backup restore.
Run from the repo root:  python3 tests/e2e/batch1.py     (needs: pip install playwright && playwright install chromium)"""
import http.server, threading, functools, json, os, sys, tempfile, re
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

STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False,
  'modules': [{'id': 'm1', 'code': 'NET', 'name': 'Networks', 'kw': 'network', 'h': 215, 'units': 4, 'titles': ['One', 'Two', 'Three', 'Four'], 'base': {}}]}]}

VOC = ['router','packet','protocol','segment','address','gateway','frame','switch','subnet','header','payload','checksum','session','buffer','socket','firewall','tunnel','latency','bandwidth','datagram']
DEFS = ['Latency is the time a packet needs to travel from the sender to the receiver across the network.','Bandwidth is the maximum amount of data that a link can transfer in a given period of time.','A router is a device that forwards packets between different networks using their destination address.','Throughput describes the amount of data that is actually delivered over a link per second.','A firewall is a system that filters network traffic according to a set of security rules.','A switch is a device that connects computers inside one local network and forwards frames by hardware address.','A gateway is a node that connects two networks which use different protocols for communication.','A socket is an endpoint that lets a program send and receive data over a network connection.','Jitter is the variation in the delay of packets that arrive at the receiver over time.','A subnet is a logical part of an IP network that is created by splitting a larger address range.']
def lecture(n=70, tag=''):
    return ' '.join(DEFS) + ' ' + lecture_old(n, tag)
def lecture_old(n=70, tag=''):
    out = []
    for i in range(n):
        a, b, c, d, e = [VOC[(i * k + j) % len(VOC)] for j, k in enumerate((1, 3, 5, 7, 9))]
        out.append('The %s %s uses the %s together with the %s to deliver every %s reliably across the whole network today%s.' % (a, 'design', b, c, d, tag))
    return ' '.join(out)

def fresh(b):
    c = b.new_context(viewport={'width': 1100, 'height': 900}, accept_downloads=True)
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    # test hook: make IndexedDB writes fail on demand
    pg.add_init_script("""(function(){var p=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){
      if(window.__failAll||(window.__failName&&v&&v.name===window.__failName)){throw new DOMException('x',window.__failErr||'DataError');}
      return p.apply(this,arguments);};})();""")
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(500)
    return c, pg, errs

def add_files(pg, files):
    pg.goto(URL + '#/port'); pg.wait_for_timeout(300)
    pg.set_input_files('#fi', [{'name': n, 'mimeType': 'text/plain', 'buffer': t.encode()} for n, t in files]); pg.wait_for_timeout(900)

def toast(pg): return pg.inner_text('#toast')
def bank(pg, k='m1:1'): return pg.evaluate("k=>JSON.parse(localStorage.getItem('booklyn:bank:'+k)||'null')", k)
def pending_rows(pg):
    t = pg.locator('[data-a="togready"]')
    if t.count() and t.get_attribute('aria-expanded') == 'false': t.click()
    return pg.locator('.pfile').count()

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- 1. failed imports ----------
    c, pg, errs = fresh(b)
    pg.evaluate("window.__failName='NET_week1_bad.txt'")
    add_files(pg, [('NET_week1_a.txt', 'aaa'), ('NET_week1_bad.txt', 'bbb'), ('NET_week1_c.txt', 'ccc')])
    check('failed import: good files are listed', pending_rows(pg) == 2, pending_rows(pg))
    check('failed import: message says one could not be saved', 'could not be saved' in toast(pg), toast(pg))
    body = pg.inner_text('body')
    check('failed import: failed file is named with a retry button', 'NET_week1_bad.txt' in body and pg.locator('[data-a="retryfailed"]').count() == 1)
    pg.evaluate("window.__failName=null"); pg.click('[data-a="retryfailed"]'); pg.wait_for_timeout(900)
    check('retry adds only the failed file', pending_rows(pg) == 3, pending_rows(pg))
    check('retry list is gone after success', pg.locator('[data-a="retryfailed"]').count() == 0)
    add_files(pg, [('NET_week1_a.txt', 'aaa'), ('NET_week1_bad.txt', 'bbb')])
    check('picking the same files again creates no duplicates', pending_rows(pg) == 3, pending_rows(pg))

    # import confirmation only after the write is confirmed
    pg.evaluate("window.__failAll=true"); pg.click('[data-a="import"]'); pg.wait_for_timeout(700)
    check('import failure: clear error shown', 'Import failed' in toast(pg), toast(pg))
    check('import failure: files stay in the Port', pending_rows(pg) == 3)
    check('import failure: nothing marked as imported', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).lastImport.length") == 0)
    pg.evaluate("window.__failAll=false"); pg.click('[data-a="import"]'); pg.wait_for_timeout(700)
    check('import retry succeeds', '3 files imported' in toast(pg), toast(pg))
    check('no page errors (import)', not errs, errs)
    c.close()

    # storage full: the rest of the batch is reported, nothing is lost silently
    c, pg, errs = fresh(b)
    pg.evaluate("window.__failName='NET_week1_b.txt';window.__failErr='QuotaExceededError'")
    add_files(pg, [('NET_week1_a.txt', 'aaa'), ('NET_week1_b.txt', 'bbb'), ('NET_week1_c.txt', 'ccc')])
    check('storage full: first file saved', pending_rows(pg) == 1, pending_rows(pg))
    check('storage full: message says storage is full', 'full' in toast(pg).lower(), toast(pg))
    check('storage full: the other two are in the retry list', pg.locator('.card[role="alert"] li').count() == 2)
    c.close()

    # ---------- 2. quiz rules ----------
    c, pg, errs = fresh(b)
    add_files(pg, [('NET_week1_lecture.txt', lecture())]); pg.click('[data-a="import"]'); pg.wait_for_timeout(600)
    pg.goto(URL + '#/m/m1/1/study'); pg.wait_for_timeout(300); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(1500)
    check('quiz has 5 questions', 'question 1 of 5' in pg.inner_text('body').lower(), pg.inner_text('body')[:300])
    check('quiz states the 4 of 5 (80 %) rule', '4 of 5' in pg.inner_text('body') and '80 %' in pg.inner_text('body'))
    check('quiz shows the source file, no invented page', 'Source: NET_week1_lecture.txt' in pg.inner_text('body') and ', p.' not in pg.inner_text('.card'))
    bk = bank(pg)
    answer_of = lambda text: next(q['a'] for q in bk['q'] if q['q'] == text)
    def play(correct_flags):
        asked = []
        for ok in correct_flags:
            text = pg.inner_text('h2'); a = answer_of(text); asked.append(text)
            pick = a if ok else (a + 1) % 4
            pg.click('[data-a="pick"][data-i="%d"]' % pick); pg.click('[data-a="nextq"]'); pg.wait_for_timeout(100)
        return asked
    asked1 = play([True, True, True, False, False])
    body = pg.inner_text('body')
    check('3 of 5 does not pass', '3 of 5. One more pass.' in body and 'The light is on' not in body, body[:300])
    check('result lists the missed questions', 'Review what you missed' in body)
    lit = pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('booklyn:state')).lit)")
    check('failed quiz does not light the floor', lit == [], lit)
    missed = asked1[3:]
    pg.click('[data-a="retry"]'); pg.wait_for_timeout(1500)
    second = []
    for i in range(5):
        text = pg.inner_text('h2'); second.append(text); a = answer_of(text)
        pg.click('[data-a="pick"][data-i="%d"]' % (a if i < 4 else (a + 1) % 4)); pg.click('[data-a="nextq"]'); pg.wait_for_timeout(100)
    check('questions answered wrong come back first', all(m in second for m in missed), (missed, second))
    body = pg.inner_text('body')
    check('4 of 5 passes', 'The light is on' in body and 'Quiz passed: 4 of 5' in body, body[:300])
    pg.wait_for_timeout(400)
    how = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).how")
    check('light is recorded as quiz-passed', how.get('m1:1') == 'quiz', how)

    # ---------- 3. cache refresh ----------
    n_before = len(bank(pg)['q'])
    add_files(pg, [('NET_week1_second.txt', lecture(70, ' again').replace('router', 'modem').replace('packet', 'octet'))]); pg.click('[data-a="import"]'); pg.wait_for_timeout(600)
    pg.goto(URL + '#/m/m1/1/study'); pg.wait_for_timeout(300); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(1800)
    fks = {q['fk'] for q in bank(pg)['q']}
    check('adding a file adds questions for it', len(fks) == 2 and len(bank(pg)['q']) > n_before, (len(fks), n_before, len(bank(pg)['q'])))
    # remove the first file
    pg.goto(URL + '#/m/m1/1'); pg.wait_for_timeout(400)
    pg.click('[data-a="del1"] >> nth=0'); pg.click('[data-a="del2"]'); pg.wait_for_timeout(500)
    pg.goto(URL + '#/m/m1/1/study'); pg.wait_for_timeout(300); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(1800)
    files_left = pg.evaluate("()=>new Promise(r=>{var q=indexedDB.open('booklyn');q.onsuccess=()=>{var t=q.result.transaction('meta').objectStore('meta').getAll();t.onsuccess=()=>r(t.result.map(x=>x.name))}})")
    names = {q['file'] for q in bank(pg)['q']}
    check('removing a file drops its questions', len(files_left) == 1 and names <= set(files_left), (files_left, names))
    check('no page errors (quiz)', not errs, errs)
    c.close()

    # ---------- 4. fewer than 5 questions ----------
    c, pg, errs = fresh(b)
    add_files(pg, [('NET_week1_tiny.txt', 'The router forwards packets. ' * 30)]); pg.click('[data-a="import"]'); pg.wait_for_timeout(600)
    pg.goto(URL + '#/m/m1/1/study'); pg.wait_for_timeout(300); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(1500)
    body = pg.inner_text('body')
    check('too little material: explained, no short quiz', 'No quiz this time' in body and 'question 1 of' not in body.lower(), body[:300])
    check('too little material: self-check is labelled as not a quiz', 'self-check (not a quiz)' in body.lower())
    pg.check('[data-c="self"] >> nth=0'); pg.check('[data-c="self"] >> nth=1'); pg.click('[data-a="finishself"]'); pg.wait_for_timeout(300)
    body = pg.inner_text('body')
    check('self-check result says reviewed, not quiz passed', 'Reviewed by self-check' in body and 'Quiz passed' not in body, body[:300])
    how = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).how")
    check('self-check is recorded separately', how.get('m1:1') == 'self', how)
    c.close()

    # ---------- 5. demo quizzes ----------
    c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500); pg.click('[data-a="demo"]'); pg.wait_for_timeout(800)
    pg.goto(URL + '#/'); pg.wait_for_timeout(200)
    mod = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).sems.find(s=>s.demo).modules.map(m=>m.id+':'+m.code)")
    bscm = [m for m in mod if m.endswith('BSCM')][0].split(':')[0]
    pg.goto(URL + '#/m/%s/6/study' % bscm); pg.wait_for_timeout(300); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(500)
    check('demo quiz has 5 questions', 'question 1 of 5' in pg.inner_text('body').lower(), pg.inner_text('body')[:200])
    c.close()

    # ---------- 6. full backup and restore ----------
    c, pg, errs = fresh(b)
    add_files(pg, [('NET_week1_lecture.txt', lecture()), ('NET_week2_notes.txt', 'Second file about week two. ' * 20)]); pg.click('[data-a="import"]'); pg.wait_for_timeout(600)
    pg.evaluate("s=>{var x=JSON.parse(localStorage.getItem('booklyn:state'));x.coins=321;x.deco={m1:{tree:2,lamp:true}};x.notes={'m1:1':'my note'};x.lit={'m1:1':1700000000000};x.deadlines=[{id:'d1',date:'2026-11-03',mod:'m1',kind:'Exam',title:'Midterm'}];localStorage.setItem('booklyn:state',JSON.stringify(x))}", 0)
    pg.reload(); pg.wait_for_timeout(500)
    pg.goto(URL + '#/m/m1/1/study'); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(1500)   # creates a question bank
    pg.goto(URL + '#/settings'); pg.wait_for_timeout(500)
    body = pg.inner_text('body')
    check('settings explains synced vs this-device data', 'this device only' in body and 'Synced with your account: yes' in body)
    tmp = tempfile.mkdtemp(); path = os.path.join(tmp, 'full.ndjson')
    with pg.expect_download() as d: pg.click('[data-a="dlfull"]')
    d.value.save_as(path); pg.wait_for_timeout(500)
    check('full backup file created', os.path.getsize(path) > 2000 and d.value.suggested_filename.endswith('.ndjson'), d.value.suggested_filename)
    lines = open(path).read().strip().split('\n')
    check('backup has header, state, bank, 2 files and an end line', json.loads(lines[0])['kind'] == 'booklyn-full-backup' and sum('"t":"file"' in l for l in lines) == 2 and '"t":"end"' in lines[-1] and any('"t":"bank"' in l for l in lines), len(lines))

    # wipe everything on the device
    pg.click('[data-a="reset1"]'); pg.click('[data-a="reset2"]'); pg.wait_for_timeout(600)
    pg.goto(URL + '#/settings'); pg.wait_for_timeout(400)
    check('device is empty after reset', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).sems.length") == 0)
    pg.set_input_files('#bkfile', path); pg.wait_for_timeout(1500)
    body = pg.inner_text('body')
    check('restore shows a summary before changing anything', 'The backup was checked and nothing has been changed yet' in body and '2 files' in body and 'Merge' in body and 'Replace' in body, body[-700:])
    check('nothing restored before choosing', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).sems.length") == 0)
    pg.click('[data-a="rreplace"]'); pg.wait_for_timeout(1500)
    st = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
    check('restore: progress back (coins, notes, deco, deadline, lit)', st['coins'] == 321 and st['notes'].get('m1:1') == 'my note' and st['deco']['m1']['tree'] == 2 and st['deadlines'][0]['title'] == 'Midterm' and 'm1:1' in st['lit'], st)
    names = pg.evaluate("()=>new Promise(r=>{var q=indexedDB.open('booklyn');q.onsuccess=()=>{var t=q.result.transaction('meta').objectStore('meta').getAll();t.onsuccess=()=>r(t.result.map(x=>x.name+':'+x.status+':'+x.mod+':'+x.unit).sort())}})")
    check('restore: files back with their module and unit', names == ['NET_week1_lecture.txt:imported:m1:1', 'NET_week2_notes.txt:imported:m1:2'], names)
    blob_ok = pg.evaluate("()=>new Promise(r=>{var q=indexedDB.open('booklyn');q.onsuccess=()=>{var t=q.result.transaction('blobs').objectStore('blobs').getAll();t.onsuccess=()=>Promise.all(t.result.map(b=>b.text())).then(x=>r(x.map(s=>s.length).sort((a,b)=>a-b)))}})")
    check('restore: file contents intact', len(blob_ok) == 2 and blob_ok[0] == len('Second file about week two. ' * 20), blob_ok)
    check('restore: question bank back', bank(pg) is not None and len(bank(pg)['q']) >= 5)

    # merge keeps this device's data and adds the rest
    pg.evaluate("x=>{var s=JSON.parse(localStorage.getItem('booklyn:state'));s.coins=900;localStorage.setItem('booklyn:state',JSON.stringify(s))}", 0)
    pg.reload(); pg.wait_for_timeout(500); pg.goto(URL + '#/settings'); pg.wait_for_timeout(300)
    pg.set_input_files('#bkfile', path); pg.wait_for_timeout(1500); pg.click('[data-a="rmerge"]'); pg.wait_for_timeout(1200)
    st = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
    count = pg.evaluate("()=>new Promise(r=>{var q=indexedDB.open('booklyn');q.onsuccess=()=>{var t=q.result.transaction('meta').objectStore('meta').count();t.onsuccess=()=>r(t.result)}})")
    check('merge: higher coin count kept, no duplicate files', st['coins'] == 900 and count == 2, (st['coins'], count))

    # damaged backups are refused and change nothing
    raw = open(path).read().split('\n')
    i = next(k for k, l in enumerate(raw) if '"t":"file"' in l); o = json.loads(raw[i]); o['data'] = o['data'][:-8] + 'AAAAAAAA'; raw[i] = json.dumps(o)
    bad = os.path.join(tmp, 'bad.ndjson'); open(bad, 'w').write('\n'.join(raw))
    trunc = os.path.join(tmp, 'trunc.ndjson'); open(trunc, 'w').write('\n'.join(raw[:-2]))
    for f, label in ((bad, 'tampered'), (trunc, 'truncated')):
        before = pg.evaluate("localStorage.getItem('booklyn:state')")
        pg.set_input_files('#bkfile', f); pg.wait_for_timeout(1200)
        check('%s backup is refused with a clear message' % label, 'Nothing was changed' in toast(pg) and pg.locator('#restorebox').count() == 0, toast(pg))
        check('%s backup changes nothing' % label, pg.evaluate("localStorage.getItem('booklyn:state')") == before)
    junk = os.path.join(tmp, 'junk.json'); open(junk, 'w').write('hello')
    pg.set_input_files('#bkfile', junk); pg.wait_for_timeout(800)
    check('a random file is refused', 'not a' in toast(pg).lower() and 'Nothing was changed' in toast(pg), toast(pg))

    # a hostile pasted backup (script in an id) is refused
    bad_state = {'schema': 1, 'sems': [{'id': 'a"><img src=x onerror=alert(1)>', 'modules': []}], 'deadlines': [], 'lastImport': []}
    pg.evaluate("document.querySelector('details').open=true")
    pg.fill('#bk', json.dumps(bad_state)); pg.click('[data-a="restore"]'); pg.wait_for_timeout(600)
    check('hostile pasted backup is refused', 'not a valid' in toast(pg).lower() and pg.locator('#restorebox').count() == 0, toast(pg))

    # light backup still works
    with pg.expect_download() as d2: pg.click('[data-a="dlbackup"]')
    light = os.path.join(tmp, 'light.json'); d2.value.save_as(light)
    pg.set_input_files('#bkfile', light); pg.wait_for_timeout(1000)
    check('light backup shows the same choice (merge or replace)', pg.locator('#restorebox').count() == 1 and 'Progress backup' in pg.inner_text('#restorebox'))
    pg.click('[data-a="rcancel"]')
    check('no page errors (backup)', not errs, errs)
    c.close()
    b.close()

print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASSED'); sys.exit(1 if FAILS else 0)
