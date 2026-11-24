/* myClub survey - chat-style front end. Vanilla JS, no dependencies. */
(() => {
'use strict';

/* ========== 1. Configuration ========== */
const CONFIG = {
  ENDPOINT_URL: 'https://script.google.com/macros/s/AKfycbxeUCyENAcNSfR1llQjiwhJfEO8SCZJHNy_0ae-V4moOUB0o-31Vbbka5yQ88Q0fK-SiA/exec',
  TIMEOUT_MS: 30000
};

/* ========== 2. Survey content ========== */
const CATEGORIES = ['Medical','Engineering','Commerce / Management','Arts / Humanities','Science','Law','Pharmacy / Nursing / Allied Healthcare','Other'];
const Y = n => ['First Year','Second Year','Third Year','Fourth Year','Fifth Year'].slice(0, n).concat('Other');
const YEARS = {
  'Medical': ['First Year','Second Year','Third Year','Fourth Year','Fifth Year','Internship','Other'],
  'Engineering': Y(4), 'Pharmacy / Nursing / Allied Healthcare': Y(4), 'Law': Y(5),
  'Commerce / Management': Y(3), 'Arts / Humanities': Y(3), 'Science': Y(3), 'Other': Y(5)
};

const MATRIX = [
  ['q7_01',"Husband's financial stability / earning capacity"],
  ['q7_02',"Wife's financial independence / earning capacity"],
  ['q7_03',"Husband's professional success / career commitments"],
  ['q7_04',"Wife's professional success / career commitments"],
  ['q7_05','Time and attention given to each other'],
  ['q7_06','Physical intimacy / sexual compatibility'],
  ['q7_07','Calmness, patience and emotional maturity'],
  ['q7_08','Aggressive, controlling or dominating behaviour'],
  ['q7_09','Loyalty and commitment'],
  ['q7_10','Mutual respect and communication'],
  ['q7_11','Sharing household and family responsibilities'],
  ['q7_12','Similar values and life goals']
];
const SCALE = ['1 - No significant influence','2 - Low influence','3 - Moderate influence','4 - High influence','5 - Very high influence'];

const P = 'About You', R = 'Relationships, Intimacy and Marriage', I = 'Your Interest';
const STEPS = [
  {id:'college', sec:P, type:'text', req:true, q:'College Name'},
  {id:'category', sec:P, type:'category', req:true, q:'Which category does your college belong to?'},
  {id:'year', sec:P, type:'year', req:true, q:'Which year are you currently studying in?'},
  {id:'gender', sec:P, type:'choice', req:true, opts:['Male','Female'], q:'Gender'},
  {id:'email', sec:P, type:'email', req:true, q:'Email Address',
    hint:'We will use this email address to contact you regarding the upcoming myClub online meeting and share the Zoom meeting link.'},
  {id:'q1', sec:R, type:'long', q:'Why do you think young women and men enter boyfriend-girlfriend relationships nowadays? Do you think this culture is justified? Why or why not?',
    hint:'You may consider possible reasons such as companionship, physical needs, emotional support, physical interaction or the possibility of marriage.'},
  {id:'q2', sec:R, type:'long', q:'Nowadays, discussions and reports about premarital sexual relationships seem to be increasing. Do you agree with this observation? Do you think premarital sex between consenting adults is natural, acceptable or wrong? Why?'},
  {id:'q3', sec:R, type:'long', q:'Do you think sex is a basic physical need, similar to eating, without which a person may remain dissatisfied? Can sexual desire be controlled, or is there a deeper emotional dimension to it? For example, can a person who feels emotionally secure and fulfilled experience less need for physical intimacy?'},
  {id:'q4', sec:R, type:'long', q:"What does marriage mean to you? In today's world, do you think marriage is necessary for people? Why or why not?",
    hint:'You may consider physical needs, emotional and financial support, sharing responsibilities and growing together, social or family expectations, or having a companion for life.'},
  {id:'q5', sec:R, type:'long', q:'Why do you think divorce rates and dissatisfaction in marriages are increasing?',
    hint:'You may consider factors such as financial disagreements, lack of time, unrealistic expectations, lack of emotional connection, infidelity, sexual dissatisfaction, differences in values or lifestyle, communication problems, lack of respect, family interference or emotional immaturity.'},
  {id:'q6', sec:R, type:'long', q:'Why do you think extramarital affairs are increasing and loyalty is decreasing in marriages?',
    hint:'You may consider factors such as couples not giving enough time to each other, lack of respect, lack of empathy or understanding, selfish attitudes, or an exploitative attitude towards a partner.'},
  {id:'q7', sec:R, type:'matrix', q:'How much influence do you think the following factors have on marital dissatisfaction or divorce?'},
  {id:'q8', sec:R, type:'long', q:'Have you observed any married couples whose lives have influenced your perception of marriage?',
    hint:[
      'You can describe one or two couples without mentioning their names or any identifying details.',
      '',
      'You may consider:',
      '- Their apparent economic condition and lifestyle.',
      '- Whether both partners work or one manages the household.',
      '- How much time they appear to spend together.',
      '- Whether they travel or enjoy activities together.',
      '- How they support and treat each other.',
      '- Whether, from what you can observe, they seem happy and satisfied in their marriage.',
      '- What qualities in their relationship would you want in your own marriage.'
    ].join('\n')},
  {id:'q9', sec:R, type:'long', q:[
    "Do you think young men and women genuinely understand each other's expectations, emotional needs and challenges?",
    '',
    'If not, what do you think prevents them from understanding each other?',
    '',
    'Would having genuine friendships with people of the opposite gender, without bias towards their financial background, social status, appearance or other such factors, help improve this understanding?'
  ].join('\n')},
  {id:'q10', sec:I, type:'long', q:'Would you be interested in being part of a community where you can develop genuine friendships without romantic or dating expectations?',
    hint:[
      'A space where you get an opportunity to understand people of the opposite gender, support their personal growth and help them grow, while developing the ability to build healthy, meaningful connections and better chemistry with others.',
      '',
      'Why would you be interested, or what would make you hesitant?'
    ].join('\n')}
];
STEPS.forEach(s => { s.opt = !s.req; });

/* ========== 3. State ========== */
const state = {
  answers: {}, skipped: {}, index: 0, mode: 'answer', fromReview: false,
  busy: false, submitted: false, token: newToken()
};
function newToken() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'T' + Date.now() + Math.random().toString(16).slice(2));
}

