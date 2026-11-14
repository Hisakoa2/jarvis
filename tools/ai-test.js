// AI helper test: runs ai.js against a FAKE Groq (no key, no internet) and checks every path.
// Run:  node tools/ai-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
let ok = 0, n = 0;
const check = (name, cond, extra = '') => { n++; if (cond) ok++; else console.log('FAIL', name, extra); };

function load(fakeFetch) {
  const store = new Map();
  const sb = { console, Date, JSON, Math, Promise, Object, String, Error, AbortSignal, setTimeout,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    fetch: fakeFetch };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'ai.js'), 'utf8'), sb, { filename: 'ai.js' });
  return { AI: vm.runInContext('AI', sb), store };
}
const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
const MODELS = { data: [{ id: 'whisper-large-v3' }, { id: 'llama-3.3-70b-versatile' }, { id: 'openai/gpt-oss-20b' }] };

(async () => {
  // no key
  let { AI } = load(async () => res(200, {}));
  check('not ready without key', !AI.ready());
  try { await AI.ask('hi'); check('nokey throws', false); } catch (e) { check('nokey code', e.code === 'nokey'); check('nokey message', /Settings/.test(AI.why(e, 'sir'))); }

  // happy path: picks preferred model, strips markdown, remembers the chat
  const seen = [];
  ({ AI } = load(async (url, o) => {
    seen.push({ url, body: o && o.body ? JSON.parse(o.body) : null, auth: o.headers.Authorization });
    if (url.endsWith('/models')) return res(200, MODELS);
    return res(200, { choices: [{ message: { content: '**Sure, sir.** The capital of France is Paris.' } }] });
  }));
  AI.setKey('gsk_' + 'x'.repeat(40));
  check('ready with key', AI.ready());
  const a = await AI.ask('what is the capital of france', { title: 'sir' });
  check('answer text', a === 'Sure, sir. The capital of France is Paris.', a);
  const chatCall = seen.find((s) => s.url.endsWith('/chat/completions'));
  check('uses preferred model', chatCall.body.model === 'llama-3.3-70b-versatile', chatCall.body.model);
  check('sends bearer key', /^Bearer gsk_/.test(chatCall.auth));
  check('system says no trade calls', /Never make trading calls/.test(chatCall.body.messages[0].content));
  check('system uses sir', /"sir"/.test(chatCall.body.messages[0].content));
  await AI.ask('and germany?');
  const second = seen.filter((s) => s.url.endsWith('/chat/completions'))[1];
  check('follow-up keeps context', second.body.messages.length === 4, String(second.body.messages.length));

  // errors
  const errCase = async (status, msg) => { const L = load(async (url) => (url.endsWith('/models') ? res(200, MODELS) : res(status, { error: { message: msg } }))); L.AI.setKey('gsk_' + 'y'.repeat(40)); try { await L.AI.ask('hi'); return null; } catch (e) { return L.AI.why(e, 'sir'); } };
  check('401 → key not working', /key isn't working/.test(await errCase(401, 'Invalid API Key')));
  check('429 daily → out for today', /out of questions for today/.test(await errCase(429, 'Rate limit reached ... requests per day (RPD)')));
  check('429 minute → busy', /busy for a moment/.test(await errCase(429, 'Rate limit reached ... requests per minute (RPM)')));
  check('500 → generic', /had a problem/.test(await errCase(500, 'oops')));
  const net = load(async () => { throw new Error('offline'); }); net.AI.setKey('gsk_' + 'z'.repeat(40));
  try { await net.AI.ask('hi'); check('net throws', false); } catch (e) { check('net message', /can't reach/.test(net.AI.why(e, 'sir'))); }

  // a retired model: re-pick once and succeed
  let calls = 0;
  const L2 = load(async (url, o) => {
    if (url.endsWith('/models')) return res(200, calls++ === 0 ? MODELS : { data: [{ id: 'openai/gpt-oss-120b' }] });
    const m = JSON.parse(o.body).model;
    return m === 'llama-3.3-70b-versatile' ? res(404, { error: { message: 'The model `llama-3.3-70b-versatile` has been decommissioned' } }) : res(200, { choices: [{ message: { content: 'Hello sir.' } }] });
  });
  L2.AI.setKey('gsk_' + 'w'.repeat(40));
  check('retired model recovers', (await L2.AI.ask('hi')) === 'Hello sir.');
  check('new model saved', L2.store.get('jarvis.groqModel') === 'openai/gpt-oss-120b', L2.store.get('jarvis.groqModel'));

  // "ask AI …" detection
  const D = load(async () => res(200, {})).AI;
  check('ask AI direct', D.direct('ask AI what is a good dinner idea') === 'what is a good dinner idea');
  check('hey ai direct', D.direct('hey AI, tell me a joke') === 'tell me a joke');
  check('ask the ai helper', D.direct('ask the AI helper how far is the moon') === 'how far is the moon');
  check('normal words not direct', D.direct('what is the bias') === null && D.direct('said hi') === null && D.direct('aim for 4000') === null);

  // brain marks only real "don't understand" replies as unknown
  const store = new Map();
  const sb = { console, Intl, Date, Math, JSON, setTimeout, clearTimeout, URLSearchParams, Promise, location: { protocol: 'https:', href: 'https://x/' },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    fetch: async () => { throw new Error('offline'); } };
  vm.createContext(sb);
  for (const f of ['sessions.js', 'bias-rules.js', 'data.js', 'paper.js', 'reminders.js', 'lexicon.js', 'extras.js', 'talk.js', 'brain.js', 'life.js']) vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), sb, { filename: f });
  const { Brain, Data, Paper } = vm.runInContext('({ Brain, Data, Paper })', sb);
  const sessions = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8'));
  const g = await Data.snapshot({ sessions });
  const ctx = { tz: 'America/New_York', title: 'sir', sessions, projects: [], gold: () => g, riskPct: 1, refresh: async () => g, handsFree: () => {}, paper: Paper };
  const u1 = await Brain.interpret('how tall is mount everest', ctx);
  check('unknown question flagged', u1 && u1.unknown === true, JSON.stringify(u1 && u1.html).slice(0, 120));
  const u2 = await Brain.interpret('what is the bias', ctx);
  check('known command not flagged', u2 && !u2.unknown);
  // everyday questions go to the AI; JARVIS's own commands never do
  for (const q of ['why do cats purr so much', 'how far away is the moon', 'why is the sky blue', 'how many ounces in a pound', 'write a short poem about gold', 'tell me about the roman empire', 'what is compound interest', 'who was the first president'])
    check('general → AI: ' + q, Brain.general(q, ctx));
  for (const q of ['do i lock in gains now', 'do i bank gains', 'define liquidity', 'what is 10 kg to pounds', 'are we leaning bullish today', 'should i let my winner run', 'what is the bias', 'why is gold bullish', 'should I sell right now', 'how far is the weekly open', 'what time is it', 'remind me to drink water at 5', 'what is the weather', 'how are you', 'how is my trade', 'is the market open', 'where is resistance', 'what should I eat', 'tell me a joke', 'what is a pip', 'how many contracts for a 100 dollar stop', 'should I hold my trade', 'sell now', 'is it cool if I put my stop at 4005', 'add netflix 15.99 a month', 'how much did I spend this week'])
    check('rules keep: ' + q, !Brain.general(q, ctx));

  console.log(`\n${ok}/${n} AI helper checks passed`);
  process.exitCode = ok === n ? 0 : 1;
})();
