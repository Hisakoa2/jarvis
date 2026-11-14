// Ask JARVIS's brain from the command line (no live prices).  node tools/ask.js "what's the bias" "flip a coin"
// add --route to only show which answer each sentence goes to.
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
const store = new Map();
const sb = { console, Intl, Date, Math, JSON, setTimeout, clearTimeout, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }, fetch: async () => ({ ok: false, json: async () => null }) };
vm.createContext(sb);
for (const f of ['sessions.js', 'bias-rules.js', 'paper.js', 'reminders.js', 'lexicon.js', 'extras.js', 'talk.js', 'brain.js', 'life.js']) vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), sb, { filename: f });
const { Brain } = vm.runInContext('({ Brain })', sb);
const ctx = { tz: 'America/New_York', title: 'sir', sessions: JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8')), projects: [], gold: () => null, riskPct: 1, refresh: async () => null };
const args = process.argv.slice(2), routeOnly = args.includes('--route');
(async () => {
  for (const s of args.filter((a) => a !== '--route')) {
    const r = Brain.routeOf(s, ctx);
    if (routeOnly) { console.log(`${s}  →  ${r && r.id}`); continue; }
    const a = await Brain.interpret(s, ctx);
    console.log(`> ${s}  [${r && r.id}]\n  ${a ? a.say : a}`);
  }
})();
