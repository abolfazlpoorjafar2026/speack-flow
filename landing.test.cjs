const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

class Element {
  constructor() {
    this.attributes = {};
    this.listeners = {};
    this.children = [];
    this.dataset = {};
    this.hidden = false;
    const classes = new Set();
    this.classList = {
      contains: name => classes.has(name),
      remove: name => classes.delete(name),
      toggle: (name, force = !classes.has(name)) => {
        if (force) classes.add(name); else classes.delete(name);
        return force;
      }
    };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  fire(name, event = {}) { (this.listeners[name] || []).forEach(callback => callback({ preventDefault() {}, ...event })); }
  focus() { this.focused = true; }
  replaceChildren() { this.children = []; }
  append(child) { this.children.push(child); }
  querySelectorAll() { return this.children; }
}

function setup() {
  const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [`#${match[1]}`, new Element()]));
  const tabs = ['cafe', 'film', 'travel'].map(name => {
    const tab = elements[`#tab-${name}`];
    tab.id = `tab-${name}`;
    tab.dataset.scene = name;
    return tab;
  });
  const starts = [...html.matchAll(/\bdata-start(?=[\s>])/g)].map(() => new Element());
  const progress = Array.from({ length: 3 }, () => new Element());
  const dialog = elements['#start-dialog'];
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.fire('close'); };
  const document = new Element();
  document.body = { style: {} };
  document.querySelector = selector => elements[selector];
  document.querySelectorAll = selector => ({ '[data-scene]': tabs, '[data-start]': starts, '.demo-progress span': progress })[selector];
  document.createElement = () => new Element();
  const window = { location: { hash: '' } };
  vm.runInNewContext(script, { document, window });
  return { elements, tabs, starts, progress, document, window, dialog };
}

test('Persian page, exact slogan, unique IDs and valid internal links', () => {
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /زبان رو جوری که واقعا هست یادبگیر\./);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  for (const match of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.doesNotMatch(html, /data-go=|type="password"|fetch\(|localStorage|دوره‌ها|اساتید/);
});

test('Every CTA opens demo; closing restores focus and scrolling', () => {
  const { starts, elements, dialog, document } = setup();
  assert.ok(starts.length >= 8);
  for (const start of starts) {
    start.fire('click');
    assert.equal(dialog.open, true);
    assert.equal(elements['#intro-form'].hidden, false);
    assert.equal(document.body.style.overflow, 'hidden');
    elements['#close-dialog'].fire('click');
    assert.equal(dialog.open, false);
    assert.equal(document.body.style.overflow, '');
    assert.equal(start.focused, true);
  }
});

test('Scene tabs switch content and support RTL keyboard navigation', () => {
  const { tabs, elements } = setup();
  tabs[1].fire('click');
  assert.equal(elements['#better-line'].textContent, 'I really enjoyed it.');
  assert.equal(elements['#scene-panel'].attributes['aria-labelledby'], 'tab-film');
  tabs[1].fire('keydown', { key: 'ArrowLeft' });
  assert.equal(tabs[2].attributes['aria-selected'], 'true');
  assert.equal(tabs[2].tabIndex, 0);
  tabs[2].fire('keydown', { key: 'Home' });
  assert.equal(tabs[0].attributes['aria-selected'], 'true');
  tabs[0].fire('keydown', { key: 'End' });
  assert.equal(tabs[2].attributes['aria-selected'], 'true');
});

test('Mobile menu closes on navigation and Escape', () => {
  const { elements, document } = setup();
  const toggle = elements['#menu-toggle'];
  toggle.fire('click');
  assert.equal(toggle.attributes['aria-expanded'], 'true');
  document.fire('keydown', { key: 'Escape' });
  assert.equal(toggle.attributes['aria-expanded'], 'false');
  assert.equal(toggle.focused, true);
});

for (const scene of ['cafe', 'film', 'travel']) {
  test(`${scene}: personalization, incorrect/correct answers, review, restart and completion`, () => {
    const { elements: e, starts, dialog, window, progress } = setup();
    starts[0].fire('click');
    e['#interest'].value = scene;
    e['#goal'].value = 'work';
    e['#experience'].value = 'new';
    e['#intro-form'].fire('submit');
    assert.equal(e['#intro-form'].hidden, true);
    assert.equal(e['#lesson-step'].hidden, false);
    assert.equal(progress[1].classList.contains('done'), true);
    assert.match(e['#personal-note'].textContent, /کار و آیندهٔ شغلی/);
    assert.match(e['#personal-note'].textContent, /عبارت کوتاه/);
    e['#answer-options'].children[1].fire('click');
    assert.equal(e['#to-review'].hidden, true);
    assert.equal(e['#lesson-feedback'].hidden, false);
    e['#answer-options'].children[0].fire('click');
    assert.equal(e['#to-review'].hidden, false);
    e['#to-review'].fire('click');
    assert.equal(e['#review-step'].hidden, false);
    e['#review-options'].children[0].fire('click');
    assert.equal(e['#finish-demo'].hidden, true);
    e['#review-options'].children[1].fire('click');
    assert.equal(e['#finish-demo'].hidden, false);
    e['#restart-demo'].fire('click');
    assert.equal(e['#intro-form'].hidden, false);
    e['#intro-form'].fire('submit');
    assert.equal(e['#lesson-feedback'].hidden, true);
    e['#answer-options'].children[0].fire('click');
    e['#to-review'].fire('click');
    assert.equal(e['#review-feedback'].hidden, true);
    e['#review-options'].children[1].fire('click');
    e['#finish-demo'].fire('click');
    assert.equal(dialog.open, false);
    assert.equal(window.location.hash, 'path');
  });
}
