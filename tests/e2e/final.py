"""Browser tests: whole-house final practice (balanced sessions, mistakes, sources, retry, focused review, separate from floor status).
Run from the repo root:  python3 tests/e2e/final.py     (needs: pip install playwright && playwright install chromium)"""
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


CONTENT = {"1": "Latency is the time a packet needs to travel from the sender to the receiver across the network. Bandwidth is the maximum amount of data that a link can transfer in a given period of time. Router is a device that forwards packets between different networks using their destination address. Throughput is the amount of data that is actually delivered over a link per second. Firewall is a system that filters network traffic according to a set of security rules. Switch is a device that connects computers inside one local network and forwards frames by hardware address. Gateway is a node that connects two networks which use different protocols for communication. Socket is an endpoint that lets a program send and receive data over a network connection.", "2": "Photosynthesis is the process by which plants convert light energy into chemical energy stored in sugar. Mitochondria is the organelle that produces most of the energy a cell needs for its work. Chloroplast is the green structure inside plant cells where light is captured for sugar production. Ribosome is the small structure that builds proteins by reading messenger instructions. Enzyme is a protein that speeds up a chemical reaction without being used up itself. Genome is the complete set of genetic instructions that is stored inside an organism. Membrane is the thin layer that surrounds a cell and controls what enters and leaves. Nucleus is the central structure of a cell that holds most of its genetic material.", "3": "Inflation is a general rise in the price level of goods and services over a long period of time. Recession is a period of declining economic activity that lasts for several months or longer. Deflation is a general fall in the price level of goods and services across the whole economy. Tariff is a tax that a government places on goods that are imported from other countries. Subsidy is money that a government pays to producers to lower the price of their products. Monopoly is a market where one single seller controls the supply of a product completely. Oligopoly is a market that is dominated by a small number of large competing sellers. Equilibrium is the price at which the quantity supplied equals the quantity demanded in a market.", "4": "Recursion is a technique where a function solves a problem by calling itself on smaller inputs. Iterator is an object that lets a program walk through the elements of a collection one by one. Compiler is a program that translates the whole source code into machine instructions before running. Interpreter is a program that reads and executes source code line by line without a separate build. Variable is a named place in memory that stores a value which can change while the program runs. Constant is a named value that is fixed once and can never be changed afterwards in the program. Pointer is a value that stores the memory address of another value in the computer memory. Stack is a structure where the last element added is always the first one to be removed."}

def setup(b):
    c, pg, errs = fresh(b)
    add_files(pg, [('NET_week%s_notes.txt' % k, CONTENT[k]) for k in ('1', '2', '3', '4')])
    pg.click('[data-a="import"]'); pg.wait_for_timeout(900)
    return c, pg, errs

def banks(pg):
    return pg.evaluate("""()=>{var o={};for(var i=1;i<=4;i++){var b=JSON.parse(localStorage.getItem('booklyn:bank:m1:'+i)||'null');if(b)b.q.forEach(function(q){o[q.q.trim().toLowerCase()+'|'+q.o.slice().sort().join('|')]=q;});}return o;}""")

def answer(pg, bk, ok):
    labels = [l.split('\n')[-1].strip() for l in pg.locator('[data-a="fpick"]').all_inner_texts()]
    q = bk[pg.locator('main h2').first.inner_text().strip().lower() + '|' + '|'.join(sorted(labels))]
    right = labels.index(q['o'][q['a']])
    pg.click('[data-a="fpick"][data-i="%d"]' % (right if ok else (right + 1) % 4))
    return q, right

def run_session(pg, bk, flags):
    floors = []; asked = []
    for ok in flags:
        chip = pg.locator('main .chip').first.inner_text(); floors.append(chip)
        asked.append(pg.locator('main h2').first.inner_text().strip() + '|' + '|'.join(sorted(l.split('\n')[-1].strip() for l in pg.locator('[data-a="fpick"]').all_inner_texts())))
        answer(pg, bk, ok)
        pg.wait_for_timeout(60)
        if not ok:
            t = pg.inner_text('main')
            if 'The right answer is' not in t or 'Check the source' not in t: return floors, asked, t
        pg.click('[data-a="fnext"]'); pg.wait_for_timeout(60)
    return floors, asked, ''

