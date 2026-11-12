// Answer test: talks to JARVIS like you would (in order, so things build up) and checks each ANSWER,
// not just which feature it went to — including the opposites (remove, undo, uncheck, off…).
// Run:  node tools/behavior-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
const store = new Map();
const sb = { console, Intl, Date, Math, JSON, setTimeout, clearTimeout, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }, fetch: async () => ({ ok: false, json: async () => null }) };
vm.createContext(sb);
for (const f of ['sessions.js', 'bias-rules.js', 'paper.js', 'reminders.js', 'lexicon.js', 'extras.js', 'brain.js', 'life.js']) vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), sb, { filename: f });
const { Brain, Life } = vm.runInContext('({ Brain, Life })', sb);
const ctx = { tz: 'America/New_York', title: 'sir', sessions: JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8')), projects: [], gold: () => null, riskPct: 1, refresh: async () => null, handsFree: () => {} };

// [what you say, text the answer must contain (case-insensitive, | = any of), optional text it must NOT contain]
const T = [
  // subscriptions — the exact sentence that went wrong
  ['my cloud subscription is due on december 1st for claude', 'claude|how much', '$1.00'],
  ['claude is 20 dollars', '20'],
  ['when is claude due', 'dec 1'],
  ['add netflix 15.99 a month on the 5th', 'netflix|15.99'],
  ['netflix is now 17.99', 'updated|17.99'],
  ['change netflix to 18.99', '18.99'],
  ['I pay 10 dollars for spotify every month', 'spotify'],
  ['rent is 1200 due on the 1st', 'rent|1,200'],
  ['my subscriptions', 'netflix'],
  ['what bills are due this week', 'due|nothing'],
  ['how much do I pay for subscriptions', 'a month'],
  ['cancel spotify', 'removed spotify'],
  ['remove subscriptions', 'removed all'],
  ['my subscriptions', 'no subscriptions'],
  // water + opposites
  ['I drank a glass of water', '1 of 8|1 glass'],
  ['log this one glass that I drank', '2 of 8'],
  ['I drank two bottles of water', '6 of 8'],
  ['remove a glass of water', '5 of 8|now 5|5 glasses'],
  ['take off 2 glasses', '3 of'],
  ['undo that', 'put back 2'],
  ['how much water did I drink today', '5 glasses|5 of'],
  ['reset my water', '0'],
  ['set my water goal to 10', '10 glasses'],
  ['turn on water reminders', 'reminders on'],
  ['turn off water reminders', 'reminders off'],
  // habits + opposites
  ['add a habit of me working out today', 'workout'],
  ['add habit reading', 'read'],
  ['I worked out today', 'workout'],
  ["I didn't work out today", 'unchecked'],
  ['I read today', 'done'],
  ['undo that', 'undone'],
  ['my habits', 'read|workout'],
  ['stop tracking reading', 'stopped tracking'],
  // to-do + opposites
  ['add milk, eggs and bread to my list', 'milk'],
  ['done with eggs', 'done'],
  ['uncheck eggs', 'back on your list'],
  ['I got the bread', 'done'],
  ['remove milk from my list', 'removed milk'],
  ["what's on my list", 'eggs'],
  ['clear my list', 'clear'],
  // money + opposites
  ['I spent 20 dollars on food', '20'],
  ['dropped 45 on dinner', '45'],
  ['I bought shoes for 60', '60'],
  ['set my food budget to 300', '300'],
  ['how much did I spend on food this month', '65'],
  ['how much did I spend this week', '125'],
  ['what is my biggest expense this month', 'shoes'],
  ['delete the shoes expense', 'removed'],
  ['undo last expense', 'removed'],
  ['my budget', 'food'],
  ['remove my food budget', 'removed your food budget'],
  // memory + opposite
  ['remember my locker is 42', 'locker is 42'],
  ['what is my locker', '42'],
  ['forget my locker', 'forgotten'],
  // timers + opposite
  ['set a timer for 5 minutes', '5 minute'],
  ['how much time is left', 'left|remaining|min'],
  ['cancel the timer', 'cancel'],
  // sleep
  ["I'm trying to wake up at 9:30", '9:30'],
  ['what time should I go to bed if I wake up at 7', '7'],
  // shortcuts + opposite
  ['when I say status, show my subscriptions then my habits', 'status'],
  ['my shortcuts', 'status'],
  ['forget status', 'forgot'],
  // hands-free on/off
  ['stop listening', 'stop listening'],
  ['start listening', 'hands-free is on'],
  // follow-ups
  ['what time is it in london', 'london'],
  ['what about tokyo', 'tokyo'],
  ['tell me a fact', ''],
  ['another one', ''],
  // extras
  ['what is an order block', 'order block'],
  ['what does fomc mean', 'fomc'],
  ['if I buy 50 contracts and it goes up 12 dollars', '600'],
  ["what's 70 fahrenheit in celsius", '21.1'],
  ['5 miles in km', '8.05'],
  ['20 percent tip on 45', '9'],
  ['flip a coin', 'heads|tails'],
  ['roll two dice', ''],
  ['pick a number between 1 and 10', ''],
  ['should I get pizza or tacos', 'pizza|tacos'],
  ['are you ai', 'no ai'],
  ["I can't sleep", 'breathing'],
  ['I keep revenge trading', 'revenge'],
  // moods (always positive)
  ['honestly today was rough, work was a lot and I did not sleep well but I am hanging in there', 'work'],
  ["I'm feeling great", 'love|great|good'],
];

(async () => {
  let pass = 0;
  const fails = [];
  for (const [say, want, not] of T) {
    let a;
    try { a = await Brain.interpret(say, ctx); } catch (e) { a = { html: 'ERROR ' + e.message, say: '' }; }
    const txt = a ? (String(a.html || '').replace(/<[^>]+>/g, '') + ' ' + (a.say || '')).toLowerCase().replace(/\s+/g, ' ') : 'null';
    const ok = (!want || want.toLowerCase().split('|').some((w) => txt.includes(w))) && !(not && txt.includes(not.toLowerCase())) && txt !== 'null' && !/didn.t quite catch|not sure i follow|say that another way/.test(txt);
    if (ok) pass++; else fails.push(`✗ "${say}"\n    wanted: ${want}${not ? '  (not: ' + not + ')' : ''}\n    got:    ${txt.replace(/\s+/g, ' ').slice(0, 180)}`);
  }
  console.log(`${pass}/${T.length} answers correct`);
  for (const f of fails) console.log(f);
  process.exitCode = fails.length ? 1 : 0;
})();
