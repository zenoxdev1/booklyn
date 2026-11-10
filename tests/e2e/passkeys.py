"""Passkeys in a real browser with a virtual authenticator, against the real account API on an in-memory database.
Run from the repo root:  python3 tests/e2e/passkeys.py     (needs: pip install playwright && playwright install chromium, and Node 22+)"""
import os, subprocess, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['node', os.path.join(ROOT, 'tests/support/api-server.mjs'), '0'], stdout=subprocess.PIPE, text=True, cwd=ROOT)
port = srv.stdout.readline().split()[1]
URL = 'http://localhost:%s/app/index.html' % port
FAILS = []
def check(n, c, x=''):
    print(('PASS ' if c else 'FAIL ') + n + ((' :: ' + str(x)) if (x and not c) else ''))
    if not c: FAILS.append(n)

STATE = {'schema': 1, 'name': 'T', 'activeSem': 's1', 'sems': [{'id': 's1', 'name': 'Sem 1', 'start': '2026-09-14', 'demo': False, 'finished': False,
  'modules': [{'id': 'm1', 'code': 'NET', 'name': 'Networks', 'kw': 'network', 'h': 215, 'units': 4, 'titles': ['One', 'Two', 'Three', 'Four'], 'base': {}}]}]}

def authenticator(ctx, pg):
    cdp = ctx.new_cdp_session(pg)
    cdp.send('WebAuthn.enable')
    cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {'protocol': 'ctap2', 'transport': 'internal', 'hasResidentKey': True, 'hasUserVerification': True, 'isUserVerified': True, 'automaticPresenceSimulation': True}})
    return cdp

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for vw, tag in ((1100, 'desk'), (375, 'phone')):
            c = b.new_context(viewport={'width': vw, 'height': 900}); pg = c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            cdp = authenticator(c, pg)
            pg.goto(URL); pg.evaluate("s=>localStorage.setItem('booklyn:state',JSON.stringify(s))", STATE); pg.reload(); pg.wait_for_timeout(700)
            check(tag + ': account button visible', pg.locator('.acctbtn:visible').count() == 1 and 'Sign in' in pg.locator('.acctbtn:visible').inner_text())
            pg.locator('.acctbtn:visible').click(); pg.wait_for_timeout(400)
            t = pg.inner_text('main')
            check(tag + ': account page offers passkeys', 'Sign in with a passkey' in t and 'Create an account with a passkey' in t, t[:500])
            low = t.lower()
            check(tag + ': no email sign-in anywhere', 'email link' not in low and 'send me a link' not in low and 'sign-in links' not in low and pg.locator('#syemail').count() == 0, t[:600])
            check(tag + ': passkey is recommended, code is the fallback', 'Recommended: sign in with a passkey' in t and 'A passkey is safer and easier' in t and t.index('Recommended') < t.index('Create my sync code'), t[:700])
            pg.screenshot(path='/tmp/account_' + tag + '.png')
            pg.click('[data-a=pknew]'); pg.wait_for_timeout(2500)
            t = pg.inner_text('main')
            check(tag + ': account created with a passkey', 'Signed in with a passkey' in t or 'passkey' in t.lower() and 'Passkeys' in t, t[:700])
            check(tag + ': button now says Account', 'Account' in pg.locator('.acctbtn:visible').inner_text())
            check(tag + ': one passkey listed', pg.locator('[data-a=pkdel]').count() == 1, t[-600:])
            pg.wait_for_timeout(800)
            cloud = pg.evaluate("fetch('/api/state').then(r=>r.json())")
            check(tag + ': local progress synced to the new account', cloud.get('ok') and cloud.get('state') and cloud['state']['sems'][0]['name'] == 'Sem 1', cloud)
            # last passkey of a passkey-only account cannot be removed
            pg.click('[data-a=pkdel]'); pg.click('[data-a=pkdel2]'); pg.wait_for_timeout(600)
            check(tag + ': last passkey is kept', pg.locator('[data-a=pkdel]').count() == 1 and 'last passkey' in pg.inner_text('main'), pg.inner_text('main')[-500:])
            # add a second one
            pg.fill('#pkname', 'Second'); pg.click('[data-a=pkadd]'); pg.wait_for_timeout(1500)
            check(tag + ': same device cannot add the same account twice', 'already has a passkey' in pg.inner_text('main') and pg.locator('[data-a=pkdel]').count() == 1, pg.inner_text('main')[-400:])
            cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {'protocol': 'ctap2', 'transport': 'usb', 'hasResidentKey': True, 'hasUserVerification': True, 'isUserVerified': True, 'automaticPresenceSimulation': True}})
            pg.fill('#pkname', 'Second'); pg.click('[data-a=pkadd]'); pg.wait_for_timeout(2000)
            check(tag + ': second passkey added', pg.locator('[data-a=pkdel]').count() == 2 and 'Second' in pg.inner_text('main'), pg.inner_text('main')[-600:])
            # sign out, sign in again with the passkey
            pg.click('[data-a=sylogout]'); pg.wait_for_timeout(300)
            check(tag + ': sign out asks what to do with the data on this device', pg.locator('[data-a=sylogout3]').count() == 1 and pg.locator('[data-a=sylogout2]').count() == 1 and 'cannot' not in pg.inner_text('main').split('Sign out of this device?')[1][:10])
            pg.click('[data-a=sylogout2]'); pg.wait_for_timeout(700)
            check(tag + ': sign out keeping data leaves the progress here', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).sems.length") == 1)
            check(tag + ': signed out', pg.locator('[data-a=pkin]').count() == 1)
            pg.evaluate("location.hash='#/'"); pg.wait_for_timeout(400)
            check(tag + ': signed out: button says Sign in and is not lit', 'Sign in' in pg.locator('.acctbtn:visible').inner_text() and 'on' not in (pg.locator('.acctbtn:visible').first.get_attribute('class') or '').split())
            pg.evaluate("location.hash='#/account'"); pg.wait_for_timeout(400)
            pg.click('[data-a=pkin]'); pg.wait_for_timeout(2500)
            check(tag + ': signed in again with the passkey', pg.locator('[data-a=pkdel]').count() == 2 and 'Account' in pg.locator('.acctbtn:visible').inner_text(), pg.inner_text('main')[:500])
            me = pg.evaluate("fetch('/api/me').then(r=>r.json())"); check(tag + ': server says passkey account', me.get('kind') == 'passkey', me)
            # the Account button is lit only on the account page, with a dot while signed in
            pg.evaluate("location.hash='#/'"); pg.wait_for_timeout(500)
            btn = pg.locator('.acctbtn:visible').first
            check(tag + ': Account button is not lit away from the account page', 'on' not in (btn.get_attribute('class') or '').split() and 'signed' in (btn.get_attribute('class') or '').split(), btn.get_attribute('class'))
            pg.evaluate("location.hash='#/account'"); pg.wait_for_timeout(500)
            check(tag + ': Account button is lit on the account page', 'on' in (pg.locator('.acctbtn:visible').first.get_attribute('class') or '').split())
            # sign out and clear this device: progress is saved first, the device is emptied, signing in brings it back
            pg.click('[data-a=sylogout]'); pg.click('[data-a=sylogout3]'); pg.wait_for_timeout(1500)
            st = pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state'))")
            check(tag + ': sign out and clear empties this device', len(st.get('sems', [])) == 0, st)
            check(tag + ': nothing is signed in any more', pg.evaluate("fetch('/api/me').then(r=>r.json())").get('ok') is False)
            pg.evaluate("location.hash='#/account'"); pg.wait_for_timeout(500)
            check(tag + ': sign-in options are back', pg.locator('[data-a=pkin]').count() == 1, pg.inner_text('main')[:300])
            pg.click('[data-a=pkin]'); pg.wait_for_timeout(2500)
            check(tag + ': signing in again brings the progress back', pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).sems.length") == 1 and pg.evaluate("JSON.parse(localStorage.getItem('booklyn:state')).sems[0].name") == 'Sem 1')
            # remove one (now allowed), then delete the account
            pg.locator('[data-a=pkdel]').first.click(); pg.click('[data-a=pkdel2]'); pg.wait_for_timeout(700)
            check(tag + ': one passkey removed', pg.locator('[data-a=pkdel]').count() == 1)
            pg.click('[data-a=sydel1]'); pg.click('[data-a=sydel2]'); pg.wait_for_timeout(800)
            me = pg.evaluate("fetch('/api/me').then(r=>r.json())"); check(tag + ': account deleted', me.get('ok') is False, me)
            ov = pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"); check(tag + ': no overflow', ov)
            check(tag + ': no page errors', not errs, errs)
            pg.screenshot(path='/tmp/pk_%s.png' % tag, full_page=True)
            c.close()
        b.close()
finally:
    srv.terminate()
print('ALL PASSED' if not FAILS else 'FAILED: %s' % FAILS)
