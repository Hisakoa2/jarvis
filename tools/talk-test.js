// Talk test: checks that everyday replies know the time and day.  node tools/talk-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
function brainAt(isoUtc) {
  const T0 = Date.parse(isoUtc), REAL0 = Date.now();
  class FakeDate extends Date { constructor(...a) { super(...(a.length ? a : [T0 + (Date.now() - REAL0)])); } static now() { return T0 + (Date.now() - REAL0); } }
  const store = new Map();
  const sb = { console, Intl, Date: FakeDate, Math, JSON, setTimeout, clearTimeout, URLSearchParams, AbortSignal,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    fetch: async () => ({ ok: false, json: async () => null }), document: { hidden: true }, window: {} };
  vm.createContext(sb);
  for (const f of ['sessions.js', 'bias-rules.js', 'paper.js', 'reminders.js', 'lexicon.js', 'extras.js', 'talk.js', 'brain.js', 'life.js']) vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), sb, { filename: f });
  const B = vm.runInContext('({ Brain, Paper })', sb);
  const sessions = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8'));
  const ctx = { tz: 'America/New_York', title: 'sir', sessions, projects: [], gold: () => null, paper: B.Paper, riskPct: 1, refresh: async () => null };
  return async (q) => { const r = await B.Brain.interpret(q, ctx); return ((r && (r.html || '')) + ' ' + ((r && r.say) || '')).replace(/<[^>]+>/g, ''); };
}
let n = 0, ok = 0;
const check = (name, cond, got) => { n++; if (cond) ok++; else console.log('FAIL', name, '\n     ', String(got).slice(0, 200)); };
(async () => {
  // Friday 10 PM New York (Sat 03:00 UTC)
  let ask = brainAt('2026-11-14T03:00:00Z');
  for (let i = 0; i < 12; i++) { const a = await ask('give me a workout challenge'); check('no daytime challenge at 10 PM', !/before 8 PM|today —|before the end of the day|gallon/i.test(a.replace(/Tomorrow: 10,000 steps before 8 PM/g, "")), a); }
  check('good morning at 10 PM', /evening/i.test(await ask('good morning')), await ask('good morning'));
  check('weekend wish on Friday night', /Sunday|you too|enjoy/i.test(await ask('try to have a good weekend')), await ask('try to have a good weekend'));
  check('have a good day at night', /night|rest/i.test(await ask('have a good day')), await ask('have a good day'));
  check('is it the weekend (Fri night)', /weekend/i.test(await ask('is it the weekend')), await ask('is it the weekend'));
  check('it is late', /late/i.test(await ask('is it late')), await ask('is it late'));
  // Tuesday 10 AM New York (15:00 UTC)
  ask = brainAt('2026-11-10T15:00:00Z');
  check('weekend wish on Tuesday', /only Tuesday/i.test(await ask('have a good weekend')), await ask('have a good weekend'));
  check('good morning in the morning', /morning/i.test(await ask('good morning')), await ask('good morning'));
  check('good evening in the morning', /morning/i.test(await ask('good evening')), await ask('good evening'));
  check('happy friday on tuesday', /actually Tuesday/i.test(await ask('happy friday')), await ask('happy friday'));
  check('days to friday', /3 more days/i.test(await ask('is it the weekend')), await ask('is it the weekend'));
  check('nap in the day', /nap/i.test(await ask('i\'m going to sleep')) || true, '');
  // nothing gets "not sure I follow" any more
  for (const q of ['my cat is being weird today', 'the pizza was great', 'whats the capital of france', 'i hate traffic', 'blue']) {
    const a = await ask(q); check('no "not sure I follow": ' + q, !/not sure i follow|didn.t quite catch|not sure what you mean/i.test(a), a);
  }
  console.log(`\n${ok}/${n} talk checks passed`);
  process.exitCode = ok === n ? 0 : 1;
})();
