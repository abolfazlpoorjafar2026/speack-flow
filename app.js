(() => {
  const C = SFCore;
  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let state = C.initial();
  try { state = C.restore(JSON.parse(localStorage.getItem('speakflow-preview-v1'))); } catch (_) {}
  let signedIn = false;
  let authMode = 'signup';
  let authStatus = '';
  let authProfile = { name: '', phone: '' };
  let destination = 'dashboard';
  let reviewId = null;
  let reviewReady = false;
  let reviewMessage = '';
  let assessmentChoice = null;
  let supportDraft = false;
  let privacyConfirm = false;
  let viewStage = state.stage;
  let practiceError = false;
  let practiceMode = 'text';
  let onboardStep = 0;
  let screen = 'dashboard';
  const iconPaths = {
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    founder: '<path d="m12 3 10 5-10 5L2 8Zm-6 8v6c4 4 8 4 12 0v-6m4-3v9"/>',
    dashboard: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    roadmap: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19h8a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h6"/>',
    review: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-4v6l4 2"/>',
    progress: '<path d="M4 20V10m8 10V4m8 16v-7M2 21h20"/>',
    subscription: '<path d="m12 3 9 6-9 12L3 9Zm-9 6h18M8 3l4 18 4-18"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    support: '<path d="M4 13v-1a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4h-3M4 11H2v7h4v-7Zm16 0h2v7h-4v-7Z"/>',
    lesson: '<path d="M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Zm0 0v16"/>',
    practice: '<path d="M8 8h8M8 12h5M21 4v12a2 2 0 0 1-2 2H8l-5 4V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    login: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M10 18h4M9 6h6"/>',
    privacy: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-4 9 3 3 5-6"/>',
    complete: '<path d="m4 12 5 5L20 6"/><circle cx="12" cy="12" r="10"/>'
  };
  const icon = name => `<svg class="ui-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.lesson}</svg>`;
  const visualGroups = {
    onboarding:['01','شروع از خودت','START YOUR FLOW','roadmap'], login:['02','یه شروع ساده','WELCOME TO YOUR SPACE','login'], verify:['03','ورود به مسیر','ONE STEP CLOSER','privacy'],
    dashboard:['01','فضای یادگیری تو','YOUR DAILY FLOW','dashboard'], roadmap:['02','نقشهٔ راه تو','THE BIG PICTURE','roadmap'], lesson:['03','از فهمیدن تا گفتن','LEARN IT. USE IT.','lesson'], practice:['04','فضای تمرین تو','FIND YOUR VOICE','practice'], analysis:['05','یک قدم بهتر','SMALL STEPS. REAL CHANGE.','progress'], review:['06','دوباره به یاد بیار','MAKE IT STICK','review'], progress:['07','قدم‌های خودت','YOUR JOURNEY SO FAR','progress'],
    subscription:['08','انتخاب همراه مسیر','CHOOSE YOUR PACE','subscription'], checkout:['09','روشن و بدون ابهام','BEFORE YOU CONTINUE','subscription'], payment:['10','وضعیت سفارش تو','YOUR ORDER STATUS','privacy'], parent:['11','همراهِ یادگیری','SUPPORT THEIR JOURNEY','privacy'], assessment:['12','وقت به‌کاربردنه','PUT IT INTO PRACTICE','lesson'], result:['13','بازخورد برای ادامه','YOUR NEXT CHAPTER','progress'], settings:['14','متناسب با روز تو','MAKE IT YOURS','settings'], support:['15','تنها نمی‌مونی','HERE TO HELP','support'], privacy:['16','انتخاب با خودته','YOUR SPACE. YOUR CHOICE.','privacy'], completion:['17','مسیرت رو ببین','LOOK HOW FAR YOU CAME','complete']
  };
  const landing = $('#main');
  const shell = document.createElement('div');
  shell.id = 'product-app'; shell.hidden = true;
  landing.after(shell);
  const save = () => { try { localStorage.setItem('speakflow-preview-v1', JSON.stringify(state)); } catch (_) {} };
  const go = route => { if (location.hash === `#/${route}`) render(); else location.hash = `/${route}`; };
  const action = (label, name, cls = 'navy', attrs = '') => `<button type="${name.startsWith('submit-') ? 'submit' : 'button'}" class="button ${cls}" data-action="${name}" ${attrs}>${label}</button>`;
  const link = (label, route, cls = 'navy') => `<a class="button ${cls}" href="#/${route}">${label}</a>`;
  const note = (text, cls = '') => `<div class="app-note ${cls}">${text}</div>`;
  const head = (title, subtitle = '', extra = '') => {
    const [number, label, english, symbol] = visualGroups[screen] || ['18','فضای خودت','YOUR FLOW','profile'];
    return `<div class="page-head"><div class="page-heading-copy"><div class="page-caption"><span class="page-number en">${number}</span><span>${label}</span></div><h1 class="app-page-title" tabindex="-1">${title}</h1><p>${subtitle}</p><span class="page-english en">${english}</span></div>${extra}</div>`;
  };
  const empty = (title, text, button = '') => `<div class="app-empty"><span class="empty-symbol" aria-hidden="true">◎</span><h2>${title}</h2><p>${text}</p>${button}</div>`;
  const stageName = n => C.stages[n];
  const topicFor = id => C.topics[id.split(':')[1]];
  const current = () => state.session ? topicFor(state.session.id) : C.topics[state.preferences.interest];
  const navItems = [['dashboard','⌂','امروز من'],['roadmap','↗','سفر نُه'],['review','↶','مرور'],['progress','▥','پیشرفت من'],['subscription','◇','اشتراک من'],['profile','◎','پروفایل من'],['founder','◇','استاد و بنیان‌گذار'],['settings','⚙','تنظیمات'],['support','؟','پشتیبانی']];
  const labels = { profile:'پروفایل هنرجو',founder:'استاد و بنیان‌گذار', onboarding:'شروع مسیر', login:'ورود و ثبت‌نام', verify:'تأیید شماره', dashboard:'امروز من', roadmap:'سفر نُه · نقشهٔ ۹ماهه', lesson:'درس کوتاه', practice:'پارتنر مکالمه', analysis:'بازخورد جلسه', review:'مرور', progress:'پیشرفت', subscription:'اشتراک‌ها', checkout:'خلاصه سفارش', payment:'وضعیت پرداخت', parent:'راهنمای والد', assessment:'ارزیابی مرحله', result:'نتیجه ارزیابی', settings:'تنظیمات', support:'پشتیبانی', privacy:'حریم خصوصی', completion:'پایان مسیر' };
  function field(label, name, options, value) { return `<label class="app-field">${label}<select name="${name}">${options.map(([v,t]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`; }
  const interestField = () => field('کدوم موقعیت برات جذاب‌تره؟','interest',Object.entries(C.topics).map(([k,v])=>[k,v.title]),state.preferences.interest);
  const goalField = () => field('بیشتر برای چی زبان می‌خونی؟','goal',[['daily','استفاده در زندگی روزمره'],['travel','سفر و آشنایی با آدم‌ها'],['work','کار و آیندهٔ شغلی']],state.preferences.goal);
  const experienceField = () => field('تجربه‌ات با زبان چطوره؟','experience',[['some','قبلاً خوندم، ولی کم تمرین کردم'],['new','تازه دارم شروع می‌کنم'],['practice','می‌فهمم، می‌خوام بیشتر حرف بزنم']],state.preferences.experience);
  const steps = step => `<div class="app-stepper" aria-label="مراحل درس">${['فهم جمله','بازیابی تایپی','تکرار گفتاری','کاربرد در موقعیت'].map((t,i)=>`<span class="${step === i ? 'active' : ''}">${i+1}. ${t}</span>`).join('')}</div>`;
  const buddyScene = () => '';
  const money = value => value.toLocaleString('fa-IR');
  const faDigits = value => String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const stageProgress = i => state.completed.filter(id => id.startsWith(i + ':')).length;
  const reviewProgress = () => state.completed.length ? Math.round(state.reviewed.length / state.completed.length * 100) : 0;
  const nextStep = () => {
    const stage = state.stage, done = Object.keys(C.topics).filter(t => state.completed.includes(C.lessonId(stage, t)));
    if (done.length >= 3) return state.assessment?.passed ? 'ارزیابی مرحله رو پس دادی؛ بریم مرحلهٔ بعد.' : 'سه موقعیت این مرحله تموم شد؛ ارزیابی مرحله منتظرته.';
    const topic = Object.keys(C.topics).find(t => !state.completed.includes(C.lessonId(stage, t)));
    return C.topics[topic].title;
  };
  function reviewLadder(nextStep = -1) {
    const labels = ['یادگیری', ...C.reviewLabels];
    const active = nextStep < 0 ? -1 : nextStep + 1;
    return `<ol class="review-ladder" aria-label="فاصله‌های مرور">${labels.map((label, i) => `<li class="${i < active ? 'is-done' : i === active ? 'is-next' : ''}"><span class="ladder-dot" aria-hidden="true"></span><small>${label}</small></li>`).join('')}</ol>`;
  }
  function strengthSplit() {
    const strong = [], weak = [];
    for (const id of state.completed) {
      const t = topicFor(id), name = stageName(Number(id[0]));
      (state.reviewed.includes(id) ? strong : weak).push(`<li><span>${t.title}</span><small>${name}</small></li>`);
    }
    return `<div class="strength-split"><div><span class="split-label">قوی شدی</span><ul class="split-list">${strong.length ? strong.join('') : '<li class="is-muted">هنوز چیزی ثبت نشده</li>'}</ul></div><div><span class="split-label">جای تمرین بیشتر</span><ul class="split-list">${weak.length ? weak.join('') : '<li class="is-muted">چیزی منتظر تمرین نیست</li>'}</ul></div></div>`;
  }
  function gameMap() {
    return `<section class="game-map" aria-label="نقشهٔ ۹ماههٔ سفر نُه"><div class="map-guide"><div><h2>۹ ماه، ۳ سرزمین، کلی فرصت برای گفتن.</h2><p>هر ماه یه ایستگاه؛ درس‌ها و مرورها قدم‌های کوچیک بین ایستگاه‌هان.</p></div></div><div class="map-worlds">${C.stages.map((name,i)=>`<article class="map-world"><h3><span class="en">${name}</span><span>سرزمین ${i+1}</span></h3><div class="map-track">${Object.keys(C.topics).map((topic,j)=>{const done=state.completed.includes(C.lessonId(i,topic));const accessible=C.canStart(state,i,topic);return `<div class="map-stop"><button class="map-node ${done?'done':accessible?'ready':'locked'}" data-action="${accessible?'start':'view-stage'}" data-stage="${i}" data-topic="${topic}" aria-label="ماه ${i*3+j+1}؛ ${C.topics[topic].title}${done?'، تمرین نمونه تکمیل شده':''}">${done?'✓':i*3+j+1}</button><strong>ماه ${(i*3+j+1).toLocaleString('fa-IR')}</strong><span>${C.topics[topic].title}</span></div>`;}).join('')}</div><div class="map-finish">${icon('subscription')} ارزیابی پایان ${name}</div></article>`).join('')}</div><p class="map-disclaimer">۹ ایستگاه، نمایش ساختار زمانی مسیر است؛ هر ایستگاه فعلاً یک سناریوی نمونه دارد، نه محتوای کامل یک ماه.</p></section>`;
  }
  function progressChart(){
    return `<section class="app-card progress-chart"><h2>نمودار قدم‌های تو</h2><p>بر اساس جلسه‌های تکمیل‌شده؛ این نمودار نمرهٔ زبان نیست.</p><div class="chart-columns">${C.stages.map((n,i)=>{const count=state.completed.filter(id=>id.startsWith(i+':')).length;return `<div class="chart-column"><strong>${count} / ۳</strong><div class="chart-well"><span style="height:${count/3*100}%"></span></div><span class="en">${n}</span></div>`;}).join('')}</div></section>`;
  }
  function profile(){
    const xp=C.activityXP(state);
    return `${head('این سفر، مال خودته.','پروفایل هنرجو؛ قدم‌های واقعی همین نسخه، نه نتیجه‌های ساختگی.')}<div class="app-grid"><section class="app-card learner-card"><h2>زبان‌آموز SpeakFlow</h2><span class="app-badge">${stageName(state.stage)} · در مسیر یادگیری</span><div class="xp-total">${xp.toLocaleString('fa-IR')} <span class="en">XP</span></div><p>۳۰ امتیاز برای هر جلسهٔ جدید، ۱۰ امتیاز برای اولین مرور هر عبارت. تکرار جلسه امتیاز اضافه نمی‌ده.</p><div class="app-actions">${link('قدم بعدی من','dashboard')}${link('تنظیم هدف','settings','outline')}</div></section><div class="app-stack">${progressChart()}<section class="app-card"><h2>نشان‌هایی که به دست میاری</h2><div class="badge-shelf">${['اولین جمله','برگشتم برای مرور','سه قدم Silver'].map((name,i)=>`<div class="earned-badge ${C.milestones(state)[i]?'earned':''}">${icon('subscription')}<strong>${name}</strong><span>${C.milestones(state)[i]?'به دست آوردی':'هنوز در مسیر'}</span></div>`).join('')}</div></section></div></div>`;
  }
  function founder(){
    return `${head('آدم پشت این مسیر رو بشناس.','ابوالفضل پورجعفر؛ بنیان‌گذار SpeakFlow و طراح مسیر یادگیری.')}<div class="app-grid"><section class="app-card founder-profile"><div class="founder-avatar" aria-label="آواتار نوشتاری ابوالفضل">ا پ</div><h2>ابوالفضل پورجعفر</h2><span class="app-badge">بنیان‌گذار · راهنمای مسیر آموزش</span><p>از بچگی کمک‌کردن رو دوست داشتم. علاقه‌م به زبان رو با روش‌های جذاب یادگیری کنار هم گذاشتم تا چیزی که یاد می‌گیری، واقعاً به کارت بیاد.</p><div class="app-actions">${link('ببین مسیر چطور کار می‌کنه','roadmap')}</div></section><section class="app-card"><h2>فلسفهٔ آموزش ما</h2><ul class="app-list"><li><h3>یاد بگیر تا استفاده کنی</h3><p>هر عبارت توی یه موقعیت معنی پیدا می‌کنه.</p></li><li><h3>اشتباه، بخشی از راهه</h3><p>بازخورد باید کمک کنه جملهٔ بعدی رو بهتر بگی.</p></li><li><h3>بدون سردرگمی ادامه بده</h3><p>سفر نُه: Silver، Gold و Diamond، هر کدوم سه ماه.</p></li></ul></section></div>`;
  }
  const onboardQuestions = [
    {
      key: 'goal', title: 'این مسیر رو برای چی می‌خوای؟',
      hint: 'با جوابت، مثال‌های تمرین رو به زندگی خودت نزدیک‌تر می‌کنیم.',
      options: [['daily','برای زندگی روزمره'],['travel','برای سفر و آشنا شدن'],['work','برای کار و آینده']]
    },
    {
      key: 'experience', title: 'الان با انگلیسی چطوری؟',
      hint: 'این تعیین سطح نیست؛ فقط می‌خوایم از جای درست شروع کنی.',
      options: [['new','تازه شروع کردم'],['some','قبلاً خوندم، کم تمرین کردم'],['practice','می‌فهمم، می‌خوام حرف بزنم']]
    },
    {
      key: 'interest', title: 'دوست داری دربارهٔ چی تمرین کنی؟',
      hint: 'اولین موقعیت‌های تمرینت از همین‌جا انتخاب می‌شن.',
      options: [['cafe','سفارش توی کافه'],['film','حرف‌زدن دربارهٔ فیلم'],['travel','پیدا کردن مسیر']]
    }
  ];
  function onboarding() {
    const step = onboardStep;
    const q = onboardQuestions[step];
    const current = state.preferences[q.key];
    const pct = Math.round((step + 1) / onboardQuestions.length * 100);
    const isLast = step === onboardQuestions.length - 1;
    const choiceField = (question, chosen) => `<div class="onboard-options" role="radiogroup" aria-label="${esc(question.title)}">${question.options.map(([value,label]) => `<button type="button" class="onboard-choice ${chosen === value ? 'is-on' : ''}" role="radio" aria-checked="${chosen === value}" data-action="onboard-pick" data-key="${question.key}" data-value="${value}"><span class="choice-mark" aria-hidden="true"></span><span>${label}</span></button>`).join('')}</div>`;
    return `<div class="onboard-shell">
      <div class="onboard-top">
        <form id="onboarding-form" class="onboard-form">
          <div class="onboard-progress">
            <div class="onboard-bar"><span style="width:${pct}%"></span></div>
            <span class="onboard-count">${faDigits(step + 1)} از ${faDigits(onboardQuestions.length)}</span>
          </div>
          <div class="onboard-body">
            <p class="onboard-eyebrow">شروع مسیر خودت</p>
            <h1 class="onboard-title" tabindex="-1">${esc(q.title)}</h1>
            <p class="onboard-hint">${esc(q.hint)}</p>
            ${choiceField(q, current)}
          </div>
          <div class="onboard-actions">
            ${step > 0 ? '<button type="button" class="onboard-back" data-action="onboard-back">قبلی</button>' : '<span></span>'}
            <button type="submit" class="onboard-next">${isLast ? 'شروع کنیم' : 'ادامه'}<span aria-hidden="true">←</span></button>
          </div>
        </form>
      </div>
    </div>`;
  }
  function login() {
    const nameBlock = authMode === 'login'
      ? `<p class="auth-hint">با شمارهٔ موبایل و کد پیامکی وارد حساب خود شوید.</p>`
      : `<div class="auth-row">
           <label class="auth-field"><span>نام</span><input name="firstName" required maxlength="40" autocomplete="given-name" placeholder="مثلاً ابوالفضل"></label>
           <label class="auth-field"><span>نام خانوادگی</span><input name="lastName" required maxlength="40" autocomplete="family-name" placeholder="مثلاً پورجعفر"></label>
         </div>`;
    return `<div class="auth-page">
      <div class="auth-panel">
        <div class="auth-panel-head">
          <span class="auth-kicker">SpeakFlow</span>
          <h1 class="app-page-title" tabindex="-1">${authMode === 'login' ? 'ورود به حساب کاربری' : 'ساخت حساب کاربری'}</h1>
          <p>${authMode === 'login' ? 'برای ادامهٔ مسیر یادگیری، اطلاعات حساب خود را وارد کنید.' : 'اطلاعات خود را وارد کنید تا مسیر یادگیری شما ساخته شود.'}</p>
        </div>
        <form id="login-form" class="auth-form" novalidate>
          ${nameBlock}
          <label class="auth-field auth-phone-field"><span>شمارهٔ موبایل</span>
            <input id="auth-phone" name="phone" type="tel" inputmode="numeric" dir="ltr" lang="en" autocomplete="tel-national" maxlength="11" required placeholder="09xxxxxxxxx">
            <small>کد تأیید به همین شماره پیامک می‌شود. در این نسخهٔ نمایشی ارسال نمی‌شود.</small>
          </label>
          <div id="login-error" class="auth-error" role="status" hidden></div>
          <button class="button navy auth-submit" type="submit">${authMode === 'login' ? 'دریافت کد ورود' : 'دریافت کد تأیید'} <span aria-hidden="true">←</span></button>
        </form>
        <p class="auth-switch">${authMode === 'login' ? 'حساب ندارید؟ <button type="button" class="auth-link" data-action="toggle-auth">ساخت حساب جدید</button>' : 'قبلاً حساب ساخته‌اید؟ <button type="button" class="auth-link" data-action="toggle-auth">ورود به حساب</button>'}</p>
        <div class="auth-legal">
          <label class="app-check"><input type="checkbox" id="privacy-consent"> <span>با <a class="app-subtle-link" href="#/privacy">شرایط استفاده و حریم خصوصی</a> موافقم و می‌دانم این نسخه نمایشی است.</span></label>
        </div>
        <p class="auth-demo"><button type="button" class="auth-link" data-action="demo-login">ورود با حساب نمایشی، بدون شماره</button></p>
      </div>
      <aside class="auth-aside">
        
        <h2>زبان را برای استفاده یاد بگیرید.</h2>
        <p>درس کوتاه، تمرین مکالمه و مرور هدفمند در یک مسیر نُه‌ماهه با ساختار روشن.</p>
        <ul class="auth-points">
          <li>مسیر سه‌مرحله‌ای Silver، Gold و Diamond</li>
          <li>تمرین مکالمه در موقعیت‌های واقعی</li>
          <li>مرور فاصله‌دار برای تثبیت آموخته‌ها</li>
        </ul>
        <p class="auth-aside-foot">SpeakFlow · آموزش کاربردی زبان انگلیسی</p>
      </aside>
    </div>`;
  }
  function verify() {
    const who = authProfile.name ? `<b>${esc(authProfile.name)}</b> · ` : '';
    return `<div class="auth-page auth-page-single">
      <div class="auth-panel">
        <div class="auth-panel-head">
          <span class="auth-kicker">تأیید شماره</span>
          <h1 class="app-page-title" tabindex="-1">کد تأیید را وارد کنید</h1>
          <p>${who}کد شش‌رقمی به شمارهٔ <bdi>${esc(faDigits(authProfile.phone) || 'شمارهٔ شما')}</bdi> ارسال شد.</p>
        </div>
        <form id="verify-form" class="auth-form" novalidate>
          <label class="auth-field auth-code-field"><span>کد تأیید</span>
            <input id="auth-code" name="code" type="text" inputmode="numeric" dir="ltr" lang="en" autocomplete="one-time-code" maxlength="6" required placeholder="- - - - - -">
            <small>در این نسخهٔ نمایشی پیامکی ارسال نمی‌شود؛ برای ادامه، دکمهٔ تأیید نمایشی را بزنید.</small>
          </label>
          <div id="verify-status" role="status">${authStatus ? `<div class="auth-error">${esc(authStatus)}</div>` : ''}</div>
          <button class="button navy auth-submit" type="submit">تأیید و ورود <span aria-hidden="true">←</span></button>
        </form>
        <p class="auth-switch"><button type="button" class="auth-link" data-action="edit-phone">ویرایش شماره یا نام</button> · <button type="button" class="auth-link" data-action="code-resend">ارسال دوبارهٔ کد</button></p>
        <details class="app-demo-controls"><summary>نمایش حالت‌های خطای کد (نمایشی)</summary>${action('کد اشتباه','code-wrong','outline')}${action('کد منقضی','code-expired','outline')}</details>
      </div>
    </div>`;
  }
  function dashboard() {
    const due = C.due(state); const count = state.completed.length;
    const nextTopic = Object.keys(C.topics).find(t => !state.completed.includes(C.lessonId(state.stage,t))) || state.preferences.interest;
    const totalDone = state.completed.length, totalAll = 9;
    const overall = Math.round(totalDone / totalAll * 100);
    return `${head(count ? 'خوش برگشتی؛ از همین‌جا ادامه بده.' : 'سلام، به مسیر خودت خوش اومدی.','یه قدم کوچک، بعد یه فرصت برای استفاده از چیزی که یاد گرفتی.')}
      <section class="dash-hero">
        <div class="dash-hero-copy">
          <span class="app-kicker">${stageName(state.stage)} · ماه ${faDigits(state.stage*3+1)} تا ${faDigits(state.stage*3+3)}</span>
          <h2>${state.session ? 'جلسه‌ات نیمه‌تموم مونده.' : nextStep()}</h2>
          <p>${state.session ? 'چیزی پاک نشده؛ از همون قدم ادامه بده.' : C.topics[nextTopic].context}</p>
          <div class="app-actions">${state.session ? action('ادامهٔ جلسه','resume') : action('شروع درس کوتاه','start','',`data-topic="${nextTopic}" data-stage="${state.stage}"`)}${link('دیدن کل مسیر','roadmap','outline')}</div>
        </div>
        <div class="dash-hero-progress">
          <span class="progress-ring" style="--value:${overall}" role="img" aria-label="پیشرفت کلی: ${overall} درصد"><b>${faDigits(overall)}٪</b></span>
          <span class="progress-caption">${faDigits(totalDone)} از ${faDigits(totalAll)} موقعیت</span>
        </div>
      </section>
      <div class="dash-stats">
        <div class="dash-stat"><span class="stat-value">${faDigits(count)}</span><span class="stat-label">درس انجام‌شده</span></div>
        <div class="dash-stat"><span class="stat-value">${faDigits(state.reviewed.length)}</span><span class="stat-label">تمرین مرورشده</span></div>
        <div class="dash-stat"><span class="stat-value">${faDigits(reviewProgress())}٪</span><span class="stat-label">وضعیت مرورها</span></div>
        <div class="dash-stat"><span class="stat-value en">${stageName(state.stage)}</span><span class="stat-label">سطح فعلی</span></div>
      </div>
      <section class="dash-path" aria-label="مسیر Silver تا Diamond">
        ${C.stages.map((name,i)=>{
          const done = stageProgress(i), active = i === state.stage;
          return `<a class="path-stop ${active?'is-current':''} ${done>=3?'is-complete':''}" href="#/roadmap">
            <span class="path-name en">${name}</span>
            <span class="path-months">ماه ${faDigits(i*3+1)} تا ${faDigits(i*3+3)}</span>
            <span class="path-bar"><span style="width:${Math.round(Math.min(done,3)/3*100)}%"></span></span>
            <span class="path-count">${faDigits(Math.min(done,3))} از ۳</span>
            ${active ? '<span class="path-here">اینجا هستی</span>' : done>=3 ? '<span class="path-here is-done">تموم شده</span>' : ''}
          </a>`;
        }).join('')}
      </section>
      <div class="dash-review">
        <div class="dash-review-head">
          <div><span class="app-kicker">مرور فاصله‌دار</span><h2>${due.length ? 'امروز نوبت مرورته.' : count ? 'مرورها برای نوبت بعد آماده‌ان.' : 'با اولین درس، مرور هم شروع می‌شه.'}</h2></div>
          ${link(due.length ? 'شروع مرور' : 'دیدن مرورها','review','outline')}
        </div>
        ${reviewLadder(state.completed.length ? C.stepOf(state, state.completed[0]) : -1)}
        <p class="dash-review-note">${due.length ? `${faDigits(due.length)} عبارت سررسید شده؛ هر مرور، فاصلهٔ بعدی رو بیشتر می‌کنه.` : 'هر چیزی که یاد می‌گیری، سر فاصله‌های مشخص دوباره مرور می‌شه تا توی ذهن بمونه.'}</p>
      </div>
      <section class="dash-strength">
        <h2>نقاط قوت و جای تمرین</h2>
        ${strengthSplit()}
      </section>
      <section class="dash-back">
        <div><h2>برگشت به مرحله‌های قبلی</h2><p>هر وقت خواستی، محتوای مراحل قبل برای مرور و تقویت در دسترسه.</p></div>
        <div class="back-links">${state.stage > 0 ? C.stages.slice(0, state.stage).map((name,i)=>`<button type="button" class="back-chip" data-action="view-stage" data-stage="${i}">${name} · ماه ${faDigits(i*3+1)}–${faDigits(i*3+3)}</button>`).join('') : '<span class="back-empty">الان توی Silver هستی؛ مرحلهٔ قبلی نداری.</span>'}</div>
      </section>
      ${due.length && state.preferences.reminder ? note('وقتشه چیزی که یاد گرفتی رو دوباره به کار ببری؛ مرورهای سررسیدشده منتظرتن.') : ''}
      ${!state.access.includes(0) ? note('در این نمونه، سه سناریوی رایگان Silver رو تجربه می‌کنی. تعداد جلسات رایگان محصول نهایی هنوز قطعی نیست.','warning') : ''}`;
  }
  function roadmap() {
    return `${head('سفر نُه؛ نقشهٔ ماجراجویی تو.','سه مرحلهٔ سه‌ماهه؛ برگشت به درس قبلی، پیشرفت فعلیت رو پاک نمی‌کنه.')}${gameMap()}<div class="app-grid three">${C.stages.map((name,i)=>{const done=stageProgress(i);const isCurrent=i===state.stage;return `<article class="app-card app-stage ${viewStage === i ? 'selected' : ''} ${isCurrent?'is-current':''}"><div class="app-row"><h2 class="en">${name}</h2><span class="app-badge">ماه ${i*3+1} تا ${i*3+3}</span></div>${isCurrent?'<span class="app-badge success">اینجا هستی</span>':done>=3?'<span class="app-badge">مرحلهٔ کامل‌شده</span>':''}<p>${['شروع مکالمه‌های روزمره','ادامهٔ گفت‌وگو و بیان تجربه','بیان نظر در موقعیت‌های متنوع'][i]}</p><div class="app-progress"><span style="width:${Math.min(done,3)/3*100}%"></span></div><p style="margin-top:10px">${Math.min(done,3)} از ۳ سناریوی نمونه</p><div class="app-actions">${action(isCurrent?'ادامهٔ همین مرحله':'مرور این مرحله','view-stage','outline',`data-stage="${i}"`)}</div></article>`;}).join('')}</div><div class="app-card" style="margin-top:24px"><div class="app-row"><h2>${stageName(viewStage)} · موقعیت‌های تمرین</h2><span class="app-badge">${viewStage<state.stage?'مرحلهٔ قبلی، برای مرور و تقویت':viewStage===state.stage?'مرحلهٔ فعلی تو':'محتوای نمونه برای نمایش ساختار'}</span></div><ul class="app-list">${Object.entries(C.topics).map(([key,t])=>{const done=state.completed.includes(C.lessonId(viewStage,key));const available=C.canStart(state,viewStage,key);return `<li class="app-row"><div><h3>${t.title} ${done?'✓':''}</h3><p>${available ? done ? 'قابل تکرار؛ پیشرفتت حفظ می‌شه' : 'یادگیری، بازیابی، تمرین و بازخورد' : 'بعد از فعال‌شدن دسترسی این مرحله'}</p></div>${available?action(done?'تمرین دوباره':'شروع درس','start','outline',`data-stage="${viewStage}" data-topic="${key}"`):viewStage>state.stage?link('اول ارزیابی مرحلهٔ فعلی','assessment','outline'):action('دیدن اشتراک','stage-subscription','outline',`data-stage="${viewStage}"`)}</li>`;}).join('')}</ul></div><div class="app-actions">${link('ارزیابی مرحلهٔ فعلی','assessment','outline')}${link('پیشرفت من','progress','outline')}</div>`;
  }
  function lesson() {
    if (!state.session) return empty('یه موقعیت رو انتخاب کن.','درس از مسیر یادگیری شروع می‌شه.',link('انتخاب درس','roadmap'));
    const t=current(); const step = state.session.step;
    if (['practice','analysis'].includes(step)) return empty('قدم قبلی رو گذروندی.','از ادامهٔ جلسه وارد قدم فعلی شو.',action('ادامهٔ جلسه','resume'));
    let body;
    if(step==='learn') body=`<p>${t.context}</p><div class="phrase-card"><div class="en" lang="en">${t.phrase}</div><p>${t.meaning}</p></div><div class="app-note">${t.tip}</div><div class="app-actions">${action('فهمیدم؛ حالا از حافظه','lesson-recall')}</div>`;
    if(step==='recall') body=`<p>بدون دیدن جملهٔ قبلی، این عبارت رو به انگلیسی بنویس: «${t.meaning}»</p><form id="recall-form"><label class="app-field">پاسخ تو<input name="answer" autocomplete="off" dir="ltr" lang="en" required maxlength="150" placeholder="Type your answer…"></label><div class="app-actions">${action('بررسی جمله','submit-recall')}${action('یه بار دیگه ببینم','lesson-learn','outline')}</div></form><div id="recall-feedback" role="status"></div>`;
    if(step==='speak') body=`<div class="phrase-card"><div class="en" lang="en">${t.phrase}</div><p>${t.meaning}</p></div><h3>یک بار با صدای خودت بگو.</h3><p>آرام تکرار کن و به ترتیب کلمه‌ها دقت کن. توی این نمونه صدات ضبط یا امتیازدهی نمی‌شه.</p><div class="app-actions">${action('تکرار کردم؛ بریم توی موقعیت','lesson-practice')}${action('ادامه با تمرین متنی','lesson-practice','outline')}</div>`;
    return `<div class="app-narrow">${head(t.title,'Silver نقطهٔ شروعه؛ این درس ساختار چهارگامی مسیر رو نشون می‌ده.')}${steps(['learn','recall','speak'].indexOf(step))}<div class="app-card">${body}</div><div class="app-actions">${link('بعداً ادامه می‌دم','dashboard','outline')}</div></div>`;
  }
  const sessionStage = step => step === 'learn' || step === 'recall' ? 0 : step === 'speak' ? 1 : step === 'practice' ? 2 : 3;
  function practiceTrack(activeStep) {
    const items = ['درس فعلی','تمرین تایپی','تمرین صوتی','تمرین در موقعیت','مرور'];
    return `<ol class="practice-track" aria-label="مراحل تمرین">${items.map((label,i)=>`<li class="${i<activeStep?'is-done':i===activeStep?'is-now':''}"><span class="track-dot" aria-hidden="true">${i<activeStep?'✓':faDigits(i+1)}</span><small>${label}</small></li>`).join('')}</ol>`;
  }
  function practiceHub() {
    const stage = state.stage;
    const nextTopic = Object.keys(C.topics).find(t => !state.completed.includes(C.lessonId(stage,t))) || state.preferences.interest;
    const t = state.session ? current() : C.topics[nextTopic];
    const inSession = Boolean(state.session);
    const step = inSession ? sessionStage(state.session.step) : 0;
    const done = Object.keys(C.topics).filter(k => state.completed.includes(C.lessonId(stage,k)));
    const due = C.due(state);
    const dueSoon = state.completed.filter(id => !due.includes(id)).slice(0,3);
    const cta = state.session
      ? (state.session.step === 'analysis' ? action('دیدن بازخورد جلسه','resume') : action('ادامهٔ تمرین','resume'))
      : action('شروع درس: ' + t.title,'start','',`data-topic="${nextTopic}" data-stage="${stage}"`);
    const ctaLine = state.session
      ? `قدم بعدی: ${state.session.step === 'learn' ? 'خوندن جمله' : state.session.step === 'recall' ? 'بازنویسی جمله' : state.session.step === 'speak' ? 'گفتن با صدای بلند' : state.session.step === 'practice' ? 'استفاده توی موقعیت' : 'دیدن بازخورد'}`
      : `قدم بعدی: ${esc(t.title)}`;
    return `<div class="hub">
      <section class="hub-now" aria-label="درس فعلی">
        <div class="hub-now-top">
          <span class="hub-chip">${inSession ? 'جلسهٔ در جریان' : 'درس فعلی'}</span>
          <span class="hub-stage">${stageName(stage)} · ماه ${faDigits(stage*3+1)} تا ${faDigits(stage*3+3)}</span>
        </div>
        <div class="hub-now-main">
          <div class="hub-now-copy">
            <h2>${esc(t.title)}</h2>
            <p>${esc(t.context)}</p>
          </div>
          <div class="hub-now-cta">
            ${cta}
            <span class="hub-cta-line">${ctaLine}</span>
          </div>
        </div>
        <div class="hub-progress">
          <div class="hub-progress-head"><span>پیشرفت این مرحله</span><b>${faDigits(done.length)} از ۳ موقعیت</b></div>
          <div class="hub-bar"><span style="width:${Math.round(Math.min(done.length,3)/3*100)}%"></span></div>
        </div>
      </section>
      <section class="hub-track-wrap" aria-label="مسیر تمرین">
        <h3>این جلسه چطور جلو می‌ره</h3>
        ${practiceTrack(step)}
        <div class="hub-track-note">
          ${done.length
            ? `تا حالا ${faDigits(done.length)} موقعیت این مرحله رو تمرین کردی.`
            : 'هنوز موقعیتی توی این مرحله تمرین نشده.'}
          ${done.length && done.length < 3 ? ` ${faDigits(3 - done.length)} موقعیت دیگه مونده.` : ''}
        </div>
      </section>
      <div class="hub-split">
        <section class="hub-review" aria-label="مرورهای نزدیک">
          <div class="hub-review-head"><h3>مرورهای نزدیک</h3><span class="hub-count">${faDigits(due.length)} سررسیدشده</span></div>
          ${due.length || dueSoon.length
            ? `<ul class="hub-review-list">${(due.length ? due : dueSoon).slice(0,3).map(id => `<li><span class="hub-review-dot" aria-hidden="true"></span><span>${esc(topicFor(id).title)}</span><small>${due.includes(id) ? 'همین حالا' : 'در نوبت بعد'}</small></li>`).join('')}</ul>`
            : '<p class="hub-empty">بعد از اولین تمرین، مرورها این‌جا ظاهر می‌شن.</p>'}
          <div class="app-actions">${link('برنامهٔ مرور','review','outline')}</div>
        </section>
        <section class="hub-topics" aria-label="موقعیت‌های این مرحله">
          <h3>موقعیت‌های ${stageName(stage)}</h3>
          <ul class="hub-topic-list">
            ${Object.entries(C.topics).map(([key, topic]) => {
              const isDone = state.completed.includes(C.lessonId(stage,key));
              const available = C.canStart(state, stage, key);
              return `<li class="${isDone?'is-done':''}">
                <span class="hub-topic-state" aria-hidden="true">${isDone?'✓':''}</span>
                <span>${esc(topic.title)}</span>
                ${available ? (isDone ? '' : `<button type="button" class="hub-topic-start" data-action="start" data-stage="${stage}" data-topic="${key}">شروع</button>`) : '<small>بعداً</small>'}
              </li>`;
            }).join('')}
          </ul>
        </section>
      </div>
    </div>`;
  }
  function practice() {
    if(!state.session) return head('پارتنر مکالمه','امروز این‌جایی؛ فقط همون قدم بعدی رو بردار.') + practiceHub();
    const t=current();
    const step = sessionStage(state.session.step);
    if (state.session.step === 'learn' || state.session.step === 'recall' || state.session.step === 'speak') return lesson();
    return head('در حال تمرین','تمرینت رو تموم کن و بازخوردش رو ببین.') + `<div class="hub-session">
      ${practiceTrack(step)}
      <div class="app-grid" style="margin-top:20px">
        <div class="app-card practice-card-main">
          <div class="app-row"><h2>${esc(t.title)}</h2><span class="pill">پارتنر نمونه</span></div>
          <div class="bubble" style="margin:22px 0;max-width:100%"><span class="speaker">YOUR PARTNER</span>${esc(t.question)}</div>
          <p>${esc(t.context)}</p>
          <div class="answer-options">${[t.phrase,t.wrong].map((text,i)=>`<button class="app-choice en" data-action="practice-choice" data-choice="${i===0?'correct':'retry'}" aria-pressed="${state.session.choice===(i===0?'correct':'retry')}" lang="en">${text}</button>`).join('')}</div>
          ${practiceError ? note('ارتباط در حالت آزمایشی قطع شد. پاسخت حفظ شده؛ دوباره تلاش کن یا به داشبورد برگرد.','warning') : ''}
          <div class="app-actions">${action(practiceError?'تلاش دوباره':'پایان و دیدن بازخورد','end-practice')}</div>
        </div>
        <aside class="app-stack">
          <div class="app-card">
            <h3>گیر کردی؟</h3>
            <p>لازم نیست از اول بی‌نقص باشی. عبارت درس رو دوباره ببین و برگرد.</p>
            <div class="app-actions">${action('دیدن راهنما','practice-help','outline')}${action('تمرین صوتی','voice-mode','outline')}</div>
            <div id="practice-help" role="status"></div>
            ${practiceMode==='voice'?note('در محصول نهایی این‌جا اجازهٔ میکروفون گرفته می‌شه. برای این نمونه، جمله رو بلند بگو و پاسخ متنی رو انتخاب کن. صدایی ضبط نمی‌شه.'):''}
          </div>
          <div class="app-card"><h3>جلسه‌ات نیمه‌تمام بمونه؟</h3><p>از همین‌جا می‌تونی برگردی؛ چیزی پاک نمی‌شه.</p><div class="app-actions">${link('بعداً ادامه می‌دم','dashboard','outline')}</div></div>
          <details class="app-demo-controls"><summary>بررسی حالت خطای ارتباط</summary>${action('نمایش قطع ارتباط','network-error','outline')}</details>
        </aside>
      </div>
    </div>`;
  }
  function analysis() {
    if(!state.session || state.session.step!=='analysis') return empty('هنوز جلسه‌ای تموم نشده.','بعد از تمرین، بازخورد همون جلسه رو اینجا می‌بینی.',link('رفتن به مسیر','roadmap'));
    const t=current(); const correct=state.session.choice==='correct';
    return `${head('یه جمله بهتر، یه قدم جلوتر.','بازخورد آموزشی نمونه از پاسخ انتخابی تو؛ نه نمرهٔ تلفظ یا تحلیل صوت.')}<div class="app-grid"><div class="app-card"><h2>${correct?'عبارت مناسب رو انتخاب کردی.':'می‌تونیم طبیعی‌تر بگیمش.'}</h2><p>پاسخ انتخابی تو:</p><div class="phrase-card"><div class="en" lang="en">${correct?t.phrase:t.wrong}</div></div><h3>عبارت پیشنهادی</h3><p class="en" lang="en">${t.phrase}</p>${note(t.tip,correct?'success':'')}<div class="app-actions">${action('ثبت جلسه و برنامهٔ مرور','finish-session')}${action('دوباره تمرین کنم','retry-practice','outline')}</div></div><div class="app-card"><h2>قدم بعد: از حافظه</h2><p>این عبارت برای مرور فردا ثبت می‌شه. می‌تونی همین حالا هم شکل مرور رو ببینی.</p><ul class="app-list"><li>یادگیری در موقعیت</li><li>استفاده در مکالمه</li><li>یک نکته برای اصلاح</li><li>مرور فاصله‌دار</li></ul></div></div>`;
  }
  function review() {
    const due=C.due(state); const id=reviewId && state.completed.includes(reviewId) ? reviewId : due[0];
    if(!id) return `${head('مرورهای تو','هر چیزی که یاد می‌گیری، سر فاصله‌های مشخص دوباره برمی‌گرده.')}<div class="app-card">${empty(state.completed.length?'فعلاً مرور سررسیدشده نداری.':'هنوز عبارتی برای مرور نیست.',state.completed.length?'نوبت بعدی مرور، بعد از یادگیری برای فردا تنظیم شده. می‌تونی زودتر هم تمرین کنی.':'اولین درس رو انجام بده؛ عبارت‌ها بعد از جلسه اینجا جمع می‌شن.',state.completed.length?action('تمرین زودتر از موعد','preview-review'):link('شروع اولین درس','roadmap'))}</div>${state.completed.length?`<section class="app-card review-schedule"><h2>برنامهٔ مرورت چطور جلو می‌ره</h2><p>بعد از یادگیری، هر عبارت سر این فاصله‌ها دوباره ازت پرسیده می‌شه.</p>${reviewLadder(C.stepOf(state, state.completed[0]))}</section>`:''}`;
    reviewId=id; const t=topicFor(id); const step=C.stepOf(state,id);
    const nextLabel = C.reviewLabels[Math.min(step+1, C.reviewLabels.length-1)];
    return `<div class="app-narrow">${head('این بار بدون دیدن جواب.','جواب اشتباه یعنی یه فرصت دیگه برای تمرین؛ نه برگشت به اول مسیر.')}<div class="app-card"><span class="app-badge">${stageName(Number(id[0]))} · ${t.title}</span><h2 style="margin-top:20px">چطور می‌گی «${t.meaning}»؟</h2><div class="answer-options">${[t.wrong,t.phrase].map((text,i)=>`<button class="app-choice en" data-action="review-answer" data-choice="${i===1?'correct':'retry'}" lang="en">${text}</button>`).join('')}</div><div id="review-feedback" role="status">${reviewMessage}</div><div class="app-actions" id="review-next" ${reviewReady?'':'hidden'}>${action('ثبت و ادامهٔ مرور','review-next')}</div></div><section class="app-card review-schedule"><h2>این عبارت کجای برنامه‌ست</h2><p class="review-next-note">مرور بعدی: <b>${nextLabel}</b></p>${reviewLadder(step)}</section><div class="app-actions">${link('برگشت به امروز من','dashboard','outline')}</div></div>`;
  }
  function progress() {
    return `${head('پیشرفت، با قدم‌هایی که برداشتی.','آمار این صفحه از فعالیت‌های خودت در همین مرورگر ساخته می‌شه.')}${progressChart()}<div class="app-grid three">${C.stages.map((name,i)=>`<div class="app-card"><h2 class="en">${name}</h2><span class="app-metric">${faDigits(Math.min(stageProgress(i),3))} / ۳</span><p>سناریوی نمونهٔ تکمیل‌شده</p></div>`).join('')}</div><section class="app-card review-schedule" style="margin-top:20px"><h2>وضعیت مرورها</h2><p class="review-next-note">${state.completed.length?`مرورهای انجام‌شده: <b>${faDigits(state.reviewed.length)}</b> از ${faDigits(state.completed.length)}`:'هنوز چیزی برای مرور ثبت نشده.'}</p>${reviewLadder(state.completed.length?C.stepOf(state,state.completed[0]):-1)}</section><div class="app-card" style="margin-top:20px"><h2>جلسه‌ها و عبارت‌های من</h2>${state.completed.length?`<ul class="app-list">${state.completed.map(id=>`<li class="app-row"><div><h3>${topicFor(id).title}</h3><p class="en" lang="en">${topicFor(id).phrase}</p></div><span class="app-badge ${state.reviewed.includes(id)?'success':''}">${state.reviewed.includes(id)?'مرور شده':'در برنامهٔ مرور'}</span></li>`).join('')}</ul>`:empty('شروع تازه، بدون آمار ساختگی.','با تکمیل اولین جلسه، عبارت‌ها و پیشرفتت اینجا ثبت می‌شن.',link('شروع مسیر','roadmap'))}</div><div class="app-actions">${link('ارزیابی مرحله','assessment','outline')}${link('مرور عبارت‌ها','review','outline')}</div>`;
  }
  function subscription() {
    const plans = ['Basic','Medium','Pro'];
    const current = state.access.length ? state.access.map(stageName).join('، ') : 'تجربهٔ رایگان Silver';
    return `${head('پلنت رو انتخاب کن، بعد پرداخت کن.','قیمت هر پلن برای یک مرحلهٔ سه‌ماهه‌ست. بعد از تأیید پرداخت، دسترسی همون مرحله فعال می‌شه.')}
      <div class="sub-grid">
        <section class="app-card sub-pick">
          <h2>مرحله‌ای که می‌خوای باز کنی</h2>
          <p class="sub-help">مسیر نُه‌ماهه سه مرحله داره. برای هر مرحله یک بار پرداخت می‌کنی.</p>
          <div class="stage-pick" role="radiogroup" aria-label="مرحلهٔ سفارش">
            ${C.stages.map((name,i)=>`<button type="button" class="stage-option ${state.selectedStage===i?'is-on':''}" role="radio" aria-checked="${state.selectedStage===i}" data-action="pick-stage" data-stage="${i}"><strong class="en">${name}</strong><small>ماه ${faDigits(i*3+1)} تا ${faDigits(i*3+3)}</small></button>`).join('')}
          </div>
          <dl class="app-summary sub-access"><div><dt>دسترسی فعلی</dt><dd>${current}</dd></div></dl>
          <a class="app-subtle-link" href="#/parent">والد پرداخت‌کننده است؟ راهنمای والد</a>
        </section>
        <section class="app-card sub-now">
          <span class="app-kicker">سفارش انتخابی</span>
          <h2>${stageName(state.selectedStage)} · <span class="en">${state.selectedPlan}</span></h2>
          <div class="sub-total"><span>${money(C.prices[state.selectedPlan])}</span> تومان</div>
          <p class="sub-help">برای یک مرحلهٔ سه‌ماهه. تمدید خودکار نداریم.</p>
          <ol class="mini-steps"><li>انتخاب پلن</li><li>پرداخت از درگاه</li><li>تأیید پرداخت</li><li>فعال شدن دسترسی</li></ol>
        </section>
      </div>
      <div class="plan-grid app-plans">
        ${plans.map(name=>`<article class="plan-card ${state.selectedPlan===name?'is-on':''}">
          <span class="en plan-name">${name}</span>
          <div class="plan-price">${money(C.prices[name])}<small>تومان / مرحلهٔ سه‌ماهه</small></div>
          <p class="plan-line">برای یک مرحلهٔ سه‌ماهه از مسیر.</p>
          <button type="button" class="button ${state.selectedPlan===name?'':'outline'}" data-action="choose-plan" data-plan="${name}">${state.selectedPlan===name?'ادامهٔ خرید ' + name:'انتخاب ' + name}</button>
        </article>`).join('')}
      </div>
      <p class="sub-note">تفاوت دقیق امکانات Basic، Medium و Pro پیش از خرید اعلام می‌شه؛ فعلاً هیچ ویژگی اضافه‌ای به پلن‌ها نسبت داده نمی‌شه.</p>
      <details class="app-demo-controls"><summary>نمایش حالت انقضای دسترسی</summary>${action('پایان دسترسی نمونه، با حفظ سابقه','expire-access','outline')}</details>`;
  }
  function checkout() {
    const o = state.order;
    const plan = o ? o.plan : state.selectedPlan;
    const stage = o ? o.stage : state.selectedStage;
    const paid = o && o.status === 'success';
    return `<div class="app-narrow">${head('یه نگاه آخر، بعد پرداخت.','مبلغ و مرحله رو ببین؛ بعد به درگاه پرداخت می‌ری.')}
      <div class="app-card">
        <ol class="mini-steps is-flow"><li class="is-done">انتخاب پلن</li><li class="is-current">پرداخت از درگاه</li><li>تأیید پرداخت</li><li>فعال شدن دسترسی</li></ol>
        <dl class="app-summary">
          <div><dt>مرحله</dt><dd>${stageName(stage)}</dd></div>
          <div><dt>پلن</dt><dd class="en">${plan}</dd></div>
          <div><dt>مدت</dt><dd>سه ماه</dd></div>
          <div><dt>مبلغ قابل پرداخت</dt><dd>${money(C.prices[plan])} تومان</dd></div>
        </dl>
        ${paid ? note('این سفارش قبلاً پرداخت شده و دسترسی‌اش فعاله.','success') : ''}
        <div class="app-actions">
          ${paid ? action('ادامهٔ مسیر یادگیری','after-purchase') : action('پرداخت از درگاه','pay-gateway')}
          ${link('تغییر پلن یا مرحله','subscription','outline')}
        </div>
        <div id="checkout-feedback" role="status"></div>
        <p class="checkout-fine">مبلغ برای یک مرحلهٔ سه‌ماهه‌ست. تمدید خودکار نداریم و دسترسی بعد از تأیید پرداخت فعال می‌شه.</p>
      </div>
    </div>`;
  }
  function payment() {
    const o=state.order;
    if(!o) return empty('هنوز سفارشی نساختی.','اول پلن رو انتخاب کن تا سفارش ساخته بشه.',link('انتخاب پلن','subscription'));
    const stepOf = o.status==='preview' ? 1 : o.status==='success' ? 3 : 2;
    const flows = ['انتخاب پلن','پرداخت از درگاه','تأیید پرداخت','فعال شدن دسترسی'];
    const flowsHtml = `<ol class="mini-steps is-flow">${flows.map((t,i)=>`<li class="${i<stepOf?'is-done':i===stepOf?'is-current':''}">${t}</li>`).join('')}</ol>`;
    if (o.status === 'preview') {
      return `<div class="app-narrow">${head('در حال انتقال به درگاه پرداخت.','صفحهٔ درگاه در محصول نهایی باز می‌شه؛ این‌جا فقط مسیر رو می‌بینی.')}
        <div class="app-card">
          ${flowsHtml}
          <dl class="app-summary"><div><dt>مرحله</dt><dd>${stageName(o.stage)}</dd></div><div><dt>پلن</dt><dd class="en">${o.plan}</dd></div><div><dt>مبلغ</dt><dd>${money(C.prices[o.plan])} تومان</dd></div></dl>
          <p class="gateway-line">پرداخت در صفحهٔ امن درگاه انجام می‌شه. بعد از پرداخت، نتیجه رو همین‌جا می‌بینی.</p>
          <div class="app-actions">${action('رفتن به درگاه','payment-state','', 'data-status="pending"')}${link('لغو و برگشت به سفارش','checkout','outline')}</div>
          <details class="app-demo-controls"><summary>نتیجهٔ پرداخت (نمایشی، بدون تراکنش)</summary>${['success','failed','cancelled'].map((st,i)=>action(['پرداخت موفق','پرداخت ناموفق','لغو پرداخت'][i],'payment-state','outline',`data-status="${st}"`)).join('')}</details>
        </div>
      </div>`;
    }
    const statuses={
      pending:['در حال تأیید پرداخت','نتیجه از درگاه گرفته می‌شه. چند لحظه صبر کن و دوباره پرداخت نکن.'],
      success:['پرداخت تأیید شد.','دسترسی مرحلهٔ '+stageName(o.stage)+' فعال شد.'],
      failed:['پرداخت تأیید نشد.','مبلغی کم نشده. می‌تونی دوباره از درگاه پرداخت کنی یا سفارش رو بازبینی کنی.'],
      cancelled:['پرداخت لغو شد.','سابقهٔ یادگیری سر جاشه؛ هر وقت خواستی دوباره پرداخت کن.']
    };
    const [title,text]=statuses[o.status]||statuses.pending;
    return `<div class="app-narrow">${head(title,text)}
      <div class="app-card">
        ${flowsHtml}
        <dl class="app-summary"><div><dt>مرحله</dt><dd>${stageName(o.stage)}</dd></div><div><dt>پلن</dt><dd class="en">${o.plan}</dd></div><div><dt>مبلغ</dt><dd>${money(C.prices[o.plan])} تومان</dd></div><div><dt>تمدید خودکار</dt><dd>ندارد</dd></div></dl>
        ${o.status==='success'
          ? `<div class="app-actions">${action('ادامهٔ مسیر یادگیری','after-purchase')}${link('مدیریت اشتراک','subscription','outline')}</div>`
          : o.status==='pending'
            ? `<div class="app-actions">${action('بررسی نتیجه','payment-state','', 'data-status="success"')}${link('برگشت به سفارش','checkout','outline')}</div>`
            : `<div class="app-actions">${action('پرداخت دوباره','retry-payment')}${link('بازبینی سفارش','checkout','outline')}</div>`}
        <p class="checkout-fine">این نسخه نمایشیه و تراکنش واقعی انجام نمی‌ده.</p>
      </div>
    </div>`;
  }
  function parent() {
    return `${head('برای کسی که هزینه رو پرداخت می‌کنه.','والد می‌تونه خریدار باشه؛ زبان‌آموز همچنان صاحب مسیر یادگیری خودشه.')}<div class="app-grid"><div class="app-card"><h2>فرزندت چه مسیری رو می‌ره؟</h2><ul class="app-list"><li><h3>یادگیری کاربردی</h3><p>یه عبارت در موقعیت، تمرین، بازخورد و مرور.</p></li><li><h3>سه مرحلهٔ سه‌ماهه</h3><p>شروع از Silver؛ سپس Gold و Diamond.</p></li><li><h3>پیشرفت قابل مشاهده</h3><p>جلسه‌ها و مرورهای تکمیل‌شده، به‌جای وعدهٔ نتیجهٔ قطعی.</p></li></ul></div><div class="app-card"><h2>قبل از تصمیم خرید</h2><p>انتخاب فعلی: ${stageName(state.selectedStage)} · ${state.selectedPlan}. مبلغ مرحلهٔ سه‌ماهه: ${money(C.prices[state.selectedPlan])} تومان. پرداخت از درگاه آنلاین انجام می‌شه و بعد از تأیید، دسترسی فعال می‌شه.</p>${note('پرداخت هزینه به‌معنای دسترسی خودکار به متن خصوصی مکالمه‌های زبان‌آموز نیست.')}<div class="app-actions">${link('دیدن سفارش نمونه','checkout')}${link('پرسیدن سؤال','support','outline')}</div></div></div>`;
  }
  function assessment() {
    const ready=state.completed.filter(id=>id.startsWith(state.stage+':')).length===3;
    if(!ready) return `${head('ارزیابی پایان '+stageName(state.stage),'یه موقعیت برای استفاده از چیزهایی که یاد گرفتی.')}<div class="app-card">${empty('اول تمرین‌های مرحله رو انجام بده.','در این پروتوتایپ بعد از سه سناریوی نمونه، ارزیابی باز می‌شه. معیار محصول نهایی باید با محتوای آموزشی تنظیم بشه.',link('برگشت به درس‌ها','roadmap'))}</div>`;
    return `<div class="app-narrow">${head('آماده‌ای خودت انتخاب کنی؟','این تکلیف نمونه‌ست، نه گواهی یا ارزیابی کامل مهارت زبان.')}<div class="app-card"><h2>یه سفارش مؤدبانه</h2><p>توی کافه‌ای و یه قهوه می‌خوای. کدوم جمله مناسب‌تره؟</p>${[C.topics.cafe.wrong,C.topics.cafe.phrase].map((t,i)=>`<button class="app-choice en" data-action="assessment-choice" data-choice="${i===1?'correct':'retry'}" aria-pressed="${assessmentChoice===(i===1?'correct':'retry')}">${t}</button>`).join('')}<div class="app-actions">${action('دیدن نتیجه','assessment-submit')}${link('هنوز آماده نیستم','roadmap','outline')}</div><div id="assessment-feedback" role="status"></div></div></div>`;
  }
  function result() {
    if(!state.assessment) return empty('هنوز ارزیابی ندادی.','وقتی آماده‌ای، سناریوی پایان مرحله رو انجام بده.',link('ارزیابی مرحله','assessment'));
    const passed=state.assessment.passed;
    return `<div class="app-narrow">${head(passed?'عبارت مناسب رو به کار بردی.':'یه تمرین کوتاه دیگه کمک می‌کنه.',passed?'نتیجهٔ تکلیف نمونه ثبت شد؛ حالا قدم بعد رو انتخاب کن.':'محتوای قبلی در دسترسته؛ می‌تونی برگردی و دوباره امتحان کنی.')}<div class="app-card"><div class="phrase-card"><div class="en">${C.topics.cafe.phrase}</div></div><p>${C.topics.cafe.tip}</p><div class="app-actions">${passed?(state.stage===2?link('جمع‌بندی مسیر','completion'):action('رفتن به '+stageName(state.stage+1),'advance')):action('تمرین ترمیمی','remedial')}${link('برگشت به محتوا','roadmap','outline')}${!passed?link('ارزیابی دوباره','assessment','outline'):''}</div>${passed&&state.stage<2?note('ورود به مرحلهٔ بعد علاوه بر ارزیابی، به دسترسی همون مرحله نیاز داره.'):''}</div></div>`;
  }
  function settings() {
    return `${head('مسیرت رو با روزت هماهنگ کن.','هدف، علاقه و زمان تمرین رو عوض کن؛ مرحلهٔ یادگیریت عوض نمی‌شه.')}<div class="app-grid"><form class="app-card" id="settings-form"><h2>ترجیح‌های یادگیری</h2>${goalField()}${interestField()}${field('زمان روزانه','minutes',[['5','۵ دقیقه'],['10','۱۰ دقیقه'],['20','۲۰ دقیقه']],state.preferences.minutes)}<label class="app-check"><input name="reminder" type="checkbox" ${state.preferences.reminder?'checked':''}>نمایش یادآوری مرور داخل داشبورد</label>${action('ذخیرهٔ ترجیح‌ها','submit-settings')}<div id="settings-feedback" role="status"></div></form><div class="app-stack"><div class="app-card"><h2>حساب نمونه</h2><p>شماره یا اطلاعات واقعی دریافت نمی‌شه. پیشرفت این پروتوتایپ فقط روی همین مرورگر نگه داشته می‌شه.</p><div class="app-actions">${action('خروج از حساب نمایشی','logout','outline')}${link('حریم خصوصی و پاک‌کردن داده','privacy','outline')}</div></div><div class="app-card"><h2>اشتراک و ادامهٔ مسیر</h2><p>برای تمدید یا تغییر سطح امکانات، مرحله و پلن رو جدا انتخاب کن.</p><div class="app-actions">${link('مدیریت اشتراک','subscription','outline')}${link('پشتیبانی و پیگیری درخواست','support','outline')}</div></div></div></div>`;
  }
  function support() {
    return `${head('کجا به کمک نیاز داری؟','یادگیری، دسترسی یا سفارش؛ موضوع رو روشن انتخاب کن.')}<div class="app-grid"><form class="app-card" id="support-form">${field('موضوع درخواست','subject',[['learning','مشکل در درس یا تمرین'],['payment','پرداخت نامشخص یا کسر وجه'],['access','دسترسی، تمدید یا تغییر پلن'],['refund','درخواست لغو یا استرداد'],['privacy','حریم خصوصی']], 'learning')}<label class="app-field">توضیح کوتاه<textarea name="message" maxlength="1000" required placeholder="اطلاعات بانکی، شماره یا دادهٔ شخصی ننویس."></textarea><small>این فرم نمایشی است؛ متن فقط در همین صفحه پیش‌نمایش می‌شه و ارسال نمی‌شه.</small></label>${action('پیش‌نمایش درخواست','submit-support')}<div id="support-feedback" role="status">${supportDraft?note('پیش‌نمایش درخواست آماده شد. برای ارسال واقعی، سرویس پشتیبانی باید متصل بشه.','success'):''}</div></form><div class="app-card"><h2>اگر از حسابت کم شده…</h2><p>وقتی پرداخت در انتظار بررسیه، قبل از پرداخت دوباره وضعیت همون سفارش باید پیگیری بشه.</p>${note('این نسخه تراکنش واقعی نداره؛ شرایط و مهلت استرداد هم باید پیش از عرضه نهایی اعلام بشن.')}<h3>اگر تمرین قطع شد…</h3><p>از داشبورد «ادامهٔ جلسه» رو بزن. تکمیل‌نشدن جلسه، به‌معنای پایان درس نیست.</p><div class="app-actions">${link('برگشت به امروز من','dashboard','outline')}</div></div></div>`;
  }
  function privacy() {
    return `<div class="app-narrow">${head('اطلاعاتت، با انتخاب خودت.','توضیح داده‌های همین نسخهٔ نمایشی، نه سیاست حقوقی محصول نهایی.')}<div class="app-card"><ul class="app-list"><li><h3>چه چیزی ذخیره می‌شه؟</h3><p>ترجیح‌های یادگیری، شناسهٔ درس‌ها و وضعیت پیشرفت نمونه در حافظهٔ همین مرورگر. نه شماره، نه کد پیامکی، نه صدا.</p></li><li><h3>چیزی ارسال می‌شه؟</h3><p>ورود، پرداخت، فرم پشتیبانی و تمرین‌ها به سرویس پشتیبان متصل نیستن. فونت صفحه از سرویس Google Fonts بارگیری می‌شه.</p></li><li><h3>دادهٔ نوجوان و والد</h3><p>قبل از عرضهٔ واقعی، قواعد رضایت و دسترسی والد باید روشن بشن؛ صرف پرداخت، مجوز دیدن مکالمه‌های خصوصی نیست.</p></li></ul>${privacyConfirm?note('با تأیید، همهٔ پیشرفت و تنظیمات نمونه از همین مرورگر پاک می‌شه. این کار قابل برگشت نیست.','warning'):''}<div class="app-actions">${action(privacyConfirm?'تأیید پاک‌کردن دادهٔ نمونه':'پاک‌کردن دادهٔ همین نمونه',privacyConfirm?'confirm-delete':'request-delete','outline')}${privacyConfirm?action('انصراف','cancel-delete','outline'):link('برگشت به تنظیمات','settings','outline')}</div></div></div>`;
  }
  function completion() {
    if(state.stage!==2 || !state.assessment?.passed) return empty('هنوز مسیر تموم نشده.','در پایان Diamond جمع‌بندی فعالیت‌هات رو می‌بینی.',link('ادامهٔ مسیر','roadmap'));
    return `${head('این مسیر، با قدم‌های تو ساخته شد.','جمع‌بندی نمایشی پایان Silver، Gold و Diamond.')}<div class="app-card"><div class="app-status-icon">✓</div><h2>از اولین جمله تا موقعیت‌های بیشتر</h2><p>${state.completed.length} سناریوی نمونه رو تکمیل کردی و ${state.reviewed.length} عبارت رو مرور کردی.</p>${note('این جمع‌بندی، گواهی تسلط بر زبان نیست؛ سابقهٔ فعالیت‌های خودت در پروتوتایپه.')}<div class="app-actions">${link('دیدن پیشرفت','progress')}${link('برگشت به عبارت‌ها','review','outline')}${link('بازدید از مراحل قبلی','roadmap','outline')}</div></div>`;
  }
  const pages={profile,founder,onboarding,login,verify,dashboard,roadmap,lesson,practice,analysis,review,progress,subscription,checkout,payment,parent,assessment,result,settings,support,privacy,completion};
  function render() {
    let route=location.hash.startsWith('#/')?location.hash.slice(2).split('?')[0]:'';
    if(!route){landing.hidden=false;shell.hidden=true;document.body.classList.remove('in-app');document.title='SpeakFlow | زبان رو جوری که واقعا هست یادبگیر.';return;}
    if(!pages[route]){go('dashboard');return;}
    const publicPages=['onboarding','login','verify','privacy','parent','support','founder','subscription','roadmap'];
    if(!signedIn&&!publicPages.includes(route)){destination=route;authMode='login';go('login');return;}
    landing.hidden=true;shell.hidden=false;document.body.classList.add('in-app');
    screen=route;
    shell.setAttribute('data-screen',route);
    document.title=labels[route]+' | SpeakFlow';
    const pageContent=pages[route]();
    if (route === 'onboarding') { shell.innerHTML = pageContent; window.scrollTo(0, 0); bindForms(); return; }
    const authLayout = route === 'login' || route === 'verify';
    const content=pageContent.includes('app-page-title')?pageContent:head(labels[route],'قدم بعدی رو از همین‌جا انتخاب کن.')+pageContent;
    if(authLayout){shell.innerHTML=`<div class="auth-shell">${pageContent}</div>`;window.scrollTo(0,0);bindForms();return;}
    shell.innerHTML=`<div class="app-layout"><aside class="app-sidebar"><div class="sidebar-caption"><span class="sidebar-monogram en" aria-hidden="true">sf.</span><span>فضای یادگیری تو<small class="en">LET'S GET TALKING</small></span></div>${navItems.map(([r,i,t])=>`<a href="#/${r}" ${r===route?'aria-current="page"':''}><span class="nav-icon">${icon(r)}</span>${t}</a>`).join('')}<div class="sidebar-bottom"><b>${stageName(state.stage)} · ${state.access.length?state.plan:'تجربهٔ رایگان'}</b><p>زبان رو جوری که واقعا هست یادبگیر.</p><a class="app-subtle-link" href="#">بازگشت به لندینگ</a></div></aside><main class="app-workspace" id="app-main"><div class="app-topline"><span>SpeakFlow / ${labels[route]}</span><span class="pill">نسخهٔ نمایشی · بدون تراکنش واقعی</span></div>${content}<footer class="product-footer"><strong>SpeakFlow · هر قدم، یه فرصت برای گفتن</strong><div><a href="#/roadmap">سفر نُه</a><a href="#/profile">پروفایل من</a><a href="#/founder">بنیان‌گذار</a><a href="#/support">پشتیبانی</a></div></footer></main></div><nav class="app-footer-nav" aria-label="منوی فضای یادگیری">${navItems.filter(([r])=>['dashboard','roadmap','review','progress','settings'].includes(r)).map(([r,i,t])=>`<a href="#/${r}" ${r===route?'aria-current="page"':''}><span class="nav-icon">${icon(r)}</span>${t}</a>`).join('')}</nav>`;
    shell.querySelector('.app-page-title')?.focus({preventScroll:true});
    window.scrollTo(0,0);
    bindForms();
  }
  function normalize(text) {return text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?]/g,'').replace(/\s+/g,' ');}
  function bindForms(){
    const loginForm = $('#login-form');
    loginForm?.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(event.target);
      const first = String(data.get('firstName') || '').trim();
      const last = String(data.get('lastName') || '').trim();
      const phone = String(data.get('phone') || '').replace(/[^0-9]/g, '');
      const error = $('#login-error');
      const show = message => { if (error) { error.textContent = message; error.hidden = false; error.focus?.(); } };
      if (authMode !== 'login' && (!first || !last)) return show('نام و نام خانوادگی را کامل وارد کنید.');
      if (authMode !== 'login' && (first.length < 2 || last.length < 2)) return show('نام و نام خانوادگی باید دست‌کم دو حرف باشند.');
      if (!/^09[0-9]{9}$/.test(phone)) return show('شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
      if (!$('#privacy-consent')?.checked) return show('برای ادامه، شرایط استفاده و حریم خصوصی را تأیید کنید.');
      if (error) error.hidden = true;
      authProfile = { name: authMode === 'login' ? '' : `${first} ${last}`.trim(), phone };
      authStatus = '';
      go('verify');
    });
    const verifyForm = $('#verify-form');
    verifyForm?.addEventListener('submit', event => {
      event.preventDefault();
      const code = String(new FormData(event.target).get('code') || '').replace(/[^0-9]/g, '');
      if (code && code.length !== 6) { authStatus = 'کد باید شش رقم باشد.'; render(); return; }
      signedIn = true; save(); go(destination);
    });
    $('#onboarding-form')?.addEventListener('change',event=>{if(['goal','experience','interest'].includes(event.target.name)){state.preferences[event.target.name]=event.target.value;save();}});
    $('#onboarding-form')?.addEventListener('submit',event=>{
      event.preventDefault();
      const q = onboardQuestions[onboardStep];
      const answer = event.target?.values?.[q.key] ?? state.preferences[q.key];
      state.preferences[q.key] = answer; save();
      if (onboardStep < onboardQuestions.length - 1) { onboardStep++; render(); return; }
      onboardStep = 0; authMode='signup'; destination='dashboard'; go('login');
    });
    $('#settings-form')?.addEventListener('submit',event=>{event.preventDefault();const d=new FormData(event.target);for(const key of ['goal','interest','minutes'])state.preferences[key]=d.get(key);state.preferences.reminder=d.has('reminder');save();$('#settings-feedback').innerHTML=note('ترجیح‌هات در همین مرورگر ذخیره شد.','success');});
    $('#recall-form')?.addEventListener('submit',event=>{event.preventDefault();const value=new FormData(event.target).get('answer');const ok=normalize(value)===normalize(current().phrase);$('#recall-feedback').innerHTML=ok?note('درسته؛ حالا یه بار با صدای خودت تکرارش کن.','success')+action('ادامه به تکرار گفتاری','lesson-speak'):note('دوباره امتحان کن. عبارت نمونه: <bdi lang="en">'+esc(current().phrase)+'</bdi>','warning');});
    $('#support-form')?.addEventListener('submit',event=>{event.preventDefault();supportDraft=true;$('#support-feedback').innerHTML=note('پیش‌نمایش درخواست آماده شد؛ ارسال واقعی انجام نشده. برای اتصال پشتیبانی به سرویس نیاز داریم.','success');});
    $('select[name="stage"]')?.addEventListener('change',event=>{state.selectedStage=Number(event.target.value);});
  }
  const handlers={
    'onboard-pick':el=>{const k=el.dataset.key,v=el.dataset.value;if(k)state.preferences[k]=v;save();render();},
    'onboard-back':()=>{if(onboardStep>0){onboardStep--;render();}},
    'submit-onboarding':()=>{},'submit-settings':()=>{},'submit-recall':()=>{},'submit-support':()=>{},
    'toggle-auth':()=>{authMode=authMode==='login'?'signup':'login';authStatus='';render();},
    'demo-login':()=>{authProfile={name:'حساب نمایشی',phone:''};signedIn=true;save();go(destination);},
    'edit-phone':()=>{authStatus='';go('login');},
    'code-wrong':()=>{authStatus='کد واردشده درست نیست. در نسخهٔ واقعی، می‌تونی اصلاحش کنی یا بعد از مهلت دوباره درخواست بدی.';render();},
    'code-expired':()=>{authStatus='مهلت کد تموم شده؛ کد تازه درخواست کن.';render();},
    'code-resend':()=>{authStatus='حالت ارسال مجدد نمایش داده شد؛ هیچ پیامکی ارسال نشده.';render();},
    start:el=>{const stage=Number(el.dataset.stage);if(C.start(state,stage,el.dataset.topic)){save();go('lesson');}else{state.selectedStage=stage;go('subscription');}},
    resume:()=>{go(!state.session?'roadmap':state.session.step==='analysis'?'analysis':state.session.step==='practice'?'practice':'lesson');},
    'view-stage':el=>{viewStage=Number(el.dataset.stage);if(viewStage>state.stage){state.selectedStage=viewStage;go('subscription');return;}render();},
    'stage-subscription':el=>{state.selectedStage=Number(el.dataset.stage);go('subscription');},
    'lesson-learn':()=>{if(state.session){state.session.step='learn';save();render();}},
    'lesson-recall':()=>{if(state.session){state.session.step='recall';save();render();}},
    'lesson-speak':()=>{if(state.session){state.session.step='speak';save();render();}},
    'lesson-practice':()=>{if(state.session){state.session.step='practice';practiceError=false;save();go('practice');}},
    'practice-choice':el=>{if(state.session){state.session.choice=el.dataset.choice;save();shell.querySelectorAll('[data-action="practice-choice"]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));}},
    'practice-help':()=>{$('#practice-help').innerHTML=note(esc(current().phrase)+'<br>'+current().tip);},
    'voice-mode':()=>{practiceMode='voice';render();},
    'network-error':()=>{practiceError=true;render();},
    'end-practice':()=>{if(practiceError){practiceError=false;render();return;}if(!state.session.choice){$('#practice-help').innerHTML=note('اول یکی از پاسخ‌ها رو انتخاب کن.','warning');return;}state.session.step='analysis';save();go('analysis');},
    'retry-practice':()=>{state.session.step='practice';state.session.choice=null;save();go('practice');},
    'finish-session':()=>{C.finish(state);save();go(state.completed.filter(id=>id.startsWith('0:')).length===3&&!state.access.includes(0)?'subscription':'dashboard');},
    'preview-review':()=>{reviewId=state.completed[0];reviewReady=false;render();},
    'review-answer':el=>{if(!reviewId)return;const correct=el.dataset.choice==='correct';C.review(state,reviewId,correct);save();reviewReady=correct;const step=C.stepOf(state,reviewId);const next=C.reviewLabels[step];reviewMessage=note(correct?'درسته! مرور بعدی: '+next+'.':currentReviewHelp(),correct?'success':'warning');if(correct){render();return;}$('#review-feedback').innerHTML=reviewMessage;$('#review-next').hidden=true;},
    'review-next':()=>{reviewId=null;reviewReady=false;reviewMessage='';render();},
    'pick-stage':el=>{state.selectedStage=Number(el.dataset.stage);save();render();},
    'choose-plan':el=>{state.selectedPlan=el.dataset.plan;save();go('checkout');},
    'create-order':()=>{state.order={stage:state.selectedStage,plan:state.selectedPlan,status:'preview'};save();go('payment');},
    'pay-gateway':()=>{state.order={stage:state.selectedStage,plan:state.selectedPlan,status:'preview'};save();go('payment');},
    'retry-payment':()=>{if(state.order&&state.order.status!=='success'){state.order.status='preview';save();go('payment');}},
    'payment-state':el=>{C.payment(state,el.dataset.status);save();render();},
    'after-purchase':()=>{if(state.assessment?.passed&&state.order.stage===state.stage+1){if(C.advance(state))assessmentChoice=null;}viewStage=state.stage;save();go('roadmap');},
    'expire-access':()=>{state.access=[];save();render();},
    'assessment-choice':el=>{assessmentChoice=el.dataset.choice;render();},
    'assessment-submit':()=>{if(!assessmentChoice){$('#assessment-feedback').innerHTML=note('اول یه پاسخ انتخاب کن.','warning');return;}C.assess(state,assessmentChoice==='correct');save();go('result');},
    advance:()=>{if(C.advance(state)){assessmentChoice=null;viewStage=state.stage;save();go('roadmap');}else{state.selectedStage=Math.min(2,state.stage+1);go('subscription');}},
    remedial:()=>{C.start(state,state.stage,'cafe');save();go('lesson');},
    logout:()=>{signedIn=false;destination='dashboard';go('login');},
    'request-delete':()=>{privacyConfirm=true;render();},'cancel-delete':()=>{privacyConfirm=false;render();},
    'confirm-delete':()=>{try{localStorage.removeItem('speakflow-preview-v1');}catch(_){}state=C.initial();signedIn=false;privacyConfirm=false;reviewId=null;assessmentChoice=null;viewStage=0;go('onboarding');}
  };
  function currentReviewHelp(){const t=topicFor(reviewId);return 'اشکالی نداره؛ «'+esc(t.phrase)+'» رو دوباره بخون و انتخاب کن. مرور زودتر تنظیم شد.';}
  shell.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(!el)return;const handler=handlers[el.dataset.action];if(handler)handler(el);});
  document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>{
    const plan = button.dataset.plan;
    if (plan) { state.selectedPlan = plan; save(); destination = 'checkout'; go(signedIn ? 'checkout' : 'login'); return; }
    destination='dashboard';go(signedIn?'dashboard':'onboarding');
  }));
  const menu=$('#main-nav'); const menuToggle=$('#menu-toggle');
  function closeMenu(){menu.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');}
  menuToggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();}});
  const tabs=[...document.querySelectorAll('[data-scene]')];
  function selectTab(tab){const t=C.topics[tab.dataset.scene];tabs.forEach(el=>{el.setAttribute('aria-selected',String(el===tab));el.tabIndex=el===tab?0:-1;});$('#scene-panel').setAttribute('aria-labelledby',tab.id);$('#partner-line').textContent=t.question;$('#user-line').textContent=t.wrong;$('#better-line').textContent=t.phrase;$('#tip-line').textContent=t.tip;}
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{const next=e.key==='ArrowLeft'?(i+1)%3:e.key==='ArrowRight'?(i+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();selectTab(tabs[next]);tabs[next].focus();}});});
  window.addEventListener('hashchange',()=>{closeMenu();render();});
  render();
})();
