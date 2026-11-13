// ============================================================================
//  JARVIS cloud trader — runs on GitHub every 5 minutes (one long run that restarts itself), even when your phone is off.
//  It loads the SAME files the app uses (bias rules, levels, news, brain.botCheck), so it makes the
//  same decisions JARVIS would make in the app:
//    • at most one paper trade per trading day, only when the setup is valid (no forced trades)
//    • entries 6:15 PM → 4 PM New York, target at least 1.5× the stop, the stop never moves
//    • closes its own trade at 4:50 PM New York
//  It never touches your real OANDA account — it only READS prices with the key, and writes its
//  paper trades to bot/trades.json on the "bot-data" branch. The app copies them into your paper P&L.
//  Usage: node tools/bot-runner.js <path to trades.json>
//  Needs env: OANDA_API_KEY, OANDA_ACCOUNT_ID, OANDA_ENV (practice|live)
// ============================================================================
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
const STATE = process.argv[2] || path.join(__dirname, '..', 'botdata', 'bot', 'trades.json');
const PAGES = 'https://hisakoa2.github.io/jarvis/';
const NY = 'America/New_York';
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

function readState() {
  try { const s = JSON.parse(fs.readFileSync(STATE, 'utf8')); if (s && s.days) return s; } catch {}
  return { v: 1, enabled: false, heartbeat: 0, check: null, days: {} };
}
function writeState(s) { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 1) + '\n'); }

