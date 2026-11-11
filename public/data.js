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
    try {
      r = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
    } catch (e) {
      throw new Error('Can’t reach OANDA — check your internet connection');
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
    const [d, h] = await Promise.all([
      oanda('candles', { granularity: 'D', count: 12, price: 'B', alignmentTimezone: 'America/New_York', dailyAlignment: 17 }),
      oanda('candles', { granularity: 'H1', count: 300, price: 'B' }),
    ]);
    return { daily: d.candles.map(toCandle), h1: h.candles.map(toCandle) };
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
      for (let i = 299; i >= 0; i--) {
        const o = px, c = o + (rand() - 0.49) * 8;
        h1.push({ t: hourStart - i * 3600e3, complete: i > 0, o, h: Math.max(o, c) + rand() * 3, l: Math.min(o, c) - rand() * 3, c });
        px = c;
      }
      // group into 24h "days" ending at the current hour block
      const daily = [];
      for (let k = 11; k >= 0; k--) {
        const slice = h1.slice(Math.max(0, h1.length - (k + 1) * 24), h1.length - k * 24);
        if (!slice.length) continue;
        daily.push({ t: slice[0].t, complete: k > 0, o: slice[0].o, h: Math.max(...slice.map((x) => x.h)), l: Math.min(...slice.map((x) => x.l)), c: slice[slice.length - 1].c });
      }
      live = px;
      return { daily, h1 };
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
  let candleCache = null, candleAt = 0;
  const CANDLE_TTL = 60000;

  async function snapshot({ forceCandles = false } = {}) {
    const m = await mode();
    let price, candles;
    if (m === 'demo') {
      price = demo.price();
      candles = demo.candles();
    } else {
      const needCandles = forceCandles || !candleCache || Date.now() - candleAt > CANDLE_TTL ||
        // refresh right after each hour closes so the bias updates on time
        Math.floor(Date.now() / 3600e3) !== Math.floor(candleAt / 3600e3);
      [price, candles] = await Promise.all([fetchPrice(), needCandles ? fetchCandles() : Promise.resolve(candleCache)]);
      if (needCandles) { candleCache = candles; candleAt = Date.now(); }
    }
    const { daily, h1 } = candles;

    let todayIdx = daily.findIndex((c) => !c.complete);
    if (todayIdx === -1) todayIdx = daily.length - 1;
    const today = daily[todayIdx], prev = daily[todayIdx - 1];
    if (!today || !prev) throw new Error('Not enough daily candles from OANDA');

    const bias = BiasEngine.evaluate({ h1, daily, livePrice: price.bid });
    const closes = h1.map((c) => c.c);
    if (h1.length && !h1[h1.length - 1].complete) closes[closes.length - 1] = price.bid; else closes.push(price.bid);
    const change = price.bid - prev.c;

    return {
      mode: m,
      env: m === 'direct' ? (loadCreds().env || 'practice') : m,
      price,
      dailyOpen: today.o,
      dayHigh: Math.max(today.h, price.bid),
      dayLow: Math.min(today.l, price.bid),
      prevClose: prev.c,
      prevMid: (prev.h + prev.l) / 2,
      change,
      changePct: (change / prev.c) * 100,
      sparkline: closes.slice(-48),
      bias,
      at: Date.now(),
    };
  }

  // Check a key before saving it
  async function testCreds(c) {
    const h = { Authorization: `Bearer ${c.key}` };
    await getJson(`${host(c.env)}/v3/accounts/${encodeURIComponent(c.account)}/pricing?instruments=${INSTRUMENT}`, h);
    return true;
  }

  return { snapshot, mode, loadCreds, saveCreds, clearCreds, testCreds, detectServer, resetCache: () => { candleCache = null; } };
})();
