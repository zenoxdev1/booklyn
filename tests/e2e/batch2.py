"""Browser tests: ILIAS course -> module mapping, optional review of ready files, AI quiz client, honest limits.
Run from the repo root:  python3 tests/e2e/batch2.py"""
import http.server, threading, functools, json, os, sys, re, base64, urllib.parse as up
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

MODS = [
 {'id': 'mc', 'code': 'CONWB', 'name': 'Business', 'kw': '', 'h': 20, 'units': 14, 'titles': ['Week %d' % i for i in range(1, 15)], 'base': {}},
 {'id': 'm1', 'code': 'NET', 'name': 'Networks', 'kw': 'network', 'h': 215, 'units': 4, 'titles': ['One', 'Two', 'Three', 'Four'], 'base': {}}]
STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False, 'modules': MODS}]}

# ---------- fake ILIAS ----------
def page(title, body): return '<html><head><title>%s</title></head><body><h1>%s</h1>%s</body></html>' % (title, title, body)
def crs(n, i): return '<a href="/ilias/goto.php/crs/%d?client_id=hslu">%s</a>' % (i, n)
def fold(i, n): return '<a href="/ilias/goto.php?target=fold_%d">%s</a>' % (i, n)
def file(i, n): return '<div class="il-item"><a href="/ilias/ilias.php?baseClass=ilrepositorygui&cmd=sendfile&ref_id=%d">%s</a></div>' % (i, n)
COURSES = {'I.BA_CONWB.H2601': 201, 'Mystery Course 9': 202}
def render(u):
    q = up.parse_qs(up.urlparse(u).query); base = q.get('baseClass', [''])[0]; t = q.get('target', [''])[0]
    if base == 'ildashboardgui' and q.get('cmd') == ['show']: return page('Dashboard', ''.join(crs(n, i) for n, i in COURSES.items()))
    if base == 'ilmembershipoverviewgui' or q.get('cmd') == ['jumpToMemberships']: return page('My courses', ''.join(crs(n, i) for n, i in COURSES.items()))
    m = re.search(r'goto\.php/crs/(\d+)', u)
    if m:
        i = int(m.group(1)); name = [n for n, x in COURSES.items() if x == i][0]
        if i == 201: return page(name, fold(2001, 'Week 3') + file(2010, 'Syllabus.pdf'))
        return page(name, file(2020, 'notes_week2.pdf'))
    if t == 'fold_2001': return page('Week 3', file(2011, 'Slides_Intro.pdf'))
    return page('x', '')
BR = """
window.addEventListener('message',function(e){var d=e.data;if(!d||d.source!=='booklyn-app')return;
 if(d.type==='fetch'){window.pyFetch(d.url).then(function(h){window.postMessage({source:'booklyn-ilias-extension',requestId:d.requestId,response:{ok:true,url:d.url,html:h}},location.origin);});}
 if(d.type==='download'){var b=btoa('Content of '+d.name+' '+Math.random());window.postMessage({source:'booklyn-ilias-extension',requestId:d.requestId,response:{ok:true,base64:b,name:d.name,mime:'application/pdf'}},location.origin);}
});
window.postMessage({source:'booklyn-ilias-extension',type:'ready',version:'0.4.0'},location.origin);
"""

