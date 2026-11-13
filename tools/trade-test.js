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
    // v14: opposites — a "not" question flips the yes/no; either-or and "what should I do" get no yes/no
    ['should I not close my trade', 'coach', "hold|close part|i'd close", "no, sir — i'd hold"],
    ['should I not close', 'coach', "hold|close part|i'd close", "no, sir — i'd hold"],
    ['is it a bad idea to close my trade', 'coach', 'sir', "no, sir — i'd hold"],
    ['is it too early to close', 'coach', 'sir', "no, sir — i'd hold"],
    ['would it be dumb to close my trade', 'coach', 'sir', "no, sir — i'd hold"],
    ['should I hold off on closing', 'coach', 'sir', "no, sir — i'd hold"],
    ['should I avoid closing my trade', 'coach', 'sir', "no, sir — i'd hold"],
    ['should I not hold my trade', 'coach', 'sir', 'yes, sir — hold it'],
    ['should I not take partials', 'coach', 'sir', 'yes, sir — taking partials'],
    ["shouldn't I close my trade", 'coach', 'sir', "yes, sir — i'd hold"],
    ["I'm not sure if I should close my trade", 'coach', 'sir', "yes, sir — i'd hold"],
    ['should I hold or not', 'coach', 'sir', 'no, sir — hold it'],
    ["I don't want to hold", 'coach', 'sir', 'yes, sir'],
    ['should I stay in or get out', 'coach', 'sir', 'yes, sir'],
    ['what should I do with my trade', 'coach', 'sir', 'yes, sir'],
    ['is my trade still good', 'coach', 'sir'],
    ['is my trade still valid', 'coach', 'sir'],
    ['should I take the win', 'coach', 'sir'],
    ['should I cut my losses', 'coach', 'sir'],
    ['should I exit my position', 'coach', 'sir'],
    ['should I stay in the trade', 'coach', 'sir'],
    ['do I get out', 'coach', 'sir'],
    ['what should I do today', '!coach', ''],
    ['should I not go to the gym', '!coach', ''],
    // a trade AGAINST the bias: the coach should lean to closing, and the flips still read right
    [`I'm in a ${anti} at ${E}`, 'coach', 'stop loss'],
    ['should I not close my trade', 'coach', "i'd close|close part|full size|carefully", "yes, sir — i'd close"],
    ['should I cut my losses', 'coach', "i'd close|close part|hold"],
    ['is my trade still good', 'coach', "wouldn't hold|full size|carefully|hold it"],
    ["I don't want to hold", 'coach', 'sir', 'no, sir'],
    // v15: with no size given, a trade risks the max per trade ($250 by default), not 1% of the account
    ['sell now', '!coach', 'inside your $250 max'],
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
  // v16: keeping a trade inside the $250 max — tighten to closer structure, size down, or both
  const fk = (atr, levels) => ({ g: { bias: { atr }, price: { bid: 3900, ask: 3900.3 }, levels: { list: levels } } });
  const FR = [
    ['tightened', fk(10, [{ name: 'A', price: 3896.5 }]), { entry: 3900, stop: 3880, risk: 20, unit: 10 }, (r) => r.units >= 40 && r.units * r.risk <= 250],
    ['both', fk(10, [{ name: 'A', price: 3895 }]), { entry: 3900, stop: 3880, risk: 20, unit: 10 }, (r) => r.units < 40 && r.units * r.risk <= 250 && r.risk < 20],
    ['sized', fk(14, []), { entry: 3895, stop: 3887, risk: 8, unit: 14 }, (r) => r.stop === 3887 && r.units === 31],
    ['fits', fk(10, []), { entry: 3900, stop: 3894, risk: 6, unit: 10 }, (r) => r.units === 41],
  ];
  for (const [how, k, p, chk] of FR) {
    const r = Brain.fitRisk(k, 1, p, 250);
    const pass = r.how === how && chk(r);
    T.push(0); if (pass) ok++;
    if (!pass || show) console.log(`${pass ? 'ok  ' : 'FAIL'} fitRisk ${how}: got ${r.how}, stop ${r.stop}, ${r.units} units, risk $${(r.units * r.risk).toFixed(0)}`);
  }
  // the panel's own trade: place a paper sell/buy and ask about it
  console.log(`\n${ok}/${T.length} trade answers correct`);
  process.exitCode = ok === T.length ? 0 : 1;
})();
