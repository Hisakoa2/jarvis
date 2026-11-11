// ============================================================================
//  JARVIS "brain" — plain code, NO AI.
//  How it understands you:
//   1. Your words are cleaned up (contractions, typos, "hey JARVIS" removed).
//   2. A big catalog of phrases (CONCEPTS) turns wording into meanings, so
//      "should I short here", "do I sell now" and "is selling a good idea"
//      all mean the same thing: SELL + ADVICE.
//   3. Each intent scores how well those meanings fit; the best one answers.
//   4. Answers are built from live data + time of day + day of week + market
//      hours, with several phrasings so it doesn't sound robotic.
//  To teach it new wording: add words/phrases to CONCEPTS below.
// ============================================================================
const Brain = (() => {
  // ---------------------------------------------------------------- catalog
  // Each concept: list of phrases (regex fragments). Longest phrases first is not
  // required — every match is collected.
  const CONCEPTS = {
    GOLD: ['gold', 'xau', 'xauusd', 'xau usd', 'the metal', 'bullion'],
    PRICE: ['price', 'quote', 'trading at', 'worth', 'how much is', 'where is gold', 'where is it', 'where are we', 'where is price', 'what is gold at', 'what is it at', 'current price', 'spot', 'rate'],
    BIAS: ['bias', 'direction', 'sentiment', 'lean', 'leaning', 'outlook', 'which way', 'what side', 'bullish or bearish', 'bull or bear', 'bear or bull', 'call on gold', 'your read', 'the read', 'read on gold', 'take on gold', 'thoughts on gold'],
    TREND: ['trend', 'timeframes', 'timeframe', 'time frames', 'time frame', 'higher timeframe', '4h', '4 hour', 'four hour', 'h4', 'daily chart', 'daily trend', 'aligned', 'alignment', 'line up', 'lined up', 'mtf', 'multi timeframe', 'big picture', 'bigger picture'],
    WHY: ['why', 'how come', 'reason', 'reasons', 'explain', 'what makes', 'what is making', 'breakdown', 'break it down', 'walk me through', 'justify', 'details'],
    BULL: ['bullish', 'bull', 'going up', 'rising', 'pumping', 'up trend', 'uptrend'],
    BEAR: ['bearish', 'bear', 'going down', 'falling', 'dropping', 'dumping', 'down trend', 'downtrend'],
    SELL: ['sell', 'selling', 'short', 'shorting', 'shorts', 'go short', 'get short', 'take a sell', 'take a short', 'enter short', 'sell it', 'sold'],
    BUY: ['buy', 'buying', 'long', 'longing', 'go long', 'get long', 'take a buy', 'take a long', 'enter long', 'bought', 'longs'],
    ADVICE: ['should', 'good idea', 'bad idea', 'safe', 'smart', 'worth it', 'be good', 'be okay', 'be ok', 'be fine', 'good time', 'right time', 'ok to', 'okay to', 'do i', 'can i', 'would you', 'risky', 'is it time', 'entry', 'enter', 'take the trade', 'take a trade', 'good trade', 'make money', 'work out', 'play', 'setup', 'set up', 'opportunity', 'chance', 'what do you think', 'thoughts', 'advice', 'recommend'],
    NOW: ['now', 'right now', 'here', 'at this price', 'currently', 'today', 'this moment'],
    LEVELS: ['level', 'levels', 'support', 'resistance', 'key levels', 'zones', 'zone', 'pdh', 'pdl', 'weekly open', 'asia range', 'asia high', 'asia low', 'round number', 'round numbers', 'nearest level', 'next level'],
    DISTANCE: ['how far', 'distance', 'away from', 'from the', 'close to', 'near the', 'points from'],
    RANGE: ['range', 'adr', 'average daily range', 'how much has it moved', 'moved today', 'volatility', 'volatile', 'how much room', 'room left', 'stretched', 'extended', 'overextended'],
    OPEN: ['open', 'opens', 'opening', 'start', 'starts', 'begin', 'begins'],
    CLOSE: ['close', 'closes', 'closing', 'end', 'ends', 'finish', 'finishes'],
    SESSIONS: ['sessions', 'session', 'market hours', 'next session', 'what is open', 'who is open'],
    MARKET: ['market', 'markets', 'trading hours', 'is gold open', 'gold open', 'can i trade', 'can i still trade', 'weekly close', 'week close'],
    HELLO: ['hi', 'hello', 'hey', 'yo', 'sup', 'what is up', 'wassup', 'wsg', 'good morning', 'good afternoon', 'good evening', 'morning', 'evening', 'afternoon', 'greetings', 'you there', 'are you there', 'wake up', 'you awake', 'howdy', 'hiya'],
    HOWAREYOU: ['how are you', 'how are you doing', 'how is it going', 'how you doing', 'how have you been', 'you good', 'you okay', 'you ok', 'how do you feel', 'how is life', 'how is everything', 'how are things', 'what is good', 'how are we', 'you alright', 'how is your day'],
    DAY: ['how is the day', 'how is today', 'how was today', 'how is the market', 'how are the markets', 'how is gold doing', 'how is gold', 'what is happening', 'what is going on', 'anything happening', 'how are we looking', 'what did i miss', 'update me', 'catch me up', 'fill me in', 'what is new', 'how is it looking', 'how does it look', 'what are we looking at', 'state of the market', 'market update'],
    BRIEF: ['briefing', 'brief me', 'status', 'rundown', 'report', 'summary', 'sitrep', 'overview', 'recap', 'full picture'],
    FRIDAY: ['friday'],
    WEEKEND: ['weekend', 'saturday', 'sunday'],
    MONDAY: ['monday'],
    THANKS: ['thanks', 'thank you', 'thank u', 'cheers', 'appreciate', 'nice one', 'good job', 'well done', 'great job', 'you are the best', 'legend', 'nice work', 'good work', 'perfect', 'awesome', 'love you', 'goat'],
    WHO: ['who are you', 'what are you', 'your name', 'what can you do', 'what do you do', 'introduce yourself', 'are you real', 'are you ai', 'are you a robot'],
    BYE: ['bye', 'goodbye', 'good night', 'goodnight', 'see you', 'later', 'that is all', 'that will be all', 'go to sleep', 'sleep', 'signing off', 'i am out', 'peace', 'catch you later'],
    JOKE: ['joke', 'make me laugh', 'something funny', 'funny', 'cheer me up'],
    FEEL_BAD: ['i lost', 'lost money', 'lost a trade', 'took a loss', 'bad day', 'rough day', 'stopped out', 'got stopped', 'blew', 'tired', 'frustrated', 'annoyed', 'stressed', 'down bad', 'red day', 'losing', 'tilted', 'on tilt'],
    FEEL_GOOD: ['i won', 'made money', 'hit my tp', 'hit tp', 'hit my target', 'hit target', 'take profit', 'good day', 'great day', 'winning', 'in profit', 'green day', 'banked', 'cashed out', 'nailed it'],
    TIME: ['what time', 'the time', 'clock', 'time is it'],
    HELP: ['help', 'commands', 'what can i say', 'what can i ask', 'options', 'menu', 'how do i use you', 'what do you know'],
    MUTE: ['mute', 'be quiet', 'quiet', 'shut up', 'stop talking', 'voice off', 'silence', 'hush'],
    UNMUTE: ['unmute', 'voice on', 'talk to me', 'speak up', 'turn voice on'],
    STOPSPEAK: ['stop', 'cancel', 'never mind', 'nevermind', 'forget it'],
    REFRESH: ['refresh', 'reload', 'update data', 'fetch', 'resync', 'sync'],
    AMBIENT: ['ambient', 'ambient mode', 'focus mode', 'full screen', 'fullscreen', 'screensaver', 'monitor mode', 'big screen', 'hud mode', 'display mode'],
    EXIT: ['exit', 'leave', 'close it', 'go back', 'normal mode', 'turn off', 'get out'],
    CALLOUTS: ['callouts', 'callout', 'alerts', 'alert', 'notifications', 'anything new', 'any alerts', 'what did you notice', 'what is new', 'heads up'],
    PROJECTS: ['projects', 'project', 'apps', 'my apps', 'tiles', 'list'],
    SIZE: ['position size', 'lot size', 'how many lots', 'how big', 'how many units', 'units', 'size', 'sizing', 'lots'],
    RISK: ['risk', 'risking', 'percent', 'stop', 'stop loss', 'sl', 'dollar stop', 'point stop'],
    RR: ['risk reward', 'risk to reward', 'r r', 'rr', 'r multiple', 'reward', 'target', 'tp', 'take profit'],
    ACCOUNT: ['balance', 'account', 'equity', 'nav', 'p l', 'pnl', 'profit and loss', 'my trades', 'open trades', 'how am i doing', 'my money', 'unrealized'],
    MATH: ['plus', 'minus', 'times', 'multiplied by', 'divided by', 'over', 'percent of', 'calculate', 'what is \\d', 'math', 'add', 'subtract'],
  };

  const CONTRACTIONS = [
    [/\b(what|where|how|who|when|it|that|there|here|gold|today)'?s\b/g, '$1 is'],
    [/\bi'?m\b/g, 'i am'], [/\b(you|we|they)'?re\b/g, '$1 are'], [/\b(i|you|we|they)'?ve\b/g, '$1 have'],
    [/\b(i|you|we|they|it)'?ll\b/g, '$1 will'], [/\b(i|you|we|they)'?d\b/g, '$1 would'],
    [/\bcan'?t\b/g, 'can not'], [/\bwon'?t\b/g, 'will not'], [/\b(do|does|did|is|are|was|should|would|could)n'?t\b/g, '$1 not'],
    [/\bwhats\b/g, 'what is'], [/\bhows\b/g, 'how is'], [/\bwheres\b/g, 'where is'], [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'],
    [/\bu\b/g, 'you'], [/\bur\b/g, 'your'],[/\bpls|plz\b/g, 'please'], [/\bn\.?\s?y\.?c?\b/g, 'ny'],
  ];
  // Speech recognisers often mishear "Jarvis"
  const WAKE = /\b(hey|hi|ok|okay|yo)?\s*(jarvis|jervis|javis|jarvas|jarves|travis|jarvi)\b/g;

  function clean(s) {
    let t = String(s).toLowerCase().replace(/[’‘`]/g, "'");
    for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
    return t.replace(/([a-z])-([a-z])/g, '$1 $2').replace(/%/g, ' percent ').replace(/\$/g, ' ').replace(/[^a-z0-9.\s+\-*/]+/g, ' ').replace(/(?<!\d)\.|\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function stripWake(t) { return t.replace(WAKE, ' ').replace(/\s+/g, ' ').trim(); }

  const COMPILED = Object.entries(CONCEPTS).map(([k, list]) => [k, new RegExp(`\\b(?:${list.join('|')})\\b`)]);
  const VOCAB = new Set(Object.values(CONCEPTS).flat().flatMap((p) => p.split(' ')).filter((w) => /^[a-z]{3,}$/.test(w)));
  const STOP = new Set('the a an is it of for to me my in on at what where when how does do till until left today now right show tell give please much long current currently get you can could would i am its are was be this that there here and or with your we us our they them good bad not about any some just like really so okay ok want need know think yeah yes no'.split(' '));

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function correct(text, extra) {
    const vocab = new Set([...VOCAB, ...extra]);
    return text.split(' ').map((t) => {
      if (t.length < 4 || vocab.has(t) || STOP.has(t) || /\d/.test(t)) return t;
      let best = t, bestD = t.length >= 7 ? 3 : 2;
      for (const v of vocab) {
        if (Math.abs(v.length - t.length) > 2) continue;
        const d = lev(t, v);
        if (d < bestD) { bestD = d; best = v; }
      }
      return best;
    }).join(' ');
  }

  function concepts(text) {
    const c = new Set();
    for (const [k, re] of COMPILED) if (re.test(text)) c.add(k);
    return c;
  }

  // ---------------------------------------------------------------- helpers
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const f2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const p2 = (n) => Number(n).toFixed(2);
  const sayPrice = (n) => Number(n).toFixed(Math.abs(n) >= 1000 ? 0 : 2);
  function money(n) {
    n = Math.abs(n);
    const d = Math.floor(n), c = Math.round((n - d) * 100);
    if (c === 100) return `${d + 1} dollars`;
    if (d === 0) return `${c} cents`;
    return `${d} dollar${d === 1 ? '' : 's'}${c && d < 100 ? ' ' + c : ''}`;
  }
  const lastPick = {};
  function pick(key, arr) { // random, but never the same line twice in a row
    if (arr.length === 1) return arr[0];
    let i;
    do { i = Math.floor(Math.random() * arr.length); } while (i === lastPick[key]);
    lastPick[key] = i;
    return arr[i];
  }
  const cls = (b) => (b === 'Bullish' ? 'up' : b === 'Bearish' ? 'down' : 'warn');
  const lc = (s) => String(s).toLowerCase();
  const fmtT = (ms, tz, day) => Sessions.fmtTime(ms, tz, day);
  const sayT = (ms, tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms)).replace(':00', '');
  function sayWhen(ms, tz) {
    const day = (x) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(x));
    if (day(ms) === day(Date.now())) return `${sayT(ms, tz)} today`;
    if (day(ms) === day(Date.now() - 86400e3)) return `${sayT(ms, tz)} yesterday`;
    return `${new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date(ms))} at ${sayT(ms, tz)}`;
  }
  const words = Sessions.countdownWords;
  const reply = (html, say) => ({ html, say: say == null ? html.replace(/<[^>]+>/g, '') : say });
  const join = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  // ---------------------------------------------------------------- context
  function context(ctx) {
    const tz = ctx.tz;
    const now = Date.now();
    const p = Sessions.parts(new Date(now), tz);
    const T = (ctx.title || '').trim();
    const sessions = (ctx.sessions.sessions || []).map((s) => ({ s, st: Sessions.status(s, now) })).filter((x) => x.st);
    return {
      tz, now, hour: p.h, T,
      t: T ? `, ${T}` : '',            // ", sir"
      Tc: T ? T[0].toUpperCase() + T.slice(1) : '', // "Sir"
      tod: p.h < 5 ? 'night' : p.h < 12 ? 'morning' : p.h < 17 ? 'afternoon' : p.h < 22 ? 'evening' : 'night',
      weekday: new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date(now)),
      market: Sessions.goldMarket(now),
      openSessions: sessions.filter((x) => x.st.open),
      nextSession: sessions.filter((x) => !x.st.open).sort((a, b) => a.st.opensAt - b.st.opensAt)[0] || null,
      g: ctx.gold(),
    };
  }

  function greet(k) {
    const g = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: k.hour < 5 ? 'Hello' : 'Good evening' }[k.tod];
    return `${g}${k.t}`;
  }

  function marketLine(k) {
    const m = k.market;
    if (m.state === 'weekend') return { html: `Markets are closed for the weekend — they reopen ${fmtT(m.opensAt, k.tz, true)} ET, in ${words(m.opensAt - k.now)}.`, say: `Markets are closed for the weekend. They reopen in ${words(m.opensAt - k.now)}.` };
    if (m.state === 'break') return { html: `Gold is on its daily break — back at ${fmtT(m.opensAt, k.tz, false)} ET.`, say: `Gold is on its daily break, back at ${sayT(m.opensAt, k.tz)}.` };
    if (m.friday && m.weeklyClose) return { html: `It's Friday — the weekly close is in ${words(m.weeklyClose - k.now)} (5 PM ET).`, say: `It's Friday. The weekly close is in ${words(m.weeklyClose - k.now)}.` };
    return null;
  }

  function sessionLine(k) {
    const open = k.openSessions.map((x) => x.s.name);
    const parts = [];
    if (open.length) parts.push(`${join(open)} ${open.length > 1 ? 'are' : 'is'} open`);
    if (k.nextSession) parts.push(`${k.nextSession.s.name} opens in ${words(k.nextSession.st.opensAt - k.now)}`);
    return parts.length ? parts.join('. ') + '.' : '';
  }

  const demoNote = (g) => (g && g.mode === 'demo' ? ' <span class="err">[DEMO DATA — add your OANDA key in Settings]</span>' : '');
  const demoSay = (g) => (g && g.mode === 'demo' ? ' Note, this is demo data.' : '');

  // ---------------------------------------------------------------- data answers
  function priceA(k) {
    const g = k.g, up = g.change >= 0;
    const lead = pick('price', ['Gold is at', 'Gold is trading at', 'We are at', 'Gold sits at']);
    return reply(
      `${lead} <b>${f2(g.price.bid)}</b>, <span class="${up ? 'up' : 'down'}">${up ? '▲ +' : '▼ '}${f2(g.change)} (${up ? '+' : ''}${g.changePct.toFixed(2)}%)</span> on the day.` +
      `<br><span class="dim">Bid ${f2(g.price.bid)} · Ask ${f2(g.price.ask)} · Spread ${f2(g.price.spread)} · Range ${f2(g.dayLow)} – ${f2(g.dayHigh)}${g.price.tradeable ? '' : ' · MARKET CLOSED'}</span>` + demoNote(g),
      `${lead} ${sayPrice(g.price.bid)}${k.t}, ${up ? 'up' : 'down'} ${money(g.change)} on the day.${g.price.tradeable ? '' : ' The market is closed right now.'}` + demoSay(g));
  }

  function sinceOf(b, k) {
    if (b.since) return { html: `since ${fmtT(b.since, k.tz, true)} ET`, say: `since ${sayWhen(b.since, k.tz)}` };
    return { html: `for ${Math.round((b.lastCloseTime - b.sinceWindowStart) / 3600e3)}+ hours`, say: 'for the last few days at least' };
  }
  function pendingOf(b) {
    if (!b.pending) return { html: 'No flip pending.', say: 'No flip pending.' };
    return { html: `<span class="${cls(b.pending.to)}">${b.pending.to} flip pending</span> — ${b.pending.count}/${b.pending.need} candles.`, say: `Heads up, a ${lc(b.pending.to)} flip is pending, ${b.pending.count} of ${b.pending.need} candles confirmed.` };
  }
  function mtfLine(g) {
    const r = g.mtf.rows.filter((x) => x.tf !== 'H1');
    const html = r.map((x) => `${x.tf === 'D' ? 'Daily' : x.tf} <span class="${cls(x.trend)}">${lc(x.trend)}</span>`).join(', ');
    const say = r.map((x) => `${x.tf === 'D' ? 'daily' : 'four hour'} ${lc(x.trend)}`).join(', ');
    return { html, say };
  }

  function biasA(k) {
    const g = k.g, b = g.bias, r = b.raw, s = sinceOf(b, k), p = pendingOf(b), m = mtfLine(g);
    const open = pick('bias', [`Gold bias is`, `We're`, `Your rules say`, `Bias is`]);
    const align = g.mtf.aligned ? ` All timeframes are aligned ${lc(b.bias)}.` : '';
    return reply(
      `${open} <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b> ${s.html} — ${r.bullish} bullish, ${r.bearish} bearish of ${r.total} rules. ${p.html}<br>Higher timeframes: ${m.html}.${align}` +
      `<br><span class="dim">Next check ${fmtT(b.nextCheck, k.tz, false)} ET. Ask “why” for the reasons.</span>` + demoNote(g),
      `${open} ${lc(b.bias)}${k.t}, and has been ${s.say}. ${p.say} Four hour and daily: ${m.say}.${align}` + demoSay(g));
  }

  function whyA(k, asked) {
    const g = k.g, b = g.bias, r = b.raw, s = sinceOf(b, k), p = pendingOf(b);
    const wrong = asked && asked !== b.bias
      ? { html: `Actually it's <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b>, not ${lc(asked)}. `, say: `Actually${k.t}, it's ${lc(b.bias)}, not ${lc(asked)}. ` } : { html: '', say: '' };
    const rows = r.rules.map((x) => {
      if (x.level == null) return { html: `<li>• ${esc(x.name)}: not enough data</li>`, say: `${x.label}, not enough data` };
      if (x.state === 'above') return { html: `<li><span class="up">▲</span> Closed <b>${f2(x.dist)}</b> above ${esc(x.label)} (${f2(x.level)})</li>`, say: `above ${x.label} by ${money(x.dist)}` };
      if (x.state === 'below') return { html: `<li><span class="down">▼</span> Closed <b>${f2(-x.dist)}</b> below ${esc(x.label)} (${f2(x.level)})</li>`, say: `below ${x.label} by ${money(x.dist)}` };
      return { html: `<li><span class="warn">•</span> Too close to ${esc(x.label)} (${f2(x.level)}) — inside the ${f2(b.buffer)} buffer</li>`, say: `too close to ${x.label} to count` };
    });
    const m = mtfLine(g);
    return reply(
      wrong.html + `Gold is <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b> ${s.html}. At the ${fmtT(b.lastCloseTime, k.tz, false)} ET close (${f2(b.lastClose)}):<ul>${rows.map((x) => x.html).join('')}</ul>${p.html} Higher timeframes: ${m.html}.` +
      ` <span class="dim">Closed 1H candles only · ${f2(b.buffer)} buffer · flips need ${b.settings.confirmCandles} candles.</span>` + demoNote(g),
      wrong.say + `${pick('why', ['Here is why.', 'Simple.', 'Breaking it down.'])} At the ${sayT(b.lastCloseTime, k.tz)} close, price was ${join(rows.map((x) => x.say))}. That makes it ${lc(b.bias)}. ${p.say}` + demoSay(g));
  }

  function mtfA(k) {
    const g = k.g, rows = g.mtf.rows;
    const html = rows.map((x) => `<li><b>${x.tf === 'D' ? 'Daily' : x.tf}</b> <span class="${cls(x.trend)}">${x.trend.toUpperCase()}</span> <span class="dim">— ${esc(x.reason)}</span></li>`).join('');
    const verdict = g.mtf.aligned ? `Everything lines up <span class="${cls(g.bias.bias)}">${lc(g.bias.bias)}</span> — the cleanest kind of read.` : 'Not aligned — the timeframes disagree, so expect chop or a weaker move.';
    return reply(`Main bias (1H rules): <b class="${cls(g.bias.bias)}">${g.bias.bias.toUpperCase()}</b>. Trends:<ul>${html}</ul>${verdict}` + demoNote(g),
      `One hour bias is ${lc(g.bias.bias)}. ${rows.filter((x) => x.tf !== 'H1').map((x) => `${x.tf === 'D' ? 'Daily' : 'Four hour'} trend is ${lc(x.trend)}`).join('. ')}. ${g.mtf.aligned ? 'Everything is aligned.' : 'They are not aligned.'}` + demoSay(g));
  }

  function levelsA(k) {
    const g = k.g, L = g.levels;
    const row = (l) => `<li>${esc(l.name)} <b>${f2(l.price)}</b> <span class="dim">(${l.dist >= 0 ? '+' : ''}${f2(l.dist)})</span></li>`;
    const above = L.above.slice(0, 3), below = L.below.slice(0, 3);
    return reply(
      `Price <b>${f2(g.price.bid)}</b>.<br><span class="down">Above (resistance):</span><ul>${above.map(row).join('') || '<li>none nearby</li>'}</ul><span class="up">Below (support):</span><ul>${below.map(row).join('') || '<li>none nearby</li>'}</ul>` +
      (L.adrPct != null ? `<span class="dim">Today's range ${f2(L.range)} = ${Math.round(L.adrPct)}% of the ${f2(L.adr)} average.</span>` : '') + demoNote(g),
      `Nearest resistance is ${L.resistance ? `${L.resistance.name} at ${sayPrice(L.resistance.price)}, ${money(L.resistance.dist)} away` : 'not nearby'}. Nearest support is ${L.support ? `${L.support.name} at ${sayPrice(L.support.price)}, ${money(L.support.dist)} below` : 'not nearby'}.` + demoSay(g));
  }

  const LEVEL_ALIASES = [
    [/daily open|day open|today open|the open/, 'do'], [/ema|moving average|50/, 'ema'], [/yesterday.*high|previous.*high|prior.*high|pdh|day high/, 'pdh'],
    [/yesterday.*low|previous.*low|prior.*low|pdl|day low/, 'pdl'], [/mid ?point|middle|mid/, 'pdm'], [/weekly open|week open|the week/, 'wo'],
    [/asia high|asian high|tokyo high/, 'ah'], [/asia low|asian low|tokyo low/, 'al'],
  ];
  function distanceA(k, text) {
    const g = k.g;
    let lvl = null;
    if (/round|big number|whole number|figure/.test(text)) lvl = [...g.levels.above, ...g.levels.below].filter((l) => l.round).sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist))[0];
    else for (const [re, key] of LEVEL_ALIASES) if (re.test(text)) { lvl = g.levels.list.find((l) => l.key === key); if (lvl) break; }
    if (!lvl) return null;
    const above = lvl.dist >= 0;
    return reply(`Price ${f2(g.price.bid)} is <b>${f2(Math.abs(lvl.dist))}</b> ${above ? '<span class="up">above</span>' : '<span class="down">below</span>'} ${esc(lvl.name)} (${f2(lvl.price)}).`,
      `Price is ${money(lvl.dist)} ${above ? 'above' : 'below'} ${lvl.name}, which sits at ${sayPrice(lvl.price)}.`);
  }

  function rangeA(k) {
    const g = k.g, L = g.levels;
    if (L.adrPct == null) return reply('Not enough daily history to work out the average range yet.');
    const pct = Math.round(L.adrPct);
    const note = pct >= 100 ? 'Gold has already done a full day\'s move — chasing here is risky.' : pct >= 75 ? 'Most of the normal day\'s move is done.' : pct >= 40 ? 'About average so far.' : 'Quiet so far — plenty of room left.';
    return reply(`Today's range is <b>${f2(L.range)}</b> (${f2(g.dayLow)} – ${f2(g.dayHigh)}) — <b>${pct}%</b> of the 14-day average of ${f2(L.adr)}. ${note}` + demoNote(g),
      `Gold has moved ${money(L.range)} today, ${pct} percent of its average daily range. ${note}` + demoSay(g));
  }

  function dayA(k, prefix) {
    const g = k.g, up = g.change >= 0, b = g.bias, L = g.levels;
    const mood = Math.abs(g.changePct) > 1 ? (up ? 'a strong day for gold' : 'a heavy day for gold') : Math.abs(g.changePct) > 0.4 ? (up ? 'a decent push higher' : 'a steady move lower') : 'a fairly quiet day';
    const m = marketLine(k);
    const sl = sessionLine(k);
    const rng = L.adrPct != null ? ` using ${Math.round(L.adrPct)}% of its normal range` : '';
    const html = `${prefix || ''}${pick('day', ['So far it\'s', 'It\'s been', 'We\'re looking at'])} ${mood}: gold is <b>${f2(g.price.bid)}</b>, <span class="${up ? 'up' : 'down'}">${up ? '+' : ''}${f2(g.change)}</span>${rng}. ` +
      `Bias is <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b>${b.pending ? ` (${lc(b.pending.to)} flip pending)` : ''}${g.mtf.aligned ? ', all timeframes aligned' : ''}. ${m ? m.html + ' ' : ''}${sl}` + demoNote(g);
    const say = `${prefix ? prefix.replace(/<[^>]+>/g, '') : ''}${pick('day2', ['So far it\'s', 'It\'s been', 'We\'re looking at'])} ${mood}${k.t}. Gold is at ${sayPrice(g.price.bid)}, ${up ? 'up' : 'down'} ${money(g.change)}${rng}. The bias is ${lc(b.bias)}${b.pending ? `, with a ${lc(b.pending.to)} flip pending` : ''}. ${m ? m.say + ' ' : ''}${sl}` + demoSay(g);
    return reply(html, say);
  }

  function briefA(k) {
    return dayA(k, `${greet(k)}. `);
  }

  // ---- trade check: "should I sell now?" -----------------------------------
  function tradeA(k, dir) {
    const g = k.g, b = g.bias, L = g.levels, want = dir > 0 ? 'Bullish' : 'Bearish', side = dir > 0 ? 'buy' : 'sell';
    if (!k.market.open) {
      const m = marketLine(k);
      return reply(`You can't ${side} right now — ${m ? m.html : 'the market is closed.'}`, `You can't ${side} right now${k.t}. ${m ? m.say : 'The market is closed.'}`);
    }
    const f = []; let score = 0;
    const add = (pts, html, say) => { score += pts; f.push({ pts, html, say }); };
    // 1. main bias
    if (b.bias === want) add(2, `Bias is ${lc(b.bias)} — with you`, `the bias is ${lc(b.bias)}, which is with you`);
    else if (b.bias === 'Neutral') add(0, 'Bias is neutral — no edge either way', 'the bias is neutral, so no real edge');
    else add(-2, `Bias is ${lc(b.bias)} — against you`, `the bias is ${lc(b.bias)}, which is against you`);
    // 2. pending flip
    if (b.pending) {
      if (b.pending.to === want) add(1, `A ${lc(want)} flip is building (${b.pending.count}/${b.pending.need})`, `a ${lc(want)} flip is building`);
      else add(-1, `A ${lc(b.pending.to)} flip is pending (${b.pending.count}/${b.pending.need})`, `a ${lc(b.pending.to)} flip is pending`);
    }
    // 3. higher timeframes
    for (const r of g.mtf.rows.filter((x) => x.tf !== 'H1')) {
      const name = r.tf === 'D' ? 'Daily' : '4H';
      if (r.trend === want) add(1, `${name} trend agrees`, `the ${r.tf === 'D' ? 'daily' : 'four hour'} trend agrees`);
      else if (r.trend !== 'Mixed' && r.trend !== 'Unknown') add(-1, `${name} trend is ${lc(r.trend)}`, `the ${r.tf === 'D' ? 'daily' : 'four hour'} trend is ${lc(r.trend)}`);
    }
    // 4. room to the next level in the trade's direction
    const atr = b.atr || 3;
    const next = dir > 0 ? L.resistance : L.support;
    const behind = dir > 0 ? L.support : L.resistance;
    if (next) {
      const room = Math.abs(next.price - g.price.bid);
      if (room < atr * 0.5) add(-1, `Only ${f2(room)} until ${esc(next.name)} (${f2(next.price)}) — right into it`, `you'd be ${side === 'buy' ? 'buying into' : 'selling into'} ${next.name}, only ${money(room)} away`);
      else if (room > atr * 1.5) add(1, `${f2(room)} of room to ${esc(next.name)} (${f2(next.price)})`, `there's ${money(room)} of room to ${next.name}`);
      else add(0, `${f2(room)} to ${esc(next.name)} (${f2(next.price)}) — some room`, `there's some room, ${money(room)}, to ${next.name}`);
    }
    // 5. daily range used
    if (L.adrPct != null && L.adrPct >= 90) {
      const moveWith = dir > 0 ? g.change > 0 : g.change < 0;
      if (moveWith) add(-1, `${Math.round(L.adrPct)}% of the daily range is already used in your direction — late entry`, `most of today's range is already used, so it's a late entry`);
    }
    // 6. conditions
    const notes = [];
    if (g.price.spread > 1) notes.push(`Spread is wide (${f2(g.price.spread)}).`);
    if (!k.openSessions.some((x) => /london|new york/i.test(x.s.name))) notes.push('London and New York are both closed — thinner liquidity.');
    if (k.market.friday && k.market.weeklyClose && k.market.weeklyClose - k.now < 2 * 3600e3) notes.push('Weekly close is under 2 hours away.');

    const verdict = score >= 4 ? { w: `Your rules favour a ${side}.`, c: 'up', s: `Your rules favour a ${side}` }
      : score >= 2 ? { w: `Leans your way, but it's not a clean ${side}.`, c: 'warn', s: `It leans your way, but it's not a clean ${side}` }
      : score >= 0 ? { w: `Mixed signals — I'd wait for a cleaner ${side}.`, c: 'warn', s: `It's mixed. I'd wait for something cleaner` }
      : { w: `Your rules are against a ${side} right now.`, c: 'down', s: `Your rules are against a ${side} right now` };

    // suggested stop / target from structure
    let plan = '';
    if (behind && next) {
      const stop = dir > 0 ? Math.min(behind.price, g.price.bid - atr) - atr * 0.2 : Math.max(behind.price, g.price.bid + atr) + atr * 0.2;
      const risk = Math.abs(g.price.bid - stop), reward = Math.abs(next.price - g.price.bid);
      plan = `<br><span class="dim">Structure: stop beyond ${esc(behind.name)} ≈ ${f2(stop)} (risk ${f2(risk)}), first target ${esc(next.name)} ${f2(next.price)} (reward ${f2(reward)}) → ${(reward / risk).toFixed(1)}R.</span>`;
    }
    const icon = (x) => (x.pts > 0 ? '<span class="up">✓</span>' : x.pts < 0 ? '<span class="down">✕</span>' : '<span class="warn">•</span>');
    const top = [...f].sort((a, c) => Math.abs(c.pts) - Math.abs(a.pts)).slice(0, 3).map((x) => x.say);
    return reply(
      `<b class="${verdict.c}">${verdict.w}</b> <span class="dim">(score ${score > 0 ? '+' : ''}${score})</span><ul>${f.map((x) => `<li>${icon(x)} ${x.html}</li>`).join('')}</ul>${notes.length ? `<span class="warn">${notes.join(' ')}</span>` : ''}${plan}` +
      `<br><span class="dim">This is what your rules say, not a guarantee — your call.</span>` + demoNote(g),
      `${verdict.s}${k.t}. ${top.length ? 'Because ' + join(top) + '.' : ''} ${notes.join(' ')} Your call.` + demoSay(g));
  }

  // ---- numbers: math, risk/reward, position size ----------------------------
  function nums(text) { return (text.match(/\d+(?:\.\d+)?/g) || []).map(Number); }

  function mathA(text, k) {
    let e = text
      .replace(/\bwhat is|what s|calculate|how much is|equals|equal|is\b/g, ' ')
      .replace(/(\d+(?:\.\d+)?) percent of (\d+(?:\.\d+)?)/g, '($1/100*$2)')
      .replace(/\bplus|add\b/g, '+').replace(/\bminus|less|subtract\b/g, '-').replace(/\btimes|multiplied by|x\b/g, '*').replace(/\bdivided by|over\b/g, '/')
      .replace(/[^0-9.+\-*/() ]/g, ' ').replace(/\s+/g, '');
    if (!/\d[+\-*/(]+.*\d/.test(e) && !/^\(\d/.test(e)) return null;
    let i = 0;
    const peek = () => e[i];
    function num() {
      if (peek() === '(') { i++; const v = add(); i++; return v; }
      if (peek() === '-') { i++; return -num(); }
      const m = /^\d+(\.\d+)?/.exec(e.slice(i));
      if (!m) throw new Error('bad');
      i += m[0].length; return +m[0];
    }
    function mul() { let v = num(); while (peek() === '*' || peek() === '/') { const op = e[i++]; const r = num(); v = op === '*' ? v * r : v / r; } return v; }
    function add() { let v = mul(); while (peek() === '+' || peek() === '-') { const op = e[i++]; const r = mul(); v = op === '+' ? v + r : v - r; } return v; }
    try {
      const v = add();
      if (i < e.length || !isFinite(v)) return null;
      const out = Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : +v.toFixed(4);
      return reply(`<b>${out}</b> <span class="dim">(${esc(e)})</span>`, `That's ${String(out).replace(/,/g, '')}${k.t}.`);
    } catch { return null; }
  }

  // "risk 1% with a 6 dollar stop", "sell at 4060 stop 4070 target 4030", "lot size for a 5 point stop"
  function sizeA(text, k) {
    const g = k.g, acct = g && g.account;
    const price = g ? g.price.bid : null;
    const get = (re) => { const m = text.match(re); return m ? +m[1] : null; };
    const riskPct = get(/(\d+(?:\.\d+)?)\s*percent/);
    const riskUsd = get(/risk(?:ing)?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)/);
    let entry = get(/(?:at|entry|enter|from|in at)\s*(\d{3,}(?:\.\d+)?)/) || price;
    let stopPx = get(/(?:stop|sl|stop loss)\s*(?:at|of|is)?\s*(\d{3,}(?:\.\d+)?)/);
    let stopDist = get(/(\d+(?:\.\d+)?)\s*(?:dollar|point|pip|buck)s?\s*(?:stop|sl)/) || get(/(?:stop|sl)\s*(?:of)?\s*(\d{1,2}(?:\.\d+)?)\b(?!\d)/);
    const target = get(/(?:target|tp|take profit)\s*(?:at|of|is)?\s*(\d{3,}(?:\.\d+)?)/);
    if (stopPx && entry) stopDist = Math.abs(entry - stopPx);
    if (!stopDist) {
      return reply('Tell me your stop and I’ll do the math — e.g. “risk 1% with a 6 dollar stop” or “sell at 4060, stop 4070, target 4030”.', `I need your stop${k.t}. Try: risk 1 percent with a 6 dollar stop.`);
    }
    const lines = [], says = [];
    const bal = acct && acct.balance;
    let dollars = riskUsd || (riskPct && bal ? (bal * riskPct) / 100 : null);
    if (riskPct && !bal) { lines.push(`<span class="warn">I can't see your balance, so I can't turn ${riskPct}% into dollars. Say “risk 50 dollars” instead.</span>`); }
    if (dollars) {
      const units = Math.floor(dollars / stopDist);
      lines.push(`Risking <b>$${f2(dollars)}</b>${riskPct ? ` (${riskPct}% of $${f2(bal)})` : ''} with a <b>${f2(stopDist)}</b> stop → <b>${units.toLocaleString()} units</b> = <b>${(units / 100).toFixed(2)} lots</b>.`);
      says.push(`Risking ${money(dollars)} with a ${+stopDist.toFixed(2)} dollar stop, that's ${units} units, or ${(units / 100).toFixed(2)} lots.`);
    } else {
      lines.push(`A ${f2(stopDist)} stop costs <b>$${f2(stopDist)} per unit</b> (1 unit = 1 oz), $${f2(stopDist * 100)} per lot.`);
      says.push(`A ${+stopDist.toFixed(2)} dollar stop costs ${money(stopDist * 100)} per lot.`);
    }
    if (target && entry) {
      const reward = Math.abs(target - entry), rr = reward / stopDist;
      lines.push(`Entry ${f2(entry)} → target ${f2(target)} is ${f2(reward)} reward = <b>${rr.toFixed(2)}R</b>.`);
      says.push(`That's ${rr.toFixed(1)} R.`);
    }
    lines.push('<span class="dim">Gold on OANDA: 1 unit = 1 oz, $1 move = $1 per unit, 1 lot = 100 units.</span>');
    return reply(lines.join('<br>'), says.join(' '));
  }

  function accountA(k) {
    const a = k.g && k.g.account;
    if (!a) return reply('I can’t see your account details — the key may not have account access. Prices and bias still work.', `I can't see your account${k.t}.`);
    const pl = a.unrealizedPL;
    return reply(`Balance <b>${a.currency} ${f2(a.balance)}</b> · Equity ${f2(a.nav)} · Open trades ${a.openTrades} · Unrealised <span class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${f2(pl)}</span>${a.demo ? ' <span class="err">[demo]</span>' : ''}<br><span class="dim">Read-only — JARVIS can't place trades.</span>`,
      `Your balance is ${money(a.balance)}. ${a.openTrades ? `You have ${a.openTrades} open trade${a.openTrades > 1 ? 's' : ''}, ${pl >= 0 ? 'up' : 'down'} ${money(pl)}.` : 'No open trades.'}`);
  }

  // ---- sessions / market ----------------------------------------------------
  function findSession(text, list) {
    let hit = null, len = 0;
    for (const s of list) for (const a of [s.name, ...(s.aliases || [])].map((x) => clean(x))) {
      if (a.length > len && new RegExp(`\\b${a}\\b`).test(text)) { hit = s; len = a.length; }
    }
    return hit;
  }
  function sessionA(k, sess, wantClose) {
    const st = Sessions.status(sess);
    if (!st) return reply(`Couldn't work out the ${esc(sess.name)} session — check config/sessions.json.`);
    if (st.open) {
      const w = words(st.closesAt - k.now);
      return reply(`<b>${esc(sess.name)}</b> is <span class="up">OPEN</span> — closes in <b>${w}</b> (${fmtT(st.closesAt, k.tz, false)} ET).`, `${sess.name} is open${k.t}. It closes in ${w}.`);
    }
    const w = words(st.opensAt - k.now);
    return reply(`<b>${esc(sess.name)}</b> ${wantClose ? 'is closed. It next opens' : 'opens'} in <b>${w}</b> — ${fmtT(st.opensAt, k.tz, true)} ET.`, `${sess.name} opens in ${w}, at ${sayT(st.opensAt, k.tz)} New York time.`);
  }
  function allSessionsA(k) {
    const rows = (k.sessionsAll || []);
    return reply(`Sessions (NY time):<ul>${rows.map(({ s, st }) => st.open ? `<li><b>${esc(s.name)}</b> <span class="up">OPEN</span> — closes in ${words(st.closesAt - k.now)}</li>` : `<li><b>${esc(s.name)}</b> opens in ${words(st.opensAt - k.now)} (${fmtT(st.opensAt, k.tz, true)} ET)</li>`).join('')}</ul>`, sessionLine(k) || 'No session information.');
  }
  function marketA(k) {
    const m = k.market;
    if (m.open) {
      const extra = m.friday ? ` It's Friday — the weekly close is in ${words(m.weeklyClose - k.now)}.` : ` Today's session ends at 5 PM ET, in ${words(m.closesAt - k.now)}.`;
      return reply(`Gold is <span class="up">OPEN</span>.${extra} ${sessionLine(k)}`, `Gold is open${k.t}.${extra}`);
    }
    const ml = marketLine(k);
    return reply(ml.html, ml.say);
  }

  // ---- small talk -----------------------------------------------------------
  function quickBias(k) {
    const g = k.g;
    if (!g) return { html: '', say: '' };
    const b = g.bias;
    return {
      html: ` Quick check: gold <b>${f2(g.price.bid)}</b>, bias <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b>${b.pending ? ` (${lc(b.pending.to)} flip pending)` : ''}.`,
      say: ` ${pick('qb', ['Quick check:', 'For the record:', 'Market check:'])} gold's at ${sayPrice(g.price.bid)}, bias ${lc(b.bias)}${b.pending ? `, ${lc(b.pending.to)} flip pending` : ''}.`,
    };
  }

  function howAreYouA(k, c) {
    const m = k.market;
    let line;
    if (m.state === 'weekend') line = pick('hay-w', [`Doing well${k.t}. Markets are closed, so I'm just keeping watch — hope you're enjoying the break.`, `Rested and ready${k.t}. It's the weekend, so enjoy it — gold reopens in ${words(m.opensAt - k.now)}.`, `All quiet on my end${k.t}. Weekend mode. Take the break, you've earned it.`]);
    else if (m.friday) line = pick('hay-f', [`Doing good${k.t} — it's Friday. Get ready for the weekly close in ${words(m.weeklyClose - k.now)}.`, `Very well${k.t}. Friday — let's finish the week strong. Weekly close in ${words(m.weeklyClose - k.now)}.`, `Running smoothly${k.t}. Friday rules: protect the week's gains, the close is in ${words(m.weeklyClose - k.now)}.`]);
    else if (m.weekday === 1) line = pick('hay-m', [`All systems go${k.t}. Fresh week, fresh levels.`, `Doing well${k.t}. Monday — let's see what gold has planned for the week.`]);
    else if (k.tod === 'night' && k.hour < 5) line = pick('hay-n', [`All systems running${k.t}. Burning the midnight oil?`, `Wide awake, as always${k.t}. Late session tonight?`]);
    else line = pick('hay', [`All systems running smoothly${k.t}.`, `Doing well${k.t}, thanks for asking.`, `Never better${k.t}. Watching the charts for you.`, `Fully operational${k.t}.`, `Good${k.t}. Feeds are live and the bias engine is humming.`]);
    const q = m.state === 'weekend' ? { html: '', say: '' } : quickBias(k);
    return reply(line + q.html, line + q.say);
  }

  function helloA(k) {
    const m = k.market;
    if (m.state === 'weekend') {
      const l = pick('hi-w', [`Hey${k.t}. Hope you're enjoying the break — markets reopen in ${words(m.opensAt - k.now)}.`, `${greet(k)}. Weekend mode — nothing moving. Gold reopens ${fmtT(m.opensAt, k.tz, true)} ET.`, `Hey${k.t}. Markets are closed, so relax. I'll be ready when they open.`]);
      return reply(l);
    }
    if (m.state === 'break') return reply(`Hey${k.t}. Gold's on its daily break — back at 6 PM ET.`);
    const opener = pick('hi', [`${greet(k)}.`, `At your service${k.t}.`, `Hey${k.t}.`, `${greet(k)}. Ready when you are.`, `Here${k.t}.`]);
    const fri = m.friday ? ` Friday — weekly close in ${words(m.weeklyClose - k.now)}.` : '';
    const q = quickBias(k);
    return reply(opener + fri + q.html, opener + fri + q.say);
  }

  const JOKES = [
    'Why did the gold trader break up with the stock trader? Too much emotional volatility.',
    'I asked the market for a sign. It gave me a doji.',
    'My stop loss and I have a lot in common. We both get hit right before the move.',
    'Gold doesn’t have mood swings. It has “liquidity events”.',
    'They say buy the dip. Nobody says which one.',
    'The trend is your friend — right up until the news release.',
  ];

  function smallTalk(id, k, c, text) {
    switch (id) {
      case 'thanks': return reply(pick('thx', [`Anytime${k.t}.`, `Always a pleasure${k.t}.`, `Happy to help${k.t}.`, `That's what I'm here for${k.t}.`, `Of course${k.t}.`]));
      case 'who': return reply(`I'm J.A.R.V.I.S. — your personal command center. I watch gold on OANDA, run your bias rules on closed candles, track the sessions and key levels, and answer questions. No AI, just rules and math. Say “help” to see what I can do.`,
        `I'm JARVIS, your personal command center. I watch gold, run your bias rules, track sessions and levels, and do the math. Ask me anything about the market.`);
      case 'bye': {
        const night = k.tod === 'night' || k.tod === 'evening' || /night/.test(text);
        if (/night/.test(text)) return reply(pick('gn', [`Good night${k.t}. I'll keep watch.`, `Rest well${k.t}. The charts will still be here.`, `Good night${k.t}. Gold is at ${k.g ? Math.round(k.g.price.bid) : 'its usual place'} — I'll have a briefing ready when you're back.`]));
        return reply(pick('bye', [night ? `Good night${k.t}. I'll keep watch.` : `Talk soon${k.t}.`, `Signing off${k.t}. I'll be here.`, `Very good${k.t}.`, `Until next time${k.t}.`]));
      }
      case 'joke': return reply(pick('joke', JOKES));
      case 'feel_bad': {
        const l = pick('bad', [`Losses are part of the job${k.t}. Every good trader takes them — what matters is the next decision.`, `Rough one${k.t}. Step back, breathe, and let the rules do the thinking next time.`, `It happens to the best${k.t}. Protect your capital and your head — no revenge trades.`]);
        const q = quickBias(k);
        return reply(l + q.html, l + q.say);
      }
      case 'feel_good': return reply(pick('good', [`Excellent work${k.t}. Discipline pays.`, `Nicely done${k.t}. Bank it and don't give it back.`, `That's how it's done${k.t}. Maybe call it a day while you're green?`]));
      default: return null;
    }
  }

  // ---- help -----------------------------------------------------------------
  const EXAMPLES = [
    ['What’s the bias?', 'Confirmed bias, how long, flips pending'],
    ['Why is it bearish?', 'Every rule with distances'],
    ['Should I sell right now?', 'Checks your rules, levels, range, sessions'],
    ['Do I buy here?', 'Same, for a buy'],
    ['Are the timeframes aligned?', '1H bias vs 4H and daily trend'],
    ['Where’s gold?', 'Live price and change'],
    ['Key levels', 'Support and resistance around price'],
    ['How far is the weekly open?', 'Distance to any level'],
    ['How much has it moved today?', 'Range vs the daily average'],
    ['How’s the day?', 'The day in one answer'],
    ['How are you?', 'Small talk + a quick bias check'],
    ['When does London open?', 'Any session, open or close'],
    ['Is the market open?', 'Gold hours, Friday close'],
    ['Risk 1% with a 6 dollar stop', 'Position size in units and lots'],
    ['Sell at 4060 stop 4070 target 4030', 'Risk/reward'],
    ['What’s 4065 minus 4030?', 'Quick math'],
    ['What’s my balance?', 'Account summary (read-only)'],
    ['Any callouts?', 'Things I noticed'],
    ['Ambient mode', 'Full-screen HUD'],
    ['Open Aegis', 'Opens a project tile'],
    ['Mute / unmute', 'Voice replies off / on'],
  ];
  const chips = (list) => list.map((c) => `<button type="button" class="chip" data-cmd="${esc(c)}">${esc(c)}</button>`).join('');
  function helpA() {
    return reply(`Just talk to me — there are no exact phrases to remember. Some ideas (tap to try):<div class="help-grid">${EXAMPLES.map(([q, d]) => `<button type="button" class="chip" data-cmd="${esc(q)}">${esc(q)}</button><span>${esc(d)}</span>`).join('')}</div>`,
      'Just talk to me normally. Ask about the bias, why it is what it is, whether to buy or sell, levels, sessions, position size, or just say hi.');
  }
  function suggestions(text) {
    const tk = text.split(' ').filter((w) => w.length > 2);
    const scored = EXAMPLES.map(([q]) => {
      const qt = clean(q).split(' ');
      const s = tk.reduce((a, t) => a + Math.max(0, ...qt.map((x) => 1 - lev(t, x) / Math.max(t.length, x.length))), 0);
      return { q, s };
    }).sort((a, b) => b.s - a.s);
    return scored.slice(0, 3).map((x) => x.q);
  }

  // ---------------------------------------------------------------- intents
  const DATA_INTENTS = new Set(['price', 'bias', 'why', 'mtf', 'levels', 'distance', 'range', 'day', 'brief', 'trade', 'account', 'callouts']);

  function scoreIntents(c, text, hasNums, k, ctxRaw) {
    const S = {};
    const set = (id, v) => { if (v > (S[id] || 0)) S[id] = v; };
    const any = (...xs) => xs.some((x) => c.has(x));
    if (any('SELL', 'BUY') && !any('SIZE') && !(hasNums && any('RISK', 'RR'))) set('trade', any('ADVICE', 'NOW') ? 7 : 4);
    if (any('SIZE') || (hasNums && any('RISK', 'RR'))) set('size', 7);
    if (any('WHY')) set('why', any('BIAS', 'BULL', 'BEAR', 'GOLD') ? 6 : 4);
    if (any('BULL', 'BEAR') && !any('WHY', 'SELL', 'BUY')) set(/\bis it|are we|still|so\b/.test(text) && !any('BIAS') ? 'why' : 'bias', 4);
    if (any('BIAS')) set('bias', 5);
    if (any('TREND')) set('mtf', 5);
    if (any('LEVELS')) set('levels', 4);
    if (any('DISTANCE') && LEVEL_ALIASES.some(([re]) => re.test(text)) || (/how far/.test(text) && /round|figure|number/.test(text))) set('distance', 6);
    if (any('RANGE')) set('range', 5);
    if (any('DAY')) set('day', 5);
    if (any('BRIEF')) set('brief', 5);
    if (any('PRICE')) set('price', 4);
    if (any('GOLD') && Object.keys(S).length === 0) set('price', 2);
    if (any('HOWAREYOU')) set('howareyou', 4.5);
    if (any('HELLO')) set('hello', 2);
    if (any('THANKS')) set('thanks', 3);
    if (any('WHO')) set('who', 5);
    if (any('BYE')) set('bye', 3);
    if (any('JOKE')) set('joke', 5);
    if (any('FEEL_BAD')) set('feel_bad', 4);
    if (any('FEEL_GOOD')) set('feel_good', 4);
    if (any('MARKET') && any('OPEN', 'CLOSE') || /is (the )?market|markets open|market open|gold open/.test(text)) set('market', 5.5);
    if (findSession(text, ctxRaw.sessions.sessions || []) && !any('BIAS', 'WHY')) set('session', any('OPEN', 'CLOSE') || text.split(' ').length <= 3 ? 6 : 4);
    if (any('SESSIONS')) set('sessions', 4);
    if (any('TIME') && !any('OPEN', 'CLOSE') && !findSession(text, ctxRaw.sessions.sessions || [])) set('time', 4);
    if (any('HELP')) set('help', 6);
    if (any('MUTE') && !any('UNMUTE')) set('mute', 6);
    if (any('UNMUTE')) set('unmute', 6.5);
    if (any('REFRESH')) set('refresh', 5);
    if (/^(clear|cls|clear screen|clear the screen)$/.test(text)) set('clear', 9);
    if (any('AMBIENT')) set('ambient', any('EXIT') ? 6 : 6);
    if (any('EXIT') && ctxRaw.isAmbient && ctxRaw.isAmbient()) set('exitAmbient', 7);
    if (any('CALLOUTS')) set('callouts', 5);
    if (any('PROJECTS') && !any('GOLD')) set('projects', 3);
    if (any('ACCOUNT')) set('account', 5);
    if (hasNums && (any('MATH') || /\d\s*[+\-*/x]\s*\d/.test(text)) && !any('SIZE', 'RISK')) set('math', 6);
    if (any('STOPSPEAK') && text.split(' ').length <= 2) set('stopspeak', 8);
    return S;
  }

  // ctx: { gold(), refresh(force), projects, sessions, openProject(p), clear(), setMuted(b), stopSpeaking(), tz, title,
  //        ambient(on), isAmbient(), callouts() }
  function interpret(raw, ctx) {
    const original = clean(raw);
    const hadWake = WAKE.test(original); WAKE.lastIndex = 0;
    let text = stripWake(original);
    if (!text && hadWake) text = 'hello';
    if (!text) return null;

    const extra = [];
    for (const p of ctx.projects || []) [p.name, ...(p.aliases || [])].forEach((w) => clean(w).split(' ').forEach((x) => extra.push(x)));
    for (const s of ctx.sessions.sessions || []) [s.name, ...(s.aliases || [])].forEach((w) => clean(w).split(' ').forEach((x) => extra.push(x)));
    const fixed = correct(text, extra);
    const c = concepts(fixed);
    const hasNums = /\d/.test(fixed);
    const k = context(ctx);
    k.sessionsAll = (ctx.sessions.sessions || []).map((s) => ({ s, st: Sessions.status(s) })).filter((x) => x.st).sort((a, b) => (b.st.open - a.st.open) || a.st.opensAt - b.st.opensAt);
    const note = fixed !== text ? `<span class="dim">(heard “${esc(fixed)}”)</span> ` : '';
    const wrap = (r) => (r ? { html: note + r.html, say: r.say } : r);

    // open <project> / bare project name
    const om = fixed.match(/^(?:please )?(?:open|launch|start|run|load|goto|go to|take me to|pull up|bring up)\s+(?:the |my )?(.+?)(?: app| project| please)?$/);
    const proj = (q) => (ctx.projects || []).find((p) => [p.name, ...(p.aliases || [])].map(clean).some((x) => x === q || (q.length >= 3 && x.startsWith(q)) || lev(x, q) <= Math.max(1, Math.floor(x.length / 4))));
    if (om && !c.has('AMBIENT')) {
      const p = proj(om[1]);
      if (p) { ctx.openProject(p); return wrap(reply(`Opening <b>${esc(p.name)}</b> → <span class="dim">${esc(p.url)}</span>`, `Opening ${p.name}${k.t}.`)); }
    }
    const bare = (ctx.projects || []).find((p) => [p.name, ...(p.aliases || [])].map(clean).includes(fixed));
    if (bare) { ctx.openProject(bare); return wrap(reply(`Opening <b>${esc(bare.name)}</b>.`, `Opening ${bare.name}.`)); }

    const S = scoreIntents(c, fixed, hasNums, k, ctx);
    const ranked = Object.entries(S).sort((a, b) => b[1] - a[1]);
    let id = ranked.length ? ranked[0][0] : null;

    // social opener in front of a data answer: "hey, how are you, what's the bias?"
    const social = (c.has('HOWAREYOU') || c.has('HELLO')) && id && DATA_INTENTS.has(id)
      ? (c.has('HOWAREYOU') ? pick('soc', [`Doing well${k.t}. `, `All good${k.t}. `, `Running smoothly${k.t}. `]) : pick('soc2', [`${greet(k)}. `, `Hey${k.t}. `])) : '';

    const needGold = (fn) => {
      const run = () => { const r = fn(); return r ? { html: note + social + r.html, say: social + r.say } : null; };
      if (k.g) return run();
      return ctx.refresh().then((g) => { k.g = g; return g ? run() : reply('<span class="err">No market data yet — check Settings or your connection.</span>', `Sorry${k.t}, I have no market data right now.`); });
    };

    switch (id) {
      case 'price': return needGold(() => priceA(k));
      case 'bias': return needGold(() => biasA(k));
      case 'why': return needGold(() => whyA(k, c.has('BULL') ? 'Bullish' : c.has('BEAR') ? 'Bearish' : null));
      case 'mtf': return needGold(() => mtfA(k));
      case 'levels': return needGold(() => levelsA(k));
      case 'distance': return needGold(() => distanceA(k, fixed) || levelsA(k));
      case 'range': return needGold(() => rangeA(k));
      case 'day': return needGold(() => dayA(k, ''));
      case 'brief': return needGold(() => briefA(k));
      case 'trade': {
        const dir = c.has('BUY') && !c.has('SELL') ? 1 : c.has('SELL') && !c.has('BUY') ? -1 : (fixed.search(/\b(buy|long)/) < fixed.search(/\b(sell|short)/) ? 1 : -1);
        return needGold(() => tradeA(k, dir));
      }
      case 'size': return needGold(() => sizeA(fixed, k));
      case 'account': return needGold(() => accountA(k));
      case 'math': return wrap(mathA(fixed, k) || reply(`I couldn't work that sum out${k.t}. Try “4065 minus 4030”.`));
      case 'session': {
        const s = findSession(fixed, ctx.sessions.sessions || []);
        return wrap(sessionA(k, s, c.has('CLOSE') && !c.has('OPEN')));
      }
      case 'sessions': return wrap(allSessionsA(k));
      case 'market': return wrap(marketA(k));
      case 'howareyou': {
        if (c.has('DAY')) return needGold(() => dayA(k, howAreYouA(k, c).html.split('Quick check')[0]));
        return wrap(howAreYouA(k, c));
      }
      case 'hello': return wrap(helloA(k));
      case 'thanks': case 'who': case 'bye': case 'joke': case 'feel_bad': case 'feel_good': return wrap(smallTalk(id, k, c, fixed));
      case 'time': {
        const now = new Intl.DateTimeFormat('en-US', { timeZone: k.tz, weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date());
        return wrap(reply(`It's <b>${now}</b> in New York.`, `It's ${now} in New York${k.t}.`));
      }
      case 'help': return wrap(helpA());
      case 'mute': ctx.setMuted(true); return wrap(reply('Voice replies are <b>off</b>. Say “unmute” to turn them back on.', ''));
      case 'unmute': ctx.setMuted(false); return wrap(reply('Voice replies are <b>on</b>.', `Voice is back on${k.t}.`));
      case 'stopspeak': ctx.stopSpeaking && ctx.stopSpeaking(); return null;
      case 'refresh': return ctx.refresh(true).then((g) => (g ? reply(`Refreshed. Gold ${f2(g.price.bid)}, bias ${g.bias.bias.toUpperCase()}.`, `Refreshed${k.t}. Gold is at ${sayPrice(g.price.bid)}, bias ${lc(g.bias.bias)}.`) : reply('<span class="err">Refresh failed.</span>', 'The refresh failed.')));
      case 'clear': ctx.clear(); return null;
      case 'ambient': ctx.ambient(true); return wrap(reply('Ambient mode engaged. Tap anywhere or say “exit” to leave.', pick('amb', [`Ambient mode${k.t}.`, `Going full screen${k.t}.`, `Engaging ambient display.`])));
      case 'exitAmbient': ctx.ambient(false); return wrap(reply('Ambient mode off.', `Back to the dashboard${k.t}.`));
      case 'callouts': {
        const list = (ctx.callouts && ctx.callouts()) || [];
        if (!list.length) return wrap(reply(`Nothing to report${k.t} — no callouts yet.`));
        const recent = list.slice(0, 5);
        return wrap(reply(`Recent callouts:<ul>${recent.map((x) => `<li><span class="dim">${fmtT(x.at, k.tz, false)}</span> ${esc(x.text)}</li>`).join('')}</ul>`, `Latest: ${recent.slice(0, 3).map((x) => x.say || x.text).join(' ')}`));
      }
      case 'projects': return wrap(reply(`Your projects:<br>${chips((ctx.projects || []).map((p) => 'open ' + p.name))}`, `You have ${(ctx.projects || []).length} projects: ${(ctx.projects || []).map((p) => p.name).join(', ')}.`));
      default: {
        const sug = suggestions(fixed);
        return reply(`${pick('unk', ['I didn’t quite catch that', 'Not sure I follow', 'I’m not sure what you mean'])}${k.t}. Maybe:<br>${chips(sug)}<br><span class="dim">Say “help” for ideas.</span>`,
          `${pick('unk2', ["Sorry, I didn't catch that", "I'm not sure I follow", 'Could you say that another way'])}${k.t}? You could ask ${sug.slice(0, 2).join(', or ')}.`);
      }
    }
  }

  // Spoken greeting used at boot
  function greeting(ctx) {
    const k = context(ctx);
    const m = marketLine(k);
    const g = k.g;
    const intro = pick('boot', [`${greet(k)}. All systems online.`, `${greet(k)}. JARVIS online and ready.`, `Systems online. ${greet(k)}.`]);
    if (!g) return reply(intro, intro);
    if (k.market.state === 'weekend') return reply(`${intro} ${m.html} Gold closed the week at <b>${f2(g.price.bid)}</b>.`, `${intro} ${m.say} Gold closed at ${sayPrice(g.price.bid)}.`);
    const q = quickBias(k);
    return reply(`${intro}${q.html} ${m ? m.html : sessionLine(k)}` + demoNote(g), `${intro}${q.say} ${m ? m.say : sessionLine(k)}` + demoSay(g));
  }

  return { interpret, greeting, esc, clean, stripWake, WAKE };
})();
