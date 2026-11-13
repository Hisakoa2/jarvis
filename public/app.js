// JARVIS dashboard controller
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = Brain.esc;
  const f2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const PRICE_POLL_MS = 5000;
  const PREFS_KEY = 'jarvis.prefs';

  let prefs = { title: 'sir', boot: true, birthday: '11-15', weatherCity: '', riskPct: 1, maxRisk: 250 };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch {}
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} };

  let config = { projects: [], sessions: { displayTimezone: 'America/New_York', sessions: [] } };
  let gold = null;
  const TZ = () => config.sessions.displayTimezone || 'America/New_York';
  const fmtT = (ms, day) => Sessions.fmtTime(ms, TZ(), day);
  const cls = (b) => (b === 'Bullish' ? 'up' : b === 'Bearish' ? 'down' : 'warn');

  // ---------- the core (shared SVG for boot, ambient, header) ----------
  function coreSVG(size = 200) {
    const segs = Array.from({ length: 12 }, (_, i) => {
      const a0 = (i * 30 + 4) * Math.PI / 180, a1 = (i * 30 + 26) * Math.PI / 180, r = 78;
      return `<path d="M${100 + r * Math.cos(a0)},${100 + r * Math.sin(a0)} A${r},${r} 0 0 1 ${100 + r * Math.cos(a1)},${100 + r * Math.sin(a1)}"/>`;
    }).join('');
    const hex = Array.from({ length: 6 }, (_, i) => { const a = (-90 + i * 60) * Math.PI / 180; return `${100 + 34 * Math.cos(a)},${100 + 34 * Math.sin(a)}`; }).join(' ');
    return `<svg class="core-svg" viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">
      <circle class="c-outer" cx="100" cy="100" r="94"/>
      <g class="c-ticks">${[0, 90, 180, 270].map((d) => `<line x1="100" y1="2" x2="100" y2="12" transform="rotate(${d} 100 100)"/>`).join('')}</g>
      <g class="c-segs">${segs}</g>
      <circle class="c-ring" cx="100" cy="100" r="60"/>
      <circle class="c-ring2" cx="100" cy="100" r="48"/>
      <polygon class="c-hex" points="${hex}"/>
      <circle class="c-glow" cx="100" cy="100" r="26"/>
      <circle class="c-core" cx="100" cy="100" r="13"/>
    </svg>`;
  }
  $('bootCore').innerHTML = coreSVG(240);
  $('ambCore').innerHTML = coreSVG(320);
  $('headerCore').innerHTML = coreSVG(40);

  // voice state → body classes (core reacts everywhere)
  Voice.onState((s) => {
    document.body.classList.toggle('v-speaking', s === 'speaking');
    if (s === 'speaking' || s === 'idle') document.body.classList.remove('v-listening');
    if (s === 'listening') document.body.classList.add('v-listening');
  });

  // ---------- config ----------
  async function loadConfig() {
    try {
      const [p, s] = await Promise.all([
        fetch('config/projects.json', { cache: 'no-store' }).then((r) => r.json()),
        fetch('config/sessions.json', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      config = { projects: [...(p.projects || []), ...myApps().map((a) => ({ ...a, mine: true }))], sessions: s };
    } catch (e) {
      log('config', `<span class="err">Couldn’t read the config files (${esc(e.message)}).</span>`);
    }
    renderProjects();
  }

  const isLanHost = (h) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.endsWith('.local');
  function resolveUrl(url) {
    try {
      const u = new URL(url);
      if (['localhost', '127.0.0.1'].includes(u.hostname) && isLanHost(location.hostname)) u.hostname = location.hostname;
      return u.toString();
    } catch { return url; }
  }
  function renderProjects() {
    const list = config.projects || [];
    $('projCount').textContent = list.length;
    $('projects').innerHTML = list.map((p, i) => `
      <a class="tile" href="${esc(resolveUrl(p.url))}" target="_blank" rel="noopener" data-i="${i}">
        <span class="tile-name">${esc(p.name)}</span>
        <span class="tile-desc">${esc(p.description || '')}</span>
        <span class="tile-url">${esc(p.url)}</span>${p.mine ? `<span class="tile-x" data-rm="${i}" role="button" aria-label="Remove ${esc(p.name)}">✕</span>` : ''}
      </a>`).join('') || '<div class="dim">No apps yet — tap + ADD APP.</div>';
  }
  // ---------- your own app links (saved on this device) ----------
  const APPS_KEY = 'jarvis.apps';
  function myApps() { try { const a = JSON.parse(localStorage.getItem(APPS_KEY) || '[]'); return Array.isArray(a) ? a.filter((x) => x && x.name && x.url) : []; } catch { return []; } }
  function saveApps(a) { try { localStorage.setItem(APPS_KEY, JSON.stringify(a)); } catch {} }
  function syncApps() { config.projects = [...config.projects.filter((p) => !p.mine), ...myApps().map((a) => ({ ...a, mine: true }))]; renderProjects(); }
  $('projects').addEventListener('click', (e) => {
    const x = e.target.closest('[data-rm]');
    if (!x) return;
    e.preventDefault(); e.stopPropagation();
    const p = config.projects[+x.dataset.rm];
    if (p && p.mine) { saveApps(myApps().filter((a) => !(a.name === p.name && a.url === p.url))); syncApps(); }
  });
  $('appAddBtn').addEventListener('click', () => { const f = $('appForm'); f.hidden = !f.hidden; if (!f.hidden) $('appName').focus(); });
  $('appForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('appName').value.trim();
    let url = $('appUrl').value.trim();
    if (!name || !url) return;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
    saveApps([...myApps().filter((a) => a.name.toLowerCase() !== name.toLowerCase()), { name, url, description: 'Your app' }]);
    $('appName').value = ''; $('appUrl').value = ''; $('appForm').hidden = true;
    syncApps();
  });
  // ---------- live TradingView chart (TradingView's own free embed) ----------
  let tvLoaded = false;
  function openChart() {
    const d = $('chartDlg'); if (!d.open) d.showModal();
    if (tvLoaded) return;
    tvLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js'; s.async = true;
    s.onload = () => {
      try {
        $('tvChart').innerHTML = '';
        new window.TradingView.widget({ autosize: true, symbol: 'OANDA:XAUUSD', interval: '15', timezone: 'America/New_York', theme: 'dark', style: '1', locale: 'en', allow_symbol_change: true, withdateranges: true, container_id: 'tvChart' });
      } catch { $('tvChart').innerHTML = '<div class="dim">Couldn’t load the chart — tap OPEN IN TRADINGVIEW.</div>'; }
    };
    s.onerror = () => { tvLoaded = false; $('tvChart').innerHTML = '<div class="dim">Couldn’t reach TradingView — check your connection, or tap OPEN IN TRADINGVIEW.</div>'; };
    document.head.appendChild(s);
  }
  $('chartBtn').addEventListener('click', openChart);
  $('chartClose').addEventListener('click', () => $('chartDlg').close());
  function openProject(p) {
    const i = config.projects.indexOf(p);
    const tile = document.querySelector(`.tile[data-i="${i}"]`);
    if (tile) { tile.classList.remove('hit'); void tile.offsetWidth; tile.classList.add('hit'); }
    window.open(resolveUrl(p.url), '_blank', 'noopener');
  }

  // ---------- number tween ----------
  const tweens = new WeakMap();
  function tween(el, to, ms = 450) {
    const from = tweens.get(el) ?? to;
    tweens.set(el, to);
    if (from === to) { el.textContent = f2(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = f2(from + (to - from) * e);
      if (k < 1 && tweens.get(el) === to) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- gold ----------
  let fetching = null;
  function fetchGold(force = false) {
    if (fetching && !force) return fetching;
    fetching = (async () => {
      try {
        gold = await Data.snapshot({ forceCandles: force, sessions: config.sessions });
        renderGold();
        const labels = { demo: 'DEMO DATA', server: 'OANDA · PC KEY', direct: `OANDA ${String(gold.env).toUpperCase()}` };
        setLink(gold.mode === 'demo' ? 'demo' : 'ok', labels[gold.mode]);
        $('demoBanner').hidden = gold.mode !== 'demo';
        $('lastUpdate').textContent = 'UPDATED ' + new Date().toLocaleTimeString('en-US', { timeZone: TZ(), hour: 'numeric', minute: '2-digit' }) + ' ET';
        detectDataCallouts(gold);
        conditionsHeadsUp();
        paperTick(gold);
        return gold;
      } catch (e) {
        setLink('err', 'LINK DOWN');
        $('priceFoot').innerHTML = `<span class="err">FEED ERROR: ${esc(e.message)}</span>`;
        return null;
      } finally { fetching = null; }
    })();
    return fetching;
  }
  function setLink(state, text) {
    $('linkDot').className = 'dot ' + state;
    $('linkText').textContent = text;
    const tag = $('feedTag');
    tag.textContent = state === 'demo' ? 'DEMO' : state === 'ok' ? 'LIVE' : 'OFFLINE';
    tag.className = 'tag' + (state === 'demo' ? ' demo' : '');
  }

  let lastPrice = null;
  function renderGold() {
    const g = gold, p = g.price.bid, el = $('price');
    tween(el, p);
    if (lastPrice != null && p !== lastPrice) {
      el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth;
      el.classList.add(p > lastPrice ? 'flash-up' : 'flash-down');
      setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 500);
    }
    lastPrice = p;
    const up = g.change >= 0;
    $('change').className = 'change ' + (up ? 'up' : 'down');
    $('changeAbs').textContent = `${up ? '▲ +' : '▼ '}${f2(g.change)}`;
    $('changePct').textContent = `${up ? '+' : ''}${g.changePct.toFixed(2)}% TODAY`;
    $('bid').textContent = f2(g.price.bid);
    $('ask').textContent = f2(g.price.ask);
    $('spread').textContent = f2(g.price.spread);
    $('dOpen').textContent = f2(g.dailyOpen);
    $('dLow').textContent = f2(g.dayLow);
    $('dHigh').textContent = f2(g.dayHigh);
    $('priceFoot').textContent = `48H · 1H CANDLES · BID PRICES${g.price.tradeable ? '' : ' · MARKET CLOSED'}`;
    renderSpark(g.sparkline, up);
    renderBias(g.bias);
    renderMtf(g);
    renderLevels(g);
    renderAmbient();
  }

  function renderSpark(values, up) {
    const svg = $('spark');
    if (!values || values.length < 2) { svg.innerHTML = ''; return; }
    const W = 300, H = 70, pad = 4;
    const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * W, pad + (1 - (v - min) / span) * (H - pad * 2)]);
    const line = pts.map((pt) => pt.map((n) => n.toFixed(1)).join(',')).join(' ');
    const hex = up ? '#22ff9a' : '#ff4d6d', last = pts[pts.length - 1];
    svg.innerHTML = `<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex}" stop-opacity=".28"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="0,${H} ${line} ${W},${H}" fill="url(#sg)"/>
      <polyline points="${line}" fill="none" stroke="${hex}" stroke-width="1.6" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 3px ${hex})"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${hex}"/>`;
  }

  function renderBias(b) {
    const w = $('biasWord');
    w.textContent = b.bias.toUpperCase();
    w.className = 'bias-word ' + b.bias;
    const r = b.raw;
    $('biasScore').textContent = `${r.bullish}▲ ${r.bearish}▼`;
    $('biasSince').textContent = b.since ? `SINCE ${fmtT(b.since, true).toUpperCase()} ET` : `HELD FOR ${Math.round((b.lastCloseTime - b.sinceWindowStart) / 3600e3)}H+`;
    $('biasMeter').innerHTML = r.rules.map((x) => `<i class="${x.vote > 0 ? 'b' : x.vote < 0 ? 's' : ''}" title="${esc(x.name)}"></i>`).join('');
    const pend = $('biasPending');
    if (b.pending) {
      pend.className = 'bias-pending on ' + b.pending.to;
      pend.innerHTML = `⚠ ${b.pending.to.toUpperCase()} FLIP PENDING · ${b.pending.count}/${b.pending.need}<span class="pips">${Array.from({ length: b.pending.need }, (_, i) => `<i class="${i < b.pending.count ? 'f' : ''}"></i>`).join('')}</span>`;
    } else { pend.className = 'bias-pending'; pend.textContent = 'STABLE · NO FLIP PENDING'; }
    const liveBy = Object.fromEntries(b.live.map((x) => [x.name, x]));
    $('biasRules').innerHTML = r.rules.map((x) => {
      const lv = liveBy[x.name];
      const verdict = x.level == null ? 'NOT ENOUGH DATA' : x.state === 'above' ? `CLOSED ${f2(x.dist)} ABOVE` : x.state === 'below' ? `CLOSED ${f2(-x.dist)} BELOW` : 'TOO CLOSE · NO VOTE';
      const c = x.vote > 0 ? 'up' : x.vote < 0 ? 'down' : 'warn';
      return `<li><span class="v ${c}">${x.vote > 0 ? '▲' : x.vote < 0 ? '▼' : '•'}</span>
        <span><span class="n">${esc(x.name)} · ${x.level != null ? f2(x.level) : '--'}</span>
        <span class="${c}">${verdict}</span> <span class="dim small">${lv && lv.dist != null ? `live ${lv.dist >= 0 ? '+' : ''}${f2(lv.dist)}` : ''}</span></span></li>`;
    }).join('');
    $('biasFoot').innerHTML = `CLOSED 1H CANDLES ONLY · LAST ${fmtT(b.lastCloseTime, false)} · NEXT ${fmtT(b.nextCheck, false)} ET<br>BUFFER ±${f2(b.buffer)} (${b.settings.bufferAtr}×ATR) · FLIP NEEDS ${b.settings.confirmCandles} CANDLES`;
  }

  function renderMtf(g) {
    const m = g.mtf;
    const name = { H1: '1H', H4: '4H', D: 'DAILY' };
    const rows = [{ tf: 'BIAS', trend: g.bias.bias, reason: 'your 3 rules, confirmed', main: true }, ...m.rows.filter((r) => r.tf !== 'H1')];
    $('mtfRows').innerHTML = rows.map((r) => `<div class="mtf-row ${r.main ? 'main' : ''}">
      <span class="mtf-tf">${r.main ? '1H BIAS' : name[r.tf] + ' TREND'}</span>
      <span class="mtf-val ${cls(r.trend)}">${r.trend.toUpperCase()}</span>
      <span class="mtf-why dim">${esc(r.reason || '')}</span></div>`).join('');
    const a = $('mtfAlign');
    a.className = 'mtf-align ' + (m.aligned ? 'on ' + cls(g.bias.bias) : '');
    a.textContent = m.aligned ? `◆ ALL ALIGNED ${g.bias.bias.toUpperCase()}` : '◇ NOT ALIGNED';
    $('mtfTag').textContent = m.aligned ? 'ALIGNED' : `${rows.filter((r) => r.trend === 'Bullish').length}▲ ${rows.filter((r) => r.trend === 'Bearish').length}▼`;
  }

  function renderLevels(g) {
    const L = g.levels, p = g.price.bid;
    const show = [...L.above.slice(0, 4).reverse(), { now: true, price: p }, ...L.below.slice(0, 4)];
    $('levelRows').innerHTML = show.map((l) => l.now
      ? `<div class="lvl now"><span>▶ PRICE</span><span>${f2(p)}</span><span></span></div>`
      : `<div class="lvl ${l.price > p ? 'res' : 'sup'} ${l.round ? 'round-' + l.round : ''}"><span>${esc(l.short)}</span><span>${f2(l.price)}</span><span class="dim">${l.dist >= 0 ? '+' : ''}${f2(l.dist)}</span></div>`).join('');
    if (L.adrPct != null) {
      const pct = Math.round(L.adrPct);
      $('adrFill').style.width = Math.min(100, pct) + '%';
      $('adrFill').className = pct >= 100 ? 'hot' : pct >= 75 ? 'warm' : '';
      $('adrText').textContent = `RANGE ${f2(L.range)} / ADR ${f2(L.adr)} · ${pct}%`;
    }
  }

  // ---------- paper trading ----------
  const money2 = (n) => `${n < 0 ? '−' : n > 0 ? '+' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  function paperAnnounce(events) {
    events = (events || []).filter((e) => !e.bot); // JARVIS's own trade stays quiet — ask about it or check the panel
    for (const e of events) {
      const l = Brain.paperEventLine(e, prefs.title);
      if (l.text) callout(`paper-${e.type}-${e.at}-${e.entry}`, l.text, l.say);
    }
    if (events && events.length && !document.hidden && document.body.classList.contains('engaged')) {
      for (const e of events) { const l = Brain.paperEventLine(e, prefs.title); if (l.text) log('Paper trade', esc(l.text)); }
      Paper.markSeen();
    }
  }
  function paperTick(g) {
    if (!g || !g.price || !g.price.tradeable) { renderPaper(); return; }
    paperAnnounce(Paper.tick(g.price.bid, g.price.ask));
    try { Life.botTick(ctx, g); } catch (e) { console.warn('bot', e); }
    renderPaper();
  }
  // Catch up on what happened while the app was closed (5-minute candles)
  async function paperCatchUp() {
    if (!Paper.busy() || Date.now() - Paper.lastCheck() < 90e3) return;
    try { const ev = Paper.replay(await Data.candlesSince(Paper.lastCheck())); if (document.body.classList.contains('engaged')) paperAnnounce(ev); } catch {}
    renderPaper();
  }
  function renderPaper() {
    const box = $('paper');
    if (!box) return;
    const bid = gold && gold.price.bid, ask = gold && gold.price.ask;
    const S = Paper.stats(bid, ask);
    $('paperTag').textContent = '$' + Math.round(S.equity).toLocaleString('en-US');
    const pos = Paper.positions(), ord = Paper.orders(), hist = Paper.history().slice(0, 6);
    const pl = (n) => `<span class="${n >= 0 ? 'up' : 'down'}">${money2(n)}</span>`;
    box.innerHTML =
      `<div class="paper-stats"><div><span>BALANCE</span><b>$${S.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></div>` +
      `<div><span>EQUITY</span><b>$${S.equity.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></div>` +
      `<div><span>OPEN P/L</span><b>${pl(S.openPL)}</b></div>` +
      `<div><span>WIN RATE</span><b>${S.winRate != null ? S.winRate + '%' : '—'}</b><small>${S.wins}W · ${S.losses}L</small></div></div>` +
      (pos.length ? pos.map((p) => {
        const px = gold ? Paper.closePx(p, bid, ask) : p.entry, v = Paper.pnlAt(p, px);
        let prog = '';
        if (p.sl != null && p.tp != null && gold) { const f = Math.max(0, Math.min(1, (px - p.sl) / (p.tp - p.sl))); prog = `<div class="paper-prog"><i style="left:${(f * 100).toFixed(1)}%"></i><span>SL ${p.sl.toFixed(2)}</span><span>TP ${p.tp.toFixed(2)}</span></div>`; }
        const lv = `<span class="paper-lv">SL ${p.sl != null ? p.sl.toFixed(2) : '—'} · TP ${p.tp != null ? p.tp.toFixed(2) : '—'}</span>`;
        const slD = p.sl != null ? (p.entry - p.sl) * p.side : null, tpD = p.tp != null ? (p.tp - p.entry) * p.side : null;
        const amts = `<div class="paper-row paper-amts"><span>${tpD != null ? `TP <b class="up">+$${Math.round(Math.abs(tpD) * p.units).toLocaleString('en-US')}</b>` : 'TP —'} · ${slD != null ? (slD > 0 ? `SL <b class="down">−$${Math.round(slD * p.units).toLocaleString('en-US')}</b>` : `SL <b class="up">+$${Math.round(-slD * p.units).toLocaleString('en-US')} locked</b>`) : 'SL —'}${slD > 0 && tpD > 0 ? ` · <b>1:${(Math.round(tpD / slD * 10) / 10)}</b>` : ''}</span><span class="dim">opened ${p.openedAt ? fmtT(p.openedAt, false) : '—'}</span></div>`;
        return `<div class="paper-pos ${p.side > 0 ? 'buy' : 'sell'}${p.bot ? ' bot' : ''}"><div class="paper-row">${p.bot ? '<span class="bot-tag">JARVIS</span>' : ''}<b>${p.side > 0 ? 'BUY' : 'SELL'}</b> ${p.units} @ ${p.entry.toFixed(2)} <span class="paper-pl">${pl(v)}</span></div>` +
          amts + `<div class="paper-row">${lv}<span class="paper-acts"><button type="button" class="ghost-btn paper-close" data-be="${p.id}" title="Move stop to break-even">BE</button><button type="button" class="ghost-btn paper-close" data-half="${p.id}" title="Close half">½</button><button type="button" class="ghost-btn paper-close" data-edit="${p.id}">EDIT</button><button type="button" class="ghost-btn paper-close danger" data-close="${p.id}">CLOSE</button></span></div>${prog}</div>`;
      }).join('') + (pos.length > 1 ? `<div class="paper-row"><button type="button" class="ghost-btn paper-close danger" data-closeall="1">CLOSE ALL (${pos.length})</button></div>` : '') : `<div class="dim small paper-empty">No open paper trades. Use SELL / BUY above, or say “sell now”, “put a buy order at 3990”.</div>`) +
      (ord.length ? ord.map((o) => `<div class="paper-pos order ${o.side > 0 ? 'buy' : 'sell'}"><div class="paper-row"><b>${o.side > 0 ? 'BUY' : 'SELL'} ${o.type.toUpperCase()}</b> ${o.units} @ ${o.entry.toFixed(2)} <span class="paper-pl dim">PENDING</span></div><div class="paper-row"><span class="paper-lv">SL ${o.sl != null ? o.sl.toFixed(2) : '—'} · TP ${o.tp != null ? o.tp.toFixed(2) : '—'}</span><span class="paper-acts"><button type="button" class="ghost-btn paper-close" data-edit="${o.id}">EDIT</button><button type="button" class="ghost-btn paper-close danger" data-cancel="${o.id}">CANCEL</button></span></div></div>`).join('') : '') +
      (hist.length ? `<div class="paper-hist">${hist.map((h) => `<span class="${h.bot ? 'bot' : ''}" title="${h.side > 0 ? 'Buy' : 'Sell'} ${h.units} @ ${h.entry.toFixed(2)} → ${h.exit.toFixed(2)}, opened ${new Date(h.openedAt || h.closedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET${h.bot ? ' — JARVIS' : ''}">${h.bot ? 'J·' : ''}${h.side > 0 ? 'B' : 'S'} ${h.reason === 'tp' ? 'TP' : h.reason === 'manual' ? '✕' : h.reason === 'partial' ? '½' : h.reason === 'session_end' ? 'END' : 'SL'} ${pl(h.pl)}</span>`).join('')}</div>` : '') +
      botLine();
  }
  // One line about JARVIS's own trade for today
  function botLine() {
    if (typeof Life === 'undefined') return '';
    const s = Life.botStatus({ now: Date.now() });
    let txt;
    if (s.open) txt = `In a ${s.open.side > 0 ? 'BUY' : 'SELL'} today — ask “how’s your trade”`;
    else if (s.closed.length) {
      // say WHEN it traded — the trading day starts 6 PM New York, so "today's" trade may be from last night
      const v = s.closed.reduce((a, h) => a + h.pl, 0), h = s.closed[s.closed.length - 1];
      const when = new Date(h.openedAt || h.closedAt).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' });
      txt = `Today’s trade done (${h.side > 0 ? 'BUY' : 'SELL'} ${when}): <span class="${v >= 0 ? 'up' : 'down'}">${money2(v)}</span> · next one after 6:15 PM NY`;
    }
    else txt = `Watching for the day’s strongest setup (1 a day, 1:2 or better, max $${Math.round(prefs.maxRisk || 250)} risk, sits out if nothing qualifies)`;
    const ci = Life.cloudInfo ? Life.cloudInfo() : null;
    if (ci && ci.live) txt += ' · <span class="dim">cloud on</span>';
    return `<div class="bot-line"><span class="bot-tag">JARVIS TRADER</span> ${txt}</div>`;
  }
  const findTrade = (id) => Paper.positions().find((p) => p.id === id) || Paper.orders().find((o) => o.id === id);
  const isPending = (t) => Paper.orders().includes(t);
  $('paper').addEventListener('click', (e) => {
    const half = e.target.closest('[data-half]');
    if (half && gold) { const h = Paper.partial(+half.dataset.half, (findTrade(+half.dataset.half) || { units: 0 }).units / 2, gold.price.bid, gold.price.ask); if (h) log('Partial close', `Closed ${h.units} @ ${h.exit.toFixed(2)} <span class="${h.pl >= 0 ? 'up' : 'down'}">${money2(h.pl)}</span>${h.left ? ` — ${h.left} still running` : ''}.`); }
    const c = e.target.closest('[data-close]'), x = e.target.closest('[data-cancel]'), be = e.target.closest('[data-be]'), ed = e.target.closest('[data-edit]'), all = e.target.closest('[data-closeall]');
    const closeLog = (h) => h && log('Close paper trade', `Closed ${h.side > 0 ? 'BUY' : 'SELL'} ${h.units} @ ${h.entry.toFixed(2)} → ${h.exit.toFixed(2)} <span class="${h.pl >= 0 ? 'up' : 'down'}">${money2(h.pl)}</span>.`);
    if (c && gold) closeLog(Paper.closeOne(+c.dataset.close, gold.price.bid, gold.price.ask));
    if (all && gold) Paper.positions().slice().forEach((p) => closeLog(Paper.closeOne(p.id, gold.price.bid, gold.price.ask)));
    if (x) Paper.cancel(+x.dataset.cancel);
    if (be && gold) {
      const p = findTrade(+be.dataset.be);
      const live = p && (p.side > 0 ? gold.price.bid : gold.price.ask);
      if (p && (p.side > 0 ? live > p.entry : live < p.entry)) { Paper.modify(p.id, { sl: p.entry }); log('Break-even', `Stop moved to <b>${p.entry.toFixed(2)}</b> — risk-free now.`); }
      else if (p) log('Break-even', `<span class="warn">Price is not past your entry (${p.entry.toFixed(2)}) yet, so a break-even stop would close the trade straight away.</span>`);
    }
    if (ed) openEdit(+ed.dataset.edit);
    renderPaper();
  });
  let editId = null;
  function openEdit(id) {
    const t = findTrade(id);
    if (!t) return;
    editId = id;
    $('peTitle').textContent = `Edit ${t.side > 0 ? 'BUY' : 'SELL'}${isPending(t) ? ' ' + t.type.toUpperCase() : ''} ${t.units} @ ${t.entry.toFixed(2)}`;
    $('peSL').value = t.sl != null ? t.sl : ''; $('peTP').value = t.tp != null ? t.tp : ''; $('peMsg').textContent = '';
    $('paperEdit').hidden = false;
    $('peSL').focus();
  }
  $('peCancel').addEventListener('click', () => { $('paperEdit').hidden = true; editId = null; });
  $('peSave').addEventListener('click', () => {
    const t = findTrade(editId);
    if (!t) { $('paperEdit').hidden = true; return; }
    const num = (v) => { v = String(v).replace(/[^0-9.]/g, ''); return v ? +v : null; };
    const sl = num($('peSL').value), tp = num($('peTP').value);
    const ref = isPending(t) ? t.entry : gold ? (t.side > 0 ? gold.price.bid : gold.price.ask) : t.entry;
    const what = isPending(t) ? 'the order price' : 'the current price';
    if (sl != null && (t.side > 0 ? sl >= ref : sl <= ref)) { $('peMsg').innerHTML = `<span class="err">On a ${t.side > 0 ? 'buy' : 'sell'} the stop has to be ${t.side > 0 ? 'below' : 'above'} ${what} (${ref.toFixed(2)}).</span>`; return; }
    if (tp != null && (t.side > 0 ? tp <= ref : tp >= ref)) { $('peMsg').innerHTML = `<span class="err">On a ${t.side > 0 ? 'buy' : 'sell'} the target has to be ${t.side > 0 ? 'above' : 'below'} ${what} (${ref.toFixed(2)}).</span>`; return; }
    Paper.modify(t.id, { sl, tp });
    log('Paper trade updated', `${t.side > 0 ? 'BUY' : 'SELL'} ${t.units} @ ${t.entry.toFixed(2)} → stop <b>${sl != null ? sl.toFixed(2) : 'none'}</b>, target <b>${tp != null ? tp.toFixed(2) : 'none'}</b>.`);
    $('paperEdit').hidden = true; editId = null;
  });
  // Order ticket: builds the same sentence you'd say, so it uses all the same rules
  $('ticket').addEventListener('click', (e) => {
    const b = e.target.closest('[data-side]');
    if (!b) return;
    const v = (id) => String($(id).value).replace(/[^0-9.]/g, '');
    const size = v('tkSize'), entry = v('tkEntry'), sl = v('tkSL'), tp = v('tkTP');
    const cmd = `${b.dataset.side}${size ? ` ${size} units` : ''}${entry ? ` at ${entry}` : ''}${sl ? ` stop loss ${sl}` : ''}${tp ? ` take profit ${tp}` : ''}`;
    run(cmd);
    ['tkEntry', 'tkSL', 'tkTP'].forEach((id) => { $(id).value = ''; });
  });
  Paper.onChange(() => renderPaper());
  window.__jarvisGold = () => gold;
  if (typeof TradeCal !== 'undefined') TradeCal.init();

  // ---------- news (US economic calendar) ----------
  function newsCard(now, tz) {
    if (typeof News === 'undefined' || !News.ok()) return '';
    const e = News.nextHigh(now);
    if (!e) return `<div class="sess news"><div class="sess-top"><span class="sess-name">NEXT RED NEWS</span><span class="sess-state">USD</span></div><div class="sess-sub">No more high-impact US news this week</div></div>`;
    const live = e.at <= now;
    return `<div class="sess news${e.at - now < 30 * 60e3 ? ' soon' : ''}"><div class="sess-top"><span class="sess-name">NEXT RED NEWS</span><span class="sess-state">${live ? '● OUT NOW' : 'USD · HIGH'}</span></div>
      <div class="sess-count">${live ? 'NOW' : Sessions.countdown(e.at - now)}</div><div class="sess-sub">${esc(e.title)} · ${Sessions.fmtTime(e.at, tz, true)} ET</div></div>`;
  }
  function detectNewsCallouts(now) {
    if (typeof News === 'undefined' || !News.ok()) return;
    const T = prefs.title ? `, ${prefs.title}` : '';
    for (const e of News.relevant()) {
      if (!News.isHigh(e)) continue;
      const mins = (e.at - now) / 60000;
      if (mins <= 15 && mins > 14) callout(`news15-${e.title}-${e.at}`, `High-impact news in 15 minutes: ${e.title}.`, `Heads up${T}. ${e.title.replace(/\bm\/m\b/i, 'month over month').replace(/\by\/y\b/i, 'year over year')} is out in 15 minutes. High impact.`);
    }
  }

  // ---------- clocks ----------
  function tickClocks() {
    const now = new Date(), tz = TZ();
    $('nyClock').textContent = now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    $('nyDate').textContent = 'NEW YORK · ' + now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    $('sessions').innerHTML = (config.sessions.sessions || []).map((s) => {
      const st = Sessions.status(s, now.getTime());
      if (!st) return `<div class="sess"><div class="sess-name">${esc(s.name)}</div><div class="sess-sub err">Check config/sessions.json</div></div>`;
      if (st.open) return `<div class="sess open"><div class="sess-top"><span class="sess-name">${esc(s.name.toUpperCase())}</span><span class="sess-state">● OPEN</span></div>
          <div class="sess-count">${Sessions.countdown(st.closesAt - now)}</div><div class="sess-sub">until close · ${Sessions.fmtTime(st.closesAt, tz, false)} ET</div>
          <div class="bar"><i style="width:${(st.progress * 100).toFixed(1)}%"></i></div></div>`;
      return `<div class="sess"><div class="sess-top"><span class="sess-name">${esc(s.name.toUpperCase())}</span><span class="sess-state">CLOSED</span></div>
        <div class="sess-count">${Sessions.countdown(st.opensAt - now)}</div><div class="sess-sub">until open · ${Sessions.fmtTime(st.opensAt, tz, true)} ET</div></div>`;
    }).join('') + newsCard(now.getTime(), tz);
    detectTimeCallouts(now.getTime());
    detectNewsCallouts(now.getTime());
    if (ambientOn) tickAmbient(now);
  }

  // ---------- callouts (pop up silently; tap to hear) ----------
  const callouts = [];
  const fired = new Set();
  let unread = 0;
  function callout(key, text, say, tag = 'CALLOUT') {
    if (fired.has(key)) return;
    fired.add(key);
    const c = { key, text, say: say || text, at: Date.now(), tag };
    callouts.unshift(c);
    if (callouts.length > 30) callouts.pop();
    unread++;
    renderBell();
    showToast(c);
    if (ambientOn) $('ambCallout').textContent = '◆ ' + text;
  }
  function showToast(c) {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'toast';
    t.innerHTML = `<span class="toast-tag">${c.tag || 'CALLOUT'}</span><span class="toast-text">${esc(c.text)}</span><span class="toast-play">▶ TAP TO HEAR</span>`;
    t.addEventListener('click', () => { playCallout(c); t.remove(); });
    $('toasts').prepend(t);
    while ($('toasts').children.length > 3) $('toasts').lastChild.remove();
    const life = c.tag === 'REMINDER' ? 120000 : 20000;
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + 600);
  }
  function playCallout(c) {
    unread = Math.max(0, unread - 1);
    renderBell();
    const e = log('callout', `<span class="warn">◆ CALLOUT</span> ${esc(c.text)}`);
    Voice.speak(c.say, { force: true, onStart: () => e.classList.add('speaking'), onEnd: () => e.classList.remove('speaking') });
  }
  function renderBell() {
    const b = $('bellCount');
    b.textContent = unread;
    b.hidden = unread === 0;
    $('calloutList').innerHTML = callouts.length
      ? callouts.map((c, i) => `<button type="button" class="co-item" data-i="${i}"><span class="dim">${fmtT(c.at, false)}</span> ${esc(c.text)} <span class="co-play">▶</span></button>`).join('')
      : '<div class="dim small" style="padding:10px">No callouts yet. I’ll pop them up here when something happens.</div>';
  }
  $('bellBtn').addEventListener('click', (e) => { e.stopPropagation(); $('calloutTray').hidden = !$('calloutTray').hidden; unread = 0; renderBell(); });
  $('calloutList').addEventListener('click', (e) => { const it = e.target.closest('.co-item'); if (it) playCallout(callouts[+it.dataset.i]); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#calloutTray, #bellBtn')) $('calloutTray').hidden = true; });

  // "Is it a good time to trade?" — you don't have to ask: when the same rules JARVIS trades by line up,
  // a silent pop-up says so (tap it to hear). Once per side per trading day.
  function conditionsHeadsUp() {
    try {
      if (!gold || !gold.price || !gold.price.tradeable || typeof Brain === 'undefined' || !Brain.botCheck) return;
      const c = Brain.botCheck(ctx());
      if (!c.ok) return;
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(Date.now() + 6 * 3600e3));
      const T = prefs.title ? `, ${prefs.title}` : '', side = c.dir > 0 ? 'buy' : 'sell';
      const rr = (Math.abs(c.tp - c.entry) / c.risk).toFixed(1);
      callout(`cond-${day}-${c.dir}`, `Conditions look good for a ${side.toUpperCase()} — stop ${c.sl.toFixed(2)}, target ${c.tp.toFixed(2)} (1:${rr}). Ask “should I ${side}” for the full check.`,
        `Heads up${T}. Conditions look good for a ${side} right now. Stop ${Math.round(c.sl)}, target ${Math.round(c.tp)}. Not a guarantee, your call.`, 'TRADE ALERT');
    } catch {}
  }

  let prev = null;
  function detectDataCallouts(g) {
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ() }).format(new Date());
    const cur = { bias: g.bias.bias, pending: g.bias.pending && g.bias.pending.to, pendCount: g.bias.pending && g.bias.pending.count, aligned: g.mtf.aligned, price: g.price.bid, levels: g.levels.list, adr: g.levels.adrPct };
    if (!prev) { prev = cur; return; } // don't fire on first load
    const T = prefs.title ? `, ${prefs.title}` : '';
    if (cur.bias !== prev.bias) callout(`flip-${g.bias.lastCloseTime}`, `Bias flipped to ${cur.bias.toUpperCase()} — confirmed on the ${fmtT(g.bias.lastCloseTime, false)} close.`, `Bias update${T}. Gold has flipped ${cur.bias.toLowerCase()}, confirmed on the close.`);
    else if (cur.pending && (cur.pending !== prev.pending || cur.pendCount !== prev.pendCount)) callout(`pend-${cur.pending}-${g.bias.lastCloseTime}`, `${cur.pending} flip pending — ${g.bias.pending.count} of ${g.bias.pending.need} candles.`, `Heads up${T}. A ${cur.pending.toLowerCase()} flip is building, ${g.bias.pending.count} of ${g.bias.pending.need} candles confirmed.`);
    if (cur.aligned && !prev.aligned) callout(`align-${dayKey}-${cur.bias}`, `All timeframes now aligned ${cur.bias.toUpperCase()}.`, `All timeframes are now aligned ${cur.bias.toLowerCase()}${T}.`);
    // level breaks (live price, needs a 0.5 margin so it doesn't flicker)
    for (const l of cur.levels) {
      if (!['pdh', 'pdl', 'wo', 'ah', 'al'].includes(l.key) && l.round !== 'major') continue;
      const m = 0.5;
      if (prev.price < l.price && cur.price > l.price + m) callout(`brk-${l.key}-${l.price.toFixed(1)}-up-${dayKey}`, `Gold broke above ${l.name} (${f2(l.price)}).`, `Gold just broke above ${l.name}${T}.`);
      if (prev.price > l.price && cur.price < l.price - m) callout(`brk-${l.key}-${l.price.toFixed(1)}-dn-${dayKey}`, `Gold broke below ${l.name} (${f2(l.price)}).`, `Gold just broke below ${l.name}${T}.`);
    }
    if (cur.adr != null && cur.adr >= 100 && (prev.adr == null || prev.adr < 100)) callout(`adr-${dayKey}`, `Gold has done a full average day's range.`, `Gold has now moved its full average daily range${T}. Careful chasing.`);
    prev = cur;
  }
  function detectTimeCallouts(now) {
    const T = prefs.title ? `, ${prefs.title}` : '';
    for (const s of config.sessions.sessions || []) {
      const st = Sessions.status(s, now);
      if (!st) continue;
      if (!st.open) {
        const mins = (st.opensAt - now) / 60000;
        if (mins <= 15 && mins > 14) callout(`s15-${s.name}-${st.opensAt}`, `${s.name} opens in 15 minutes.`, `${s.name} opens in 15 minutes${T}.${gold ? ` Bias is ${gold.bias.bias.toLowerCase()}.` : ''}`);
      } else if (now - st.opensAt < 60000) callout(`sopen-${s.name}-${st.opensAt}`, `${s.name} session is now open.`, `${s.name} is open${T}.${gold ? ` Gold is at ${Math.round(gold.price.bid)}, bias ${gold.bias.bias.toLowerCase()}.` : ''}`);
    }
    const m = Sessions.goldMarket(now);
    if (m.open && m.weeklyClose) {
      const mins = (m.weeklyClose - now) / 60000;
      if (mins <= 30 && mins > 29) callout(`wclose-${m.weeklyClose}`, 'Weekly close in 30 minutes.', `The weekly close is in 30 minutes${T}. Time to decide what you're holding into the weekend.`);
    }
  }

  // ---------- ambient mode ----------
  let ambientOn = false, ambientAt = 0, wakeLock = null;
  async function setAmbient(on) {
    ambientOn = !!on;
    ambientAt = Date.now();
    $('ambient').hidden = !ambientOn;
    document.body.classList.toggle('ambient-on', ambientOn);
    if (ambientOn) {
      renderAmbient(); tickAmbient(new Date());
      try { if (document.documentElement.requestFullscreen && matchMedia('(pointer:fine)').matches) await document.documentElement.requestFullscreen(); } catch {}
      try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
    } else {
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
      try { await wakeLock?.release(); } catch {}
      wakeLock = null;
    }
  }
  function renderAmbient() {
    if (!ambientOn || !gold) return;
    const g = gold, up = g.change >= 0;
    tween($('ambPrice'), g.price.bid, 600);
    $('ambChange').className = 'amb-change ' + (up ? 'up' : 'down');
    $('ambChange').textContent = `${up ? '▲ +' : '▼ '}${f2(g.change)}  (${up ? '+' : ''}${g.changePct.toFixed(2)}%)`;
    $('ambBias').className = 'amb-bias ' + g.bias.bias;
    $('ambBias').textContent = g.bias.bias.toUpperCase();
    $('ambBiasSub').textContent = (g.bias.pending ? `${g.bias.pending.to.toUpperCase()} FLIP PENDING ${g.bias.pending.count}/${g.bias.pending.need}` : 'STABLE') + (g.mtf.aligned ? ' · ALL ALIGNED' : '');
    $('ambMtf').innerHTML = g.mtf.rows.filter((r) => r.tf !== 'H1').map((r) => `<span class="${cls(r.trend)}">${r.tf === 'D' ? 'DAILY' : r.tf} ${r.trend.toUpperCase()}</span>`).join('');
  }
  function tickAmbient(now) {
    $('ambClock').textContent = now.toLocaleTimeString('en-US', { timeZone: TZ(), hour12: false });
    const next = (config.sessions.sessions || []).map((s) => ({ s, st: Sessions.status(s, now.getTime()) })).filter((x) => x.st && !x.st.open).sort((a, b) => a.st.opensAt - b.st.opensAt)[0];
    const open = (config.sessions.sessions || []).filter((s) => { const st = Sessions.status(s, now.getTime()); return st && st.open; }).map((s) => s.name.toUpperCase());
    $('ambSession').textContent = (open.length ? open.join(' + ') + ' OPEN · ' : '') + (next ? `${next.s.name.toUpperCase()} IN ${Sessions.countdown(next.st.opensAt - now)}` : '');
  }
  $('ambient').addEventListener('click', () => { if (Date.now() - ambientAt > 700) setAmbient(false); });
  $('ambientBtn').addEventListener('click', () => setAmbient(true));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && ambientOn && matchMedia('(pointer:fine)').matches) setAmbient(false); });

  // ---------- console + commands ----------
  const history = [];
  let histIdx = -1;
  function log(q, html, viaVoice) {
    const out = $('cmdOutput');
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `<div class="q">${viaVoice ? '<span class="mic-tag">🎙</span> ' : ''}${esc(q)}</div><div class="a">${html}</div>`;
    out.prepend(div);
    while (out.children.length > 30) out.lastChild.remove();
    out.scrollTop = 0;
    return div;
  }
  function ctx() {
    return {
      gold: () => gold, refresh: (force) => fetchGold(!!force), projects: config.projects || [], sessions: config.sessions,
      openProject, clear: () => { $('cmdOutput').innerHTML = ''; },
      setMuted: (m) => { Voice.setMuted(m); renderMute(); }, stopSpeaking: () => Voice.stopSpeaking(),
      handsFree: (on) => setHandsFree(on, true),
      tz: TZ(), title: prefs.title, birthday: prefs.birthday,
      news: typeof News !== 'undefined' ? News : null,
      paper: Paper,
      reminders: typeof Reminders !== 'undefined' ? Reminders : null,
      riskPct: prefs.riskPct, maxRisk: prefs.maxRisk || 250,
      weather: (city) => Weather.get(city || prefs.weatherCity || null),
      ambient: (on) => setAmbient(on), isAmbient: () => ambientOn,
      callouts: () => callouts,
    };
  }
  async function run(cmd, viaVoice = false) {
    if (!cmd.trim()) return;
    history.unshift(cmd); histIdx = -1;
    try {
      const res = await Brain.interpret(cmd, ctx());
      if (!res) return;
      const entry = log(cmd, res.html, viaVoice);
      if (ambientOn) $('ambCallout').textContent = '› ' + res.html.replace(/<[^>]+>/g, '').slice(0, 160);
      if (res.say) Voice.speak(res.say, { onStart: () => entry.classList.add('speaking'), onEnd: () => entry.classList.remove('speaking') });
    } catch (e) {
      log(cmd, `<span class="err">Error: ${esc(e.message)}</span>`, viaVoice);
    }
  }
  $('cmdForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('cmdInput').value; $('cmdInput').value = ''; run(v); });
  $('cmdInput').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) { histIdx = Math.min(histIdx + 1, history.length - 1); e.target.value = history[histIdx]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { histIdx = Math.max(histIdx - 1, -1); e.target.value = histIdx === -1 ? '' : history[histIdx]; e.preventDefault(); }
    else if (e.key === 'Escape') { e.target.value = ''; Voice.stopSpeaking(); }
  });
  $('cmdOutput').addEventListener('click', (e) => { const chip = e.target.closest('.chip'); if (chip) run(chip.dataset.cmd); });
  document.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); $('cmdInput').focus(); }
    if (e.key === 'Escape' && ambientOn) setAmbient(false);
  });

  // ---------- voice: mic button + hands-free ----------
  // Speech engines give several guesses; use the one that makes the most sense as a command
  function bestGuess(text, alts) {
    if (!alts || alts.length < 2 || typeof Brain.score !== 'function') return text;
    const c = ctx();
    let best = text, bs = Brain.score(text, c) + 0.3; // small head start for the engine's first choice
    for (const a of alts) { if (a === text) continue; const s = Brain.score(a, c); if (s > bs) { best = a; bs = s; } }
    return best;
  }
  const micBtn = $('micBtn'), vStatus = $('voiceStatus');
  if (!Voice.canListen) micBtn.classList.add('unsupported');
  function status(text) { vStatus.hidden = !text; vStatus.textContent = text || ''; $('ambListen').textContent = text || ''; }
  $('stopBtn').addEventListener('click', () => Voice.stopSpeaking());
  micBtn.addEventListener('click', () => {
    Voice.listenOnce({
      onState(on) { micBtn.classList.toggle('listening', on); document.body.classList.toggle('v-listening', on); status(on ? 'LISTENING…' : hfOn ? 'SAY “JARVIS”' : ''); if (on) $('cmdInput').value = ''; },
      onInterim(text) { $('cmdInput').value = text; status('LISTENING… ' + text.toUpperCase()); },
      onFinal(text, alts) { $('cmdInput').value = ''; run(bestGuess(text, alts), true); },
      onError(m) { status(''); micBtn.classList.remove('listening'); log('voice', `<span class="err">${esc(m)}</span>`); },
    });
  });

  let hfOn = false;
  function setHandsFree(on, announce) {
    Voice.setPref('handsFree', !!on);
    $('setHandsFree').checked = !!on;
    if (on) {
      hfOn = Voice.startWake({
        onWake() { Voice.speak(pick(['Yes?', 'Sir?', 'Listening.', 'Go ahead.']).replace('Sir?', prefs.title ? `${cap(prefs.title)}?` : 'Yes?'), { force: false }); },
        onCommand(text, alts) { status(''); $('cmdInput').value = ''; run(bestGuess(text, alts), true); },
        onInterim(text) { status('🎙 ' + text.toUpperCase()); $('cmdInput').value = text; },
        onState(s) {
          document.body.classList.toggle('v-awake', s === 'awake');
          document.body.classList.toggle('v-hf', s === 'on' || s === 'awake');
          $('hfBtn').classList.toggle('on', s === 'on' || s === 'awake');
          status(s === 'awake' ? 'LISTENING FOR YOUR COMMAND…' : s === 'on' ? 'SAY “JARVIS”' : s === 'paused' ? 'HANDS-FREE PAUSED · TAP 🎧' : '');
          if (s === 'on' || s === 'awake') $('cmdInput').value = '';
        },
        onError(m) { log('hands-free', `<span class="err">${esc(m)}</span>`); },
      });
      if (announce && hfOn) log('hands-free', 'Hands-free is <b>on</b>. Just say “JARVIS” followed by anything — or “JARVIS” and wait for me. No tapping needed while the app is open.');
    } else {
      Voice.stopWake(); hfOn = false;
      $('hfBtn').classList.remove('on'); document.body.classList.remove('v-hf', 'v-awake'); status('');
      if (announce) log('hands-free', 'Hands-free is <b>off</b>. Tap 🎙 to talk.');
    }
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  $('hfBtn').addEventListener('click', () => setHandsFree(!hfOn || !$('hfBtn').classList.contains('on'), true));
  $('headerCore').addEventListener('click', () => { if (Voice.prefs.handsFree) setHandsFree(true); else micBtn.click(); });

  function renderMute() {
    const m = Voice.isMuted(), btn = $('muteBtn');
    btn.classList.toggle('muted', m);
    btn.innerHTML = m
      ? '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
    btn.title = m ? 'Voice replies off — tap to turn on' : 'Voice replies on — tap to mute';
    $('setVoice').checked = !m;
  }
  $('muteBtn').addEventListener('click', () => { Voice.setMuted(!Voice.isMuted()); renderMute(); });

  // ---------- settings ----------
  const dlg = $('settings');
  let downOnBackdrop = false, openedAt = 0;
  function fillVoices() {
    const list = Voice.voices(), sel = $('setVoiceSel'), curName = Voice.voiceName();
    sel.innerHTML = list.map((v) => `<option value="${esc(v.voiceURI)}" ${v.name === curName ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})${/natural|neural|premium|enhanced/i.test(v.name) ? ' ★' : ''}</option>`).join('') || '<option>No voices found</option>';
  }
  async function openSettings() {
    const c = Data.loadCreds();
    $('setKey').value = c ? c.key : '';
    $('setAccount').value = c ? c.account : '';
    $('setEnv').value = c ? c.env || 'practice' : 'practice';
    $('setMsg').textContent = '';
    $('setTitle').value = prefs.title;
    $('setBirthday').value = prefs.birthday || '';
    $('setCity').value = prefs.weatherCity || '';
    $('setPaperBal').value = Paper.stats().start;
    $('setRisk').value = prefs.maxRisk || 250;
    $('setBoot').checked = prefs.boot !== false;
    $('setHandsFree').checked = !!Voice.prefs.handsFree;
    $('setRate').value = Voice.prefs.rate; $('setPitch').value = Voice.prefs.pitch;
    $('rateVal').textContent = (+Voice.prefs.rate).toFixed(2); $('pitchVal').textContent = (+Voice.prefs.pitch).toFixed(2);
    fillVoices();
    const m = await Data.mode();
    $('setMode').innerHTML = {
      direct: '<span class="up">●</span> Using the OANDA key saved on <b>this device</b>.',
      server: '<span class="up">●</span> Using the key from the <b>PC’s .env file</b>. Save a key below to make this device work away from home too.',
      demo: '<span class="warn">●</span> <b>Demo mode</b> — enter your OANDA details below.',
    }[m];
    renderMute();
    renderSubs();
    openedAt = Date.now();
    if (!dlg.open) dlg.showModal();
  }
  // Settings → Subscriptions & bills: see them all, remove any with ✕
  function renderSubs() {
    const box = $('subsList');
    if (!box || typeof Life === 'undefined' || !Life.subsList) return;
    const L = Life.subsList();
    const per = { month: '/mo', year: '/yr', week: '/wk' };
    box.innerHTML = L.length ? L.map((x) => `<div class="sub-row"><span><b>${esc(x.name.charAt(0).toUpperCase() + x.name.slice(1))}</b> <span class="dim">${x.amt != null ? '$' + x.amt.toFixed(2) : '$?'}${per[x.period] || ''}${x.period === 'month' && x.day ? ' · the ' + x.day + (x.day % 10 === 1 && x.day !== 11 ? 'st' : x.day % 10 === 2 && x.day !== 12 ? 'nd' : x.day % 10 === 3 && x.day !== 13 ? 'rd' : 'th') : ''}</span></span><button type="button" class="icon-btn sub-del" data-sub="${esc(x.name)}" aria-label="Remove ${esc(x.name)}">✕</button></div>`).join('')
      : '<p class="dim small">None saved yet.</p>';
    $('subsClear').hidden = !L.length;
  }
  $('subsList').addEventListener('click', (e) => { const b = e.target.closest('[data-sub]'); if (b) { Life.removeSub(b.dataset.sub); renderSubs(); } });
  $('subsClear').addEventListener('click', () => { if (confirm('Remove all subscriptions and bills?')) { Life.clearSubs(); renderSubs(); } });
  $('settingsBtn').addEventListener('click', openSettings);
  $('bannerSetup').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg && Date.now() - openedAt > 400; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && downOnBackdrop) dlg.close(); downOnBackdrop = false; });

  $('setSave').addEventListener('click', async () => {
    const c = { key: $('setKey').value.trim(), account: $('setAccount').value.trim(), env: $('setEnv').value };
    const msg = $('setMsg');
    if (!c.key || !c.account) { msg.innerHTML = '<span class="err">Enter both the API key and the account ID.</span>'; return; }
    msg.textContent = 'Testing with OANDA…';
    try {
      await Data.testCreds(c);
      Data.saveCreds(c); Data.resetCache();
      msg.innerHTML = '<span class="up">✓ Connected. Key saved on this device.</span>';
      lastPrice = null; prev = null;
      await fetchGold(true);
      setTimeout(() => dlg.close(), 900);
    } catch (e) { msg.innerHTML = `<span class="err">✕ ${esc(e.message)}</span>`; }
  });
  $('setForget').addEventListener('click', async () => {
    Data.clearCreds(); Data.resetCache();
    $('setKey').value = ''; $('setAccount').value = '';
    $('setMsg').innerHTML = 'Key removed from this device.';
    prev = null;
    await fetchGold(true);
  });
  $('setVoice').addEventListener('change', (e) => { Voice.setMuted(!e.target.checked); renderMute(); });
  $('setTitle').addEventListener('input', (e) => { prefs.title = e.target.value.trim(); savePrefs(); });
  $('setBirthday').addEventListener('input', (e) => { prefs.birthday = e.target.value.trim().replace(/\//g, '-'); savePrefs(); });
  $('setCity').addEventListener('input', (e) => { prefs.weatherCity = e.target.value.trim(); savePrefs(); });
  $('setRisk').addEventListener('input', (e) => { const v = +String(e.target.value).replace(/[^0-9.]/g, ''); if (v >= 1 && v <= 1e6) { prefs.maxRisk = v; savePrefs(); } });
  $('paperReset').addEventListener('click', () => {
    const n = Math.round(+String($('setPaperBal').value).replace(/[^0-9.]/g, ''));
    if (!(n >= 100)) { $('paperMsg').textContent = 'Enter a starting balance (100 or more).'; return; }
    if (!confirm(`Reset the paper account to $${n.toLocaleString()}? Open paper trades and history will be cleared.`)) return;
    Paper.reset(n); renderPaper();
    $('paperMsg').textContent = `Paper account reset to $${n.toLocaleString()}.`;
  });
  $('setBoot').addEventListener('change', (e) => { prefs.boot = e.target.checked; savePrefs(); });
  $('setHandsFree').addEventListener('change', (e) => setHandsFree(e.target.checked, true));
  $('setVoiceSel').addEventListener('change', (e) => { Voice.setPref('voiceURI', e.target.value); });
  $('setRate').addEventListener('input', (e) => { Voice.setPref('rate', +e.target.value); $('rateVal').textContent = (+e.target.value).toFixed(2); });
  $('setPitch').addEventListener('input', (e) => { Voice.setPref('pitch', +e.target.value); $('pitchVal').textContent = (+e.target.value).toFixed(2); });
  $('setPreview').addEventListener('click', () => {
    const T = prefs.title ? `, ${prefs.title}` : '';
    Voice.speak(gold ? `Good day${T}. Gold is at ${Math.round(gold.price.bid)} and the bias is ${gold.bias.bias.toLowerCase()}.` : `Good day${T}. All systems online.`, { force: true });
  });

  // ---------- boot sequence ----------
  const bootLog = $('bootLog');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function bootLine(label, task, fast) {
    const line = document.createElement('div');
    line.className = 'boot-line';
    line.innerHTML = `<span>${label}</span><span class="dots"></span><span class="res">…</span>`;
    bootLog.appendChild(line);
    let res = 'ONLINE', ok = true;
    try { res = (await Promise.all([task(), wait(fast ? 0 : 260)]))[0] || 'ONLINE'; } catch (e) { res = 'FAULT'; ok = false; }
    line.querySelector('.res').textContent = res;
    line.classList.add(ok ? 'ok' : 'bad');
  }
  async function boot() {
    const fast = prefs.boot === false;
    document.body.classList.add('booting');
    if (!fast) await wait(900); // core powers on
    await bootLine('CORE SYSTEMS', async () => 'ONLINE', fast);
    await bootLine('CONFIG', async () => { await loadConfig(); return `${config.projects.length} PROJECTS`; }, fast);
    await bootLine('MARKET LINK', async () => { const g = await fetchGold(); if (!g) throw new Error(); return g.mode === 'demo' ? 'DEMO' : 'OANDA ' + String(g.env).toUpperCase(); }, fast);
    await bootLine('BIAS ENGINE', async () => (gold ? gold.bias.bias.toUpperCase() : 'STANDBY'), fast);
    await bootLine('TIMEFRAMES', async () => (gold ? (gold.mtf.aligned ? 'ALIGNED' : 'TRACKING') : 'STANDBY'), fast);
    await bootLine('SESSIONS', async () => { tickClocks(); return 'TRACKING'; }, fast);
    await bootLine('PAPER DESK', async () => { await paperCatchUp(); renderPaper(); const n = Paper.positions().length; return n ? `${n} OPEN` : '$' + Math.round(Paper.stats().balance).toLocaleString('en-US'); }, fast);
    await bootLine('NEWS FEED', async () => { const ev = await News.load(); const n = News.relevant().filter((e) => News.isHigh(e) && e.at > Date.now()).length; return ev.length ? `${n} RED THIS WEEK` : 'OFFLINE'; }, fast);
    await bootLine('VOICE', async () => (Voice.canSpeak ? Voice.voiceName().split(' ')[0].toUpperCase() : 'TEXT ONLY'), fast);
    $('bootGo').hidden = false;
    $('bootGo').focus();
  }
  // copy JARVIS's cloud trades (taken while the phone was off) into the paper account
  function syncCloud() { if (typeof Life !== 'undefined' && Life.cloudSync) Life.cloudSync(prefs.maxRisk || 250).then(() => renderPaper()).catch(() => {}); }
  function engage() {
    if (document.body.classList.contains('engaged')) return;
    document.body.classList.add('engaged');
    $('boot').classList.add('done');
    setTimeout(() => { $('boot').hidden = true; document.body.classList.remove('booting'); }, 700);
    syncCloud();
    const hello = Brain.greeting(ctx());
    const e = log('JARVIS online', hello.html);
    Voice.speak(hello.say, { onStart: () => e.classList.add('speaking'), onEnd: () => e.classList.remove('speaking') });
    if (Voice.prefs.handsFree) setTimeout(() => setHandsFree(true), 400);
    if (matchMedia('(min-width: 761px)').matches) $('cmdInput').focus();
  }
  $('bootGo').addEventListener('click', engage);
  $('boot').addEventListener('click', (e) => { if (!$('bootGo').hidden && e.target !== $('bootGo')) engage(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('boot').hidden && !$('bootGo').hidden) { e.preventDefault(); engage(); } });

  // debugging / testing from the browser console
  window.JARVIS = { callout: (text) => callout('test-' + Date.now(), text), ambient: setAmbient, run };

  // ---------- reminders ----------
  function remindPop(list) {
    const T = prefs.title ? `, ${prefs.title}` : '';
    for (const r of list) {
      const txt = r.text.charAt(0).toUpperCase() + r.text.slice(1);
      callout('rem-' + r.id, txt, `Reminder${T}: ${r.text}.`, 'REMINDER');
      log('reminder', `<span class="warn">⏰ REMINDER</span> <b>${esc(txt)}</b>`);
    }
  }
  setInterval(() => { if (document.body.classList.contains('engaged')) remindPop(Reminders.takeDue(Date.now())); }, 15000);
  // timers (chime) and water reminders
  function chime() {
    try {
      const A = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((d, i) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = [880, 1175, 1568][i]; g.gain.setValueAtTime(0.0001, A.currentTime + d); g.gain.exponentialRampToValueAtTime(0.3, A.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + d + 0.35); o.connect(g).connect(A.destination); o.start(A.currentTime + d); o.stop(A.currentTime + d + 0.4); });
    } catch {}
  }
  setInterval(() => {
    if (!document.body.classList.contains('engaged') || typeof Life === 'undefined') return;
    for (const x of Life.due(Date.now(), TZ())) { callout(x.key, x.text, x.say, x.tag); if (x.chime) { chime(); log('timer', `<span class="warn">${esc(x.text)}</span>`); } }
  }, 2000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!document.body.classList.contains('engaged')) return;
    const list = Reminders.takeDue(Date.now());
    if (hiddenAt && Date.now() - hiddenAt > 10 * 60e3) list.push(...Reminders.takeOnReturn());
    remindPop(list);
  });

  (async () => {
    renderMute();
    renderBell();
    await boot();
    setInterval(tickClocks, 1000);
    setInterval(() => { if (!document.hidden) News.load(); }, 30 * 60e3);
    setInterval(() => { if (!document.hidden) fetchGold(); }, PRICE_POLL_MS);
    setInterval(() => { if (!document.hidden) syncCloud(); }, 3 * 60e3);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { fetchGold().then(() => paperCatchUp()); loadConfig(); News.load(); syncCloud(); } });
  })();
})();
