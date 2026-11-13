// Trade calendar — your paper wins and losses by day. Tap a day to see its trades, tap a trade for
// every detail: entry, exit, stop and target (price and dollars), risk-to-reward, and how deep the
// trade went against you (drawdown) and how far it went for you (best profit) while it was open.
// Days follow the gold trading day: 6 PM → 5 PM New York, named by the day it ends on.
const TradeCal = (() => {
  const NY = 'America/New_York';
  const $ = (id) => document.getElementById(id);
  let month = null, dayOpen = null, tradeOpen = null, busy = false;

  const r2 = (n) => Math.round(n * 100) / 100;
  const f2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = (n) => `${n < 0 ? '−' : n > 0 ? '+' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const usdShort = (n) => { const a = Math.abs(n); return `${n < 0 ? '−' : '+'}$${a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k' : Math.round(a)}`; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dayKey = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: NY }).format(new Date(ms));
  const tradeDay = (ms) => dayKey(ms + 6 * 3600e3);
  const when = (ms) => new Intl.DateTimeFormat('en-US', { timeZone: NY, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(ms)) + ' ET';
  const long = (ms) => { const m = Math.round(ms / 60e3); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} hr`; };
  const REASON = { tp: 'Take profit hit', stop: 'Stop loss hit', stop_profit: 'Stopped out in profit', manual: 'Closed by you', partial: 'Partial close', session_end: 'Closed at the session end' };

  // ---- the numbers for one trade ----
  function facts(h) {
    const d = h.side, u = h.units;
    const slDist = h.sl != null ? (h.entry - h.sl) * d : null;     // + = risk, ≤0 = profit locked
    const tpDist = h.tp != null ? (h.tp - h.entry) * d : null;
    const rr = slDist > 0 && tpDist > 0 ? tpDist / slDist : null;
    const res = h.exit != null ? (h.exit - h.entry) * d : null;
    const dd = h.worst != null ? Math.max(0, (h.entry - h.worst) * d) : null;
    const up = h.best != null ? Math.max(0, (h.best - h.entry) * d) : null;
    return { slDist, tpDist, rr, res, R: res != null && slDist > 0 ? res / slDist : null, dd, up, u };
  }
  const rrTxt = (r) => `1:${r >= 10 ? Math.round(r) : Math.round(r * 10) / 10}`;

  // older trades don't have drawdown saved yet — work it out from 5-minute candles (last 16 days)
  async function fillExtremes(h) {
    if (h.worst != null && h.best != null) return false;
    if (typeof Data === 'undefined' || !h.openedAt || Date.now() - h.openedAt > 15.5 * 86400e3) return false;
    let cs = [];
    try { cs = await Data.candlesSince(h.openedAt - 300e3); } catch { return false; }
    const end = h.closedAt || Date.now();
    let worst = h.entry, best = h.entry;
    for (const c of cs) {
      if (c.t + 300e3 <= h.openedAt || c.t > end) continue;
      const adv = h.side > 0 ? c.bl : c.ah, fav = h.side > 0 ? c.bh : c.al;
      worst = h.side > 0 ? Math.min(worst, adv) : Math.max(worst, adv);
      best = h.side > 0 ? Math.max(best, fav) : Math.min(best, fav);
    }
    if (!cs.length) return false;
    // the stop / target caps what was possible
    if (h.reason === 'tp' && h.tp != null) best = h.tp;
    // a stop or target would have closed the trade, so price can't count past them
    if (h.tp != null) best = h.side > 0 ? Math.min(best, h.tp) : Math.max(best, h.tp);
    if (h.sl != null) worst = h.side > 0 ? Math.max(worst, h.sl) : Math.min(worst, h.sl);
    if (/^stop/.test(h.reason || '') && h.sl != null) worst = h.side > 0 ? Math.max(worst, h.sl) : Math.min(worst, h.sl);
    if (h.exit != null) { worst = h.side > 0 ? Math.min(worst, h.exit) : Math.max(worst, h.exit); best = h.side > 0 ? Math.max(best, h.exit) : Math.min(best, h.exit); }
    if (Paper.patchHistory) Paper.patchHistory(h, { worst: r2(worst), best: r2(best) }); else { h.worst = r2(worst); h.best = r2(best); }
    return true;
  }

  function byDay() {
    const m = {};
    for (const h of Paper.history()) { const k = tradeDay(h.closedAt); (m[k] = m[k] || []).push(h); }
    return m;
  }

  // ---- views ----
  function renderMonth() {
    const days = byDay(), [y, mo] = month;
    const first = new Date(Date.UTC(y, mo - 1, 1)), startDow = first.getUTCDay(), n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const today = tradeDay(Date.now()), pref = `${y}-${String(mo).padStart(2, '0')}-`;
    let net = 0, w = 0, l = 0, cells = '';
    for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= n; d++) {
      const key = pref + String(d).padStart(2, '0'), list = days[key] || [];
      const v = r2(list.reduce((a, h) => a + h.pl, 0));
      const open = key === today && Paper.positions().length;
      net += v; if (list.length) { if (v > 0) w++; else if (v < 0) l++; }
      cells += `<button type="button" class="cal-cell${list.length ? (v > 0 ? ' win' : v < 0 ? ' loss' : ' flat') : ''}${key === today ? ' today' : ''}" data-day="${key}"${list.length || open ? '' : ' disabled'}><span class="cal-d">${d}</span>${list.length ? `<b>${usdShort(v)}</b><small>${list.length} trade${list.length > 1 ? 's' : ''}</small>` : open ? '<small>open</small>' : ''}</button>`;
    }
    const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    $('calBody').innerHTML =
      `<div class="cal-nav"><button type="button" class="ghost-btn" data-nav="-1" aria-label="Previous month">‹</button><b>${title}</b><button type="button" class="ghost-btn" data-nav="1" aria-label="Next month">›</button></div>` +
      `<div class="cal-sum"><span>Month <b class="${net >= 0 ? 'up' : 'down'}">${usd(r2(net))}</b></span><span><b class="up">${w}</b> green day${w === 1 ? '' : 's'}</span><span><b class="down">${l}</b> red day${l === 1 ? '' : 's'}</span></div>` +
      `<div class="cal-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}${cells}</div>` +
      `<div class="dim small">Tap a day to see its trades. Days run 6 PM → 5 PM New York.</div>`;
  }

  function tradeRow(h, i, open) {
    const F = facts(h), side = h.side > 0 ? 'BUY' : 'SELL';
    const v = open ? null : h.pl;
    return `<button type="button" class="cal-trade ${h.side > 0 ? 'buy' : 'sell'}" data-t="${open ? 'o' : 'h'}${i}">` +
      `<span>${h.bot ? '<span class="bot-tag">JARVIS</span> ' : ''}<b>${side}</b> ${h.units} @ ${f2(h.entry)}<small>${when(h.openedAt)}${F.rr ? ` · ${rrTxt(F.rr)}` : ''}</small></span>` +
      `<span class="${v == null ? 'dim' : v >= 0 ? 'up' : 'down'}">${v == null ? 'OPEN' : usd(v)}</span></button>`;
  }

  function renderDay() {
    const list = (byDay()[dayOpen] || []).slice().sort((a, b) => a.openedAt - b.openedAt);
    const open = dayOpen === tradeDay(Date.now()) ? Paper.positions() : [];
    const v = r2(list.reduce((a, h) => a + h.pl, 0));
    const nice = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(dayOpen + 'T12:00:00Z'));
    $('calBody').innerHTML =
      `<div class="cal-nav"><button type="button" class="ghost-btn" data-back="month">‹ Month</button><b>${nice}</b><span class="${v >= 0 ? 'up' : 'down'}">${list.length ? usd(v) : ''}</span></div>` +
      open.map((p, i) => tradeRow(p, i, true)).join('') + list.map((h, i) => tradeRow(h, i, false)).join('') +
      (list.length || open.length ? '' : '<div class="dim small">No trades this day.</div>');
    renderDay.list = list; renderDay.open = open;
  }

  function line(label, val, sub) { return `<div class="cal-kv"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`; }

  function renderTrade() {
    const h = tradeOpen, F = facts(h), u = h.units, open = h.exit == null;
    const live = open && typeof window !== 'undefined' && window.__jarvisGold ? window.__jarvisGold() : null;
    const px = open && live ? (h.side > 0 ? live.price.bid : live.price.ask) : null;
    const ddTxt = F.dd == null ? (busy ? 'working it out…' : 'not available') : F.dd === 0 ? 'never went against you' : `−$${f2(F.dd * u)}`;
    const upTxt = F.up == null ? (busy ? 'working it out…' : 'not available') : F.up === 0 ? 'never went in profit' : `+$${f2(F.up * u)}`;
    $('calBody').innerHTML =
      `<div class="cal-nav"><button type="button" class="ghost-btn" data-back="day">‹ Day</button><b>${h.bot ? 'JARVIS ' : ''}${h.side > 0 ? 'BUY' : 'SELL'} ${u}</b><span class="${open ? 'dim' : h.pl >= 0 ? 'up' : 'down'}">${open ? 'OPEN' : usd(h.pl)}</span></div>` +
      `<div class="cal-detail">` +
      line('Entry', f2(h.entry), when(h.openedAt)) +
      (open ? line('Now', px != null ? f2(px) : '—', px != null ? usd(r2((px - h.entry) * h.side * u)) : '') : line('Exit', f2(h.exit), `${when(h.closedAt)} · ${REASON[h.reason] || h.reason}`)) +
      line('Stop loss', h.sl != null ? f2(h.sl) : 'none', h.sl != null ? (F.slDist > 0 ? `${f2(F.slDist)} away · <span class="down">−$${f2(F.slDist * u)}</span> if hit` : `locked in <span class="up">+$${f2(-F.slDist * u)}</span>`) : '') +
      line('Take profit', h.tp != null ? f2(h.tp) : 'none', h.tp != null ? `${f2(Math.abs(F.tpDist))} away · <span class="up">+$${f2(Math.abs(F.tpDist) * u)}</span> if hit` : '') +
      line('Risk : reward', F.rr ? rrTxt(F.rr) : '—', F.rr ? (F.rr >= 3 ? 'excellent' : F.rr >= 2 ? 'good' : 'under 1:2') : '') +
      (open ? '' : line('Result', usd(h.pl), F.R != null ? `${F.R >= 0 ? '+' : ''}${F.R.toFixed(1)}R · ${long(h.closedAt - h.openedAt)} in the trade` : long(h.closedAt - h.openedAt) + ' in the trade')) +
      line('Deepest drawdown', ddTxt, F.dd ? `price reached ${f2(h.worst)}` : '') +
      line('Best profit', upTxt, F.up ? `price reached ${f2(h.best)}` : '') +
      `</div>` + (h.bot && h.note ? `<div class="dim small">Why JARVIS took it: ${esc(h.note)}</div>` : '');
  }

  function render() { if (tradeOpen) renderTrade(); else if (dayOpen) renderDay(); else renderMonth(); }

  function open() {
    const t = tradeDay(Date.now());
    month = [+t.slice(0, 4), +t.slice(5, 7)]; dayOpen = null; tradeOpen = null;
    render();
    const d = $('calDlg'); if (!d.open) d.showModal();
  }

  function init() {
    const d = $('calDlg');
    if (!d) return;
    $('calBtn').addEventListener('click', open);
    $('calClose').addEventListener('click', () => d.close());
    d.addEventListener('click', async (e) => {
      if (e.target === d) { d.close(); return; }
      const nav = e.target.closest('[data-nav]'), day = e.target.closest('[data-day]'), t = e.target.closest('[data-t]'), back = e.target.closest('[data-back]');
      if (nav) { let [y, m] = month; m += +nav.dataset.nav; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } month = [y, m]; render(); }
      else if (day) { dayOpen = day.dataset.day; render(); }
      else if (back) { if (back.dataset.back === 'month') dayOpen = null; tradeOpen = null; render(); }
      else if (t) {
        const isOpen = t.dataset.t[0] === 'o', i = +t.dataset.t.slice(1);
        tradeOpen = isOpen ? renderDay.open[i] : renderDay.list[i];
        if (!tradeOpen) return;
        busy = !isOpen && (tradeOpen.worst == null || tradeOpen.best == null);
        render();
        if (busy) { const h = tradeOpen; await fillExtremes(h); busy = false; if (tradeOpen === h) render(); }
      }
    });
  }
  return { init, open, facts, tradeDay };
})();
