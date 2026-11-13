// Trade-coach test: asks JARVIS trade questions with demo prices loaded and checks the ANSWERS.
// Run:  node tools/trade-test.js        (add --show to print every answer)
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
const store = new Map();
const sb = { console, Intl, Date, Math, JSON, setTimeout, clearTimeout, URLSearchParams, Promise, location: { protocol: 'https:', href: 'https://x/' },
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  fetch: async () => { throw new Error('offline'); } };
vm.createContext(sb);
for (const f of ['sessions.js', 'bias-rules.js', 'data.js', 'paper.js', 'reminders.js', 'lexicon.js', 'extras.js', 'brain.js', 'life.js']) vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), sb, { filename: f });
const { Brain, Data, Paper } = vm.runInContext('({ Brain, Data, Paper })', sb);
const sessions = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8'));
const show = process.argv.includes('--show');

(async () => {
  const g = await Data.snapshot({ sessions });
  const ctx = { tz: 'America/New_York', title: 'sir', sessions, projects: [], gold: () => g, riskPct: 1, refresh: async () => g, handsFree: () => {}, paper: Paper };
  const px = g.price.bid, dir = g.bias.bias === 'Bullish' ? 1 : g.bias.bias === 'Bearish' ? -1 : 1;
  const side = dir > 0 ? 'buy' : 'sell', anti = dir > 0 ? 'sell' : 'buy';
  const r = (n) => Math.round(n);
  const E = r(px - dir * 3);                 // a trade with the bias, a little in profit
  const wrongStop = r(px + dir * 5);         // on the wrong side of price
  const goodStop = r(E - dir * 12), tightStop = r(px - dir * 0.6);
  console.log(`demo price ${px.toFixed(2)}, bias ${g.bias.bias}, atr ${g.bias.atr}`);
  // [say, route, answer must contain (| = any), must NOT contain]
  const T = [
    [`I'm in a ${side} at ${E}`, 'coach', 'stop loss|tp1'],
    [`I'm in a trade at ${E}, where should my stop loss and take profit be`, 'coach', 'stop loss'],
    [`is it cool if I put my stop loss at ${wrongStop}`, 'coach', 'no, sir|straight away'],
    [`is it cool if I put my stop loss at ${tightStop}`, 'coach', 'advise against'],
    [`can I put my stop at ${goodStop}`, 'coach', "good for that|tight side|wide stop"],
    [`what about a stop at ${goodStop}`, 'coach', "good for that|tight side|wide stop"],
    ['should I hold my trade', 'coach', 'yes, sir|no, sir|not with full size'],
    ['should I hold the trade I am in', 'coach', 'yes, sir|no, sir|not with full size'],
    ['should I close my trade', 'coach', 'yes, sir|no, sir|close part'],
    ['should I close it or hold it', 'coach', 'sir'],
    ['should I take partials', 'coach', 'sir'],
    ['is it a good idea to take some profit off', 'coach', 'sir'],
    ['should I move my stop to break even', 'coach', 'sir'],
    ['should I lower my break even', 'coach', 'sir'],
    ['can I lower my take profit', 'coach', 'sir'],
    ['should I raise my target', 'coach', 'sir'],
    ['should I extend my tp', 'coach', 'sir'],
    ['should I trail my stop', 'coach', 'sir'],
    ['should I widen my stop', 'coach', 'advise against widening'],
    [`can I move my take profit to ${r(px + dir * 1)}`, 'coach', 'advise against|price is already|good for that|stretch'],
    [`is ${r(px + dir * 40)} a good take profit`, 'coach', 'sir'],
    ['if I were to buy right now and I wanted my risk to be 100 how many contracts would I use', 'size', 'contracts'],
    ['how many contracts for a $100 stop', 'size', 'contracts'],
    ['if I sell now with $250 risk how many contracts', 'size', 'contracts'],
    ['I want to risk 100 dollars on a buy how many contracts', 'size', 'contracts'],
    ['risk 1 percent with a 6 dollar stop', 'size', '6.00|units|stop'],
    ['are market conditions okay to trade', 'tradenow', 'yes, sir|no, sir|not really'],
    ['is it a good time to trade right now', 'tradenow', 'yes, sir|no, sir|not really|closed|open'],
    ['hold on a second', '!coach', ''],
    ['should I keep going with my workout', '!coach', ''],
  ];
  let ok = 0;
  for (const [say, route, must, not] of T) {
    const id = Brain.routeOf(say, ctx); const rid = id && id.id;
    let a = null; try { a = await Brain.interpret(say, ctx); } catch (e) { a = { html: 'ERROR ' + e.stack, say: 'ERROR ' + e.message }; }
    const txt = ((a && a.html) || '').replace(/<[^>]+>/g, '').toLowerCase();
    const routeOk = route.startsWith('!') ? rid !== route.slice(1) : rid === route;
    const mustOk = !must || must.toLowerCase().split('|').some((m) => txt.includes(m));
    const notOk = !not || !txt.includes(not.toLowerCase());
    const pass = routeOk && mustOk && notOk && !/ERROR/.test(txt);
    if (pass) ok++;
    if (!pass || show) console.log(`${pass ? 'ok  ' : 'FAIL'} [${rid}] ${say}\n      ${txt.slice(0, 420)}`);
  }
  // the panel's own trade: place a paper sell/buy and ask about it
  console.log(`\n${ok}/${T.length} trade answers correct`);
  process.exitCode = ok === T.length ? 0 : 1;
})();
