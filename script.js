/* myClub survey – chat-style front end. Vanilla JS, no dependencies. */
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
const SCALE = ['1 – No significant influence','2 – Low influence','3 – Moderate influence','4 – High influence','5 – Very high influence'];

const P = 'About You', R = 'Relationships, Intimacy and Marriage', I = 'Your Interest';
const STEPS = [
  {id:'college', sec:P, type:'text', req:true, q:'College Name'},
  {id:'category', sec:P, type:'category', req:true, q:'Which category does your college belong to?'},
  {id:'year', sec:P, type:'year', req:true, q:'Which year are you currently studying in?'},
  {id:'gender', sec:P, type:'choice', req:true, opts:['Male','Female'], q:'Gender'},
  {id:'email', sec:P, type:'email', req:true, q:'Email Address',
    hint:'We will use this email address to contact you regarding the upcoming myClub online meeting and share the Zoom meeting link.'},
  {id:'q1', sec:R, type:'long', q:'Why do you think young women and men enter boyfriend–girlfriend relationships nowadays? Do you think this culture is justified? Why or why not?',
    hint:'You may consider possible reasons such as companionship, physical needs, emotional support, physical interaction or the possibility of marriage.'},
  {id:'q2', sec:R, type:'long', q:'Nowadays, discussions and reports about premarital sexual relationships seem to be increasing. Do you agree with this observation? Do you think premarital sex between consenting adults is natural, acceptable or wrong? Why?'},
  {id:'q3', sec:R, type:'long', q:'Do you think sex is a basic physical need, similar to eating, without which a person may remain dissatisfied? Can sexual desire be controlled, or is there a deeper emotional dimension to it? For example, can a person who feels emotionally secure and fulfilled experience less need for physical intimacy?'},
  {id:'q4', sec:R, type:'long', q:'What does marriage mean to you? In today\'s world, do you think marriage is necessary for people? Why or why not?',
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
      '• Their apparent economic condition and lifestyle.',
      '• Whether both partners work or one manages the household.',
      '• How much time they appear to spend together.',
      '• Whether they travel or enjoy activities together.',
      '• How they support and treat each other.',
      '• Whether, from what you can observe, they seem happy and satisfied in their marriage.',
      '• What qualities in their relationship would you want in your own marriage.'
    ].join('\n')},
  {id:'q9', sec:R, type:'long', q:[
    'Do you think young men and women genuinely understand each other\'s expectations, emotional needs and challenges?',
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

/* ========== 5. Input builders (each returns {el, read, focus}) ========== */
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
  const opts = step.type === 'category' ? CATEGORIES : step.type === 'year' ? yearsFor(state