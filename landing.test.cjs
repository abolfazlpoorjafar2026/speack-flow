const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('./flow.js');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const appSource = fs.readFileSync(`${__dirname}/app.js`, 'utf8');

function setup(raw = null) {
  const elements = new Map();
  class Element {
    constructor() { this.listeners = {}; this.dataset = {}; this.attrs = {}; this.checked = false; this.hidden = false; this.textContent = ''; this.children = []; const set = new Set(); this.classList = { add: n => set.add(n), remove: n => set.delete(n), contains: n => set.has(n), toggle(n) { if (set.has(n)) { set.delete(n); return false; } set.add(n); return true; } }; }
    set innerHTML(value) { this.html = value; for (const m of value.matchAll(/\bid="([^"]+)"/g)) elements.set(`#${m[1]}`, new Element()); }
    get innerHTML() { return this.html || ''; }
    setAttribute(k, v) { this.attrs[k] = v; }
    addEventListener(n, cb) { (this.listeners[n] ||= []).push(cb); }
    fire(n, data = {}) { (this.listeners[n] || []).forEach(cb => cb({ preventDefault() {}, ...data })); }
    querySelector() { return new Element(); }
    querySelectorAll() { return []; }
    focus() {}
    after(el) { elements.set('#product-app', el); }
  }
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) elements.set(`#${m[1]}`, new Element());
  const tabs = ['cafe', 'film', 'travel'].map(n => { const el = new Element(); el.dataset.scene = n; el.id = `tab-${n}`; return el; });
  // Talking partner lives inside the product (practice hub); expose its nodes to the landing test.
  const partnerNodes = ['partner-line', 'user-line', 'better-line', 'tip-line', 'scene-panel'].map(id => { const el = new Element(); elements.set(`#${id}`, el); return el; });
  const starts = Array.from({ length: 8 }, () => new Element());
  const document = new Element(); document.body = new Element();
  document.querySelector = sel => elements.get(sel) || null;
  document.querySelectorAll = sel => sel === '[data-scene]' ? tabs : sel === '[data-start]' ? starts : [];
  document.createElement = () => new Element();
  const window = new Element(); window.scrollTo = () => {};
  const location = { hash: '' };
  const stored = new Map(raw ? [['speakflow-preview-v1', JSON.stringify(raw)]] : []);
  const localStorage = { getItem: k => stored.get(k) || null, setItem: (k, v) => stored.set(k, v), removeItem: k => stored.delete(k) };
  class FormData { constructor(form) { this.form = form; } get(k) { return this.form.values[k]; } has(k) { return Boolean(this.form.values[k]); } }
  const source = appSource.replace(/render\(\);\s*\}\)\(\);\s*$/, 'render(); window.testing = { pages, handlers, render, state: () => state, signIn: () => { signedIn = true; }, selectReview: id => { reviewId = id; } }; })();');
  vm.runInNewContext(source, { SFCore: C, document, window, location, localStorage, FormData, console });
  const api = window.testing;
  const route = name => { location.hash = `#/${name}`; api.render(); };
  const click = (name, dataset = {}) => api.handlers[name]({ dataset });
  return { ...api, elements, window, document, location, stored, starts, tabs, partner: () => ({ tabs, better: elements.get('#better-line') }), route, click, output: () => elements.get('#product-app').innerHTML };
}

function complete(s, stage, topic, now = 1000) { assert.equal(C.start(s, stage, topic), true); s.session.step = 'analysis'; assert.equal(C.finish(s, now), true); }

test('landing retains brand, slogan and real internal anchors; obsolete dialog removed', () => {
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /<span>واقعاً هست<\/span> یاد بگیر/);
  assert.doesNotMatch(html, /<dialog|دوره‌ها|اساتید/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const m of html.matchAll(/href="#(?!\/)([^"]+)"/g)) assert.ok(ids.includes(m[1]), m[1]);
  for (const file of ['app.js', 'flow.js', 'app.css']) assert.ok(html.includes(file));
});

