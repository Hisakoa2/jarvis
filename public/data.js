// ============================================================================
//  JARVIS data layer. Gets gold data from OANDA in one of three ways:
//   1. DIRECT  — key saved on this device (Settings). Used on the iPhone / GitHub Pages.
//   2. SERVER  — the PC server adds the key from .env (Run JARVIS.bat at home).
//   3. DEMO    — no key anywhere: simulated prices, clearly labelled.
//  All prices are BID, to match TradingView's OANDA:XAUUSD chart.
// ============================================================================
const Data = (() => {
  const INSTRUMENT = 'XAU_USD';
  const STORE_KEY = 'jarvis.oanda';

  // ---- settings saved on this device --------------------------------------
  function loadCreds() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
  }
  function saveCreds(c) { localStorage.setItem(STORE_KEY, JSON.stringify(c)); }
  function clearCreds() { localStorage.removeItem(STORE_KEY); }

  let serverAvailable = null; // null = unknown
  async function detectServer() {
    if (serverAvailable !== null) return serverAvailable;
    try {
      const r = await fetch('api/status', { cache: 'no-store' });
      const s = r.ok ? await r.json() : null;
      serverAvailable = !!(s && s.proxy);
    } catch { serverAvailable = false; }
    return serverAvailable;
  }

  async function mode() {
    const c = loadCreds();
    if (c && c.key && c.account) return 'direct';
    if (await detectServer()) return 'server';
    return 'demo';
  }

  const host = (env) => (env === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com');

  async function getJson(url, headers) {
    let r;
    // one automatic retry for network blips and OANDA server hiccups (5xx)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        r = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
        if (r.status < 500 || attempt === 1) break;
      } catch (e) {
        if (attempt === 1) throw new Error('Can’t reach OANDA — check your internet connection');
      }
      await new Promise((res) => setTimeout(res, 800));
    }
    let body = null;
    try { body = await r.json(); } catch {}
    if (!r.ok) {
      let msg = (body && (body.errorMessage || body.error)) || `HTTP ${r.status}`;
      if (r.status === 401) msg += ' — check the API key, and that Practice/Live matches the account';
      if (r.status === 400 || r.status === 403 || r.status === 404) msg += ' — check the account ID, and that Practice/Live matches it';
      throw new Error(msg);
    }
    return body;
  }

  // OANDA call, either direct or via the PC server
  async function oanda(kind, params) {
    const m = await mode();
    if (m === 'direct') {
      const c = loadCreds();
      const h = { Authorization: `Bearer ${c.key}`, 'Accept-Datetime-Format': 'RFC3339' };
      if (kind === 'pricing') return getJson(`${host(c.env)}/v3/accounts/${encodeURIComponent(c.account)}/pricing?instruments=${INSTRUMENT}`, h);
      if (kind === 'summary') return getJson(`${host(c.env)}/v3/accounts/${encodeURIComponent(c.account)}/summary`, h);
      return getJson(`${host(c.env)}/v3/instruments/${INSTRUMENT}/candles?${new URLSearchParams(params)}`, h);
    }
    return getJson(`api/oanda/${kind}?${new URLSearchParams(params || {})}`);
  }

  const toCandle = (c) => ({ t: Date.parse(c.time), complete: c.complete, o: +c.bid.o, h: +c.bid.h, l: +c.bid.l, c: +c.bid.c });

  async function fetchPrice() {
    const d = await oanda('pricing');
    const p = d.prices && d.prices[0];
    if (!p) throw new Error('OANDA returned no price for XAU_USD');
    const bid = parseFloat(p.closeoutBid || p.bids[0].price);
    const ask = parseFloat(p.closeoutAsk || p.asks[0].price);
    return { bid, ask, spread: ask - bid, time: Date.parse(p.time), tradeable: p.tradeable !== false && p.status !== 'non-tradeable' };
  }

  async function fetchCandles() {
    const ny = { price: 'B', alignmentTimezone: 'America/New_York', dailyAlignment: 17 };
    const [d, h, h4] = await Promise.all([
      oanda('candles', { granularity: 'D', count: 120, ...ny }),
      oanda('candles', { granularity: 'H1', count: 300, price: 'B' }),
      oanda('candles', { granularity: 'H4', count: 200, ...ny }),
    ]);
    return { daily: d.candles.map(toCandle), h1: h.candles.map(toCandle), h4: h4.candles.map(toCandle) };
  }

  // Account balance (read-only) for position sizing. Never fails the snapshot.
  async function fetchSummary() {
    try {
      const a = (await oanda('summary')).account;
      return { balance: +a.balance, nav: +a.NAV, unrealizedPL: +a.unrealizedPL, openTrades: a.openTradeCount, currency: a.currency };
    } catch { return null; }
  }

  // ---- demo data -----------------------------------------------------------
  const demo = (() => {
    let built = null, live = null;
    function build() {
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const hourStart = Math.floor(Date.now() / 3600e3) * 3600e3;
      const h1 = [];
      let px = 2650;
      for (let i = 1439; i >= 0; i--) {
        const o = px, c = o + (rand() - 0.49) * 8;
        h1.push({ t: hourStart - i * 3600e3, complete: i > 0, o, h: Math.max(o, c) + rand() * 3, l: Math.min(o, c) - rand() * 3, c });
        px = c;
      }
      // group into 24h "days" ending at the current hour block
      const daily = [];
      for (let k = 59; k >= 0; k--) {
        const slice = h1.slice(Math.max(0, h1.length - (k + 1) * 24), h1.length - k * 24);
        if (!slice.length) continue;
        daily.push({ t: slice[0].t, complete: k > 0, o: slice[0].o, h: Math.max(...slice.map((x) => x.h)), l: Math.min(...slice.map((x) => x.l)), c: slice[slice.length - 1].c });
      }
      live = px;
      const h4 = [];
      for (let i = 0; i + 4 <= h1.length; i += 4) {
        const sl = h1.slice(i, i + 4);
        h4.push({ t: sl[0].t, complete: true, o: sl[0].o, h: Math.max(...sl.map((x) => x.h)), l: Math.min(...sl.map((x) => x.l)), c: sl[3].c });
      }
      return { daily, h1, h4 };
    }
    return {
      candles() { if (!built) built = build(); return built; },
      price() {
        if (!built) built = build();
        live += (Math.random() - 0.5) * 0.8;
        const last = built.h1[built.h1.length - 1];
        last.c = live; last.h = Math.max(last.h, live); last.l = Math.min(last.l, live);
        return { bid: live, ask: live + 0.3, spread: 0.3, time: Date.now(), tradeable: true };
      },
    };
  })();

  // ---- public: one call that returns everything the dashboard needs --------
  let candleCache = null, candleAt = 0, summaryCache = null;
  const CANDLE_TTL = 60000;

  async function snapshot({ forceCandles = false, sessions = null } = {}) {
    const m = await mode();
    let price, candles;
    if (m === 'demo') {
      price = demo.price();
      candles = demo.candles();
    } else {
      const needCandles = forceCandles || !candleCache || Date.now() - candleAt > CANDLE_TTL ||
        // refresh right after each hour closes so the bias updates on time
        Math.floor(Date.now() / 3600e3) !== Math.floor(candleAt / 3600e3);
      [price, candles, summaryCache] = await Promise.all([
        fetchPrice(),
        needCandles ? fetchCandles() : Promise.resolve(candleCache),
        needCandles ? fetchSummary() : Promise.resolve(summaryCache),
      ]);
      if (needCandles) { candleCache = candles; candleAt = Date.now(); }
    }
    const { daily, h1, h4 } = candles;

    let todayIdx = daily.findIndex((c) => !c.complete);
    if (todayIdx === -1) todayIdx = daily.length - 1;
    const today = daily[todayIdx], prev = daily[todayIdx - 1];
    if (!today || !prev) throw new Error('Not enough daily candles from OANDA');

    const bias = BiasEngine.evaluate({ h1, daily, livePrice: price.bid });
    const closes = h1.map((c) => c.c);
    if (h1.length && !h1[h1.length - 1].complete) closes[closes.length - 1] = price.bid; else closes.push(price.bid);
    const change = price.bid - prev.c;
    const mtf = BiasEngine.mtf({ H1: h1, H4: h4, D: daily }, bias.bias);
    const dayHigh = Math.max(today.h, price.bid), dayLow = Math.min(today.l, price.bid);
    const emaRule = bias.raw.rules.find((r) => /EMA/.test(r.name));
    const levels = buildLevels({ daily, h1, todayIdx, price: price.bid, dayHigh, dayLow, ema: emaRule ? emaRule.level : null, sessions });

    return {
      mode: m,
      env: m === 'direct' ? (loadCreds().env || 'practice') : m,
      price,
      dailyOpen: today.o,
      dayHigh,
      dayLow,
      mtf,
      levels,
      account: m === 'demo' ? { balance: 10000, nav: 10000, unrealizedPL: 0, openTrades: 0, currency: 'USD', demo: true } : summaryCache,
      prevClose: prev.c,
      prevMid: (prev.h + prev.l) / 2,
      change,
      changePct: (change / prev.c) * 100,
      sparkline: closes.slice(-48),
      bias,
      at: Date.now(),
    };
  }

  // ---- key levels + daily range --------------------------------------------
  function buildLevels({ daily, h1, todayIdx, price, dayHigh, dayLow, ema, sessions }) {
    const today = daily[todayIdx], prev = daily[todayIdx - 1];
    const list = [
      { key: 'pdh', name: "yesterday's high", short: 'PDH', price: prev.h },
      { key: 'pdl', name: "yesterday's low", short: 'PDL', price: prev.l },
      { key: 'pdm', name: "yesterday's midpoint", short: 'PD MID', price: (prev.h + prev.l) / 2 },
      { key: 'do', name: 'the daily open', short: 'D OPEN', price: today.o },
    ];
    if (ema) list.push({ key: 'ema', name: 'the 1H 50 EMA', short: '50 EMA', price: ema });
    // weekly open = first daily candle after the weekend gap
    let w = todayIdx;
    while (w > 0 && daily[w].t - daily[w - 1].t < 36 * 3600e3) w--;
    list.push({ key: 'wo', name: 'the weekly open', short: 'W OPEN', price: daily[w].o });
    // Asia session range (most recent Asia session)
    const asia = sessions && sessions.sessions && sessions.sessions.find((x) => /asia|tokyo/i.test(x.name));
    if (asia && typeof Sessions !== 'undefined') {
      const win = Sessions.lastWindow(asia);
      const inAsia = win ? h1.filter((c) => c.t >= win.openAt && c.t < win.closeAt) : [];
      if (inAsia.length >= 2) {
        list.push({ key: 'ah', name: 'the Asia high', short: 'ASIA H', price: Math.max(...inAsia.map((c) => c.h)) });
        list.push({ key: 'al', name: 'the Asia low', short: 'ASIA L', price: Math.min(...inAsia.map((c) => c.l)) });
      }
    }
    // round numbers, like the Pine script: $10 steps, major every $50
    const below10 = Math.floor(price / 10) * 10, below50 = Math.floor(price / 50) * 50;
    list.push({ key: 'r50u', name: `the ${below50 + 50} level`, short: `$${below50 + 50}`, price: below50 + 50, round: 'major' });
    list.push({ key: 'r50d', name: `the ${below50} level`, short: `$${below50}`, price: below50, round: 'major' });
    if (below10 + 10 !== below50 + 50) list.push({ key: 'r10u', name: `the ${below10 + 10} level`, short: `$${below10 + 10}`, price: below10 + 10, round: 'minor' });
    if (below10 !== below50) list.push({ key: 'r10d', name: `the ${below10} level`, short: `$${below10}`, price: below10, round: 'minor' });

    for (const l of list) l.dist = price - l.price;
    list.sort((a, b) => b.price - a.price);
    const above = list.filter((l) => l.price > price).sort((a, b) => a.price - b.price);
    const below = list.filter((l) => l.price <= price).sort((a, b) => b.price - a.price);

    // average daily range over the last 14 complete days
    const done = daily.slice(0, todayIdx).slice(-14);
    const adr = done.length ? done.reduce((a, d) => a + (d.h - d.l), 0) / done.length : null;
    const range = dayHigh - dayLow;
    return { list, above, below, resistance: above[0] || null, support: below[0] || null, adr, range, adrPct: adr ? (range / adr) * 100 : null };
  }

  // Check a key before saving it
  async function testCreds(c) {
    const h = { Authorization: `Bearer ${c.key}` };
    await getJson(`${host(c.env)}/v3/accounts/${encodeURIComponent(c.account)}/pricing?instruments=${INSTRUMENT}`, h);
    return true;
  }

  // 5-minute bid/ask candles since a time — used by paper trading to see if a stop or
  // take profit was hit while the app was closed. Demo mode has none.
  async function candlesSince(fromMs) {
    if ((await mode()) === 'demo') return [];
    const from = new Date(Math.max(fromMs, Date.now() - 16 * 86400e3)).toISOString();
    const r = await oanda('candles', { granularity: 'M5', from, count: 5000, price: 'BA' });
    return (r.candles || []).filter((c) => c.bid && c.ask).map((c) => ({ t: Date.parse(c.time), bh: +c.bid.h, bl: +c.bid.l, ah: +c.ask.h, al: +c.ask.l, bc: +c.bid.c, ac: +c.ask.c }));
  }

  return { candlesSince, snapshot, mode, loadCreds, saveCreds, clearCreds, testCreds, detectServer, resetCache: () => { candleCache = null; } };
})();