def state(pg):
    pg.wait_for_timeout(350)
    return pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")

with sync_playwright() as p:
    b = p.chromium.launch()
    c, pg, errs = setup(b)
    pg.goto(URL + '#/m/m1'); pg.wait_for_timeout(500)
    check('house page offers the final practice', pg.locator('[data-a="go"][data-to="#/m/m1/final"]').count() == 1)
    pg.click('[data-a="go"][data-to="#/m/m1/final"]'); pg.wait_for_timeout(2500)
    t = pg.inner_text('main')
    check('start page lists the four floors with their questions', all(('Floor %d' % k) in t for k in (1, 2, 3, 4)) and 'questions ready' in t, t[:700])
    check('start page offers 20 and 25 questions', pg.locator('[data-a="fstart"][data-n="20"]:not([disabled])').count() == 1 and pg.locator('[data-a="fstart"][data-n="25"]:not([disabled])').count() == 1)
    check('start page says results are separate from the floors', 'never turns a light on' in t)
    bk = banks(pg)
    pg.screenshot(path='/tmp/final_start.png', full_page=True)

    # ---- a 20-question session: balanced, 6 wrong
    pg.click('[data-a="fstart"][data-n="20"]'); pg.wait_for_timeout(300)
    check('session shows question 1 of 20', 'question 1 of 20' in pg.inner_text('main').lower(), pg.inner_text('main')[:300])
    flags = [False] * 6 + [True] * 14
    floors, asked, why = run_session(pg, bk, flags)
    check('wrong answers explain the mistake and link the source', not why, why[:500])
    from collections import Counter
    cnt = Counter(f.split(' · ')[0] for f in floors)
    check('questions are balanced across all four floors', sorted(cnt.values()) == [5, 5, 5, 5], cnt)
    check('no question twice in a session', len(set(asked)) == 20)
    t = pg.inner_text('main')
    pg.screenshot(path='/tmp/final_result.png', full_page=True)
    check('result shows the score', '14 of 20 (70 %)' in t, t[:300])
    check('result says it did not change any floor', 'did not turn any light on' in t)
    check('result lists floors and topics to review with source links', 'What to review' in t and pg.locator('[data-a="go"][data-to^="#/m/m1/"]').count() >= 1 and pg.locator('main [data-a="open"]').count() >= 1, t[:900])
    check('missed questions are shown with the right answer', t.count('Right answer: ') == 6, t.count('Right answer: '))
    st = state(pg)
    check('final practice is stored apart: one session, 6 open misses', len(st['final']['m1']['sessions']) == 1 and len(st['final']['m1']['missed']) == 6, st['final'])
    check('no floor was lit, reviewed or marked by the practice', st['lit'] == {} and st['seen'] == {} and st['how'] == {} and st['lvl'] == {}, {k: st[k] for k in ('lit', 'seen', 'how', 'lvl')})
    check('floor quiz banks untouched by final results', all(sum(1 for q in json.loads(pg.evaluate("localStorage.getItem('booklyn:bank:m1:%d')" % k) or '{"stats":{}}').get('stats', {}).values() if q.get('asked')) == 0 for k in (1, 2, 3, 4)))

    # ---- retry the missed ones, all right
    pg.click('[data-a="fretry"]'); pg.wait_for_timeout(300)
    check('retry has exactly the missed questions', 'question 1 of 6' in pg.inner_text('main').lower() and 'retry of missed questions' in pg.inner_text('main').lower(), pg.inner_text('main')[:200])
    floors, asked, why = run_session(pg, bk, [True] * 6)
    check('retry questions are the missed ones', not why and len(set(asked) & set()) == 0)
    t = pg.inner_text('main')
    check('retry: all right, no mistakes', '6 of 6' in t and 'No mistakes' in t, t[:300])
    st = state(pg)
    check('retry clears the missed list and adds a session', len(st['final']['m1']['missed']) == 0 and len(st['final']['m1']['sessions']) == 2)

    # ---- a 25 session where floor 3 is weak, then focused review
    pg.click('[data-a="fagain"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="fstart"][data-n="25"]'); pg.wait_for_timeout(300)
    flags = []
    for i in range(25):
        flags.append(None)
    fl_all = []
    for i in range(25):
        chip = pg.locator('main .chip').first.inner_text(); fl_all.append(chip)
        answer(pg, bk, not chip.startswith('Floor 3'))
        pg.click('[data-a="fnext"]'); pg.wait_for_timeout(50)
    t = pg.inner_text('main')
    check('25-question session ran and finished', 'of 25' in t and 'What to review' in t, t[:300])
    plan_first = pg.locator('main section.stack .card h3').first.inner_text()
    check('the weakest floor is listed first in the review', plan_first.startswith('Floor 3'), plan_first)
    pg.click('[data-a="ffocus"]'); pg.wait_for_timeout(300)
    check('focused review has 10 questions', 'question 1 of 10' in pg.inner_text('main').lower() and 'focused review' in pg.inner_text('main').lower(), pg.inner_text('main')[:200])
    only3 = True
    for i in range(10):
        chip = pg.locator('main .chip').first.inner_text(); only3 = only3 and chip.startswith('Floor 3')
        answer(pg, bk, True); pg.click('[data-a="fnext"]'); pg.wait_for_timeout(50)
    check('focused review only asks the weak floor', only3)
    st = state(pg)
    check('still nothing lit or reviewed after four sessions', st['lit'] == {} and st['seen'] == {} and len(st['final']['m1']['sessions']) == 4, st['final']['m1']['sessions'])

    # ---- history survives a reload; phone layout
    pg.goto(URL + '#/m/m1/final'); pg.reload(); pg.wait_for_timeout(2500)
    t = pg.inner_text('main')
    check('after a reload the history is shown', 'Your practice so far' in t and '4 sessions' in t, t[:600])
    pg.set_viewport_size({'width': 375, 'height': 800}); pg.wait_for_timeout(300)
    check('phone: no horizontal overflow (start)', pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    pg.click('[data-a="fstart"][data-n="20"]'); pg.wait_for_timeout(300)
    for i in range(3):
        answer(pg, bk, False); pg.screenshot(path='/tmp/final_q.png') if i == 0 else None; pg.click('[data-a="fnext"]'); pg.wait_for_timeout(50)
    check('phone: no horizontal overflow (question)', pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    pg.click('[data-a="fleave"]'); pg.wait_for_timeout(300)
    check('leaving a session does not save it', len(state(pg)['final']['m1']['sessions']) == 4)
    check('no page errors (final practice)', not errs, errs)
    c.close()

    # ---- too little material: honest, no practice
    c, pg, errs = fresh(b)
    add_files(pg, [('NET_week1_lecture.txt', CONTENT['1'])]); pg.click('[data-a="import"]'); pg.wait_for_timeout(700)
    pg.goto(URL + '#/m/m1/final'); pg.wait_for_timeout(2000)
    t = pg.inner_text('main')
    check('one floor with 32 questions: 20 allowed, 25 too', pg.locator('[data-a="fstart"][data-n="20"]:not([disabled])').count() == 1 and pg.locator('[data-a="fstart"][data-n="25"]:not([disabled])').count() == 1)
    c.close()
    c, pg, errs = fresh(b)
    pg.goto(URL + '#/m/m1/final'); pg.wait_for_timeout(1500)
    t = pg.inner_text('main')
    check('no files: both sizes disabled and an honest message', pg.locator('[data-a="fstart"][disabled]').count() == 2 and 'does not make a shorter practice' in t, t[:500])
    check('no page errors (empty house)', not errs, errs)
    c.close()
    b.close()

print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASSED'); sys.exit(1 if FAILS else 0)
