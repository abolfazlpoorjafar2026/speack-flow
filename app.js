(() => {
  const C = SFCore;
  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let state = C.initial();
  try { state = C.restore(JSON.parse(localStorage.getItem('speakflow-preview-v1'))); } catch (_) {}
  let signedIn = false;
  let authMode = 'signup';
  let authStatus = '';
  let destination = 'dashboard';
  let reviewId = null;
  let reviewReady = false;
  let assessmentChoice = null;
  let supportDraft = false;
  let privacyConfirm = false;
  let viewStage = state.stage;
  let practiceError = false;
  let practiceMode = 'text';
  const landing = $('#main');
  const shell = document.createElement('div');
  shell.id = 'product-app'; shell.hidden = true;
  landing.after(shell);
  const save = () => { try { localStorage.setItem('speakflow-preview-v1', JSON.stringify(state)); } catch (_) {} };
  const go = route => { if (location.hash === `#/${route}`) render(); else location.hash = `/${route}`; };
  const action = (label, name, cls = 'navy', attrs = '') => `<button type="${name.startsWith('submit-') ? 'submit' : 'button'}" class="button ${cls}" data-action="${name}" ${attrs}>${label}</button>`;
  const link = (label, route, cls = 'navy') => `<a class="button ${cls}" href="#/${route}">${label}</a>`;
  const note = (text, cls = '') => `<div class="app-note ${cls}">${text}</div>`;
  const head = (title, subtitle = '', extra = '') => `<div class="page-head"><div><h1 class="app-page-title" tabindex="-1">${title}</h1><p>${subtitle}</p></div>${extra}</div>`;
  const empty = (title, text, button = '') => `<div class="app-empty"><span class="empty-symbol" aria-hidden="true">◎</span><h2>${title}</h2><p>${text}</p>${button}</div>`;
  const stageName = n => C.stages[n];
  const topicFor = id => C.topics[id.split(':')[1]];
  const current = () => state.session ? topicFor(state.session.id) : C.topics[state.preferences.interest];
  const navItems = [['dashboard','⌂','امروز من'],['roadmap','↗','مسیر یادگیری'],['review','↶','مرور'],['progress','▥','پیشرفت من'],['subscription','◇','اشتراک من'],['settings','⚙','تنظیمات'],['support','؟','پشتیبانی']];
  const labels = { onboarding:'شروع مسیر', login:'ورود و ثبت‌نام', verify:'تأیید شماره', dashboard:'امروز من', roadmap:'مسیر یادگیری', lesson:'درس کوتاه', practice:'مکالمه', analysis:'بازخورد جلسه', review:'مرور', progress:'پیشرفت', subscription:'اشتراک‌ها', checkout:'خلاصه سفارش', payment:'وضعیت پرداخت', parent:'راهنمای والد', assessment:'ارزیابی مرحله', result:'نتیجه ارزیابی', settings:'تنظیمات', support:'پشتیبانی', privacy:'حریم خصوصی', completion:'پایان مسیر' };
  function field(label, name, options, value) { return `<label class="app-field">${label}<select name="${name}">${options.map(([v,t]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`; }
  const interestField = () => field('کدوم موقعیت برات جذاب‌تره؟','interest',Object.entries(C.topics).map(([k,v])=>[k,v.title]),state.preferences.interest);
  const goalField = () => field('بیشتر برای چی زبان می‌خونی؟','goal',[['daily','استفاده در زندگی روزمره'],['travel','سفر و آشنایی با آدم‌ها'],['work','کار و آیندهٔ شغلی']],state.preferences.goal);
  const experienceField = () => field('تجربه‌ات با زبان چطوره؟','experience',[['some','قبلاً خوندم، ولی کم تمرین کردم'],['new','تازه دارم شروع می‌کنم'],['practice','می‌فهمم، می‌خوام بیشتر حرف بزنم']],state.preferences.experience);
  const steps = step => `<div class="app-stepper" aria-label="مراحل درس">${['فهم جمله','بازیابی تایپی','تکرار گفتاری','کاربرد در موقعیت'].map((t,i)=>`<span class="${step === i ? 'active' : ''}">${i+1}. ${t}</span>`).join('')}</div>`;
  function onboarding() {
    return `<div class="app-narrow">${head('مسیرت رو به خودت نزدیک کن.','سه سؤال کوتاه؛ همه از Silver شروع می‌کنیم.')}<form id="onboarding-form" class="app-card">${goalField()}${experienceField()}${interestField()}<div class="app-actions">${action('ادامه و ساخت حساب نمونه','submit-onboarding')}</div><div class="app-form-footer">پاسخ‌ها روی همین مرورگر می‌مونن. این سؤال‌ها تعیین سطح نیستن.</div></form></div>`;
  }
  function login() {
    return `<div class="app-narrow">${head(authMode === 'login' ? 'خوش برگشتی.' : 'اولین قدم، یه شروع ساده.','بعد از تأیید شماره، مستقیم به قدم بعدی برمی‌گردی.')}<div class="app-card"><div class="app-label">نمای حساب و شمارهٔ نمونه</div><div class="app-phone">09•• ••• ••21</div><p>این صفحه طرح ورود با شماره و کده. برای دیدن مسیر، از حساب نمایشی استفاده کن؛ نیازی به شمارهٔ واقعی نیست.</p><label class="app-check"><input type="checkbox" id="privacy-consent"> <span>توضیح <a class="app-subtle-link" href="#/privacy">حریم خصوصی</a> و نمایشی‌بودن ورود رو خوندم.</span></label><p id="auth-feedback" role="status" class="app-label"></p><div class="app-actions">${action('دیدن مرحلهٔ کد','request-code')}${action(authMode === 'login' ? 'تازه واردی؟ شروع مسیر' : 'قبلاً اومدی؟ ورود','toggle-auth','outline')}</div></div></div>`;
  }
  function verify() {
    return `<div class="app-narrow">${head('تأیید شماره','در محصول نهایی، کد پیامکی اینجا وارد می‌شه.')}<div class="app-card"><div class="app-label">شمارهٔ نمونه: <bdi>09•• ••• ••21</bdi></div><div class="app-phone" aria-label="محل ورود کد نمونه">— — — — — —</div>${note('در این پروتوتایپ پیامکی ارسال نمی‌شه. دکمهٔ پایین، تأیید نمایشی رو انجام می‌ده.')}<div id="verify-status" role="status">${authStatus ? note(esc(authStatus),'warning') : ''}</div><div class="app-actions">${action('ادامه با حساب نمایشی','verify')}${link('ویرایش شماره / برگشت','login','outline')}</div><details class="app-demo-controls"><summary>حالت‌های کد ورود</summary>${action('کد اشتباه','code-wrong','outline')}${action('کد منقضی','code-expired','outline')}${action('ارسال دوبارهٔ نمایشی','code-resend','outline')}</details></div></div>`;
  }
  function dashboard() {
    const due = C.due(state); const count = state.completed.length;
    const nextTopic = Object.keys(C.topics).find(t => !state.completed.includes(C.lessonId(state.stage,t))) || state.preferences.interest;
    return `${head(count ? 'خوش برگشتی؛ از همین‌جا ادامه بده.' : 'سلام، به مسیر خودت خوش اومدی.','یه قدم کوچک، بعد یه فرصت برای استفاده از چیزی که یاد گرفتی.')}
      <div class="app-grid"><div class="app-card dark"><div class="eyebrow">${stageName(state.stage)} · قدم بعدی تو</div><h2>${state.session ? 'تمرینت نیمه‌تموم مونده.' : C.topics[nextTopic].title}</h2><p>${state.session ? 'چیزی پاک نشده؛ می‌تونی از همون قدم ادامه بدی.' : C.topics[nextTopic].context}</p><div class="app-actions">${state.session ? action('ادامهٔ جلسه','resume') : action('شروع درس کوتاه','start','',`data-topic="${nextTopic}" data-stage="${state.stage}"`)}${link('دیدن کل مسیر','roadmap','outline')}</div></div><div class="app-card"><span class="app-kicker">REVIEW / TODAY</span><h2 style="margin-top:12px">${due.length ? 'وقتشه دوباره به کارش ببری.' : count ? 'مرورها برای نوبت بعد آماده‌ان.' : 'با اولین درس، مرور هم شروع می‌شه.'}</h2><p>${due.length ? `${due.length} عبارت برای مرور داری؛ بدون برگشتن به اول مسیر ادامه بده.` : 'بعد از یادگیری، عبارت‌ها رو با فاصله دوباره به یاد میاری.'}</p><div class="app-actions">${link('رفتن به مرور','review','outline')}</div></div></div>
      <div class="app-grid three" style="margin-top:20px"><div class="app-card"><div class="app-label">جلسه‌های تکمیل‌شده</div><span class="app-metric">${count.toLocaleString('fa-IR')}</span><p>فقط فعالیت‌های همین نمونه</p></div><div class="app-card"><div class="app-label">عبارت‌های مرورشده</div><span class="app-metric">${state.reviewed.length.toLocaleString('fa-IR')}</span><p>تعداد عبارت‌هایی که دوباره بازیابی کردی</p></div><div class="app-card"><div class="app-label">هدف روزانه</div><span class="app-metric">${Number(state.preferences.minutes).toLocaleString('fa-IR')} <small style="font-size:13px">دقیقه</small></span><a class="app-subtle-link" href="#/settings">تغییر هدف و یادآوری</a></div></div>
      ${due.length && state.preferences.reminder ? note('وقتشه چیزی که یاد گرفتی رو دوباره به کار ببری؛ مرورهای سررسیدشده منتظرتن.') : ''}
      ${!state.access.includes(0) ? note('در این نمونه، سه سناریوی رایگان Silver رو تجربه می‌کنی. تعداد جلسات رایگان محصول نهایی هنوز قطعی نیست.','warning') : ''}`;
  }
  function roadmap() {
    return `${head('مسیرت از اینجا دیده می‌شه.','سه مرحلهٔ سه‌ماهه؛ برگشت به درس قبلی، پیشرفت فعلیت رو پاک نمی‌کنه.')}<div class="app-grid three">${C.stages.map((name,i)=>`<article class="app-card app-stage ${viewStage === i ? 'selected' : ''}"><div class="app-row"><h2 class="en">${name}</h2><span class="app-badge">ماه ${i*3+1} تا ${i*3+3}</span></div><p>${['شروع مکالمه‌های روزمره','ادامهٔ گفت‌وگو و بیان تجربه','بیان نظر در موقعیت‌های متنوع'][i]}</p><div class="app-progress"><span style="width:${state.completed.filter(id=>id.startsWith(i+':')).length/3*100}%"></span></div><p style="margin-top:10px">${state.completed.filter(id=>id.startsWith(i+':')).length} از ۳ سناریوی نمونه</p><div class="app-actions">${action('مشاهدهٔ مرحله','view-stage','outline',`data-stage="${i}"`)}</div></article>`).join('')}</div><div class="app-card" style="margin-top:24px"><div class="app-row"><h2>${stageName(viewStage)} · موقعیت‌های تمرین</h2><span class="app-badge">محتوای نمونه برای نمایش ساختار</span></div><ul class="app-list">${Object.entries(C.topics).map(([key,t])=>{const done=state.completed.includes(C.lessonId(viewStage,key));const available=C.canStart(state,viewStage,key);return `<li class="app-row"><div><h3>${t.title} ${done?'✓':''}</h3><p>${available ? done ? 'قابل تکرار؛ پیشرفتت حفظ می‌شه' : 'یادگیری، بازیابی، تمرین و بازخورد' : 'بعد از فعال‌شدن دسترسی این مرحله'}</p></div>${available?action(done?'تمرین دوباره':'شروع درس','start','outline',`data-stage="${viewStage}" data-topic="${key}"`):viewStage>state.stage?link('اول ارزیابی مرحلهٔ فعلی','assessment','outline'):action('دیدن اشتراک','stage-subscription','outline',`data-stage="${viewStage}"`)}</li>`;}).join('')}</ul></div><div class="app-actions">${link('ارزیابی مرحلهٔ فعلی','assessment','outline')}${link('پیشرفت من','progress','outline')}</div>`;
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
  function practice() {
    if(!state.session || !['practice','analysis'].includes(state.session.step)) return empty('اول جمله رو یاد بگیر.','بعد از درس کوتاه، همون عبارت رو توی موقعیت استفاده می‌کنی.',link('ادامهٔ درس','lesson'));
    const t=current();
    return `${head('حالا نوبت توئه.','سناریوی هدایت‌شدهٔ نمونه؛ پاسخ‌ها آماده‌ان و گفت‌وگوی زندهٔ AI نیست.')}${steps(3)}<div class="app-grid"><div class="app-card"><div class="app-row"><h2>${t.title}</h2><span class="pill">پارتنر نمونه</span></div><div class="bubble" style="margin:25px 0;max-width:100%"><span class="speaker">YOUR PARTNER</span>${t.question}</div><p>${t.context}</p><div class="answer-options">${[t.phrase,t.wrong].map((text,i)=>`<button class="app-choice en" data-action="practice-choice" data-choice="${i===0?'correct':'retry'}" aria-pressed="${state.session.choice===(i===0?'correct':'retry')}" lang="en">${text}</button>`).join('')}</div>${practiceError ? note('ارتباط در حالت آزمایشی قطع شد. پاسخت حفظ شده؛ دوباره تلاش کن یا به داشبورد برگرد.','warning') : ''}<div class="app-actions">${action(practiceError?'تلاش دوباره':'پایان و دیدن بازخورد','end-practice')}</div></div><aside class="app-stack"><div class="app-card"><h2>یه فضای امن برای تمرین</h2><p>لازم نیست از اول بی‌نقص باشی. اگر گیر کردی، به عبارت درس برگرد.</p><div class="app-actions">${action('دیدن راهنما','practice-help','outline')}${action('تمرین صوتی','voice-mode','outline')}</div><div id="practice-help" role="status"></div>${practiceMode==='voice'?note('در محصول نهایی اینجا اجازهٔ میکروفون گرفته می‌شه. برای این نمونه، جمله رو بلند بگو و پاسخ متنی رو انتخاب کن. صدایی ضبط نمی‌شه.') : ''}</div><div class="app-card"><h3>جلسه‌ات نیمه‌تمام بمونه؟</h3><p>می‌تونی از داشبورد به همین نقطه برگردی.</p><div class="app-actions">${link('بعداً ادامه می‌دم','dashboard','outline')}</div></div><details class="app-demo-controls"><summary>بررسی حالت خطای ارتباط</summary>${action('نمایش قطع ارتباط','network-error','outline')}</details></aside></div>`;
  }
  function analysis() {
    if(!state.session || state.session.step!=='analysis') return empty('هنوز جلسه‌ای تموم نشده.','بعد از تمرین، بازخورد همون جلسه رو اینجا می‌بینی.',link('رفتن به مسیر','roadmap'));
    const t=current(); const correct=state.session.choice==='correct';
    return `${head('یه جمله بهتر، یه قدم جلوتر.','بازخورد آموزشی نمونه از پاسخ انتخابی تو؛ نه نمرهٔ تلفظ یا تحلیل صوت.')}<div class="app-grid"><div class="app-card"><h2>${correct?'عبارت مناسب رو انتخاب کردی.':'می‌تونیم طبیعی‌تر بگیمش.'}</h2><p>پاسخ انتخابی تو:</p><div class="phrase-card"><div class="en" lang="en">${correct?t.phrase:t.wrong}</div></div><h3>عبارت پیشنهادی</h3><p class="en" lang="en">${t.phrase}</p>${note(t.tip,correct?'success':'')}<div class="app-actions">${action('ثبت جلسه و برنامهٔ مرور','finish-session')}${action('دوباره تمرین کنم','retry-practice','outline')}</div></div><div class="app-card"><h2>قدم بعد: از حافظه</h2><p>این عبارت برای مرور فردا ثبت می‌شه. می‌تونی همین حالا هم شکل مرور رو ببینی.</p><ul class="app-list"><li>یادگیری در موقعیت</li><li>استفاده در مکالمه</li><li>یک نکته برای اصلاح</li><li>مرور فاصله‌دار</li></ul></div></div>`;
  }
  function review() {
    const due=C.due(state); const id=reviewId && state.completed.includes(reviewId) ? reviewId : due[0];
    if(!id) return `${head('مرورهای تو','وقتشه چیزی که یاد گرفتی رو دوباره به کار ببری.')}<div class="app-card">${empty(state.completed.length?'فعلاً مرور سررسیدشده نداری.':'هنوز عبارتی برای مرور نیست.',state.completed.length?'نوبت بعدی مرور، بعد از یادگیری برای فردا تنظیم شده. می‌تونی زودتر هم تمرین کنی.':'اولین درس رو انجام بده؛ عبارت‌ها بعد از جلسه اینجا جمع می‌شن.',state.completed.length?action('تمرین زودتر از موعد','preview-review'):link('شروع اولین درس','roadmap'))}</div>`;
    reviewId=id; const t=topicFor(id);
    return `<div class="app-narrow">${head('این بار بدون دیدن جواب.','جواب اشتباه یعنی یه فرصت دیگه برای تمرین؛ نه برگشت به اول مسیر.')}<div class="app-card"><span class="app-badge">${stageName(Number(id[0]))} · ${t.title}</span><h2 style="margin-top:20px">چطور می‌گی «${t.meaning}»؟</h2><div class="answer-options">${[t.wrong,t.phrase].map((text,i)=>`<button class="app-choice en" data-action="review-answer" data-choice="${i===1?'correct':'retry'}" lang="en">${text}</button>`).join('')}</div><div id="review-feedback" role="status"></div><div class="app-actions" id="review-next" ${reviewReady?'':'hidden'}>${action('ثبت و ادامهٔ مرور','review-next')}</div></div><div class="app-actions">${link('برگشت به امروز من','dashboard','outline')}</div></div>`;
  }
  function progress() {
    return `${head('پیشرفت، با قدم‌هایی که برداشتی.','آمار این صفحه از فعالیت‌های خودت در همین مرورگر ساخته می‌شه.')}<div class="app-grid three">${C.stages.map((name,i)=>`<div class="app-card"><h2 class="en">${name}</h2><span class="app-metric">${state.completed.filter(id=>id.startsWith(i+':')).length} / ۳</span><p>سناریوی نمونهٔ تکمیل‌شده</p></div>`).join('')}</div><div class="app-card" style="margin-top:20px"><h2>جلسه‌ها و عبارت‌های من</h2>${state.completed.length?`<ul class="app-list">${state.completed.map(id=>`<li class="app-row"><div><h3>${topicFor(id).title}</h3><p class="en" lang="en">${topicFor(id).phrase}</p></div><span class="app-badge ${state.reviewed.includes(id)?'success':''}">${state.reviewed.includes(id)?'مرور شده':'در برنامهٔ مرور'}</span></li>`).join('')}</ul>`:empty('شروع تازه، بدون آمار ساختگی.','با تکمیل اولین جلسه، عبارت‌ها و پیشرفتت اینجا ثبت می‌شن.',link('شروع مسیر','roadmap'))}</div><div class="app-actions">${link('ارزیابی مرحله','assessment','outline')}${link('مرور عبارت‌ها','review','outline')}</div>`;
  }
  function subscription() {
    return `${head('امکانات رو متناسب با خودت انتخاب کن.','مرحلهٔ یادگیری با پلن امکانات فرق داره. تغییر پلن، مسیرت رو از اول شروع نمی‌کنه.')}<div class="app-grid"><div class="app-card"><div class="video-slot"><strong>معرفی مسیر با ابوالفضل</strong><p>محل ویدیوی توضیح مراحل و انتخاب اشتراک</p><span class="app-badge" style="margin-top:15px">ویدیو هنوز تحویل داده نشده</span></div><p>Silver، Gold و Diamond هر کدوم سه ماه هستن. برای هر مرحله، سطح امکانات رو جدا انتخاب می‌کنی. دیدن ویدیو شرط خرید نیست.</p></div><div class="app-card"><h2>دسترسی فعلی تو</h2><p>${state.access.length?state.access.map(stageName).join('، ')+' · '+state.plan:'تجربهٔ رایگان Silver'}</p>${field('مرحلهٔ سفارش','stage',C.stages.map((n,i)=>[String(i),n+' · سه ماه']),String(state.selectedStage))}${note('قیمت، سهمیه و قواعد ارتقا هنوز نهایی نیستن؛ اینجا فقط مسیر انتخاب و سفارش رو می‌بینی.','warning')}<a class="app-subtle-link" href="#/parent">والد پرداخت‌کننده است؟ راهنمای والد</a></div></div><div class="app-grid three" style="margin-top:20px">${['Basic','Medium','Pro'].map((name,i)=>`<div class="app-card ${i===1?'dark':''}"><span class="en" style="font-size:26px">${name}</span><h3 style="margin-top:15px">${['شروع منظم','تمرین بیشتر','تحلیل عمیق‌تر'][i]}</h3><ul class="app-list"><li>مسیر آموزشی مرحله</li><li>${['تمرین با پارتنر','سهمیهٔ بیشتر تمرین','سهمیهٔ بالاتر تمرین'][i]}</li><li>${i===2?'تحلیل جزئی‌تر مکالمه':'بازخورد و مرور آموخته‌ها'}</li></ul><p>قیمت نهایی: در انتظار تأیید</p><div class="app-actions">${action('انتخاب '+name,'choose-plan',i===1?'':'outline',`data-plan="${name}"`)}</div></div>`).join('')}</div><details class="app-demo-controls"><summary>نمایش حالت انقضای دسترسی</summary>${action('پایان دسترسی نمونه، با حفظ سابقه','expire-access','outline')}</details>`;
  }
  function checkout() {
    return `<div class="app-narrow">${head('قبل از ادامه، یه نگاه آخر.','مرحله، امکانات و پرداخت‌کننده رو جدا ببین.')}<div class="app-card"><h2>خلاصهٔ سفارش نمونه</h2><dl class="app-summary"><div><dt>مرحله</dt><dd>${stageName(state.selectedStage)}</dd></div><div><dt>سطح امکانات</dt><dd class="en">${state.selectedPlan}</dd></div><div><dt>مدت مرحله</dt><dd>سه ماه</dd></div><div><dt>مبلغ کل</dt><dd>هنوز نهایی نشده</dd></div></dl>${note('قیمت و شرایط نهایی خرید و استرداد باید قبل از فروش مشخص بشن. اینجا هیچ پرداخت واقعی انجام نمی‌شه.','warning')}<label class="app-check"><input id="checkout-consent" type="checkbox"><span>می‌دونم این فقط پیش‌نمایش مسیر سفارشه و مبلغی پرداخت نمی‌کنم.</span></label><div id="checkout-feedback" role="status"></div><div class="app-actions">${action('پیش‌نمایش وضعیت پرداخت','create-order')}${link('تغییر پلن','subscription','outline')}</div><div class="app-form-footer"><a href="#/parent">راهنمای پرداخت والد</a> · <a href="#/support">سؤال دربارهٔ سفارش یا استرداد</a></div></div></div>`;
  }
  function payment() {
    const o=state.order;
    if(!o) return empty('سفارشی انتخاب نشده.','اول مرحله و پلن رو انتخاب کن.',link('دیدن اشتراک‌ها','subscription'));
    const statuses={preview:['وضعیت پرداخت رو پیش‌نمایش کن.','برای دیدن شاخه‌های فلو، یکی از حالت‌های پایین رو انتخاب کن.'],success:['پرداخت موفق · نمونه','دسترسی نمایشی برای همین مرحله فعال شد. هیچ تراکنش بانکی انجام نشده.'],pending:['وضعیت در انتظار بررسی','تا مشخص‌شدن نتیجه، دوباره پرداخت نکن. در محصول نهایی، تأیید از سرور درگاه گرفته می‌شه.'],failed:['پرداخت تأیید نشد.','می‌تونی سفارش رو بازبینی کنی یا از پشتیبانی کمک بگیری.'],cancelled:['پرداخت لغو شد.','سابقهٔ یادگیری سر جاشه؛ هر وقت خواستی برگرد.']};
    const [title,text]=statuses[o.status]||statuses.preview;
    return `<div class="app-narrow">${head(title,text)}<div class="app-card"><div class="app-status-icon" aria-hidden="true">${o.status==='success'?'✓':o.status==='pending'?'…':'◇'}</div><dl class="app-summary"><div><dt>مرحله</dt><dd>${stageName(o.stage)}</dd></div><div><dt>پلن</dt><dd>${o.plan}</dd></div><div><dt>نوع رسید</dt><dd>نمایشی، بدون تراکنش</dd></div><div><dt>تمدید خودکار</dt><dd>انجام نمی‌شه</dd></div></dl>${o.status==='success'?`<div class="app-actions">${action('ادامهٔ مسیر یادگیری','after-purchase')}${link('مدیریت اشتراک','subscription','outline')}</div>`:`<div class="app-actions">${link('بازبینی سفارش','checkout','outline')}${link('پیگیری وضعیت / کسر وجه','support','outline')}</div>`}<details class="app-demo-controls" ${o.status==='preview'?'open':''}><summary>حالت‌های آزمایشی پرداخت (بدون تراکنش)</summary>${['success','pending','failed','cancelled'].map((s,i)=>action(['موفق','در انتظار','ناموفق','لغو'][i],'payment-state','outline',`data-status="${s}"`)).join('')}</details></div></div>`;
  }
  function parent() {
    return `${head('برای کسی که هزینه رو پرداخت می‌کنه.','والد می‌تونه خریدار باشه؛ زبان‌آموز همچنان صاحب مسیر یادگیری خودشه.')}<div class="app-grid"><div class="app-card"><h2>فرزندت چه مسیری رو می‌ره؟</h2><ul class="app-list"><li><h3>یادگیری کاربردی</h3><p>یه عبارت در موقعیت، تمرین، بازخورد و مرور.</p></li><li><h3>سه مرحلهٔ سه‌ماهه</h3><p>شروع از Silver؛ سپس Gold و Diamond.</p></li><li><h3>پیشرفت قابل مشاهده</h3><p>جلسه‌ها و مرورهای تکمیل‌شده، به‌جای وعدهٔ نتیجهٔ قطعی.</p></li></ul></div><div class="app-card"><h2>قبل از تصمیم خرید</h2><p>انتخاب فعلی: ${stageName(state.selectedStage)} · ${state.selectedPlan}. مبلغ و شرایط نهایی هنوز مشخص نشده؛ این صفحه پیش‌نمایش معرفی سفارشه.</p>${note('پرداخت هزینه به‌معنای دسترسی خودکار به متن خصوصی مکالمه‌های زبان‌آموز نیست.')}<div class="app-actions">${link('دیدن سفارش نمونه','checkout')}${link('پرسیدن سؤال','support','outline')}</div></div></div>`;
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
  const pages={onboarding,login,verify,dashboard,roadmap,lesson,practice,analysis,review,progress,subscription,checkout,payment,parent,assessment,result,settings,support,privacy,completion};
  function render() {
    let route=location.hash.startsWith('#/')?location.hash.slice(2).split('?')[0]:'';
    if(!route){landing.hidden=false;shell.hidden=true;document.body.classList.remove('in-app');document.title='SpeakFlow | زبان رو جوری که واقعا هست یادبگیر.';return;}
    if(!pages[route]){go('dashboard');return;}
    const publicPages=['onboarding','login','verify','privacy','parent','support'];
    if(!signedIn&&!publicPages.includes(route)){destination=route;authMode='login';go('login');return;}
    landing.hidden=true;shell.hidden=false;document.body.classList.add('in-app');
    document.title=labels[route]+' | SpeakFlow';
    shell.innerHTML=`<div class="app-layout"><aside class="app-sidebar"><div class="sidebar-caption">فضای یادگیری تو</div>${navItems.map(([r,i,t])=>`<a href="#/${r}" ${r===route?'aria-current="page"':''}><span aria-hidden="true">${i}</span>${t}</a>`).join('')}<div class="sidebar-bottom"><b>${stageName(state.stage)} · ${state.access.length?state.plan:'تجربهٔ رایگان'}</b><p>زبان رو جوری که واقعا هست یادبگیر.</p><a class="app-subtle-link" href="#">بازگشت به لندینگ</a></div></aside><main class="app-workspace" id="app-main"><div class="app-topline"><span>SpeakFlow / ${labels[route]}</span><span class="pill">پروتوتایپ تعاملی · بدون پرداخت و AI زنده</span></div>${pages[route]()}</main></div><nav class="app-footer-nav" aria-label="منوی فضای یادگیری">${navItems.filter(([r])=>['dashboard','roadmap','review','progress','settings'].includes(r)).map(([r,i,t])=>`<a href="#/${r}" ${r===route?'aria-current="page"':''}><span aria-hidden="true">${i}</span>${t}</a>`).join('')}</nav>`;
    shell.querySelector('.app-page-title')?.focus({preventScroll:true});
    window.scrollTo(0,0);
    bindForms();
  }
  function normalize(text) {return text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?]/g,'').replace(/\s+/g,' ');}
  function bindForms(){
    $('#onboarding-form')?.addEventListener('change',event=>{if(['goal','experience','interest'].includes(event.target.name)){state.preferences[event.target.name]=event.target.value;save();}});
    $('#onboarding-form')?.addEventListener('submit',event=>{event.preventDefault();const d=new FormData(event.target);for(const key of ['goal','experience','interest'])state.preferences[key]=d.get(key);save();authMode='signup';destination='dashboard';go('login');});
    $('#settings-form')?.addEventListener('submit',event=>{event.preventDefault();const d=new FormData(event.target);for(const key of ['goal','interest','minutes'])state.preferences[key]=d.get(key);state.preferences.reminder=d.has('reminder');save();$('#settings-feedback').innerHTML=note('ترجیح‌هات در همین مرورگر ذخیره شد.','success');});
    $('#recall-form')?.addEventListener('submit',event=>{event.preventDefault();const value=new FormData(event.target).get('answer');const ok=normalize(value)===normalize(current().phrase);$('#recall-feedback').innerHTML=ok?note('درسته؛ حالا یه بار با صدای خودت تکرارش کن.','success')+action('ادامه به تکرار گفتاری','lesson-speak'):note('دوباره امتحان کن. عبارت نمونه: <bdi lang="en">'+esc(current().phrase)+'</bdi>','warning');});
    $('#support-form')?.addEventListener('submit',event=>{event.preventDefault();supportDraft=true;$('#support-feedback').innerHTML=note('پیش‌نمایش درخواست آماده شد؛ ارسال واقعی انجام نشده. برای اتصال پشتیبانی به سرویس نیاز داریم.','success');});
    $('select[name="stage"]')?.addEventListener('change',event=>{state.selectedStage=Number(event.target.value);});
  }
  const handlers={
    'submit-onboarding':()=>{},'submit-settings':()=>{},'submit-recall':()=>{},'submit-support':()=>{},
    'toggle-auth':()=>{authMode=authMode==='login'?'signup':'login';if(authMode==='signup')go('onboarding');else render();},
    'request-code':()=>{if(!$('#privacy-consent').checked){$('#auth-feedback').textContent='برای ادامه، توضیح حریم خصوصی رو تأیید کن.';return;}authStatus='';go('verify');},
    verify:()=>{signedIn=true;save();go(destination);},
    'code-wrong':()=>{authStatus='کد واردشده درست نیست. در نسخهٔ واقعی، می‌تونی اصلاحش کنی یا بعد از مهلت دوباره درخواست بدی.';render();},
    'code-expired':()=>{authStatus='مهلت کد تموم شده؛ کد تازه درخواست کن.';render();},
    'code-resend':()=>{authStatus='حالت ارسال مجدد نمایش داده شد؛ هیچ پیامکی ارسال نشده.';render();},
    start:el=>{const stage=Number(el.dataset.stage);if(C.start(state,stage,el.dataset.topic)){save();go('lesson');}else{state.selectedStage=stage;go('subscription');}},
    resume:()=>{go(!state.session?'roadmap':state.session.step==='analysis'?'analysis':state.session.step==='practice'?'practice':'lesson');},
    'view-stage':el=>{viewStage=Number(el.dataset.stage);render();},
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
    'review-answer':el=>{if(!reviewId)return;const correct=el.dataset.choice==='correct';C.review(state,reviewId,correct);save();reviewReady=correct;$('#review-feedback').innerHTML=note(correct?'درسته! مرور بعدی سه روز دیگه است.':currentReviewHelp(),correct?'success':'warning');$('#review-next').hidden=!correct;},
    'review-next':()=>{reviewId=null;reviewReady=false;render();},
    'choose-plan':el=>{state.selectedPlan=el.dataset.plan;go('checkout');},
    'create-order':()=>{if(!$('#checkout-consent').checked){$('#checkout-feedback').innerHTML=note('نمایشی‌بودن سفارش رو تأیید کن.','warning');return;}state.order={stage:state.selectedStage,plan:state.selectedPlan,status:'preview'};save();go('payment');},
    'payment-state':el=>{C.payment(state,el.dataset.status);save();render();},
    'after-purchase':()=>{if(state.assessment?.passed&&state.order.stage===state.stage+1)C.advance(state);viewStage=state.stage;save();go('roadmap');},
    'expire-access':()=>{state.access=[];save();render();},
    'assessment-choice':el=>{assessmentChoice=el.dataset.choice;render();},
    'assessment-submit':()=>{if(!assessmentChoice){$('#assessment-feedback').innerHTML=note('اول یه پاسخ انتخاب کن.','warning');return;}C.assess(state,assessmentChoice==='correct');save();go('result');},
    advance:()=>{if(C.advance(state)){viewStage=state.stage;save();go('roadmap');}else{state.selectedStage=Math.min(2,state.stage+1);go('subscription');}},
    remedial:()=>{C.start(state,state.stage,'cafe');save();go('lesson');},
    logout:()=>{signedIn=false;destination='dashboard';go('login');},
    'request-delete':()=>{privacyConfirm=true;render();},'cancel-delete':()=>{privacyConfirm=false;render();},
    'confirm-delete':()=>{try{localStorage.removeItem('speakflow-preview-v1');}catch(_){}state=C.initial();signedIn=false;privacyConfirm=false;reviewId=null;assessmentChoice=null;viewStage=0;go('onboarding');}
  };
  function currentReviewHelp(){const t=topicFor(reviewId);return 'اشکالی نداره؛ «'+esc(t.phrase)+'» رو دوباره بخون و انتخاب کن. مرور زودتر تنظیم شد.';}
  shell.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(!el)return;const handler=handlers[el.dataset.action];if(handler)handler(el);});
  document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>{destination='dashboard';go(signedIn?'dashboard':'onboarding');}));
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
