(function (root) {
  const stages = ['Silver', 'Gold', 'Diamond'];
  const prices = { Basic: 2600000, Medium: 3950000, Pro: 5500000 };
  const activityXP = s => s.completed.length * 30 + s.reviewed.length * 10;
  const milestones = s => [s.completed.length > 0, s.reviewed.length > 0, s.completed.filter(id => id.startsWith('0:')).length === 3];
  const topics = {
    cafe: { title: 'سفارش توی کافه', context: 'یه قهوه می‌خوای؛ با یه درخواست مؤدبانه شروع کن.', phrase: "I'd like a coffee, please.", meaning: 'یه قهوه می‌خواستم، لطفاً.', question: 'Hi! What would you like to drink?', wrong: 'Give me coffee.', tip: '«I’d like» یه راه مؤدبانه برای بیان خواسته‌ست.' },
    film: { title: 'حرف‌زدن دربارهٔ فیلم', context: 'فیلم تموم شده؛ حالا نظرت رو به دوستت بگو.', phrase: 'I really enjoyed it.', meaning: 'واقعاً ازش لذت بردم.', question: 'What did you think of the movie?', wrong: 'I enjoy it yesterday.', tip: '«Enjoyed» برای تجربه‌ایه که در گذشته داشتی.' },
    travel: { title: 'پیداکردن مسیر', context: 'توی یه شهر جدیدی و دنبال نزدیک‌ترین ایستگاه می‌گردی.', phrase: 'Where is the nearest station?', meaning: 'نزدیک‌ترین ایستگاه کجاست؟', question: 'Hi! Do you need any help?', wrong: 'Where station nearest?', tip: 'با «Where is» مکان و با «nearest» نزدیک‌ترین رو می‌پرسی.' }
  };
  function initial() { return { preferences: { goal: 'daily', experience: 'some', interest: 'cafe', minutes: '10', reminder: true }, completed: [], reviewed: [], reviewAt: {}, session: null, stage: 0, access: [], plan: 'Basic', selectedPlan: 'Basic', selectedStage: 0, assessment: null, order: null }; }
  function restore(raw) {
    const s = initial();
    if (!raw || typeof raw !== 'object') return s;
    for (const key of ['goal', 'experience', 'interest', 'minutes']) {
      const allowed = { goal: ['daily', 'travel', 'work'], experience: ['some', 'new', 'practice'], interest: Object.keys(topics), minutes: ['5', '10', '20'] };
      if (allowed[key].includes(raw.preferences?.[key])) s.preferences[key] = raw.preferences[key];
    }
    if (typeof raw.preferences?.reminder === 'boolean') s.preferences.reminder = raw.preferences.reminder;
    const validId = id => typeof id === 'string' && /^[0-2]:(cafe|film|travel)$/.test(id);
    s.completed = [...new Set((Array.isArray(raw.completed) ? raw.completed : []).filter(validId))];
    s.reviewed = [...new Set((Array.isArray(raw.reviewed) ? raw.reviewed : []).filter(id => s.completed.includes(id)))];
    for (const id of s.completed) if (Number.isFinite(raw.reviewAt?.[id])) s.reviewAt[id] = raw.reviewAt[id];
    if (Number.isInteger(raw.stage) && raw.stage >= 0 && raw.stage < 3) s.stage = raw.stage;
    s.access = [...new Set((Array.isArray(raw.access) ? raw.access : []).filter(n => Number.isInteger(n) && n >= 0 && n < 3))];
    if (['Basic', 'Medium', 'Pro'].includes(raw.plan)) s.plan = raw.plan;
    if (['Basic', 'Medium', 'Pro'].includes(raw.selectedPlan)) s.selectedPlan = raw.selectedPlan;
    if (validId(raw.session?.id) && ['learn', 'recall', 'speak', 'practice', 'analysis'].includes(raw.session.step)) s.session = { id: raw.session.id, step: raw.session.step, choice: ['correct', 'retry'].includes(raw.session.choice) ? raw.session.choice : null };
    if (Number.isInteger(raw.selectedStage) && stages[raw.selectedStage]) s.selectedStage = raw.selectedStage;
    if (raw.assessment?.stage === s.stage && typeof raw.assessment.passed === 'boolean' && s.completed.filter(id => id.startsWith(`${s.stage}:`)).length === 3) s.assessment = { stage: s.stage, passed: raw.assessment.passed };
    if (Number.isInteger(raw.order?.stage) && stages[raw.order.stage] && ['Basic', 'Medium', 'Pro'].includes(raw.order.plan) && ['preview', 'success', 'failed', 'pending', 'cancelled'].includes(raw.order.status)) s.order = { stage: raw.order.stage, plan: raw.order.plan, status: raw.order.status };
    return s;
  }
  const lessonId = (stage, topic) => `${stage}:${topic}`;
  const due = (s, now = Date.now()) => s.completed.filter(id => !s.reviewAt[id] || s.reviewAt[id] <= now);
  const canStart = (s, stage, topic) => stage <= s.stage && (s.access.includes(stage) || s.completed.includes(lessonId(stage, topic)) || (stage === 0 && s.completed.filter(id => id.startsWith('0:')).length < 3));
  function start(s, stage, topic) {
    if (!stages[stage] || !topics[topic] || !canStart(s, stage, topic)) return false;
    s.session = { id: lessonId(stage, topic), step: 'learn', choice: null };
    return true;
  }
  function finish(s, now = Date.now()) {
    if (!s.session || s.session.step !== 'analysis') return false;
    const id = s.session.id;
    if (!s.completed.includes(id)) { s.completed.push(id); s.reviewAt[id] = now + 86400000; }
    s.session = null;
    return true;
  }
  function review(s, id, correct, now = Date.now()) {
    if (!s.completed.includes(id)) return false;
    s.reviewAt[id] = now + (correct ? 3 * 86400000 : 600000);
    if (correct && !s.reviewed.includes(id)) s.reviewed.push(id);
    return true;
  }
  function assess(s, correct) {
    if (s.completed.filter(id => id.startsWith(`${s.stage}:`)).length < 3) return false;
    s.assessment = { stage: s.stage, passed: correct };
    return true;
  }
  function advance(s) {
    if (!s.assessment?.passed || s.assessment.stage !== s.stage || s.stage === 2 || !s.access.includes(s.stage + 1)) return false;
    s.stage++; s.assessment = null; s.session = null;
    return true;
  }
  function payment(s, status) {
    if (!s.order || !['success', 'failed', 'pending', 'cancelled'].includes(status)) return false;
    if (s.order.status === 'success') return status === 'success';
    s.order.status = status;
    if (status === 'success') { if (!s.access.includes(s.order.stage)) s.access.push(s.order.stage); s.plan = s.order.plan; }
    return true;
  }
  const api = { stages, prices, activityXP, milestones, topics, initial, restore, lessonId, due, canStart, start, finish, review, assess, advance, payment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SFCore = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