test('all twenty-two product routes render; links, actions and IDs resolve', () => {
  const a = setup(); a.signIn();
  assert.equal(Object.keys(a.pages).length, 22);
  for (const route of Object.keys(a.pages)) {
    a.route(route);
    const output = a.output();
    assert.ok(output.length > 1000, route);
    const ids = [...output.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, route);
    for (const m of output.matchAll(/href="#\/([^"]+)"/g)) assert.ok(a.pages[m[1]], `${route}: ${m[1]}`);
    for (const m of output.matchAll(/data-action="([^"]+)"/g)) assert.equal(typeof a.handlers[m[1]], 'function', `${route}: ${m[1]}`);
  }
});

test('all CTAs enter onboarding and protected deep links retain destination', () => {
  const a = setup();
  for (const button of a.starts) { button.fire('click'); assert.equal(a.location.hash, '/onboarding'); }
  a.route('review'); assert.equal(a.location.hash, '/login');
  a.route('login');
  const login = a.elements.get('#login-form');
  login.values = { firstName: 'ابوالفضل', lastName: 'پورجعفر', phone: '09121234567' };
  a.elements.get('#privacy-consent').checked = true;
  login.fire('submit', { target: login });
  assert.equal(a.location.hash, '/verify');
  a.route('verify');
  const verify = a.elements.get('#verify-form');
  verify.values = { code: '123456' };
  verify.fire('submit', { target: verify });
  assert.equal(a.location.hash, '/review');
});

