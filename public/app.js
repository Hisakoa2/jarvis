// JARVIS dashboard controller
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = Brain.esc;
  const f2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const PRICE_POLL_MS = 5000;
  const PREFS_KEY = 'jarvis.prefs';

  let prefs = { title: 'sir', boot: true, birthday: '11-15' };
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
      config = { projects: p.projects || [], sessions: s };
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
        <span class="tile-url">${esc(p.url)}</span>
      </a>`).join('') || '<div class="dim">No projects yet — add some to config/projects.json</div>';
  }
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
        $('lastUpdate').textContent = 'UPDATED ' + new Date().toLocaleTimeString('en-US', { timeZone: TZ(), hour12: false }) + ' ET';
        detectDataCallouts(gold);
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
    $('nyClock').textContent = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false });
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
  function callout(key, text, say) {
    if (fired.has(key)) return;
    fired.add(key);
    const c = { key, text, say: say || text, at: Date.now() };
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
    t.innerHTML = `<span class="toast-tag">CALLOUT</span><span class="toast-text">${esc(c.text)}</span><span class="toast-play">▶ TAP TO HEAR</span>`;
    t.addEventListener('click', () => { playCallout(c); t.remove(); });
    $('toasts').prepend(t);
    while ($('toasts').children.length > 3) $('toasts').lastChild.remove();
    setTimeout(() => t.classList.add('out'), 20000);
    setTimeout(() => t.remove(), 20600);
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
      tz: TZ(), title: prefs.title, birthday: prefs.birthday,
      news: typeof News !== 'undefined' ? News : null,
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
  const micBtn = $('micBtn'), vStatus = $('voiceStatus');
  if (!Voice.canListen) micBtn.classList.add('unsupported');
  function status(text) { vStatus.hidden = !text; vStatus.textContent = text || ''; $('ambListen').textContent = text || ''; }
  micBtn.addEventListener('click', () => {
    Voice.listenOnce({
      onState(on) { micBtn.classList.toggle('listening', on); document.body.classList.toggle('v-listening', on); status(on ? 'LISTENING…' : hfOn ? 'SAY “HEY JARVIS”' : ''); if (on) $('cmdInput').value = ''; },
      onInterim(text) { $('cmdInput').value = text; status('LISTENING… ' + text.toUpperCase()); },
      onFinal(text) { $('cmdInput').value = ''; run(text, true); },
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
        onCommand(text) { status(''); $('cmdInput').value = ''; run(text, true); },
        onInterim(text) { status('🎙 ' + text.toUpperCase()); $('cmdInput').value = text; },
        onState(s) {
          document.body.classList.toggle('v-awake', s === 'awake');
          document.body.classList.toggle('v-hf', s === 'on' || s === 'awake');
          $('hfBtn').classList.toggle('on', s === 'on' || s === 'awake');
          status(s === 'awake' ? 'LISTENING FOR YOUR COMMAND…' : s === 'on' ? 'SAY “HEY JARVIS”' : s === 'paused' ? 'HANDS-FREE PAUSED · TAP 🎧' : '');
          if (s === 'on' || s === 'awake') $('cmdInput').value = '';
        },
        onError(m) { log('hands-free', `<span class="err">${esc(m)}</span>`); },
      });
      if (announce && hfOn) log('hands-free', 'Hands-free is <b>on</b>. Say “Hey JARVIS” followed by anything — or just “Hey JARVIS” and wait for me.');
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
    openedAt = Date.now();
    if (!dlg.open) dlg.showModal();
  }
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
    await bootLine('NEWS FEED', async () => { const ev = await News.load(); const n = News.relevant().filter((e) => News.isHigh(e) && e.at > Date.now()).length; return ev.length ? `${n} RED THIS WEEK` : 'OFFLINE'; }, fast);
    await bootLine('VOICE', async () => (Voice.canSpeak ? Voice.voiceName().split(' ')[0].toUpperCase() : 'TEXT ONLY'), fast);
    $('bootGo').hidden = false;
    $('bootGo').focus();
  }
  function engage() {
    if (document.body.classList.contains('engaged')) return;
    document.body.classList.add('engaged');
    $('boot').classList.add('done');
    setTimeout(() => { $('boot').hidden = true; document.body.classList.remove('booting'); }, 700);
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

  (async () => {
    renderMute();
    renderBell();
    await boot();
    setInterval(tickClocks, 1000);
    setInterval(() => { if (!document.hidden) News.load(); }, 30 * 60e3);
    setInterval(() => { if (!document.hidden) fetchGold(); }, PRICE_POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { fetchGold(); loadConfig(); News.load(); } });
  })();
})();