/* ========== 4. Helpers ========== */
const $ = id => document.getElementById(id);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(k => k != null && e.append(k));
  return e;
};
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SHORT_TEXT_RE = /^[a-zA-Z0-9\s.,&'()/-]+$/;
const LONG_TEXT_RE = /^[a-zA-Z0-9\s.,!?;:'"()&%/@\n\r-]+$/;
const yearsFor = cat => YEARS[cat] || YEARS.Other;

function show(which) {
  ['intro','chatWrap','review','done'].forEach(id => $(id).classList.toggle('hidden', id !== which));
}
function display(step) {
  const a = state.answers, id = step.id;
  if (state.skipped[id] || a[id] == null || a[id] === '') return null;
  if (step.type === 'category') return a.category === 'Other' && a.categoryOther ? 'Other: ' + a.categoryOther : a.category;
  if (step.type === 'matrix') return MATRIX.map(([k, l]) => `${l}: ${a.q7[k]}`).join('\n');
  return a[id];
}
function isDone(step) { return state.skipped[step.id] || display(step) !== null; }

/* ========== 5. Input builders ========== */
function buildInput(step) {
  const cur = state.answers[step.id];
  if (step.type === 'text' || step.type === 'email') {
    const i = h('input', {type: step.type === 'email' ? 'email' : 'text', maxlength: 200, value: cur || '',
      autocomplete: step.type === 'email' ? 'email' : 'off', 'aria-label': step.q});
    return {el: i, read: () => i.value.trim(), focus: () => i.focus()};
  }
  if (step.type === 'long') {
    const t = h('textarea', {maxlength: 4000, 'aria-label': step.q, placeholder: 'Type your answer here. A few honest lines are enough.'});
    t.value = cur || '';
    return {el: t, read: () => t.value.trim(), focus: () => t.focus()};
  }
  if (step.type === 'matrix') return buildMatrix(step);
  const opts = step.type === 'category' ? CATEGORIES : step.type === 'year' ? yearsFor(state.answers.category) : step.opts;
  let val = cur || null;
  const wrap = h('div');
  const row = h('div', {class: 'opts', role: 'group', 'aria-label': step.q});
  const other = h('input', {type: 'text', maxlength: 100, placeholder: 'Please specify', 'aria-label': 'Specify category',
    value: state.answers.categoryOther || '', class: 'hidden'});
  const sync = () => {
    row.querySelectorAll('button').forEach(b => { b.classList.toggle('sel', b.dataset.v === val); b.setAttribute('aria-pressed', b.dataset.v === val); });
    other.classList.toggle('hidden', !(step.type === 'category' && val === 'Other'));
  };
  opts.forEach(o => row.append(h('button', {type: 'button', 'data-v': o, onclick: () => { val = o; sync(); }}, o)));
  wrap.append(row, step.type === 'category' ? other : '');
  sync();
  return {el: wrap, read: () => ({val, other: other.value.trim()}), focus: () => (row.querySelector('button') || wrap).focus()};
}

function buildMatrix() {
  const cur = state.answers.q7 || {};
  const head = h('tr', {}, h('th', {scope: 'col'}, 'Factor'), [1,2,3,4,5].map(n => h('th', {scope: 'col'}, String(n))));
  const body = MATRIX.map(([k, label]) => h('tr', {}, h('td', {}, label),
    [1,2,3,4,5].map(n => h('td', {}, h('input', {type: 'radio', name: k, value: n, checked: cur[k] === n,
      'aria-label': `${label}: ${n}`})))));
  const el = h('div', {},
    h('ul', {class: 'scale'}, SCALE.map(s => h('li', {}, s))),
    h('div', {class: 'scroll'}, h('table', {class: 'matrix'}, h('thead', {}, head), h('tbody', {}, body))));
  const read = () => {
    const out = {};
    MATRIX.forEach(([k]) => { const c = el.querySelector(`input[name="${k}"]:checked`); if (c) out[k] = +c.value; });
    return out;
  };
  return {el, read, focus: () => el.querySelector('input').focus()};
}

/* ========== 6. Chat rendering ========== */
function render() {
  const step = STEPS[state.index], chat = $('chat'), panel = $('panel');
  show('chatWrap');
  chat.replaceChildren(); panel.replaceChildren();

  for (let i = 0; i < state.index; i++) {
    sectionLabel(i); bubble('bot', STEPS[i].q);
    const d = display(STEPS[i]);
    bubble('me', d === null ? 'Skipped' : (STEPS[i].type === 'matrix' ? 'Ratings submitted (12 of 12)' : d));
  }
  sectionLabel(state.index);
  bubble('bot', step.q);
  if (step.hint) chat.append(h('div', {class: 'hint'}, step.hint));
  if (step.type === 'matrix') chat.append(h('div', {class: 'hint'}, 'Rate each factor from 1 to 5.'));

  if (state.mode === 'confirm') {
    const d = display(step);
    bubble('me', d === null ? 'Skipped' : d);
    panel.append(h('div', {class: 'row', style: 'margin-top:0'},
      h('button', {type: 'button', onclick: () => { state.mode = 'answer'; render(); }}, 'Edit answer'),
      h('button', {type: 'button', class: 'primary', id: 'contBtn', onclick: next}, 'Continue')));
    $('contBtn').focus();
  } else {
    const inp = buildInput(step), err = h('div', {class: 'err', role: 'alert'});
    panel.append(inp.el, err, h('div', {class: 'row'},
      h('button', {type: 'button', class: 'primary', onclick: async (e) => {
        const btn = e.currentTarget;
        const val = inp.read();
        const r = save(step, val);
        if (r) { err.textContent = r; return; }

        if (step.type === 'email') {
          btn.disabled = true;
          err.textContent = '';
          btn.replaceChildren(h('span', {class: 'spin'}), 'Checking...');
          const dupErr = await checkEmailDuplicate(val);
          btn.disabled = false;
          btn.replaceChildren('Done - Review my answer');
          if (dupErr) {
            delete state.answers[step.id];
            err.textContent = dupErr;
            return;
          }
        }

        state.mode = 'confirm'; render();
      }}, 'Done - Review my answer'),
      step.opt ? h('button', {type: 'button', onclick: () => { state.answers[step.id] = null; state.skipped[step.id] = true; next(); }}, 'Skip this question') : null,
      (state.index > 0 || state.fromReview) ? h('button', {type: 'button', class: 'ghost', onclick: back}, state.fromReview ? 'Back to review' : 'Back') : null));
    setTimeout(() => inp.focus(), 0);
  }
  const total = STEPS.length;
  $('progressText').textContent = `Question ${state.index + 1} of ${total}`;
  $('progressBar').style.width = ((state.index + (state.mode === 'confirm' ? 1 : 0)) / total * 100) + '%';
  chat.scrollTop = chat.scrollHeight;
}
function sectionLabel(i) {
  if (i === 0 || STEPS[i].sec !== STEPS[i - 1].sec) $('chat').append(h('div', {class: 'sect'}, 'Section: ' + STEPS[i].sec));
}
function bubble(who, text) { $('chat').append(h('div', {class: 'msg ' + who}, text)); }

function save(step, v) {
  const a = state.answers, id = step.id;
  if (step.type === 'matrix') {
    if (Object.keys(v).length !== MATRIX.length) return 'Please rate all 12 factors, or skip this question.';
    a.q7 = v;
  } else if (step.type === 'category') {
    if (!v.val) return 'Please select a category.';
    if (v.val === 'Other') {
      if (!v.other) return 'Please specify your college category.';
      if (!SHORT_TEXT_RE.test(v.other)) return 'Please use only letters, numbers, and basic punctuation (.,&-/).';
    }
    a.category = v.val; a.categoryOther = v.val === 'Other' ? v.other : '';
    if (a.year && !yearsFor(a.category).includes(a.year)) { delete a.year; delete state.skipped.year; }
  } else if (step.type === 'choice' || step.type === 'year') {
    if (!v.val) return 'Please select an option.';
    a[id] = v.val;
  } else if (step.type === 'email') {
    if (!v) return 'This field is required.';
    if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.';
    a[id] = v;
  } else if (step.type === 'text') {
    if (!v) return 'This field is required.';
    if (v.length < 2) return 'Please enter a valid name.';
    if (!SHORT_TEXT_RE.test(v)) return 'Special characters are not allowed. Use only letters, numbers, and basic punctuation.';
    a[id] = v;
  } else if (step.type === 'long') {
    if (!v) return 'Please write something, or choose Skip.';
    if (!LONG_TEXT_RE.test(v)) return 'Please avoid special symbols (such as <, >, {, }, [, ], #, $, *, ~). Use standard text and punctuation.';
    a[id] = v;
  }
  delete state.skipped[id];
  return '';
}

async function checkEmailDuplicate(email) {
  if (!/^https:\/\/script\.google\.com\//.test(CONFIG.ENDPOINT_URL)) return '';
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(CONFIG.ENDPOINT_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action: 'checkEmail', email: email}),
      signal: ctl.signal,
      redirect: 'follow'
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.ok ? '' : (data.error || 'This email address has already been used.');
  } catch (e) {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

function next() {
  state.mode = 'answer';
  if (state.fromReview) { state.fromReview = false; return showReview(); }
  state.index++;
  if (state.index >= STEPS.length) { state.index = STEPS.length - 1; return showReview(); }
  render();
}
function back() {
  state.mode = 'answer';
  if (state.fromReview) { state.fromReview = false; return showReview(); }
  state.index--; render();
}

/* ========== 7. Review & submit ========== */
function showReview() {
  show('review');
  const box = $('review'); box.replaceChildren();
  const missing = STEPS.filter(s => s.req && !isDone(s));
  box.append(h('h1', {}, 'Review your answers'),
    h('p', {class: 'note'}, 'Thank you for sharing your views. Check your answers below. You can edit any of them before you submit.'));
  STEPS.forEach((s, i) => {
    const d = display(s);
    box.append(h('div', {class: 'card'},
      h('button', {type: 'button', 'aria-label': 'Edit: ' + s.q, onclick: () => {
        state.index = i; state.mode = 'answer'; state.fromReview = true; render(); }}, 'Edit'),
      h('b', {}, s.q.length > 90 ? s.q.slice(0, 87) + '...' : s.q),
      d === null ? (state.skipped[s.id] ? 'Skipped' : 'Not answered yet') : d));
  });
  const err = h('div', {class: 'err', role: 'alert', id: 'subErr'},
    missing.length ? 'Please complete: ' + missing.map(s => s.q).join(', ') + '.' : '');
  const btn = h('button', {type: 'button', class: 'primary', id: 'submitBtn', disabled: missing.length > 0, onclick: submit}, 'Submit Survey');
  box.append(err, h('div', {class: 'row'}, btn));
  box.scrollTop = 0;
}

function buildPayload() {
  const a = state.answers, text = id => (state.skipped[id] || !a[id]) ? '[Skipped]' : a[id];
  return {
    submissionToken: state.token,
    college: a.college, category: a.category, categoryOther: a.categoryOther || '',
    year: a.year, gender: a.gender, email: a.email,
    q1: text('q1'), q2: text('q2'), q3: text('q3'), q4: text('q4'), q5: text('q5'), q6: text('q6'),
    q7: state.skipped.q7 ? null : a.q7,
    q8: text('q8'), q9: text('q9'), q10: text('q10')
  };
}

async function submit() {
  if (state.busy || state.submitted) return;
  const btn = $('submitBtn'), err = $('subErr');
  if (!/^https:\/\/script\.google\.com\//.test(CONFIG.ENDPOINT_URL)) {
    err.textContent = 'The survey endpoint is not configured yet. Set ENDPOINT_URL in script.js.'; return;
  }
  state.busy = true; btn.disabled = true; err.textContent = '';
  btn.replaceChildren(h('span', {class: 'spin'}), 'Submitting...');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), CONFIG.TIMEOUT_MS);
  try {
    const res = await fetch(CONFIG.ENDPOINT_URL, {
      method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(buildPayload()), signal: ctl.signal, redirect: 'follow'
    });
    if (!res.ok) throw new Error('Server responded with status ' + res.status);
    let data; try { data = await res.json(); } catch (e) { throw new Error('Unreadable response from server'); }
    if (!data.ok || !data.id) throw new Error(data.error || 'The server could not save your answers');
    state.submitted = true;
    $('rid').textContent = data.id;
    state.answers = {}; state.skipped = {};
    show('done');
  } catch (e) {
    err.textContent = 'Your answers were not confirmed as saved (' + (e.name === 'AbortError' ? 'request timed out' : e.message) +
      '). Your responses are still here. Please check your connection and try again.';
    btn.replaceChildren('Try again'); btn.disabled = false;
  } finally { clearTimeout(timer); state.busy = false; }
}

/* ========== 8. Wiring ========== */
$('startBtn').addEventListener('click', () => { state.index = 0; state.mode = 'answer'; render(); });
$('copyBtn').addEventListener('click', async () => {
  const id = $('rid').textContent, msg = $('copyMsg');
  try { await navigator.clipboard.writeText(id); msg.textContent = 'Copied to clipboard.'; }
  catch (e) {
    const t = h('textarea', {style: 'position:fixed;opacity:0'}); t.value = id; document.body.append(t); t.select();
    try { document.execCommand('copy'); msg.textContent = 'Copied to clipboard.'; } catch (_) { msg.textContent = 'Copy failed. Please select and copy the ID manually.'; }
    t.remove();
  }
});
window.addEventListener('beforeunload', e => {
  if (!state.submitted && Object.keys(state.answers).length) { e.preventDefault(); e.returnValue = ''; }
});
})();