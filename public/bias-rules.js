// ============================================================================
//  JARVIS — GOLD BIAS RULES
//  This is the ONLY file you need to edit to change how the bias is decided.
//
//  HOW IT WORKS (so you always know what it's doing)
//  1. Only CLOSED 1-hour candles are judged. The live price never votes, so a
//     candle flickering up or down can't change the bias.
//  2. Each rule compares the candle's close to one level. The close must be
//     clearly past the level (more than the BUFFER) to count. Inside the buffer
//     the rule says "too close to call" and gives no vote.
//  3. Majority wins: more bullish votes = Bullish, more bearish = Bearish,
//     equal = Neutral.
//  4. The bias only CHANGES after the new reading holds for CONFIRM_CANDLES
//     closed candles in a row. Until then the dashboard shows "flip pending".
//
//  All prices are BID prices, the same as TradingView's OANDA:XAUUSD chart.
// ============================================================================

const BIAS_SETTINGS = {
  emaPeriod: 50,        // EMA length on the 1H chart
  atrPeriod: 14,        // ATR length on the 1H chart (used for the buffer)
  bufferAtr: 0.2,       // buffer = this x 1H ATR. 0.2 = 20% of an average hourly candle. 0 = no buffer
  confirmCandles: 2,    // closed 1H candles in a row needed before the bias flips. 1 = flip immediately
};

// ---- The rules --------------------------------------------------------------
// Each rule names a level. Close clearly above it = bullish vote, clearly below = bearish.
// To switch a rule off: enabled: false.  To add one: copy a block and change level().
// Values available in level(c):
//   c.dailyOpen  c.prevHigh  c.prevLow  c.prevClose  c.prevMid  c.ema  (EMA of the 1H closes)
const BIAS_RULES = [
  { name: 'Daily open',              label: 'the daily open',          enabled: true, level: (c) => c.dailyOpen },
  { name: '50 EMA (1H)',             label: 'the 1H 50 EMA',           enabled: true, level: (c) => c.ema },
  { name: "Previous day's midpoint", label: "yesterday's midpoint",    enabled: true, level: (c) => c.prevMid },
];

// ============================================================================
//  Engine — you normally don't need to touch anything below this line.
// ============================================================================
const BiasEngine = (() => {
  function emaSeries(values, period) {
    const out = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = ema;
    for (let i = period; i < values.length; i++) out[i] = ema = values[i] * k + ema * (1 - k);
    return out;
  }

  function atrSeries(candles, period) {
    const out = new Array(candles.length).fill(null);
    const tr = candles.map((c, i) => (i === 0 ? c.h - c.l : Math.max(c.h - c.l, Math.abs(c.h - candles[i - 1].c), Math.abs(c.l - candles[i - 1].c))));
    if (candles.length < period) return out;
    let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = atr;
    for (let i = period; i < candles.length; i++) out[i] = atr = (atr * (period - 1) + tr[i]) / period;
    return out;
  }

  // daily: candles on the 5pm-NY day. Returns the day a timestamp belongs to + the day before.
  function dayContext(daily, t) {
    let idx = -1;
    for (let i = 0; i < daily.length; i++) if (daily[i].t <= t) idx = i;
    if (idx < 1) return null;
    const d = daily[idx], p = daily[idx - 1];
    return { dailyOpen: d.o, prevHigh: p.h, prevLow: p.l, prevClose: p.c, prevMid: (p.h + p.l) / 2 };
  }

  const majority = (bull, bear) => (bull > bear ? 'Bullish' : bear > bull ? 'Bearish' : 'Neutral');

  // Judge one closed candle
  function judge(close, ctx, buffer) {
    const rules = BIAS_RULES.filter((r) => r.enabled !== false);
    let bull = 0, bear = 0;
    const results = rules.map((r) => {
      let level = null;
      try { level = r.level(ctx); } catch {}
      if (level == null || !isFinite(level)) return { name: r.name, label: r.label, level: null, vote: 0, dist: null, state: 'n/a' };
      const dist = close - level;
      let vote = 0, state = 'close';
      if (dist > buffer) { vote = 1; state = 'above'; bull++; }
      else if (dist < -buffer) { vote = -1; state = 'below'; bear++; }
      return { name: r.name, label: r.label, level, vote, dist, state };
    });
    return { bias: majority(bull, bear), bullish: bull, bearish: bear, total: rules.length, rules: results };
  }

  // h1: all 1H candles (oldest first, last may be incomplete). daily: daily candles.
  // Replays the last `lookback` closed candles to find the confirmed bias, how long it has held
  // and whether a flip is pending. Deterministic: same data => same answer on every device.
  function evaluate({ h1, daily, livePrice, lookback = 72 }) {
    const S = BIAS_SETTINGS;
    const closed = h1.filter((c) => c.complete);
    if (closed.length < S.emaPeriod + 5) throw new Error('Not enough 1H candles to judge the bias');
    const ema = emaSeries(closed.map((c) => c.c), S.emaPeriod);
    const atr = atrSeries(closed, S.atrPeriod);
    const need = Math.max(1, S.confirmCandles | 0);

    const start = Math.max(S.emaPeriod, closed.length - lookback);
    let confirmed = null, since = null, pending = null, history = [];
    let last = null;
    for (let i = start; i < closed.length; i++) {
      const c = closed[i];
      const ctx = dayContext(daily, c.t);
      if (!ctx) continue;
      ctx.ema = ema[i];
      const buffer = (atr[i] || 0) * S.bufferAtr;
      const j = judge(c.c, ctx, buffer);
      const closeTime = c.t + 3600e3;
      last = { candle: c, closeTime, ctx, buffer, atr: atr[i], judged: j };
      history.push({ closeTime, raw: j.bias });

      if (confirmed === null) { confirmed = j.bias; since = null; continue; } // start of the replay window
      if (j.bias === confirmed) { pending = null; continue; }
      if (pending && pending.to === j.bias) pending.count++;
      else pending = { to: j.bias, count: 1, firstAt: closeTime };
      if (pending.count >= need) { confirmed = j.bias; since = pending.firstAt; pending = null; }
    }
    if (!last) throw new Error('Not enough daily candles to judge the bias');

    // live distances (information only, never votes)
    const liveCtx = { ...last.ctx };
    const live = BIAS_RULES.filter((r) => r.enabled !== false).map((r) => {
      let level = null;
      try { level = r.level(liveCtx); } catch {}
      return { name: r.name, level, dist: level == null || livePrice == null ? null : livePrice - level };
    });

    return {
      bias: confirmed,
      since,                                   // ms timestamp, null = held for the whole lookback window
      sinceWindowStart: closed[start] ? closed[start].t : null,
      pending: pending ? { to: pending.to, count: pending.count, need } : null,
      lastClose: last.candle.c,
      lastCloseTime: last.closeTime,
      nextCheck: last.closeTime + 3600e3,
      buffer: last.buffer,
      atr: last.atr,
      raw: last.judged,                        // what the last closed candle said
      live,
      settings: { ...S },
      history: history.slice(-24),
    };
  }

  return { evaluate, emaSeries, atrSeries };
})();
