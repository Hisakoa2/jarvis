// JARVIS dashboard controller
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = Commands.esc;
  const f2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const PRICE_POLL_MS = 5000;

  let config = { projects: [], sessions: { displayTimezone: 'America/New_York', sessions: [] } };
  let gold = null;
  let lastPrice = null;
  const TZ = () => config.sessions.displayTimezone || 'America/New_York';
  const fmtT = (ms, day) => Sessions.fmtTime(ms, TZ(), day);

  // ---------- config ----------
  async function loadConfig() {
    try {
      const [p, s] = await Promise.all([
        fetch('config/projects.json', { cache: 'no-store' }).then((r) => r.json()),
        fetch('config/sessions.json', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      config = { projects: p.projects || [], sessions: s };
    } catch (e) {
      log('config', `<span class="err">Couldn’t read the config files (${esc(e.message)}). Check config/projects.json for a missing comma.</span>`);
    }
    renderProjects();
  }

  // On the home network the phone opens the PC by IP — swap "localhost" for that IP.
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

  // ---------- gold ----------
  let fetching = null;
  function fetchGold(force = false) {
    if (fetching && !force) return fetching;
    fetching = (async () => {
      try {
        gold = await Data.snapshot({ forceCandles: force });
        renderGold();
        const labels = { demo: 'DEMO DATA', server: 'OANDA · PC KEY', direct: `OANDA ${String(gold.env).toUpperCase()}` };
        setLink(gold.mode === 'demo' ? 'demo' : 'ok', labels[gold.mode]);
        $('demoBanner').hidden = gold.mode !== 'demo';
        $('lastUpdate').textContent = 'UPDATED ' + new Date().toLocaleTimeString('en-US', { timeZone: TZ(), hour12: false }) + ' ET';
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

  function renderGold() {
    const g = gold;
    const p = g.price.bid;
    const el = $('price');
    el.textContent = f2(p);
    if (lastPrice != null && p !== lastPrice) {
      el.classList.remove('flash-up', 'flash-down');
      void el.offsetWidth;
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
  }

  function renderSpark(values, up) {
    const svg = $('spark');
    if (!values || values.length < 2) { svg.innerHTML = ''; return; }
    const W = 300, H = 70, pad = 4;
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * W, pad + (1 - (v - min) / span) * (H - pad * 2)]);
    const line = pts.map((pt) => pt.map((n) => n.toFixed(1)).join(',')).join(' ');
    const hex = up ? '#22ff9a' : '#ff4d6d';
    const last = pts[pts.length - 1];
    svg.innerHTML = `
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${hex}" stop-opacity=".28"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></linearGradient></defs>
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
    $('biasSince').textContent = b.since
      ? `SINCE ${fmtT(b.since, true).toUpperCase()} ET`
      : `HELD FOR ${Math.round((b.lastCloseTime - b.sinceWindowStart) / 3600e3)}H+`;
    $('biasMeter').innerHTML = r.rules.map((x) => `<i class="${x.vote > 0 ? 'b' : x.vote < 0 ? 's' : ''}" title="${esc(x.name)}"></i>`).join('');

    const pend = $('biasPending');
    if (b.pending) {
      pend.className = 'bias-pending on ' + b.pending.to;
      pend.innerHTML = `⚠ ${b.pending.to.toUpperCase()} FLIP PENDING · ${b.pending.count}/${b.pending.need} CANDLES` +
        `<span class="pips">${Array.from({ length: b.pending.need }, (_, i) => `<i class="${i < b.pending.count ? 'f' : ''}"></i>`).join('')}</span>`;
    } else {
      pend.className = 'bias-pending';
      pend.textContent = 'STABLE · NO FLIP PENDING';
    }

    const liveBy = Object.fromEntries(b.live.map((x) => [x.name, x]));
    $('biasRules').innerHTML = r.rules.map((x) => {
      const lv = liveBy[x.name];
      const verdict = x.level == null ? 'NOT ENOUGH DATA'
        : x.state === 'above' ? `CLOSED ${f2(x.dist)} ABOVE` : x.state === 'below' ? `CLOSED ${f2(-x.dist)} BELOW` : 'TOO CLOSE · NO VOTE';
      const icon = x.vote > 0 ? '▲' : x.vote < 0 ? '▼' : '•';
      const cls = x.vote > 0 ? 'up' : x.vote < 0 ? 'down' : 'warn';
      const liveTxt = lv && lv.dist != null ? `live ${lv.dist >= 0 ? '+' : ''}${f2(lv.dist)}` : '';
      return `<li><span class="v ${cls}">${icon}</span>
        <span><span class="n">${esc(x.name)} · ${x.level != null ? f2(x.level) : '--'}</span>
        <span class="${cls}">${verdict}</span> <span class="dim small">${liveTxt}</span></span></li>`;
    }).join('');

    $('biasFoot').innerHTML = `CLOSED 1H CANDLES ONLY · LAST ${fmtT(b.lastCloseTime, false)} · NEXT ${fmtT(b.nextCheck, false)} ET<br>BUFFER ±${f2(b.buffer)} (${b.settings.bufferAtr}×ATR) · FLIP NEEDS ${b.settings.confirmCandles} CANDLES`;
  }

  // ---------- clocks ----------
  function tickClocks() {
    const now = new Date();
    const tz = TZ();
    $('nyClock').textContent = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false });
    $('nyDate').textContent = 'NEW YORK · ' + now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    $('sessions').innerHTML = (config.sessions.sessions || []).map((s) => {
      const st = Sessions.status(s, now.getTime());
      if (!st) return `<div class="sess"><div class="sess-name">${esc(s.name)}</div><div class="sess-sub err">Check config/sessions.json</div></div>`;
      if (st.open) {
        return `<div class="sess open">
          <div class="sess-top"><span class="sess-name">${esc(s.name.toUpperCase())}</span><span class="sess-state">● OPEN</span></div>
          <div class="sess-count">${Sessions.countdown(st.closesAt - now)}</div>
          <div class="sess-sub">until close · ${Sessions.fmtTime(st.closesAt, tz, false)} ET</div>
          <div class="bar"><i style="width:${(st.progress * 100).toFixed(1)}%"></i></div></div>`;
      }
      return `<div class="sess">
        <div class="sess-top"><span class="sess-name">${esc(s.name.toUpperCase())}</span><span class="sess-state">CLOSED</span></div>
        <div class="sess-count">${Sessions.countdown(st.opensAt - now)}</div>
        <div class="sess-sub">until open · ${Sessions.fmtTime(st.opensAt, tz, true)} ET</div></div>`;
    }).join('');
  }

  // ---------- command bar ----------
  const history = [];
  let histIdx = -1;

  function log(q, html, viaVoice) {
    const out = $('cmdOutput');
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `<div class="q">${viaVoice ? '<span class="mic-tag">🎙</span> ' : ''}${esc(q)}</div><div class="a">${html}</div>`;
    out.prepend(div);
    while (out.children.length > 25) out.lastChild.remove();
    out.scrollTop = 0;
    return div;
  }

  function ctx() {
    return {
      gold: () => gold,
      refresh: (force) => fetchGold(!!force),
      projects: config.projects || [],
      sessions: config.sessions,
      openProject,
      clear: () => { $('cmdOutput').innerHTML = ''; },
      setMuted: (m) => { Voice.setMuted(m); renderMute(); },
      tz: TZ(),
    };
  }

  async function run(cmd, viaVoice = false) {
    if (!cmd.trim()) return;
    history.unshift(cmd);
    histIdx = -1;
    try {
      const res = await Commands.interpret(cmd, ctx());
      if (!res) return;
      const entry = log(cmd, res.html, viaVoice);
      if (res.say) Voice.speak(res.say, () => entry.classList.add('speaking'), () => entry.classList.remove('speaking'));
    } catch (e) {
      log(cmd, `<span class="err">Error: ${esc(e.message)}</span>`, viaVoice);
    }
  }

  $('cmdForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('cmdInput');
    const v = input.value;
    input.value = '';
    run(v);
  });

  $('cmdInput').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      histIdx = Math.min(histIdx + 1, history.length - 1);
      e.target.value = history[histIdx];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      histIdx = Math.max(histIdx - 1, -1);
      e.target.value = histIdx === -1 ? '' : history[histIdx];
      e.preventDefault();
    } else if (e.key === 'Escape') {
      e.target.value = '';
      Voice.stopSpeaking();
    }
  });

  $('cmdOutput').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) run(chip.dataset.cmd);
  });

  document.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); $('cmdInput').focus(); }
  });

  // ---------- voice ----------
  const micBtn = $('micBtn');
  const vStatus = $('voiceStatus');
  if (!Voice.canListen) micBtn.classList.add('unsupported');
  micBtn.addEventListener('click', () => {
    Voice.listen({
      onState(on) {
        micBtn.classList.toggle('listening', on);
        vStatus.hidden = !on;
        if (on) { vStatus.textContent = 'LISTENING…'; $('cmdInput').value = ''; }
      },
      onInterim(text) { $('cmdInput').value = text; vStatus.textContent = 'LISTENING… ' + text.toUpperCase(); },
      onFinal(text) { $('cmdInput').value = ''; run(text, true); },
      onError(m) { vStatus.hidden = true; micBtn.classList.remove('listening'); log('voice', `<span class="err">${esc(m)}</span>`); },
    });
  });

  function renderMute() {
    const m = Voice.isMuted();
    const btn = $('muteBtn');
    btn.classList.toggle('muted', m);
    btn.innerHTML = m
      ? '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
    btn.title = m ? 'Voice replies are off — tap to turn on' : 'Voice replies are on — tap to mute';
    $('setVoice').checked = !m;
  }
  $('muteBtn').addEventListener('click', () => { Voice.setMuted(!Voice.isMuted()); renderMute(); });

  // ---------- settings ----------
  const dlg = $('settings');
  async function openSettings() {
    const c = Data.loadCreds();
    $('setKey').value = c ? c.key : '';
    $('setAccount').value = c ? c.account : '';
    $('setEnv').value = c ? c.env || 'practice' : 'practice';
    $('setMsg').textContent = '';
    const m = await Data.mode();
    $('setMode').innerHTML = {
      direct: '<span class="up">●</span> Using the OANDA key saved on <b>this device</b>.',
      server: '<span class="up">●</span> Using the key from the <b>PC’s .env file</b> (Run JARVIS.bat). Nothing needed here — but saving a key below makes this device work away from home too.',
      demo: '<span class="warn">●</span> <b>Demo mode</b> — no key yet. Enter your OANDA details below.',
    }[m];
    $('setVoiceInfo').textContent = (Voice.canSpeak ? `Voice: ${Voice.voiceName()}. ` : 'This browser can’t speak. ') +
      (Voice.canListen ? 'Mic: tap 🎙 and speak. Speech-to-text is done by Apple/Google, like dictation.' : 'Voice commands aren’t supported in this browser — use the keyboard’s dictation mic instead.');
    renderMute();
    openedAt = Date.now();
    if (!dlg.open) dlg.showModal();
  }
  $('settingsBtn').addEventListener('click', openSettings);
  $('bannerSetup').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', () => dlg.close());
  // Tap outside the box to close — only if the tap both started and ended on the backdrop
  let downOnBackdrop = false, openedAt = 0;
  dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg && Date.now() - openedAt > 400; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && downOnBackdrop) dlg.close(); downOnBackdrop = false; });

  $('setSave').addEventListener('click', async () => {
    const c = { key: $('setKey').value.trim(), account: $('setAccount').value.trim(), env: $('setEnv').value };
    const msg = $('setMsg');
    if (!c.key || !c.account) { msg.innerHTML = '<span class="err">Enter both the API key and the account ID.</span>'; return; }
    msg.textContent = 'Testing with OANDA…';
    try {
      await Data.testCreds(c);
      Data.saveCreds(c);
      Data.resetCache();
      msg.innerHTML = '<span class="up">✓ Connected. Key saved on this device.</span>';
      lastPrice = null;
      await fetchGold(true);
      setTimeout(() => dlg.close(), 900);
    } catch (e) {
      msg.innerHTML = `<span class="err">✕ ${esc(e.message)}</span>`;
    }
  });
  $('setForget').addEventListener('click', async () => {
    Data.clearCreds();
    Data.resetCache();
    $('setKey').value = ''; $('setAccount').value = '';
    $('setMsg').innerHTML = 'Key removed from this device.';
    await fetchGold(true);
  });
  $('setVoice').addEventListener('change', (e) => { Voice.setMuted(!e.target.checked); renderMute(); });

  // ---------- boot ----------
  (async () => {
    renderMute();
    await loadConfig();
    tickClocks();
    setInterval(tickClocks, 1000);
    const g = await fetchGold();
    if (g) {
      const hello = Commands.greeting(g, ctx());
      log('JARVIS online', hello.html);
    }
    setInterval(() => { if (!document.hidden) fetchGold(); }, PRICE_POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { fetchGold(); loadConfig(); } });
    if (matchMedia('(min-width: 761px)').matches) $('cmdInput').focus();
  })();
})();