(async () => {
  const prev = readState();
  const core = (s) => JSON.stringify({ e: s.enabled, d: s.days }, (k, v) => (k === 'lastCheck' || k === 'worst' || k === 'best' ? undefined : v));
  const prevCore = core(prev);
  const key = process.env.OANDA_API_KEY, account = process.env.OANDA_ACCOUNT_ID, env = process.env.OANDA_ENV || 'practice';
  if (!key || !account) {
    console.log('Cloud trader is not set up yet (OANDA_API_KEY / OANDA_ACCOUNT_ID secrets missing).');
    if (prev.enabled) { prev.enabled = false; writeState(prev); out('changed', 1); }
    return;
  }

  // ---- load the app's own code in a sandbox ----
  const store = new Map([['jarvis.oanda', JSON.stringify({ key, account, env })]]);
  const sb = {
    console, Intl, Date, Math, JSON, URLSearchParams, AbortSignal, setTimeout, clearTimeout, Promise, location: { protocol: 'https:', href: PAGES },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    fetch: (url, opts) => fetch(/^https?:/.test(url) ? url : PAGES + url, opts),
  };
  vm.createContext(sb);
  for (const f of ['sessions.js', 'bias-rules.js', 'data.js', 'news.js', 'lexicon.js', 'brain.js']) vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), sb, { filename: f });
  const { Sessions, Data, News, Brain } = vm.runInContext('({ Sessions, Data, News, Brain })', sb);
  const sessions = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8'));

  const now = Date.now();
  const dayKey = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: NY }).format(new Date(ms));
  const tradeDay = (ms) => dayKey(ms + 6 * 3600e3); // 6 PM → 5 PM New York, keyed by the date it ends on
  const endOf = (day) => { const [y, m, d] = day.slice(0, 10).split('-').map(Number); return Sessions.zonedToUtc(y, m, d, 16, 50, NY); };

  const st = { ...prev, enabled: true, heartbeat: now };
  try { await News.load(true); console.log('News events loaded:', News.ok()); } catch (e) { console.log('News not loaded:', e.message); }
  let g;
  try { g = await Data.snapshot({ forceCandles: true, sessions }); } catch (e) {
    console.log('Could not get prices:', e.message);
    st.check = { at: now, ok: false, why: 'could not reach OANDA' };
    const changed = now - (prev.heartbeat || 0) > 55 * 60e3 || prevCore !== core(st);
    if (!changed) st.heartbeat = prev.heartbeat || 0;
    writeState(st); out('changed', changed ? 1 : 0);
    return;
  }

  // ---- 1. look after an open trade: stop, target, or 4:50 PM close ----
  for (const [day, t] of Object.entries(st.days)) {
    if (t.status !== 'open') continue;
    const end = endOf(day);
    let candles = [];
    try { candles = await Data.candlesSince(t.lastCheck || t.openedAt); } catch {}
    for (const c of candles) {
      if (c.t + 300e3 <= (t.lastCheck || t.openedAt)) continue;
      if (c.t >= end) { t.exit = t.dir > 0 ? c.bc : c.ac; t.reason = 'session_end'; t.closedAt = end; break; }
      // deepest drawdown / best profit price while the trade was open (for the calendar)
      const adv = t.dir > 0 ? c.bl : c.ah, fav = t.dir > 0 ? c.bh : c.al;
      t.worst = t.worst == null ? adv : t.dir > 0 ? Math.min(t.worst, adv) : Math.max(t.worst, adv);
      t.best = t.best == null ? fav : t.dir > 0 ? Math.max(t.best, fav) : Math.min(t.best, fav);
      // if one 5-minute candle touches both, assume the stop (the cautious answer)
      if (t.dir > 0) { if (c.bl <= t.sl) { t.exit = t.sl; t.reason = 'stop'; } else if (c.bh >= t.tp) { t.exit = t.tp; t.reason = 'tp'; } }
      else { if (c.ah >= t.sl) { t.exit = t.sl; t.reason = 'stop'; } else if (c.al <= t.tp) { t.exit = t.tp; t.reason = 'tp'; } }
      if (t.exit != null) { t.closedAt = Math.min(c.t + 300e3, now); break; }
      t.lastCheck = c.t;
    }
    if (t.exit == null && now >= end) { t.exit = t.dir > 0 ? g.price.bid : g.price.ask; t.reason = 'session_end'; t.closedAt = now; }
    if (t.exit != null) {
      t.status = 'closed';
      t.exit = Math.round(t.exit * 100) / 100;
      t.result = Math.round((t.exit - t.entry) * t.dir * 100) / 100; // $ per unit
      console.log(`Closed ${day}: ${t.dir > 0 ? 'BUY' : 'SELL'} ${t.entry} → ${t.exit} (${t.reason})`);
    }
  }

  // ---- 2. maybe take a trade — only if it's valid. Up to 2 a day: the 2nd only after the 1st is
  //         closed (30 min cool-off), and after a losing 1st it needs a stronger setup ----
  const day = tradeDay(now);
  const busy = Object.values(st.days).some((t) => t.status === 'open');
  const first = st.days[day], second = st.days[day + '#2'];
  let slot = null, extra = 0;
  if (!first) slot = day;
  else if (first.status === 'closed' && !second && now - (first.closedAt || 0) >= 30 * 60e3) { slot = day + '#2'; extra = first.result < 0 ? 1 : 0; }
  if (slot && !busy) {
    const ctx = { tz: NY, title: '', sessions, projects: [], gold: () => g, riskPct: 1, news: News };
    const c = Brain.botCheck(ctx, { extra });
    st.check = { at: now, ok: c.ok, why: c.ok ? 'took the trade' : c.why };
    if (c.ok) {
      const entry = c.dir > 0 ? g.price.ask : g.price.bid;
      const risk = Math.abs(entry - c.sl);
      let tp = c.tp;
      if (Math.abs(tp - entry) < risk * 2) tp = entry + c.dir * risk * 2; // at least 1:2 after the spread
      const r2 = (n) => Math.round(n * 100) / 100;
      st.days[slot] = { id: `${day}-${c.dir > 0 ? 'B' : 'S'}${slot === day ? '' : '2'}`, status: 'open', dir: c.dir, entry: r2(entry), sl: r2(c.sl), tp: r2(tp), risk: r2(risk), rr: r2(Math.abs(tp - entry) / risk), why: c.why, openedAt: now, lastCheck: now };
      console.log(`Opened ${slot}: ${c.dir > 0 ? 'BUY' : 'SELL'} @ ${r2(entry)} SL ${r2(c.sl)} TP ${r2(tp)} — ${c.why}`);
    } else console.log(`No trade: ${c.why}`);
  }

  // keep the last 60 trading days
  const ks = Object.keys(st.days).sort(); while (ks.length > 60) delete st.days[ks.shift()];
  // only commit when something real changed, or hourly so the app knows the cloud trader is alive.
  // The heartbeat only moves forward when we actually save, otherwise the hourly save never comes due.
  const changed = prevCore !== core(st) || now - (prev.heartbeat || 0) > 55 * 60e3;
  if (!changed) st.heartbeat = prev.heartbeat || 0;
  writeState(st);
  out('changed', changed ? 1 : 0);
})().catch((e) => { console.error(e); process.exitCode = 1; });