test('onboarding asks one question per step, records each choice and keeps the stage at Silver', () => {
  const a = setup(); a.route('onboarding');
  const first = a.output();
  assert.match(first, /class="onboard-shell"/);
  assert.match(first, /۱ از ۳/);
  assert.equal([...first.matchAll(/class="onboard-choice/g)].length, 3);
  assert.doesNotMatch(first, /class="app-card"/);
  a.click('onboard-pick', { key: 'goal', value: 'work' });
  assert.equal(a.state().preferences.goal, 'work');
  assert.match(a.output(), /is-on/);
  let form = a.elements.get('#onboarding-form'); form.values = { goal: 'work' };
  form.fire('submit', { target: form });
  assert.match(a.output(), /۲ از ۳/);
  a.click('onboard-pick', { key: 'experience', value: 'new' });
  form = a.elements.get('#onboarding-form'); form.values = { experience: 'new' };
  form.fire('submit', { target: form });
  assert.match(a.output(), /۳ از ۳/);
  assert.match(a.output(), /شروع کنیم/);
  a.click('onboard-pick', { key: 'interest', value: 'film' });
  form = a.elements.get('#onboarding-form'); form.values = { interest: 'film' };
  form.fire('submit', { target: form });
  assert.equal(a.state().preferences.interest, 'film');
  assert.equal(a.state().preferences.goal, 'work');
  assert.equal(a.state().stage, 0);
  assert.equal(a.location.hash, '/login');
});

test('login validates names, phone and consent before requesting a code', () => {
  const a = setup(); a.route('login');
  const form = a.elements.get('#login-form');
  const submit = values => { form.values = values; form.fire('submit', { target: form }); };
  a.elements.get('#privacy-consent').checked = true;
  submit({ firstName: 'ا', lastName: 'پورجعفر', phone: '09121234567' });
  assert.match(a.elements.get('#login-error').textContent, /نام و نام خانوادگی/);
  submit({ firstName: 'ابوالفضل', lastName: 'پورجعفر', phone: '0812345' });
  assert.match(a.elements.get('#login-error').textContent, /۰۹/);
  a.elements.get('#privacy-consent').checked = false;
  submit({ firstName: 'ابوالفضل', lastName: 'پورجعفر', phone: '09121234567' });
  assert.match(a.elements.get('#login-error').textContent, /حریم خصوصی/);
  assert.notEqual(a.location.hash, '/verify');
  a.elements.get('#privacy-consent').checked = true;
  submit({ firstName: 'ابوالفضل', lastName: 'پورجعفر', phone: '0912 123 4567' });
  assert.equal(a.location.hash, '/verify');
  assert.equal(a.state().preferences.interest, 'cafe');
});

test('verify rejects a short code and accepts demo login without phone', () => {
  const a = setup(); a.route('login');
  const login = a.elements.get('#login-form');
  login.values = { firstName: 'سارا', lastName: 'احمدی', phone: '09351112233' };
  a.elements.get('#privacy-consent').checked = true;
  login.fire('submit', { target: login });
  a.route('verify');
  assert.match(a.output(), /سارا احمدی/);
  assert.match(a.output(), /۰۹۳۵۱۱۱۲۲۳۳/);
  const verify = a.elements.get('#verify-form');
  verify.values = { code: '12' };
  verify.fire('submit', { target: verify });
  assert.match(a.output(), /شش رقم/);
  const b = setup(); b.route('login');
  b.click('demo-login');
  assert.equal(b.location.hash, '/dashboard');
});

test('login page switches between signup and sign-in copy', () => {
  const a = setup(); a.route('login');
  assert.match(a.output(), /ساخت حساب کاربری/);
  assert.match(a.output(), /نام خانوادگی/);
  a.click('toggle-auth'); a.route('login');
  assert.match(a.output(), /ورود به حساب کاربری/);
  assert.doesNotMatch(a.output(), /نام خانوادگی/);
});

test('lesson four steps, incorrect recall, resumed session and network retry', () => {
  const a = setup(); a.signIn(); a.route('dashboard'); a.click('start', { stage: '0', topic: 'cafe' }); a.route('lesson');
  assert.equal(a.state().session.step, 'learn');
  a.click('lesson-recall');
  let form = a.elements.get('#recall-form'); form.values = { answer: 'incorrect' }; form.fire('submit', { target: form });
  assert.match(a.elements.get('#recall-feedback').innerHTML, /دوباره امتحان/);
  form.values.answer = C.topics.cafe.phrase; form.fire('submit', { target: form });
  assert.match(a.elements.get('#recall-feedback').innerHTML, /lesson-speak/);
  a.click('lesson-speak'); assert.equal(a.state().session.step, 'speak');
  a.click('lesson-practice'); a.route('practice'); a.click('voice-mode');
  assert.match(a.output(), /صدایی ضبط نمی‌شه/);
  a.click('practice-choice', { choice: 'correct' });
  a.click('network-error'); a.click('end-practice');
  assert.equal(a.state().session.step, 'practice');
  a.click('end-practice'); assert.equal(a.state().session.step, 'analysis');
  a.route('analysis'); assert.match(a.output(), /عبارت مناسب/);
  a.click('finish-session'); assert.equal(a.state().completed.length, 1);
  a.click('finish-session'); assert.equal(a.state().completed.length, 1);
});

test('saved sessions restore; no completion or quota loss on abandoned lessons', () => {
  const s = C.initial(); C.start(s, 0, 'film'); s.session.step = 'recall';
  const restored = C.restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.session, s.session);
  assert.equal(restored.completed.length, 0);
  assert.equal(C.finish(restored), false);
  assert.equal(C.start(s, 1, 'film'), false);
});

test('spaced review walks the fixed day 1, day 2, three-day, week, month, quarter ladder', () => {
  const s = C.initial(); complete(s, 0, 'cafe', 1000);
  assert.equal(s.reviewAt['0:cafe'], 1000 + 86400000);
  assert.equal(C.stepOf(s, '0:cafe'), 0);
  assert.deepEqual(C.due(s, 1001), []);
  assert.deepEqual(C.due(s, 86401001), ['0:cafe']);
  C.review(s, '0:cafe', false, 2000); assert.equal(s.reviewAt['0:cafe'], 602000);
  assert.equal(C.stepOf(s, '0:cafe'), 0);
  const ladder = [[1, 86400000], [2, 3 * 86400000], [3, 7 * 86400000], [4, 30 * 86400000], [5, 90 * 86400000]];
  let now = 3000;
  for (const [step, gap] of ladder) {
    C.review(s, '0:cafe', true, now);
    assert.equal(C.stepOf(s, '0:cafe'), step);
    assert.equal(s.reviewAt['0:cafe'], now + gap);
    now += gap;
  }
  C.review(s, '0:cafe', true, now);
  assert.equal(C.stepOf(s, '0:cafe'), 5);
  assert.equal(s.reviewAt['0:cafe'], now + 90 * 86400000);
  assert.equal(s.reviewed.length, 1);
  assert.equal(C.review(s, '1:film', true), false);
});

test('payment failure/pending/cancellation do not unlock; repeated success is idempotent', () => {
  const s = C.initial(); s.order = { stage: 0, plan: 'Medium', status: 'preview' };
  for (const status of ['failed', 'pending', 'cancelled']) { C.payment(s, status); assert.deepEqual(s.access, []); }
  C.payment(s, 'success'); C.payment(s, 'success');
  assert.deepEqual(s.access, [0]); assert.equal(s.plan, 'Medium');
  assert.equal(C.payment(s, 'nonsense'), false);
});

test('purchase walks plan, gateway, confirmation and access activation in order', () => {
  const a = setup(); a.signIn(); a.route('subscription');
  a.click('choose-plan', { plan: 'Medium' }); a.route('checkout');
  assert.match(a.output(), /پرداخت از درگاه/);
  assert.equal(a.state().order, null);
  a.click('pay-gateway'); a.route('payment');
  assert.equal(a.state().order.status, 'preview');
  assert.match(a.output(), /در حال انتقال به درگاه پرداخت/);
  a.click('payment-state', { status: 'pending' }); a.route('payment');
  assert.equal(a.state().order.status, 'pending');
  assert.match(a.output(), /در حال تأیید پرداخت/);
  a.click('payment-state', { status: 'success' }); a.route('payment');
  assert.equal(a.state().order.status, 'success');
  assert.deepEqual(a.state().access, [0]);
  assert.match(a.output(), /پرداخت تأیید شد/);
  assert.match(a.output(), /فعال شد/);
  assert.match(a.output(), /is-done/);
});

test('assessment requires practice; failed assessment does not advance; next access required', () => {
  const s = C.initial(); assert.equal(C.assess(s, true), false);
  for (const topic of Object.keys(C.topics)) complete(s, 0, topic);
  C.assess(s, false); assert.equal(C.advance(s), false);
  C.assess(s, true); assert.equal(C.advance(s), false);
  s.access.push(1); assert.equal(C.advance(s), true); assert.equal(s.stage, 1);
  assert.equal(C.start(s, 0, 'cafe'), true); assert.equal(s.stage, 1);
});

test('full nine-month prototype ends at Diamond without inventing a fourth stage', () => {
  const s = C.initial(); s.access = [0, 1, 2];
  for (let stage = 0; stage < 3; stage++) {
    for (const topic of Object.keys(C.topics)) complete(s, stage, topic);
    C.assess(s, true);
    if (stage < 2) assert.equal(C.advance(s), true);
  }
  assert.equal(C.advance(s), false); assert.equal(s.stage, 2); assert.equal(s.completed.length, 9);
  const a = setup(s); a.signIn(); a.route('completion'); assert.match(a.output(), /گواهی تسلط/);
});

test('storage restores only allowed non-personal fields and handles corrupt content', () => {
  const s = C.restore({ preferences: { interest: '<script>', minutes: '999' }, completed: ['0:cafe', '<img>', '0:cafe'], access: [0, 0, 9], phone: 'private', session: { id: '0:cafe', step: 'analysis', choice: 'correct' } });
  assert.equal(s.preferences.interest, 'cafe'); assert.deepEqual(s.completed, ['0:cafe']); assert.deepEqual(s.access, [0]);
  assert.equal(s.phone, undefined); assert.equal(C.restore(null).stage, 0);
  assert.equal(C.restore(C.initial()).stage, 0);
});

test('deletion requires confirmation, cancel keeps data, confirm clears local preview only', () => {
  const s = C.initial(); complete(s, 0, 'cafe');
  const a = setup(s); a.signIn(); a.route('privacy'); a.click('request-delete');
  assert.equal(a.state().completed.length, 1); a.click('cancel-delete'); assert.equal(a.state().completed.length, 1);
  a.click('request-delete'); a.click('confirm-delete'); assert.equal(a.state().completed.length, 0);
  assert.equal(a.stored.size, 0); assert.equal(a.location.hash, '/onboarding');
});

test('talking partner still gives per-topic feedback and the mobile menu opens and closes', () => {
  const a = setup(); const partner = a.partner();
  partner.tabs[1].fire('click'); assert.equal(partner.better.textContent, C.topics.film.phrase);
  partner.tabs[1].fire('keydown', { key: 'ArrowLeft' }); assert.equal(partner.tabs[2].attrs['aria-selected'], 'true');
  const toggle = a.elements.get('#menu-toggle'); toggle.fire('click'); assert.equal(toggle.attrs['aria-expanded'], 'true');
  a.document.fire('keydown', { key: 'Escape' }); assert.equal(toggle.attrs['aria-expanded'], 'false');
});

test('choosing an upgrade does not change active plan before payment', () => {
  const a = setup(); a.signIn(); a.route('subscription');
  a.click('choose-plan', { plan: 'Pro' });
  assert.equal(a.state().plan, 'Basic');
  assert.equal(a.state().selectedPlan, 'Pro');
  a.route('checkout'); a.click('pay-gateway'); a.route('payment');
  a.click('payment-state', { status: 'failed' }); assert.equal(a.state().plan, 'Basic');
  a.click('payment-state', { status: 'success' }); assert.equal(a.state().plan, 'Pro');
});

test('prepaid later stages cannot skip Silver and incomplete selections stay unset', () => {
  const s = C.initial(); s.access = [0, 1, 2];
  assert.equal(C.start(s, 1, 'cafe'), false);
  assert.equal(C.start(s, 0, 'cafe'), true);
  assert.equal(s.session.choice, null);
  const a = setup(s); a.signIn();
  a.state().session.step = 'practice'; a.route('practice'); a.click('end-practice');
  assert.equal(a.state().session.step, 'practice');
});

test('every product page has its own visual identity and accessible heading', () => {
  const a = setup(); a.signIn();
  for (const route of Object.keys(a.pages)) {
    a.route(route);
    if (route === 'login' || route === 'verify') {
      assert.match(a.output(), /class="auth-page/);
      assert.match(a.output(), /class="app-page-title" tabindex="-1"/);
      assert.doesNotMatch(a.output(), /undefined|null/);
      continue;
    }
    if (route === 'onboarding') {
      assert.match(a.output(), /class="onboard-shell"/);
      assert.match(a.output(), /class="onboard-title" tabindex="-1"/);
      assert.doesNotMatch(a.output(), /undefined|null/);
      continue;
    }
    assert.match(a.output(), /class="page-caption"/);
    assert.match(a.output(), /class="app-page-title" tabindex="-1"/);
    assert.doesNotMatch(a.output(), /buddy\.svg|buddy-scene|page-emblem/);
    assert.match(a.output(), /class="ui-icon"/);
    assert.doesNotMatch(a.output(), /undefined|null/);
  }
});

test('dashboard shows progress, the Silver to Diamond path and review state from real sessions', () => {
  const s = C.initial(); complete(s, 0, 'cafe'); complete(s, 0, 'film');
  const a = setup(s); a.signIn(); a.route('dashboard');
  const out = a.output();
  assert.equal([...out.matchAll(/class="path-stop /g)].length, 3);
  assert.equal([...out.matchAll(/class="path-stop is-current/g)].length, 1);
  assert.match(out, /class="progress-ring"/);
  assert.match(out, /اینجا هستی/);
  assert.equal([...out.matchAll(/class="dash-stat"/g)].length, 4);
  assert.match(out, /۲ از ۹ موقعیت/);
  assert.match(out, /class="review-ladder"/);
  assert.equal([...out.matchAll(/class="ladder-dot"/g)].length, 7);
  assert.match(out, /class="strength-split"/);
  assert.match(out, /class="dash-back"/);
  assert.doesNotMatch(out, /buddy|mascot/);
});

test('dashboard offers a way back to earlier stages once the learner reaches Gold', () => {
  const s = C.initial(); s.stage = 1; s.access = [0, 1];
  const a = setup(s); a.signIn(); a.route('dashboard');
  const out = a.output();
  assert.match(out, /class="back-chip" data-action="view-stage" data-stage="0">Silver/);
  assert.doesNotMatch(out, /class="back-chip"[^>]*>Gold/);
  a.click('view-stage', { stage: '0' });
  assert.equal(a.location.hash, '#/dashboard');
});

test('visual system covers desktop, small screens, reduced motion and print', () => {
  const css = fs.readFileSync(`${__dirname}/app.css`, 'utf8');
  for (const selector of ['.hero', '.app-sidebar', '.app-stepper', '.app-choice', '.journey-panel', '.video-slot', '.app-summary', '.app-footer-nav']) assert.ok(css.includes(selector));
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /max-width:380px/);
  assert.match(css, /#product-app\[data-screen=review\]/);
  assert.match(css, /@media print/);
});

test('nine-month map has nine actionable stops and preserves access guards', () => {
  const a = setup(); a.route('roadmap');
  assert.match(a.output(), /سفر نُه/);
  assert.equal([...a.output().matchAll(/class="map-stop"/g)].length, 9);
  assert.equal([...a.output().matchAll(/class="map-node ready"/g)].length, 3);
  assert.equal([...a.output().matchAll(/class="map-node locked"/g)].length, 6);
});

test('prices agree between subscription, checkout and parent view', () => {
  assert.deepEqual(C.prices, { Basic: 2600000, Medium: 3950000, Pro: 5500000 });
  const a = setup(); a.signIn();
  for (const [plan, price] of Object.entries(C.prices)) {
    const formatted = price.toLocaleString('fa-IR');
    a.route('subscription'); assert.ok(a.output().includes(formatted));
    a.click('choose-plan', { plan }); a.route('checkout');
    assert.ok(a.output().includes(formatted));
    a.route('parent'); assert.ok(a.output().includes(formatted));
  }
});

test('profile XP and badges cannot be farmed by repeating completed activities', () => {
  const s = C.initial(); assert.equal(C.activityXP(s), 0);
  complete(s, 0, 'cafe'); complete(s, 0, 'cafe');
  C.review(s, '0:cafe', true); C.review(s, '0:cafe', true);
  assert.equal(C.activityXP(s), 40);
  assert.deepEqual(C.milestones(s), [true, true, false]);
  const a = setup(s); a.signIn(); a.route('profile');
  assert.match(a.output(), /نمودار قدم‌های تو/);
  assert.equal([...a.output().matchAll(/class="earned-badge earned"/g)].length, 2);
});

test('confirmed payment cannot regress to failed or pending', () => {
  const s = C.initial(); s.order = { stage: 0, plan: 'Pro', status: 'preview' };
  C.payment(s, 'success');
  for (const status of ['failed', 'pending', 'cancelled']) assert.equal(C.payment(s, status), false);
  assert.equal(s.order.status, 'success');
  assert.deepEqual(s.access, [0]);
});

test('next-stage assessment requires a fresh answer after either advancement path', () => {
  for (const purchase of [false, true]) {
    const s = C.initial(); s.access = [0, 1];
    for (const topic of Object.keys(C.topics)) complete(s, 0, topic);
    const a = setup(s); a.signIn(); a.route('assessment');
    a.click('assessment-choice', { choice: 'correct' });
    a.click('assessment-submit');
    if (purchase) {
      a.state().order = { stage: 1, plan: 'Basic', status: 'success' };
      a.click('after-purchase');
    } else a.click('advance');
    for (const topic of Object.keys(C.topics)) complete(a.state(), 1, topic);
    a.route('assessment'); a.click('assessment-submit');
    assert.equal(a.state().assessment, null);
    assert.match(a.elements.get('#assessment-feedback').innerHTML, /اول یه پاسخ انتخاب کن/);
  }
});

test('hero follows the reference layout: message, pill, one CTA and a dashboard mock', () => {
  const heroStart = html.indexOf('<section class="hero"');
  const heroEnd = html.indexOf('<section class="section how"');
  assert.ok(heroStart > -1 && heroEnd > heroStart);
  const hero = html.slice(heroStart, heroEnd);
  assert.match(hero, /id="hero-title"/);
  assert.match(hero, /<span>واقعاً هست<\/span>/);
  assert.match(hero, /class="hero-lead">اصطلاحات روزمره و مکالمهٔ کاربردی</);
  assert.match(hero, /class="button hero-cta" data-start>شروع تجربه رایگان/);
  assert.match(hero, /class="hero-mock"/);
  assert.match(hero, /class="mock-app">/);
  for (const part of ['مرحلهٔ فعلی:', 'Silver', 'قدم بعدی:', 'مرورهای امروز']) assert.ok(hero.includes(part), part);
  assert.doesNotMatch(hero, /buddy\.svg|hero-actions|floating-note|class="strip"/);
  assert.equal((html.match(/<section class="hero"/g) || []).length, 1);
});

test('header and footer match the reference: pill logo, four links, CTA, navy footer with links and socials', () => {
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.match(header, /id="main-nav"/);
  const navBlock = header.match(/<nav class="nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const navLinks = [...navBlock.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(m => m[2]);
  assert.deepEqual(navLinks, ['برای والدین', 'سوالات متداول', 'درباره ما', 'تماس با ما']);
  assert.match(header, /class="button header-action" data-start>شروع رایگان/);
  assert.match(header, /class="brand-name en"><b>Speak<\/b>Flow<\/span>/);
  assert.match(header, /id="menu-toggle"/);
  const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.match(footer, /class="wrap sf-footer"/);
  const footLinks = [...footer.matchAll(/<a href="[^"]+">([^<]+)<\/a>/g)].map(m => m[1]);
  for (const label of ['درباره ما', 'تماس با ما', 'پشتیبانی', 'حریم خصوصی', 'شرایط استفاده']) assert.ok(footLinks.includes(label), label);
  assert.equal([...footer.matchAll(/class="social"/g)].length, 3);
  assert.match(footer, /Speak Better\. Live Bolder\./);
});

test('talking partner loop and stage cards use the reference flow and palette', () => {
  const how = html.slice(html.indexOf('id="how-title"'), html.indexOf('id="path-title"'));
  assert.match(how, /class="how-flow"/);
  const steps = [...how.matchAll(/class="how-step"><span class="how-icon"[^>]*>[\s\S]*?<\/span><strong>([^<]+)<\/strong>/g)].map(m => m[1]);
  assert.deepEqual(steps, ['آموزش', 'تمرین تایپی', 'تمرین صوتی', 'تمرین سه‌مرحله‌ای', 'مرور']);
  assert.equal([...how.matchAll(/class="how-arrow"/g)].length, 4);
  const path = html.slice(html.indexOf('id="path-title"'), html.indexOf('id="why-title"'));
  assert.match(path, /مسیر یادگیری ۹ ماهه/);
  const cards = [...path.matchAll(/<h3 class="en">(Silver|Gold|Diamond)<\/h3>/g)].map(m => m[1]);
  assert.deepEqual(cards, ['Silver', 'Gold', 'Diamond']);
  assert.equal([...path.matchAll(/class="route-badge">ماه [^<]+<\/span>/g)].length, 3);
  for (const word of ['گرامرهای ساده', 'کافه', 'رستوران', 'فرودگاه', 'فیلم', 'آهنگ']) assert.ok(path.includes(word), word);
  assert.doesNotMatch(path, /متحول|کمترین زمان|به تسلط/);
});

test('landing CSS sticks to the three brand colours and the reference sections are scoped', () => {
  const css = fs.readFileSync(`${__dirname}/app.css`, 'utf8');
  const block = css.slice(css.lastIndexOf('LANDING v4'));
  for (const selector of ['.sf-header', '.hero-mock', '.mock-app', '.how-flow', '.route-stop', '.why-grid', '.final-cta', '.faq-list', '.sf-footer']) assert.ok(block.includes(selector), selector);
  assert.match(block, /var\(--yellow\)/);
  assert.match(block, /var\(--navy\)/);
  assert.match(block, /@media\(max-width:760px\)/);
  assert.match(block, /@media\(prefers-reduced-motion:reduce\)/);
  const cssPath = fs.readFileSync(`${__dirname}/app.css`, 'utf8');
  const marker = cssPath.match(/LANDING v4[^*]*\*\//)[0];
  const cs = cssPath.slice(cssPath.search(/LANDING v4/) + marker.length);
  const hex = [...cs.matchAll(/#([0-9a-f]{6})(?=[;\s),])/gi)].map(m => m[1].toLowerCase());
  // Every solid colour is one of the three brand colours (navy, yellow, white).
  const offBrand = [...new Set(hex)].filter(h => !['0f3666', 'f4c542', 'ffffff'].includes(h));
  assert.deepEqual(offBrand, []);
});

test('subscription page lets the learner pick a stage and plan without inventing plan differences', () => {
  const a = setup(); a.signIn(); a.route('subscription');
  const out = a.output();
  assert.equal([...out.matchAll(/class="stage-option/g)].length, 3);
  assert.equal([...out.matchAll(/data-action="choose-plan"/g)].length, 3);
  assert.doesNotMatch(out, /سهمیه|تحلیل عمیق|ویژگی ویژه/);
  a.click('pick-stage', { stage: '2' });
  assert.equal(a.state().selectedStage, 2);
  a.click('choose-plan', { plan: 'Pro' });
  assert.equal(a.state().selectedPlan, 'Pro');
  assert.equal(a.location.hash, '/checkout');
});

test('practice hub centers the current lesson, shows the five-step track and nearby reviews', () => {
  const s = C.initial();
  C.start(s, 0, 'cafe'); s.session.step = 'analysis'; C.finish(s, Date.now() - 2 * 86400000);
  const a = setup(s); a.signIn(); a.route('practice');
  const out = a.output();
  assert.match(out, /class="hub"/);
  assert.match(out, /class="hub-now"/);
  assert.match(out, /class="hub-chip"/);
  assert.match(out, /class="practice-track"/);
  const track = out.match(/<ol class="practice-track"[\s\S]*?<\/ol>/)[0];
  const labels = [...track.matchAll(/<small>([^<]+)<\/small>/g)].map(m => m[1]);
  assert.deepEqual(labels, ['درس فعلی', 'تمرین تایپی', 'تمرین صوتی', 'تمرین در موقعیت', 'مرور']);
  assert.match(out, /class="hub-review"/);
  assert.match(out, /class="hub-review-list"/);
  assert.match(out, /class="hub-topic-list"/);
  assert.doesNotMatch(out, /buddy|mascot|hero-character/);
  assert.equal([...out.matchAll(/class="app-card"/g)].length, 0);
});

test('practice hub marks the running session step and offers a single clear call to action', () => {
  const s = C.initial(); C.start(s, 0, 'cafe'); s.session.step = 'practice';
  const a = setup(s); a.signIn(); a.route('practice');
  const out = a.output();
  const track = out.match(/<ol class="practice-track"[\s\S]*?<\/ol>/)[0];
  assert.equal([...track.matchAll(/is-now/g)].length, 1);
  assert.equal([...track.matchAll(/is-done/g)].length, 2);
  assert.match(out, /پایان و دیدن بازخورد/);
  assert.match(out, /What would you like to drink\?/);
});

test('no mascot or character art remains anywhere in the product or landing markup', () => {
  assert.doesNotMatch(html, /buddy\.svg|buddy-scene|hero-character/);
  assert.doesNotMatch(appSource, /buddy\.svg|buddy-scene|page-emblem/);
  const a = setup(); a.signIn();
  for (const route of Object.keys(a.pages)) { a.route(route); assert.doesNotMatch(a.output(), /buddy|mascot/); }
});

test('no personal data collection, network submission, fake microphone or external automation', () => {
  assert.doesNotMatch(appSource, /fetch\(|XMLHttpRequest|getUserMedia|MediaRecorder|type="password"/);
  assert.doesNotMatch(appSource, /document\.cookie|sendBeacon|new WebSocket/);
  assert.doesNotMatch(fs.readFileSync(`${__dirname}/app.css`, 'utf8'), /url\(/);
});
