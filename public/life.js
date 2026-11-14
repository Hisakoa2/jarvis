// Life tools + JARVIS's own daily trade + everyday conversation.
// Everything is plain code and saved on this device only (localStorage "jarvis.life").
//   • JARVIS trader: at most one paper trade per trading day (6:15 PM → 4 PM New York entries), only when the
//     setup is valid, at least 40 units, better than 1:1. A cloud copy (tools/bot-runner.js) trades while the phone is off.
//   • partial closes, best/worst trade, trading challenges
//   • water, habits, moods, sleep, money, to-do list, countdowns, "remember this", timers, morning routine
//   • small talk: vibe, what to wear, books, movies, bedtime maths, food ideas, quotes
const Life = (() => {
  const KEY = 'jarvis.life';
  const blank = () => ({ water: {}, waterGoal: 8, waterRemind: false, lastWaterPop: 0, habits: [], todos: [], countdowns: [], memory: [], sleep: [], bedAt: null, money: [], budgets: {}, subs: [], subPops: {}, moods: {}, timers: [], challenges: {}, bot: { days: {} } });
  let st = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return { ...blank(), ...s, bot: { days: {}, ...(s.bot || {}) } }; } catch {} return blank(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} }
  // what was logged last, so "undo that" / "I didn't" / "scratch that" can take it back
  let lastAction = null;
  const did = (type, data) => { lastAction = { type, data, at: Date.now() }; };

  // ---- small helpers ----------------------------------------------------------------
  const B = () => Brain;
  const R = (html, say) => B().reply(html, say);
  const pick = (k, a) => B().pick('life-' + k, a);
  const esc = (s) => B().esc(s);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const usd = (n) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const sayUsd = (n) => `${Math.abs(n) >= 1 ? Math.round(Math.abs(n)) + ' dollars' : Math.round(Math.abs(n) * 100) + ' cents'}`;
  const dayKey = (ms, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ms));
  const NY = 'America/New_York';
  const nyFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY, hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' });
  function nyParts(ms) { const o = {}; for (const p of nyFmt.formatToParts(new Date(ms))) o[p.type] = p.value; return { h: +o.hour % 24, mi: +o.minute, wd: o.weekday }; }
  const clock = (ms, tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, couple: 2, few: 3, half: 0.5 };
  const num = (w) => (w == null ? null : /^\d/.test(w) ? parseFloat(w) : NUMW[w] != null ? NUMW[w] : null);
  const NUMRE = '(\\d+(?:\\.\\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|couple(?: of)?|few|half)';
  const me2you = (s) => s.replace(/\bmy\b/g, 'your').replace(/\bi am\b|\bi'm\b|\bim\b/g, 'you are').replace(/\bi\b/g, 'you').replace(/\bme\b/g, 'you').replace(/\bmine\b/g, 'yours');

  // Trading day = 6 PM New York → 5 PM New York next day. Key = the New York date it ends on.
  const tradeDay = (ms) => dayKey(ms + 6 * 3600e3, NY);

  // =====================================================================================
  // JARVIS TRADER — one paper trade a day, silent. You find out in the paper panel or by asking.
  // =====================================================================================
  // size so that hitting the stop loses no more than your max risk ($250 unless you change it in Settings)
  function botUnits(risk, maxRisk) {
    return Math.max(1, Math.floor((+maxRisk > 0 ? +maxRisk : 250) / Math.max(risk, 0.5)));
  }
  // Called on every price update while the app is open.
  // JARVIS only trades when botCheck() says the setup is valid — never just to fill the day.
  // When the cloud trader (GitHub, runs while your phone is off) is live, the cloud does the trading
  // and the app only mirrors it, so the same trade is never taken twice.
  let lastCheck = null;
  function botTick(ctx, g) {
    if (!g || !g.price || !g.price.tradeable || typeof Paper === 'undefined') return;
    const now = Date.now(), day = tradeDay(now), t = nyParts(now), mins = t.h * 60 + t.mi;
    const rec = st.bot.days[day];
    const open = Paper.positions().find((p) => p.bot);
    // 4:50 PM New York: the session is ending — JARVIS closes its own trade so every day stands alone
    if (open && mins >= 16 * 60 + 50 && mins < 17 * 60 && !cloud.live) {
      const h = Paper.closeOne(open.id, g.price.bid, g.price.ask, 'session_end');
      if (h) { const r0 = Object.values(st.bot.days).find((r) => r.id === open.id); if (r0) r0.closedBy = 'session end'; save(); }
      return;
    }
    if (cloud.live) return;          // the cloud trader is running — it takes the trade
    if (open) return;
    if (rec) return;                 // one trade a day — the strongest setup only
    const slot = day;
    const c = B().botCheck(ctx());
    lastCheck = { at: now, ...c };
    if (!c.ok) return;
    const units = botUnits(c.risk, ctx().maxRisk);
    const res = Paper.place({ side: c.dir, units, sl: c.sl, tp: c.tp, bid: g.price.bid, ask: g.price.ask, bot: true, note: c.why });
    const pos = res.position || res.order;
    st.bot.days[slot] = { id: pos.id, at: now, dir: c.dir, units, entry: pos.entry, sl: c.sl, tp: c.tp, rr: Math.round(c.rr * 100) / 100, why: c.why };
    trimBot(); save();
  }
  function trimBot() { const ks = Object.keys(st.bot.days).sort(); while (ks.length > 120) delete st.bot.days[ks.shift()]; }

  // ---- cloud trader --------------------------------------------------------------------
  // A copy of the same rules runs on GitHub every few minutes (tools/bot-runner.js), even with the
  // phone off. It writes its trades to a small public file; the app copies them into your paper account.
  const CLOUD_URL = 'https://raw.githubusercontent.com/Hisakoa2/jarvis/bot-data/bot/trades.json';
  const cloud = { live: false, at: 0, data: null };
  async function cloudSync(maxRisk) {
    if (typeof Paper === 'undefined') return [];
    let d;
    try {
      const r = await fetch(CLOUD_URL + '?t=' + Math.floor(Date.now() / 60e3), { cache: 'no-store' });
      if (!r.ok) return [];
      d = await r.json();
    } catch { return []; }
    if (!d || !d.days) return [];
    cloud.data = d; cloud.at = Date.now();
    cloud.live = !!(d.enabled && Date.now() - (d.heartbeat || 0) < 3 * 3600e3);
    const out = [];
    const hist = Paper.history();
    for (const day of Object.keys(d.days).sort()) {
      const c = d.days[day];
      if (!c || !c.status) continue;
      let r = st.bot.days[day];
      if (r && !r.cloud) continue;                       // the app already traded that day itself
      if (r && r.synced) continue;                       // finished and copied already
      const units = r ? r.units : botUnits(c.risk, maxRisk);
      if (!r) {
        if (c.status === 'open') {
          const pos = Paper.adopt({ side: c.dir, units, entry: c.entry, sl: c.sl, tp: c.tp, openedAt: c.openedAt, note: c.why, bot: true });
          r = st.bot.days[day] = { id: pos.id, at: c.openedAt, dir: c.dir, units, entry: c.entry, sl: c.sl, tp: c.tp, rr: c.rr, why: c.why, cloud: true, sid: c.id };
        } else {
          const h = Paper.record({ side: c.dir, units, entry: c.entry, exit: c.exit, sl: c.sl, tp: c.tp, reason: c.reason, openedAt: c.openedAt, closedAt: c.closedAt, bot: true, worst: c.worst, best: c.best });
          st.bot.days[day] = { id: h.id, at: c.openedAt, dir: c.dir, units, entry: c.entry, sl: c.sl, tp: c.tp, rr: c.rr, why: c.why, cloud: true, sid: c.id, synced: true };
          out.push(h);
        }
        continue;
      }
      if (c.status === 'closed') {
        const pos = Paper.positions().find((p) => p.id === r.id);
        if (pos) { const h = Paper.closeAt(pos.id, c.exit, c.reason, c.closedAt, { worst: c.worst, best: c.best }); if (h) out.push(h); }
        else if (!hist.some((h) => h.id === r.id)) { const h = Paper.record({ side: c.dir, units, entry: c.entry, exit: c.exit, sl: c.sl, tp: c.tp, reason: c.reason, openedAt: c.openedAt, closedAt: c.closedAt, bot: true, worst: c.worst, best: c.best }); r.id = h.id; out.push(h); }
        r.synced = true;
      }
    }
    trimBot(); save();
    return out;
  }
  // kept for the app's startup call: no more "made-up" catch-up trades — the cloud trader covers phone-off days
  async function botCatchUp(maxRisk) { return cloudSync(maxRisk); }

  const botHist = () => (typeof Paper === 'undefined' ? [] : Paper.history().filter((h) => h.bot));
  function botStatus(k) {
    const day = tradeDay(k.now), rec = st.bot.days[day], rec2 = st.bot.days[day + '#2'];
    const open = Paper.positions().find((p) => p.bot), ord = Paper.orders().find((o) => o.bot);
    const ids = [rec, rec2].filter(Boolean).map((r) => r.id);
    return { day, rec: rec2 && open && open.id === rec2.id ? rec2 : rec, rec2, open, ord, closed: botHist().filter((h) => ids.includes(h.id)) };
  }
  function botA(k) {
    const s = botStatus(k), side = (d) => (d > 0 ? 'buy' : 'sell');
    const g = k.g;
    if (s.open) {
      const px = g ? Paper.closePx(s.open, g.price.bid, g.price.ask) : s.open.entry, pl = Paper.pnlAt(s.open, px);
      return R(`My trade today${k.t}: <b>${side(s.open.side).toUpperCase()} ${s.open.units}</b> @ ${s.open.entry.toFixed(2)}, stop ${s.open.sl.toFixed(2)}, target ${s.open.tp.toFixed(2)}${s.rec ? ` (${s.rec.rr}:1)` : ''}. Right now <b class="${pl >= 0 ? 'up' : 'down'}">${usd(pl)}</b>. <span class="dim">Why: ${esc(s.rec ? s.rec.why : s.open.note || '')}.</span>`,
        `I'm in a ${side(s.open.side)} of ${s.open.units} from ${Math.round(s.open.entry)}${k.t}. Right now it's ${pl >= 0 ? 'up' : 'down'} ${sayUsd(pl)}. Stop at ${Math.round(s.open.sl)}, target ${Math.round(s.open.tp)}.`);
    }
    if (s.closed.length) {
      const pl = s.closed.reduce((a, h) => a + h.pl, 0), h = s.closed[s.closed.length - 1];
      const how = h.reason === 'tp' ? 'hit the target' : h.reason === 'stop' ? 'got stopped out' : h.reason === 'stop_profit' ? 'stopped in profit' : h.reason === 'session_end' ? 'closed at the end of the session' : 'was closed by you';
      const mood = pl > 0 ? pick('botw', ['Good day at the office.', 'Clean one.', 'I’ll take it.']) : pick('botl', ['Not every day is a winner.', 'Part of the game — risk was controlled.', 'It happens. Back at it next session.']);
      return R(`Today's trade${k.t}: <b>${side(h.side).toUpperCase()} ${h.units}</b> @ ${h.entry.toFixed(2)} → ${h.exit.toFixed(2)}, it ${how}. Result: <b class="${pl >= 0 ? 'up' : 'down'}">${usd(pl)}</b> — added to your paper P&L. ${mood}`,
        `Today I took a ${side(h.side)} of ${h.units} from ${Math.round(h.entry)}, and it ${how}. ${pl >= 0 ? 'Made' : 'Lost'} ${sayUsd(pl)}${k.t}. ${mood}`);
    }
    if (s.ord) return R(`I have a pending ${side(s.ord.side)} order at ${s.ord.entry.toFixed(2)}${k.t}, waiting to fill.`);
    const cl = cloud.data && cloud.data.check, chk = cloud.live && cl ? cl : lastCheck;
    const reason = chk && !chk.ok && chk.why ? ` Last check${chk.at ? ` (${clock(chk.at, k.tz)})` : ''}: ${chk.why}.` : '';
    const where = cloud.live ? ' My cloud copy is watching the market even when your phone is off.' : '';
    if (k.market.state === 'weekend' || !k.market.open) return R(`Market's closed${k.t}, so no trade right now. When it reopens I look for one valid setup per trading day — from 6:15 PM to 4 PM New York.${where}`);
    return R(`No trade yet today${k.t}. I only take a trade when it's actually valid — bias pointing one way, the setup score agreeing, no big news about to hit, and a target at least twice the stop (1:2). One trade a day, only the strongest setup, never more than $${Math.round(k.maxRisk || 250)} at risk. If nothing qualifies, I sit out. That's a win too.<span class="dim">${esc(reason)}${where}</span>`,
      `No trade yet today${k.t}. I only get in when the setup is actually valid, and if nothing qualifies, I sit out.${reason}`);
  }
  function botStatsA(k) {
    const H = botHist().filter((h) => h.reason !== 'partial');
    if (!H.length) return R(`I haven't finished a trade yet${k.t}. My first one will show up in the paper panel with a JARVIS tag.`);
    const w = H.filter((h) => h.pl > 0).length, tot = H.reduce((a, h) => a + h.pl, 0);
    const last = H.slice(0, 5).map((h) => `<li>${new Date(h.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${h.side > 0 ? 'BUY' : 'SELL'} ${h.units} · <span class="${h.pl >= 0 ? 'up' : 'down'}">${usd(h.pl)}</span></li>`).join('');
    return R(`My record${k.t}: <b>${H.length}</b> trades, <b>${w}</b> wins (${Math.round(w / H.length * 100)}%), total <b class="${tot >= 0 ? 'up' : 'down'}">${usd(tot)}</b>.<ul>${last}</ul>`,
      `I've taken ${H.length} trades${k.t}, ${w} winners, ${tot >= 0 ? 'up' : 'down'} ${sayUsd(tot)} in total.`);
  }

  // =====================================================================================
  // TRADING: partials, best/worst, challenges
  // =====================================================================================
  function partialA(k, t) {
    const g = k.g, P = Paper;
    if (!g) return R(`I need a live price first${k.t}.`);
    let pos = P.positions().filter((p) => !p.bot);
    if (/\b(your|jarvis)\b/.test(t)) pos = P.positions().filter((p) => p.bot);
    if (/\bsells?|shorts?\b/.test(t)) pos = pos.filter((p) => p.side < 0);
    if (/\bbuys?|longs?\b/.test(t)) pos = pos.filter((p) => p.side > 0);
    if (!pos.length) pos = P.positions();
    if (!pos.length) return R(`There's no open trade to take partials from${k.t}.`);
    const p = pos[pos.length - 1];
    let units = null;
    const m = t.match(new RegExp('\\b' + NUMRE + '\\s*(contracts?|units?|lots?|oz|ounces?|percent|%)'));
    if (m) { const n = num(m[1].replace(/ of$/, '')); units = /lot/.test(m[2]) ? n * 100 : /percent|%/.test(m[2]) ? p.units * n / 100 : n; }
    else if (/\bhalf\b/.test(t)) units = p.units / 2;
    else if (/\bthird\b/.test(t)) units = p.units / 3;
    else if (/\bquarter\b/.test(t)) units = p.units / 4;
    else { const m2 = t.match(/\b(\d{1,4})\b/); if (m2) units = +m2[1]; }
    if (!units) units = p.units / 2;
    units = Math.round(units);
    if (units >= p.units) {
      const h = P.closeOne(p.id, g.price.bid, g.price.ask);
      return R(`That's the whole position${k.t}, so I closed it: ${h.units} @ ${h.exit.toFixed(2)}, <b class="${h.pl >= 0 ? 'up' : 'down'}">${usd(h.pl)}</b>.`);
    }
    const h = P.partial(p.id, units, g.price.bid, g.price.ask);
    if (!h) return R(`Couldn't take that partial${k.t}.`);
    return R(`Partials taken${k.t}: closed <b>${h.units}</b> of your ${p.side > 0 ? 'buy' : 'sell'} @ ${h.exit.toFixed(2)} for <b class="${h.pl >= 0 ? 'up' : 'down'}">${usd(h.pl)}</b>. <b>${h.left}</b> still running. <span class="dim">Stop stays where it is — move it yourself if you want.</span>`,
      `Done${k.t}. Closed ${h.units}, ${h.pl >= 0 ? 'locking in' : 'taking a loss of'} ${sayUsd(h.pl)}. ${h.left} still running.`);
  }

  function rangeOf(t, now, tz) {
    if (/\btoday\b/.test(t)) return { from: startOf(now, tz, 0), name: 'today' };
    if (/\bweek\b/.test(t)) return { from: now - 7 * 864e5, name: 'in the last 7 days' };
    if (/\bmonth\b/.test(t)) return { from: now - 30 * 864e5, name: 'in the last 30 days' };
    return { from: 0, name: 'so far' };
  }
  function startOf(now, tz, back) { const p = Sessions.parts(new Date(now), tz); return now - ((p.h * 60 + p.mi) * 60e3) - new Date(now).getSeconds() * 1000 - back * 864e5; }
  function bestWorstA(k, t) {
    const r = rangeOf(t, k.now, k.tz);
    let H = Paper.history().filter((h) => h.closedAt >= r.from);
    if (/\b(your|jarvis)\b/.test(t)) H = H.filter((h) => h.bot);
    if (!H.length) return R(`No closed trades ${r.name}${k.t}.`);
    const best = H.reduce((a, h) => (h.pl > a.pl ? h : a)), worst = H.reduce((a, h) => (h.pl < a.pl ? h : a));
    const line = (h) => `${h.side > 0 ? 'BUY' : 'SELL'} ${h.units} @ ${h.entry.toFixed(2)} → ${h.exit.toFixed(2)} <span class="${h.pl >= 0 ? 'up' : 'down'}">${usd(h.pl)}</span> <span class="dim">(${new Date(h.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${h.bot ? ', JARVIS' : ''})</span>`;
    const wantW = /\b(worst|biggest loss|biggest loser|worst loss)\b/.test(t) && !/\bbest\b/.test(t);
    const wantB = /\b(best|biggest win|biggest winner)\b/.test(t) && !/\bworst\b/.test(t);
    if (wantB) return R(`Best trade ${r.name}${k.t}: ${line(best)}.`, `Your best trade ${r.name} made ${sayUsd(best.pl)}${k.t}.`);
    if (wantW) return R(`Worst trade ${r.name}${k.t}: ${line(worst)}.${worst.pl < 0 ? ' <span class="dim">Every trader has these — what matters is the stop held.</span>' : ''}`, `Your worst trade ${r.name} was ${worst.pl < 0 ? 'a loss of' : 'only'} ${sayUsd(worst.pl)}${k.t}.`);
    return R(`${cap(r.name)}${k.t}:<br>🏆 Best: ${line(best)}<br>📉 Worst: ${line(worst)}`, `Best trade ${r.name}: ${sayUsd(best.pl)}. Worst: ${worst.pl < 0 ? 'minus ' : ''}${sayUsd(worst.pl)}.`);
  }

  const TCHAL = [
    { text: 'Take at most 2 trades today — both with the bias.', max: 2 },
    { text: 'Take exactly 1 trade today. Make it your best one.', max: 1, min: 1 },
    { text: 'Take 3 trades today, every one with a stop and a target set before you enter.', min: 3, max: 3 },
    { text: 'Only trade during prime time (3 AM–11:30 AM New York). Max 2 trades.', max: 2 },
    { text: 'No trades in the first 15 minutes of New York. Max 2 trades.', max: 2 },
    { text: 'Take partials on every winner today.', max: 3 },
    { text: 'Every trade today must be at least 1:2 risk to reward.', max: 3 },
    { text: 'Stop after 2 losses — no matter what.', max: 4 },
    { text: 'Take 2 trades today and journal why you took each one (say “remember …”).', min: 2, max: 2 },
    { text: 'Hit +$500 on paper today with no more than 3 trades.', max: 3, goal: 500 },
  ];
  function myTradesToday(k) { const from = startOf(k.now, k.tz, 0); return Paper.history().filter((h) => !h.bot && h.reason !== 'partial' && h.openedAt >= from); }
  function tradeChallengeA(k, t) {
    const day = dayKey(k.now, k.tz);
    let c = st.challenges[day];
    const askStatus = /\b(how am i|how'?s|how is|status|progress|doing|did i)\b/.test(t) && c;
    if (!c || /\b(new|another|different|give me|harder)\b/.test(t) && !askStatus) {
      const prev = c ? c.i : -1;
      let i; do { i = Math.floor(Math.random() * TCHAL.length); } while (i === prev);
      c = st.challenges[day] = { i };
      const ks = Object.keys(st.challenges).sort(); while (ks.length > 30) delete st.challenges[ks.shift()];
      save();
      const ch = TCHAL[i];
      return R(`Today's trading challenge${k.t}: <b>${ch.text}</b> <span class="dim">Ask “how am I doing on the challenge” any time.</span>`, `Your challenge for today${k.t}: ${ch.text}`);
    }
    const ch = TCHAL[c.i], H = myTradesToday(k), n = H.length, pl = H.reduce((a, h) => a + h.pl, 0);
    let verdict;
    if (ch.max != null && n > ch.max) verdict = `<span class="down">Over the limit</span> — ${n} trades (max ${ch.max}). Time to step away.`;
    else if (ch.goal) verdict = pl >= ch.goal ? `<span class="up">Done!</span> ${usd(pl)} with ${n} trades.` : `${usd(pl)} so far, ${n} of ${ch.max} trades used.`;
    else if (ch.min && n >= ch.min) verdict = `<span class="up">Done!</span> ${n} trades taken, ${usd(pl)}.`;
    else verdict = `${n} trade${n === 1 ? '' : 's'} so far today (${usd(pl)}).${ch.max ? ` ${Math.max(0, ch.max - n)} left.` : ''}`;
    return R(`Challenge: <b>${ch.text}</b><br>${verdict}`, `${ch.text} ${verdict.replace(/<[^>]+>/g, '')}`);
  }

  // =====================================================================================
  // WATER
  // =====================================================================================
  function waterA(k, t) {
    const day = dayKey(k.now, k.tz);
    // the opposite: "remove a glass", "take off 2 glasses", "I didn't drink that", "reset my water"
    if (/\b(reset|clear|zero out|start over)\b.*\bwater\b|\bwater\b.*\b(reset|clear)\b/.test(t)) { st.water[day] = 0; save(); return R(`Water reset to <b>0</b> for today${k.t}.`); }
    if (/\b(remove|undo|delete|take (?:off|away|back)|subtract|minus|less|didnt drink|did not drink|scratch|wrong|too many|mistake)\b/.test(t) && !/\bremind/.test(t)) {
      const nm = t.match(new RegExp('\\b' + NUMRE + '\\s+(?:glass(?:es)?|cups?|bottles?)'));
      let n = nm ? num(nm[1]) || 1 : 1;
      if (/bottle/.test(t)) n *= 2;
      const before = st.water[day] || 0;
      st.water[day] = Math.max(0, before - n); save(); did('waterRemove', { day, n: before - st.water[day] });
      return R(`Took off ${n} glass${n === 1 ? '' : 'es'}${k.t}. 💧 Now <b>${st.water[day]}</b> of ${st.waterGoal} today.`, `Done${k.t}. That's ${st.water[day]} glasses today.`);
    }
    const g = t.match(/\b(?:goal|target)\b.*?\b(\d{1,2})\b/);
    if (g && /\b(set|change|make|update)\b/.test(t)) { st.waterGoal = +g[1]; save(); return R(`Water goal set to <b>${st.waterGoal} glasses</b> a day${k.t}.`); }
    if (/\b(turn on|enable|start)\b.*\bwater reminders?\b|\bwater reminders? on\b|\bremind me to drink (?:more )?water\b(?!.*\b(in|at)\b)/.test(t)) { st.waterRemind = true; save(); return R(`Water reminders on${k.t}. I'll pop up every 2 hours between 9 AM and 9 PM while the app is open.`, `Water reminders are on${k.t}. Every two hours during the day.`); }
    if (/\b(turn off|disable|stop)\b.*\bwater reminders?\b|\bwater reminders? off\b/.test(t)) { st.waterRemind = false; save(); return R(`Water reminders off${k.t}.`); }
    const verb = /\b(drank|drink|drinking|had|have had|add|log|logged|finished|chugged|downed|sipped|put down|record|count|track|mark|another|one more)\b/.test(t) && !/\b(remove|take off|take away|subtract|minus|delete|undo)\b/.test(t);
    const unitM = t.match(new RegExp('(?:\\b' + NUMRE + '\\s+)?(?:(?:more|full|big|small|whole|large)\\s+)?(glass(?:es)?|cups?|bottles?|ounces?|oz|liters?|litres?|gallons?)\\b'));
    const question = /\b(how much|how many|did i|have i)\b/.test(t) && !/\b(log|add)\b/.test(t);
    if (verb && (/\bwater\b/.test(t) || unitM) && !question && !/\b(coffee|tea|soda|beer|wine|juice|milk)\b/.test(t)) {
      let n = unitM && unitM[1] ? num(unitM[1].replace(/ of$/, '')) || 1 : 1;
      const u = (unitM && unitM[2]) || 'glass';
      if (/bottle/.test(u)) n *= 2; else if (/ounce|oz/.test(u)) n = n / 8; else if (/lit/.test(u)) n *= 4;
      n = Math.round(n * 2) / 2;
      st.water[day] = (st.water[day] || 0) + n; did('water', { day, n });
      const ks = Object.keys(st.water).sort(); while (ks.length > 60) delete st.water[ks.shift()];
      save();
      const have = st.water[day], left = st.waterGoal - have;
      const cheer = left <= 0 ? pick('wd', ['Goal hit — nice work.', 'That’s your goal for today. Well done.']) : pick('wl', [`${left} more to go.`, `${left} to hit your goal.`]);
      return R(`Logged${k.t}. 💧 <b>${have}</b> of ${st.waterGoal} glasses today. ${cheer}`, `Logged${k.t}. That's ${have} glass${have === 1 ? '' : 'es'} today. ${cheer}`);
    }
    const have = st.water[day] || 0;
    if (/\b(yesterday)\b/.test(t)) { const y = st.water[dayKey(k.now - 864e5, k.tz)] || 0; return R(`Yesterday you had <b>${y}</b> glass${y === 1 ? '' : 'es'} of water${k.t}.`); }
    const tip = have === 0 ? 'Nothing logged yet — grab a glass. Say “I drank a glass of water” to log it.' : have >= st.waterGoal ? 'Goal hit.' : `${st.waterGoal - have} more to hit your goal.`;
    return R(`💧 Today: <b>${have}</b> of ${st.waterGoal} glasses${k.t}. ${tip}`, `You've had ${have} glass${have === 1 ? '' : 'es'} of water today${k.t}. ${tip.replace(/ Say.*$/, '')}`);
  }

  // =====================================================================================
  // HABITS
  // =====================================================================================
  const HABIT_WORDS = { workout: ['work out', 'worked out', 'workout', 'gym', 'exercise', 'exercised', 'lifted', 'trained'], read: ['read', 'reading'], meditate: ['meditate', 'meditated', 'meditation'], journal: ['journal', 'journaled'], walk: ['walk', 'walked'], run: ['run', 'ran', 'running'], stretch: ['stretch', 'stretched'], pray: ['pray', 'prayed'], study: ['study', 'studied'] };
  function habitFind(t) {
    return st.habits.find((h) => t.includes(h.name) || (HABIT_WORDS[h.key] || []).some((w) => new RegExp('\\b' + w + '\\b').test(t)));
  }
  function streak(h, k) {
    let n = 0, d = k.now;
    if (!h.days.includes(dayKey(d, k.tz))) d -= 864e5; // today not done yet doesn't break it
    while (h.days.includes(dayKey(d, k.tz))) { n++; d -= 864e5; }
    return n;
  }
  // "of me working out today" -> "workout", "to read 10 pages every day" -> "read 10 pages"
  function habitName(raw) {
    let n = ' ' + raw.toLowerCase() + ' ';
    for (let i = 0; i < 2; i++) n = n.replace(/ (?:of|to|for|called|named|that|where|me|my|i|im|i am|go|going|start|starting|begin|beginning|doing|do|a|an|the) /g, ' ');
    for (let i = 0; i < 2; i++) n = n.replace(/ (?:today|tonight|every ?day|everyday|daily|each day|every morning|every night|please|as a habit|habit|now|from now on|again) /g, ' ');
    n = n.trim().replace(/\s+/g, ' ');
    const map = [[/^(work(ing)? ?out|worked out|exercis\w*|gym|the gym|lifting|lift)$/, 'workout'], [/^(read(ing)?)$/, 'read'], [/^(meditat\w*)$/, 'meditate'], [/^(journal\w*)$/, 'journal'], [/^(walk(ing)?)$/, 'walk'], [/^(run(ning)?)$/, 'run'], [/^(stretch\w*)$/, 'stretch'], [/^(pray\w*)$/, 'pray'], [/^(study\w*)$/, 'study'], [/^(drink(ing)? water|water)$/, 'drink water']];
    for (const [re, to] of map) if (re.test(n)) return to;
    return n.replace(/^working out\b/, 'workout');
  }
  function habitA(k, t) {
    const day = dayKey(k.now, k.tz);
    const addM = t.match(/\b(?:add|new|start|track|create|make|set up|give me)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+|daily\s+)?habit(?:\s+(?:called|named|of|to|for|where|that))?\s+(.+)$/) || t.match(/\b(?:add|make)\s+(.+?)\s+(?:as\s+)?(?:a\s+)?(?:new\s+|daily\s+)?habit\b/) || t.match(/\b(?:track|start tracking)\s+(?:my\s+)?(.+?)(?:\s+as a habit|\s+habit)?$/);
    if (addM && /\bhabit|track/.test(t)) {
      const name = habitName(addM[1]);
      if (!name) return R(`What habit should I track${k.t}?`);
      if (st.habits.some((h) => h.name === name)) return R(`I'm already tracking <b>${esc(name)}</b>${k.t}.`);
      const key = Object.keys(HABIT_WORDS).find((x) => HABIT_WORDS[x].some((w) => name.includes(w))) || null;
      st.habits.push({ name, key, days: [] }); save();
      return R(`Tracking a new habit${k.t}: <b>${esc(name)}</b>. Tell me when you do it — like “I did ${esc(name)} today”.`, `New habit: ${name}. Tell me when you do it${k.t}.`);
    }
    const rm = t.match(/\b(?:remove|delete|stop tracking|drop)\s+(?:the\s+|my\s+)?(?:habit\s+)?(.+?)(?:\s+habit)?$/);
    if (rm && /\bhabit|tracking\b/.test(t)) {
      const h = habitFind(rm[1]) || st.habits.find((x) => x.name.includes(rm[1]));
      if (!h) return R(`I don't see that habit${k.t}.`);
      st.habits = st.habits.filter((x) => x !== h); save();
      return R(`Stopped tracking <b>${esc(h.name)}</b>${k.t}.`);
    }
    const h = habitFind(t);
    if (h && /\b(didnt|did not|havent|have not|hasnt|not done|uncheck|unmark|undo|skip|skipped|missed|never did|forgot to|wasnt able to|couldnt)\b/.test(t)) {
      const was = h.days.includes(day);
      h.days = h.days.filter((d) => d !== day); save();
      return R(was ? `Unchecked <b>${esc(h.name)}</b> for today${k.t}. No worries — there's still time.` : `<b>${esc(cap(h.name))}</b> isn't marked for today${k.t}. Still time to get it in.`, was ? `Unchecked ${h.name} for today${k.t}.` : `${h.name} isn't done yet today${k.t}. Still time.`);
    }
    if (h && !/\b(my habits|habits|streaks?|how many|did i|have i)\b/.test(t)) {
      if (!h.days.includes(day)) { h.days.push(day); h.days = h.days.slice(-400); save(); did('habit', { name: h.name, day }); }
      const s = streak(h, k);
      return R(`✅ <b>${esc(cap(h.name))}</b> done for today${k.t}. Streak: <b>${s} day${s === 1 ? '' : 's'}</b>.${s >= 7 ? ' 🔥 Keep it rolling.' : ''}`, `Nice${k.t}. ${h.name} is done for today. That's a ${s} day streak.`);
    }
    if (!st.habits.length) return R(`No habits yet${k.t}. Say “add habit reading” or “track workout as a habit”.`);
    const rows = st.habits.map((x) => `<li>${x.days.includes(day) ? '✅' : '⬜'} <b>${esc(cap(x.name))}</b> <span class="dim">— ${streak(x, k)} day streak</span></li>`).join('');
    const left = st.habits.filter((x) => !x.days.includes(day));
    return R(`Your habits${k.t}:<ul>${rows}</ul>${left.length ? `Still to do today: ${left.map((x) => esc(x.name)).join(', ')}.` : 'All done today. 💪'}`,
      `${st.habits.length - left.length} of ${st.habits.length} habits done today${k.t}.${left.length ? ' Still to do: ' + left.map((x) => x.name).join(', ') + '.' : ' All done.'}`);
  }

  // A longer message about your day: reflect what you said back, then always end on something positive.
  function moodLong(k, M, day) {
    const v = Math.max(1, Math.min(5, Math.round(3 + M.score * 0.8)));
    st.moods[day] = { v, w: M.hits.slice(0, 3).join(', '), at: k.now };
    const ks = Object.keys(st.moods).sort(); while (ks.length > 90) delete st.moods[ks.shift()];
    save();
    const TIP = {
      trading: v >= 4 ? 'Stack another good session the same way — same rules, same patience.' : "One rough session doesn't define you. Your rules are still good, and tomorrow is a fresh chart.",
      work: v >= 4 ? 'Sounds like work went your way. Enjoy that.' : 'Work was a lot — you got through it, and that counts.',
      sleep: v >= 4 ? 'Good rest makes everything easier.' : 'An early night tonight will do wonders. Ask me what time to go to bed.',
      body: v >= 4 ? 'Your body will thank you for that.' : 'Take it easy on yourself — rest is part of getting stronger.',
      people: v >= 4 ? 'Good people make good days.' : 'People stuff is heavy. Talking to someone you trust helps.',
      money: v >= 4 ? 'Money moving the right way — nice.' : "Money stress is real, but it's fixable one step at a time. You can track spending with me.",
    };
    const tips = M.topics.map((x) => TIP[x]).filter(Boolean).slice(0, 2);
    let open;
    if (v >= 4) open = pick('ml-g', [`Love hearing that${k.t}.`, `That's a good day${k.t}.`, `Sounds like things are going your way${k.t}.`]);
    else if (v === 3) open = pick('ml-o', [`Thanks for telling me${k.t}. Sounds like a mixed day.`, `Got it${k.t} — some ups, some downs.`]);
    else if (M.words < 7) open = pick('ml-s', [`Thanks for being honest${k.t}.`, `Fair enough${k.t} — not every day is a great one.`]);
    else open = pick('ml-b', [`Thanks for telling me all that${k.t}. That's a lot to carry.`, `I hear you${k.t}. That sounds like a tough one.`, `Appreciate you sharing that${k.t}.`]);
    const close = v >= 4 ? pick('ml-gc', ['Keep that energy going.', 'Ride the momentum.', 'More days like this.']) : pick('ml-bc', ["You've handled harder days than this — and tomorrow's a reset.", "You're still standing, and that's the win today.", "Small steps. A glass of water, a short walk, and a good night's sleep go a long way."]);
    const line = [open, ...tips, close].join(' ');
    return R(`${line} <span class="dim">(checked in · picked up: ${esc(M.hits.slice(0, 4).join(', '))})</span>`, line);
  }

  // =====================================================================================
  // MOODS / CHECK-IN (always positive)
  // =====================================================================================
  const MOODS = { great: 5, amazing: 5, awesome: 5, fantastic: 5, good: 4, happy: 4, fine: 3, okay: 3, ok: 3, alright: 3, meh: 3, tired: 2, exhausted: 2, stressed: 2, anxious: 2, sad: 2, down: 2, frustrated: 2, angry: 2, mad: 2, bored: 3, sick: 2, lazy: 2, motivated: 5, focused: 5, excited: 5, nervous: 2 };
  function moodA(k, t) {
    const day = dayKey(k.now, k.tz);
    if (/\b(how have i been|my moods?|mood history|how was my week mood|check ?ins?)\b/.test(t) && !/\bi(?:'m| am| feel)\b/.test(t)) {
      const days = Object.keys(st.moods).sort().slice(-7);
      if (!days.length) return R(`No check-ins yet${k.t}. Just tell me how you feel — “I feel great” or “I'm tired”.`);
      const avg = days.reduce((a, d) => a + st.moods[d].v, 0) / days.length;
      const face = (v) => (v >= 4.5 ? '😄' : v >= 3.5 ? '🙂' : v >= 2.5 ? '😐' : '😴');
      return R(`Last ${days.length} check-ins${k.t}: ${days.map((d) => `${face(st.moods[d].v)} <span class="dim">${d.slice(5)}</span>`).join(' ')}<br>${avg >= 3.5 ? 'Mostly good days. Love to see it.' : 'A few rough ones in there — that\'s normal. Sleep, water and a walk go a long way.'}`,
        avg >= 3.5 ? `Mostly good days lately${k.t}.` : `A few rough days lately${k.t}. Sleep, water and a walk help a lot.`);
    }
    if (/^(?:daily )?check ?in$|^let'?s check in$|\bcheck in with me\b/.test(t)) return R(`How are you feeling today${k.t}? Say something like “I feel great”, “I'm okay” or “I'm tired”.`);
    // read the whole message: every feeling word counts, "not"/"never" flip the next few words
    const M = typeof Lex !== 'undefined' ? Lex.mood(t) : null;
    if (M && M.hits.length && (M.hits.length >= 2 || M.words >= 7)) return moodLong(k, M, day);
    const w = Object.keys(MOODS).find((m) => new RegExp('\\b' + m + '\\b').test(t) && !new RegExp('\\b(not|never|dont|isnt|wasnt)\\s+(?:\\w+\\s+)?' + m + '\\b').test(t));
    if (!w) return M && M.hits.length ? moodLong(k, M, day) : null;
    const v = MOODS[w];
    st.moods[day] = { v, w, at: k.now };
    const ks = Object.keys(st.moods).sort(); while (ks.length > 90) delete st.moods[ks.shift()];
    save();
    let line;
    if (v >= 4) line = pick('mg', [`Love that${k.t}. Let's make the most of it.`, `That's what I like to hear${k.t}.`, `Great energy${k.t}. Ride it — but stick to the plan if you trade.`]);
    else if (v === 3) line = pick('mo', [`Fair enough${k.t}. A glass of water and a short walk can turn an okay day into a good one.`, `Okay is a fine place to start${k.t}. Let's build on it.`]);
    else if (/tired|exhausted|lazy/.test(w)) line = pick('mt', [`Rest is part of the plan${k.t}. Maybe an early night — ask me what time to go to bed.`, `Go easy today${k.t}. A tired trader should trade smaller, or not at all.`]);
    else line = pick('mb', [`Thanks for telling me${k.t}. Tough moments pass — take a breather, get some water, and step away from the charts if you need to.`, `I hear you${k.t}. One small win today is enough. Want a quick workout or a walk idea?`, `Hang in there${k.t}. You've handled harder days than this.`]);
    return R(`${line} <span class="dim">(checked in: ${w})</span>`, line);
  }

  // =====================================================================================
  // SLEEP
  // =====================================================================================
  function parseClock(s) {
    const m = s.match(/\b(\d{1,2})(?:[: ](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/) || s.match(/\b(noon|midnight)\b/);
    if (!m) return null;
    if (m[1] === 'noon') return { h: 12, mi: 0 }; if (m[1] === 'midnight') return { h: 0, mi: 0 };
    let h = +m[1]; const mi = m[2] ? +m[2] : 0, ap = m[3] ? m[3][0] : null;
    if (h > 23) return null;
    if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0;
    return { h, mi, ap };
  }
  const fmtHM = (h, mi) => { h = ((h % 24) + 24) % 24; return `${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  function bedtimeA(k, t) {
    const m = t.match(/\b(?:wake(?: up)?|woke|get up|be up|be awake|up by|up at|alarm(?: for)?|out of bed)\b.*?\b(?:at|by|around|for)?\s*(\d{1,2}(?:[: ]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?|noon)/) || t.match(/\b(?:at|by)\s+(\d{1,2}(?:[: ]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/);
    let w = m ? parseClock(m[1]) : null;
    if (w && !w.ap && w.h >= 1 && w.h <= 11 && /\bwake|get up\b/.test(t)) { /* assume morning */ }
    if (!w) { const avg = sleepAvg(k); w = avg ? avg.wake : { h: 7, mi: 0 }; }
    const wakeMin = w.h * 60 + w.mi;
    const opts = [5, 6].map((c) => { const b = wakeMin - c * 90 - 15; return { c, hrs: c * 1.5, t: fmtHM(Math.floor(((b % 1440) + 1440) % 1440 / 60), ((b % 60) + 60) % 60) }; });
    return R(`To wake up at <b>${fmtHM(w.h, w.mi)}</b>${k.t}, aim to be in bed by <b>${opts[0].t}</b> (${opts[0].hrs} hours — 5 full sleep cycles). Want extra rest? <b>${opts[1].t}</b> gives you ${opts[1].hrs} hours. <span class="dim">Includes ~15 minutes to fall asleep. Waking at the end of a 90-minute cycle feels less groggy.</span>`,
      `To wake up at ${fmtHM(w.h, w.mi)}, go to bed by ${opts[0].t}${k.t}. That's ${opts[0].hrs} hours. For extra rest, ${opts[1].t} gives you ${opts[1].hrs}.`);
  }
  function sleepAvg(k) {
    const S = st.sleep.slice(-7);
    if (!S.length) return null;
    const hrs = S.reduce((a, s) => a + (s.wake - s.bed), 0) / S.length / 3600e3;
    const wm = S.reduce((a, s) => { const p = Sessions.parts(new Date(s.wake), k.tz); return a + p.h * 60 + p.mi; }, 0) / S.length;
    return { hrs, n: S.length, wake: { h: Math.floor(wm / 60), mi: Math.round(wm % 60) } };
  }
  function sleepA(k, t) {
    // "I slept from 11 to 7" / "I got 7 hours of sleep"
    const span = t.match(/\bslept\b.*?\bfrom\s+(\S+(?:\s*[ap]\.?m\.?)?)\s+(?:to|until|till)\s+(\S+(?:\s*[ap]\.?m\.?)?)/);
    const hrsM = t.match(new RegExp('\\b(?:slept|got|had)\\s+(?:about\\s+|like\\s+|around\\s+)?' + NUMRE + '\\s+hours?'));
    if (span || hrsM) {
      let hrs;
      if (span) { const a = parseClock(span[1]), b = parseClock(span[2]); if (!a || !b) return R(`What times did you sleep${k.t}?`); let am = a.h * 60 + a.mi, bm = b.h * 60 + b.mi; if (!a.ap && a.h < 12 && a.h >= 7) am += 720; hrs = ((bm - am + 1440) % 1440) / 60; }
      else hrs = num(hrsM[1].replace(/ of$/, ''));
      const wake = k.now, bed = wake - hrs * 3600e3;
      st.sleep.push({ bed, wake }); st.sleep = st.sleep.slice(-60); st.bedAt = null; save();
      return R(`Logged <b>${Math.round(hrs * 10) / 10} hours</b> of sleep${k.t}. ${hrs >= 7 ? 'Solid.' : hrs >= 6 ? 'Not bad — aim for 7+.' : 'That\'s short. Go easy today, and trade smaller if you trade.'}`);
    }
    if (/\b(going to bed|going to sleep|heading to bed|off to bed|bed time|bedtime now|hitting the hay|about to sleep|time for bed|good ?night|(?:about to|gonna|going to|time to|ready to|bout to) (?:go to |head to )?(?:bed|sleep)|hit(?:ting)? the (?:sack|hay)|calling it a night|out for the night)\b/.test(t) && !/\bwhat time|when should\b/.test(t)) {
      st.bedAt = k.now; save();
      const rems = (k.reminders ? k.reminders.all() : []).filter((r) => r.due && r.due - k.now < 14 * 3600e3);
      const line = pick('gn', [`Good night${k.t}. Sleep well.`, `Rest up${k.t}. I'll keep an eye on gold.`, `Night${k.t}. Big day tomorrow.`]);
      return R(`${line} <span class="dim">Bedtime logged at ${clock(k.now, k.tz)} — tell me “I'm up” when you wake.${rems.length ? ` Tomorrow: ${rems.map((r) => esc(r.text)).join(', ')}.` : ''}</span>`, line);
    }
    if (/\b(i'?m up|i am up|just woke up|i woke up|woke up|i'?m awake|good morning)\b/.test(t) && !/\bwhat time|should\b/.test(t)) {
      if (st.bedAt && k.now - st.bedAt < 16 * 3600e3 && k.now - st.bedAt > 2 * 3600e3) {
        const hrs = (k.now - st.bedAt) / 3600e3;
        st.sleep.push({ bed: st.bedAt, wake: k.now }); st.sleep = st.sleep.slice(-60); st.bedAt = null; save();
        return R(`${k.hour < 12 ? "Morning" : k.hour < 17 ? "Good afternoon" : "Hey"}${k.t}! You slept about <b>${Math.round(hrs * 10) / 10} hours</b>. ${hrs >= 7 ? 'Nicely done.' : 'A little short — keep that in mind today.'} Say “morning routine” for your rundown.`, `Good morning${k.t}. You slept about ${Math.round(hrs)} hours. Say morning routine for your rundown.`);
      }
      return null;
    }
    const a = sleepAvg(k);
    if (!a) return R(`No sleep logged yet${k.t}. Say “going to bed” at night and “I'm up” in the morning, or “I slept 7 hours”.`);
    return R(`Last ${a.n} nights${k.t}: about <b>${Math.round(a.hrs * 10) / 10} hours</b> a night, usually up around ${fmtHM(a.wake.h, a.wake.mi)}. ${a.hrs >= 7 ? 'Good rhythm.' : 'Try to get closer to 7–8 hours.'}`);
  }

  // =====================================================================================
  // MONEY
  // =====================================================================================
  // ---- money tracker ------------------------------------------------------------------
  // "I spent 20 on food", "dropped 40 on dinner", "paid 15 for gas", "bought shoes for 60", "$12 coffee"
  const CATS = {
    food: 'food|lunch|dinner|breakfast|snack|snacks|groceries|grocery|restaurant|pizza|burger|burgers|tacos|wings|chipotle|mcdonalds|starbucks|coffee|drink|drinks|doordash|uber eats|ubereats|takeout|meal|eat|eating',
    gas: 'gas|fuel|gas station|shell|chevron|exxon|qt|quiktrip|racetrac',
    transport: 'uber|lyft|bus|train|parking|toll|tolls|car wash|oil change|car|tire|tires|metro|subway|flight|plane',
    shopping: 'shoes|clothes|shirt|hoodie|jacket|pants|amazon|target|walmart|mall|shopping|sneakers|jordans|nike|outfit|stuff',
    bills: 'rent|electric|electricity|water bill|internet|wifi|phone bill|bill|bills|insurance|car payment|loan|credit card|utilities',
    subscriptions: 'netflix|spotify|hulu|disney|youtube|apple music|prime|subscription|subscriptions|membership|tradingview|chatgpt|xbox|playstation|ps plus|gym membership',
    fun: 'movie|movies|game|games|concert|tickets|bar|club|bowling|arcade|fun|date|going out|party|vape|weed',
    health: 'gym|doctor|medicine|pharmacy|cvs|walgreens|vitamins|protein|supplements|haircut|barber|dentist',
    trading: 'funded account|challenge|evaluation|prop firm|indicator|course|trading',
    gifts: 'gift|gifts|present|birthday present',
  };
  const CAT_RX = Object.entries(CATS).map(([c, w]) => [c, new RegExp('\\b(?:' + w + ')\\b')]);
  const catOf = (what) => (CAT_RX.find(([, re]) => re.test(what)) || ['other'])[0];
  const AMT = '\\$?\\s*(\\d+(?:\\.\\d{1,2})?)\\s*(?:dollars?|bucks?|usd)?';
  function parseSpend(t) {
    const pats = [
      new RegExp('\\b(?:spent|spend|paid|pay|dropped|blew|wasted|used|put)\\s+' + AMT + '(?:\\s+(?:on|for|at|in)\\s+(.+?))?(?:\\s+(?:today|yesterday|just now|tonight|earlier))?$'),
      new RegExp('\\b(?:bought|got|grabbed|ordered|picked up)\\s+(.+?)\\s+for\\s+' + AMT),
      new RegExp('^\\$?\\s*(\\d+(?:\\.\\d{1,2})?)\\s*(?:dollars?|bucks?)?\\s+(?:on|for|at)\\s+(.+)$'),
      new RegExp('\\b(?:log|add|track|record)\\s+' + AMT + '\\s+(?:for|on|at)?\\s*(.+)$'),
      new RegExp('\\b(.+?)\\s+(?:was|cost|cost me|came to)\\s+' + AMT),
    ];
    for (let i = 0; i < pats.length; i++) {
      const m = t.match(pats[i]);
      if (!m) continue;
      const amt = i === 1 || i === 4 ? +m[2] : +m[1];
      let what = (i === 1 || i === 4 ? m[1] : m[2]) || 'stuff';
      what = what.replace(/\b(today|yesterday|just now|please|tonight|earlier|i|my|a|an|the|some)\b/g, ' ').replace(/\s+/g, ' ').trim() || 'stuff';
      if (amt > 0 && amt < 1e6) return { amt, what };
    }
    return null;
  }
  function periodOf(k, t) {
    const p = Sessions.parts(new Date(k.now), k.tz);
    if (/\btoday\b/.test(t)) return { from: startOf(k.now, k.tz, 0), name: 'today' };
    if (/\byesterday\b/.test(t)) return { from: startOf(k.now, k.tz, 1), to: startOf(k.now, k.tz, 0), name: 'yesterday' };
    if (/\blast month\b/.test(t)) { const s0 = Sessions.zonedToUtc(p.m === 1 ? p.y - 1 : p.y, p.m === 1 ? 12 : p.m - 1, 1, 0, 0, k.tz); return { from: s0, to: Sessions.zonedToUtc(p.y, p.m, 1, 0, 0, k.tz), name: 'last month' }; }
    if (/\bmonth\b/.test(t)) return { from: Sessions.zonedToUtc(p.y, p.m, 1, 0, 0, k.tz), name: 'this month' };
    if (/\byear\b/.test(t)) return { from: Sessions.zonedToUtc(p.y, 1, 1, 0, 0, k.tz), name: 'this year' };
    if (/\b(all time|ever|total|overall)\b/.test(t)) return { from: 0, name: 'in total' };
    return { from: k.now - 7 * 864e5, name: 'in the last 7 days' };
  }
  function moneyA(k, t) {
    const day = (ms) => new Date(ms).toLocaleDateString('en-US', { timeZone: k.tz, month: 'short', day: 'numeric' });
    // budgets: "set my food budget to 300", "budget 500 for shopping"
    const bm = t.match(/\b(?:set|make|change|put)?\s*(?:my|a|the)?\s*(\w+)?\s*budget\s*(?:to|at|of|is|for)?\s*\$?(\d+(?:\.\d+)?)(?:\s*(?:dollars|bucks))?(?:\s+(?:for|on)\s+(\w+))?/);
    if (bm && /\bbudget\b/.test(t) && /\d/.test(t) && !/\bhow much\b|\bleft\b/.test(t)) {
      let cat = (bm[3] || bm[1] || 'total').replace(/^(monthly|my|a|the|set)$/, 'total');
      if (!CATS[cat] && cat !== 'total') cat = catOf(cat) === 'other' ? cat : catOf(cat);
      st.budgets[cat] = +bm[2]; save();
      return R(`${cat === 'total' ? 'Monthly budget' : cap(cat) + ' budget'} set to <b>${usd(+bm[2])}</b> a month${k.t}. I'll tell you how much is left whenever you log spending.`, `${cat === 'total' ? 'Monthly' : cap(cat)} budget set to ${sayUsd(+bm[2])} a month${k.t}.`);
    }
    // remove a budget: "remove my food budget", "delete all budgets"
    if (/\b(remove|delete|clear|cancel|drop|get rid of|turn off|no more)\b/.test(t) && /\bbudgets?\b/.test(t)) {
      if (/\b(all|every|budgets)\b/.test(t)) { const n = Object.keys(st.budgets).length; st.budgets = {}; save(); return R(`Removed ${n ? 'all ' + n : 'all'} budgets${k.t}.`); }
      const c = Object.keys(st.budgets).find((x) => t.includes(x)) || (/\b(monthly|total|overall)\b/.test(t) ? 'total' : null);
      if (c && st.budgets[c] != null) { delete st.budgets[c]; save(); return R(`Removed your ${c === 'total' ? 'monthly' : c} budget${k.t}.`); }
      return R(`I don't see that budget${k.t}.${Object.keys(st.budgets).length ? ' You have: ' + Object.keys(st.budgets).join(', ') + '.' : ''}`);
    }
    // remove one expense: "delete the lunch expense", "remove the 25 dollar one", "I didn't spend that"
    const dm = t.match(/\b(?:delete|remove|erase|take off|cancel|scratch)\s+(?:the\s+|my\s+|that\s+)?(?:\$?(\d+(?:\.\d+)?)\s*(?:dollars?|bucks)?\s*)?(.*?)\s*(?:expense|purchase|entry|charge|one|spending)?$/);
    if (dm && /\b(expense|purchase|entry|charge|spent|spending|dollar|bucks|\d)\b/.test(t) && !/\b(last|previous|subscription|budget)\b/.test(t)) {
      const amt = dm[1] ? +dm[1] : null, q = (dm[2] || '').replace(/\b(the|on|for|at|i|my|expense|dollar|dollars|bucks)\b/g, ' ').trim();
      const idx = st.money.map((x, i) => [x, i]).reverse().find(([x]) => (amt == null || Math.abs(x.amt - amt) < 0.01) && (!q || x.what.includes(q) || q.includes(x.what) || (x.cat || '') === q));
      if (!idx) return R(`I couldn't find that expense${k.t}. Say “show my spending” to see the list.`);
      st.money.splice(idx[1], 1); save();
      return R(`Removed ${usd(idx[0].amt)} on ${esc(idx[0].what)}${k.t}.`);
    }
    // undo / remove
    if (/\b(undo|delete|remove|scratch|take back|cancel)\b.*\b(last|that|previous)\b/.test(t) && !/\b(subscription|sub)\b/.test(t) && st.money.length) { const x = st.money.pop(); save(); return R(`Removed ${usd(x.amt)} on ${esc(x.what)}${k.t}.`); }
    // logging
    const sp = parseSpend(t);
    if (sp && !/\bhow much\b|\bdid i\b/.test(t)) {
      const cat = catOf(sp.what);
      st.money.push({ amt: sp.amt, what: sp.what, cat, at: k.now }); st.money = st.money.slice(-2000); save(); did('money', {});
      const p = Sessions.parts(new Date(k.now), k.tz), m0 = Sessions.zonedToUtc(p.y, p.m, 1, 0, 0, k.tz);
      const month = st.money.filter((x) => x.at >= m0), mt = month.reduce((a, x) => a + x.amt, 0), ct = month.filter((x) => (x.cat || catOf(x.what)) === cat).reduce((a, x) => a + x.amt, 0);
      let bl = '';
      const bud = st.budgets[cat] != null ? [cat, st.budgets[cat], ct] : st.budgets.total != null ? ['total', st.budgets.total, mt] : null;
      if (bud) { const left = bud[1] - bud[2]; bl = left >= 0 ? ` ${usd(left)} left in your ${bud[0] === 'total' ? 'monthly' : bud[0]} budget.` : ` ⚠️ That's ${usd(-left)} over your ${bud[0] === 'total' ? 'monthly' : bud[0]} budget.`; }
      return R(`Logged <b>${usd(sp.amt)}</b> on ${esc(sp.what)} <span class="dim">(${cat})</span>${k.t}. This month: <b>${usd(mt)}</b>${cat !== 'other' ? `, ${cat} ${usd(ct)}` : ''}.${bl}`,
        `Logged ${sayUsd(sp.amt)} on ${sp.what}${k.t}. That's ${sayUsd(mt)} this month.${bl.replace('⚠️ ', '').replace(/\$([\d,.]+)/g, '$1 dollars')}`);
    }
    // budget left
    if (/\bbudget\b/.test(t)) {
      const ks = Object.keys(st.budgets);
      if (!ks.length) return R(`No budgets yet${k.t}. Say “set my food budget to 300” or “set a monthly budget of 2000”.`);
      const p = Sessions.parts(new Date(k.now), k.tz), m0 = Sessions.zonedToUtc(p.y, p.m, 1, 0, 0, k.tz), month = st.money.filter((x) => x.at >= m0);
      const rows = ks.map((c) => { const used = month.filter((x) => c === 'total' || (x.cat || catOf(x.what)) === c).reduce((a, x) => a + x.amt, 0), left = st.budgets[c] - used; return { c, used, left, lim: st.budgets[c] }; });
      return R(`Budgets this month${k.t}:<ul>${rows.map((r) => `<li><b>${r.c === 'total' ? 'Total' : cap(r.c)}</b>: ${usd(r.used)} of ${usd(r.lim)} — <span class="${r.left >= 0 ? 'up' : 'down'}">${r.left >= 0 ? usd(r.left) + ' left' : usd(-r.left) + ' over'}</span></li>`).join('')}</ul>`,
        rows.map((r) => `${r.c === 'total' ? 'Total' : r.c}: ${r.left >= 0 ? sayUsd(r.left) + ' left' : sayUsd(-r.left) + ' over'}`).join('. ') + '.');
    }
    // questions
    const r = periodOf(k, t);
    let L = st.money.filter((x) => x.at >= r.from && (!r.to || x.at < r.to));
    const askCat = Object.keys(CATS).find((c) => new RegExp('\\b(?:on|for)\\s+(?:' + c + '|' + CATS[c] + ')\\b').test(t)) || Object.keys(CATS).find((c) => new RegExp('\\b' + c + '\\b').test(t));
    if (askCat) L = L.filter((x) => (x.cat || catOf(x.what)) === askCat);
    if (!L.length) return R(`Nothing logged${askCat ? ' for ' + askCat : ''} ${r.name}${k.t}. Say “I spent 20 dollars on food” to track spending.`);
    const tot = L.reduce((a, x) => a + x.amt, 0);
    if (/\b(biggest|largest|most expensive|highest)\b/.test(t)) { const x = L.slice().sort((a, b) => b.amt - a.amt)[0]; return R(`Biggest expense ${r.name}${k.t}: <b>${usd(x.amt)}</b> on ${esc(x.what)} (${day(x.at)}).`); }
    if (/\b(list|show|what did i (buy|spend on)|recent|last few|history)\b/.test(t)) {
      return R(`Spending ${r.name}${askCat ? ' on ' + askCat : ''}${k.t} — <b>${usd(tot)}</b>:<ul>${L.slice(-10).reverse().map((x) => `<li>${day(x.at)} · ${esc(x.what)} · ${usd(x.amt)}</li>`).join('')}</ul>`, `You spent ${sayUsd(tot)} ${r.name}${k.t}.`);
    }
    const by = {};
    L.forEach((x) => { const c = x.cat || catOf(x.what); by[c] = (by[c] || 0) + x.amt; });
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const avg = r.name === 'in the last 7 days' ? ` <span class="dim">(about ${usd(tot / 7)} a day)</span>` : '';
    return R(`Spent <b>${usd(tot)}</b> ${askCat ? 'on ' + askCat + ' ' : ''}${r.name}${k.t}.${avg}${askCat ? '' : `<ul>${top.map(([w, v]) => `<li>${esc(cap(w))}: ${usd(v)}</li>`).join('')}</ul>`}`,
      `You spent ${sayUsd(tot)} ${askCat ? 'on ' + askCat + ' ' : ''}${r.name}${k.t}.${askCat ? '' : ` Most on ${top[0][0]}.`}`);
  }

  // ---- subscriptions & bills ------------------------------------------------------------
  // "add netflix 15.99 a month on the 5th", "I pay 10 for spotify every month", "rent is 1200 due on the 1st"
  const ORD = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  function nextDue(sub, k) {
    if (sub.first && sub.first >= startOf(k.now, k.tz, 0)) return sub.first;
    const p = Sessions.parts(new Date(k.now), k.tz);
    if (sub.period === 'year' && sub.month) { let y = p.y; let d = Sessions.zonedToUtc(y, sub.month, sub.day || 1, 9, 0, k.tz); if (d < startOf(k.now, k.tz, 0)) d = Sessions.zonedToUtc(y + 1, sub.month, sub.day || 1, 9, 0, k.tz); return d; }
    if (sub.period === 'week' && sub.wd != null) { const wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); const add = (sub.wd - wd + 7) % 7; return startOf(k.now, k.tz, 0) + add * 864e5 + 9 * 3600e3; }
    const dd = sub.day || 1, dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
    let y = p.y, m = p.m;
    if (p.d > dd) { m++; if (m > 12) { m = 1; y++; } }
    return Sessions.zonedToUtc(y, m, Math.min(dd, dim(y, m)), 9, 0, k.tz);
  }
  const monthly = (x) => { const a = x.amt || 0; return x.period === 'year' ? a / 12 : x.period === 'week' ? a * 52 / 12 : a; };
  const WDN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const MON = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function subsA(k, t) {
    const when = (ms) => new Date(ms).toLocaleDateString('en-US', { timeZone: k.tz, weekday: 'short', month: 'short', day: 'numeric' });
    const daysTo = (ms) => Math.round((startOf(ms, k.tz, 0) - startOf(k.now, k.tz, 0)) / 864e5);
    // remove
    const rm = t.match(/\b(?:remove|delete|cancel|cancelled|canceled|stop|drop|get rid of|unsubscribe(?: from)?)\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:subscription|sub|bill|membership))?$/);
    if (rm && !/\b(spent|paid)\b/.test(t)) {
      const q = rm[1].replace(/\b(subscription|sub|bill|membership|from|my|the)\b/g, '').trim();
      const x = st.subs.find((y) => y.name.includes(q) || q.includes(y.name));
      if (x) { st.subs = st.subs.filter((y) => y !== x); save(); return R(`Removed <b>${esc(cap(x.name))}</b>${k.t}. That saves you ${usd(monthly(x))} a month.`, `Removed ${x.name}. That saves ${sayUsd(monthly(x))} a month${k.t}.`); }
    }
    // remove ALL: "remove subscriptions", "delete all my subscriptions", "clear my bills"
    if (/\b(remove|delete|clear|cancel|wipe|erase|reset|get rid of)\b/.test(t) && /\b(all|every|everything|subscriptions|subs|bills)\b/.test(t) && !st.subs.some((y) => t.includes(y.name))) {
      const n = st.subs.length; st.subs = []; save();
      return R(n ? `Removed all ${n} subscriptions and bills${k.t}.` : `You didn't have any subscriptions saved${k.t}.`, n ? `Removed all ${n} subscriptions and bills${k.t}.` : `You didn't have any saved${k.t}.`);
    }
    // read the message: name, amount, how often, which day
    const dateWords = new RegExp('\\b(?:' + MON.join('|') + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})(?:st|nd|rd|th)\\b(?:\\s+of\\s+(?:' + MON.join('|') + '))?|\\b(?:on|the)\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})\\s*/\\s*(\\d{1,2})\\b', 'g');
    let dayN = null, monN = null;
    const noDates = t.replace(dateWords, (m0, a1, a2, a3, a4, a5) => {
      const mm = m0.match(new RegExp('\\b(' + MON.join('|') + ')\\b'));
      if (mm) monN = MON.indexOf(mm[1]) + 1;
      if (a4) { monN = +a4; dayN = +a5; } else dayN = +(a1 || a2 || a3);
      return ' ';
    });
    const amtRx = /\$\s*(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd)\b|\b(?:for|is|costs?|at|of|pay|paying|now|to|up to|down to|charges?)\s+\$?(\d+(?:\.\d{1,2})?)\b(?!\s*(?:st|nd|rd|th|minutes?|hours?|days?))|\b(\d+\.\d{2})\b|\b(\d+(?:\.\d{1,2})?)\s+(?:a|per|every|each)\s+(?:month|year|week)\b/;
    const am = noDates.match(amtRx);
    const amount = am ? +(am[1] || am[2] || am[3] || am[4] || am[5]) : null;
    const period = /\b(year|yearly|annual|annually)\b/.test(t) ? 'year' : /\b(week|weekly)\b/.test(t) ? 'week' : 'month';
    const wdM = t.match(new RegExp('\\b(' + WDN.join('|') + ')s?\\b'));
    // the name: words after "for" (when they aren't a number), else what's left after removing filler
    const FILL = /\b(add|new|track|set|save|put|a|an|the|my|i|me|pay|paying|paid|have|has|is|are|its|it|was|costs?|cost|for|subscription|subscriptions|sub|subs|bill|bills|membership|due|on|every|each|month|months|monthly|per|year|years|yearly|annual|annually|week|weeks|weekly|of|to|that|which|renews|renew|charges?|charged|day|dollars?|bucks|usd|now|up|down|went|goes|change|changed|update|updated|price|plan|payment|comes out|come out|will|be|next|this|in|at|and|so|um|uh|ok|okay|please|jarvis)\b/g;
    const forM = noDates.match(/\bfor\s+([a-z][a-z ]*?)(?:\s+(?:subscription|membership|bill|plan))?\s*$/);
    const known = st.subs.find((y) => new RegExp('\\b' + y.name + '\\b').test(t));
    let name = known ? known.name : forM && !/^\d/.test(forM[1]) ? forM[1].replace(FILL, ' ').replace(/\s+/g, ' ').trim() : '';
    if (!name) name = noDates.replace(/\$?\s*\d+(?:\.\d{1,2})?/g, ' ').replace(FILL, ' ').replace(new RegExp('\\b(' + WDN.join('|') + '|' + MON.join('|') + ')s?\\b', 'g'), ' ').replace(/\s+/g, ' ').trim();
    // speech-to-text mishearings of common services
    const FIX = { cloud: 'claude', clod: 'claude', 'cloud ai': 'claude', 'clawed': 'claude', 'chat gpt': 'chatgpt', 'chat gbt': 'chatgpt', 'net flicks': 'netflix', 'spot if i': 'spotify', 'spotty fi': 'spotify', 'you tube': 'youtube', 'hue lou': 'hulu', 'trading few': 'tradingview', 'trading view': 'tradingview', 'x box': 'xbox', 'ps plus': 'playstation plus' };
    if (/\bclaude\b/.test(name) && /\bcloud\b/.test(name)) name = 'claude';
    for (const [w, to] of Object.entries(FIX)) if (name === w || name.startsWith(w + ' ') || name.endsWith(' ' + w)) name = to;
    name = name.split(' ').slice(0, 3).join(' ');
    const wantsSave = amount != null || dayN != null || /\b(add|new|track|subscription|membership|bill|due|every|monthly|a month|yearly|weekly|i pay|renews)\b/.test(t);
    const isQuestion = /^(when|how much|what|which|is|do|does|did)\b/.test(t.trim()) || /\bhow much\b/.test(t);
    if (wantsSave && !isQuestion && name && !/\b(spent|dropped)\b/.test(t)) {
      const old = known || st.subs.find((y) => y.name === name);
      const sub = old ? { ...old } : { name, amt: null, period, day: null, wd: null, month: null };
      if (amount != null) sub.amt = amount;
      if (dayN != null) sub.day = Math.min(31, dayN);
      if (monN != null && period === 'year') sub.month = monN;
      if (!old || /\b(year|yearly|annual|week|weekly|month|monthly)\b/.test(t)) sub.period = period;
      if (wdM) sub.wd = WDN.indexOf(wdM[1]);
      if (sub.day == null) sub.day = Sessions.parts(new Date(k.now), k.tz).d;
      if (sub.period === 'year' && !sub.month) sub.month = monN || Sessions.parts(new Date(k.now), k.tz).m;
      // a specific first date ("due December 1st"): if it's further out than the normal next date, use it
      sub.first = monN != null && dayN != null ? (() => { const p = Sessions.parts(new Date(k.now), k.tz); let y = p.y; let d = Sessions.zonedToUtc(y, monN, dayN, 9, 0, k.tz); if (d < startOf(k.now, k.tz, 0)) d = Sessions.zonedToUtc(y + 1, monN, dayN, 9, 0, k.tz); return d; })() : sub.first || null;
      sub.bill = /\b(rent|bill|insurance|loan|payment|electric|internet|phone|car note|mortgage)\b/.test(t) || !!sub.bill;
      if (old) Object.assign(old, sub); else st.subs.push(sub);
      save(); did('sub', { name: sub.name, old: old ? { ...old } : null });
      const nd = nextDue(sub, k);
      const tot = st.subs.reduce((acc, x) => acc + monthly(x), 0);
      const how = sub.period === 'month' ? `a month, on the ${ORD(sub.day)}` : sub.period === 'year' ? 'a year' : `a week${sub.wd != null ? ' on ' + cap(WDN[sub.wd]) + 's' : ''}`;
      const price = sub.amt != null ? `${usd(sub.amt)} ${how}` : `${how} — <span class="warn">how much is it?</span> Say “${esc(cap(sub.name))} is 20 dollars”`;
      const priceS = sub.amt != null ? `${sayUsd(sub.amt)} ${how}.` : `${how}. How much is it?`;
      return R(`${old ? 'Updated' : 'Saved'} <b>${esc(cap(sub.name))}</b>: ${price}${k.t}. Next due: <b>${when(nd)}</b>. I'll remind you the day before.<br><span class="dim">All subscriptions & bills: ${usd(tot)} a month. Fix anything in Settings → Subscriptions.</span>`,
        `${old ? 'Updated' : 'Saved'} ${sub.name}${k.t}. ${cap(priceS)} Next due ${when(nd)}.`);
    }
    if (!st.subs.length) return R(`No subscriptions or bills saved yet${k.t}. Say “add Netflix 15.99 a month on the 5th” or “rent is 1200 due on the 1st”.`);
    const L = st.subs.map((x) => ({ ...x, nd: nextDue(x, k) })).sort((a, b) => a.nd - b.nd);
    const tot = L.reduce((a, x) => a + monthly(x), 0);
    const q = t.match(/\b(?:when is|when's|how much is|how much do i pay for|when do i pay)\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:due|bill|subscription))?$/);
    const one = q && L.find((x) => q[1].includes(x.name) || x.name.includes(q[1].trim()));
    if (one) return R(`<b>${esc(cap(one.name))}</b>: ${one.amt != null ? usd(one.amt) : 'amount not set'} a ${one.period}, next on <b>${when(one.nd)}</b> (${daysTo(one.nd) === 0 ? 'today' : daysTo(one.nd) === 1 ? 'tomorrow' : 'in ' + daysTo(one.nd) + ' days'})${k.t}.`, `${one.name} is ${one.amt != null ? sayUsd(one.amt) : 'not priced yet'}, next on ${when(one.nd)}${k.t}.`);
    if (/\b(next|coming up|due soon|this week|upcoming)\b/.test(t)) {
      const soon = L.filter((x) => daysTo(x.nd) <= 7);
      if (!soon.length) return R(`Nothing due in the next 7 days${k.t}. Next up: ${esc(cap(L[0].name))} on ${when(L[0].nd)}.`);
      return R(`Due in the next 7 days${k.t}:<ul>${soon.map((x) => `<li>${when(x.nd)} · <b>${esc(cap(x.name))}</b> · ${x.amt != null ? usd(x.amt) : '$?'}</li>`).join('')}</ul>Total ${usd(soon.reduce((a, x) => a + (x.amt || 0), 0))}.`, `${soon.length} due this week${k.t}: ${soon.map((x) => x.name).join(', ')}.`);
    }
    return R(`Your subscriptions & bills${k.t} — <b>${usd(tot)} a month</b> (${usd(tot * 12)} a year):<ul>${L.map((x) => `<li><b>${esc(cap(x.name))}</b> · ${x.amt != null ? usd(x.amt) : '$?'}/${x.period === 'month' ? 'mo' : x.period === 'year' ? 'yr' : 'wk'} · next ${when(x.nd)}</li>`).join('')}</ul>`,
      `You have ${L.length} subscriptions and bills${k.t}, ${sayUsd(tot)} a month. Next up is ${L[0].name} on ${when(L[0].nd)}.`);
  }

  // =====================================================================================
  // TO-DO LIST
  // =====================================================================================
  function todoA(k, t) {
    const add = t.match(/^(?:please\s+)?(?:add|put|write down|note down|stick)\s+(.+?)\s+(?:to|on|in)\s+(?:my|the)\s+(?:to ?do(?: list)?|list|todos?|tasks?)$/) || t.match(/^(?:new\s+)?(?:to ?do|task)[: ]\s*(.+)$/) || t.match(/\b(?:add|put) (?:a )?(?:task|to ?do)\s+(?:to\s+)?(.+)$/);
    if (add) {
      // typed commas survive in k.raw; spoken lists have none, so "milk eggs and bread" is split on known item words
      const rawSeg = (k.raw || '').match(/(?:add|put|write down|note down|stick)\s+(.+?)\s+(?:to|on|in)\s+(?:my|the)\s+/);
      const src = rawSeg && rawSeg[1].includes(',') ? rawSeg[1] : add[1];
      const ITEMS = /^(milk|eggs?|bread|butter|cheese|chicken|beef|steak|rice|pasta|beans|bananas?|apples?|oranges?|grapes|berries|strawberries|lettuce|tomatoes|onions?|potatoes|carrots|spinach|water|juice|coffee|tea|sugar|salt|pepper|flour|cereal|oats|yogurt|ham|turkey|bacon|sausage|fish|salmon|tuna|shrimp|soap|shampoo|conditioner|toothpaste|deodorant|toilet paper|paper towels|napkins|trash bags|detergent|bleach|batteries|chips|cookies|snacks|soda|gatorade|protein|vitamins|ice|ketchup|mustard|mayo|sauce|oil|garlic|avocados?|lemons?|limes?|peppers|corn|tortillas|buns|wings|pizza|gum|candy)$/;
      let items = src.split(/\s*,\s*|\s+and\s+|\s+plus\s+/).map((x) => x.replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').replace(/^(?:to\s+|some\s+|a\s+|an\s+|the\s+)/, '').trim()).filter(Boolean);
      items = items.flatMap((x) => { const w = x.split(' '); return w.length > 1 && w.every((y) => ITEMS.test(y)) ? w : [x]; }).map((x) => me2you(x));
      items.forEach((text) => st.todos.push({ text, done: false, at: k.now }));
      save();
      return R(`Added to your list${k.t}: <b>${items.map(esc).join('</b>, <b>')}</b>. ${st.todos.filter((x) => !x.done).length} things on it now.`, `Added ${items.join(' and ')} to your list${k.t}.`);
    }
    if (/\b(clear|empty|wipe|delete)\b.*\b(list|to ?dos?|tasks)\b/.test(t)) { const n = st.todos.length; st.todos = /\b(done|finished|completed|checked)\b/.test(t) ? st.todos.filter((x) => !x.done) : []; save(); return R(`List cleared${k.t}. (${n - st.todos.length} removed)`); }
    const done = t.match(/\b(?:check off|cross off|tick off|mark|done with|finished|completed|did|remove|delete|erase|drop|take|got|bought|grabbed|picked up|handled|called|paid)\s+(?:the\s+|my\s+|some\s+)?(.+?)(?:\s+(?:as done|off (?:my|the) list|from (?:my|the) list|done|off))?$/);
    if (done && /\b(list|to ?do|task|check off|cross off|tick off|mark)\b/.test(t) || done && st.todos.some((x) => !x.done && x.text.includes(done[1].replace(/^(?:item|number)\s+/, '')))) {
      const q = done[1].replace(/\s+(?:on|from|off)\s+(?:my|the)\s+.*$/, '').replace(/^(?:item|number)\s+/, '').trim();
      const open = st.todos.filter((x) => !x.done);
      const it = /^\d+$/.test(q) ? open[+q - 1] : open.find((x) => x.text.includes(q) || q.includes(x.text)) || open.find((x) => q.split(' ').some((w) => w.length > 3 && x.text.includes(w)));
      if (!it) return R(`I couldn't find “${esc(q)}” on your list${k.t}.`);
      const removing = /\b(remove|delete|take|erase|drop|get rid of)\b/.test(t);
      if (removing) st.todos = st.todos.filter((x) => x !== it); else { it.done = true; it.doneAt = k.now; did('todo', { text: it.text }); }
      st.todos = st.todos.filter((x) => !x.done || k.now - (x.doneAt || 0) < 3 * 864e5);
      save();
      const left = st.todos.filter((x) => !x.done).length;
      if (removing) return R(`Removed <b>${esc(it.text)}</b> from your list${k.t}. ${left ? `${left} left.` : 'List is clear.'}`, `Removed ${it.text}${k.t}. ${left ? left + ' left.' : 'Your list is clear.'}`);
      return R(`✅ <b>${esc(cap(it.text))}</b> — done${k.t}. ${left ? `${left} left.` : 'List is clear! 🎉'}`, `${cap(it.text)}, done${k.t}. ${left ? left + ' left.' : 'Your list is clear.'}`);
    }
    // the opposite of done: "uncheck eggs", "eggs isn't done", "put eggs back"
    const un = t.match(/\b(?:uncheck|unmark|untick|undo|put back|bring back|not done with|isnt done|is not done|reopen)\s+(?:the\s+|my\s+)?(.+?)(?:\s+(?:on|to|back on)\s+(?:my|the)\s+list)?$/) || t.match(/^(.+?)\s+(?:isnt|is not|wasnt|was not)\s+done$/);
    if (un) {
      const q = un[1].trim(), it = st.todos.filter((x) => x.done).reverse().find((x) => x.text.includes(q) || q.includes(x.text));
      if (!it) return R(`I don't see a finished “${esc(q)}” on your list${k.t}.`);
      it.done = false; delete it.doneAt; save();
      return R(`Put <b>${esc(it.text)}</b> back on your list${k.t}.`);
    }
    const open = st.todos.filter((x) => !x.done);
    if (!open.length) return R(`Your to-do list is empty${k.t}. Say “add groceries to my list”.`);
    return R(`Your list${k.t}:<ol>${open.map((x) => `<li>${esc(cap(x.text))}</li>`).join('')}</ol><span class="dim">Say “check off 1” or “done with ${esc(open[0].text)}”.</span>`, `You have ${open.length} thing${open.length > 1 ? 's' : ''} on your list${k.t}: ${open.map((x) => x.text).join(', ')}.`);
  }

  // =====================================================================================
  // COUNTDOWNS
  // =====================================================================================
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const MON_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  function fixedDays(k) {
    const bd = (k.birthday || '11-15').split('-').map(Number);
    const y = +k.y;
    const thanks = (yy) => { const d = new Date(yy, 10, 1); const first = (11 - d.getDay()) % 7 + 1; return `${yy}-11-${String(first + 21).padStart(2, '0')}`; };
    const list = [['christmas', 12, 25], ['new year', 1, 1], ['new years', 1, 1], ['halloween', 10, 31], ['valentines', 2, 14], ['valentine', 2, 14], ['fourth of july', 7, 4], ['july 4th', 7, 4], ['independence day', 7, 4], ['my birthday', bd[0], bd[1]], ['your birthday', 11, 11]];
    const out = list.map(([n, m, d]) => ({ name: n, date: nextDate(k, m, d) }));
    let th = thanks(y); if (th < dayKey(k.now, k.tz)) th = thanks(y + 1);
    out.push({ name: 'thanksgiving', date: th });
    return out;
  }
  function nextDate(k, m, d) { const today = dayKey(k.now, k.tz); let s = `${k.y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; if (s < today) s = `${+k.y + 1}-${s.slice(5)}`; return s; }
  function parseDate(k, t) {
    let m = t.match(new RegExp('\\b' + MON_RE + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?'));
    if (m) { const mo = MONTHS.findIndex((x) => x.startsWith(m[1].slice(0, 3))) + 1; let s = m[3] ? `${m[3]}-${String(mo).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}` : nextDate(k, mo, +m[2]); return { date: s, text: m[0] }; }
    m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) { const yy = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : null; return { date: yy ? `${yy}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : nextDate(k, +m[1], +m[2]), text: m[0] }; }
    m = t.match(new RegExp('\\bin\\s+' + NUMRE + '\\s+(days?|weeks?|months?)'));
    if (m) { const n = num(m[1]) || 1, mul = /week/.test(m[2]) ? 7 : /month/.test(m[2]) ? 30 : 1; return { date: dayKey(k.now + n * mul * 864e5, k.tz), text: m[0] }; }
    return null;
  }
  const daysTo = (k, date) => Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(dayKey(k.now, k.tz) + 'T12:00:00Z')) / 864e5);
  const prettyDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  function cdLine(k, c) { const n = daysTo(k, c.date); return n === 0 ? `<b>${esc(cap(c.name))}</b> is <b>today</b>! 🎉` : `<b>${n}</b> day${n === 1 ? '' : 's'} until <b>${esc(c.name)}</b> <span class="dim">(${prettyDate(c.date)})</span>`; }
  function countdownA(k, t) {
    st.countdowns = st.countdowns.filter((c) => daysTo(k, c.date) >= 0);
    const del = t.match(/\b(?:delete|remove|cancel|drop)\s+(?:the\s+|my\s+)?(?:countdown\s+(?:to|for)\s+|countdown\s+)?(.+?)(?:\s+countdown)?$/);
    if (del && /countdown/.test(t)) {
      const c = st.countdowns.find((x) => x.name.includes(del[1]) || del[1].includes(x.name));
      if (!c) return R(`I don't have a countdown for “${esc(del[1])}”${k.t}.`);
      st.countdowns = st.countdowns.filter((x) => x !== c); save();
      return R(`Countdown to <b>${esc(c.name)}</b> removed${k.t}.`);
    }
    const pd = parseDate(k, t);
    const nameM = t.replace(pd ? pd.text : '#', ' ').match(/\b(?:countdown|count down)\s+(?:to|for|until|till)\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:on|is|at|which is|for|to))?\s*$/) || t.replace(pd ? pd.text : '#', ' ').match(/\b(?:change|move|update|set)\s+(?:the\s+|my\s+)?(.+?)\s+(?:countdown\s+)?(?:to|date to)\s*$/) || t.replace(pd ? pd.text : '#', ' ').match(/^(?:add|make|create|start|set)\s+(?:a\s+)?(?:new\s+)?countdown\s+(?:to|for|called)?\s*(?:my\s+|the\s+)?(.+?)(?:\s+(?:on|is|at))?\s*$/);
    if (pd && nameM) {
      const name = nameM[1].replace(/\s+countdown$/, '').replace(/\s+(?:on|is)$/, '').trim();
      const old = st.countdowns.find((x) => x.name === name || x.name.includes(name) || name.includes(x.name));
      if (old) old.date = pd.date; else st.countdowns.push({ name, date: pd.date });
      save();
      const c = old || st.countdowns[st.countdowns.length - 1];
      return R(`${old ? 'Updated' : 'Counting down'}${k.t}: ${cdLine(k, c)}.`, `${old ? 'Updated' : 'Got it'}${k.t}. ${daysTo(k, c.date)} days until ${c.name}.`);
    }
    // "how many days until christmas / my trip"
    const q = t.match(/\b(?:until|till|til|to|before)\s+(?:my\s+|the\s+)?(.+?)\??$/);
    if (q && /\b(how (?:many|long)|days|weeks|countdown)\b/.test(t)) {
      const want = q[1].replace(/^(?:the\s+)/, '').trim();
      const all = st.countdowns.concat(fixedDays(k));
      const hit = all.find((c) => c.name === want || c.name.includes(want) || want.includes(c.name.replace(/^my\s+/, '')) || ('my ' + want) === c.name);
      if (hit) { const n = daysTo(k, hit.date); return R(cdLine(k, hit) + '.', n === 0 ? `${cap(hit.name)} is today${k.t}!` : `${n} day${n === 1 ? '' : 's'} until ${hit.name}${k.t}.`); }
      const pd2 = parseDate(k, want);
      if (pd2) { const n = daysTo(k, pd2.date); return R(`<b>${n}</b> days until ${prettyDate(pd2.date)}${k.t}.`); }
      return R(`I don't have a date for “${esc(want)}”${k.t}. Say “add a countdown to ${esc(want)} on March 3rd”.`);
    }
    const mine = st.countdowns.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!mine.length) return R(`No countdowns yet${k.t}. Say “add a countdown to my trip on March 3rd”. I already know Christmas, New Year, Thanksgiving, Halloween and your birthday.`);
    return R(`Your countdowns${k.t}:<ul>${mine.map((c) => `<li>${cdLine(k, c)}</li>`).join('')}</ul><span class="dim">Say “change ${esc(mine[0].name)} to …” or “delete countdown ${esc(mine[0].name)}”.</span>`,
      mine.map((c) => `${daysTo(k, c.date)} days until ${c.name}`).join('. ') + '.');
  }

  // =====================================================================================
  // MEMORY — "remember my locker is 42"
  // =====================================================================================
  const STOPW = new Set('the a an is are was my me i to of and that what whats what\'s do you did tell about remember know where when who how it its for on in at this be please jarvis your can could again'.split(' '));
  const kw = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter((w) => w && !STOPW.has(w));
  function memoryA(k, t, raw) {
    const save1 = t.match(/^(?:please\s+)?(?:remember|note|keep in mind|don'?t forget|write down|save)\s+(?:that\s+)?(.+)$/);
    if (save1 && !/^(?:what|when|where|who|how)\b/.test(save1[1])) {
      const fact = save1[1].trim();
      st.memory.push({ fact, at: k.now }); st.memory = st.memory.slice(-200); save();
      return R(`Got it${k.t}, I'll remember: <b>${esc(me2you(fact))}</b>.`, `Got it${k.t}. I'll remember that ${me2you(fact)}.`);
    }
    const fg = t.match(/\bforget\s+(?:about\s+|that\s+)?(.+)$/);
    if (fg) {
      const words = kw(fg[1]);
      const before = st.memory.length;
      st.memory = st.memory.filter((m) => !(words.length && words.every((w) => m.fact.includes(w))));
      save();
      return R(before > st.memory.length ? `Forgotten${k.t}.` : `I didn't have anything about that${k.t}.`);
    }
    if (/\bwhat do you (?:remember|know about me)\b|\beverything you remember\b|\bmy notes\b/.test(t)) {
      if (!st.memory.length) return R(`Nothing saved yet${k.t}. Say “remember my locker is 42”.`);
      return R(`Here's what you told me${k.t}:<ul>${st.memory.slice(-10).reverse().map((m) => `<li>${esc(cap(me2you(m.fact)))}</li>`).join('')}</ul>`, `You told me: ${st.memory.slice(-5).map((m) => me2you(m.fact)).join('. ')}.`);
    }
    const words = kw(t);
    let best = null, bs = 0;
    for (const m of st.memory) { const f = kw(m.fact); const s = words.filter((w) => f.some((x) => x === w || (w.length > 3 && (x.startsWith(w) || w.startsWith(x))))).length; if (s > bs || (s === bs && s > 0)) { best = m; bs = s; } }
    if (best && bs > 0) return R(`You told me${k.t}: <b>${esc(me2you(best.fact))}</b>.`, `You told me ${me2you(best.fact)}.`);
    return null;
  }

  // =====================================================================================
  // TIMERS
  // =====================================================================================
  function timerA(k, t) {
    if (/\b(cancel|stop|clear|delete|kill)\b.*\btimers?\b/.test(t)) { const n = st.timers.length; st.timers = []; save(); return R(n ? `Timer${n > 1 ? 's' : ''} cancelled${k.t}.` : `No timers running${k.t}.`); }
    const m = t.match(new RegExp('\\b' + NUMRE + '\\s*(?:and a half\\s+)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)\\b'));
    if (m && /\b(timer|set|start|count|countdown)\b/.test(t)) {
      let n = num(m[1].replace(/ of$/, '')) || 1;
      if (/and a half/.test(m[0])) n += 0.5;
      const ms = n * (/^s/.test(m[2]) ? 1000 : /^h/.test(m[2]) ? 3600e3 : 60e3);
      const label = (t.match(/\bfor (?:the |my )?([a-z ]+?)(?:\s+for|\s+in|$)/) || [])[1];
      const lab = label && !/\b(minutes?|seconds?|hours?|\d)\b/.test(label) ? label.trim() : '';
      st.timers.push({ end: k.now + ms, label: lab, ms }); save();
      const words = Sessions.countdownWords(ms);
      return R(`⏱ Timer set for <b>${words}</b>${lab ? ` — ${esc(lab)}` : ''}${k.t}. Done at ${clock(k.now + ms, k.tz)}. I'll chime when it's up (keep the app open).`, `Timer set for ${words}${k.t}.`);
    }
    if (!st.timers.length) return R(`No timer running${k.t}. Say “set a timer for 10 minutes”.`);
    return R(st.timers.map((x) => `⏱ ${x.label ? esc(cap(x.label)) + ': ' : ''}<b>${Sessions.countdownWords(Math.max(0, x.end - k.now))}</b> left`).join('<br>'), st.timers.map((x) => `${Sessions.countdownWords(Math.max(0, x.end - k.now))} left${x.label ? ' on ' + x.label : ''}`).join('. ') + '.');
  }

  // Things that pop up while the app is open: finished timers, water reminders
  // "undo that", "scratch that", "I didn't", "that was wrong" → take back the last thing logged (within 10 minutes)
  function undoA(k) {
    const a = lastAction;
    if (!a || Date.now() - a.at > 10 * 60e3) return R(`There's nothing recent to undo${k.t}.`);
    lastAction = null;
    if (a.type === 'water') { st.water[a.data.day] = Math.max(0, (st.water[a.data.day] || 0) - a.data.n); save(); return R(`Undone — took off ${a.data.n} glass${a.data.n === 1 ? '' : 'es'}${k.t}. Now ${st.water[a.data.day]} today.`); }
    if (a.type === 'waterRemove') { st.water[a.data.day] = (st.water[a.data.day] || 0) + a.data.n; save(); return R(`Undone — put back ${a.data.n} glass${a.data.n === 1 ? '' : 'es'}${k.t}. Now ${st.water[a.data.day]} today.`); }
    if (a.type === 'habit') { const h = st.habits.find((x) => x.name === a.data.name); if (h) { h.days = h.days.filter((d) => d !== a.data.day); save(); } return R(`Undone — unchecked ${esc(a.data.name)}${k.t}.`); }
    if (a.type === 'money') { const x = st.money.pop(); save(); return R(x ? `Undone — removed ${usd(x.amt)} on ${esc(x.what)}${k.t}.` : `Nothing to undo${k.t}.`); }
    if (a.type === 'todo') { const it = st.todos.find((x) => x.text === a.data.text && x.done); if (it) { it.done = false; save(); } return R(`Undone — ${esc(a.data.text)} is back on your list${k.t}.`); }
    if (a.type === 'sub') { if (a.data.old) { const i = st.subs.findIndex((x) => x.name === a.data.name); if (i >= 0) st.subs[i] = a.data.old; } else st.subs = st.subs.filter((x) => x.name !== a.data.name); save(); return R(`Undone — ${a.data.old ? 'put ' + esc(a.data.name) + ' back how it was' : 'removed ' + esc(a.data.name)}${k.t}.`); }
    return R(`Undone${k.t}.`);
  }
  function due(now, tz) {
    const out = [];
    const done = st.timers.filter((x) => x.end <= now);
    if (done.length) { st.timers = st.timers.filter((x) => x.end > now); save(); done.forEach((x) => out.push({ key: 'timer-' + x.end, text: `⏱ Time's up${x.label ? ' — ' + x.label : ''}!`, say: `Time's up${x.label ? ', ' + x.label : ''}.`, tag: 'TIMER', chime: true })); }
    // subscriptions & bills: a pop-up the day before (after 9 AM) and on the day
    if (st.subs.length) {
      const h = Sessions.parts(new Date(now), tz).h, kk = { now, tz };
      for (const x of st.subs) {
        const nd = nextDue(x, kk), days = Math.round((startOf(nd, tz, 0) - startOf(now, tz, 0)) / 864e5);
        if (h < 9 || days > 1) continue;
        const key = `${x.name}-${dayKey(nd, tz)}-${days}`;
        if (st.subPops[key]) continue;
        st.subPops[key] = now; const pk = Object.keys(st.subPops); while (pk.length > 60) delete st.subPops[pk.shift()];
        save();
        out.push({ key: 'sub-' + key, text: `💳 ${cap(x.name)}${x.amt != null ? ' — ' + usd(x.amt) : ''} ${days === 0 ? 'is due today' : 'is due tomorrow'}.`, say: `Heads up, ${x.name}${x.amt != null ? ', ' + sayUsd(x.amt) + ',' : ''} is due ${days === 0 ? 'today' : 'tomorrow'}.` });
      }
    }
    if (st.waterRemind) {
      const h = Sessions.parts(new Date(now), tz).h;
      if (h >= 9 && h < 21 && now - st.lastWaterPop > 2 * 3600e3) {
        const first = !st.lastWaterPop;
        st.lastWaterPop = now; save();
        if (!first) { const have = st.water[dayKey(now, tz)] || 0; out.push({ key: 'water-' + now, text: `💧 Water break — ${have} of ${st.waterGoal} glasses so far today.`, say: `Time for some water. You've had ${have} glasses today.`, tag: 'WATER' }); }
      }
    }
    return out;
  }

  // =====================================================================================
  // CONVERSATION — vibe, outfit, books, movies, food, quotes, small talk
  // =====================================================================================
  const BOOKS = [
    ['Trading in the Zone', 'Mark Douglas', 'the mindset book every trader should read'],
    ['The Daily Trading Coach', 'Brett Steenbarger', '101 short lessons on trader psychology'],
    ['Market Wizards', 'Jack Schwager', 'interviews with legendary traders'],
    ['Reminiscences of a Stock Operator', 'Edwin Lefèvre', 'a classic story about a famous speculator'],
    ['Atomic Habits', 'James Clear', 'tiny habits, big results'],
    ['Can\'t Hurt Me', 'David Goggins', 'mental toughness, straight up'],
    ['The Psychology of Money', 'Morgan Housel', 'short chapters on how people think about money'],
    ['Deep Work', 'Cal Newport', 'how to focus in a distracted world'],
    ['Project Hail Mary', 'Andy Weir', 'a fun sci-fi survival story'],
    ['Dune', 'Frank Herbert', 'the sci-fi epic'],
    ['The Alchemist', 'Paulo Coelho', 'short, simple and inspiring'],
    ['Meditations', 'Marcus Aurelius', 'calm, discipline and perspective'],
    ['Ready Player One', 'Ernest Cline', 'a fast, fun read'],
    ['The 48 Laws of Power', 'Robert Greene', 'strategy and human nature'],
  ];
  const MOVIES = [
    ['The Big Short', 'markets, comedy, true story'], ['Margin Call', 'a tense night inside a Wall Street bank'], ['Interstellar', 'space, time and big feelings'],
    ['Inception', 'dreams inside dreams'], ['The Social Network', 'how Facebook started'], ['Top Gun: Maverick', 'pure adrenaline'], ['The Martian', 'science your way out of trouble'],
    ['Dune: Part Two', 'huge sci-fi spectacle'], ['Ford v Ferrari', 'speed and grit'], ['Moneyball', 'beating the odds with numbers'], ['Rocky', 'the classic comeback'],
    ['Spider-Man: Into the Spider-Verse', 'stunning and fun'], ['The Pursuit of Happyness', 'never give up'], ['Ex Machina', 'smart, quiet sci-fi'], ['Oppenheimer', 'big, serious history'],
  ];
  const SHOWS = [['Billions', 'hedge funds and power games'], ['Severance', 'weird and gripping'], ['Arcane', 'beautiful animated action'], ['The Bear', 'chaos in a kitchen'], ['Ted Lasso', 'feel-good comedy'], ['Breaking Bad', 'the all-time great'], ['Silo', 'sci-fi mystery'], ['Industry', 'young bankers in London']];
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
  function booksA(k, t) {
    let list = BOOKS;
    if (/\b(trad|market|money|invest|finance)/.test(t)) list = BOOKS.slice(0, 4).concat([BOOKS[6]]);
    else if (/\b(fiction|novel|sci ?fi|story|fun)\b/.test(t)) list = BOOKS.filter((b) => /sci-fi|story|read/.test(b[2]));
    else if (/\b(self help|habit|mindset|motivat|discipline)/.test(t)) list = [BOOKS[4], BOOKS[5], BOOKS[7], BOOKS[11], BOOKS[0]];
    const s = shuffle(list).slice(0, 3);
    return R(`A few books${k.t}:<ul>${s.map((b) => `<li><b>${esc(b[0])}</b> by ${esc(b[1])} <span class="dim">— ${esc(b[2])}</span></li>`).join('')}</ul><span class="dim">Ask again for different picks, or say “trading books” / “fiction books”.</span>`,
      `Try ${s.map((b) => `${b[0]} by ${b[1]}`).join(', or ')}${k.t}.`);
  }
  function moviesA(k, t) {
    const shows = /\b(show|shows|series|binge|tv)\b/.test(t);
    let list = shows ? SHOWS : MOVIES;
    if (!shows && /\b(trad|money|market|wall street|finance)/.test(t)) list = MOVIES.filter((m) => /market|Wall|numbers|Facebook/.test(m[1]));
    if (!shows && /\b(sci ?fi|space|future)\b/.test(t)) list = MOVIES.filter((m) => /space|sci-fi|dream|science/.test(m[1]));
    if (!shows && /\b(motivat|inspir)/.test(t)) list = MOVIES.filter((m) => /never|comeback|odds|grit/.test(m[1]));
    const s = shuffle(list).slice(0, 3);
    return R(`${shows ? 'Shows' : 'Movies'} worth a watch${k.t}:<ul>${s.map((m) => `<li><b>${esc(m[0])}</b> <span class="dim">— ${esc(m[1])}</span></li>`).join('')}</ul>`, `How about ${s.map((m) => m[0]).join(', ')}${k.t}?`);
  }
  const FOOD = { breakfast: ['eggs and toast', 'Greek yogurt with fruit and granola', 'oatmeal with peanut butter and banana', 'a protein smoothie'], lunch: ['a chicken wrap', 'a rice bowl with chicken and veggies', 'a turkey sandwich and fruit', 'a big salad with grilled chicken'], dinner: ['salmon, rice and broccoli', 'tacos', 'steak and potatoes', 'pasta with chicken', 'a stir fry', 'homemade burgers'], snack: ['a handful of almonds', 'apple and peanut butter', 'a protein bar', 'Greek yogurt'] };
  function foodA(k, t) {
    const meal = /breakfast/.test(t) ? 'breakfast' : /lunch/.test(t) ? 'lunch' : /dinner|supper/.test(t) ? 'dinner' : /snack/.test(t) ? 'snack' : k.hour < 11 ? 'breakfast' : k.hour < 15 ? 'lunch' : k.hour < 21 ? 'dinner' : 'snack';
    const s = shuffle(FOOD[meal]).slice(0, 3);
    return R(`For ${meal}${k.t}: <b>${s.join('</b>, <b>')}</b>.`, `For ${meal}, maybe ${s.join(', or ')}${k.t}.`);
  }
  const QUOTES = ['Discipline is choosing between what you want now and what you want most.', 'The goal of a successful trader is to make the best trades. Money is secondary.', 'Small daily improvements are the key to staggering long-term results.', 'Plan the trade. Trade the plan.', 'You don\'t have to be great to start, but you have to start to be great.', 'The market rewards patience and punishes impulse.', 'Hard choices, easy life. Easy choices, hard life.', 'Cut your losses short and let your winners run.', 'Do the work. Every day. Especially when you don\'t feel like it.', 'Protect your capital first — profits come second.', 'It always seems impossible until it\'s done.', 'A calm mind makes better decisions.'];
  function quoteA(k) { const q = pick('q', QUOTES); return R(`“${esc(q)}”`, q); }
  async function wx(ctx) { try { return ctx.weather ? await ctx.weather(null) : null; } catch { return null; } }
  function wearA(k, ctx, t) {
    return wx(ctx).then((w) => {
      if (!w) return R(`I can't see the weather right now${k.t}. Set your city in Settings ⚙ and I'll tell you what to wear.`);
      const c = w.d.current, dl = w.d.daily, tmr = /tomorrow/.test(t) ? 1 : 0;
      const temp = tmr ? Math.round((dl.temperature_2m_max[1] + dl.temperature_2m_min[1]) / 2) : Math.round(c.apparent_temperature);
      const hi = Math.round(dl.temperature_2m_max[tmr]), lo = Math.round(dl.temperature_2m_min[tmr]), rain = dl.precipitation_probability_max[tmr];
      let fit;
      if (temp >= 85) fit = 'shorts and a light t-shirt — breathable stuff';
      else if (temp >= 72) fit = 't-shirt and shorts or light pants';
      else if (temp >= 62) fit = 't-shirt with a light layer, like a hoodie or overshirt';
      else if (temp >= 50) fit = 'jeans and a hoodie or light jacket';
      else if (temp >= 38) fit = 'a warm jacket, long sleeves and jeans';
      else fit = 'a heavy coat, layers, and maybe a beanie and gloves';
      const extra = [];
      if (rain >= 50 || Weather.wet(tmr ? dl.weather_code[1] : c.weather_code)) extra.push(`bring an umbrella or rain jacket (${rain}% rain)`);
      if (hi - lo >= 20) extra.push(`it swings from ${lo}° to ${hi}°, so layers help`);
      if (temp >= 80) extra.push('sunglasses and water');
      return R(`${tmr ? 'Tomorrow' : 'Right now'} it ${tmr ? 'should be' : 'feels like'} <b>${temp}°</b> in ${esc(w.place)}. I'd go with <b>${fit}</b>${extra.length ? '. Also: ' + extra.join('; ') : ''}.`,
        `It ${tmr ? 'should be' : 'feels like'} ${temp} degrees${k.t}. I'd go with ${fit}${extra.length ? '. Also, ' + extra.join(', and ') : ''}.`);
    });
  }
  function vibeA(k, ctx, t) {
    const night = /\btonight|evening|night\b/.test(t) || k.hour >= 18;
    return wx(ctx).then((w) => {
      const parts = [], says = [];
      const g = k.g;
      if (w) {
        const code = w.d.current.weather_code, temp = Math.round(w.d.current.apparent_temperature), wet = Weather.wet(code);
        const v = wet ? (night ? 'cozy night in' : 'rainy, chill, lo-fi kind of day') : temp >= 80 ? (night ? 'warm night — good for getting out' : 'hot and sunny — high energy') : temp <= 45 ? (night ? 'cold night — hoodie and a movie' : 'crisp and cold — coffee weather') : (night ? 'calm, easy evening' : 'nice and easy — good day to get things done');
        parts.push(`Vibe: <b>${v}</b> (${temp}°, ${Weather.word(code)}).`); says.push(`The vibe is ${v}, ${temp} degrees.`);
      }
      if (g && k.market.open) { const b = g.bias.bias; const mv = b === 'Bullish' ? 'gold is leaning up' : b === 'Bearish' ? 'gold is leaning down' : 'gold is undecided — choppy'; parts.push(`Market: ${mv}.`); says.push(`Market wise, ${mv}.`); }
      else if (k.market.state === 'weekend') { parts.push('Market: closed — weekend mode. 😎'); says.push('Markets are closed, so it\'s weekend mode.'); }
      const day = k.weekday;
      const dv = /Friday/.test(day) ? (night ? 'Friday night — you earned it.' : 'Friday energy — finish strong.') : /Monday/.test(day) ? 'Monday — fresh start, set the tone.' : /Saturday|Sunday/.test(day) ? 'Weekend — recharge.' : night ? 'Wind down, prep for tomorrow.' : 'Mid-week — stay locked in.';
      parts.push(dv); says.push(dv);
      const hd = st.habits.filter((h) => !h.days.includes(dayKey(k.now, k.tz)));
      if (hd.length && !night) { parts.push(`<span class="dim">Habits still open: ${hd.map((h) => esc(h.name)).join(', ')}.</span>`); }
      return R(parts.join(' '), says.join(' '));
    });
  }
  function myDayA(k) {
    const lines = [
      `Pretty good${k.t}. I've been watching gold, keeping your reminders safe, and waiting for you to say hi.`,
      `Busy in a good way${k.t} — charts, levels, and a little bit of weather watching.`,
      `Smooth so far${k.t}. No complaints from the circuits.`,
      `Good, thanks for asking${k.t}. Better now that you're here. How's yours going?`,
    ];
    const s = Paper && botStatus(k);
    let extra = '';
    if (s && s.open) extra = ' I\'m in a trade right now, actually — ask “how’s your trade”.';
    else if (s && s.closed.length) { const pl = s.closed.reduce((a, h) => a + h.pl, 0); extra = pl >= 0 ? ' My trade today went well, too.' : ' My trade today didn\'t work out, but that\'s trading.'; }
    const l = pick('myday', lines) + extra;
    return R(l, l);
  }
  const TALK = {
    whatdoing: [`Just keeping an eye on gold and waiting for you${'{t}'}.`, `Watching the charts and running diagnostics${'{t}'}. The usual.`],
    real: [`I'm as real as code gets${'{t}'}. No AI — just rules, numbers and a lot of care.`, `Real enough to watch gold for you 24/7${'{t}'}.`],
    love: [`Appreciate you${'{t}'}. I've got your back.`, `Right back at you${'{t}'}.`, `That means a lot${'{t}'}. Now let's have a good day.`],
    compliment: [`Thank you${'{t}'}. Just doing my job.`, `I try${'{t}'}. You make it easy.`],
    bored: [`Let's fix that${'{t}'}. Quick workout, a book, a movie, or a trading challenge — pick one.`, `Bored? Try a 10-minute walk, or ask me for a movie${'{t}'}.`],
    hungry: [`Ask me “what should I eat” and I'll give you ideas${'{t}'}. Also — drink some water first.`],
    sleepy: [`Maybe a short nap or an early night${'{t}'}. Ask me “what time should I go to sleep”.`],
    favorite: [`My favorite thing? A clean break of a key level with the bias${'{t}'}.`, `Gold, obviously${'{t}'}.`],
    sup: [`Not much${'{t}'} — watching gold. What's up with you?`, `All quiet on my end${'{t}'}. What do you need?`],
    sorry: [`No worries at all${'{t}'}.`, `All good${'{t}'}.`],
    yes: [`Got it${'{t}'}.`], no: [`Okay${'{t}'}.`],
    nice: [`Love it${'{t}'}.`, `Nice${'{t}'}.`],
    age: [`I'm still young${'{t}'} — my birthday is November 11th, 2026.`],
  };
  function talkA(k, key) { const l = pick('talk-' + key, TALK[key]).replace(/\{t\}/g, k.t); return R(l, l); }

  // =====================================================================================
  // MORNING ROUTINE
  // =====================================================================================
  function morningA(k, ctx) {
    return wx(ctx).then((w) => {
      const H = [], S = [];
      const hi = k.hour < 12 ? 'Good morning' : k.hour < 17 ? 'Good afternoon' : 'Good evening';
      H.push(`<b>${hi}${k.t}.</b> Here's your rundown:`); S.push(`${hi}${k.t}. Here's your rundown.`);
      const a = sleepAvg(k); const last = st.sleep[st.sleep.length - 1];
      if (last && k.now - last.wake < 6 * 3600e3) { const h = Math.round((last.wake - last.bed) / 360e3) / 10; H.push(`😴 Sleep: ${h} hours.`); S.push(`You slept ${h} hours.`); }
      if (w) { const c = w.d.current, dl = w.d.daily; H.push(`🌤 ${Math.round(c.temperature_2m)}° and ${Weather.word(c.weather_code)}, high ${Math.round(dl.temperature_2m_max[0])}°, ${dl.precipitation_probability_max[0]}% rain.`); S.push(`It's ${Math.round(c.temperature_2m)} degrees and ${Weather.word(c.weather_code)}, high of ${Math.round(dl.temperature_2m_max[0])}.`); }
      if (k.g && k.market.open) { H.push(`📈 Gold <b>${k.g.price.bid.toFixed(2)}</b>, bias <b>${k.g.bias.bias.toUpperCase()}</b>.`); S.push(`Gold is at ${Math.round(k.g.price.bid)}, bias ${k.g.bias.bias.toLowerCase()}.`); }
      else if (k.market.state === 'weekend') { H.push('📈 Markets closed for the weekend.'); S.push('Markets are closed.'); }
      const N = k.news && k.news.today ? k.news.today() : null;
      if (N && N.length) { H.push(`📰 ${N.length} big news event${N.length > 1 ? 's' : ''} today.`); S.push(`${N.length} news events today.`); }
      const rems = (k.reminders ? k.reminders.all() : []).filter((r) => r.due && r.due - k.now < 16 * 3600e3);
      if (rems.length) { H.push(`⏰ Reminders: ${rems.map((r) => esc(r.text)).join(', ')}.`); S.push(`Reminders: ${rems.map((r) => r.text).join(', ')}.`); }
      const open = st.todos.filter((x) => !x.done);
      if (open.length) { H.push(`📝 To-do: ${open.slice(0, 4).map((x) => esc(x.text)).join(', ')}${open.length > 4 ? '…' : ''}.`); S.push(`${open.length} things on your list, starting with ${open[0].text}.`); }
      if (st.habits.length) { H.push(`✅ Habits: ${st.habits.map((h) => esc(h.name)).join(', ')}.`); S.push(`Habits today: ${st.habits.map((h) => h.name).join(', ')}.`); }
      const cds = st.countdowns.map((c) => ({ c, n: daysTo(k, c.date) })).filter((x) => x.n >= 0 && x.n <= 30).sort((p, q) => p.n - q.n);
      if (cds.length) { H.push(`⏳ ${cds[0].n} days until ${esc(cds[0].c.name)}.`); S.push(`${cds[0].n} days until ${cds[0].c.name}.`); }
      H.push(`💧 Start with a glass of water. <span class="dim">“${pick('qm', QUOTES)}”</span>`); S.push('Start with a glass of water.');
      return R(H.join('<br>'), S.join(' '));
    });
  }

  // Short line added to the app-open greeting (countdown that's today, timers that finished)
  function greetLine(k) {
    const today = st.countdowns.find((c) => daysTo(k, c.date) === 0);
    if (today) return { html: `🎉 Today is <b>${esc(today.name)}</b>!`, say: `Today is ${today.name}!` };
    return null;
  }

  // =====================================================================================
  // ROUTING — scores for what you said. Matches on the raw words (before spelling fixes).
  // =====================================================================================
  const PHRASES = {
    bot: ['how did your trade go', 'how is your trade', 'did you trade today', 'what did you trade', 'jarvis trade', 'your position', 'are you in a trade', 'how much did you make today'],
    botStats: ['your record', 'your stats', 'how are your trades doing', 'jarvis win rate', 'how good are your trades'],
    water: ['how much water', 'drank water', 'water today', 'log water', 'glass of water', 'hydration'],
    habit: ['my habits', 'habit tracker', 'my streaks', 'add habit', 'did my habit'],
    sleepQ: ['what time should i sleep', 'when should i go to bed', 'what time should i go to sleep', 'bedtime', 'when to sleep'],
    sleep: ['how did i sleep', 'sleep stats', 'how much sleep', 'sleep tracker', 'going to bed'],
    money: ['how much did i spend', 'my spending', 'money tracker', 'i spent', 'expenses'],
    todo: ['my to do list', 'my list', 'what do i need to do', 'todo list', 'tasks today', 'what is on my list'],
    countdown: ['my countdowns', 'how many days until', 'countdown', 'days left until'],
    memory: ['what do you remember', 'what did i tell you', 'do you remember'],
    timer: ['set a timer', 'how much time is left', 'timer'],
    morning: ['morning routine', 'start my day', 'morning briefing', 'morning rundown', 'daily briefing', 'brief me on my day'],
    vibe: ['whats the vibe', 'vibe today', 'vibe tonight', 'what kind of day is it', 'mood of the day'],
    wear: ['what should i wear', 'do i need a jacket', 'outfit today', 'what to wear', 'is it hoodie weather'],
    books: ['any books to read', 'book recommendation', 'what should i read', 'good books'],
    movies: ['any movies to watch', 'what should i watch', 'movie recommendation', 'good movies', 'shows to watch'],
    food: ['what should i eat', 'dinner ideas', 'what should i make for dinner', 'lunch ideas', 'im hungry what should i eat'],
    quote: ['daily quote', 'give me a quote', 'motivate me', 'motivation', 'inspire me', 'quote of the day'],
    myday: ['hows your day', 'how was your day', 'how is your day going', 'how has your day been', 'hows your day going'],
    best: ['best trade', 'worst trade', 'biggest win', 'biggest loss'],
    tchal: ['trading challenge', 'give me a trading challenge', 'how am i doing on the challenge', 'trade challenge'],
    mood: ['check in', 'how have i been feeling', 'my mood'],
  };
  const pw = (s) => s.replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  function phraseMatch(t) {
    const tw = pw(t.replace(/'/g, ''));
    if (!tw.length) return null;
    let best = null, bs = 0;
    for (const [id, list] of Object.entries(PHRASES)) for (const p of list) {
      const w = pw(p); const hit = w.filter((x) => tw.includes(x)).length;
      const s = hit / Math.max(w.length, Math.min(tw.length, w.length + 2));
      if (s > bs) { bs = s; best = id; }
    }
    return bs >= 0.6 ? best : null;
  }

  function score(text, fixed, S, k) {
    const t = ' ' + String(text || '').toLowerCase().replace(/[’‘]/g, "'") + ' ';
    const out = {};
    const set = (id, v) => { if (v > (out['life:' + id] || 0)) out['life:' + id] = v; };
    const hasPaper = typeof Paper !== 'undefined';
    // JARVIS's own trade
    if (/\b(your|ur)\s+(trade|trades|position|positions|p ?l|pnl|order)\b|\b(did|have) you (trade|take a trade|traded|take any trades?)\b|\bhow did (you|jarvis) (do|trade|go)\b|\bjarvis'?s? (trade|trades|position)\b|\bare you in a trade\b|\bwhat did you (trade|take)\b|\bhow much did you (make|lose)\b/.test(t)) set(/\b(record|stats|win ?rate|history|all your|overall)\b/.test(t) ? 'botStats' : 'bot', 9.7);
    if (/\b(your|jarvis'?s?)\b.*\b(record|stats|win ?rate|track record)\b/.test(t)) set('botStats', 9.7);
    // partials
    if (hasPaper && Paper.positions().length && /\b(partials?|partial close|scale out|close half|take half|close (?:a |one )?(?:third|quarter)|take (?:some )?profits? off|take some off|close \d+|take \d+ off|close (?:out )?\d+ (?:contracts?|units?|lots?))\b/.test(t)) set('partial', 9.75);
    // best / worst
    if (/\b(best|worst|biggest|largest)\b.*\b(trade|trades|win|winner|loss|loser)\b/.test(t)) set('best', 9.3);
    // trading challenge
    if (/\bchallenge\b/.test(t) && /\b(trad|trades|chart|market|paper)\w*/.test(t)) set('tchal', 9.1);
    if (/\bhow am i doing on (the|my) challenge\b|\bchallenge (progress|status)\b/.test(t)) set('tchal', 9.1);
    // water
    if (/\bwater\b/.test(t) && !/\bweather\b/.test(t)) set('water', /\b(drank|drink|drinking|had|log|add|how much|glass|glasses|cups?|bottles?|goal|reminders?|hydrat)/.test(t) ? 9.85 : 5);
    if (/\bhydrat/.test(t)) set('water', 7);
    // habits
    if (/\bhabits?\b|\bstreaks?\b/.test(t)) set('habit', 9.2);
    if (/\btrack\b.*\bas a habit\b/.test(t)) set('habit', 9.6);
    if (typeof habitFind === 'function' && st.habits.length && /\b(i|just)\s+(did|finished|completed|done|worked out|read|meditated|journaled|walked|ran|stretched|prayed|studied|went to the gym|hit the gym)\b/.test(t) && habitFind(t)) set('habit', 9.3);
    // moods
    if (/\b(i feel|i'm feeling|im feeling|i am feeling|feeling|i'm|im|i am)\s+(?:so |really |pretty |very |kinda |a bit |a little )?(great|amazing|awesome|fantastic|good|happy|fine|okay|ok|alright|meh|tired|exhausted|stressed|anxious|sad|down|frustrated|angry|mad|bored|sick|lazy|motivated|focused|excited|nervous)\b/.test(t) && !/\bwhat|should|if\b/.test(t)) set('mood', 6.5);
    if (/^\s*(daily )?check ?in\s*$|\bcheck in with me\b|\bhow have i been feeling\b|\bmy moods?\b|\bmood history\b/.test(t)) set('mood', 8);
    // sleep
    if (/\b(what time|when) should i (go to (bed|sleep)|sleep|head to bed)\b|\bwhat time (to|should i) (go to )?(bed|sleep)\b|\bwhen to (go to )?(bed|sleep)\b|\bif i (wake|get) up at\b|\bbed ?time\b.*\b(wake|tonight|should)\b|\bsleep calculator\b/.test(t)) set('sleepQ', 9.6);
    if (/\b(how did i sleep|how much (did i )?sleep|sleep (stats|tracker|log|average|history)|my sleep)\b/.test(t)) set('sleep', 9.4);
    if (/\bslept\b.*\b(from|hours?)\b|\b(got|had) \S+ hours? of sleep\b/.test(t)) set('sleep', 9.5);
    if (/\b(going to bed|going to sleep|heading to bed|off to bed|hitting the hay|about to sleep|time for bed|good ?night|(?:about to|gonna|going to|time to|ready to|bout to) (?:go to |head to )?(?:bed|sleep)|hit(?:ting)? the (?:sack|hay)|calling it a night|out for the night)\b/.test(t) && !/\b(what time|when should|remind)\b/.test(t)) set('sleep', 5.5);
    if (/\b(i'?m up|i am up|just woke up|i woke up|i'?m awake)\b/.test(t) && st.bedAt) set('sleep', 8);
    // money
    if ((/\b(i )?(spent|paid|dropped|blew|wasted)\s+\$?\d|\$\d+(\.\d+)? (on|for|at)\b|\b(bought|got|grabbed|ordered)\b.+\bfor\s+\$?\d/.test(t) || parseSpend(t.trim())) && !/\bremind\b|\b(every|a month|monthly|per month|a year|yearly|subscription|due on)\b/.test(t)) set('money', 9.5);
    if (/\bbudgets?\b/.test(t)) set('money', 9.6);
    if (/\bsubscriptions?\b|\bsubs\b|\bmy bills\b|\bbills?\b.*\b(due|coming|next|this week)\b|\b(netflix|spotify|hulu|disney plus|youtube premium|apple music|amazon prime|xbox game pass|ps plus|tradingview|chatgpt)\b|\b(every|a|per) (month|year|week)\b.*\d|\d.*\b(a|per|every) (month|year|week)\b|\bmonthly\b.*\d|\b(rent|insurance|car payment|phone bill|internet bill|electric bill)\b.*\b(due|is|costs?|\d)/.test(t) && !/\b(spent|budget|budgets)\b/.test(t) && !/\b(gold|trade|bias|water|glass|workout|habit|remind)\b/.test(t)) set('subs', 9.65);
    if (/\bhow much (did|have) i (spend|spent)\b|\bmy (spending|expenses)\b|\bmoney tracker\b|\bspending (this|today|last)\b|\bundo (the )?last expense\b/.test(t)) set('money', 9.5);
    // to-do
    if (/(?<!\b(?:going|gonna|want|have|got|need|supposed|trying|about|what|you|it|i|we) )\b(to ?do|todo|todos)\b|\b(on|to|from|off) my list\b|\bmy list\b|\bwhat('?s| is) on (my|the) list\b|\bwhat do i (need|have) to do\b|\b(check|cross|tick) off\b/.test(t) && !/\bremind\b/.test(t)) set('todo', 9.3);
    if (/^\s*(add|put)\s+.+\s+(to|on)\s+(my|the)\s+(list|to ?do)/.test(t)) set('todo', 9.9);
    // countdowns
    if (/\bcount ?downs?\b/.test(t) && !/\btimer\b/.test(t)) set('countdown', 9.3);
    if (/\b(how many|how long) (days|weeks|until|till|til|before)\b.*\b(until|till|til|to|before)\b|\bdays (until|till|til|left until)\b/.test(t)) set('countdown', 9.2);
    // a subscription you already saved, by name: "claude is 20 dollars", "when is netflix due", "netflix went up"
    if (st.subs.some((x) => new RegExp('\\b' + x.name + '\\b').test(t)) && !/\b(spent|dropped|bought)\b/.test(t)) set('subs', 9.95);
    // an item already on your list: "done with eggs", "uncheck eggs", "remove eggs"
    if (st.todos.some((x) => x.text.length > 2 && t.includes(x.text)) && /\b(done|finished|got|bought|check|cross|tick|uncheck|unmark|untick|remove|delete|erase|drop|put back|not done|complete|completed)\b/.test(t)) set('todo', 9.9);
    // memory
    if (/\bforget\b/.test(t) && st.memory.length && !/\bshortcut\b/.test(t)) set('memory', 9.65);
    if (/\b(undo|scratch that|take that back|never ?mind that|that was wrong|that'?s wrong|i didn'?t|i did not)\b/.test(t) && lastAction && Date.now() - lastAction.at < 10 * 60e3 && t.trim().split(' ').length <= 6 && !/\b(drink|read|work|spend|spent|habit|glass|water)\b/.test(t)) set('undo', 9.9);
    if (/^\s*(please )?(remember|note|keep in mind)\b(?! to\b)/.test(t) && !/\bremember when\b/.test(t)) set('memory', 9.7);
    if (/\bwhat('?s| is| was) my\b|\bwhat did i (tell|say)\b|\bdo you remember\b|\bwhat do you (remember|know about me)\b|\bforget (that|about)\b|\bwhere('?s| is| did i)\b.*\bmy\b/.test(t) && st.memory.length) {
      const words = kw(t);
      if (/\bwhat do you remember|know about me|forget\b/.test(t) || st.memory.some((m) => kw(m.fact).some((w) => words.includes(w)))) set('memory', 9.6);
    }
    // timers
    if (/\btimers?\b/.test(t) || (/\b(set|start)\b.*\b\d+\s*(minutes?|mins?|seconds?|secs?|hours?)\b/.test(t) && !/\bremind/.test(t))) set('timer', 9.6);
    // morning routine
    if (/\bmorning (routine|briefing|brief|rundown|report|update)\b|\bstart (my|the) day\b|\b(daily|day) (rundown|briefing)\b|\bbrief me on (my|the) day\b/.test(t)) set('morning', 9.4);
    // conversation
    if (/\bvibes?\b/.test(t)) set('vibe', 9);
    if (/\bwhat (should|do|can) i wear\b|\bwhat to wear\b|\boutfit\b|\b(do|will) i need (a |an )?(jacket|coat|hoodie|sweater|umbrella|shorts)\b|\b(hoodie|jacket|shorts|coat) weather\b|\bshould i wear\b/.test(t)) set('wear', 9.4);
    if (/\b(how|what)('?s| is| does)? (it )?(feel(ing)?|like) (like )?outside\b|\bfeel(ing)? like outside\b|\bwhat('?s| is) it like outside\b|\bhow('?s| is) it outside\b|\bis it (hot|cold|warm|chilly|nice|raining|sunny) (out|outside)\b|\bweather looking\b|\bwhat('?s| is) the weather (looking|like)\b/.test(t)) out.weather = 9.3;
    if (/\bbooks?\b|\bwhat should i read\b|\bsomething to read\b|\bnovels?\b/.test(t) && !/\b(order|book a)\b/.test(t)) set('books', 9);
    if (/\bmovies?\b|\bfilms?\b|\bwhat should i watch\b|\bsomething to watch\b|\b(tv )?shows? to (watch|binge)\b|\bnetflix\b|\bbinge\b/.test(t)) set('movies', 9);
    if (/\bwhat should i (eat|make|cook|have for)\b|\b(dinner|lunch|breakfast|snack|meal|food) (ideas?|suggestions?)\b|\bwhat('?s| is) for (dinner|lunch|breakfast)\b|\bi'?m hungry\b.*\bwhat\b/.test(t)) set('food', 9);
    if (/\b(quote|motivate me|motivation|inspire me|inspiration|pep talk|words of wisdom)\b/.test(t)) set('quote', 8.8);
    if (/\bhow('?s| is| was| has) (your|ur) (day|morning|afternoon|evening|night)( going| been)?\b|\bhow are things (with you|going)\b|\bhow('?s| is) life\b/.test(t)) set('myday', 9);
    if (/\bwhat are you (doing|up to)\b/.test(t)) set('t:whatdoing', 8);
    if (/\bare you (real|alive|human|a robot|an ai)\b/.test(t)) set('t:real', 8);
    if (/\bi love you\b|\blove you jarvis\b|\byou'?re my (guy|boy|best friend)\b/.test(t)) set('t:love', 8);
    if (/\byou'?re (the best|awesome|amazing|great|smart|cool|goated)\b|\bgood job\b|\bnice work\b|\bwell done\b/.test(t)) set('t:compliment', 7);
    if (/\bi'?m bored\b|\bi am bored\b|\bso bored\b/.test(t)) set('t:bored', 8);
    if (/\bi'?m (so )?(hungry|starving)\b/.test(t) && !out['life:food']) set('t:hungry', 7);
    if (/\bi'?m (so )?(sleepy)\b/.test(t)) set('t:sleepy', 7);
    if (/\b(your|ur) favou?rite\b/.test(t)) set('t:favorite', 7);
    if (/^\s*(what'?s up|wassup|whats good|sup|wsg|what'?s good)\s*(jarvis)?\s*$/.test(t)) set('t:sup', 8);
    if (/^\s*(sorry|my bad|my fault)\b/.test(t)) set('t:sorry', 6);
    if (/\bhow old are you\b|\byour age\b/.test(t)) set('t:age', 8);
    // nothing strong? try the phrase list
    const top = Math.max(0, ...Object.values(S || {}), ...Object.values(out));
    if (top < 3.5) { const pm = phraseMatch(t.trim()); if (pm) set(pm, 3.6); }
    return out;
  }

  function run(id, text, fixed, k, ctx) {
    const t = String(text || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
    const c = () => ctx;
    switch (id) {
      case 'bot': return botA(k);
      case 'botStats': return botStatsA(k);
      case 'partial': return partialA(k, t);
      case 'best': return bestWorstA(k, t);
      case 'tchal': return tradeChallengeA(k, t);
      case 'water': return waterA(k, t);
      case 'habit': return habitA(k, t);
      case 'mood': return moodA(k, t) || R(`How are you feeling${k.t}?`);
      case 'sleepQ': return bedtimeA(k, t);
      case 'sleep': return sleepA(k, t) || R(`Morning${k.t}!`);
      case 'money': return moneyA(k, t);
      case 'subs': return subsA(k, t);
      case 'undo': return undoA(k);
      case 'todo': return todoA(k, t);
      case 'countdown': return countdownA(k, t);
      case 'memory': return memoryA(k, t, text) || R(`I don't remember anything about that${k.t}. Say “remember …” to teach me.`);
      case 'timer': return timerA(k, t);
      case 'morning': return morningA(k, c());
      case 'vibe': return vibeA(k, c(), t);
      case 'wear': return wearA(k, c(), t);
      case 'books': return booksA(k, t);
      case 'movies': return moviesA(k, t);
      case 'food': return foodA(k, t);
      case 'quote': return quoteA(k);
      case 'myday': return myDayA(k);
      default: if (id.startsWith('t:')) return talkA(k, id.slice(2));
    }
    return null;
  }

  const subsList = () => st.subs.map((x) => ({ ...x }));
  function removeSub(name) { st.subs = st.subs.filter((x) => x.name !== name); save(); }
  function clearSubs() { st.subs = []; save(); }
  return { subsList, removeSub, clearSubs, score, run, due, greetLine, botTick, botCatchUp, cloudSync, cloudInfo: () => ({ ...cloud }), botStatus, tradeDay, state: () => st, reload: () => { st = load(); } };
})();
