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
  const tabs = ['cafe', 'film', 'travel'].map(n => { const el = elements.get(`#tab-${n}`); el.dataset.scene = n; el.id = `tab-${n}`; return el; });
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
  return { ...api, elements, window, document, location, stored, starts, tabs, route, click, output: () => elements.get('#product-app').innerHTML };
}

function complete(s, stage, topic, now = 1000) { assert.equal(C.start(s, stage, topic), true); s.session.step = 'analysis'; assert.equal(C.finish(s, now), true); }

test('landing retains brand, slogan and real internal anchors; obsolete dialog removed', () => {
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /زبان رو جوری که واقعا هست یادبگیر\./);
  assert.doesNotMatch(html, /<dialog|دوره‌ها|اساتید/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const m of html.matchAll(/href="#(?!\/)([^"]+)"/g)) assert.ok(ids.includes(m[1]));
  for (const file of ['app.js', 'flow.js', 'app.css']) assert.ok(html.includes(file));
});

test('all twenty product routes render; links, actions and IDs resolve', () => {
  const a = setup(); a.signIn();
  assert.equal(Object.keys(a.pages).length, 20);
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
  a.route('login'); a.elements.get('#privacy-consent').checked = true;
  a.click('request-code'); a.route('verify'); a.click('verify');
  assert.equal(a.location.hash, '/review');
});

test('onboarding preserves known selections and does not change learning stage', () => {
  const a = setup(); a.route('onboarding');
  const form = a.elements.get('#onboarding-form'); form.values = { goal: 'work', experience: 'new', interest: 'film' };
  form.fire('submit', { target: form });
  assert.equal(a.state().preferences.interest, 'film');
  assert.equal(a.state().preferences.goal, 'work');
  assert.equal(a.state().stage, 0);
  assert.equal(a.location.hash, '/login');
});

test('consent, wrong code, expiry and resend are explicit demo states', () => {
  const a = setup(); a.route('login'); a.click('request-code');
  assert.match(a.elements.get('#auth-feedback').textContent, /تأیید/);
  a.elements.get('#privacy-consent').checked = true; a.click('request-code');
  assert.equal(a.location.hash, '/verify'); a.route('verify');
  for (const name of ['code-wrong', 'code-expired', 'code-resend']) { a.click(name); assert.match(a.output(), /warning/); }
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

test('review tomorrow, earlier retry on errors, later review on success and no double count', () => {
  const s = C.initial(); complete(s, 0, 'cafe', 1000);
  assert.deepEqual(C.due(s, 1001), []);
  assert.deepEqual(C.due(s, 86401001), ['0:cafe']);
  C.review(s, '0:cafe', false, 2000); assert.equal(s.reviewAt['0:cafe'], 602000);
  C.review(s, '0:cafe', true, 3000); assert.equal(s.reviewAt['0:cafe'], 259203000);
  C.review(s, '0:cafe', true, 4000); assert.equal(s.reviewed.length, 1);
  assert.equal(C.review(s, '1:film', true), false);
});

test('payment failure/pending/cancellation do not unlock; repeated success is idempotent', () => {
  const s = C.initial(); s.order = { stage: 0, plan: 'Medium', status: 'preview' };
  for (const status of ['failed', 'pending', 'cancelled']) { C.payment(s, status); assert.deepEqual(s.access, []); }
  C.payment(s, 'success'); C.payment(s, 'success');
  assert.deepEqual(s.access, [0]); assert.equal(s.plan, 'Medium');
  assert.equal(C.payment(s, 'nonsense'), false);
});

test('payment form requires consent and renders all four result states', () => {
  const a = setup(); a.signIn(); a.route('checkout'); a.click('create-order');
  assert.equal(a.state().order, null);
  a.elements.get('#checkout-consent').checked = true; a.click('create-order'); a.route('payment');
  for (const status of ['failed', 'pending', 'cancelled', 'success']) {
    a.click('payment-state', { status }); assert.match(a.output(), /بدون تراکنش/);
  }
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

test('landing tabs, keyboard navigation and mobile menu remain functional', () => {
  const a = setup(); a.tabs[1].fire('click'); assert.equal(a.elements.get('#better-line').textContent, C.topics.film.phrase);
  a.tabs[1].fire('keydown', { key: 'ArrowLeft' }); assert.equal(a.tabs[2].attrs['aria-selected'], 'true');
  const toggle = a.elements.get('#menu-toggle'); toggle.fire('click'); assert.equal(toggle.attrs['aria-expanded'], 'true');
  a.document.fire('keydown', { key: 'Escape' }); assert.equal(toggle.attrs['aria-expanded'], 'false');
});

test('choosing an upgrade does not change active plan before payment', () => {
  const a = setup(); a.signIn(); a.route('subscription');
  a.click('choose-plan', { plan: 'Pro' });
  assert.equal(a.state().plan, 'Basic');
  assert.equal(a.state().selectedPlan, 'Pro');
  a.route('checkout'); a.elements.get('#checkout-consent').checked = true;
  a.click('create-order'); a.route('payment');
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

test('no personal data collection, network submission, fake microphone or external automation', () => {
  assert.doesNotMatch(appSource, /fetch\(|XMLHttpRequest|getUserMedia|MediaRecorder|type="password"|type="tel"/);
  assert.doesNotMatch(fs.readFileSync(`${__dirname}/app.css`, 'utf8'), /url\(/);
});
