"""Browser tests: deleting files that wait in the Port (one, selected, all), storage failures, imported files untouched.
Run from the repo root:  python3 tests/e2e/port_delete.py     (needs: pip install playwright && playwright install chromium)"""
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


def port_text(pg): return pg.inner_text('main')
def rows(pg): return pg.locator('.pfile').count()

with sync_playwright() as p:
    b = p.chromium.launch()
    c, pg, errs = fresh(b)
    # one imported file that must survive everything
    add_files(pg, [('NET_week1_keep.txt', 'keep me')]); pg.click('[data-a="import"]'); pg.wait_for_timeout(700)
    add_files(pg, [('NET_week1_a.txt', 'aaa'), ('NET_week1_b.txt', 'bbb'), ('NET_week2_c.txt', 'ccc'), ('NET_week2_d.txt', 'ddd'), ('weird_name.txt', 'eee')])
    check('five files wait in the Port', 'Select all pending files (5)' in port_text(pg), port_text(pg)[:600])
    check('manage card says imported files are never touched and it cannot be undone', 'never touched' in port_text(pg) and 'cannot be undone' in port_text(pg))

    # --- delete one (needs confirmation, others untouched)
    pg.click('[data-a="togready"]') if pg.locator('[data-a="togready"][aria-expanded="false"]').count() else None
    pg.wait_for_timeout(200)
    first = pg.locator('[data-a="pdel1"]').first
    nm = pg.locator('.pfile').first.locator('.t').first.inner_text()
    first.click(); pg.wait_for_timeout(200)
    check('single delete asks first and says it cannot be undone', 'cannot be undone' in pg.locator('.pfile').first.inner_text() and pg.locator('[data-a="pdelyes"]').count() == 1)
    pg.click('[data-a="pdelno"]'); pg.wait_for_timeout(150)
    check('cancel keeps the file', 'Select all pending files (5)' in port_text(pg))
    pg.locator('[data-a="pdel1"]').first.click(); pg.click('[data-a="pdelyes"]'); pg.wait_for_timeout(700)
    check('one file deleted, four remain', 'Select all pending files (4)' in port_text(pg), port_text(pg)[:500])
    check('result card names the deleted file', '1 file deleted' in port_text(pg) and nm in port_text(pg), port_text(pg)[:400])
    pg.click('[data-a="pdelclose"]'); pg.wait_for_timeout(150)
    imported = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).lastImport.length")

    # --- select two and delete the selection
    pg.locator('[data-c="delsel"]').nth(0).check(); pg.locator('[data-c="delsel"]').nth(1).check(); pg.wait_for_timeout(150)
    check('delete selected shows the count', 'Delete selected (2)' in port_text(pg), port_text(pg)[:500])
    pg.click('[data-a="pdelsel"]'); pg.wait_for_timeout(150)
    check('bulk delete asks to confirm with the number', 'Delete 2 selected files?' in port_text(pg) and 'cannot be undone' in port_text(pg))
    pg.click('[data-a="pdelyes"]'); pg.wait_for_timeout(700)
    check('two more deleted, two remain', 'Select all pending files (2)' in port_text(pg) and '2 files deleted' in port_text(pg), port_text(pg)[:500])
    pg.click('[data-a="pdelclose"]')

    # --- storage refuses one file: it is reported and stays
    pg.evaluate("""()=>{var d=IDBObjectStore.prototype.delete;window.__badName=null;IDBObjectStore.prototype.delete=function(k){
      if(window.__failDel)throw new DOMException('locked','InvalidStateError');return d.apply(this,arguments);};window.__failDel=true;}""")
    pg.click('[data-a="pdelall"]'); pg.wait_for_timeout(150)
    check('empty the Port shows the number and what stays', 'Empty the Port? 2 pending files will be removed.' in port_text(pg) and 'Imported and assigned files stay untouched' in port_text(pg), port_text(pg)[:700])
    pg.click('[data-a="pdelyes"]'); pg.wait_for_timeout(900)
    t = port_text(pg)
    check('storage failure: files are NOT reported as deleted', '0 files deleted' in t and 'could not be deleted' in t, t[:600])
    check('storage failure: both files still listed', 'Select all pending files (2)' in t)
    pg.evaluate("window.__failDel=false"); pg.click('[data-a="pdelclose"]')

    # --- empty the Port for real
    pg.click('[data-a="pdelall"]'); pg.click('[data-a="pdelyes"]'); pg.wait_for_timeout(900)
    t = port_text(pg)
    check('port emptied', '2 files deleted' in t and 'Select to delete' not in t and 'ready to import' not in t, t[:500])
    check('imported file untouched', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).lastImport.length") == imported)
    pg.goto(URL + '#/m/m1/1'); pg.wait_for_timeout(500)
    check('the imported file is still in its house and floor', 'NET_week1_keep.txt' in pg.inner_text('main'), pg.inner_text('main')[:400])
    check('no page errors (port delete)', not errs, errs)
    c.close()

    # --- select all, then delete selected
    c, pg, errs = fresh(b)
    add_files(pg, [('NET_week1_a.txt', 'aaa'), ('NET_week1_b.txt', 'bbb'), ('weird.txt', 'ccc')])
    pg.locator('[data-c="pselall"]').check(); pg.wait_for_timeout(250)
    check('select all selects every pending file, ready ones included', 'Delete selected (3)' in port_text(pg), port_text(pg)[:500])
    pg.click('[data-a="pdelsel"]'); pg.click('[data-a="pdelyes"]'); pg.wait_for_timeout(800)
    check('select all + delete selected empties the Port', 'Select to delete' not in port_text(pg) and 'ready to import' not in port_text(pg) and '3 files deleted' in port_text(pg), port_text(pg)[:400])
    # blocked while importing
    add_files(pg, [('NET_week1_a.txt', 'aaa')])
    pg.set_viewport_size({'width': 375, 'height': 800}); pg.wait_for_timeout(300)
    check('phone: no horizontal overflow on the Port', pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    pg.screenshot(path='/tmp/port_phone.png', full_page=True)
    check('no page errors (select all)', not errs, errs)
    c.close()
    b.close()

print('\n%d failed' % len(FAILS) if FAILS else '\nALL PASSED'); sys.exit(1 if FAILS else 0)