DEFS = ['Latency is the time a packet needs to travel from the sender to the receiver across the network.','Bandwidth is the maximum amount of data that a link can transfer in a given period of time.','A router is a device that forwards packets between different networks using their destination address.','Throughput describes the amount of data that is actually delivered over a link per second.','A firewall is a system that filters network traffic according to a set of security rules.','A switch is a device that connects computers inside one local network and forwards frames by hardware address.']
NODEF = ' '.join('The %s design uses the %s together with the %s every day.' % (a, b, c) for a, b, c in [('router','packet','protocol'),('socket','segment','header'),('switch','frame','buffer')] * 30)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- ILIAS: course decides the module ----------
    c = b.new_context(viewport={'width': 1100, 'height': 1000}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.expose_function('pyFetch', lambda u: render(u))
    pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(500)
    pg.goto(URL + '#/port'); pg.wait_for_timeout(400); pg.evaluate(BR); pg.wait_for_timeout(300)
    pg.click('[data-a="scanilias"]'); pg.wait_for_function("document.body.innerText.includes('readable files found')", timeout=15000)
    body = pg.inner_text('body')
    check('course matched by its name: file row names the module and week from the folder', 'looks like CONWB · week 3' in body, body[body.find('Slides_Intro'):][:200])
    check('course file without a week says so', 'CONWB · week not found' in body)
    check('unknown course asks which module it is', 'Which module is this ILIAS course?' in body and 'Mystery Course 9' in body)
    check('matched course is not asked about', body.count('Which module is this ILIAS course?') == 1 and 'I.BA_CONWB.H2601' not in pg.inner_text('[aria-label="Match ILIAS courses to modules"]'))
    pg.select_option('select[data-c="ilmap"]', 'm1'); pg.wait_for_timeout(300)
    body = pg.inner_text('body')
    check('after choosing, the question disappears and the file shows the module', 'Which module is this ILIAS course?' not in body and 'looks like NET' in body)
    saved = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).iliasCourseMap") if pg.wait_for_timeout(400) is None else None
    check('the choice is remembered', saved == {'mystery-course-9': 'm1'}, saved)
    pg.click('[data-a="iliasall"]'); pg.wait_for_function("location.hash==='#/port'&&document.querySelectorAll('.pfile, [data-a=togready]').length>0", timeout=20000); pg.wait_for_timeout(800)
    # three files arrive; the one without a week is flagged, the other two are ready
    body = pg.inner_text('body')
    check('file without a week must be checked', 'Syllabus.pdf' in body and 'week not found' in body.lower() and pg.locator('.pfile.flag').count() == 1, body[:600])
    check('ready files are collapsed by default', pg.locator('[data-a="togready"]').get_attribute('aria-expanded') == 'false' and '2 ready files' in body and 'Slides_Intro.pdf' not in pg.inner_text('.list'))
    check('direct import is available without opening the list', pg.locator('[data-a="import"]').is_enabled() and 'Import 2 files' in pg.inner_text('.actionbar'))
    pg.click('[data-a="togready"]'); pg.wait_for_timeout(300)
    body = pg.inner_text('body')
    check('review list shows files grouped by module with their week', 'CONWB' in body and 'NET' in body and pg.locator('.pfile').count() == 3, pg.locator('.pfile').count())
    row = pg.locator('.pfile:has-text("Slides_Intro.pdf")')
    check('ready row: module and week are the ILIAS-derived ones', row.locator('select[data-c="mod"]').input_value() == 'mc' and row.locator('select[data-c="unit"]').input_value() == '3')
    row2 = pg.locator('.pfile:has-text("notes_week2.pdf")')
    check('mapped course: module chosen by the student', row2.locator('select[data-c="mod"]').input_value() == 'm1')
    row.locator('select[data-c="unit"]').select_option('4'); pg.wait_for_timeout(400)
    check('assignment can be corrected in the review list', pg.locator('.pfile:has-text("Slides_Intro.pdf") select[data-c="unit"]').input_value() == '4')
    pg.click('[data-a="import"]'); pg.wait_for_timeout(700)
    check('import takes the ready files and leaves the one that needs a check', '2 files imported' in pg.inner_text('#toast') and pg.locator('.pfile').count() == 1, pg.inner_text('#toast'))
    st = pg.evaluate("()=>new Promise(r=>{var q=indexedDB.open('booklyn');q.onsuccess=()=>{var t=q.result.transaction('meta').objectStore('meta').getAll();t.onsuccess=()=>r(t.result.map(x=>x.name+':'+x.mod+':'+x.unit+':'+x.status).sort())}})")
    check('stored assignments are right', st == sorted(['Slides_Intro.pdf:mc:4:imported', 'Syllabus.pdf:mc:%s:pending' % st[1].split(':')[2], 'notes_week2.pdf:m1:2:imported']), st)
    check('no page errors (ILIAS)', not errs, errs)
    c.close()

    # ---------- AI quiz in the app ----------
    def ai_ctx(aiopt, quiz_reply, doc, calls):
        c = b.new_context(viewport={'width': 1100, 'height': 900}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        if aiopt:
            c.route('**/api/me', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'kind': 'code', 'uid': 'u1'})))
            c.route('**/api/state', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'state': None, 'updatedAt': 1})))
            def quiz(r):
                calls.append(json.loads(r.request.post_data)); r.fulfill(status=200, content_type='application/json', body=json.dumps(quiz_reply))
            c.route('**/api/quiz', quiz)
        st = dict(STATE); st['aiOpt'] = aiopt
        pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", st); pg.reload(); pg.wait_for_timeout(700)
        pg.goto(URL + '#/port'); pg.wait_for_timeout(300)
        pg.set_input_files('#fi', [{'name': 'NET_week1_lecture.txt', 'mimeType': 'text/plain', 'buffer': doc.encode()}]); pg.wait_for_timeout(900)
        pg.click('[data-a="import"]'); pg.wait_for_timeout(600)
        pg.goto(URL + '#/m/m1/1/study'); pg.wait_for_timeout(300); pg.click('[data-a="tocheck"]'); pg.wait_for_timeout(2500)
        return c, pg, errs
    def aq(i): return {'q': 'Why does a router use the longest matching prefix when it forwards packet number %d?' % i, 'o': ['It selects the most specific route', 'It picks the shortest address', 'It ignores routing tables', 'It uses the first entry always'], 'a': 0, 'e': 'The longest prefix is the most specific route.', 'evidence': 'a router forwards packets by choosing the longest matching prefix', 'title': 'Routing', 'ref': 'p. 2'}
    calls = []
    c, pg, errs = ai_ctx(True, {'ok': True, 'questions': [aq(i) for i in range(5)], 'rejected': 2, 'reason': '', 'subject': 'Networks'}, NODEF, calls)
    body = pg.inner_text('body')
    check('AI request sends a section with text and n=5', len(calls) >= 1 and 'sections' in calls[0] and calls[0]['n'] == 5 and len(calls[0]['sections'][0]['text']) >= 300, calls[:1])
    check('AI questions fill a 5-question quiz', 'question 1 of 5' in body.lower() and 'Written by an AI' in body, body[:300])
    check('AI question shows the source with its page reference', 'Source: NET_week1_lecture.txt, p. 2' in body, body)
    pg.click('[data-a="pick"][data-i="0"]'); pg.wait_for_timeout(200)
    check('answer shows the explanation and the supporting quote', 'most specific route' in pg.inner_text('body') and 'From your material' in pg.inner_text('body'))
    check('report buttons give a reason', pg.locator('[data-a="badq"]').count() == 3)
    pg.click('[data-a="badq"][data-why="wrong"]'); pg.wait_for_timeout(200)
    bk = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:bank:m1:1'))")
    check('reported question is kept out with its reason', any(q.get('bad') and q.get('badWhy') == 'wrong' for q in bk['q']), [q.get('badWhy') for q in bk['q']])
    check('no page errors (AI quiz)', not errs, errs)
    c.close()

    calls = []
    c, pg, errs = ai_ctx(True, {'ok': True, 'questions': [], 'rejected': 4, 'reason': 'The text is garbled.', 'subject': ''}, NODEF, calls)
    body = pg.inner_text('body')
    check('AI cannot make questions: the reason is shown, nothing is invented', 'No quiz this time' in body and 'The AI said: The text is garbled.' in body and 'question 1 of' not in body.lower(), body[:500])
    c.close()

    calls = []
    c, pg, errs = ai_ctx(False, None, NODEF, calls)
    body = pg.inner_text('body')
    check('without AI and without definitions: honest explanation, hint to turn AI on', 'No quiz this time' in body and 'Turn on AI questions' in body and calls == [], body[:500])
    c.close()

    calls = []
    c, pg, errs = ai_ctx(False, None, ' '.join(DEFS) + ' ' + NODEF, calls)
    body = pg.inner_text('body')
    check('without AI, clear definitions still make a 5-question quiz', 'question 1 of 5' in body.lower() and 'from a definition in your files' in body.lower(), body[:400])
    check('definition questions are not word blanks', 'Fill in the blank' not in body)
    c.close()
    b.close()

print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASSED'); sys.exit(1 if FAILS else 0)
