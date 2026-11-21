// v22: JARVIS learns from every trade, real AND practice ("shadow") ones.
//
// How it works, in plain words:
//   • Every setup is described by tags: which way the bias is, whether the 4H / daily agree, how much
//     room there is, if it's a late entry, which session (Asia / London / NY morning / NY afternoon), buy or sell.
//   • After EVERY closed trade each tag's record moves right away. Older results fade a little each time,
//     so recent trades count more. Real trades count fully; practice trades count half.
//   • Losing streaks on the same pattern push hard: 3 real losses in a row = a big nudge.
//   • The result is a confidence adjustment: JARVIS raises (or lowers) the score a setup needs before it trades.
//   • It only fully BLOCKS a pattern once enough practice trades confirm it's genuinely bad — so one bad day
//     can't make it scared of a good setup (that's chasing noise).
//   • Every real loss gets a review: why it most likely lost, saved next to the trade for the calendar.
const Learn = (() => {
  const DECAY = 0.92;          // each new result on a tag shrinks the old ones by 8%
  const W = { real: 1, shadow: 0.5 };
  const MAX_SHADOWS = 40;      // practice trades being watched at once
  const SHADOW_GAP = 60 * 60e3; // at most one practice trade per direction per hour

  const fresh = () => ({ v: 1, tags: {}, shadows: [], log: [], seen: { real: 0, shadow: 0 } });
  const ensure = (L) => (L && L.v === 1 ? L : fresh());

  const NAMES = {
    bias_with: 'trading with the 1H bias', flip_with: 'a flip building our way', flip_against: 'a flip pending against us',
    h4_agree: '4H trend agreeing', h4_against: 'going against the 4H trend', d_agree: 'daily trend agreeing', d_against: 'going against the daily trend',
    room_big: 'plenty of room to the next level', room_some: 'some room to the next level', room_tight: 'trading right into a level',
    late: 'late entries (range mostly used)', timing_bad: 'bad timing flags',
    'sess:asia': 'Asia hours', 'sess:london': 'London hours', 'sess:ny_am': 'New York morning', 'sess:ny_pm': 'New York afternoon',
    'dir:buy': 'buys', 'dir:sell': 'sells',
  };
  const name = (t) => NAMES[t] || t;

  // turn the trade score's factor list into stable tags
  function tagsFrom(factors, dir, mins) {
    const t = [];
    for (const x of factors || []) {
      const h = x.html || '';
      if (/^1H bias is .* with you/.test(h)) t.push('bias_with');
      else if (/flip is building/.test(h)) t.push(x.pts > 0 ? 'flip_with' : 'flip_against');
      else if (/flip is pending/.test(h)) t.push('flip_against');
      else if (/^4H trend agrees/.test(h)) t.push('h4_agree');
      else if (/^4H trend is/.test(h)) t.push('h4_against');
      else if (/^Daily trend agrees/.test(h)) t.push('d_agree');
      else if (/^Daily trend is/.test(h)) t.push('d_against');
      else if (/right into it/.test(h)) t.push('room_tight');
      else if (/of room to/.test(h)) t.push('room_big');
      else if (/some room/.test(h)) t.push('room_some');
      else if (/late entry/.test(h)) t.push('late');
      else if (x.pts < 0) t.push('timing_bad');
    }
    const s = mins >= 18 * 60 || mins < 3 * 60 ? 'asia' : mins < 8 * 60 ? 'london' : mins < 11 * 60 + 30 ? 'ny_am' : 'ny_pm';
    t.push('sess:' + s, dir > 0 ? 'dir:buy' : 'dir:sell');
    return [...new Set(t)];
  }

  // a tag's smoothed edge, -1 (always loses) … +1 (always wins). The +2 keeps a couple of results from swinging it to the extreme.
  const edge = (s) => (s.w - s.l) / (s.w + s.l + 2);

  function record(L, tags, win, kind, at) {
    const w = W[kind] || 0.5;
    for (const t of tags) {
      const s = L.tags[t] || (L.tags[t] = { w: 0, l: 0, sw: 0, sl: 0, streak: 0, at: 0 });
      s.w *= DECAY; s.l *= DECAY;
      if (win) s.w += w; else s.l += w;
      if (kind === 'shadow') { if (win) s.sw++; else s.sl++; }
      if (kind === 'real') s.streak = win ? Math.max(1, s.streak + 1) : Math.min(-1, s.streak - 1);
      s.w = Math.round(s.w * 1000) / 1000; s.l = Math.round(s.l * 1000) / 1000; s.at = at;
    }
    L.seen[kind] = (L.seen[kind] || 0) + 1;
  }

  // How much harder (+) or easier (−) a setup with these tags should be to take, plus a hard block if proven bad.
  function adjust(L, tags) {
    L = ensure(L);
    let sum = 0, n = 0, worst = null, best = null, streakHit = null, block = null;
    for (const t of tags) {
      const s = L.tags[t]; if (!s || s.w + s.l < 0.5) continue;
      const e = edge(s); sum += e; n++;
      if (!worst || e < worst.e) worst = { t, e };
      if (!best || e > best.e) best = { t, e };
      if (s.streak <= -3 && (!streakHit || s.streak < streakHit.s)) streakHit = { t, s: s.streak };
      const sn = s.sw + s.sl;
      // only block once practice trades back it up: ≥ 8 of them and under 25% winners, and the real record isn't positive
      if (sn >= 8 && s.sw / sn < 0.25 && e < 0 && !block) block = { t, why: `${name(t)} has won only ${s.sw} of ${sn} practice trades` };
    }
    const avg = n ? sum / n : 0;
    let extra = Math.round(-avg * 3);              // average edge −0.33 → +1 needed, +0.33 → −1
    if (streakHit) extra += 1;                      // 3 straight real losses on a pattern = big nudge
    extra = Math.max(-1, Math.min(3, extra));       // never lower the bar by more than 1
    let why = '';
    if (block) why = `blocked: ${block.why}`;
    else if (extra > 0) why = `being pickier (+${extra}) because of ${name((streakHit || worst).t)}`;
    else if (extra < 0) why = `a bit more confident (−1) thanks to ${name(best.t)}`;
    return { extra, block: !!block, why, avg: Math.round(avg * 100) / 100 };
  }

  // ---- practice trades ----
  function addShadow(L, s) {
    const recent = L.shadows.find((x) => x.dir === s.dir && s.at - x.at < SHADOW_GAP);
    if (recent || !(Math.abs(s.entry - s.sl) > 0)) return false;
    L.shadows.push(s);
    while (L.shadows.length > MAX_SHADOWS) L.shadows.shift();
    return true;
  }
  // candles: 5-min bid/ask candles { t, bh, bl, ah, al }. Same rule as real trades: if both are touched in one candle, assume the stop.
  function resolveShadows(L, candles, now, endOf) {
    const done = [];
    for (const s of L.shadows) {
      let res = null;
      for (const c of candles) {
        if (c.t + 300e3 <= s.at) continue;
        if (c.t >= endOf(s.day)) { res = 'expired'; break; }
        if (s.dir > 0) { if (c.bl <= s.sl) res = 'loss'; else if (c.bh >= s.tp) res = 'win'; }
        else { if (c.ah >= s.sl) res = 'loss'; else if (c.al <= s.tp) res = 'win'; }
        if (res) break;
      }
      if (!res && now >= endOf(s.day)) res = 'expired';
      if (res) done.push([s, res]);
    }
    for (const [s, res] of done) {
      L.shadows.splice(L.shadows.indexOf(s), 1);
      if (res !== 'expired') record(L, s.tags, res === 'win', 'shadow', now);
    }
    return done.length;
  }

  // ---- why did a real trade lose (or win)? ----
  function review(t) {
    const R = Math.abs(t.entry - t.sl) || 1, tags = t.tags || [];
    const bestR = t.best == null ? null : ((t.best - t.entry) * t.dir) / R;
    const toTp = Math.abs(t.tp - t.entry) / R;
    const r = [];
    if (t.reason === 'tp') {
      if (tags.includes('d_agree') && tags.includes('h4_agree')) r.push('all timeframes lined up');
      if (tags.includes('room_big')) r.push('it had room to run');
      if (tags.some((x) => /sess:(london|ny_am)/.test(x))) r.push('traded in prime hours');
      return { win: true, reasons: r.length ? r : ['the setup played out'] };
    }
    if (tags.includes('d_against') || tags.includes('h4_against')) r.push('went against the bigger trend');
    if (tags.includes('room_tight')) r.push('traded right into a level');
    if (tags.includes('late')) r.push('late entry, most of the day\'s range was used');
    if (tags.includes('sess:asia')) r.push('Asia hours, thin market');
    if (tags.includes('flip_against')) r.push('a bias flip was already building the other way');
    if (bestR != null && bestR >= toTp * 0.5) r.push('it was working, then reversed (target may have been too far)');
    else if (bestR != null && bestR < 0.25) r.push('it never really went our way (entry or direction was off)');
    if (!r.length) r.push('nothing obvious; the market just went the other way');
    return { win: false, reasons: r, pending: t.reason === 'stop' }; // pending: check later if price hit the target anyway
  }
  // after a stop: did price reach the target within 3 hours? Then the stop was too tight.
  function lateCheck(t, candles) {
    for (const c of candles) {
      if (c.t < t.closedAt) continue;
      if (c.t > t.closedAt + 3 * 3600e3) break;
      if (t.dir > 0 ? c.bh >= t.tp : c.al <= t.tp) return true;
    }
    return false;
  }

  // a short report for the app: what JARVIS has learned so far
  function summary(L) {
    L = ensure(L);
    const rows = Object.entries(L.tags).filter(([, s]) => s.w + s.l >= 1).map(([t, s]) => ({ t, name: name(t), e: edge(s), n: s.sw + s.sl, streak: s.streak }));
    rows.sort((a, b) => b.e - a.e);
    return { good: rows.filter((r) => r.e > 0.15).slice(0, 3), bad: rows.filter((r) => r.e < -0.15).slice(-3).reverse(), seen: L.seen, watching: L.shadows.length, log: L.log.slice(-10) };
  }

  return { fresh, ensure, tagsFrom, record, adjust, addShadow, resolveShadows, review, lateCheck, summary, name, edge };
})();
if (typeof module !== 'undefined') module.exports = Learn;
