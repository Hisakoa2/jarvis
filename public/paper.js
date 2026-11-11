// Paper trading — a pretend account that lives on this device only.
// Nothing is ever sent to OANDA. Prices come from the live feed, so fills, stops
// and take profits behave like the real thing:
//   • buys open at the ASK and close at the BID, sells open at the BID and close at the ASK
//   • 1 unit = 1 oz of gold, so a $1 move = $1 per unit (1 lot = 100 units)
//   • a stop or take profit fills at its own price
//   • when the app was closed, 5-minute candles are replayed to see what got hit
//     (if a stop and a target were both inside one candle, the stop is assumed — the safe guess)
const Paper = (() => {
  const KEY = 'jarvis.paper';
  const fresh = (bal = 100000) => ({ start: bal, balance: bal, positions: [], orders: [], history: [], events: [], lastCheck: Date.now(), nextId: 1 });
  let st = load();
  const listeners = [];

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && isFinite(s.balance)) return { ...fresh(), ...s }; } catch {}
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} listeners.forEach((f) => f()); }
  const r2 = (n) => Math.round(n * 100) / 100;

  const closePx = (p, bid, ask) => (p.side > 0 ? bid : ask);
  const pnlAt = (p, px) => r2(p.units * (px - p.entry) * p.side);
  const openPL = (bid, ask) => r2(st.positions.reduce((a, p) => a + pnlAt(p, closePx(p, bid, ask)), 0));

  function event(type, data) { st.events.push({ type, at: Date.now(), seen: false, ...data }); if (st.events.length > 40) st.events.shift(); }

  // ---- orders -----------------------------------------------------------------
  // side +1 buy / -1 sell. entry null = market. Returns { position } or { order }.
  function place({ side, units, entry = null, sl = null, tp = null, bid, ask, auto = false, style = 'day', note = '', bot = false }) {
    units = Math.max(1, Math.round(units));
    const mkt = side > 0 ? ask : bid;
    const base = { id: st.nextId++, side, units, sl: sl == null ? null : r2(sl), tp: tp == null ? null : r2(tp), auto, style, note, bot: !!bot };
    if (entry != null && Math.abs(entry - mkt) > 0.5) {
      // pending: limit if it's a better price than now, stop-entry if worse
      const type = side > 0 ? (entry < mkt ? 'limit' : 'stop') : (entry > mkt ? 'limit' : 'stop');
      const order = { ...base, entry: r2(entry), type, placedAt: Date.now() };
      st.orders.push(order);
      save();
      return { order };
    }
    const position = { ...base, entry: r2(mkt), openedAt: Date.now() };
    st.positions.push(position);
    save();
    return { position };
  }

  // An already-open trade from somewhere else (JARVIS's cloud trader) — opened at its own price and time.
  function adopt({ side, units, entry, sl = null, tp = null, openedAt = Date.now(), note = '', bot = true }) {
    const position = { id: st.nextId++, side, units: Math.max(1, Math.round(units)), sl: sl == null ? null : r2(sl), tp: tp == null ? null : r2(tp), auto: false, style: 'day', note, bot: !!bot, entry: r2(entry), openedAt };
    st.positions.push(position);
    save();
    return position;
  }
  // Close at an exact price/time (used when the cloud trader already closed it)
  function closeAt(id, px, reason = 'manual', at = Date.now()) { const h = close(id, px, reason, at); if (h) { st.history.sort((a, b) => b.closedAt - a.closedAt); save(); } return h; }

  function fill(order, px, at) {
    st.orders = st.orders.filter((o) => o !== order);
    const position = { id: order.id, side: order.side, units: order.units, sl: order.sl, tp: order.tp, auto: order.auto, style: order.style, note: order.note, bot: !!order.bot, entry: r2(px), openedAt: at };
    st.positions.push(position);
    event('filled', { side: order.side, units: order.units, entry: position.entry, bot: !!order.bot });
    return position;
  }

  function close(id, px, reason = 'manual', at = Date.now()) {
    const p = st.positions.find((x) => x.id === id);
    if (!p) return null;
    const pl = pnlAt(p, px);
    st.positions = st.positions.filter((x) => x !== p);
    st.balance = r2(st.balance + pl);
    const h = { id: p.id, side: p.side, units: p.units, entry: p.entry, exit: r2(px), sl: p.sl, tp: p.tp, pl, reason, openedAt: p.openedAt, closedAt: at, bot: !!p.bot };
    st.history.unshift(h);
    if (st.history.length > 200) st.history.pop();
    if (reason !== 'manual') event(reason, h);
    return h;
  }

  function closeAll(bid, ask, filter = () => true) {
    const out = [];
    for (const p of st.positions.filter(filter)) out.push(close(p.id, closePx(p, bid, ask)));
    save();
    return out;
  }
  function closeOne(id, bid, ask, reason = 'manual') {
    const p = st.positions.find((x) => x.id === id);
    if (!p) return null;
    const h = close(id, closePx(p, bid, ask), reason);
    save();
    return h;
  }

  // Add a finished trade straight to history (JARVIS's catch-up trade worked out from candles)
  function record({ side, units, entry, exit, sl, tp, reason, openedAt, closedAt, bot }) {
    const pl = r2(units * (exit - entry) * side);
    st.balance = r2(st.balance + pl);
    const h = { id: st.nextId++, side, units, entry: r2(entry), exit: r2(exit), sl: r2(sl), tp: r2(tp), pl, reason, openedAt, closedAt, bot: !!bot };
    st.history.push(h);
    st.history.sort((a, b) => b.closedAt - a.closedAt);
    if (st.history.length > 200) st.history.pop();
    save();
    return h;
  }
  // Close part of a trade (e.g. 20 of 50 units). The rest stays open.
  function partial(id, units, bid, ask) {
    const p = st.positions.find((x) => x.id === id);
    if (!p) return null;
    units = Math.round(units);
    if (units >= p.units) return closeOne(id, bid, ask);
    if (units < 1) return null;
    const px = closePx(p, bid, ask), pl = r2(units * (px - p.entry) * p.side);
    p.units -= units;
    st.balance = r2(st.balance + pl);
    const h = { id: p.id, side: p.side, units, entry: p.entry, exit: r2(px), sl: p.sl, tp: p.tp, pl, reason: 'partial', openedAt: p.openedAt, closedAt: Date.now(), bot: !!p.bot, left: p.units };
    st.history.unshift(h);
    if (st.history.length > 200) st.history.pop();
    save();
    return h;
  }
  function modify(id, { sl, tp }) {
    const p = st.positions.find((x) => x.id === id) || st.orders.find((x) => x.id === id);
    if (!p) return null;
    if (sl !== undefined) p.sl = sl == null ? null : r2(sl);
    if (tp !== undefined) p.tp = tp == null ? null : r2(tp);
    p.auto = false;
    save();
    return p;
  }
  function cancel(id) {
    const before = st.orders.length;
    st.orders = id == null ? [] : st.orders.filter((o) => o.id !== id);
    save();
    return before - st.orders.length;
  }

  // ---- price updates ------------------------------------------------------------
  // One bar of prices (or a single tick when high = low). Stops are checked before targets.
  function bar({ bh, bl, ah, al }, at) {
    for (const o of [...st.orders]) {
      if (at < o.placedAt) continue;
      const hit = o.side > 0 ? (o.type === 'limit' ? al <= o.entry : ah >= o.entry) : (o.type === 'limit' ? bh >= o.entry : bl <= o.entry);
      if (hit) fill(o, o.entry, at);
    }
    for (const p of [...st.positions]) {
      if (at < p.openedAt) continue;
      if (p.side > 0) {
        if (p.sl != null && bl <= p.sl) close(p.id, p.sl, p.sl >= p.entry ? 'stop_profit' : 'stop', at);
        else if (p.tp != null && bh >= p.tp) close(p.id, p.tp, 'tp', at);
      } else {
        if (p.sl != null && ah >= p.sl) close(p.id, p.sl, p.sl <= p.entry ? 'stop_profit' : 'stop', at);
        else if (p.tp != null && al <= p.tp) close(p.id, p.tp, 'tp', at);
      }
    }
  }
  function tick(bid, ask, at = Date.now()) {
    if (!st.positions.length && !st.orders.length) { st.lastCheck = at; return; }
    const n = st.events.length;
    bar({ bh: bid, bl: bid, ah: ask, al: ask }, at);
    st.lastCheck = at;
    save();
    return st.events.slice(n);
  }
  // Replay 5-minute candles since the last check (app was closed / phone asleep)
  function replay(candles) {
    if (!st.positions.length && !st.orders.length) return [];
    const n = st.events.length;
    for (const c of candles) {
      if (c.t + 300e3 <= st.lastCheck) continue;
      bar(c, c.t + 300e3 - 1);
      if (!st.positions.length && !st.orders.length) break;
    }
    if (candles.length) st.lastCheck = Math.max(st.lastCheck, candles[candles.length - 1].t);
    save();
    return st.events.slice(n);
  }

  // ---- account --------------------------------------------------------------------
  function reset(balance) {
    const b = Math.max(100, Math.round(+balance || st.start || 100000));
    st = fresh(b);
    save();
    return b;
  }
  function stats(bid, ask) {
    const wins = st.history.filter((h) => h.pl > 0).length, losses = st.history.filter((h) => h.pl < 0).length;
    const open = bid != null ? openPL(bid, ask) : 0;
    return {
      start: st.start, balance: st.balance, equity: r2(st.balance + open), openPL: open,
      realized: r2(st.balance - st.start), trades: st.history.length, wins, losses,
      winRate: wins + losses ? Math.round((wins / (wins + losses)) * 100) : null,
    };
  }
  function unseen() { return st.events.filter((e) => !e.seen); }
  function markSeen() { st.events.forEach((e) => { e.seen = true; }); save(); }

  return {
    place, closeAll, closeOne, partial, record, adopt, closeAt, modify, cancel, tick, replay, reset, stats, unseen, markSeen, pnlAt, closePx,
    positions: () => st.positions, orders: () => st.orders, history: () => st.history,
    lastCheck: () => st.lastCheck, busy: () => st.positions.length > 0 || st.orders.length > 0,
    onChange: (f) => listeners.push(f),
  };
})();
