// ============================================================================
//  JARVIS command bar — plain keyword matching, no AI.
//  Every answer has two versions: `html` (shown on screen) and `say` (spoken).
//  To add a command: add it to COMMANDS (for help + suggestions) and add a
//  matching branch in interpret().
// ============================================================================
const Commands = (() => {
  const COMMANDS = [
    { cmd: 'gold price', desc: 'Live XAU/USD bid price and today’s change', examples: ['gold price', 'price of gold', 'where is gold', 'xau', 'gold'] },
    { cmd: 'gold bias', desc: 'The confirmed bias right now', examples: ['gold bias', 'what is the bias', 'tell me the bias', 'bias today', 'bias for gold'] },
    { cmd: 'why', desc: 'Why the bias is what it is, rule by rule', examples: ['why is it bearish', 'why is it bullish', 'explain the bias', 'why'] },
    { cmd: 'levels', desc: 'Daily open, EMA, yesterday’s midpoint vs price', examples: ['levels', 'key levels', 'gold levels', 'ema'] },
    { cmd: 'briefing', desc: 'Price, bias and next session in one go', examples: ['briefing', 'status report', 'status', 'give me a rundown'] },
    { cmd: 'time until ny open', desc: 'Countdown to the New York open', examples: ['time until ny open', 'ny open', 'new york open', 'when does new york open'] },
    { cmd: 'london open', desc: 'Countdown to the London open', examples: ['london open', 'time until london open', 'when does london open'] },
    { cmd: 'asia open', desc: 'Countdown to the Asia (Tokyo) open', examples: ['asia open', 'tokyo open', 'time until asia open'] },
    { cmd: 'sessions', desc: 'All session countdowns at once', examples: ['sessions', 'next session', 'market hours'] },
    { cmd: 'open <project>', desc: 'Open a project tile, e.g. “open aegis”', examples: [] },
    { cmd: 'projects', desc: 'List your project tiles', examples: ['projects', 'list projects', 'apps'] },
    { cmd: 'mute / unmute', desc: 'Turn spoken replies off or on', examples: ['mute', 'unmute', 'voice off', 'voice on'] },
    { cmd: 'time', desc: 'Current New York time', examples: ['time', 'what time is it', 'clock'] },
    { cmd: 'refresh', desc: 'Re-fetch market data now', examples: ['refresh', 'reload', 'update'] },
    { cmd: 'clear', desc: 'Clear this console', examples: ['clear', 'cls'] },
    { cmd: 'help', desc: 'Show this list', examples: ['help', 'commands', 'what can you do'] },
  ];

  const STOP = 'the a an is it of for to me my in on at what whats where when how hows does do till until time left today now right show tell give please much long current currently s get hey ok okay jarvis about us you can could would i im its'.split(' ');
  const KEYWORDS = 'gold xau xauusd price spot quote bias sentiment direction outlook bullish bearish why explain reason reasons levels level ema midpoint open opens opening close closes closing session sessions market hours help commands menu refresh reload update clear projects project apps list launch start go goto run clock countdown next new york london asia tokyo briefing status report rundown summary mute unmute voice'.split(' ');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const p2 = (n) => Number(n).toFixed(2); // plain number for speech
  function money(n) { // 7.14 -> "7 dollars 14"
    n = Math.abs(n);
    const d = Math.floor(n), c = Math.round((n - d) * 100);
    if (c === 100) return `${d + 1} dollars`;
    if (d === 0) return `${c} cents`;
    return `${d} dollar${d === 1 ? '' : 's'}${c ? ' ' + c : ''}`;
  }

  function norm(s) {
    return String(s)
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/\b(where|what|how|who|when|it|that)'?s\b/g, '$1 is')
      .replace(/\bn\.?\s?y\.?c?\b/g, 'ny')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/^(hey |ok |okay )?jarvis\b/, '')   // "Hey JARVIS, what's the bias"
      .replace(/\s+/g, ' ')
      .trim();
  }

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

  function correct(tokens, vocab) {
    return tokens.map((t) => {
      if (t.length < 3 || vocab.has(t) || STOP.includes(t) || /^\d+$/.test(t)) return t;
      let best = t, bestD = t.length >= 6 ? 3 : 2;
      for (const v of vocab) {
        if (Math.abs(v.length - t.length) > 2) continue;
        const d = lev(t, v);
        if (d < bestD) { bestD = d; best = v; }
      }
      return best;
    });
  }

  const projectKeys = (p) => [p.name, ...(p.aliases || [])].map(norm).filter(Boolean);

  function findProject(text, projects) {
    const q = norm(text).replace(/^(the|my)\s+/, '').replace(/\s+(app|project|tile|dashboard)$/, '');
    if (!q) return null;
    for (const p of projects) if (projectKeys(p).includes(q)) return p;
    for (const p of projects) if (projectKeys(p).some((k) => k.startsWith(q) && q.length >= 3)) return p;
    let best = null, bestD = 3;
    for (const p of projects) for (const k of projectKeys(p)) {
      const d = lev(q, k);
      if (d < bestD && d <= Math.max(1, Math.floor(k.length / 3))) { bestD = d; best = p; }
    }
    return best;
  }

  function findSession(text, sessions) {
    let hit = null, hitLen = 0;
    for (const s of sessions) for (const a of [s.name, ...(s.aliases || [])].map(norm)) {
      if (a.length > hitLen && new RegExp(`\\b${a}\\b`).test(text)) { hit = s; hitLen = a.length; }
    }
    return hit;
  }

  // ---- answers: each returns { html, say } ----------------------------------
  const demoNote = (g) => (g && g.mode === 'demo' ? ' <span class="err">[DEMO DATA — add your OANDA key in Settings]</span>' : '');
  const demoSay = (g) => (g && g.mode === 'demo' ? ' Note: this is demo data.' : '');
  const biasCls = (b) => (b === 'Bullish' ? 'up' : b === 'Bearish' ? 'down' : 'warn');
  const t = (ms, tz, day) => Sessions.fmtTime(ms, tz, day);

  function priceAnswer(g) {
    const up = g.change >= 0;
    const cls = up ? 'up' : 'down';
    return {
      html: `Gold (XAU/USD) is at <b>${f2(g.price.bid)}</b>, <span class="${cls}">${up ? '▲ +' : '▼ '}${f2(g.change)} (${up ? '+' : ''}${g.changePct.toFixed(2)}%)</span> vs yesterday’s close of ${f2(g.prevClose)}.` +
        `<br><span class="dim">Bid ${f2(g.price.bid)} · Ask ${f2(g.price.ask)} · Spread ${f2(g.price.spread)} · Day range ${f2(g.dayLow)} – ${f2(g.dayHigh)}${g.price.tradeable ? '' : ' · MARKET CLOSED'}</span>` + demoNote(g),
      say: `Gold is at ${p2(g.price.bid)}, ${up ? 'up' : 'down'} ${money(g.change)} on the day.${g.price.tradeable ? '' : ' The market is currently closed.'}` + demoSay(g),
    };
  }

  // Spoken time: "5 AM today", "11 PM yesterday", "Monday at 9 AM"
  function sayWhen(ms, tz) {
    const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms)).replace(':00', '');
    const day = (x) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(x));
    if (day(ms) === day(Date.now())) return `${time} today`;
    if (day(ms) === day(Date.now() - 86400e3)) return `${time} yesterday`;
    return `${new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date(ms))} at ${time}`;
  }

  function sinceText(b, tz) {
    if (b.since) return { html: `since ${t(b.since, tz, true)} ET`, say: `since ${sayWhen(b.since, tz)}` };
    return { html: `for at least the last ${Math.round((b.lastCloseTime - b.sinceWindowStart) / 3600e3)} hours`, say: 'for at least the last few days' };
  }

  function pendingText(b) {
    if (!b.pending) return { html: 'No flip pending.', say: 'No flip is pending.' };
    return {
      html: `<span class="${biasCls(b.pending.to)}">${b.pending.to} flip pending</span> — ${b.pending.count} of ${b.pending.need} candles confirmed.`,
      say: `A ${b.pending.to.toLowerCase()} flip is pending, ${b.pending.count} of ${b.pending.need} candles confirmed.`,
    };
  }

  function biasAnswer(g, tz) {
    const b = g.bias, r = b.raw;
    const s = sinceText(b, tz), p = pendingText(b);
    return {
      html: `Gold bias is <b class="${biasCls(b.bias)}">${b.bias.toUpperCase()}</b> ${s.html}. At the ${t(b.lastCloseTime, tz, false)} close: ${r.bullish} bullish, ${r.bearish} bearish of ${r.total} rules. ${p.html}` +
        `<br><span class="dim">Next check at ${t(b.nextCheck, tz, false)} ET. Say “why” for the reasons.</span>` + demoNote(g),
      say: `Gold bias is ${b.bias.toLowerCase()}, and has been ${s.say}. ${r.bullish} bullish and ${r.bearish} bearish of ${r.total} rules. ${p.say}` + demoSay(g),
    };
  }

  function whyAnswer(g, tz, asked) {
    const b = g.bias, r = b.raw;
    const wrong = asked && asked !== b.bias ? { html: `It’s actually <b class="${biasCls(b.bias)}">${b.bias.toUpperCase()}</b>, not ${asked.toLowerCase()}. `, say: `It's actually ${b.bias.toLowerCase()}, not ${asked.toLowerCase()}. ` } : { html: '', say: '' };
    const s = sinceText(b, tz), p = pendingText(b);
    const rows = r.rules.map((x) => {
      if (x.level == null) return { html: `<li>• ${esc(x.name)}: not enough data</li>`, say: `${x.label}: not enough data.` };
      if (x.state === 'above') return { html: `<li><span class="up">▲</span> Closed <b>${f2(x.dist)}</b> above ${esc(x.label)} (${f2(x.level)})</li>`, say: `above ${x.label} by ${money(x.dist)}` };
      if (x.state === 'below') return { html: `<li><span class="down">▼</span> Closed <b>${f2(-x.dist)}</b> below ${esc(x.label)} (${f2(x.level)})</li>`, say: `below ${x.label} by ${money(x.dist)}` };
      return { html: `<li><span class="warn">•</span> Too close to ${esc(x.label)} (${f2(x.level)}) — within the ${f2(b.buffer)} buffer, no vote</li>`, say: `too close to ${x.label} to count` };
    });
    const sayList = rows.map((x) => x.say);
    const joined = sayList.length > 1 ? sayList.slice(0, -1).join(', ') + ', and ' + sayList[sayList.length - 1] : sayList[0];
    return {
      html: wrong.html + `Gold is <b class="${biasCls(b.bias)}">${b.bias.toUpperCase()}</b> ${s.html}. At the last closed 1H candle (${t(b.lastCloseTime, tz, false)} ET, close ${f2(b.lastClose)}):<ul>${rows.map((x) => x.html).join('')}</ul>` +
        `${p.html} <span class="dim">Only closed 1H candles count, a level needs a ${f2(b.buffer)} margin (${b.settings.bufferAtr} × ATR), and a flip needs ${b.settings.confirmCandles} candles in a row.</span>` + demoNote(g),
      say: wrong.say + `Gold has been ${b.bias.toLowerCase()} ${s.say}. At the ${t(b.lastCloseTime, tz, false)} close, price was ${joined}. ${p.say}` + demoSay(g),
    };
  }

  function levelsAnswer(g) {
    const live = g.bias.live;
    const rel = (d) => (d > 0 ? '<span class="up">above</span>' : d < 0 ? '<span class="down">below</span>' : 'at');
    const items = live.filter((x) => x.level != null).map((x) => `<li>${rel(x.dist)} ${esc(x.name)} ${f2(x.level)} <span class="dim">(${x.dist >= 0 ? '+' : ''}${f2(x.dist)})</span></li>`).join('');
    const say = live.filter((x) => x.level != null).map((x) => `${x.name} at ${p2(x.level)}, price is ${x.dist >= 0 ? 'above' : 'below'} by ${money(x.dist)}`).join('. ');
    return {
      html: `Live price <b>${f2(g.price.bid)}</b> vs the bias levels:<ul>${items}<li>${rel(g.price.bid - g.prevClose)} yesterday’s close ${f2(g.prevClose)}</li></ul><span class="dim">Live distances are for information — only closed candles vote.</span>` + demoNote(g),
      say: `${say}.` + demoSay(g),
    };
  }

  function sessionAnswer(sess, tz, wantClose) {
    const st = Sessions.status(sess);
    if (!st) return { html: `Couldn’t work out the ${esc(sess.name)} session times — check config/sessions.json.`, say: 'I could not work out that session.' };
    const now = Date.now();
    if (st.open) {
      const w = Sessions.countdownWords(st.closesAt - now);
      return { html: `<b>${esc(sess.name)}</b> session is <span class="up">OPEN</span> — closes in <b>${w}</b> at ${t(st.closesAt, tz, false)} ET.`, say: `${sess.name} is open. It closes in ${w}.` };
    }
    const w = Sessions.countdownWords(st.opensAt - now);
    if (wantClose) return { html: `<b>${esc(sess.name)}</b> is currently closed. It next opens in <b>${w}</b> (${t(st.opensAt, tz, true)} ET).`, say: `${sess.name} is closed. It opens in ${w}.` };
    return { html: `<b>${esc(sess.name)}</b> opens in <b>${w}</b> — ${t(st.opensAt, tz, true)} ET.`, say: `${sess.name} opens in ${w}, at ${t(st.opensAt, tz, false)} New York time.` };
  }

  function allSessionsAnswer(cfg) {
    const now = Date.now();
    const rows = cfg.sessions.map((s) => ({ s, st: Sessions.status(s) })).filter((x) => x.st);
    rows.sort((a, b) => (b.st.open - a.st.open) || a.st.opensAt - b.st.opensAt);
    return {
      html: 'Sessions (New York time):<ul>' + rows.map(({ s, st }) => st.open
        ? `<li><b>${esc(s.name)}</b> <span class="up">OPEN</span> — closes in ${Sessions.countdownWords(st.closesAt - now)}</li>`
        : `<li><b>${esc(s.name)}</b> opens in ${Sessions.countdownWords(st.opensAt - now)} (${t(st.opensAt, cfg.displayTimezone, true)} ET)</li>`).join('') + '</ul>',
      say: rows.map(({ s, st }) => (st.open ? `${s.name} is open` : `${s.name} opens in ${Sessions.countdownWords(st.opensAt - now)}`)).join('. ') + '.',
    };
  }

  function greetingWord() {
    const h = Sessions.parts(new Date(), 'America/New_York').h;
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  function briefing(g, ctx) {
    const p = priceAnswer(g);
    const b = g.bias;
    const next = ctx.sessions.sessions.map((s) => ({ s, st: Sessions.status(s) })).filter((x) => x.st && !x.st.open).sort((a, b2) => a.st.opensAt - b2.st.opensAt)[0];
    const openNow = ctx.sessions.sessions.filter((s) => { const st = Sessions.status(s); return st && st.open; }).map((s) => s.name);
    const sessHtml = (openNow.length ? `${openNow.join(' and ')} ${openNow.length > 1 ? 'are' : 'is'} open. ` : '') + (next ? `${next.s.name} opens in ${Sessions.countdownWords(next.st.opensAt - Date.now())}.` : '');
    return {
      html: `${greetingWord()}. ${p.html.replace(demoNote(g), '')}<br>Bias is <b class="${biasCls(b.bias)}">${b.bias.toUpperCase()}</b>${b.pending ? ` (${b.pending.to.toLowerCase()} flip pending)` : ''}. ${sessHtml}` + demoNote(g),
      say: `${greetingWord()}. ${p.say.replace(demoSay(g), '')} The bias is ${b.bias.toLowerCase()}${b.pending ? `, with a ${b.pending.to.toLowerCase()} flip pending` : ''}. ${sessHtml}` + demoSay(g),
    };
  }

  const chips = (list) => list.map((c) => `<button type="button" class="chip" data-cmd="${esc(c)}">${esc(c)}</button>`).join('');

  function helpAnswer(projects) {
    const rows = COMMANDS.map((c) => {
      let run = c.cmd;
      if (c.cmd.includes('<')) run = 'open ' + norm(projects[0] ? projects[0].name : 'aegis');
      if (c.cmd.includes('/')) run = c.cmd.split(' / ')[0];
      return `<button type="button" class="chip" data-cmd="${esc(run)}">${esc(c.cmd)}</button><span>${esc(c.desc)}</span>`;
    }).join('');
    return {
      html: `Type or tap the mic and speak. Wording is flexible — “where’s gold”, “tell me the bias”, “why is it bearish”, “when does london open” all work. Tap a command to run it.<div class="help-grid">${rows}</div>`,
      say: 'Here are the commands I know. Ask me for the gold price, the bias, why the bias is what it is, the key levels, a briefing, or when a session opens.',
    };
  }

  function suggest(text, projects) {
    const pool = [];
    for (const c of COMMANDS) for (const e of c.examples) pool.push({ cmd: c.examples[0], e });
    for (const p of projects) pool.push({ cmd: `open ${norm(p.name)}`, e: `open ${norm(p.name)}` });
    const tokens = text.split(' ');
    const scored = pool.map(({ cmd, e }) => {
      const et = e.split(' ');
      const tokenScore = tokens.reduce((acc, tk) => acc + Math.max(...et.map((x) => sim(tk, x))), 0) / tokens.length;
      return { cmd, score: Math.max(sim(text, e), tokenScore * 0.9) };
    });
    const best = new Map();
    for (const s of scored.sort((a, b) => b.score - a.score)) if (!best.has(s.cmd)) best.set(s.cmd, s.score);
    return [...best.keys()].slice(0, 3);
  }

  // ---- interpreter --------------------------------------------------------
  // ctx: { gold(), refresh(), projects, sessions, openProject(p), clear(), setMuted(b), tz }
  // Returns { html, say } or a Promise of it, or null.
  function interpret(raw, ctx) {
    let original = norm(raw);
    if (!original && /jarvis/i.test(raw)) original = 'briefing'; // just "JARVIS" = briefing
    if (!original) return null;
    const vocab = new Set(KEYWORDS);
    for (const p of ctx.projects) projectKeys(p).forEach((k) => k.split(' ').forEach((w) => vocab.add(w)));
    for (const s of ctx.sessions.sessions) [s.name, ...(s.aliases || [])].map(norm).forEach((k) => k.split(' ').forEach((w) => vocab.add(w)));

    const tokens = correct(original.split(' '), vocab);
    const text = tokens.join(' ');
    const fixed = text !== original ? `<span class="dim">(read as “${esc(text)}”)</span> ` : '';
    const has = (...w) => w.some((x) => tokens.includes(x));
    const phrase = (p) => new RegExp(`\\b${p}\\b`).test(text);
    const out = (a) => ({ html: fixed + a.html, say: a.say });
    const withGold = (fn) => {
      const g = ctx.gold();
      if (g) return out(fn(g, ctx.tz));
      return ctx.refresh().then((g2) => (g2 ? out(fn(g2, ctx.tz)) : { html: '<span class="err">No market data available yet — check Settings or your connection.</span>', say: 'Sorry, I have no market data right now.' }));
    };
    const msg = (html, say) => out({ html, say: say ?? html.replace(/<[^>]+>/g, '') });

    if (has('help', 'commands', 'menu') || text === '?' || phrase('what can you do')) return out(helpAnswer(ctx.projects));
    if (text === 'clear' || text === 'cls' || text === 'clear screen') { ctx.clear(); return null; }
    if (has('mute') || phrase('voice off') || phrase('be quiet') || phrase('stop talking')) { ctx.setMuted(true); return msg('Voice replies are <b>off</b>. Say or type “unmute” to turn them back on.', ''); }
    if (has('unmute') || phrase('voice on')) { ctx.setMuted(false); return msg('Voice replies are <b>on</b>.', 'Voice replies are on.'); }
    if (has('refresh', 'reload', 'update')) {
      return ctx.refresh(true).then((g) => (g ? msg(`Data refreshed. Gold ${f2(g.price.bid)}, bias ${g.bias.bias.toUpperCase()}.` + demoNote(g), `Refreshed. Gold is at ${p2(g.price.bid)} and the bias is ${g.bias.bias.toLowerCase()}.`) : msg('<span class="err">Refresh failed — check Settings or your connection.</span>', 'The refresh failed.')));
    }

    // open <project>
    const m = text.match(/^(?:open|launch|start|run|load|goto|go to|show|take me to)\s+(.+)$/);
    if (m) {
      const p = findProject(m[1], ctx.projects);
      if (p) { ctx.openProject(p); return msg(`Opening <b>${esc(p.name)}</b> → <span class="dim">${esc(p.url)}</span>`, `Opening ${p.name}.`); }
      const sess = findSession(m[1], ctx.sessions.sessions);
      if (sess) return out(sessionAnswer(sess, ctx.tz, false));
      return msg(`I don’t have a project called “${esc(m[1])}”. Your projects:<br>${chips(ctx.projects.map((p2_) => 'open ' + norm(p2_.name)))}`, `I don't have a project called ${m[1]}.`);
    }
    const bare = ctx.projects.find((p) => projectKeys(p).includes(text));
    if (bare) { ctx.openProject(bare); return msg(`Opening <b>${esc(bare.name)}</b> → <span class="dim">${esc(bare.url)}</span>`, `Opening ${bare.name}.`); }

    if (has('projects', 'project', 'apps') || phrase('list')) {
      return msg(`You have ${ctx.projects.length} project tiles:<br>${chips(ctx.projects.map((p) => 'open ' + norm(p.name)))}<br><span class="dim">Edit them in config/projects.json</span>`,
        `You have ${ctx.projects.length} projects: ${ctx.projects.map((p) => p.name).join(', ')}.`);
    }

    // briefing
    if (has('briefing', 'status', 'report', 'rundown', 'summary') || text === '' || phrase('how are we looking') || phrase('what is happening')) return withGold((g) => briefing(g, ctx));

    // why (before bias: "why is it bearish")
    if (has('why', 'explain', 'reason', 'reasons') || (has('bearish', 'bullish') && !has('bias'))) return withGold((g, tz) => whyAnswer(g, tz, has('bullish') ? 'Bullish' : has('bearish') ? 'Bearish' : has('neutral') ? 'Neutral' : null));

    const isBias = has('bias', 'sentiment', 'direction', 'outlook');
    const sess = !isBias && findSession(text, ctx.sessions.sessions);
    if (sess) return out(sessionAnswer(sess, ctx.tz, has('close', 'closes', 'closing', 'end', 'ends')));
    if (has('sessions', 'session') || phrase('market hours') || phrase('next open')) return out(allSessionsAnswer(ctx.sessions));

    if (isBias) return withGold(biasAnswer);
    if (has('levels', 'level', 'ema', 'midpoint') || phrase('daily open')) return withGold(levelsAnswer);
    if (has('gold', 'xau', 'xauusd', 'price', 'spot', 'quote')) return withGold(priceAnswer);
    if (has('clock') || text === 'time' || phrase('what is the time') || phrase('what time is it')) {
      const now = new Intl.DateTimeFormat('en-US', { timeZone: ctx.tz, weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date());
      return msg(`It’s <b>${now}</b> in New York.`, `It's ${now} in New York.`);
    }

    const sug = suggest(original, ctx.projects);
    return {
      html: `I didn’t understand “${esc(raw.trim())}”. Did you mean:<br>${chips(sug)}<br><span class="dim">Type <b>help</b> for the full list.</span>`,
      say: `Sorry, I didn't catch that. Did you mean ${sug.slice(0, 2).join(', or ')}?`,
    };
  }

  return { interpret, esc, greeting: (g, ctx) => briefing(g, ctx) };
})();
