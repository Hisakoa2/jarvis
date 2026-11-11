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
    // v4
    NEWS: ['news', 'high impact', 'red folder', 'red folders', 'economic calendar', 'calendar', 'events', 'event', 'data release', 'cpi', 'nfp', 'non farm', 'nonfarm', 'payroll', 'payrolls', 'jobs report', 'fomc', 'fed', 'powell', 'interest rate', 'rate decision', 'ppi', 'jobless claims', 'unemployment', 'gdp', 'retail sales', 'pce', 'inflation', 'announcement', 'release', 'releases', 'headlines', 'catalyst', 'catalysts'],
    SWING: ['swing', 'swing trade', 'swing trading', 'swinging', 'swings', 'swing trader', 'hold for days', 'hold it for days', 'multi day', 'few days', 'overnight', 'position trade', 'longterm', 'hold it longer'],
    DAYTRADE: ['day trade', 'day trading', 'day trader', 'daytrade', 'daytrading', 'intraday', 'scalp', 'scalping', 'scalper', 'quick trade', 'shortterm', 'today only'],
    TRADEGEN: ['trade', 'trading', 'hop in', 'hop on', 'jump on', 'get on', 'take one', 'get a trade in', 'get a trade', 'jump in', 'get in', 'get into', 'take a trade', 'enter a trade', 'place a trade', 'look for a trade', 'look for trades', 'get involved', 'pull the trigger'],
    TIMING: ['best time', 'worst time', 'when should i trade', 'when to trade', 'when should i not', 'when not to', 'not trade', 'stay out', 'sit out', 'avoid trading', 'no trade zone', 'kill zone', 'killzone', 'when is it good to trade', 'when is it bad to trade'],
    PLAN: ['look like', 'what would', 'plan', 'game plan', 'gameplan', 'where would', 'where should i put', 'where do i put', 'where to put', 'where should my', 'set my', 'place my', 'put my', 'what should my'],
    IN_TRADE: ['i am in', 'i am currently in', 'i entered', 'i took', 'i got in', 'i opened', 'my position', 'my trade', 'in a sell', 'in a buy', 'in a short', 'in a long', 'i sold', 'i bought', 'i have a sell', 'i have a buy', 'i am short', 'i am long', 'this trade', 'my entry'],
    BIRTHDAY: ['birthday', 'bday', 'b day', 'born', 'birth day'],
    // v5
    SAFE: ['safe until', 'valid until', 'good until', 'okay until', 'ok until', 'fine until', 'until when', 'until what', 'until where', 'until which', 'how much time is it safe', 'invalidation', 'invalidated', 'invalidate', 'invalidates', 'what level breaks', 'no longer valid', 'still valid', 'still safe', 'safe to hold', 'when do i get out', 'when should i get out'],
    STALL: ['stop going up', 'stop going down', 'stop rising', 'stop falling', 'stop dropping', 'stop climbing', 'stop pumping', 'stop dumping', 'top out', 'tops out', 'bottom out', 'bottoms out', 'how high', 'how low', 'go up any more', 'go up anymore', 'go down any more', 'go down anymore', 'go any higher', 'go any lower', 'go higher', 'go lower', 'keep going up', 'keep going down', 'keep falling', 'keep rising', 'keep dropping', 'keep climbing', 'more than this', 'further', 'reverse', 'reversal', 'turn around', 'where will it stop', 'peak', 'ceiling', 'floor', 'room to run', 'how much more', 'up any more', 'down any more', 'run out of steam'],
    PAPER: ['paper', 'paper trade', 'paper trading', 'paper account', 'simulated', 'simulation', 'practice trade', 'pretend'],
    WEATHER: ['weather', 'temperature', 'forecast', 'rain', 'raining', 'snow', 'snowing', 'cold outside', 'hot outside', 'sunny', 'umbrella', 'how hot', 'how cold', 'degrees', 'outside like', 'jacket'],
    DAYPLAN: ['what should i do today', 'what should i do', 'what do i do today', 'what can i do today', 'plan my day', 'plans for today', 'plan for today', 'what is on today', 'what is the plan', 'agenda', 'schedule today', 'i am bored', 'bored', 'something to do', 'what to do today', 'ideas for today', 'any ideas'],
    WORKOUT: ['workout', 'gym', 'exercise', 'exercises', 'training session', 'lift', 'lifting', 'leg day', 'push day', 'pull day', 'cardio', 'routine'],
  };

  const CONTRACTIONS = [
    [/\b(what|where|how|who|when|it|that|there|here|gold|today)'?s\b/g, '$1 is'],
    [/\bi'?m\b/g, 'i am'], [/\b(you|we|they)'?re\b/g, '$1 are'], [/\b(i|you|we|they)'?ve\b/g, '$1 have'],
    [/\b(you|they)'?ll\b/g, '$1 will'], [/\b(i|we|it)'ll\b/g, '$1 will'], [/\b(you|they)'?d\b/g, '$1 would'], [/\b(i|we)'d\b/g, '$1 would'],
    [/\bcan'?t\b/g, 'can not'], [/\bwon'?t\b/g, 'will not'], [/\b(do|does|did|is|are|was|should|would|could)n'?t\b/g, '$1 not'],
    [/\bwhats\b/g, 'what is'], [/\bhows\b/g, 'how is'], [/\bwheres\b/g, 'where is'], [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'],
    [/\bu\b/g, 'you'], [/\bur\b/g, 'your'], [/\b(?:pls|plz)\b/g, 'please'], [/\bn\.?\s?y\.?c?\b/g, 'ny'],
    // keep "short term" / "long term" / "how long" from reading as sell / buy
    [/\bshort[ -]term\b/g, 'shortterm'], [/\blong[ -]term\b/g, 'longterm'], [/\bhow long\b/g, 'how much time'],
    [/\bstop[ -]?loss\b/g, 'stop loss'], [/\btake[ -]?profit\b/g, 'take profit'], [/\bt\.?p\.?\b/g, 'tp'], [/\bs\.?l\.?\b/g, 'sl'],
    // common speech-to-text mishearings
    [/\b(bearish|bullish|bear|bull)\s+(?:into|in to|unto|until|till|til|and tell|intel)\s+(?:one|when|win|wen|what)\b/g, '$1 until when'], [/\buntil one\b/g, 'until when'],
    [/^(?:cell|sale|sail)\b/, 'sell'], [/\b(?:cell|sale|sail)\s+(?=now\b|order\b|limit\b|at\b|it\b|\d)/g, 'sell '],
    [/^by\s+(?=now\b|order\b|limit\b|at\b|\d)/, 'buy '], [/^bye\s+(?=order\b|limit\b|at\b|\d)/, 'buy '], [/\b(a|an) (?:by|bye) (?=order\b|limit\b|at\b)/g, 'a buy '], [/\b(put|place|set) a (?:cell|sale|sail)\b/g, '$1 a sell'],
    [/\b(?:tea pee|teepee|t p)\b/g, 'tp'], [/\b(?:es el|s l)\b/g, 'sl'], [/\bbrake[ -]?even\b|\bbreak[ -]?event\b/g, 'break even'],
    [/\bstop (?:lost|laws|lass)\b/g, 'stop loss'], [/\btake (?:prophet|profits)\b/g, 'take profit'], [/\bpaper (?:trait|trey|tray)\b/g, 'paper trade'],
    [/\bwhether\b/g, 'weather'], [/\bremind (?:be|mi)\b/g, 'remind me'], [/\bwork out\b/g, 'workout'],
  ];
  // Speech recognisers often mishear "Jarvis"
  const WAKE = /\b(hey|hi|ok|okay|yo)?\s*(jarvis|jervis|javis|jarvas|jarves|jarvus|jarvez|charvis|jar vis|travis|jarvi)\b/g;

  function clean(s) {
    let t = String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/(\d),(?=\d{3}\b)/g, '$1');
    for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
    return t.replace(/([a-z])-([a-z])/g, '$1 $2').replace(/%/g, ' percent ').replace(/\$/g, ' ').replace(/[^a-z0-9.\s+\-*/]+/g, ' ').replace(/(?<!\d)\.|\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function stripWake(t) { return t.replace(WAKE, ' ').replace(/\s+/g, ' ').trim(); }

  const COMPILED = Object.entries(CONCEPTS).map(([k, list]) => [k, new RegExp(`\\b(?:${list.join('|')})\\b`)]);
  const VOCAB = new Set(Object.values(CONCEPTS).flat().flatMap((p) => p.split(' ')).filter((w) => /^[a-z]{3,}$/.test(w)));
  const STOP = new Set('water glass glasses drank drink drinking bottle bottles hydrate trade trades trading tonight night watch watching movie movies film films show shows book books read reading novel timer timers minute minutes seconds hour hours dollar dollars bucks spent spend spending food eat hungry dinner lunch breakfast snack habit habits streak streaks list todo todos task tasks check checked countdown countdowns days weeks christmas birthday trip remember forget locker vibe vibes wear jacket coat hoodie outfit outside feeling feel feels sleep slept bed bedtime wake woke awake morning routine bored tired great good okay mood moods partial partials contracts contract units half quarter challenge best worst biggest record stats your yours jarvis milk eggs trash money expense expenses quote motivate motivation the a an is it of for to me my in on at what where when how does do till until left today now right show tell give please much long current currently get you can could would i am its are was be this that there here and or with your we us our they them good bad not about any some just like really so okay ok want need know think yeah yes no move moved even break breakeven close cancel order orders pending position positions unit units contract contracts lots balance reset trail tighten adjust bump exit flat flatten change changed last week weekly weeks report recap stats bias bullish bearish stay flip until till trend journal remind reminder reminders challenge workout plan trading weather dishes home gym estates estate'.split(' '));

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
    const vocab = new Set([...VOCAB, ...extra, ...(typeof Lex !== 'undefined' ? Lex.vocab : []), ...(typeof Extra !== 'undefined' ? Extra.vocab : [])]);
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
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const low1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const join = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  // ---------------------------------------------------------------- context
  function context(ctx) {
    const tz = ctx.tz;
    const now = Date.now();
    const p = Sessions.parts(new Date(now), tz);
    const T = (ctx.title || '').trim();
    const sessions = (ctx.sessions.sessions || []).map((s) => ({ s, st: Sessions.status(s, now) })).filter((x) => x.st);
    return {
      tz, now, hour: p.h, mi: p.mi, y: p.y, m: p.m, d: p.d, T,
      birthday: ctx.birthday || '',
      paper: ctx.paper || (typeof Paper !== 'undefined' ? Paper : null),
      news: ctx.news || (typeof News !== 'undefined' ? News : null),
      reminders: ctx.reminders || (typeof Reminders !== 'undefined' ? Reminders : null),
      riskPct: +ctx.riskPct > 0 ? +ctx.riskPct : 1,
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

  // ---- timing: is now a good time to trade? ---------------------------------
  // Each flag: lvl 'stop' (I'd stay out) or 'caution'.
  const PRIME_HTML = 'London open to New York midday — about <b>3 AM – 11:30 AM ET</b>, best in the <b>8 – 11 AM</b> overlap';
  const PRIME_SAY = 'from the London open to New York midday, about 3 AM to 11:30 AM New York time, and the best of it is the 8 to 11 AM overlap';
  const sayTitle = (s) => String(s).replace(/\bm\/m\b/gi, 'month over month').replace(/\by\/y\b/gi, 'year over year').replace(/\bq\/q\b/gi, 'quarter over quarter').replace(/\//g, ' ');
  function timingFlags(k) {
    const m = k.market, g = k.g, flags = [];
    const add = (lvl, html, say) => flags.push({ lvl, html, say: say || html.replace(/<[^>]+>/g, '') });
    if (!m.open) {
      const ml = marketLine(k);
      add('stop', ml ? ml.html : 'The market is closed.', ml ? ml.say : 'The market is closed.');
      return flags;
    }
    const N = k.news;
    if (N && N.ok()) {
      const near = N.near(k.now, 30, 15);
      if (near.length) {
        const e = near[0], mins = Math.round((e.at - k.now) / 60e3);
        if (mins > 0) add('stop', `High-impact <b>${esc(e.title)}</b> is out in ${words(e.at - k.now)} — don't get caught in the spike`, `${sayTitle(e.title)} is out in ${words(e.at - k.now)}, high impact. Don't get caught in the spike`);
        else add('stop', `High-impact <b>${esc(e.title)}</b> just came out — let the dust settle (15 min)`, `${sayTitle(e.title)} just came out. Let the dust settle first`);
      } else {
        const nx = N.nextHigh(k.now);
        if (nx && nx.at - k.now < 2 * 3600e3) add('caution', `High-impact <b>${esc(nx.title)}</b> in ${words(nx.at - k.now)} — be flat or protected before it`, `${sayTitle(nx.title)} is in ${words(nx.at - k.now)}, so be flat or protected before it`);
      }
    }
    const mins = k.hour * 60 + k.mi;
    if (mins >= 15 * 60 && mins < 17 * 60) add('stop', "It's late in the New York session — volume is drying up and moves get choppy", "it's late in the New York session, volume is drying up and moves get choppy");
    else if (mins >= 18 * 60 && mins < 20 * 60) add('caution', 'The market only just reopened — spreads are wider and it\'s thin until Asia gets going', 'the market only just reopened, so spreads are wide and it\'s thin');
    else if (mins >= 20 * 60 || mins < 2 * 60) add('caution', 'Asia session — gold is usually slower, smaller ranges', "it's the Asia session, gold is usually slower");
    else if (mins >= 11 * 60 + 30 && mins < 15 * 60) add('caution', 'New York lunch / afternoon — moves often stall here', 'it\'s the New York afternoon, moves often stall');
    if (m.friday && mins >= 12 * 60) add('caution', 'Friday afternoon — liquidity fades into the weekly close', 'it\'s Friday afternoon, liquidity fades into the weekly close');
    if (g) {
      if (g.price.spread > 1) add('caution', `Spread is wide (${f2(g.price.spread)})`, `the spread is wide`);
      if (g.levels.adrPct != null && g.levels.adrPct >= 100) add('caution', `Gold has already done ${Math.round(g.levels.adrPct)}% of its average day`, `gold has already done its full average day`);
      if (g.bias.bias === 'Neutral') add('caution', 'Bias is neutral — no edge from your rules', 'the bias is neutral, so there\'s no edge');
      else if (g.bias.pending) add('caution', `A ${lc(g.bias.pending.to)} flip is building — bias may change soon`, `a ${lc(g.bias.pending.to)} flip is building`);
    }
    return flags;
  }
  function inPrime(k) { const mins = k.hour * 60 + k.mi; return k.market.open && mins >= 3 * 60 && mins < 11 * 60 + 30; }

  function tradeNowA(k) {
    const fl = timingFlags(k), stops = fl.filter((x) => x.lvl === 'stop'), cautions = fl.filter((x) => x.lvl === 'caution');
    const g = k.g, b = g && g.bias;
    const lean = b && b.bias !== 'Neutral' ? (b.bias === 'Bullish' ? 'buys' : 'sells') : null;
    let v;
    if (stops.length) v = { c: 'down', h: pick('tn-no', [`No${k.t} — probably not right now.`, `I'd sit this one out${k.t}.`, `Not right now${k.t}.`]) };
    else if (cautions.length >= 2) v = { c: 'warn', h: pick('tn-meh', [`I'd hold off${k.t} — conditions aren't great.`, `Not ideal${k.t}. I'd be picky here, if anything.`]) };
    else if (cautions.length === 1) v = { c: 'warn', h: `You can${k.t}, but be careful.` };
    else v = { c: 'up', h: pick('tn-yes', [`Conditions look good${k.t}.`, `Yes${k.t} — this is a decent window.`, `Good time to be looking${k.t}.`]) };
    const leanH = lean && !stops.length ? ` Bias is <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b>, so I'd only look for <b>${lean}</b> — say “should I ${lean === 'buys' ? 'buy' : 'sell'}” for the full check.` : '';
    const leanS = lean && !stops.length ? ` The bias is ${lc(b.bias)}, so I'd only look for ${lean}.` : '';
    const prime = inPrime(k) ? '' : `<br><span class="dim">Best window for gold: ${PRIME_HTML}.</span>`;
    const top = (stops.length ? stops : cautions).slice(0, 2).map((x) => x.say);
    return reply(
      `<b class="${v.c}">${v.h}</b>${leanH}${fl.length ? `<ul>${fl.map((x) => `<li>${x.lvl === 'stop' ? '<span class="down">✕</span>' : '<span class="warn">•</span>'} ${x.html}</li>`).join('')}</ul>` : ''}${prime}` + demoNote(g),
      `${v.h.replace(/<[^>]+>/g, '')} ${top.length ? 'Because ' + join(top) + '.' : ''}${leanS}` + demoSay(g));
  }

  function timingA(k) {
    const rules = [
      'The last couple of hours of New York (after ~3 PM ET) — volume dies, moves get choppy',
      '30 minutes before and 15 minutes after high-impact US news (CPI, NFP, FOMC…)',
      'The first hour or two after the 6 PM reopen — thin and wide spreads',
      'Friday afternoon into the weekly close',
      'When the bias is neutral or a flip is building',
      'When gold has already done its full average daily range',
      'After a couple of losses — no revenge trades',
    ];
    const now = tradeNowA(k);
    return reply(`<b>Best window:</b> ${PRIME_HTML}.<br><b>When I'd stay out:</b><ul>${rules.map((r) => `<li>${r}</li>`).join('')}</ul><b>Right now:</b> ${now.html}`,
      `The best time for gold is ${PRIME_SAY}. I'd stay out late in the New York afternoon, around big US news, right after the reopen, on Friday afternoons, and when the bias is neutral. Right now: ${now.say}`);
  }

  // ---- news -------------------------------------------------------------------
  const NEWS_ALIASES = [
    [/\bcpi\b|inflation/, /cpi/i, 'CPI'], [/\bnfp\b|non ?farm|payroll|jobs report/, /non-farm|nonfarm/i, 'NFP'],
    [/fomc|\bfed\b|powell|interest rate|rate decision/, /fomc|federal funds|fed chair|powell/i, 'Fed'], [/\bppi\b/, /ppi/i, 'PPI'],
    [/jobless|claims/, /jobless claims/i, 'jobless claims'], [/\bgdp\b/, /gdp/i, 'GDP'], [/retail sales/, /retail sales/i, 'retail sales'],
    [/\bpce\b/, /pce/i, 'PCE'], [/unemployment/, /unemployment/i, 'unemployment'],
  ];
  function newsA(k, text) {
    const N = k.news;
    if (!N || !N.ok()) return reply(`I can't reach the news calendar right now${k.t}. <span class="dim">(It updates every couple of hours — try again shortly.)</span>`, `I can't reach the news calendar right now${k.t}.`);
    const tz = k.tz, now = k.now;
    const when = (e) => `${fmtT(e.at, tz, true)} ET`;
    const sayWhenE = (e) => (e.at > now ? `${sayWhen(e.at, tz)}, in ${words(e.at - now)}` : sayWhen(e.at, tz));
    const imp = (e) => `<span class="${N.isHigh(e) ? 'down' : 'warn'}">${N.isHigh(e) ? '●●● HIGH' : '●● MED'}</span>`;
    const row = (e) => `<li>${imp(e)} <b>${esc(e.title)}</b> — ${when(e)}${e.at > now ? ` <span class="dim">(in ${words(e.at - now)})</span>` : ' <span class="dim">(out)</span>'}${e.forecast ? ` <span class="dim">· fcst ${esc(e.forecast)} · prev ${esc(e.previous || '—')}</span>` : ''}</li>`;
    const usd = N.relevant();
    const covers = N.coversUntil();
    // a specific release: "when is CPI?"
    for (const [re, titleRe, name] of NEWS_ALIASES) {
      if (!re.test(text)) continue;
      const hits = usd.concat(N.all().filter((e) => N.isUsd(e) && !N.isHigh(e) && !N.isMed(e))).filter((e) => titleRe.test(e.title)).sort((a, b) => a.at - b.at);
      const next = hits.find((e) => e.at > now - 60e3);
      if (next) return reply(`<ul>${hits.filter((e) => e.at > now - 60e3).slice(0, 3).map(row).join('')}</ul>`, `${sayTitle(next.title)} is ${sayWhenE(next)}${next.forecast ? `. Forecast ${next.forecast}` : ''}.`);
      const last = hits[hits.length - 1];
      return reply(`No ${name} left on this week's calendar${last ? ` — the last one was <b>${esc(last.title)}</b> ${when(last)}` : ''}.<br><span class="dim">I can only see this week's calendar.</span>`, `There's no ${name} left on this week's calendar${k.t}.`);
    }
    const dayKey = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ms));
    const today = usd.filter((e) => dayKey(e.at) === dayKey(now));
    if (/\btomorrow\b/.test(text)) {
      const tmr = usd.filter((e) => dayKey(e.at) === dayKey(now + 86400e3));
      return tmr.length ? reply(`US news tomorrow:<ul>${tmr.map(row).join('')}</ul>`, `Tomorrow there's ${join(tmr.map((e) => `${sayTitle(e.title)} at ${sayT(e.at, tz)}`))}.`)
        : reply(`Nothing important for gold tomorrow${k.t}.`);
    }
    if (/\bweek\b/.test(text)) {
      const wk = usd.filter((e) => N.isHigh(e) && e.at > now - 60e3);
      return wk.length ? reply(`High-impact US news left this week:<ul>${wk.map(row).join('')}</ul>`, `High impact news left this week: ${join(wk.slice(0, 5).map((e) => `${sayTitle(e.title)} ${sayWhen(e.at, tz)}`))}.`)
        : reply(`No more high-impact US news this week${k.t}.`, `No more high impact US news this week${k.t}.`);
    }
    const nh = N.nextHigh(now);
    const parts = [], says = [];
    if (nh) {
      parts.push(`Next high-impact: <b>${esc(nh.title)}</b> ${when(nh)} — in <b>${words(nh.at - now)}</b>.`);
      says.push(`The next high impact news is ${sayTitle(nh.title)}, ${sayWhenE(nh)}.`);
    } else {
      parts.push(`No more high-impact US news on this week's calendar.`);
      says.push(`There's no more high impact US news this week.`);
    }
    const todayLeft = today.filter((e) => e.at > now - 60e3);
    if (today.length) {
      parts.push(`Today (US):<ul>${today.map(row).join('')}</ul>`);
      if (todayLeft.length && (!nh || todayLeft[0] !== nh)) says.push(`Today there's also ${join(todayLeft.slice(0, 3).map((e) => `${sayTitle(e.title)} at ${sayT(e.at, tz)}`))}.`);
    } else parts.push('<span class="dim">Nothing for the US today.</span>');
    if (covers && covers - now < 2 * 86400e3) parts.push('<span class="dim">Next week\'s calendar appears on Sunday.</span>');
    return reply(parts.join('<br>'), says.join(' '));
  }

  // ---- trade scoring (shared by the trade check, plans and trade review) -----
  function scoreTrade(k, dir, style) {
    const g = k.g, b = g.bias, L = g.levels, want = dir > 0 ? 'Bullish' : 'Bearish', side = dir > 0 ? 'buy' : 'sell';
    const f = []; let score = 0;
    const add = (pts, html, say) => { score += pts; f.push({ pts, html, say }); };
    const swing = style === 'swing';
    // 1. main (1H) bias — weighs most for day trades
    const bw = swing ? 1 : 2;
    if (b.bias === want) add(bw, `1H bias is ${lc(b.bias)} — with you`, `the bias is ${lc(b.bias)}, which is with you`);
    else if (b.bias === 'Neutral') add(0, '1H bias is neutral — no edge either way', 'the bias is neutral, so no real edge');
    else add(-bw, `1H bias is ${lc(b.bias)} — against you`, `the bias is ${lc(b.bias)}, which is against you`);
    // 2. pending flip
    if (b.pending) {
      if (b.pending.to === want) add(1, `A ${lc(want)} flip is building (${b.pending.count}/${b.pending.need})`, `a ${lc(want)} flip is building`);
      else add(-1, `A ${lc(b.pending.to)} flip is pending (${b.pending.count}/${b.pending.need})`, `a ${lc(b.pending.to)} flip is pending`);
    }
    // 3. higher timeframes — weigh most for swings
    for (const r of g.mtf.rows.filter((x) => x.tf !== 'H1')) {
      const name = r.tf === 'D' ? 'Daily' : '4H', w = swing ? 2 : 1;
      if (r.trend === want) add(w, `${name} trend agrees`, `the ${r.tf === 'D' ? 'daily' : 'four hour'} trend agrees`);
      else if (r.trend !== 'Mixed' && r.trend !== 'Unknown') add(-w, `${name} trend is ${lc(r.trend)}`, `the ${r.tf === 'D' ? 'daily' : 'four hour'} trend is ${lc(r.trend)}`);
    }
    // 4. room to the next level in the trade's direction
    const atr = b.atr || 3;
    const next = dir > 0 ? L.resistance : L.support;
    if (next && !swing) {
      const room = Math.abs(next.price - g.price.bid);
      if (room < atr * 0.5) add(-1, `Only ${f2(room)} until ${esc(next.name)} (${f2(next.price)}) — right into it`, `you'd be ${side === 'buy' ? 'buying into' : 'selling into'} ${next.name}, only ${money(room)} away`);
      else if (room > atr * 1.5) add(1, `${f2(room)} of room to ${esc(next.name)} (${f2(next.price)})`, `there's ${money(room)} of room to ${next.name}`);
      else add(0, `${f2(room)} to ${esc(next.name)} (${f2(next.price)}) — some room`, `there's some room, ${money(room)}, to ${next.name}`);
    }
    // 5. daily range used (day trades)
    if (!swing && L.adrPct != null && L.adrPct >= 90) {
      const moveWith = dir > 0 ? g.change > 0 : g.change < 0;
      if (moveWith) add(-1, `${Math.round(L.adrPct)}% of the daily range is already used in your direction — late entry`, `most of today's range is already used, so it's a late entry`);
    }
    // 6. timing (news, session, Friday…)
    const fl = timingFlags(k).filter((x) => !/bias is neutral|flip is building/i.test(x.html));
    const stop = fl.find((x) => x.lvl === 'stop');
    if (stop && !swing) add(-1, stop.html, stop.say);
    const notes = fl.filter((x) => x !== stop || swing).map((x) => x.html + '.');
    if (swing && k.market.friday) notes.push('Holding a swing over the weekend risks a gap at Sunday\'s open.');

    const verdict = score >= 4 ? { w: `Your rules favour a ${side}.`, c: 'up', s: `Your rules favour a ${side}` }
      : score >= 2 ? { w: `Leans your way, but it's not a clean ${side}.`, c: 'warn', s: `It leans your way, but it's not a clean ${side}` }
      : score >= 0 ? { w: `Mixed signals — I'd wait for a cleaner ${side}.`, c: 'warn', s: `It's mixed. I'd wait for something cleaner` }
      : { w: `Your rules are against a ${side} right now.`, c: 'down', s: `Your rules are against a ${side} right now` };
    return { score, f, notes, verdict, side, want };
  }

  // ---- stop / take-profit plan from structure + ATR ---------------------------
  // Day trade: 1H ATR, nearby levels, targets that fit today's range.
  // Swing: 4H ATR, daily levels and $50 round numbers, wider stop, bigger targets.
  function roundLevels(price, step, span) {
    const out = [];
    for (let p = Math.floor((price - span) / step) * step; p <= price + span; p += step) out.push({ key: `rn${p}`, name: `${p} round number`, price: p, round: true });
    return out;
  }
  function buildPlan(k, dir, style, entryAt) {
    const g = k.g, L = g.levels, swing = style === 'swing';
    const entry = entryAt != null ? entryAt : dir > 0 ? g.price.ask : g.price.bid;
    const h1 = g.bias.atr || 3;
    const h4row = g.mtf.rows.find((r) => r.tf === 'H4');
    const unit = swing ? (h4row && h4row.atr) || h1 * 2 : h1;
    const minStop = unit * (swing ? 1 : 0.8), maxStop = unit * (swing ? 3 : 2.5), pad = unit * (swing ? 0.3 : 0.25);
    // level pool: JARVIS levels + extra round numbers, without near-duplicates
    const base = L.list.filter((l) => swing ? !/^r10/.test(l.key) : true);
    const extra = roundLevels(entry, swing ? 50 : 10, swing ? unit * 8 : unit * 6).filter((r) => !base.some((l) => Math.abs(l.price - r.price) < unit * 0.15));
    const pool = base.concat(extra).filter((l) => Math.abs(l.price - entry) > unit * 0.1);
    const dist = (l) => Math.abs(l.price - entry);
    const behind = pool.filter((l) => (dir > 0 ? l.price < entry : l.price > entry)).sort((a, b) => dist(a) - dist(b));
    const ahead = pool.filter((l) => (dir > 0 ? l.price > entry : l.price < entry)).sort((a, b) => dist(a) - dist(b));
    const anchor = behind.find((l) => dist(l) + pad >= minStop && dist(l) + pad <= maxStop) || null;
    const stop = anchor ? anchor.price - dir * pad : entry - dir * unit * (swing ? 2 : 1.5);
    const risk = Math.abs(entry - stop);
    const r1 = swing ? 1.5 : 1, r2 = swing ? 3 : 2;
    const front = unit * 0.1; // take profit just before the level, not on it
    const t1L = ahead.find((l) => dist(l) - front >= risk * r1) || null;
    const tp1 = t1L ? t1L.price - dir * front : entry + dir * risk * (swing ? 2 : 1.5);
    const t2L = ahead.find((l) => dist(l) - front >= Math.max(risk * r2, Math.abs(tp1 - entry) + unit * 0.5)) || null;
    const tp2 = t2L ? t2L.price - dir * front : entry + dir * Math.max(risk * r2 * 1.25, Math.abs(tp1 - entry) + risk);
    const notes = [];
    if (!swing && L.adrPct != null && L.adr) {
      const left = Math.max(0, L.adr - L.range);
      if (Math.abs(tp1 - entry) > left) notes.push(`Target 1 is further than what's left of today's average range (${f2(left)}) — it may not get there today.`);
    }
    if (risk < h1 * 0.5) notes.push('That stop is tight for gold — normal noise could tag it.');
    return { entry, stop, risk, anchor, tp1, t1L, tp2, t2L, rr1: Math.abs(tp1 - entry) / risk, rr2: Math.abs(tp2 - entry) / risk, unit, notes, swing };
  }
  const lvlName = (l) => (l ? l.name : null);

  function planHtml(k, p, dir) {
    const side = dir > 0 ? 'buy' : 'sell', beyond = dir > 0 ? 'below' : 'above';
    return `<div class="plan"><b>${p.swing ? 'Swing' : 'Day'} ${side} plan</b> <span class="dim">(${p.swing ? '4H / daily' : '1H'} structure, ATR ${f2(p.unit)})</span><ul>` +
      `<li>Entry ≈ <b>${f2(p.entry)}</b> <span class="dim">(${dir > 0 ? 'ask' : 'bid'} now)</span></li>` +
      `<li><span class="down">Stop</span> <b>${f2(p.stop)}</b> — ${p.anchor ? `just ${beyond} ${esc(p.anchor.name)} (${f2(p.anchor.price)})` : `${p.swing ? '2' : '1.5'}× ATR, no clean level nearby`} · risk <b>${f2(p.risk)}</b></li>` +
      `<li><span class="up">TP1</span> <b>${f2(p.tp1)}</b> — ${p.t1L ? `in front of ${esc(p.t1L.name)}` : 'measured move'} · <b>${p.rr1.toFixed(1)}R</b></li>` +
      `<li><span class="up">TP2</span> <b>${f2(p.tp2)}</b> — ${p.t2L ? `in front of ${esc(p.t2L.name)}` : 'measured move'} · <b>${p.rr2.toFixed(1)}R</b></li></ul>` +
      `<span class="dim">${p.swing
        ? 'Expect to hold 2–5 days. The stop is wider, so trade smaller — risk the same dollars. Take partials at TP1 and move the stop to break-even.'
        : 'Manage it on the 15m/1H. Take partials at TP1, stop to break-even, and be out before the New York afternoon or any high-impact news.'}</span>` +
      (p.notes.length ? `<br><span class="warn">${p.notes.join(' ')}</span>` : '') + '</div>';
  }
  function planSay(k, p, dir) {
    const beyond = dir > 0 ? 'below' : 'above';
    return `Entry around ${sayPrice(p.entry)}. Stop at ${sayPrice(p.stop)}${p.anchor ? `, just ${beyond} ${p.anchor.name}` : ''}, that's ${money(p.risk >= 10 ? Math.round(p.risk) : p.risk)} of risk. ` +
      `First target ${sayPrice(p.tp1)}, about ${p.rr1.toFixed(1)} R, second target ${sayPrice(p.tp2)}. ` +
      (p.swing ? 'Expect to hold it a few days, and size down for the wider stop.' : 'Take partials at the first target and be out before the New York afternoon.');
  }

  // ---- trade check: "should I sell now?" (+ "if I was swing trading") ---------
  function tradeA(k, dir, style, askedPlan) {
    const g = k.g, side = dir > 0 ? 'buy' : 'sell';
    if (!k.market.open) {
      const m = marketLine(k);
      return reply(`You can't ${side} right now — ${m ? m.html : 'the market is closed.'}`, `You can't ${side} right now${k.t}. ${m ? m.say : 'The market is closed.'}`);
    }
    const st = style || 'day';
    const s = scoreTrade(k, dir, st);
    const p = buildPlan(k, dir, st);
    const icon = (x) => (x.pts > 0 ? '<span class="up">✓</span>' : x.pts < 0 ? '<span class="down">✕</span>' : '<span class="warn">•</span>');
    const top = [...s.f].sort((a, c) => Math.abs(c.pts) - Math.abs(a.pts)).slice(0, 3).map((x) => x.say);
    const label = style ? `${style === 'swing' ? 'As a swing' : 'As a day trade'}: ` : '';
    const hint = style ? '' : `<br><span class="dim">That's the day-trade view — ask “what if I swing it?” for a swing plan.</span>`;
    const lead = askedPlan ? `${label ? (style === 'swing' ? 'For a swing' : 'For a day trade') : 'Here'}${k.t}: ` : '';
    return reply(
      `<b class="${s.verdict.c}">${label}${s.verdict.w}</b> <span class="dim">(score ${s.score > 0 ? '+' : ''}${s.score})</span><ul>${s.f.map((x) => `<li>${icon(x)} ${x.html}</li>`).join('')}</ul>${s.notes.length ? `<span class="warn">${s.notes.join(' ')}</span>` : ''}` +
      planHtml(k, p, dir) + hint +
      `<span class="dim">This is what your rules say, not a guarantee — your call.</span>` + demoNote(g),
      askedPlan
        ? `${lead}${planSay(k, p, dir)} ${s.verdict.s}. Your call.` + demoSay(g)
        : `${label ? (style === 'swing' ? 'As a swing, ' : 'As a day trade, ') + low1(s.verdict.s) : s.verdict.s}${k.t}. ${top.length ? 'Because ' + join(top) + '.' : ''} ${planSay(k, p, dir)} Your call.` + demoSay(g));
  }

  // "if I were to swing trade right now, what would that look like?"
  function planA(k, style, askedPlan) {
    const g = k.g, b = g.bias, st = style || 'day';
    if (!k.market.open) {
      const m = marketLine(k);
      return reply(`Nothing to plan right now — ${m ? m.html : 'the market is closed.'}`, `Nothing to plan right now${k.t}. ${m ? m.say : 'The market is closed.'}`);
    }
    const D = g.mtf.rows.find((r) => r.tf === 'D'), H4 = g.mtf.rows.find((r) => r.tf === 'H4');
    const toDir = (t) => (t === 'Bullish' ? 1 : t === 'Bearish' ? -1 : 0);
    let dir, why;
    if (st === 'swing') {
      dir = toDir(D && D.trend) || toDir(H4 && H4.trend);
      why = D && toDir(D.trend) ? `the daily trend is ${lc(D.trend)}` : `the four hour trend is ${lc((H4 && H4.trend) || 'mixed')}`;
    } else {
      dir = toDir(b.bias);
      why = `the 1H bias is ${lc(b.bias)}`;
    }
    if (!dir) {
      const html = `<b class="warn">No clean ${st === 'swing' ? 'swing' : 'day trade'} right now${k.t}.</b> ${st === 'swing' ? `The daily and 4H trends aren't giving a direction (daily ${lc((D && D.trend) || 'unknown')}, 4H ${lc((H4 && H4.trend) || 'unknown')}).` : 'Your 1H bias is neutral.'} I'd sit on my hands until the rules pick a side.` +
        `<br><span class="dim">You can still ask “should I buy?” or “should I sell?” to see either side.</span>`;
      return reply(html, `There's no clean ${st === 'swing' ? 'swing' : 'day trade'} right now${k.t}. ${st === 'swing' ? "The bigger timeframes aren't giving a direction." : 'The bias is neutral.'} I'd wait for the rules to pick a side.`);
    }
    const r = tradeA(k, dir, st, true);
    const conflict = st === 'swing' && toDir(b.bias) && toDir(b.bias) !== dir ? ` Note the 1H bias is ${lc(b.bias)} right now, so a better swing entry may come after a pullback.` : '';
    const intro = `${st === 'swing' ? 'A swing' : 'A day trade'} right now would be a <b class="${dir > 0 ? 'up' : 'down'}">${dir > 0 ? 'BUY' : 'SELL'}</b>, because ${why}.${conflict}<br>`;
    return reply(intro + r.html, `${st === 'swing' ? 'A swing' : 'A day trade'} right now would be a ${dir > 0 ? 'buy' : 'sell'}${k.t}, because ${why}.${conflict} ${r.say.replace(/^(For a (swing|day trade)|Here)[^:]*: /, '')}`);
  }

  // ---- review a trade the user is in / planning --------------------------------
  // "I'm in a sell, stop 4068, take profit 4048 — is this a good trade?"
  function parseTrade(text) {
    const SEP = '\\s*(?:(?:is|at|of|set|sitting|placed|on|to|around|about|by|=)\\s*){0,3}';
    const get = (re) => { const m = text.match(re); return m ? +m[1] : null; };
    return {
      entry: get(new RegExp(`(?:entry|entered|enter|in at|got in at|filled at|from|bought at|sold at|(?:sell|buy|short|long) at)${SEP}(\\d{3,}(?:\\.\\d+)?)`)),
      stop: get(new RegExp(`(?:stop loss|stop|sl)${SEP}(\\d{3,}(?:\\.\\d+)?)`)),
      target: get(new RegExp(`(?:take profit|profit target|target|tp)${SEP}(\\d{3,}(?:\\.\\d+)?)`)),
    };
  }
  function reviewA(k, text, dirHint, style) {
    const g = k.g, L = g.levels, st = style || 'day';
    const t = parseTrade(text);
    let dir = dirHint;
    if (!dir && t.stop && t.target) dir = t.target > t.stop ? 1 : -1;
    if (!dir && t.stop && t.entry) dir = t.stop > t.entry ? -1 : 1;
    if (!dir && t.target && t.entry) dir = t.target > t.entry ? 1 : -1;
    if (!dir) return reply(`Is that a buy or a sell${k.t}? Say e.g. “I'm in a sell, stop 4068, take profit 4048”.`, `Is that a buy or a sell${k.t}?`);
    if (t.stop && !t.target) return tpForStopA(k, dir, t.entry || (dir > 0 ? g.price.ask : g.price.bid), t.stop, st, !!t.entry);
    if (!t.stop && !t.target) {
      const r = tradeA(k, dir, style);
      return reply(`Tell me your stop and take profit and I'll grade the trade — e.g. “stop 4068, TP 4048”. Meanwhile, here's the ${dir > 0 ? 'buy' : 'sell'} side right now:<br>${r.html}`, `Tell me your stop and take profit and I'll grade it${k.t}. ${r.say}`);
    }
    const side = dir > 0 ? 'buy' : 'sell';
    const live = g.price.bid;
    const entry = t.entry || (dir > 0 ? g.price.ask : g.price.bid);
    const atr = g.bias.atr || 3;
    const f = []; let score = 0;
    const add = (pts, html, say) => { score += pts; f.push({ pts, html, say }); };
    // sanity: stop and target on the right sides
    if (t.stop && (dir > 0 ? t.stop >= entry : t.stop <= entry)) {
      if (t.entry) add(0, `Your stop (${f2(t.stop)}) is already past your entry — that locks in profit`, `your stop is already in profit`);
      else return reply(`<span class="warn">On a ${side}, your stop should be ${dir > 0 ? 'below' : 'above'} price (${f2(entry)}), but you said ${f2(t.stop)}.</span> Did you mean a ${dir > 0 ? 'sell' : 'buy'}?`, `On a ${side} your stop should be ${dir > 0 ? 'below' : 'above'} price${k.t}. Did you mean a ${dir > 0 ? 'sell' : 'buy'}?`);
    }
    if (t.target && (dir > 0 ? t.target <= entry : t.target >= entry)) {
      if (!t.entry) return reply(`<span class="warn">Gold is at ${f2(live)} now, so a ${side} with a take profit at ${f2(t.target)} would already be past its target.</span> What was your entry? Say e.g. “I sold at ${f2(Math.round(dir > 0 ? t.target - 10 : t.target + 10))}, stop ${t.stop ? f2(t.stop) : '…'}, TP ${f2(t.target)}”.`,
        `Gold is at ${sayPrice(live)} now${k.t}, so that take profit is already passed. What was your entry?`);
      return reply(`<span class="warn">On a ${side}, your take profit should be ${dir > 0 ? 'above' : 'below'} your entry (${f2(entry)}), but you said ${f2(t.target)}.</span>`, `On a ${side} your take profit should be ${dir > 0 ? 'above' : 'below'} your entry${k.t}.`);
    }
    const risk = t.stop ? Math.abs(entry - t.stop) : null;
    const reward = t.target ? Math.abs(t.target - entry) : null;
    const rr = risk && reward ? reward / risk : null;
    // 1. risk : reward
    if (rr != null) {
      if (rr >= 2) add(1, `Risk:reward is <b>${rr.toFixed(2)}R</b> — good`, `the risk to reward is ${rr.toFixed(1)} R, which is good`);
      else if (rr >= 1) add(0, `Risk:reward is <b>${rr.toFixed(2)}R</b> — okay`, `the risk to reward is ${rr.toFixed(1)} R, which is okay`);
      else add(-1, `Risk:reward is only <b>${rr.toFixed(2)}R</b> — you're risking more than you can make`, `you're risking more than you can make, only ${rr.toFixed(1)} R`);
    }
    // 2. bias / higher timeframes
    const s = scoreTrade(k, dir, st);
    for (const x of s.f.filter((x) => /bias|trend|flip/i.test(x.html))) add(x.pts, x.html, x.say);
    // 3. stop size and placement
    if (risk != null) {
      if (risk < atr * 0.5) add(-1, `Stop is only ${f2(risk)} — tight for gold (1H ATR ${f2(atr)}), noise could tag it`, `the stop is tight for gold, normal noise could hit it`);
      else if (st === 'day' && risk > atr * 3.5) add(0, `Stop is ${f2(risk)} — wide for a day trade (1H ATR ${f2(atr)}); size down`, `the stop is wide for a day trade, so size down`);
      const guard = L.list.filter((l) => (dir > 0 ? l.price < entry && l.price > t.stop : l.price > entry && l.price < t.stop)).sort((a, b) => Math.abs(b.price - entry) - Math.abs(a.price - entry))[0];
      const exposed = L.list.find((l) => (dir > 0 ? l.price < t.stop && t.stop - l.price < atr * 0.3 : l.price > t.stop && l.price - t.stop < atr * 0.3));
      if (exposed) add(-1, `Your stop sits just ${dir > 0 ? 'above' : 'below'} ${esc(exposed.name)} (${f2(exposed.price)}) — price likes to poke levels; ${dir > 0 ? 'below' : 'above'} ~${f2(exposed.price - dir * atr * 0.25)} is safer`, `your stop is just ${dir > 0 ? 'above' : 'below'} ${exposed.name}, so a poke of that level could take you out`);
      else if (guard) add(1, `Stop is protected by ${esc(guard.name)} (${f2(guard.price)})`, `your stop is protected behind ${guard.name}`);
    }
    // 4. target vs levels in the way
    if (t.target) {
      const between = L.list.filter((l) => (dir > 0 ? l.price > entry && l.price < t.target : l.price < entry && l.price > t.target)).sort((a, b) => Math.abs(a.price - entry) - Math.abs(b.price - entry));
      const justPast = L.list.find((l) => (dir > 0 ? l.price < t.target && t.target - l.price < atr * 0.3 && l.price > entry : l.price > t.target && l.price - t.target < atr * 0.3 && l.price < entry));
      if (justPast) add(0, `TP is just past ${esc(justPast.name)} (${f2(justPast.price)}) — consider taking it a bit before that level`, `your target is just past ${justPast.name}, consider taking profit a little before it`);
      else if (between.length) add(0, `${between.length === 1 ? 'One level' : `${between.length} levels`} in the way: ${between.slice(0, 3).map((l) => `${esc(l.name)} ${f2(l.price)}`).join(', ')} — watch for a reaction, maybe take partials`, `watch ${between[0].name} on the way, it could react there`);
      else add(1, 'Clear path to your TP — no levels in the way', 'there are no levels in the way of your target');
      if (st === 'day' && L.adr && L.adrPct != null) {
        const left = Math.max(0, L.adr - L.range), need = Math.abs(t.target - live);
        if (need > left * 1.1) add(0, `TP needs ${f2(need)} more but only ~${f2(left)} is left of today's average range — may take more than today`, `the target may need more than today's average range`);
      }
    }
    // 5. timing
    const tf = timingFlags(k).filter((x) => /news|came out|weekly close|Friday/i.test(x.html));
    for (const x of tf) add(x.lvl === 'stop' ? -1 : 0, x.html, x.say);
    // where are we now
    const pl = (live - entry) * dir;
    const status = t.entry || !k.market.open ? `<br><span class="dim">Price now ${f2(live)} → ${pl >= 0 ? '+' : ''}${f2(pl)} per oz from your entry${t.stop ? `, ${f2(Math.abs(live - t.stop))} from your stop` : ''}${t.target ? `, ${f2(Math.abs(t.target - live))} from your TP` : ''}.</span>` : '';
    const verdict = score >= 3 ? { c: 'up', w: `Looks solid by your rules${k.t}.`, s: `By your rules, that looks solid${k.t}` }
      : score >= 1 ? { c: 'up', w: `According to your bias it should be fine${k.t}.`, s: `According to your bias it should be fine${k.t}` }
      : score >= 0 ? { c: 'warn', w: `It's okay, but not a great trade${k.t}.`, s: `It's okay${k.t}, but not a great trade` }
      : score >= -2 ? { c: 'warn', w: `I'd be careful with this one${k.t}.`, s: `I'd be careful with this one${k.t}` }
      : { c: 'down', w: `Your rules don't like this trade${k.t}.`, s: `Your rules don't like this trade${k.t}` };
    const icon = (x) => (x.pts > 0 ? '<span class="up">✓</span>' : x.pts < 0 ? '<span class="down">✕</span>' : '<span class="warn">•</span>');
    const nums = `<span class="dim">${side.toUpperCase()} · entry ${f2(entry)}${t.entry ? '' : ' (price now)'}${t.stop ? ` · stop ${f2(t.stop)} (risk ${f2(risk)})` : ''}${t.target ? ` · TP ${f2(t.target)} (reward ${f2(reward)})` : ''}${rr != null ? ` · ${rr.toFixed(2)}R` : ''}</span>`;
    const top = [...f].sort((a, c) => Math.abs(c.pts) - Math.abs(a.pts)).slice(0, 3).map((x) => x.say);
    const missing = !t.stop ? '<br><span class="warn">No stop loss? Always have one.</span>' : !t.target ? '<br><span class="dim">Add your take profit and I\'ll check the risk:reward too.</span>' : '';
    return reply(
      `<b class="${verdict.c}">${verdict.w}</b> <span class="dim">(score ${score > 0 ? '+' : ''}${score})</span><br>${nums}<ul>${f.map((x) => `<li>${icon(x)} ${x.html}</li>`).join('')}</ul>${missing}${status}` +
      `<br><span class="dim">Read-only — I can't touch your trade. Not a guarantee — your call.</span>` + demoNote(g),
      `${verdict.s}. ${top.length ? cap1(join(top)) + '.' : ''}${!t.stop ? ' And please set a stop loss.' : ''}` + demoSay(g));
  }

  // ---- where does price stop? / safe until? / where's my TP? -------------------
  // What the bias would be if a 1H candle closed at `px` (same rules + buffer as the engine)
  function biasAt(k, px) {
    const b = k.g.bias, buf = b.buffer || 0;
    let bull = 0, bear = 0;
    for (const r of b.raw.rules) {
      if (r.level == null) continue;
      if (px - r.level > buf) bull++; else if (px - r.level < -buf) bear++;
    }
    return bull > bear ? 'Bullish' : bear > bull ? 'Bearish' : 'Neutral';
  }
  // First price (scanning away from `from` in steps of 10c) where the bias becomes one of `want`
  function flipPoint(k, from, dir, want) {
    for (let i = 1; i <= 6000; i++) { const p = from + dir * i * 0.1; if (want.includes(biasAt(k, p))) return Math.round(p * 10) / 10; }
    return null;
  }
  // Levels in a direction (JARVIS levels + $10 / $50 round numbers), nearest first
  function levelsToward(k, dir, from, step = 10, n = 4) {
    const g = k.g, unit = g.bias.atr || 3;
    const base = g.levels.list.slice();
    const extra = roundLevels(from, step, unit * 8).filter((r) => !base.some((l) => Math.abs(l.price - r.price) < unit * 0.15));
    return base.concat(extra).filter((l) => (dir > 0 ? l.price > from + 0.3 : l.price < from - 0.3)).sort((a, b) => Math.abs(a.price - from) - Math.abs(b.price - from)).slice(0, n);
  }
  // Where an average day would top / bottom out
  function adrEdge(k, dir) {
    const L = k.g.levels, g = k.g;
    if (!L.adr) return null;
    const edge = dir > 0 ? g.dayLow + L.adr : g.dayHigh - L.adr;
    const room = (edge - g.price.bid) * dir;
    return { edge, room, pct: L.adrPct };
  }

  function stallA(k, dir) {
    const g = k.g, b = g.bias, up = dir > 0;
    const lv = levelsToward(k, dir, g.price.bid, 10, 4);
    const edge = adrEdge(k, dir);
    const withBias = (up && b.bias === 'Bullish') || (!up && b.bias === 'Bearish');
    const against = (up && b.bias === 'Bearish') || (!up && b.bias === 'Bullish');
    const lead = pick('stall', [`Nobody can know for sure${k.t}, but here's the map.`, `I can't predict it${k.t}, but these are the likely ${up ? 'ceilings' : 'floors'}.`, `No guarantees${k.t} — here's where ${up ? 'buyers usually run out of steam' : 'sellers usually run out of steam'}.`]);
    const items = lv.map((l, i) => `<li>${i === 0 ? '<b>' : ''}${esc(l.name)} ${f2(l.price)}${i === 0 ? '</b>' : ''} <span class="dim">(${f2(Math.abs(l.price - g.price.bid))} ${up ? 'above' : 'below'})</span></li>`).join('');
    let edgeH = '', edgeS = '';
    if (edge) {
      if (edge.room <= 0) { edgeH = `Gold has already done its full average day (${Math.round(edge.pct)}%) — extra ${up ? 'upside' : 'downside'} today would be above normal.`; edgeS = `Gold has already moved its full average day, so more ${up ? 'upside' : 'downside'} today would be unusual.`; }
      else { edgeH = `An average day would ${up ? 'top out' : 'bottom out'} around <b>${f2(edge.edge)}</b> — about ${f2(edge.room)} more (${Math.round(edge.pct)}% of the normal range used).`; edgeS = `An average day would ${up ? 'top out' : 'bottom out'} around ${sayPrice(edge.edge)}, about ${money(Math.round(edge.room))} more.`; }
    }
    const biasH = withBias ? `Your bias is ${lc(b.bias)}, so the move is with your rules.` : against ? `Your bias is ${lc(b.bias)}, so ${up ? 'rallies' : 'drops'} into these levels are where the ${up ? 'sellers' : 'buyers'} tend to show up.` : 'Bias is neutral — expect chop between levels.';
    return reply(`${lead}<br>${up ? 'Resistance above' : 'Support below'}:<ul>${items || '<li>none nearby</li>'}</ul>${edgeH}<br>${biasH}` + demoNote(g),
      `${lead} The first ${up ? 'ceiling' : 'floor'} is ${lv[0] ? `${lv[0].name} at ${sayPrice(lv[0].price)}, ${money(Math.round(Math.abs(lv[0].price - g.price.bid)))} away` : 'not nearby'}${lv[1] ? `, then ${lv[1].name} at ${sayPrice(lv[1].price)}` : ''}. ${edgeS} ${biasH}` + demoSay(g));
  }

  function safeA(k, dir) {
    const g = k.g, b = g.bias, want = dir > 0 ? 'Bullish' : 'Bearish', other = dir > 0 ? 'Bearish' : 'Bullish', side = dir > 0 ? 'Buying' : 'Selling', px = g.price.bid;
    const toward = -dir; // invalidation is on the other side
    const lv = levelsToward(k, dir, px, 10, 2);
    const edge = adrEdge(k, dir);
    const targetH = `${dir > 0 ? 'Upside' : 'Downside'} targets: ${lv.map((l) => `${esc(l.name)} ${f2(l.price)}`).join(', ') || 'none nearby'}${edge && edge.room > 0 ? `; an average day ${dir > 0 ? 'tops' : 'bottoms'} out near ${f2(edge.edge)}` : ''}.`;
    const targetS = lv[0] ? ` First target ${lv[0].name} at ${sayPrice(lv[0].price)}.` : '';
    const note = '<br><span class="dim">Bias only changes on closed 1H candles (2 in a row), so a quick wick through these levels doesn\'t count. Not a guarantee — your call.</span>';
    if (b.bias === want) {
      if (biasAt(k, px) !== want) {
        return reply(`<b class="warn">${side} is still backed by your confirmed bias, but price is already on the wrong side of your rules.</b> If the next 1H candle closes here, a flip starts building.<br>${targetH}${note}` + demoNote(g),
          `${side} is still backed by the confirmed bias${k.t}, but price is already on the wrong side of the rules. If the next hourly candle closes here, a flip starts building.` + demoSay(g));
      }
      const neutral = flipPoint(k, px, toward, ['Neutral', other]);
      const flip = flipPoint(k, px, toward, [other]);
      return reply(`${lv[0] ? `Room ${dir > 0 ? 'up' : 'down'} to about <b>${f2(lv[0].price)}</b> (${esc(lv[0].name)}, ${f2(Math.abs(lv[0].price - px))} away).<br>` : ''}<b class="${cls(want)}">${side} is backed by your rules while 1H candles close ${dir > 0 ? 'above' : 'below'} ~${f2(neutral)}.</b>` +
        `<ul><li>${dir > 0 ? 'Below' : 'Above'} ${f2(neutral)} → rules go <span class="warn">neutral</span> (${f2(Math.abs(px - neutral))} away)</li>` +
        (flip ? `<li>Closes ${dir > 0 ? 'below' : 'above'} ${f2(flip)} → flips <span class="${cls(other)}">${lc(other)}</span> (${f2(Math.abs(px - flip))} away)</li>` : '') + `</ul>${targetH}${note}` + demoNote(g),
        `${side} is safe by your rules while hourly candles close ${dir > 0 ? 'above' : 'below'} ${sayPrice(neutral)}, sir — that's ${money(Math.round(Math.abs(px - neutral)))} away.${flip ? ` ${dir > 0 ? 'Below' : 'Above'} ${sayPrice(flip)} it flips ${lc(other)}.` : ''}${targetS}`.replace(', sir', k.t) + demoSay(g));
    }
    const turn = flipPoint(k, px, dir, [want]);
    const html = `<b class="${b.bias === 'Neutral' ? 'warn' : 'down'}">${side} isn't backed by your rules right now — bias is ${lc(b.bias)}.</b> It turns ${lc(want)} on 1H closes ${dir > 0 ? 'above' : 'below'} <b>${turn ? f2(turn) : '—'}</b>${turn ? ` (${f2(Math.abs(turn - px))} away)` : ''}, two in a row.${note}`;
    return reply(html + demoNote(g), `${side} isn't backed by your rules right now${k.t}. The bias is ${lc(b.bias)}. It would take hourly closes ${dir > 0 ? 'above' : 'below'} ${turn ? sayPrice(turn) : 'the rule levels'} to turn ${lc(want)}.` + demoSay(g));
  }

  // Where a move could run to: next level(s) in that direction, plus the average-day edge
  function moveTarget(k, dir, px) {
    const lv = levelsToward(k, dir, px, 10, 2), edge = adrEdge(k, dir);
    const t1 = lv[0] || (edge && edge.room > 0 ? { name: 'average day range', price: edge.edge } : null);
    if (!t1) return null;
    return { t1, t2: lv[1] || null, edge: edge && edge.room > 0 ? edge.edge : null };
  }
  // "Bearish until when?" / "Bullish until when?": the price that ends the bias + the soonest it could change
  function biasUntilA(k, dir) {
    const g = k.g, b = g.bias, px = g.price.bid;
    if (!dir) dir = b.bias === 'Bullish' ? 1 : b.bias === 'Bearish' ? -1 : 0;
    const want = dir > 0 ? 'Bullish' : 'Bearish', other = dir > 0 ? 'Bearish' : 'Bullish';
    const mins = (60 - k.mi) + 60; // two closed 1H candles needed
    const soon = mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${mins} min`;
    const closed = !k.market.open, soonAt = closed ? k.market.opensAt + 2 * 3600e3 : 0;
    const time = closed
      ? `<br><span class="dim">The market is closed, so nothing can change until it reopens (${fmtT(k.market.opensAt, k.tz, true)} ET). It needs 2 hourly closes in a row, so the soonest is about <b>${fmtT(soonAt, k.tz, true)} ET</b>. Not a guarantee — your call.</span>`
      : `<br><span class="dim">There's no clock on it — the bias lasts until price does that. Because it needs 2 hourly closes in a row, the soonest it could change is in about <b>${soon}</b>. Not a guarantee — your call.</span>`;
    const timeS = closed
      ? ` The market is closed, so the soonest it could change is about ${sayWhen(soonAt, k.tz)}, two hours after it reopens.`
      : ` There's no set time, it lasts until price does that. The soonest it could change is in about ${soon.replace('hr', 'hour').replace('min', 'minutes')}.`;
    if (!dir) {
      const up = flipPoint(k, px, 1, ['Bullish']), dn = flipPoint(k, px, -1, ['Bearish']);
      return reply(`Bias is <b class="warn">neutral</b> right now${k.t} — neither bullish nor bearish.<ul><li>Turns <span class="up">bullish</span> on 1H closes above <b>${up ? f2(up) : '—'}</b></li><li>Turns <span class="down">bearish</span> on 1H closes below <b>${dn ? f2(dn) : '—'}</b></li></ul>${time}` + demoNote(g),
        `The bias is neutral right now${k.t}.${up ? ` It turns bullish on hourly closes above ${sayPrice(up)}` : ''}${dn ? `, and bearish below ${sayPrice(dn)}` : ''}.` + timeS + demoSay(g));
    }
    if (b.bias !== want) {
      const turn = flipPoint(k, px, dir, [want]);
      return reply(`It isn't ${lc(want)} right now${k.t} — the bias is <b class="${cls(b.bias)}">${lc(b.bias)}</b>. It would turn ${lc(want)} on 1H closes ${dir > 0 ? 'above' : 'below'} <b>${turn ? f2(turn) : '—'}</b>${turn ? ` (${f2(Math.abs(turn - px))} away)` : ''}, two in a row.${time}` + demoNote(g),
        `It isn't ${lc(want)} right now${k.t}, the bias is ${lc(b.bias)}. It would take hourly closes ${dir > 0 ? 'above' : 'below'} ${turn ? sayPrice(turn) : 'the rule levels'} to turn ${lc(want)}.` + timeS + demoSay(g));
    }
    const neutral = flipPoint(k, px, -dir, ['Neutral', other]);
    const flip = flipPoint(k, px, -dir, [other]);
    const T = moveTarget(k, dir, px);
    const tH = T ? `<b class="${cls(want)}">Price looks ${lc(want)} ${dir > 0 ? 'up' : 'down'} toward ~${f2(T.t1.price)}</b> (${esc(T.t1.name)}, ${f2(Math.abs(T.t1.price - px))} away)${T.t2 ? `, then ${f2(T.t2.price)}` : ''}.${T.edge ? ` An average day would ${dir > 0 ? 'top' : 'bottom'} out near ${f2(T.edge)}.` : ''}<br>` : '';
    const tS = T ? `Gold looks ${lc(want)} ${dir > 0 ? 'up' : 'down'} toward about ${sayPrice(T.t1.price)}${k.t}, that's the ${T.t1.name}. ` : '';
    const warn = biasAt(k, px) !== want ? `<br><span class="warn">Heads up: price is already on the wrong side of your rules — if this hour closes here, the change starts building.</span>` : '';
    return reply(`${tH}<b class="${cls(want)}">${T ? 'It stays' : 'Price stays'} ${lc(want)} while 1H candles close ${dir > 0 ? 'above' : 'below'} ~${f2(neutral)}</b> (${f2(Math.abs(px - neutral))} away).` +
      `<ul><li>${dir > 0 ? 'Below' : 'Above'} ${f2(neutral)} → <span class="warn">neutral</span></li>` + (flip ? `<li>${dir > 0 ? 'Below' : 'Above'} ${f2(flip)} → flips <span class="${cls(other)}">${lc(other)}</span> (${f2(Math.abs(px - flip))} away)</li>` : '') + `</ul>${warn}${time}` + demoNote(g),
      `${tS}${T ? 'It stays' : 'Gold stays'} ${lc(want)} while hourly candles close ${dir > 0 ? 'above' : 'below'} ${sayPrice(neutral)}${T ? '' : k.t}, that's ${money(Math.round(Math.abs(px - neutral)))} away.${flip ? ` ${dir > 0 ? 'Below' : 'Above'} ${sayPrice(flip)} it flips ${lc(other)}.` : ''}` + timeS + demoSay(g));
  }

  // "What's the bias for when the market opens?" — the read going into the next session, and what would change it.
  function openBiasA(k, opt = {}) {
    const g = k.g, b = g.bias, r = b.raw, m = k.market, px = g.price.bid, mt = mtfLine(g), p = pendingOf(b);
    const dir = b.bias === 'Bullish' ? 1 : b.bias === 'Bearish' ? -1 : 0;
    const closed = !m.open;
    const head = closed
      ? `Market's closed${k.t} — it reopens <b>${fmtT(m.opensAt, k.tz, true)} ET</b> (in ${words(m.opensAt - k.now)}).`
      : `Market is open right now${k.t}, so this is the live read going into the next session.`;
    const headS = closed ? `The market is closed${k.t}, it reopens in ${words(m.opensAt - k.now)}.` : `The market is open right now${k.t}.`;
    const lines = [], sayL = [];
    if (dir) {
      const other = dir > 0 ? 'Bearish' : 'Bullish';
      const neutral = flipPoint(k, px, -dir, ['Neutral', other]), flip = flipPoint(k, px, -dir, [other]);
      if (neutral) { lines.push(`Stays <span class="${cls(b.bias)}">${lc(b.bias)}</span> while hourly candles close ${dir > 0 ? 'above' : 'below'} <b>${f2(neutral)}</b> (${f2(Math.abs(px - neutral))} away)`); sayL.push(`It stays ${lc(b.bias)} while hourly candles close ${dir > 0 ? 'above' : 'below'} ${sayPrice(neutral)}`); }
      if (flip) { lines.push(`Flips <span class="${cls(other)}">${lc(other)}</span> on closes ${dir > 0 ? 'below' : 'above'} <b>${f2(flip)}</b>`); sayL.push(`it flips ${lc(other)} ${dir > 0 ? 'below' : 'above'} ${sayPrice(flip)}`); }
      const T = moveTarget(k, dir, px);
      if (T) { lines.push(`First target in the bias direction: <b>${f2(T.t1.price)}</b> (${esc(T.t1.name)})`); sayL.push(`the first target is about ${sayPrice(T.t1.price)}`); }
    } else {
      const up = flipPoint(k, px, 1, ['Bullish']), dn = flipPoint(k, px, -1, ['Bearish']);
      if (up) { lines.push(`Turns <span class="up">bullish</span> on hourly closes above <b>${f2(up)}</b>`); sayL.push(`it turns bullish above ${sayPrice(up)}`); }
      if (dn) { lines.push(`Turns <span class="down">bearish</span> on hourly closes below <b>${f2(dn)}</b>`); sayL.push(`bearish below ${sayPrice(dn)}`); }
    }
    if (closed) {
      const soonAt = m.opensAt + 2 * 3600e3;
      lines.push(`Soonest the bias can change: about <b>${fmtT(soonAt, k.tz, true)} ET</b> (2 hourly closes after the open)`);
      lines.push(`If price <b>gaps</b> past those levels at the open, the first hourly candles start building the change`);
    }
    let plan = dir ? `I'd look for <b class="${cls(b.bias)}">${dir > 0 ? 'buys' : 'sells'}</b> first when it opens, in London and New York hours.` : `No edge from the rules yet — I'd wait for a side to form after the open.`;
    let tradeH = '', tradeS = '';
    if (opt.trade) {
      const asked = opt.dir || 0;
      const against = asked && dir && asked !== dir, withIt = asked && dir && asked === dir;
      tradeH = against ? `<b class="warn">A ${asked > 0 ? 'buy' : 'sell'} at the open would go against your rules</b> — they point ${lc(b.bias)}.<br>`
        : withIt ? `<b class="up">A ${asked > 0 ? 'buy' : 'sell'} lines up with your rules</b> — but wait for a setup, not just the open.<br>`
        : dir ? `<b>Yes, there can be a trade — on the ${dir > 0 ? 'buy' : 'sell'} side</b>, once a setup forms.<br>` : `<b class="warn">No clear side yet</b> — I'd sit out until one forms.<br>`;
      tradeS = against ? `A ${asked > 0 ? 'buy' : 'sell'} at the open would go against your rules, they point ${lc(b.bias)}. ` : withIt ? `A ${asked > 0 ? 'buy' : 'sell'} lines up with your rules, but wait for a setup. ` : dir ? `If you trade, look for ${dir > 0 ? 'buys' : 'sells'}. ` : `There's no clear side yet. `;
      plan += ` <b>Don't jump in right at the open</b> — the first hour is thin with wide spreads. The cleaner windows are London (3 AM) and the New York overlap (8–11 AM ET). Ask me "is now a good time to trade" before you enter.`;
    }
    return reply(
      `${head}<br>${tradeH}Going into the open, your rules read <b class="${cls(b.bias)}">${b.bias.toUpperCase()}</b> — ${r.bullish} bullish, ${r.bearish} bearish of ${r.total}, from the last close at ${fmtT(b.lastCloseTime, k.tz, true)} ET (${f2(b.lastClose)}). ${p.html}<br>Higher timeframes: ${mt.html}.<ul>${lines.map((x) => `<li>${x}</li>`).join('')}</ul>${plan}<br><span class="dim">Not a guarantee — your call.</span>` + demoNote(g),
      `${headS} ${tradeS}Going into the open, the bias is ${lc(b.bias)}. ${sayL.length ? cap1(sayL.join(', ')) + '.' : ''} ${dir ? `I'd look for ${dir > 0 ? 'buys' : 'sells'} first.` : `I'd wait for a side to form.`} ${p.say}` + demoSay(g));
  }

  // "Will it hit 4000 today?" / "will it break the high?" — distance, bias, average-day room, levels in the way
  function reachA(k, text) {
    const g = k.g, b = g.bias, L = g.levels, px = g.price.bid;
    let target = null, name = '';
    const nm = text.match(/\b(\d{3,5}(?:\.\d+)?)\b/);
    if (nm && +nm[1] > 500) { target = +nm[1]; name = f2(target); }
    else if (/\b(high|top|highs|hod)\b/.test(text)) { target = g.dayHigh; name = `today's high (${f2(g.dayHigh)})`; }
    else if (/\b(low|bottom|lows|lod)\b/.test(text)) { target = g.dayLow; name = `today's low (${f2(g.dayLow)})`; }
    if (target == null) return stallA(k, biasDir(k) || 1);
    const dist = target - px, dir = dist >= 0 ? 1 : -1, abs = Math.abs(dist);
    const bd = b.bias === 'Bullish' ? 1 : b.bias === 'Bearish' ? -1 : 0;
    const room = L.adr ? (dir > 0 ? g.dayLow + L.adr - px : px - (g.dayHigh - L.adr)) : null;
    const inWay = (L.list || []).filter((l) => (dir > 0 ? l.price > px + 0.3 && l.price < target - 0.3 : l.price < px - 0.3 && l.price > target + 0.3)).slice(0, 3);
    let verdict, say;
    if (abs < 0.5) { verdict = `Price is right at ${name} now.`; say = verdict; }
    else {
      const withBias = bd === dir, normal = room != null && room >= abs;
      verdict = `${name} is <b>${f2(abs)} ${dir > 0 ? 'above' : 'below'}</b> price (${f2(px)}).`
        + (bd ? ` The bias is <b class="${cls(b.bias)}">${lc(b.bias)}</b> — ${withBias ? 'that\'s the bias direction, which helps' : 'that\'s against the bias, so it\'s the harder way'}.` : ' The bias is neutral — no edge either way.')
        + (room != null ? ` ${normal ? `It's within a normal day's range (about ${f2(Math.max(0, room))} of room left ${dir > 0 ? 'up' : 'down'}).` : `It would take a bigger-than-average day (only about ${f2(Math.max(0, room))} of normal room left ${dir > 0 ? 'up' : 'down'}).`}` : '');
      const odds = withBias && normal ? 'Possible today' : withBias || normal ? 'It could, but it\'s not the easy path' : 'Unlikely today';
      verdict = `<b>${odds}${k.t}.</b> ` + verdict;
      say = `${odds}${k.t}. ${name.replace(/\(.*\)/, '')} is ${money(Math.round(abs))} ${dir > 0 ? 'above' : 'below'} price.${bd ? ` The bias is ${lc(b.bias)}, ${withBias ? 'which is the same direction' : 'which is against it'}.` : ''}`;
    }
    const way = inWay.length ? `<br><span class="dim">In the way: ${inWay.map((l) => `${esc(l.name)} ${f2(l.price)}`).join(' · ')}</span>` : '';
    const closed = !k.market.open ? `<br><span class="dim">Market is closed — it reopens ${fmtT(k.market.opensAt, k.tz, true)} ET.</span>` : '';
    return reply(verdict + way + closed + `<br><span class="dim">Not a guarantee — your call.</span>` + demoNote(g), say + demoSay(g));
  }
  // "Should I close my trade?" — your open paper trade + where it stays valid
  function manageA(k) {
    const P = k.paper, g = k.g;
    const pos = P ? P.positions().filter((p) => !p.bot) : [];
    if (!pos.length) return reply(`You don't have an open paper trade${k.t}. If you're in a trade on your broker, tell me the side and I'll check it — like "is my sell safe".`, `You don't have an open paper trade${k.t}.`);
    const p = pos[pos.length - 1], px = P.closePx(p, g.price.bid, g.price.ask), pl = P.pnlAt(p, px);
    const s = safeA(k, p.side);
    const head = `Your <b>${p.side > 0 ? 'BUY' : 'SELL'} ${p.units}</b> from ${f2(p.entry)} is <b class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : '−'}$${f2(Math.abs(pl))}</b>${p.sl ? `, stop ${f2(p.sl)}` : ''}${p.tp ? `, target ${f2(p.tp)}` : ''}.<br>`;
    const tip = pl > 0 && p.tp && Math.abs(px - p.entry) >= Math.abs(p.tp - p.entry) * 0.6 ? `<br>You're most of the way to target — taking partials or moving the stop to break even are both reasonable. <b>Your call.</b>` : '';
    return reply(head + s.html + tip, `Your ${p.side > 0 ? 'buy' : 'sell'} is ${pl >= 0 ? 'up' : 'down'} ${money(Math.round(Math.abs(pl)))}. ` + s.say);
  }

  // Take-profit ideas for a given entry + stop
  function suggestTargets(k, dir, entry, stop, style) {
    const g = k.g, swing = style === 'swing';
    const h4row = g.mtf.rows.find((r) => r.tf === 'H4');
    const unit = swing ? (h4row && h4row.atr) || (g.bias.atr || 3) * 2 : g.bias.atr || 3;
    const risk = Math.abs(entry - stop), front = unit * 0.1;
    const base = g.levels.list.filter((l) => (swing ? !/^r10/.test(l.key) : true));
    const extra = roundLevels(entry, swing ? 50 : 10, unit * 8).filter((r) => !base.some((l) => Math.abs(l.price - r.price) < unit * 0.15));
    const ahead = base.concat(extra).filter((l) => (dir > 0 ? l.price > entry + unit * 0.1 : l.price < entry - unit * 0.1)).sort((a, b) => Math.abs(a.price - entry) - Math.abs(b.price - entry));
    const d = (l) => Math.abs(l.price - entry) - front;
    const t1L = ahead.find((l) => d(l) >= risk * (swing ? 1.5 : 1)) || null;
    const tp1 = t1L ? t1L.price - dir * front : entry + dir * risk * 1.5;
    const t2L = ahead.find((l) => d(l) >= Math.max(risk * (swing ? 3 : 2), Math.abs(tp1 - entry) + unit * 0.5)) || null;
    const tp2 = t2L ? t2L.price - dir * front : entry + dir * Math.max(risk * 2.5, Math.abs(tp1 - entry) + risk);
    const first = ahead[0] && d(ahead[0]) < risk ? ahead[0] : null; // a level closer than 1R
    return { tp1, t1L, tp2, t2L, rr1: Math.abs(tp1 - entry) / risk, rr2: Math.abs(tp2 - entry) / risk, risk, first, oneR: entry + dir * risk, twoR: entry + dir * risk * 2 };
  }

  function tpForStopA(k, dir, entry, stop, style, givenEntry) {
    const g = k.g, side = dir > 0 ? 'buy' : 'sell';
    const s = suggestTargets(k, dir, entry, stop, style || 'day');
    const sc = scoreTrade(k, dir, style || 'day');
    const edge = adrEdge(k, dir);
    const fits = edge && edge.room > 0 && Math.abs(s.tp1 - g.price.bid) > edge.room ? ` <span class="warn">TP1 is beyond what's left of an average day (${f2(edge.room)}), so it may take more than today.</span>` : '';
    return reply(
      `For a ${side} from <b>${f2(entry)}</b>${givenEntry ? '' : ' (price now)'} with your stop at <b>${f2(stop)}</b> (risk ${f2(s.risk)}):<ul>` +
      `<li><span class="up">TP1</span> <b>${f2(s.tp1)}</b> — ${s.t1L ? `just in front of ${esc(s.t1L.name)}` : 'measured move'} · <b>${s.rr1.toFixed(1)}R</b></li>` +
      `<li><span class="up">TP2</span> <b>${f2(s.tp2)}</b> — ${s.t2L ? `just in front of ${esc(s.t2L.name)}` : 'measured move'} · <b>${s.rr2.toFixed(1)}R</b></li>` +
      `<li class="dim">1R = ${f2(s.oneR)} · 2R = ${f2(s.twoR)}</li></ul>` +
      (s.first ? `<span class="warn">${esc(s.first.name)} at ${f2(s.first.price)} is closer than 1R — price may react there first; consider partials.</span><br>` : '') +
      `Rules check: <b class="${sc.verdict.c}">${sc.verdict.w}</b>${fits}<br><span class="dim">Take partials at TP1 and move your stop to break-even. Not a guarantee — your call.</span>` + demoNote(g),
      `With your stop at ${sayPrice(stop)}${k.t}, I'd put the first take profit at ${sayPrice(s.tp1)}${s.t1L ? `, just in front of ${s.t1L.name}` : ''}, about ${s.rr1.toFixed(1)} R. Second target ${sayPrice(s.tp2)}, ${s.rr2.toFixed(1)} R. ${sc.verdict.s}.` + demoSay(g));
  }

  function tpA(k, dir, style) {
    const g = k.g;
    if (!dir) dir = g.bias.bias === 'Bullish' ? 1 : g.bias.bias === 'Bearish' ? -1 : 0;
    if (!dir) return reply(`Buy or sell${k.t}? The bias is neutral, so I can't pick a side for you. Try “if I sell, where should my TP be?”`, `Buy or sell${k.t}? The bias is neutral.`);
    const p = buildPlan(k, dir, style || 'day');
    return tpForStopA(k, dir, p.entry, p.stop, style || 'day', false);
  }

  // ---- paper trading ------------------------------------------------------------
  const QUESTION = /\b(should|would|could|can i|is it|is this|do i|good|safe|what|where|when|why|if|think|until|how)\b/;
  const FILLER = /^(?:(?:okay|ok|alright|all right|yes|yeah|yep|cool|then|so|and|now|please|go ahead and|go ahead|lets|let us|i want to|want to|can you|jarvis)\s+)+/;
  const BOTH_SIDES = /\b(buy|buying|long|longs)\b.*\b(or|and|vs|versus)\b.*\b(sell|selling|short|shorts)\b|\b(sell|selling|short|shorts)\b.*\b(or|and|vs|versus)\b.*\b(buy|buying|long|longs)\b/;
  function isOrder(text) {
    const t = text.replace(FILLER, '');
    if (QUESTION.test(t)) return false;
    if (BOTH_SIDES.test(t)) return false; // "buy or sell?" is a question, not an order
    return /^(?:paper\s+)?(?:(?:go|get)\s+)?(?:sell|buy|short|long)\b/.test(t) ||
      /^(?:open|place|enter|put on|put in|put|set up|set|leave|drop|throw|stick|execute|take|start|make|fire off|send|do|i want|give me|get me)\s+(?:in\s+)?(?:a|an|me a|the|one|another|my)?\s*(?:paper\s+)?(?:sell|buy|short|long)\b/.test(t) ||
      /\b(?:sell|buy) (?:limit |stop )?order\b.*\b(?:at|for|around)\s+\d{3,}/.test(t) ||
      /\bpaper (?:sell|buy|short|long)\b/.test(t);
  }
  function parseUnits(text) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(lots?|contracts?|units?|oz|ounces?)\b/);
    if (!m) return null;
    return /^lot/.test(m[2]) ? +m[1] * 100 : +m[1];
  }
  function parseEntryAt(text) {
    const re = /\bat\s*(\d{3,}(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(text))) {
      const before = text.slice(Math.max(0, m.index - 22), m.index);
      if (!/(stop|sl|tp|target|profit)\W*(\w+\W+){0,2}$/.test(before)) return +m[1];
    }
    return null;
  }
  function paperEventLine(e, T) {
    const t = T ? `, ${T}` : '';
    const side = e.side > 0 ? 'buy' : 'sell';
    const amt = (n) => `$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (e.type === 'tp') return { text: `We hit TP${t}! The ${side} from ${f2(e.entry)} closed at ${f2(e.exit)} — +${amt(e.pl)}.`, say: `We hit take profit${t}! The ${side} from ${sayPrice(e.entry)} closed for a ${money(Math.round(e.pl))} gain.` };
    if (e.type === 'stop') return { text: `Unfortunately${t}, we hit our stop loss on the ${side} from ${f2(e.entry)} — −${amt(e.pl)}. We'll learn from this one.`, say: `Unfortunately${t}, we did hit our stop loss on the ${side} from ${sayPrice(e.entry)}. Down ${money(Math.round(e.pl))}. We'll learn from this next time.` };
    if (e.type === 'stop_profit') return { text: `Our stop closed the ${side} from ${f2(e.entry)} in profit — +${amt(e.pl)}. Gains protected${t}.`, say: `Our stop closed the ${side} in profit${t}, up ${money(Math.round(e.pl))}. Gains protected.` };
    if (e.type === 'filled') return { text: `Our ${side} order filled at ${f2(e.entry)}${t}.`, say: `Our ${side} order filled at ${sayPrice(e.entry)}${t}.` };
    return { text: '', say: '' };
  }
  const usd = (n) => `${n < 0 ? '−' : n > 0 ? '+' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const plSpan = (n) => `<span class="${n >= 0 ? 'up' : 'down'}">${usd(n)}</span>`;

  function paperOrderA(k, text, dir, style) {
    const P = k.paper, g = k.g;
    if (!P) return reply('Paper trading isn\'t available here.');
    const st = style || 'day';
    const t = parseTrade(text);
    const entryAt = t.entry || parseEntryAt(text);
    const mkt = dir > 0 ? g.price.ask : g.price.bid;
    const pending = entryAt != null && Math.abs(entryAt - mkt) > 0.5;
    if (!pending && !k.market.open) {
      const m = marketLine(k);
      return reply(`Can't fill a market order right now${k.t} — ${m ? m.html : 'the market is closed.'} You can still place one at a price, e.g. “sell at 4015”.`, `I can't fill that right now${k.t}, the market is closed. You can place an order at a price instead.`);
    }
    const entry = pending ? entryAt : mkt;
    const side = dir > 0 ? 'buy' : 'sell';
    const noStop = /\b(no|without a?)\s*(stop|sl)\b/.test(text);
    let sl = t.stop, tp = t.target, autoBits = [];
    if (sl == null && !noStop) { const p = buildPlan(k, dir, st, entry); sl = p.stop; autoBits.push('stop'); }
    if (tp == null && sl != null) { tp = suggestTargets(k, dir, entry, sl, st).tp1; autoBits.push('take profit'); }
    if (sl != null && (dir > 0 ? sl >= entry : sl <= entry)) return reply(`<span class="warn">On a ${side}, the stop has to be ${dir > 0 ? 'below' : 'above'} the entry (${f2(entry)}). You said ${f2(sl)}.</span>`, `On a ${side} the stop has to be ${dir > 0 ? 'below' : 'above'} the entry${k.t}.`);
    if (tp != null && (dir > 0 ? tp <= entry : tp >= entry)) return reply(`<span class="warn">On a ${side}, the take profit has to be ${dir > 0 ? 'above' : 'below'} the entry (${f2(entry)}). You said ${f2(tp)}.</span>`, `On a ${side} the take profit has to be ${dir > 0 ? 'above' : 'below'} the entry${k.t}.`);
    // size: given units/lots, or risk-based (default 1% of the paper balance)
    const S = P.stats(g.price.bid, g.price.ask);
    let units = parseUnits(text), sizeNote = '';
    const riskPct = (text.match(/(\d+(?:\.\d+)?)\s*percent/) || [])[1];
    const riskUsd = (text.match(/risk(?:ing)?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)?/) || [])[1];
    if (!units) {
      const dollars = riskUsd && !riskPct ? +riskUsd : (S.balance * (riskPct ? +riskPct : k.riskPct)) / 100;
      units = sl != null ? Math.max(1, Math.floor(dollars / Math.abs(entry - sl))) : 10;
      sizeNote = sl != null ? ` (risking ${riskPct ? riskPct + '%' : riskUsd ? '$' + riskUsd : k.riskPct + '%'} of the paper account)` : '';
    }
    const res = P.place({ side: dir, units, entry: pending ? entry : null, sl, tp, bid: g.price.bid, ask: g.price.ask, auto: autoBits.length > 0, style: st });
    const pos = res.position || res.order;
    const risk = pos.sl != null ? Math.abs(pos.entry - pos.sl) * units : null;
    const reward = pos.tp != null ? Math.abs(pos.tp - pos.entry) * units : null;
    const sc = scoreTrade(k, dir, st);
    const rulesH = sc.score >= 2 ? `<span class="up">✓ Your rules back this ${side}.</span>` : sc.score >= 0 ? `<span class="warn">• Your rules are mixed on this ${side}.</span>` : `<span class="down">✕ Heads up — your rules are against this ${side}.</span>`;
    const rulesS = sc.score >= 2 ? `It's with your rules.` : sc.score >= 0 ? `Your rules are mixed on this one.` : `Heads up, your rules are against this ${side}.`;
    const what = res.order ? `${side.toUpperCase()} ${res.order.type.toUpperCase()} order: <b>${units.toLocaleString()} units</b> at <b>${f2(pos.entry)}</b> — fills if price gets there.` : `${dir > 0 ? 'Bought' : 'Sold'} <b>${units.toLocaleString()} units</b> (${(units / 100).toFixed(2)} lots) of gold at <b>${f2(pos.entry)}</b>${sizeNote}.`;
    const lines = [
      `<b>Done${k.t}.</b> ${what}`,
      pos.sl != null ? `Stop <b>${f2(pos.sl)}</b> (risk ${usd(-risk)})${autoBits.includes('stop') ? ' <span class="dim">— my pick, from structure</span>' : ''}` : '<span class="warn">No stop loss on this one.</span>',
      pos.tp != null ? `Take profit <b>${f2(pos.tp)}</b> (${usd(reward)}${risk ? `, ${(reward / risk).toFixed(1)}R` : ''})${autoBits.includes('take profit') ? ' <span class="dim">— my pick</span>' : ''}` : '',
      rulesH,
      '<span class="dim">Paper trade — pretend money, nothing sent to OANDA. Say “move my stop to break even” or “close my trade” anytime.</span>',
    ].filter(Boolean);
    const say = res.order
      ? `Done${k.t}. ${side} order placed at ${sayPrice(pos.entry)} for ${units} units. Stop ${pos.sl != null ? sayPrice(pos.sl) : 'none'}, take profit ${pos.tp != null ? sayPrice(pos.tp) : 'none'}. ${rulesS}`
      : `Done${k.t}. ${dir > 0 ? 'Bought' : 'Sold'} ${units} units at ${sayPrice(pos.entry)}. Stop at ${pos.sl != null ? sayPrice(pos.sl) : 'none'}${pos.tp != null ? `, take profit at ${sayPrice(pos.tp)}` : ''}${autoBits.length ? ', my picks' : ''}. ${rulesS} I'll let you know when it's hit.`;
    return reply(lines.join('<br>') + demoNote(g), say + demoSay(g));
  }

  function pickPositions(k, text) {
    const P = k.paper, list = P.positions();
    if (/\b(all|everything|every)\b/.test(text)) return list;
    const sideF = /\b(sell|short)s?\b/.test(text) ? -1 : /\b(buy|long)s?\b/.test(text) ? 1 : 0;
    const f = sideF ? list.filter((p) => p.side === sideF) : list;
    return f;
  }
  function paperCloseA(k, text) {
    const P = k.paper, g = k.g;
    const list = pickPositions(k, text);
    if (!list.length) return reply(`No open paper trades to close${k.t}.`);
    if (!k.market.open) return reply(`The market's closed${k.t}, so I can't close at a fair price right now. Your stop and take profit stay in place.`);
    const done = list.map((p) => P.closeOne(p.id, g.price.bid, g.price.ask)).filter(Boolean);
    const total = done.reduce((a, h) => a + h.pl, 0);
    const S = P.stats(g.price.bid, g.price.ask);
    const tone = total > 0 ? pick('cl-w', [`Nice work${k.t}.`, `Banked${k.t}.`, `Profit secured${k.t}.`]) : total < 0 ? pick('cl-l', [`Small loss${k.t} — cutting it was discipline.`, `Closed for a loss${k.t}. Next one.`]) : `Closed flat${k.t}.`;
    return reply(`${tone} Closed ${done.length} trade${done.length > 1 ? 's' : ''}:<ul>${done.map((h) => `<li>${h.side > 0 ? 'BUY' : 'SELL'} ${h.units} @ ${f2(h.entry)} → ${f2(h.exit)} ${plSpan(h.pl)}</li>`).join('')}</ul>Paper balance <b>$${f2(S.balance)}</b>.`,
      `${tone} Closed ${done.length > 1 ? `${done.length} trades` : 'the trade'} for ${total >= 0 ? 'a gain of' : 'a loss of'} ${money(Math.round(total))}. Paper balance is ${money(Math.round(S.balance))}.`);
  }
  function paperModifyA(k, text) {
    const P = k.paper;
    const pos = pickPositions(k, text), ords = P.orders();
    const p = /\border\b/.test(text) ? ords[ords.length - 1] || pos[pos.length - 1] : pos[pos.length - 1] || ords[ords.length - 1];
    if (!p) return reply(`There's no open paper trade to adjust${k.t}. Say “sell now” or “buy at 4000, stop 3990” to open one.`);
    const t = parseTrade(text);
    const be = /\bbreak ?even\b|\bbe\b/.test(text);
    const ch = {};
    if (be && /\b(stop|sl)\b/.test(text)) ch.sl = p.entry;
    else if (t.stop != null) ch.sl = t.stop;
    if (t.target != null) ch.tp = t.target;
    if (!('sl' in ch) && !('tp' in ch)) {
      const n = (text.match(/\d{3,}(?:\.\d+)?/) || [])[0];
      if (n && /\b(stop|sl)\b/.test(text)) ch.sl = +n; else if (n) ch.tp = +n;
    }
    const side = p.side > 0 ? 'buy' : 'sell';
    const pending = ords.includes(p);
    const live = pending ? p.entry : p.side > 0 ? k.g.price.bid : k.g.price.ask; // pending order: check against its entry
    if ('sl' in ch && (p.side > 0 ? ch.sl >= live : ch.sl <= live)) return reply(`<span class="warn">That stop (${f2(ch.sl)}) is already past the ${pending ? "order price" : "current price"} (${f2(live)}) — it would close the ${side} instantly.</span> Say “close my trade” if that's what you want.`, `That stop is already past the price${k.t}. Say close my trade if you want out.`);
    if ('tp' in ch && (p.side > 0 ? ch.tp <= live : ch.tp >= live)) return reply(`<span class="warn">That take profit (${f2(ch.tp)}) is already past the ${pending ? "order price" : "current price"} (${f2(live)}).</span> Say “close my trade” to bank it now.`, `That take profit is already past the price${k.t}. Say close my trade to bank it.`);
    P.modify(p.id, ch);
    const parts = [];
    if ('sl' in ch) parts.push(`stop → <b>${f2(ch.sl)}</b>${be ? ' (break-even)' : ''}`);
    if ('tp' in ch) parts.push(`take profit → <b>${f2(ch.tp)}</b>`);
    return reply(`Done${k.t}. ${side.toUpperCase()} from ${f2(p.entry)}: ${parts.join(', ')}.${be ? ' Risk-free now.' : ''}`,
      `Done${k.t}. ${'sl' in ch ? `Stop moved to ${be ? 'break even' : sayPrice(ch.sl)}. ` : ''}${'tp' in ch ? `Take profit moved to ${sayPrice(ch.tp)}.` : ''}${be ? ' The trade is risk free now.' : ''}`);
  }
  function paperStatusA(k) {
    const P = k.paper, g = k.g;
    const S = P.stats(g.price.bid, g.price.ask);
    const pos = P.positions(), ord = P.orders(), hist = P.history().slice(0, 5);
    const rows = pos.map((p) => {
      const pl = P.pnlAt(p, P.closePx(p, g.price.bid, g.price.ask));
      const toTp = p.tp != null ? Math.abs(p.tp - P.closePx(p, g.price.bid, g.price.ask)) : null, toSl = p.sl != null ? Math.abs(p.sl - P.closePx(p, g.price.bid, g.price.ask)) : null;
      return `<li><b class="${p.side > 0 ? 'up' : 'down'}">${p.side > 0 ? 'BUY' : 'SELL'}</b> ${p.units} @ ${f2(p.entry)} · SL ${p.sl != null ? f2(p.sl) : '—'} · TP ${p.tp != null ? f2(p.tp) : '—'} → ${plSpan(pl)} <span class="dim">${toTp != null ? `(${f2(toTp)} to TP` : '('}${toSl != null ? `, ${f2(toSl)} to SL)` : ')'}</span></li>`;
    }).join('');
    const say = [];
    if (pos.length) {
      const tot = S.openPL;
      say.push(tot > 0 ? pick('ps-up', [`We're in profit${k.t}, up ${money(Math.round(tot))}.`, `Looking good${k.t}. Up ${money(Math.round(tot))}.`]) : tot < 0 ? `We're down ${money(Math.round(tot))} right now${k.t}. Stop's in place.` : `We're flat${k.t}.`);
      const p = pos[pos.length - 1];
      if (p.tp != null) say.push(`${money(Math.round(Math.abs(p.tp - P.closePx(p, g.price.bid, g.price.ask))))} to take profit.`);
    } else say.push(`No open paper trades${k.t}.`);
    if (ord.length) say.push(`${ord.length} order${ord.length > 1 ? 's' : ''} waiting to fill.`);
    say.push(`Paper balance ${money(Math.round(S.balance))}${S.winRate != null ? `, win rate ${S.winRate} percent` : ''}.`);
    return reply(
      `<b>Paper account</b> · balance <b>$${f2(S.balance)}</b> · equity $${f2(S.equity)} · open ${plSpan(S.openPL)} · since start ${plSpan(S.realized)}${S.winRate != null ? ` · win rate ${S.winRate}% (${S.wins}W/${S.losses}L)` : ''}` +
      (pos.length ? `<ul>${rows}</ul>` : '<br>No open trades.') +
      (ord.length ? `Waiting to fill:<ul>${ord.map((o) => `<li>${o.side > 0 ? 'BUY' : 'SELL'} ${o.type.toUpperCase()} ${o.units} @ ${f2(o.entry)}</li>`).join('')}</ul>` : '') +
      (hist.length ? `<span class="dim">Recent: ${hist.map((h) => `${h.side > 0 ? 'B' : 'S'} ${plSpan(h.pl)}`).join(' · ')}</span>` : ''),
      say.join(' '));
  }
  function paperResetA(k, text) {
    const P = k.paper;
    const m = text.match(/(\d+(?:\.\d+)?)\s*(k|thousand|grand|m|million)?\b/);
    let n = m ? +m[1] : null;
    if (m && /^(k|thousand|grand)$/.test(m[2] || '')) n *= 1000;
    if (m && /^(m|million)$/.test(m[2] || '')) n *= 1e6;
    if (n != null && n < 100) return reply(`That's a bit small for an account${k.t}. Try “set my paper balance to 50,000”.`);
    const b = P.reset(n);
    return reply(`Paper account reset to <b>$${b.toLocaleString()}</b>${k.t}. Clean slate — all paper trades and history cleared.`, `Paper account reset to ${b.toLocaleString()} dollars${k.t}. Clean slate.`);
  }
  function paperCancelA(k) {
    const n = k.paper.cancel(null);
    return reply(n ? `Cancelled ${n} pending order${n > 1 ? 's' : ''}${k.t}.` : `No pending orders${k.t}.`);
  }
  function paperGreeting(k) {
    const P = k.paper;
    if (!P) return null;
    const ev = P.unseen().filter((e) => e.type !== 'filled' || true);
    const out = [], says = [];
    for (const e of ev.slice(-3)) { const l = paperEventLine(e, k.T); if (l.text) { out.push(l.text); says.push(l.say); } }
    P.markSeen();
    if (k.g && P.positions().length) {
      const S = P.stats(k.g.price.bid, k.g.price.ask);
      out.push(`Open paper P/L: ${usd(S.openPL)} on ${P.positions().length} trade${P.positions().length > 1 ? 's' : ''}.`);
      says.push(S.openPL >= 0 ? `Our paper trade is up ${money(Math.round(S.openPL))}.` : `Our paper trade is down ${money(Math.round(S.openPL))}.`);
    }
    if (!out.length) return null;
    return { html: ` ${ev.length ? '<b>While you were away:</b> ' : ''}${out.join(' ')}`, say: ` ${says.join(' ')}` };
  }

  // ---- reminders ---------------------------------------------------------------------
  function remWhen(k, r, spoken) {
    if (r.due == null) return 'next time you open the app';
    if (r.repeat) return `${r.repeat.label} at ${sayT(r.due, k.tz)} (next: ${fmtT(r.due, k.tz, true)})`.replace(/ \(next.*$/, spoken ? '' : '$&');
    const ms = r.due - k.now, tmr = new Intl.DateTimeFormat('en-CA', { timeZone: k.tz }).format(new Date(r.due)) !== new Intl.DateTimeFormat('en-CA', { timeZone: k.tz }).format(new Date(k.now));
    const clock = fmtT(r.due, k.tz, tmr && ms > 864e5) + (spoken ? '' : '');
    if (ms < 3 * 3600e3) return spoken ? `in ${words(ms)}` : `in ${words(ms)} (${clock})`;
    return `${tmr ? (ms < 2 * 864e5 ? 'tomorrow ' : '') : 'today '}at ${clock}`;
  }
  function remindAddA(k, raw) {
    const R = k.reminders;
    if (!R) return reply(`Reminders aren't available here${k.t}.`);
    const r = R.add(raw, k.now, k.tz);
    if (!r) return reply(`What should I remind you about${k.t}? Try “remind me in an hour to check gold” or “next time I open the app, remind me to do the dishes”.`, `What should I remind you about${k.t}?`);
    const n = R.all().length;
    return reply(`Got it${k.t}. Reminder set for <b>${remWhen(k, r)}</b>: <b>${esc(cap1(r.text))}</b>.${n > 1 ? ` <span class="dim">(${n} reminders saved — say “my reminders”.)</span>` : ''}`,
      `Got it${k.t}. I'll remind you ${remWhen(k, r, true)}: ${r.text}.`);
  }
  function remindListA(k) {
    const R = k.reminders, L = R ? R.all() : [];
    if (!L.length) return reply(`No reminders saved${k.t}. Say “remind me in 30 minutes to …” to add one.`);
    return reply(`Your reminders${k.t}:<ol>${L.map((r) => `<li><b>${esc(cap1(r.text))}</b> <span class="dim">— ${remWhen(k, r)}</span></li>`).join('')}</ol><span class="dim">Say “delete reminder 2” or “clear my reminders”.</span>`,
      `You have ${L.length} reminder${L.length > 1 ? 's' : ''}${k.t}: ${L.map((r) => `${r.text}, ${remWhen(k, r, true)}`).join('. ')}.`);
  }
  function remindClearA(k, text) {
    const R = k.reminders;
    if (!R) return reply(`Reminders aren't available here${k.t}.`);
    const L = R.all();
    const num = text.match(/\b(?:reminder|number|no)\s*(\d{1,2})\b|\b(\d{1,2})(?:st|nd|rd|th)? reminder\b/);
    const ord = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, last: L.length }[(text.match(/\b(first|second|third|fourth|fifth|last)\b/) || [])[1]];
    const idx = num ? +(num[1] || num[2]) : ord;
    if (idx) {
      const r = L[idx - 1];
      if (!r) return reply(`There's no reminder number ${idx}${k.t}. You have ${L.length}.`);
      R.remove(r.text);
      return reply(`Deleted${k.t}: <b>${esc(cap1(r.text))}</b>.`, `Deleted the reminder to ${r.text}.`);
    }
    const kw = text.replace(/\b(clear|delete|remove|cancel|erase|scratch|my|the|all|reminders?|about|for|to|please|jarvis|of|that|this|one)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (kw && !/\ball\b/.test(text)) {
      const n = R.remove(kw);
      if (n) return reply(`Deleted ${n} reminder${n > 1 ? 's' : ''} about “${esc(kw)}”${k.t}.`);
    }
    const n = R.remove(null);
    return reply(n ? `Cleared ${n} reminder${n > 1 ? 's' : ''}${k.t}.` : `No reminders to clear${k.t}.`);
  }

  // ---- free time, workout plan, challenges ---------------------------------------------
  const CHALLENGES = [
    '100 push-ups today — as many sets as you need.', '5 minutes of plank in total — break it up however you want.', '200 bodyweight squats before the end of the day.',
    '50 burpees for time. Write the time down and beat it next week.', '10,000 steps before 8 PM.', 'Wall sit: 3 rounds of 1 minute, 1 minute rest between.',
    'Run one mile as fast as you can. That\'s your number to beat.', 'Drink a gallon of water today.', 'No phone for the first hour after you wake up tomorrow.',
    '2-minute cold shower. Mind over body.', '30 days: start at 10 push-ups and add 5 every day.', 'Stretch for 10 minutes before bed tonight.',
    '7 rounds: 10 push-ups, 15 squats, 20 mountain climbers. Rest 1 minute between rounds.', 'Hold a dead hang from a bar for as long as you can, 3 times.',
  ];
  function workoutChallengeA(k) {
    const c = pick('chal', CHALLENGES);
    return reply(`Challenge for you${k.t}: <b>${c}</b><br><span class="dim">Tell me when it's done. Warm up first and drink water.</span>`, `Here's your challenge${k.t}: ${c}`);
  }
  function workoutPlanA(k, text) {
    const home = /\b(home|no gym|no equipment|bodyweight|body weight)\b/.test(text);
    const plan = home ? [['Monday', 'Push-ups 5×max, pike push-ups 3×10, dips on a chair 3×12'], ['Tuesday', '20-min run or brisk walk + core (plank 3×60s)'], ['Wednesday', 'Squats 4×20, lunges 3×12 each, glute bridges 3×15'], ['Thursday', 'HIIT 20 min: burpees, mountain climbers, jump squats (40s on / 20s off)'], ['Friday', 'Full body circuit ×4: 15 push-ups, 20 squats, 10 burpees, 30s plank'], ['Saturday', 'Long walk, hike or a sport'], ['Sunday', 'Rest + 15 minutes of stretching']]
      : [['Monday', 'Push — bench, overhead press, incline DB press, triceps'], ['Tuesday', 'Pull — pull-ups, rows, lat pulldown, biceps'], ['Wednesday', 'Legs — squats, Romanian deadlifts, lunges, calves'], ['Thursday', 'Cardio — 30-min run or HIIT + core'], ['Friday', 'Upper body — bench, rows, shoulders, arms'], ['Saturday', 'Legs light + long walk or a sport'], ['Sunday', 'Rest + stretch / foam roll']];
    return reply(`Here's a week${home ? ' you can do at home' : ' at the gym'}${k.t}:<ul>${plan.map(([d, w]) => `<li>${d === k.weekday ? '<b>▶ ' : ''}${d}${d === k.weekday ? ' (today)</b>' : ''}: ${w}</li>`).join('')}</ul><span class="dim">Train after the London/New York session so it doesn't clash with your best trading hours. Say “give me a workout” for today's full routine${home ? '' : ', or “workout plan at home” for no equipment'}.</span>`,
      `Here's your week${k.t}. Today, ${k.weekday}, is ${(plan.find(([d]) => d === k.weekday) || plan[0])[1].split(' — ')[0].split(',')[0]}. The full plan is on screen.`);
  }
  function freetimeA(k) {
    const w = typeof Weather !== 'undefined' && Weather.cached();
    const temp = w ? Math.round(w.d.current.temperature_2m) : null, wet = w && Weather.wet(w.d.current.weather_code);
    const late = k.hour >= 22 || k.hour < 5, wo = pick('ft-wo', WORKOUTS);
    const opts = [];
    if (late) opts.push('<b>Sleep</b> — best thing you can do for tomorrow\'s session.');
    else {
      opts.push(`<b>Train</b> — ${lc(wo.name)}. Say “give me a workout” or “give me a challenge”.`);
      if (w && !wet && temp >= 50 && temp <= 88) opts.push(`<b>Get outside</b> — it's ${temp}° and ${Weather.word(w.d.current.weather_code)}. Walk, run, or sit in the sun.`);
      else if (w) opts.push(`<b>Stay in and reset</b> — it's ${temp}° and ${Weather.word(w.d.current.weather_code)} out. Read, stretch, or cook something good.`);
    }
    const pool = ['<b>Knock out a chore</b> — dishes, laundry, clean your space. Clear room, clear head.', '<b>Study one setup</b> — backtest it for 30 minutes on old charts.', '<b>Review your trades</b> — say “weekly report”.',
      '<b>Read 20 pages</b> of something that makes you better.', '<b>Call someone</b> you haven\'t talked to in a while.', '<b>Cook a proper meal</b> and drink some water.', '<b>Plan tomorrow</b> — mark the levels and check the news calendar.', '<b>Rest</b> — no screens for an hour. You earned it.'];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    opts.push(...pool.slice(0, 5 - opts.length));
    const R = k.reminders && k.reminders.all();
    if (R && R.length) opts.unshift(`<b>Your reminders</b> — ${R.slice(0, 3).map((r) => esc(r.text)).join(', ')}.`);
    const open = pick('ft', [`Good call${k.t} — not trading is a position too.`, `Fair enough${k.t}. Time away from the charts is part of the job.`, `Smart${k.t}. No forced trades.`]);
    return reply(`${open} Here's what I'd do:<ol>${opts.slice(0, 5).map((o) => `<li>${o}</li>`).join('')}</ol>`, `${open} ${opts.slice(0, 3).map((o) => o.replace(/<[^>]+>/g, '').split(' — ')[0]).join(', ')}. More on screen.`);
  }

  // ---- weekly paper report ----------------------------------------------------------
  // Week = Sunday 00:00 New York time (gold reopens Sunday evening).
  function weekStart(ts) {
    const p = Sessions.parts(new Date(ts), 'America/New_York');
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(new Date(ts)));
    return ts - ((dow * 24 + p.h) * 60 + p.mi) * 60000 - (new Date(ts).getSeconds() * 1000 + new Date(ts).getMilliseconds());
  }
  function sessionOf(ts) {
    const h = Sessions.parts(new Date(ts), 'America/New_York').h;
    return h >= 8 && h < 17 ? 'New York' : h >= 3 && h < 8 ? 'London' : 'Asia';
  }
  function weekStats(k, last) {
    const ws = weekStart(k.now), from = last ? ws - 7 * 864e5 : ws, to = last ? ws : Infinity;
    const list = k.paper.history().filter((h) => h.closedAt >= from && h.closedAt < to);
    const net = Math.round(list.reduce((a, h) => a + h.pl, 0) * 100) / 100;
    const wins = list.filter((h) => h.pl > 0), losses = list.filter((h) => h.pl < 0);
    const by = {};
    for (const h of list) { const s = sessionOf(h.openedAt || h.closedAt); by[s] = by[s] || { n: 0, w: 0, pl: 0 }; by[s].n++; if (h.pl > 0) by[s].w++; by[s].pl += h.pl; }
    const best = list.reduce((a, h) => (!a || h.pl > a.pl ? h : a), null), worst = list.reduce((a, h) => (!a || h.pl < a.pl ? h : a), null);
    const tps = list.filter((h) => h.reason === 'tp').length, sls = list.filter((h) => /^stop/.test(h.reason)).length;
    return { list, net, wins: wins.length, losses: losses.length, by, best, worst, tps, sls, from };
  }
  function weeklyA(k, text) {
    if (!k.paper) return reply(`Paper trading isn't available${k.t}.`);
    const last = /\b(last|previous|past) week\b/.test(text);
    const W = weekStats(k, last), when = last ? 'last week' : 'this week';
    const open = k.g && k.paper.positions().length ? k.paper.stats(k.g.price.bid, k.g.price.ask).openPL : null;
    if (!W.list.length) {
      const o = open != null ? ` You do have an open trade, currently ${usd(open)}.` : '';
      return reply(`No paper trades closed ${when}${k.t}.${o} Say “sell now” or “buy now” to start one.`, `No paper trades closed ${when}${k.t}.${o ? ` You have an open trade, ${open >= 0 ? 'up' : 'down'} ${money(Math.round(Math.abs(open)))}.` : ''}`);
    }
    const n = W.list.length, wr = Math.round((W.wins / n) * 100);
    const lines = [];
    lines.push(`<b>Paper report — ${when}</b>`);
    lines.push(`Trades: <b>${n}</b> · Wins <b>${W.wins}</b> · Losses <b>${W.losses}</b> · Win rate <b>${wr}%</b>`);
    lines.push(`Net result: <b class="${W.net >= 0 ? 'up' : 'down'}">${usd(W.net)}</b>${W.tps + W.sls ? ` (${W.tps} hit take profit, ${W.sls} hit stop loss)` : ''}`);
    const sess = Object.entries(W.by).sort((a, b) => b[1].pl - a[1].pl);
    lines.push('By session: ' + sess.map(([s, v]) => `${s} ${v.n} trade${v.n > 1 ? 's' : ''}, ${usd(Math.round(v.pl * 100) / 100)}`).join(' · '));
    if (W.best && W.best.pl > 0) lines.push(`Best trade: ${W.best.side > 0 ? 'buy' : 'sell'} from ${f2(W.best.entry)}, ${usd(W.best.pl)}`);
    if (W.worst && W.worst.pl < 0) lines.push(`Worst trade: ${W.worst.side > 0 ? 'buy' : 'sell'} from ${f2(W.worst.entry)}, ${usd(W.worst.pl)}`);
    if (open != null) lines.push(`Still open: ${usd(open)}`);
    // one plain coaching note
    let tip = '';
    const worstS = sess[sess.length - 1];
    if (sess.length > 1 && worstS[1].pl < 0 && worstS[1].n >= 2) tip = `Most of the damage came in the ${worstS[0]} session — maybe sit that one out next week.`;
    else if (wr >= 60 && W.net > 0) tip = `Solid week${k.t}. Keep doing what you're doing.`;
    else if (W.net > 0) tip = `Green week, even with more misses than wins — your winners are paying for your losers. That's good risk management.`;
    else if (W.losses > W.wins) tip = `Rough week${k.t}. We'll learn from it — fewer, cleaner trades with the bias next week.`;
    else tip = `Close to flat${k.t}. Patience — the good setups will come.`;
    lines.push(tip);
    const say = `${when[0].toUpperCase() + when.slice(1)} we took ${n} paper trade${n > 1 ? 's' : ''}: ${W.wins} win${W.wins === 1 ? '' : 's'} and ${W.losses} loss${W.losses === 1 ? '' : 'es'}, ${W.net >= 0 ? 'up' : 'down'} ${money(Math.round(Math.abs(W.net)))}. ${sess.length ? `Best session was ${sess[0][0]}.` : ''} ${tip}`;
    return reply(lines.join('<br>'), say);
  }
  // Short line on the first weekend open: once per week
  function weeklyTeaser(k) {
    if (!k.paper) return null;
    const W = weekStats(k, false);
    if (!W.list.length) return null;
    const seen = seenGet();
    if (seen.weekly === W.from) return null;
    seen.weekly = W.from; seenSet(seen);
    const t = `This week: ${W.list.length} paper trade${W.list.length > 1 ? 's' : ''}, ${W.wins} win${W.wins === 1 ? '' : 's'}, ${usd(W.net)}. Say “weekly report” for the full breakdown.`;
    return { html: t, say: `This week we were ${W.net >= 0 ? 'up' : 'down'} ${money(Math.round(Math.abs(W.net)))} on paper. Ask for the weekly report for the full breakdown.` };
  }

  // ---- weather, day plans, workouts -----------------------------------------------
  function weatherA(k, w, text) {
    const d = w.d, c = d.current, dl = d.daily;
    const tmr = /tomorrow/.test(text) ? 1 : 0;
    const code = tmr ? dl.weather_code[1] : c.weather_code;
    const hi = Math.round(dl.temperature_2m_max[tmr]), lo = Math.round(dl.temperature_2m_min[tmr]), rain = dl.precipitation_probability_max[tmr];
    let tip;
    if (Weather.wet(code) || rain >= 60) tip = pick('wx-w', ['Indoor workout kind of day.', 'Grab an umbrella if you head out.', 'Good day for the gym over a run.']);
    else if (hi >= 88) tip = pick('wx-h', ['Hot one — stay hydrated.', 'Drink plenty of water today.']);
    else if (hi <= 40) tip = pick('wx-c', ['Dress warm.', 'Cold one — layer up.']);
    else tip = pick('wx-n', ['Nice day for an outdoor run.', 'Good weather to get outside for a bit.', 'Decent day for a walk between sessions.']);
    if (tmr) return reply(`Tomorrow in ${esc(w.place)}: <b>${Weather.word(code)}</b>, high <b>${hi}°</b>, low ${lo}°, ${rain}% chance of rain. ${tip}`,
      `Tomorrow in ${w.place}: ${Weather.word(code)}, a high of ${hi} and a low of ${lo}, ${rain} percent chance of rain${k.t}. ${tip}`);
    const now = Math.round(c.temperature_2m), feels = Math.round(c.apparent_temperature);
    return reply(`It's <b>${now}°F</b> and <b>${Weather.word(code)}</b> in ${esc(w.place)}${Math.abs(feels - now) >= 3 ? ` (feels like ${feels}°)` : ''}. Today: high ${hi}°, low ${lo}°, ${rain}% chance of rain, wind ${Math.round(c.wind_speed_10m)} mph. ${tip}`,
      `It's ${now} degrees and ${Weather.word(code)} in ${w.place}${k.t}${Math.abs(feels - now) >= 3 ? `, feels like ${feels}` : ''}. High of ${hi} today, ${rain} percent chance of rain. ${tip}`);
  }

  const WORKOUTS = [
    { name: 'Push day', items: ['Bench press 4×8', 'Overhead press 3×10', 'Incline dumbbell press 3×10', 'Lateral raises 3×15', 'Tricep dips 3× to failure'] },
    { name: 'Pull day', items: ['Pull-ups 4× max', 'Barbell rows 4×8', 'Lat pulldown 3×12', 'Face pulls 3×15', 'Bicep curls 3×12'] },
    { name: 'Leg day', items: ['Squats 4×8', 'Romanian deadlifts 3×10', 'Walking lunges 3×12 each leg', 'Leg press 3×12', 'Calf raises 4×15'] },
    { name: 'HIIT — 20 minutes', items: ['40s on / 20s off, 4 rounds of:', 'Burpees', 'Mountain climbers', 'Jump squats', 'Push-ups', 'High knees'] },
    { name: 'Run', items: ['5-minute easy warm-up', '20–30 minutes at a steady pace (or a 5K)', '5-minute cool-down walk', 'Stretch hamstrings, calves, hips'] },
    { name: 'Full body', items: ['Deadlifts 4×5', 'Push-ups 3×15', 'Goblet squats 3×12', 'Dumbbell rows 3×10 each arm', 'Plank 3×45s'] },
    { name: 'Core & mobility', items: ['Plank 3×60s', 'Dead bugs 3×12', 'Russian twists 3×20', 'Hip flexor + hamstring stretch 5 min', 'Foam roll 5 min'] },
  ];
  function workoutA(k) {
    const w = pick('wo', WORKOUTS);
    return reply(`<b>${w.name}</b>${k.t}:<ul>${w.items.map((i) => `<li>${i}</li>`).join('')}</ul><span class="dim">Warm up first, and drink water.</span>`,
      `How about ${lc(w.name)}${k.t}? ${w.items.slice(0, 3).join(', ')}, and more on screen. Warm up first, and drink water.`);
  }

  function dayPlanA(k) {
    const m = k.market, g = k.g, w = typeof Weather !== 'undefined' && Weather.cached();
    const wet = w && (Weather.wet(w.d.current.weather_code) || w.d.daily.precipitation_probability_max[0] >= 60);
    const wo = pick('dp-wo', WORKOUTS);
    const opts = [];
    const mins = k.hour * 60 + k.mi;
    if (m.state === 'weekend') {
      opts.push(`<b>Train</b> — ${lc(wo.name)}${wet ? ' (indoors, it\'s wet out)' : ''}. Say “give me a workout” for the full routine.`);
      opts.push('<b>Review the week</b> — go through your trades: what worked, what didn\'t.');
      opts.push(m.weekday === 0 ? '<b>Prep for the week</b> — mark next week\'s levels and check the news calendar tonight.' : '<b>Recharge</b> — get outside, see people, sleep properly.');
      opts.push('<b>Meal prep + water</b> — set up the week so you\'re not thinking about food at the open.');
    } else {
      if (m.open && mins < 11 * 60 + 30) opts.push(`<b>Trade the window</b> — ${mins < 3 * 60 ? 'London opens at 3 AM' : 'you\'re in the prime window until about 11:30 AM'}. Bias is ${g ? `<b class="${cls(g.bias.bias)}">${g.bias.bias.toUpperCase()}</b>` : 'loading'}, so ${g && g.bias.bias !== 'Neutral' ? `look for ${g.bias.bias === 'Bullish' ? 'buys' : 'sells'}` : 'be patient'}.`);
      else if (m.open) opts.push('<b>Done trading for the day</b> — the best window has passed. Review instead of forcing trades.');
      const N = k.news, day = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: k.tz }).format(new Date(ms));
      const red = N && N.ok() ? N.relevant().filter((e) => N.isHigh(e) && e.at > k.now && day(e.at) === day(k.now)) : [];
      if (red.length) opts.push(`<b>Mind the news</b> — ${red.map((e) => `${esc(e.title)} at ${fmtT(e.at, k.tz, false)}`).join(', ')}. Be flat or protected before it.`);
      opts.push(`<b>Train</b> — ${lc(wo.name)}${mins < 12 * 60 ? ' after the session' : ''}${wet ? ' (indoors, it\'s wet out)' : ''}.`);
      opts.push('<b>Journal</b> — 10 minutes on today\'s trades and how you felt.');
      opts.push('<b>Drink water and get to bed on time</b> — tomorrow\'s session starts early.');
    }
    if (k.paper && k.paper.busy()) opts.unshift('<b>Check the paper trade</b> — say “how’s my paper trade?”.');
    const sp = specialLines(k, { soon: false });
    return reply(`${sp.length ? sp.join(' ') + '<br>' : ''}Here's what I'd do today${k.t}:<ol>${opts.slice(0, 5).map((o) => `<li>${o}</li>`).join('')}</ol>`,
      noEmoji(`${sp.join(' ')} Here's what I'd do today${k.t}. ${opts.slice(0, 3).map((o) => o.replace(/<[^>]+>/g, '').split(' — ')[0]).join('. ')}. More on screen.`));
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

  // ---- special days & personality ----------------------------------------------
  const JARVIS_BORN = { y: 2026, m: 11, d: 11 }; // the day JARVIS first came online
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const noEmoji = (s) => s.replace(/\p{Extended_Pictographic}️?/gu, '').replace(/\s+/g, ' ').trim();
  function birthdayOf(k) {
    const m = /^(\d{1,2})[-/](\d{1,2})$/.exec(String(k.birthday || '').trim());
    return m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31 ? { m: +m[1], d: +m[2] } : null;
  }
  function daysUntil(k, md) {
    const today = Date.UTC(k.y, k.m - 1, k.d);
    let t = Date.UTC(k.y, md.m - 1, md.d);
    if (t < today) t = Date.UTC(k.y + 1, md.m - 1, md.d);
    return Math.round((t - today) / 864e5);
  }
  function thanksgivingDay(y) { const wd = new Date(Date.UTC(y, 10, 1)).getUTCDay(); return 1 + ((4 - wd + 7) % 7) + 21; }
  // Lines for today's date: birthdays, new month, holidays. Returns [] on a normal day.
  // Remembers what JARVIS already said (so the greeting doesn't repeat itself)
  const SEEN_KEY = 'jarvis.seen';
  function seenGet() { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; } }
  function seenSet(v) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch {} }
  function specialLines(k, { soon = true, once = true } = {}) {
    const out = [];
    const seen = seenGet(), day = `${k.y}-${k.m}-${k.d}`;
    seen.lines = seen.lines || {};
    const add = (id, line) => { if (once && seen.lines[id] === day) return; seen.lines[id] = day; out.push(line); };
    const b = birthdayOf(k);
    if (b) {
      const n = daysUntil(k, b);
      if (n === 0) add('bday', pick('bday', [`Happy birthday${k.t}! 🎂 Another year stronger — take it easy on yourself today.`, `Happy birthday${k.t}! 🎉 Hope today's a great one, on and off the charts.`, `Happy birthday${k.t}! 🎂 No revenge trades today — it's your day.`]));
      else if (soon && n <= 7) add('bdaysoon', `By the way${k.t}, your birthday is ${n === 1 ? 'tomorrow' : `in ${n} days`}. 🎂`);
    }
    if (k.m === JARVIS_BORN.m && k.d === JARVIS_BORN.d) {
      const age = k.y - JARVIS_BORN.y;
      add('jborn', age > 0 ? `Also — today is my birthday. ${age} year${age > 1 ? 's' : ''} online.` : `Fun fact: today is the day I first came online.`);
    }
    const mon = MONTHS[k.m - 1];
    const ym = `${k.y}-${k.m}`;
    if (k.d <= 7 && (once ? seen.month !== ym : k.d === 1)) {
      seen.month = ym;
      out.push(k.d === 1 ? pick('month1', [`Hey${k.t}, it's ${mon} 1st — a new month. New month, new things.`, `It's the 1st of ${mon}${k.t}. Fresh month, clean slate.`, `${mon} 1st${k.t} — new month, new opportunities. Let's make it count.`])
        : pick('month', [`New month${k.t} — welcome to ${mon}. New month, new things.`, `Welcome to ${mon}${k.t}. Fresh month, clean slate.`]));
    }
    if (k.m === 1 && k.d === 1) add('hol', `Happy New Year${k.t}! 🎆`);
    if (k.m === 12 && k.d === 31) add('hol', `Last day of the year${k.t}. Thin markets — and a good night to celebrate.`);
    if (k.m === 12 && k.d === 25) add('hol', `Merry Christmas${k.t}! 🎄 Markets are mostly closed — enjoy the day.`);
    if (k.m === 12 && k.d === 24) add('hol', `Christmas Eve${k.t} — markets close early and it's thin. Easy does it.`);
    if (k.m === 7 && k.d === 4) add('hol', `Happy Fourth of July${k.t}! 🎆 US markets are closed, so gold will be quiet.`);
    if (k.m === 11 && k.d === thanksgivingDay(k.y)) add('hol', `Happy Thanksgiving${k.t}! 🦃 US markets are closed — thin, choppy gold. Enjoy the food.`);
    if (k.m === 11 && k.d === thanksgivingDay(k.y) + 1) add('hol', `Black Friday${k.t} — short US session and thin liquidity.`);
    if (once) seenSet(seen);
    return out;
  }
  function wellnessLine(k) {
    if (k.market.state === 'weekend') {
      return pick('well-w', [
        `Make sure you get a workout in this weekend${k.t}.`,
        `Drink some water${k.t} — hydration is part of the edge.`,
        `Get some proper sleep this weekend${k.t}. A rested mind trades better.`,
        `Good time to review this week's trades${k.t} — what worked, what didn't.`,
        `Step away from the screens for a bit${k.t}. Go outside.`,
        k.market.weekday === 0 ? `It's Sunday${k.t} — take ten minutes to mark your levels for the week.` : `Recharge${k.t}. The charts will be here Sunday evening.`,
        `Eat well, train, sleep${k.t}. The market rewards a clear head.`,
      ]);
    }
    if (k.hour >= 23 || k.hour < 4) return pick('well-n', [`It's late${k.t} — don't forget to sleep.`, `Get some rest soon${k.t}. Tired eyes make bad trades.`]);
    return '';
  }

  function birthdayA(k, text) {
    if (/\byour\b|\byou born\b|\bjarvis\b/.test(text) && !/\bmy\b/.test(text)) {
      const n = daysUntil(k, JARVIS_BORN);
      return reply(n === 0 ? `Today, actually${k.t} — I came online on November 11th, 2026. 🎉` : `November 11th${k.t} — that's when I first came online, back in 2026. ${n} days to go.`,
        n === 0 ? `Today, actually${k.t}. I came online on November 11th.` : `November 11th${k.t}. That's when I first came online.`);
    }
    const b = birthdayOf(k);
    if (!b) return reply(`I don't know your birthday yet${k.t}. Add it in Settings ⚙ (month-day, like 11-15).`, `I don't know your birthday yet${k.t}. You can add it in Settings.`);
    const n = daysUntil(k, b), date = `${MONTHS[b.m - 1]} ${b.d}`;
    if (n === 0) return reply(`It's today${k.t}! Happy birthday! 🎂`, `It's today${k.t}! Happy birthday!`);
    return reply(`Your birthday is <b>${date}</b> — ${n === 1 ? '<b>tomorrow</b>' : `in <b>${n} days</b>`}. 🎂`, `Your birthday is ${date}${k.t}, ${n === 1 ? 'tomorrow' : `${n} days from now`}.`);
  }

  function weekendA(k) {
    const m = k.market;
    const tips = [`Get a workout in.`, `Drink plenty of water.`, `Catch up on sleep.`, `Review the week's trades — wins and losses.`, `Mark your levels for Monday on Sunday evening.`, `Spend time away from the charts.`];
    const lead = m.state === 'weekend' ? `Weekend plan${k.t}:` : `For the weekend${k.t}:`;
    return reply(`${lead}<ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul>${m.state === 'weekend' ? `<span class="dim">Gold reopens ${fmtT(m.opensAt, k.tz, true)} ET.</span>` : ''}`,
      `${lead} get a workout in, drink water, catch up on sleep, and review the week's trades. Mark your levels on Sunday evening.`);
  }

  function howAreYouA(k, c) {
    const m = k.market;
    let line;
    if (m.state === 'weekend') line = pick('hay-w', [`Doing well${k.t}. Markets are closed, so I'm just keeping watch — hope you're enjoying the break.`, `Rested and ready${k.t}. It's the weekend, so enjoy it — gold reopens in ${words(m.opensAt - k.now)}.`, `All quiet on my end${k.t}. Weekend mode. Take the break, you've earned it.`]);
    else if (m.friday) line = pick('hay-f', [`Doing good${k.t} — it's Friday. Get ready for the weekly close in ${words(m.weeklyClose - k.now)}.`, `Very well${k.t}. Friday — let's finish the week strong. Weekly close in ${words(m.weeklyClose - k.now)}.`, `Running smoothly${k.t}. Friday rules: protect the week's gains, the close is in ${words(m.weeklyClose - k.now)}.`]);
    else if (m.weekday === 1) line = pick('hay-m', [`All systems go${k.t}. Fresh week, fresh levels.`, `Doing well${k.t}. Monday — let's see what gold has planned for the week.`]);
    else if (k.tod === 'night' && k.hour < 5) line = pick('hay-n', [`All systems running${k.t}. Burning the midnight oil?`, `Wide awake, as always${k.t}. Late session tonight?`]);
    else line = pick('hay', [`All systems running smoothly${k.t}.`, `Doing well${k.t}, thanks for asking.`, `Never better${k.t}. Watching the charts for you.`, `Fully operational${k.t}.`, `Good${k.t}. Feeds are live and the bias engine is humming.`]);
    const extra = [...specialLines(k, { soon: false }), wellnessLine(k)].filter(Boolean).join(' ');
    const q = m.state === 'weekend' ? { html: '', say: '' } : quickBias(k);
    return reply(line + (extra ? ' ' + extra : '') + q.html, noEmoji(line + (extra ? ' ' + extra : '') + q.say));
  }

  // "High-impact news today: CPI at 8:30 AM" (only upcoming, only US high impact)
  function newsTodayLine(k) {
    const N = k.news;
    if (!N || !N.ok() || !k.market.open) return null;
    const day = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: k.tz }).format(new Date(ms));
    const list = N.relevant().filter((e) => N.isHigh(e) && e.at > k.now && day(e.at) === day(k.now));
    if (!list.length) return null;
    return {
      html: ` <span class="warn">High-impact news today: ${list.slice(0, 3).map((e) => `${esc(e.title)} at ${fmtT(e.at, k.tz, false)}`).join(', ')}.</span>`,
      say: ` Heads up, high impact news today: ${join(list.slice(0, 2).map((e) => `${sayTitle(e.title)} at ${sayT(e.at, k.tz)}`))}.`,
    };
  }

  function helloA(k) {
    const m = k.market;
    if (m.state === 'weekend') {
      const l = pick('hi-w', [`Hey${k.t}. Hope you're enjoying the break — markets reopen in ${words(m.opensAt - k.now)}.`, `${greet(k)}. Weekend mode — nothing moving. Gold reopens ${fmtT(m.opensAt, k.tz, true)} ET.`, `Hey${k.t}. Markets are closed, so relax. I'll be ready when they open.`]);
      const sp = specialLines(k).join(' ');
      const bday = /happy birthday/i.test(sp);
      const w = bday ? '' : wellnessLine(k);
      const all = (bday ? [sp, l] : [l, sp, w]).filter(Boolean).join(' ');
      return reply(all, noEmoji(all));
    }
    const sp = specialLines(k).join(' ');
    if (m.state === 'break') return reply(`Hey${k.t}. Gold's on its daily break — back at 6 PM ET.${sp ? ' ' + sp : ''}`, noEmoji(`Hey${k.t}. Gold's on its daily break, back at 6 PM.${sp ? ' ' + sp : ''}`));
    const opener = pick('hi', [`${greet(k)}.`, `At your service${k.t}.`, `Hey${k.t}.`, `${greet(k)}. Ready when you are.`, `Here${k.t}.`]) + (sp ? ' ' + sp : '');
    const fri = m.friday ? ` Friday — weekly close in ${words(m.weeklyClose - k.now)}.` : '';
    const q = quickBias(k);
    const nt = newsTodayLine(k) || { html: '', say: '' };
    const w = wellnessLine(k);
    return reply(opener + fri + q.html + nt.html + (w ? ' ' + w : ''), noEmoji(opener + fri + q.say + nt.say + (w ? ' ' + w : '')));
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
    ['If I swing traded now, what would that look like?', 'Swing plan: direction, stop, targets'],
    ['If I day trade right now, where’s my stop and TP?', 'Day-trade plan from your bias'],
    ['I’m in a sell, stop 4068, take profit 4048 — good trade?', 'Grades your trade'],
    ['Should I trade right now?', 'Timing check: sessions, news, bias'],
    ['Buying is safe until what?', 'Where your rules stop backing the trade'],
    ['At what point will price stop going up?', 'Likely ceilings + average-day high'],
    ['If I sell, where should my TP be?', 'Take-profit ideas from levels'],
    ['Sell now', 'Paper trade — I pick the stop and TP'],
    ['Sell 50 units at 4009, stop 4018, TP 3980', 'Paper trade your way'],
    ['How’s my paper trade?', 'Paper P/L and account'],
    ['Move my stop to break even', 'Adjust a paper trade'],
    ['What’s the weather?', 'Local weather'],
    ['What should I do today?', 'A plan for the day'],
    ['When should I not trade?', 'Best and worst times'],
    ['When’s the next high-impact news?', 'US economic calendar'],
    ['When is CPI?', 'Any specific release'],
    ['When’s my birthday?', 'Countdown (set it in Settings)'],
    ['Risk 1% with a 6 dollar stop', 'Position size in units and lots'],
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
  const DATA_INTENTS = new Set(['reach', 'manage', 'openTrade', 'openBias', 'biasUntil', 'price', 'bias', 'why', 'mtf', 'levels', 'distance', 'range', 'day', 'brief', 'trade', 'account', 'callouts', 'plan', 'review', 'tradenow', 'timing', 'news', 'safe', 'stall', 'tpq', 'weather', 'dayplan']);

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
    // v4: plans, trade review, timing, news, birthdays
    const style = any('SWING') ? 'swing' : any('DAYTRADE') ? 'day' : null;
    const stopPx = /\b(?:stop loss|stop|sl)\b\D{0,25}\d{3,}/.test(text), tpPx = /\b(?:take profit|target|tp)\b\D{0,25}\d{3,}/.test(text);
    const sizing = any('SIZE') || /\d\s*percent|risk(?:ing)?\s*\d/.test(text);
    if (style && any('SELL', 'BUY') && !(stopPx || tpPx)) set('trade', 8);
    else if (style && !any('SELL', 'BUY') && !any('NEWS')) set('plan', 7);
    if (!style && !hasNums && any('RISK', 'RR') && any('PLAN', 'ADVICE') && !any('SELL', 'BUY')) set('plan', 6.5);
    if ((stopPx || tpPx) && !sizing && (any('SELL', 'BUY', 'IN_TRADE') || (stopPx && tpPx))) set('review', 8.5);
    if (any('IN_TRADE') && any('SELL', 'BUY') && !hasNums && !style) set('review', 7.5);
    if (any('TRADEGEN') && any('ADVICE', 'NOW') && !any('SELL', 'BUY') && !style && !any('NEWS', 'TIMING')) set('tradenow', 6.5);
    if (any('TIMING')) set('timing', 7);
    if (any('NEWS')) set('news', any('SELL', 'BUY') ? 5 : 6.8);
    if (any('BIRTHDAY')) set('birthday', 7);
    if (any('WEEKEND') && /what should i do|plans?\b|tips|advice|how should i spend/.test(text)) set('weekend', 6);
    // v5
    const P = ctxRaw.paper || (typeof Paper !== 'undefined' ? Paper : null);
    const question = QUESTION.test(text.replace(FILLER, ''));
    if (any('SAFE')) set('safe', 7.5);
    if (BOTH_SIDES.test(text) && !/\b(close|exit|plan|swing|day trade|until|safe)\b/.test(text)) set('bias', 9.9);
    if (/\b(bearish|bullish|bear|bull|bias|trend|downtrend|uptrend)\b/.test(text) && (/\b(until|till|til|untill)\b/.test(text) || /\bhow long\b/.test(text) || /\bwhen (will|does|is|would|do)\b.*\b(stop|end|flip|change|turn|switch|over|done)\b/.test(text) || /\b(stay|staying|remain|last|lasting)\b/.test(text)) && !/\b(buy|buying|sell|selling|long|short)\b/.test(text)) set('biasUntil', 8.8);
    if (any('STALL') && !any('PAPER')) set('stall', 7.2);
    if (any('RR') && !tpPx && /\b(where|what|which|how far|should)\b/.test(text) && !stopPx) set('tpq', 7.6);
    if (P) {
      if (isOrder(text)) set('paperOrder', 9.5);
      if (/\b(close|exit|flatten|cut|kill|get me out|take me out|bank it|secure it)\b/.test(text) && /\b(trade|trades|position|positions|it|all|everything|sells?|buys?|shorts?|longs?|paper|out)\b/.test(text) && !question && P.positions().length) set('paperClose', 9);
      if (/\b(move|set|change|put|adjust|update|trail|raise|lower|tighten|bump)\b/.test(text) && /\b(stop|sl|stop loss|tp|take profit|target)\b/.test(text) && (/\d{3,}/.test(text) || /break ?even|\bbe\b/.test(text)) && !/\b(should|would|where|what|is it|if)\b/.test(text) && (P.busy() || /\b(my|the|our)\b/.test(text))) set('paperModify', 9.2);
      if (any('PAPER') && !isOrder(text)) set('paperStatus', 7.8);
      if (P.busy() && /\bhow (is|are) (my|the|our) (trade|trades|position|positions|paper|sell|buy|short|long|account)\b|\bhow are we\b|are we (in profit|up|down|winning|losing)|how much (are we|am i|we|is it) (up|down|making)|in profit|in the money|how is it going|how we doing|our trade|my position|\bp ?l\b|pnl/.test(text)) set('paperStatus', 8.2);
      if (/\b(reset|set|change|start|make|put)\b/.test(text) && /\b(paper|bankroll)\b/.test(text) && (/\d/.test(text) || /\breset\b/.test(text))) set('paperReset', 9.6);
      if (/\bcancel\b/.test(text) && /\b(order|orders|limit|pending)\b/.test(text)) set('paperCancel', 9.6);
    }
    if (/\b(week|weekly|weeks)\b/.test(text) && /\b(report|recap|summary|review|results?|stats|performance|how did (we|i)|how was|how we did|how i did|breakdown|scorecard|journal|p ?l|pnl|profit|made|lose|lost)\b/.test(text) && !any('NEWS')) set('weekly', 8.6);
    if (/\b(trade journal|trading journal|my stats|our stats|win rate|winrate|track record)\b/.test(text)) set('weekly', 8);
    if (/\b(remind me|set (?:a|an|me a)?\s*reminder|add (?:a )?reminder|don'?t let me forget|reminder to|reminder for)\b/.test(text)) set('remindAdd', 9.8);
    if (/\breminders?\b/.test(text) && /\b(my|any|what|show|list|see|check|read|have|got)\b/.test(text) && !/\bremind me\b/.test(text) && !/\b(clear|delete|remove|cancel|erase|scratch)\b/.test(text)) set('remindList', 9.4);
    if (/\b(clear|delete|remove|cancel|erase|scratch)\b.*\breminders?\b|\breminders?\b.*\b(clear|delete|remove)\b/.test(text)) set('remindClear', 9.6);
    if (/\b(not|no|stopped|done|finished|off|away from|break from)\s+(?:with\s+)?(?:trading|the charts|charts)\b|\bday off\b|\bnot in the mood to trade\b|\b(?:dont|do not) (?:want|feel like) (?:to )?trad(?:e|ing)\b|\bwhat (?:else )?(?:can|should) i do (?:instead|besides trading|other than trading)\b/.test(text)) set('freetime', 8.4);
    if (/\b(workout|exercise|fitness|gym|training|push ups?|pushups?|squats?|lifting)\b/.test(text) && /\b(plan|program|split|schedule|weekly|week)\b/.test(text) && !any('SELL', 'BUY')) set('workoutPlan', 8.6);
    if (/\bchallenge\b/.test(text) && !/\b(trading|prop|funded|ftmo|account)\b/.test(text)) set('workoutChallenge', 8.6);
    if (any('WEATHER')) set('weather', 8.5);
    if (any('DAYPLAN') && !any('SELL', 'BUY', 'WEEKEND')) set('dayplan', 6.4);
    if (any('WORKOUT') && !any('SELL', 'BUY')) set('workout', /give|suggest|need|want|what|recommend|routine|plan/.test(text) || text.split(' ').length <= 3 ? 6.6 : 4);
    return S;
  }

  // ---- nearest-example fallback --------------------------------------------------
  // When no keyword rule fires strongly, compare the sentence with these examples word by
  // word (with spelling tolerance) and pick the closest intent. Plain string math, no AI.
  const BANK = {
    price: ['where is gold trading', 'where is gold at', 'what is gold at', 'gold right now', 'quote me gold', 'how much is gold', 'what is the price of gold', 'gold price', 'what are we at', 'where are we trading', 'what is it trading at', 'give me the price'],
    bias: ['which way is gold leaning', 'up or down', 'is gold going up or down', 'should i be buying or selling', 'buy or sell', 'long or short', 'is it a buy', 'is it a sell', 'what side should i be on', 'what side are we on', 'are we bullish', 'are we bearish', 'what does the bias say', 'what is your read', 'what direction is gold going'],
    why: ['why is that', 'explain that', 'why do you think so', 'what is that based on', 'how did you get that'],
    day: ['what is going on with gold', 'what is gold doing', 'what is the market doing', 'catch me up', 'fill me in', 'what did i miss', 'run it down for me', 'what is new', 'how is the market today', 'what happened today', 'how is gold moving', 'give me an update'],
    levels: ['where are the levels', 'where are the key prices', 'what is the high', 'what is the low', 'where did it top', 'where did it bottom', 'what levels should i watch', 'where is support', 'where is resistance', 'important prices'],
    range: ['how much did it move', 'is it moving a lot', 'how volatile is it', 'has it moved much'],
    tradenow: ['is now a good time', 'can i trade', 'should i jump in', 'should i get in', 'is it a good time to get in', 'should i take a trade', 'is the market good right now', 'should i wait', 'should i be trading', 'is it worth trading right now', 'should i get involved', 'should i look for a trade', 'any trades right now', 'is there a trade', 'anything worth taking', 'good conditions to trade'],
    timing: ['what time should i trade', 'what hours are best', 'when is the best time', 'when should i avoid the market'],
    news: ['is anything coming out', 'is there news', 'any news', 'what news is out', 'is there anything big this week', 'any red folder', 'any big events', 'what is coming up', 'anything important today', 'any data today', 'when is the next big event'],
    safe: ['how long is the sell good for', 'how long is the buy good for', 'when does the trade stop working', 'what price kills the trade', 'what would change your mind'],
    stall: ['how far can it go', 'how much further', 'where is it heading', 'where is price going', 'what is the target for today', 'how far will it drop', 'how far will it run'],
    tpq: ['where do i take profit', 'where should i exit', 'where do i get out', 'what is a good target', 'when should i take profits'],
    biasUntil: ['when will the bias change', 'how long will it stay bearish', 'how long will it stay bullish', 'when does the trend end', 'is the trend over yet', 'when does it flip'],
    remindList: ['what do i need to do', 'what did i tell you to remember', 'anything i need to remember'],
    freetime: ['i am taking a break', 'i am off today', 'not feeling the market today', 'i need something to do', 'what else can i do'],
    workoutChallenge: ['challenge me', 'give me something hard', 'test me'],
    workoutPlan: ['plan my workouts', 'what should i train this week', 'gym schedule'],
    weekly: ['how did we do this week', 'how was my week', 'give me the weekly report', 'weekly recap', 'how did my trades go', 'what is my win rate', 'show me my stats', 'how have i been trading'],
    paperStatus: ['how is my trade doing', 'am i winning', 'am i losing', 'how much am i up', 'how much am i down', 'is my trade green', 'is my trade red', 'did my trade hit', 'where is my trade at', 'how are we doing on the trade', 'are we making money', 'show my positions', 'what trades do i have', 'how is the position'],
    weather: ['is it nice outside', 'do i need a jacket', 'is it going to rain', 'what is it like outside', 'how is it outside'],
    dayplan: ['what should i get up to', 'what are we doing today', 'give me a plan', 'what is the move today', 'help me plan the day'],
    workout: ['give me something to train', 'what should i train', 'what should i hit at the gym', 'i want to get a sweat in'],
    howareyou: ['how is it going jarvis', 'you doing alright', 'how have things been', 'how is your day going'],
    hello: ['hey there', 'what is good', 'what is up jarvis', 'yo jarvis', 'you up', 'good to see you', 'i am back', 'what is happening jarvis'],
    thanks: ['that helps', 'thank you so much', 'thanks man', 'nice one', 'perfect', 'got it', 'bet', 'sounds good', 'that is great', 'you are awesome', 'good stuff', 'appreciate it'],
    joke: ['say something funny', 'make me smile', 'tell me something funny'],
    help: ['what can you help with', 'what are you able to do', 'what questions can i ask', 'show me what you can do'],
    birthday: ['how old am i', 'when was i born', 'when is my big day'],
    feel_bad: ['today sucked', 'i am done with trading', 'i keep losing', 'nothing is working'],
    feel_good: ['i am up today', 'that went well', 'it worked', 'we got paid'],
  };
  const BANK_STOP = new Set(['the', 'a', 'an', 'is', 'it', 'to', 'me', 'my', 'i', 'am', 'are', 'you', 'do', 'does', 'of', 'for', 'on', 'in', 'at', 'this', 'that', 'be', 'and', 'or', 'so', 'just', 'please', 'jarvis', 'hey', 'any', 'some', 'there']);
  const BANK_LIST = Object.entries(BANK).flatMap(([id, list]) => list.map((q) => ({ id, w: q.split(' ').filter((x) => !BANK_STOP.has(x)) })));
  function bankMatch(text) {
    const tw = text.split(' ').filter((x) => x && !BANK_STOP.has(x) && !/^\d/.test(x));
    if (!tw.length) return null;
    const sim = (a, b) => (a === b ? 1 : a.length >= 4 && b.length >= 4 ? Math.max(0, 1 - lev(a, b) / Math.max(a.length, b.length)) : 0);
    let best = null;
    for (const e of BANK_LIST) {
      let m = 0;
      for (const t of tw) { let bs = 0; for (const x of e.w) { const v = sim(t, x); if (v > bs) bs = v; } if (bs >= 0.75) m += bs; }
      const score = (2 * m) / (tw.length + e.w.length);
      if (!best || score > best.score) best = { id: e.id, score };
    }
    return best && best.score >= 0.55 ? best.id : null;
  }

  // ctx: { gold(), refresh(force), projects, sessions, openProject(p), clear(), setMuted(b), stopSpeaking(), tz, title,
  //        ambient(on), isAmbient(), callouts() }
  // Every scorer votes; the highest score wins. Keyword rules + life tools + the big word library (lexicon.js).
  function pickIntent(c, text, fixed, hasNums, k, ctx) {
    const S = scoreIntents(c, fixed, hasNums, k, ctx);
    if (typeof Life !== 'undefined') Object.assign(S, Life.score(text, fixed, S, k));
    if (typeof Lex !== 'undefined') for (const [i, v] of Object.entries(Lex.score(text))) if (v > (S[i] || 0)) S[i] = v;
    if (typeof Extra !== 'undefined') for (const [i, v] of Object.entries(Extra.score(text))) if (v > (S[i] || 0)) S[i] = v;
    if (S.openBias && S.bias >= 9.9) S.openBias = 9.95; // "buy or sell at the open" — the open is the point
    const ranked = Object.entries(S).sort((a, b) => b[1] - a[1]);
    let id = ranked.length ? ranked[0][0] : null;
    if (!id || ranked[0][1] < 3) { const b = bankMatch(fixed); if (b) id = b; }
    // still nothing? answer about the closest topic you mentioned instead of "I didn't catch that"
    if ((!id || (ranked.length && ranked[0][1] < 3)) && typeof Lex !== 'undefined' && !(id && bankMatch(fixed) === id)) { const tp = Lex.topic(text); if (tp) id = tp; }
    return { id, S, ranked };
  }
  // Which question a sentence is (used by the vocabulary tests in tools/vocab-test.js)
  function routeOf(raw, ctx) {
    const text = stripWake(clean(raw));
    if (!text) return null;
    const fixed = correct(text, []);
    return pickIntent(concepts(fixed), text, fixed, /\d/.test(fixed), context(ctx), ctx);
  }

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
    const note = fixed !== text && text.split(' ').length <= 10 ? `<span class="dim">(heard “${esc(fixed)}”)</span> ` : '';
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

    let { id } = pickIntent(c, text, fixed, hasNums, k, ctx);

    // social opener in front of a data answer: "hey, how are you, what's the bias?"
    const social = (c.has('HOWAREYOU') || c.has('HELLO')) && id && DATA_INTENTS.has(id)
      ? (c.has('HOWAREYOU') ? pick('soc', [`Doing well${k.t}. `, `All good${k.t}. `, `Running smoothly${k.t}. `]) : pick('soc2', [`${greet(k)}. `, `Hey${k.t}. `])) : '';

    const dirOf = () => (c.has('BUY') && !c.has('SELL') ? 1 : c.has('SELL') && !c.has('BUY') ? -1 : (typeof Lex !== 'undefined' && Lex.side(text)) || (fixed.search(/\b(buy|long)/) < fixed.search(/\b(sell|short)/) ? 1 : -1));
    const biasDir = (kk) => (kk.g && kk.g.bias.bias === 'Bullish' ? 1 : kk.g && kk.g.bias.bias === 'Bearish' ? -1 : 0);
    const styleOf = () => (c.has('SWING') ? 'swing' : c.has('DAYTRADE') ? 'day' : null);
    const needGold = (fn) => {
      const run = () => { const r = fn(); return r ? { html: note + social + r.html, say: social + r.say } : null; };
      if (k.g) return run();
      return ctx.refresh().then((g) => { k.g = g; return g ? run() : reply('<span class="err">No market data yet — check Settings or your connection.</span>', `Sorry${k.t}, I have no market data right now.`); });
    };

    switch (id) {
      case 'price': return needGold(() => priceA(k));
      case 'bias': return needGold(() => (k.market.open ? biasA(k) : openBiasA(k)));
      case 'openBias': return needGold(() => openBiasA(k));
      case 'why': return needGold(() => whyA(k, c.has('BULL') ? 'Bullish' : c.has('BEAR') ? 'Bearish' : null));
      case 'mtf': return needGold(() => mtfA(k));
      case 'levels': return needGold(() => levelsA(k));
      case 'distance': return needGold(() => distanceA(k, fixed) || levelsA(k));
      case 'range': return needGold(() => rangeA(k));
      case 'day': return needGold(() => dayA(k, ''));
      case 'brief': return needGold(() => briefA(k));
      case 'trade': return needGold(() => (!k.market.open ? openBiasA(k, { trade: true, dir: dirOf() }) : tradeA(k, dirOf(), styleOf(), c.has('PLAN') || c.has('RISK') || c.has('RR'))));
      case 'openTrade': return needGold(() => openBiasA(k, { trade: true, dir: (c.has('BUY') || c.has('SELL') || (typeof Lex !== 'undefined' && Lex.side(text))) ? dirOf() : 0 }));
      case 'plan': return needGold(() => planA(k, styleOf(), true));
      case 'review': return needGold(() => reviewA(k, fixed, c.has('BUY') || c.has('SELL') ? dirOf() : 0, styleOf()));
      case 'tradenow': return needGold(() => (!k.market.open ? openBiasA(k, { trade: true }) : tradeNowA(k)));
      case 'timing': return needGold(() => timingA(k));
      case 'news': {
        const go = () => wrap(newsA(k, fixed));
        return k.news && !k.news.ok() && k.news.load ? k.news.load().then(go, go) : go();
      }
      case 'birthday': return wrap(birthdayA(k, fixed));
      case 'biasUntil': return needGold(() => biasUntilA(k, /\b(bullish|bull|uptrend)\b/.test(fixed) ? 1 : /\b(bearish|bear|downtrend)\b/.test(fixed) ? -1 : (typeof Lex !== 'undefined' ? Lex.dir(text) : 0)));
      case 'reach': return needGold(() => reachA(k, fixed));
      case 'manage': return needGold(() => manageA(k));
      case 'safe': return needGold(() => safeA(k, c.has('BUY') || c.has('SELL') ? dirOf() : biasDir(k)));
      case 'stall': return needGold(() => stallA(k, /\b(up|higher|rising|rise|climb|climbing|high|top|tops|ceiling|peak|pump|pumping|rally)\b/.test(fixed) ? 1 : /\b(down|lower|falling|fall|drop|dropping|low|bottom|bottoms|floor|dump|dumping)\b/.test(fixed) ? -1 : (typeof Lex !== 'undefined' && Lex.dir(text)) || biasDir(k) || 1));
      case 'tpq': {
        const t = parseTrade(fixed);
        if (t.stop) return needGold(() => tpForStopA(k, c.has('BUY') || c.has('SELL') ? dirOf() : (t.entry && t.stop > t.entry ? -1 : 1), t.entry || (k.g ? k.g.price.bid : 0), t.stop, styleOf(), !!t.entry));
        return needGold(() => tpA(k, c.has('BUY') || c.has('SELL') ? dirOf() : 0, styleOf()));
      }
      case 'paperOrder': return needGold(() => paperOrderA(k, fixed, dirOf(), styleOf()));
      case 'paperClose': return needGold(() => paperCloseA(k, fixed));
      case 'paperModify': return needGold(() => paperModifyA(k, fixed));
      case 'paperStatus': return needGold(() => paperStatusA(k));
      case 'weekly': return wrap(weeklyA(k, fixed));
      case 'remindAdd': return wrap(remindAddA(k, raw));
      case 'remindList': return wrap(remindListA(k));
      case 'remindClear': return wrap(remindClearA(k, fixed));
      case 'freetime': return wrap(freetimeA(k));
      case 'workoutPlan': return wrap(workoutPlanA(k, fixed));
      case 'workoutChallenge': return wrap(workoutChallengeA(k));
      case 'paperReset': return wrap(paperResetA(k, fixed));
      case 'paperCancel': return wrap(paperCancelA(k));
      case 'weather': {
        if (!ctx.weather) return wrap(reply(`Weather isn't available here${k.t}.`));
        const cm = text.match(/\b(?:weather|forecast|temperature)\b.*?\b(?:in|for|at)\s+([a-z][a-z .]{1,40})$/);
        return ctx.weather(cm ? cm[1].replace(/\b(today|tomorrow|right now|now|please)\b/g, '').trim() : null).then((w) => wrap(weatherA(k, w, fixed)), (e) => wrap(reply(
          /geo-denied|no-geo/.test(e.message) ? `I need a location for the weather${k.t}. Type your city in Settings ⚙ (Weather city), or allow location when your phone asks.` : /city-not-found/.test(e.message) ? `I couldn't find that city${k.t}. Check the spelling in Settings ⚙.` : `I can't reach the weather service right now${k.t}.`)));
      }
      case 'dayplan': return wrap(dayPlanA(k));
      case 'workout': return wrap(workoutA(k));
      case 'weekend': return wrap(weekendA(k));
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
        if (id && id.startsWith('x:') && typeof Extra !== 'undefined') {
          const xid = id.slice(2), go = () => { const r = Extra.run(xid, k, text); return r ? wrap(r) : null; };
          const r = Extra.NEEDS_GOLD.has(xid) && !k.g ? ctx.refresh().then((g) => { k.g = g; return go(); }) : go();
          if (r) return r;
        }
        if (id && id.startsWith('life:') && typeof Life !== 'undefined') {
          const r = Life.run(id.slice(5), text, fixed, k, ctx);
          if (r) return r.then ? r.then(wrap) : wrap(r);
        }
        const sug = suggestions(fixed);
        return reply(`${pick('unk', ['I didn’t quite catch that', 'Not sure I follow', 'I’m not sure what you mean'])}${k.t}. Maybe:<br>${chips(sug)}<br><span class="dim">Say “help” for ideas.</span>`,
          `${pick('unk2', ["Sorry, I didn't catch that", "I'm not sure I follow", 'Could you say that another way'])}${k.t}? You could ask ${sug.slice(0, 2).join(', or ')}.`);
      }
    }
  }

  // Spoken greeting used at boot
  const REGREET_MS = 60 * 60 * 1000; // full greeting at most once an hour
  function greeting(ctx) {
    const k = context(ctx);
    const m = marketLine(k);
    const g = k.g;
    const seen0 = seenGet();
    const recent = seen0.lastBoot && k.now - seen0.lastBoot < REGREET_MS && k.now >= seen0.lastBoot;
    seen0.lastBoot = k.now; seenSet(seen0);
    const rems = k.reminders ? k.reminders.takeOnOpen(k.now) : [];
    const remH = rems.length ? ` <b>Reminder${rems.length > 1 ? 's' : ''}:</b> ${rems.map((r) => esc(cap1(r.text))).join(' · ')}.` : '';
    let remS = rems.length ? ` You asked me to remind you: ${rems.map((r) => r.text).join(', and ')}.` : '';
    let remH2 = remH;
    if (typeof Life !== 'undefined') { const lg = Life.greetLine(k); if (lg) { remH2 += ' ' + lg.html; remS += ' ' + lg.say; } }
    if (recent) {
      const back = pick('back', [`Welcome back${k.t}.`, `Back again${k.t}.`, `Good to have you back${k.t}.`, `Right where you left me${k.t}.`]);
      const sp2 = specialLines(k).join(' ');
      const pg = paperGreeting(k) || { html: '', say: '' };
      const px = g ? ` Gold <b>${f2(g.price.bid)}</b>.` : '';
      const pxs = g ? ` Gold ${sayPrice(g.price.bid)}.` : '';
      return reply(`${back}${remH2}${sp2 ? ' ' + sp2 : ''}${px}${pg.html}`, noEmoji(`${back}${remS}${sp2 ? ' ' + sp2 : ''}${pxs}${pg.say}`));
    }
    const sp = specialLines(k).join(' ');
    const intro0 = pick('boot', [`${greet(k)}. All systems online.`, `${greet(k)}. JARVIS online and ready.`, `Systems online. ${greet(k)}.`]) + (sp ? ' ' + sp : '');
    const intro = intro0 + remH2;
    if (!g) return reply(intro, noEmoji(intro0 + remS));
    const w = wellnessLine(k);
    if (k.market.state === 'weekend') { const pg = paperGreeting(k) || { html: '', say: '' }; const wk = weeklyTeaser(k); if (wk) { pg.html += ' ' + wk.html; pg.say += ' ' + wk.say; } return reply(`${intro} ${m.html} Gold closed the week at <b>${f2(g.price.bid)}</b>.${pg.html}${w ? ' ' + w : ''}`, noEmoji(`${intro} ${m.say} Gold closed at ${sayPrice(g.price.bid)}.${pg.say}${w ? ' ' + w : ''}`)); }
    const q = quickBias(k);
    const nt = newsTodayLine(k) || { html: '', say: '' };
    const pg = paperGreeting(k) || { html: '', say: '' };
    nt.html += pg.html; nt.say += pg.say;
    return reply(`${intro}${q.html} ${m ? m.html : sessionLine(k)}${nt.html}` + demoNote(g), noEmoji(`${intro}${q.say} ${m ? m.say : sessionLine(k)}${nt.say}`) + demoSay(g));
  }

  // How well a sentence matches something JARVIS understands (used to pick the best speech guess)
  function score(raw, ctx) {
    try {
      const t = stripWake(clean(raw));
      if (!t) return 0;
      const fixed = correct(t, []);
      const kk = context(ctx);
      const S = scoreIntents(concepts(fixed), fixed, /\d/.test(fixed), kk, ctx);
      if (typeof Life !== 'undefined') Object.assign(S, Life.score(t, fixed, S, kk));
      if (typeof Lex !== 'undefined') for (const [i, v] of Object.entries(Lex.score(t))) if (v > (S[i] || 0)) S[i] = v;
      if (typeof Extra !== 'undefined') for (const [i, v] of Object.entries(Extra.score(t))) if (v > (S[i] || 0)) S[i] = v;
      let top = Math.max(0, ...Object.values(S));
      if (top < 3 && bankMatch(fixed)) top = 3;
      const tw = t.split(' ');
      return top - fixed.split(' ').filter((w, i) => w !== tw[i]).length * 0.4;
    } catch { return 0; }
  }

  // JARVIS's own daily trade: only when the setup is actually valid — never just to fill a quota.
  // Rules: 1H bias must point one way (no neutral), the trade score must agree, no high-impact news
  // in the next 30 min / last 15 min, not the dead zone 4:00–6:15 PM New York, and the target must be
  // at least 1.5× the stop. Asia hours need a stronger score than London / New York hours.
  function botCheck(ctx) {
    const k = context(ctx), g = k.g;
    if (!g || !g.price || !g.price.tradeable) return { ok: false, why: 'no live price' };
    if (!k.market.open) return { ok: false, why: 'market closed' };
    const ny = Sessions.parts(new Date(k.now), 'America/New_York'), mins = ny.h * 60 + ny.mi;
    if (mins >= 16 * 60 && mins < 18 * 60 + 15) return { ok: false, why: 'outside the trading window (6:15 PM to 4 PM New York)' };
    const dir = g.bias.bias === 'Bullish' ? 1 : g.bias.bias === 'Bearish' ? -1 : 0;
    if (!dir) return { ok: false, why: 'bias is neutral, so there is no edge' };
    const sc = scoreTrade(k, dir, 'day');
    const news = timingFlags(k).find((x) => x.lvl === 'stop' && /High-impact/.test(x.html));
    if (news) return { ok: false, dir, score: sc.score, why: 'high-impact news is too close' };
    const prime = mins >= 3 * 60 && mins < 11 * 60 + 30;
    const need = prime ? 3 : 4;
    if (sc.score < need) return { ok: false, dir, score: sc.score, why: `setup score ${sc.score} (needs ${need}${prime ? '' : ' outside London/New York hours'})` };
    const pl = buildPlan(k, dir, 'day');
    const risk = Math.abs(pl.entry - pl.stop);
    if (!(risk > 0)) return { ok: false, dir, score: sc.score, why: 'no clean stop' };
    let tp = pl.tp1;
    if (Math.abs(tp - pl.entry) < risk * 1.5) tp = pl.entry + dir * risk * 1.5; // always better than 1 to 1
    const why = `${lc(g.bias.bias)} bias, setup score ${sc.score}${prime ? ' in prime hours' : ''}: ${sc.f.filter((x) => x.pts > 0).map((x) => x.say).slice(0, 3).join(', ')}`;
    return { ok: true, dir, entry: pl.entry, sl: pl.stop, tp, risk, rr: Math.abs(tp - pl.entry) / risk, score: sc.score, why };
  }
  function botPlan(ctx) { const c = botCheck(ctx); return c.ok ? c : null; }

  return { interpret, greeting, score, esc, clean, stripWake, WAKE, paperEventLine, botPlan, botCheck, context, reply, pick, routeOf };
})();
