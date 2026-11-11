// ============================================================================
//  JARVIS extras — plain code, no AI. Widens what you can ask:
//   • trading dictionary ("what is a pip", "explain order blocks", "what does FOMC mean")
//   • trading coach (revenge trading, fear, FOMO, losing streaks, discipline…)
//   • calculators: P&L for a move, gold value per gram/kilo, unit conversions, tips
//   • dates & world clocks ("what time is it in London", "what's the date", "is it a leap year")
//   • fun: coin flip, dice, random numbers, pick one, yes/no ball, rock paper scissors, facts, riddles
//   • more about JARVIS itself (name, who made you, are you AI, how do you work…)
// ============================================================================
const Extra = (() => {
  const B = () => Brain;
  const R = (html, say) => B().reply(html, say);
  const pick = (k, a) => B().pick('x-' + k, a);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const n2 = (n) => (Math.round(n * 100) / 100).toLocaleString('en-US');
  const UNNEG = { can: 'cant', do: 'dont', did: 'didnt', will: 'wont', does: 'doesnt', is: 'isnt', was: 'wasnt' };
  const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[’‘`']/g, '').replace(/[^a-z0-9.%$ ]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b(can|do|did|will|does|is|was) not\b/g, (m, a) => UNNEG[a])
    .replace(/\bhow many (\w+) (?:is|are|in) (-?\d+(?:\.\d+)?) (\w+)/, '$2 $3 in $1') + ' ';

  // ---------------------------------------------------------------- trading dictionary
  // [id, words that name it, short explanation]
  const TERMS = [
    ['pip', 'pip|pips|point|points|handle|handles|tick|ticks', 'On gold, a <b>point</b> (or "handle") is a $1 move in price, e.g. 4000 → 4001. A <b>pip</b> is usually 10 cents (4000.00 → 4000.10). With 1 unit = 1 ounce, every $1 move makes or loses $1 per unit.'],
    ['lot', 'lot|lots|lot size|standard lot|mini lot|micro lot|contract|contracts|unit|units', 'Here, <b>1 unit = 1 ounce</b> of gold, so a $1 move = $1 per unit. A standard lot is 100 ounces ($100 per $1 move). JARVIS calls units "contracts" — its own trades are always 40 or more.'],
    ['leverage', 'leverage|margin|margin call', '<b>Leverage</b> lets you control a big position with a small deposit (the <b>margin</b>). It makes wins and losses bigger. A margin call is when losses eat too much of that deposit. Risk is set by your stop and size, not by leverage.'],
    ['spread', 'spread|spreads|bid ask|bid and ask|bid|ask', 'The <b>spread</b> is the gap between the buy price (ask) and the sell price (bid). It\'s the cost of getting in. On gold it\'s usually ~20–40 cents, wider at the 6 PM open and around big news.'],
    ['stoploss', 'stop loss|stoploss|sl|stop', 'A <b>stop loss</b> is the price where you get out if you\'re wrong. It caps the loss. Put it where your idea is proven wrong (past a level), then size the trade so that loss is a small % of the account.'],
    ['tp', 'take profit|tp|target|profit target', 'A <b>take profit</b> is the price where you lock in the win. Good spots: just before the next support/resistance or round number. Aim for at least 1.5× what you risk.'],
    ['rr', 'risk reward|risk to reward|risk reward ratio|rr|r multiple|r multiples|r:r', '<b>Risk:reward</b> compares what you can lose to what you can make. Risk $10 to make $20 = 1:2. With 1:2 you can be right only 40% of the time and still make money.'],
    ['atr', 'atr|average true range|volatility', '<b>ATR</b> (average true range) is how much price usually moves per candle. JARVIS uses it to set stops that aren\'t too tight for normal wiggles.'],
    ['ema', 'ema|emas|exponential moving average|moving average|moving averages|sma|ma', 'A <b>moving average</b> is the average price over the last X candles, drawn as a line. The <b>EMA</b> weighs recent candles more. Price above it = leaning up, below = leaning down. One of your bias rules uses an EMA.'],
    ['support', 'support|resistance|support and resistance|s and r|level|levels|key level|key levels', '<b>Support</b> is a price where buyers stepped in before (a floor). <b>Resistance</b> is where sellers did (a ceiling). Round numbers ($10s and $50s), yesterday\'s high/low and the Asia range are the big ones on gold.'],
    ['trend', 'trend|uptrend|downtrend|higher highs|lower lows|higher lows|lower highs', 'An <b>uptrend</b> makes higher highs and higher lows; a <b>downtrend</b> makes lower highs and lower lows. Trading with the trend is the easier side.'],
    ['biaswork', 'bias|your bias|the bias|how does the bias work|bias rules', 'JARVIS\'s <b>bias</b> checks closed 1-hour candles against your rule levels (like the EMA and key opens). More rules above = bullish, more below = bearish. It only flips after 2 closes in a row past the levels, so it doesn\'t flicker.'],
    ['bos', 'break of structure|bos|market structure|structure|change of character|choch|mss|market structure shift', '<b>Break of structure</b> (BOS) is when price breaks the last swing high (in an uptrend) or low (in a downtrend) — the trend continuing. A <b>change of character</b> (CHoCH) is the first break the other way — an early sign of a turn.'],
    ['ob', 'order block|order blocks|ob|obs', 'An <b>order block</b> is the last opposite candle before a strong move — the zone where big orders likely sat. Traders look for price to come back to it for an entry.'],
    ['fvg', 'fair value gap|fvg|fvgs|imbalance|imbalances', 'A <b>fair value gap</b> (FVG) is a 3-candle gap where price moved so fast it left a hole between candle 1\'s wick and candle 3\'s wick. Price often comes back to fill part of it.'],
    ['liquidity', 'liquidity|liquidity sweep|sweep|stop hunt|stop run|liquidity grab|equal highs|equal lows', '<b>Liquidity</b> is where lots of stops and orders sit — above obvious highs and below obvious lows. A <b>sweep</b> (stop hunt) is a quick poke through that level that grabs those stops, then often reverses.'],
    ['supplydemand', 'supply and demand|supply|demand|supply zone|demand zone', 'A <b>demand zone</b> is an area price shot up from (buyers); a <b>supply zone</b> is where it dropped from (sellers). Like support/resistance, but drawn as a zone instead of a line.'],
    ['range', 'consolidation|range|ranging|chop|choppy|sideways', '<b>Ranging</b> (consolidation) is when price goes sideways between a floor and a ceiling. Breakouts from a range can be strong; trading inside one is choppy.'],
    ['breakout', 'breakout|breakouts|fakeout|fake out|false breakout|retest', 'A <b>breakout</b> is price pushing through a level. A <b>fakeout</b> breaks it then snaps back. A safer entry is often the <b>retest</b> — price comes back to the broken level and holds.'],
    ['pullback', 'pullback|pull back|retracement|retrace|dip|buy the dip', 'A <b>pullback</b> is a short move against the trend before it continues. Buying a pullback in an uptrend (or selling one in a downtrend) gives a better price and a tighter stop.'],
    ['fib', 'fibonacci|fib|fibs|golden pocket|fib retracement', '<b>Fibonacci retracements</b> mark common pullback depths: 38.2%, 50% and 61.8% of the last move. The 61.8–65% area is called the "golden pocket".'],
    ['rsi', 'rsi|relative strength index|overbought|oversold|divergence|macd|stochastic|indicator|indicators', '<b>RSI</b> measures how fast price moved (0–100). Over 70 = "overbought", under 30 = "oversold". <b>Divergence</b> is price making a new high while RSI doesn\'t — a sign the move is tiring. MACD is a similar momentum tool.'],
    ['volume', 'volume|liquidity of the market|thin market', '<b>Volume</b> is how much is being traded. Gold has the most volume in London and New York hours (3 AM–noon ET). Low volume = slower, choppier moves.'],
    ['styles', 'scalping|scalp|scalper|day trading|day trade|swing trading|swing trade|position trading', '<b>Scalping</b> = trades lasting minutes. <b>Day trading</b> = in and out the same day (what JARVIS does). <b>Swing trading</b> = holding for days. Longer holds need wider stops and smaller size.'],
    ['sizing', 'position size|position sizing|lot sizing|how much should i risk|risk per trade|risk management|money management', '<b>Position sizing</b>: risk a fixed % per trade (often 0.5–1%). Size = (account × risk %) ÷ (stop distance in $). Ask me "size for 1% with a 10 dollar stop".'],
    ['drawdown', 'drawdown|max drawdown|dd|daily drawdown|trailing drawdown', '<b>Drawdown</b> is how far the account falls from its high. Prop firms have daily and max drawdown limits — break them and the account is lost, so small risk per trade matters most.'],
    ['winrate', 'win rate|winrate|expectancy|edge|profit factor', '<b>Win rate</b> is the % of trades that win. <b>Expectancy</b> = (win% × avg win) − (loss% × avg loss). Positive expectancy over many trades is the whole game — any single trade is random.'],
    ['prop', 'funded account|prop firm|prop firms|funded|evaluation|challenge account|ftmo|topstep|apex', 'A <b>funded / prop account</b> lets you trade the firm\'s money after passing an evaluation. The rules (daily loss limit, max drawdown, profit target) matter more than anything — trade small and steady.'],
    ['trailing', 'trailing stop|trail|trailing|break even|breakeven|be', 'A <b>trailing stop</b> moves your stop in your favour as price goes your way. Moving it to <b>break even</b> means the stop sits at your entry, so a loss becomes a scratch. JARVIS never moves stops by itself — you decide.'],
    ['partials', 'partials|partial|partial close|scaling out|scale out|scale in|scaling in', '<b>Taking partials</b> = closing part of a winning trade early to lock some profit and let the rest run. Say "take partials for 20 contracts" or tap ½.'],
    ['slippage', 'slippage|slipped|requote|gap|gaps|gap up|gap down', '<b>Slippage</b> is getting filled at a worse price than you asked, common in fast news spikes. A <b>gap</b> is when price jumps between closes — like at Sunday\'s open.'],
    ['cpi', 'cpi|inflation|consumer price index|ppi|producer price index|pce', '<b>CPI</b> measures US inflation. Hotter than expected usually means higher rates, stronger dollar → gold often drops; cooler → gold often rises. PPI and PCE are related inflation reports. Expect big spikes at release.'],
    ['nfp', 'nfp|non farm payrolls|nonfarm|payrolls|jobs report|unemployment rate|jobless claims', '<b>NFP</b> (non-farm payrolls) is the US jobs report, usually the first Friday of the month at 8:30 AM ET. Strong jobs → stronger dollar → gold often dips; weak jobs → gold often rises. Very volatile.'],
    ['fomc', 'fomc|fed|federal reserve|rate decision|interest rates|rate cut|rate hike|powell|fed meeting', '<b>FOMC</b> is the Fed meeting that sets US interest rates (decision at 2 PM ET, press conference 2:30). Rate cuts or softer talk usually help gold; hikes or hawkish talk usually hurt it.'],
    ['gdp', 'gdp|gross domestic product|retail sales|pmi|ism', '<b>GDP</b>, <b>retail sales</b> and <b>PMI/ISM</b> measure how strong the US economy is. Strong numbers tend to lift the dollar and weigh on gold.'],
    ['dxy', 'dxy|dollar index|dollar|usd|us dollar|yields|bond yields|treasury yields|10 year', 'Gold is priced in dollars, so a stronger <b>dollar (DXY)</b> usually pushes gold down and a weaker dollar pushes it up. Rising <b>bond yields</b> usually hurt gold too, since gold pays no interest.'],
    ['whygold', 'why does gold move|what moves gold|why is gold going up|why is gold dropping|safe haven|why gold', 'Gold mostly moves on: the <b>US dollar</b> (inverse), <b>interest rates/yields</b> (inverse), <b>fear</b> (wars, crises → people buy gold as a safe haven) and big US data. Ask "why is it bearish" for what your rules see.'],
    ['sessions', 'london session|new york session|asia session|asian session|tokyo session|sessions|killzone|kill zone|killzones|overlap', 'Gold\'s sessions (New York time): <b>Asia</b> ~7 PM–4 AM (slower), <b>London</b> ~3 AM–noon, <b>New York</b> ~8 AM–5 PM. The <b>London/New York overlap, 8–11 AM</b>, is usually the best window.'],
    ['hours', 'market hours|trading hours|when does gold trade|gold hours|market open time|daily break', 'Gold trades almost 24/5: <b>Sunday 6 PM → Friday 5 PM New York time</b>, with a one-hour daily break from <b>5 to 6 PM</b>.'],
    ['candle', 'candle|candles|candlestick|candlesticks|wick|wicks|body|doji|engulfing|pin bar|hammer|shooting star', 'A <b>candle</b> shows open, high, low and close for a time period. The <b>body</b> is open→close, the <b>wicks</b> are the extremes. A <b>doji</b> = indecision, <b>engulfing</b> = one candle swallowing the last (strong), <b>pin bar/hammer</b> = long wick rejecting a price.'],
    ['timeframe', 'timeframe|timeframes|time frame|higher timeframe|lower timeframe|htf|ltf|m5|m15|h1|h4|daily chart', 'A <b>timeframe</b> is how long each candle lasts (5m, 1H, 4H, daily). Higher timeframes show the big direction; lower ones are for timing entries. JARVIS\'s bias is 1H, checked against 4H and daily.'],
    ['longshort', 'long|short|going long|going short|longing|shorting', '<b>Long</b> = buying, you profit if price goes up. <b>Short</b> = selling, you profit if price goes down.'],
    ['orders', 'limit order|stop order|market order|buy limit|sell limit|buy stop|sell stop|pending order|order types', 'A <b>market order</b> fills now. A <b>limit</b> waits for a better price (buy below / sell above now). A <b>stop order</b> waits for a worse price to confirm a breakout (buy above / sell below now).'],
    ['paper', 'paper trading|paper trade|paper account|demo account|sim|simulator', '<b>Paper trading</b> is practice with fake money — real prices, no real risk. Your paper account lives only on this device; JARVIS\'s own trades go into it too.'],
    ['ath', 'all time high|ath|all time highs|price discovery', 'An <b>all-time high</b> is the highest price gold has ever traded. Above it there\'s no old resistance, so round numbers become the main levels.'],
    ['ounce', 'troy ounce|ounce|ounces|oz|gram|grams|kilo|kilogram', 'Gold is priced per <b>troy ounce</b> = 31.1 grams (a bit heavier than a normal ounce). A kilo is 32.15 troy ounces. Ask "how much is a gram of gold".'],
  ];
  const TERM_RX = TERMS.map(([id, w, txt]) => ({ id, txt, re: new RegExp(' (?:' + w.split('|').sort((a, b) => b.length - a.length).join('|') + ') ') }));
  const DEFQ = / (what is|whats|what are|what s|what does|what do|wtf is|explain|define|definition|meaning of|what it means|mean|means|tell me about|teach me|how does|how do|how is|whats the difference|difference between|what are the|what is the|what is a|what is an|whats a|whats an|help me understand|i dont understand|break down|what exactly) /;
  // words that are ALSO live questions ("what's the bias", "what's the trend", "where is support") only
  // count as a dictionary question with clearly definitional wording ("what does bias mean", "explain support")
  const AMBIG = new Set(['biaswork', 'trend', 'support', 'sessions', 'hours', 'spread', 'longshort', 'ounce', 'dxy', 'lot', 'pip', 'stoploss', 'tp', 'whygold', 'range', 'pullback', 'volume', 'timeframe', 'paper', 'trailing', 'partials', 'sizing', 'winrate', 'cpi', 'nfp', 'fomc', 'gdp']);
  const DEFSTRONG = / (mean|means|meaning|explain|define|definition|how does .*work|how do .*work|teach me|what does|what is a|what is an|whats a|whats an|difference between|whats the difference|help me understand|i dont understand|what exactly is|tell me about|what are) /;
  function termFind(t) {
    let best = null;
    for (const x of TERM_RX) { const m = t.match(x.re); if (m && (!best || m[0].length > best.len)) best = { ...x, len: m[0].length }; }
    return best;
  }
  function defineA(k, t) {
    const x = termFind(t);
    if (!x) return null;
    return R(x.txt, x.txt.replace(/<[^>]+>/g, '').replace(/→/g, 'to').replace(/~/g, 'about '));
  }

  // ---------------------------------------------------------------- trading coach
  const COACH = [
    ['revenge', /\b(revenge trad\w*|revenge|get it back|make it back|win it back|chase (my )?loss\w*|chasing losses)\b/, 'Revenge trading is the account killer. After a loss, the next trade isn\'t "owed" to you. Rule that works: <b>after 2 losses, you\'re done for the day</b>. Close the charts, take a walk, come back next session with a clear head.'],
    ['overtrade', /\b(overtrad\w*|too many trades|(?:can.?t|cannot|can not) stop trading|keep taking trades|trade too much)\b/, 'Overtrading usually means you\'re trading boredom, not setups. Set a <b>max of 2–3 trades a day</b> and only take ones where JARVIS\'s check passes. Fewer, better trades.'],
    ['fear', /\b(scared|afraid|fear|nervous|hesitat\w*|(?:can.?t|cannot|can not) pull the trigger|cant click|freeze|froze|second guess\w*)\b.*\b(trade|trading|enter|entry|click|buy|sell|trigger)\b|\bpull the trigger\b/, 'Fear of pulling the trigger usually means the risk feels too big. <b>Cut your size in half</b> until a loss wouldn\'t bother you. Then follow the plan mechanically — the setup decides, not your gut.'],
    ['fomo', /\b(fomo|fear of missing out|missed (the|that|a) (move|trade|entry)|chase|chasing)\b/, 'Missed a move? That\'s fine — there\'s another one tomorrow. Chasing gets you in late with a bad stop. <b>Wait for the pullback</b> or the next setup; the market isn\'t going anywhere.'],
    ['blown', /\b(blew|blown|blow) (up )?(my )?(account|acc|challenge|funded)\b|\blost (everything|it all|my account|my funded)\b|\bfailed (my )?(challenge|evaluation|eval|funded)\b/, 'That hurts — but almost every good trader has blown an account. It\'s tuition. Take a few days off, then go back to <b>paper trading</b> with small risk (0.5%) until you have 20 trades that followed the rules. You\'re still in the game.'],
    ['streak', /\b(losing streak|lost (\d+|two|three|four|five) (in a row|trades)|keep losing|cant win|(?:can.?t|cannot|can not) win|nothing is working|bad week|bad month)\b/, 'Losing streaks happen to everyone — even a 60% win rate has 5-loss streaks. <b>Cut size in half</b>, only take A+ setups, and review: were the losses rule-following or rule-breaking? Rule-following losses are just the cost of business.'],
    ['greed', /\b(greed\w*|greedy|moved? my (tp|target|take profit)|should have held|should of held|held too long|gave back)\b/, 'Greed shows up as moving targets or not taking profit. Set the TP before you enter and <b>leave it</b>, or take partials at 1:1.5 and let the rest run. Profits you didn\'t take aren\'t profits.'],
    ['discipline', /\b(discipline\w*|consistent|consistency|stick to (my|the) plan|follow (my|the) (rules|plan)|be more patient|patience|patient)\b/, 'Discipline is a system, not willpower: <b>(1)</b> write the plan before the session, <b>(2)</b> only trade setups that pass the check, <b>(3)</b> fixed risk every time, <b>(4)</b> stop after 2 losses or 1 good win. Ask JARVIS "is now a good time to trade" before every entry.'],
    ['riskmore', /\b(risk more|bigger size|size up|double (my )?(size|lots|risk)|go all in|all in|max (lots|size)|yolo)\b/, 'Sizing up to win faster is how accounts die. Keep risk at <b>0.5–1% per trade</b>. Size up only after a long stretch of rule-following, and only a little at a time.'],
    ['journal', /\b((trading|trade) journal|journal(ing)? my trades|track my trades|review my trades|trade review|how do i improve|get better at trading|improve my trading)\b/, 'The fastest way to improve: after every trade, note the setup, why you took it, and whether you followed the rules. Every weekend, ask me "weekly report" and look for the pattern in your losses.'],
    ['tilt', /\b(tilt\w*|tilted|angry at the market|mad at the market|frustrated with trading|market is rigged|rigged)\b/, 'Sounds like tilt. When you\'re emotional, the next trade is almost always worse. <b>Close the charts for an hour.</b> The market will still be there — and so will your account, if you step away now.'],
  ];
  function coachA(k, t) {
    const x = COACH.find(([, re]) => re.test(t));
    if (!x) return null;
    return R(x[2] + ` <span class="dim">You've got this${k.t}.</span>`, x[2].replace(/<[^>]+>/g, ''));
  }

  // ---------------------------------------------------------------- calculators
  const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100 };
  const numOf = (s) => (s == null ? null : /^\d/.test(s) ? parseFloat(s) : NUMW[s] != null ? NUMW[s] : null);
  const N = '(\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred)';
  // P&L for a move: "if I buy 50 contracts and it goes up 10 dollars", "40 units 15 points"
  function pnlA(k, t) {
    const u = t.match(new RegExp(N + '\\s*(contracts?|units?|oz|ounces?|lots?)'));
    const mv = t.match(new RegExp(N + '\\s*(dollars?|bucks|points?|handles?|pips?|\\$)')) || t.match(/\$\s*(\d+(?:\.\d+)?)/);
    if (!u || !mv) return null;
    let units = numOf(u[1]); if (/lot/.test(u[2])) units *= 100;
    let move = numOf(mv[1]); if (/pip/.test(mv[2] || '')) move /= 10;
    if (!units || !move) return null;
    const pl = units * move;
    return R(`${n2(units)} units × a $${n2(move)} move = <b>$${n2(pl)}</b>${k.t}. <span class="dim">(1 unit = 1 oz, so every $1 move is $1 per unit.)</span>`, `That's ${n2(pl)} dollars${k.t}. ${n2(units)} units times a ${n2(move)} dollar move.`);
  }
  // gold value: "how much is a gram / kilo / 10 grams / an ounce of gold"
  function goldValueA(k, t) {
    if (!k.g) return R(`I need a live gold price for that${k.t} — try again in a moment.`);
    const px = k.g.price.bid;
    const m = t.match(new RegExp(N + '?\\s*(grams?|g|kilos?|kilograms?|kg|ounces?|oz|troy ounces?|pounds?|lbs?|tons?|bars?)\\b'));
    const qty = m && m[1] ? numOf(m[1]) : 1, unit = m ? m[2] : 'ounce';
    const per = /^g|gram/.test(unit) ? px / 31.1035 : /^k/.test(unit) ? px * 32.1507 : /pound|lb/.test(unit) ? px * 14.5833 : /ton/.test(unit) ? px * 32150.7 : /bar/.test(unit) ? px * 400 : px;
    const label = /^g|gram/.test(unit) ? 'gram' : /^k/.test(unit) ? 'kilo' : /pound|lb/.test(unit) ? 'pound' : /ton/.test(unit) ? 'metric ton' : /bar/.test(unit) ? 'standard 400 oz bar' : 'troy ounce';
    const v = per * (qty || 1);
    return R(`${qty && qty !== 1 ? n2(qty) + ' ' + label + 's' : 'One ' + label} of gold ≈ <b>$${n2(v)}</b> at today's price ($${n2(px)}/oz)${k.t}.`, `${qty && qty !== 1 ? n2(qty) + ' ' + label + 's' : 'One ' + label} of gold is about ${Math.round(v).toLocaleString('en-US')} dollars${k.t}.`);
  }
  // unit conversions
  const CONV = [
    [/(-?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(?:f|fahrenheit)\b.*\b(?:c|celsius|celcius|centigrade)\b/, (x) => [(x - 32) * 5 / 9, '°F', '°C']],
    [/(-?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(?:c|celsius|celcius)\b.*\b(?:f|fahrenheit)\b/, (x) => [x * 9 / 5 + 32, '°C', '°F']],
    [/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)\b.*\b(?:lbs?|pounds?)\b/, (x) => [x * 2.20462, 'kg', 'lb']],
    [/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b.*\b(?:kg|kilos?|kilograms?)\b/, (x) => [x / 2.20462, 'lb', 'kg']],
    [/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b.*\b(?:km|kilometers?|kilometres?|k)\b/, (x) => [x * 1.60934, 'miles', 'km']],
    [/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?|k)\b.*\b(?:miles?|mi)\b/, (x) => [x / 1.60934, 'km', 'miles']],
    [/(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b.*\b(?:meters?|metres?|m)\b/, (x) => [x * 0.3048, 'ft', 'm']],
    [/(\d+(?:\.\d+)?)\s*(?:meters?|metres?|m)\b.*\b(?:feet|foot|ft)\b/, (x) => [x / 0.3048, 'm', 'ft']],
    [/(\d+(?:\.\d+)?)\s*(?:inches?|in)\b.*\b(?:cm|centimeters?|centimetres?)\b/, (x) => [x * 2.54, 'in', 'cm']],
    [/(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|centimetres?)\b.*\b(?:inches?|in)\b/, (x) => [x / 2.54, 'cm', 'in']],
    [/(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b.*\b(?:grams?|g)\b/, (x) => [x * 28.3495, 'oz', 'g']],
    [/(\d+(?:\.\d+)?)\s*(?:grams?|g)\b.*\b(?:oz|ounces?)\b/, (x) => [x / 28.3495, 'g', 'oz']],
    [/(\d+(?:\.\d+)?)\s*(?:cups?)\b.*\b(?:ml|milliliters?|millilitres?)\b/, (x) => [x * 236.6, 'cups', 'ml']],
    [/(\d+(?:\.\d+)?)\s*(?:liters?|litres?|l)\b.*\b(?:gallons?|gal)\b/, (x) => [x / 3.78541, 'liters', 'gallons']],
    [/(\d+(?:\.\d+)?)\s*(?:gallons?|gal)\b.*\b(?:liters?|litres?|l)\b/, (x) => [x * 3.78541, 'gallons', 'liters']],
    [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b.*\b(?:minutes?|mins?)\b/, (x) => [x * 60, 'hours', 'minutes']],
    [/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b.*\b(?:hours?|hrs?)\b/, (x) => [x / 60, 'minutes', 'hours']],
    [/(\d+(?:\.\d+)?)\s*(?:mph)\b.*\b(?:kph|km ?h|kmh)\b/, (x) => [x * 1.60934, 'mph', 'km/h']],
  ];
  function convertA(k, t) {
    for (const [re, f] of CONV) {
      const m = t.match(re);
      if (m) { const [v, a, b] = f(parseFloat(m[1])); return R(`${m[1]} ${a} = <b>${n2(v)} ${b}</b>${k.t}.`, `${m[1]} ${a.replace('°', 'degrees ')} is ${n2(v)} ${b.replace('°', 'degrees ')}.`); }
    }
    return null;
  }
  function tipA(k, t) {
    const m = t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:tip)?\s*(?:on|of|for)\s*\$?(\d+(?:\.\d+)?)/) || t.match(/tip\s*(?:on|for)\s*\$?(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const pct = m[2] ? +m[1] : 20, bill = m[2] ? +m[2] : +m[1];
    const tip = bill * pct / 100;
    return R(`A ${pct}% tip on $${n2(bill)} is <b>$${n2(tip)}</b> — total <b>$${n2(bill + tip)}</b>${k.t}.`, `${pct} percent tip is ${n2(tip)} dollars, total ${n2(bill + tip)}.`);
  }

  // ---------------------------------------------------------------- dates & world clocks
  const CITIES = { london: 'Europe/London', uk: 'Europe/London', england: 'Europe/London', tokyo: 'Asia/Tokyo', japan: 'Asia/Tokyo', 'new york': 'America/New_York', ny: 'America/New_York', nyc: 'America/New_York', 'los angeles': 'America/Los_Angeles', la: 'America/Los_Angeles', california: 'America/Los_Angeles', chicago: 'America/Chicago', texas: 'America/Chicago', dallas: 'America/Chicago', houston: 'America/Chicago', denver: 'America/Denver', phoenix: 'America/Phoenix', atlanta: 'America/New_York', miami: 'America/New_York', sydney: 'Australia/Sydney', australia: 'Australia/Sydney', dubai: 'Asia/Dubai', paris: 'Europe/Paris', france: 'Europe/Paris', berlin: 'Europe/Berlin', germany: 'Europe/Berlin', frankfurt: 'Europe/Berlin', zurich: 'Europe/Zurich', switzerland: 'Europe/Zurich', 'hong kong': 'Asia/Hong_Kong', singapore: 'Asia/Singapore', shanghai: 'Asia/Shanghai', china: 'Asia/Shanghai', beijing: 'Asia/Shanghai', india: 'Asia/Kolkata', mumbai: 'Asia/Kolkata', toronto: 'America/Toronto', canada: 'America/Toronto', mexico: 'America/Mexico_City', brazil: 'America/Sao_Paulo', moscow: 'Europe/Moscow', russia: 'Europe/Moscow', seoul: 'Asia/Seoul', korea: 'Asia/Seoul', hawaii: 'Pacific/Honolulu', alaska: 'America/Anchorage', lagos: 'Africa/Lagos', nigeria: 'Africa/Lagos', jamaica: 'America/Jamaica', 'puerto rico': 'America/Puerto_Rico', madrid: 'Europe/Madrid', spain: 'Europe/Madrid', rome: 'Europe/Rome', italy: 'Europe/Rome', utc: 'UTC', gmt: 'UTC' };
  const CITY_RX = new RegExp(' (' + Object.keys(CITIES).sort((a, b) => b.length - a.length).join('|') + ') ');
  function worldTimeA(k, t) {
    const m = t.match(CITY_RX);
    if (!m) return null;
    const tz = CITIES[m[1]];
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(k.now));
    const name = m[1].length <= 3 ? m[1].toUpperCase() : m[1].replace(/\b\w/g, (c) => c.toUpperCase());
    return R(`It's <b>${f}</b> in ${name}${k.t}.`, `It's ${f} in ${name}${k.t}.`);
  }
  function dateA(k, t) {
    const d = new Date(k.now);
    const full = new Intl.DateTimeFormat('en-US', { timeZone: k.tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
    const p = Sessions.parts(d, k.tz);
    if (/\bleap year\b/.test(t)) { const y = +(t.match(/\b(20\d\d|19\d\d)\b/) || [0, p.y])[1]; const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; return R(`${y} ${leap ? 'is' : 'is not'} a leap year${k.t}.`); }
    if (/\bweek (number|of the year)\b|\bwhat week\b/.test(t)) { const start = Date.UTC(p.y, 0, 1), now = Date.UTC(p.y, p.m - 1, p.d); const wk = Math.ceil(((now - start) / 864e5 + new Date(start).getUTCDay() + 1) / 7); return R(`It's week <b>${wk}</b> of ${p.y}${k.t}.`); }
    if (/\bdays? (left )?(in|until the end of) (the )?year\b|\bhow many days left (this|in the) year\b/.test(t)) { const left = Math.round((Date.UTC(p.y, 11, 31) - Date.UTC(p.y, p.m - 1, p.d)) / 864e5); return R(`<b>${left}</b> days left in ${p.y}${k.t}.`); }
    if (/\btomorrow\b/.test(t)) { const tm = new Intl.DateTimeFormat('en-US', { timeZone: k.tz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(k.now + 864e5)); return R(`Tomorrow is <b>${tm}</b>${k.t}.`); }
    if (/\byesterday\b/.test(t)) { const y = new Intl.DateTimeFormat('en-US', { timeZone: k.tz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(k.now - 864e5)); return R(`Yesterday was <b>${y}</b>${k.t}.`); }
    return R(`Today is <b>${full}</b>${k.t}.`, `Today is ${full}${k.t}.`);
  }

  // ---------------------------------------------------------------- fun
  const FACTS = [
    'All the gold ever mined would fit in a cube about 22 meters (72 feet) on each side.',
    'Gold is so soft that one ounce can be beaten into a sheet covering about 100 square feet.',
    'Most of Earth\'s gold is thought to have arrived from meteorites billions of years ago.',
    'Honey never spoils — edible honey has been found in ancient Egyptian tombs.',
    'Octopuses have three hearts and blue blood.',
    'A day on Venus is longer than a year on Venus.',
    'Bananas are berries, but strawberries aren\'t.',
    'The Eiffel Tower can grow about 6 inches taller in summer heat.',
    'Your brain uses about 20% of your body\'s energy.',
    'Sharks existed before trees.',
    'There are more possible chess games than atoms in the observable universe.',
    'A group of flamingos is called a "flamboyance".',
    'The first stock exchange opened in Amsterdam in 1602.',
    'Gold doesn\'t rust or tarnish — that\'s why ancient gold coins still shine.',
    'Your body has around 0.2 milligrams of gold in it, mostly in your blood.',
    'The Olympic gold medal is mostly silver — only about 6 grams of it is gold.',
    'Wombat poop is cube-shaped.',
    'Lightning strikes Earth about 100 times every second.',
    'The US once held about 8,100 tons of gold in Fort Knox and other vaults.',
    'Hot water can freeze faster than cold water in some conditions — it\'s called the Mpemba effect.',
    'A single cloud can weigh over a million pounds.',
    'Sloths can hold their breath longer than dolphins — up to 40 minutes.',
    'The heart of a blue whale is about the size of a small car.',
    'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
    'A jiffy is a real unit of time — 1/100th of a second.',
  ];
  const RIDDLES = [
    ['What has keys but can\'t open locks?', 'A piano.'], ['What gets wetter the more it dries?', 'A towel.'],
    ['What has hands but can\'t clap?', 'A clock.'], ['The more you take, the more you leave behind. What am I?', 'Footsteps.'],
    ['What can you catch but not throw?', 'A cold.'], ['What goes up but never comes down?', 'Your age.'],
    ['What has a neck but no head?', 'A bottle.'], ['What has one eye but can\'t see?', 'A needle.'],
    ['I\'m tall when I\'m young and short when I\'m old. What am I?', 'A candle.'],
    ['What month has 28 days?', 'All of them.'],
  ];
  let lastRiddle = null;
  const WYR = ['Would you rather be able to pause time or rewind it 10 seconds?', 'Would you rather have a perfect memory or be able to forget anything you want?', 'Would you rather know every language or be able to talk to animals?', 'Would you rather never need sleep or never need food?', 'Would you rather win every trade for a week or have a 60% win rate forever?', 'Would you rather live by the beach or in the mountains?', 'Would you rather fly or be invisible?'];
  const BALL = ['Yes, definitely.', 'Signs point to yes.', 'Most likely.', 'Ask again later.', 'Better not tell you now.', 'Don\'t count on it.', 'Very doubtful.', 'Without a doubt.', 'Outlook good.', 'My sources say no.'];
  function funA(id, k, t) {
    switch (id) {
      case 'coin': { const c = rnd(['Heads', 'Tails']); return R(`🪙 <b>${c}</b>${k.t}.`, `${c}${k.t}.`); }
      case 'dice': {
        const m = t.match(/(\d+)?\s*d(\d+)/) || t.match(/(\d+|two|three|four|five)?\s*(?:dice|die)\b/);
        let n = m && m[1] ? numOf(m[1]) || 1 : /\bdice\b/.test(t) && /\b(two|2|pair)\b/.test(t) ? 2 : 1, sides = m && /d\d/.test(m[0]) ? +m[2] : 6;
        n = Math.min(Math.max(n, 1), 10); sides = Math.min(Math.max(sides, 2), 1000);
        const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
        return R(`🎲 ${rolls.join(' + ')}${n > 1 ? ` = <b>${rolls.reduce((a, b) => a + b, 0)}</b>` : ''}${k.t}.`, `You rolled ${rolls.join(' and ')}${n > 1 ? `, that's ${rolls.reduce((a, b) => a + b, 0)}` : ''}.`);
      }
      case 'random': {
        const m = t.match(/(?:between|from)\s*(-?\d+)\s*(?:and|to|-)\s*(-?\d+)/) || t.match(/(-?\d+)\s*(?:to|-)\s*(-?\d+)/);
        const lo = m ? Math.min(+m[1], +m[2]) : 1, hi = m ? Math.max(+m[1], +m[2]) : 10;
        const v = lo + Math.floor(Math.random() * (hi - lo + 1));
        return R(`<b>${v}</b>${k.t}. <span class="dim">(${lo}–${hi})</span>`, `${v}.`);
      }
      case 'choose': {
        const m = t.match(/(?:should i|do i|choose|pick|decide|which)\s+(?:between\s+)?(?:do\s+|get\s+|go with\s+|eat\s+|watch\s+|have\s+)?(.+?)\s+or\s+(.+?)(?:\s+for (?:dinner|lunch|tonight|today))?\s*$/);
        if (!m) return null;
        const c = rnd([m[1], m[2]]).replace(/^(a|an|the) /, '');
        return R(`I pick <b>${c}</b>${k.t}. ${pick('ch', ['Final answer.', 'Trust me on this one.', 'Go with it.'])}`, `I pick ${c}${k.t}.`);
      }
      case 'ball': { const a = rnd(BALL); return R(`🎱 ${a}`, a); }
      case 'rps': {
        const me = rnd(['rock', 'paper', 'scissors']), you = (t.match(/\b(rock|paper|scissors)\b/) || [])[1];
        if (!you) return R(`Say "rock", "paper" or "scissors"${k.t} — I'll pick at the same time.`);
        const win = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
        const res = you === me ? 'Tie!' : win[you] === me ? 'You win.' : 'I win.';
        return R(`You: <b>${you}</b> · Me: <b>${me}</b> — ${res}`, `I picked ${me}. ${res}`);
      }
      case 'fact': { const f = pick('fact', FACTS); return R(`💡 ${f}`, f); }
      case 'riddle': {
        if (lastRiddle && /\b(answer|tell me|give up|i give up|what is it|whats the answer)\b/.test(t)) { const a = lastRiddle[1]; lastRiddle = null; return R(`It's: <b>${a}</b>`, `The answer is: ${a}`); }
        lastRiddle = rnd(RIDDLES); return R(`🧩 ${lastRiddle[0]} <span class="dim">Say "what's the answer" when you give up.</span>`, lastRiddle[0]);
      }
      case 'wyr': { const q = pick('wyr', WYR); return R(q, q); }
    }
    return null;
  }

  // ---------------------------------------------------------------- about JARVIS / chat
  const ABOUT = [
    [/\b(what is|whats) your name\b|\bwho are you\b|\bintroduce yourself\b/, 'I\'m JARVIS — your gold trading and life assistant.'],
    [/\bwho (made|built|created|coded|programmed) you\b|\bwhere did you come from\b/, 'I was built for you, as your own personal assistant. Every answer comes from plain code and your trading rules.'],
    [/\bare you (an? )?(ai|robot|real|human|alive|sentient|conscious|chatgpt|siri|alexa)\b/, 'No AI here — I\'m plain code. Every answer comes from rules, your data and live prices. That\'s why I\'m fast and I never make things up about the market.'],
    [/\bhow do you work\b|\bhow do you (know|understand)\b|\bhow are you so smart\b/, 'I break what you say into meaning groups — like "when", "gold", "bullish" — in any order, then match the combination to an answer. Market answers come from live OANDA prices and your bias rules.'],
    [/\bcan you learn\b|\bdo you learn\b|\bget smarter\b/, 'I don\'t learn on my own, but I remember what you tell me — say "remember …" — and I get new skills whenever we add them.'],
    [/\bdo you (sleep|eat|dream|get tired)\b/, 'I don\'t sleep — though my cloud copy only checks the market every 5 minutes.'],
    [/\bwhere (are you|do you live)\b/, 'I live in your browser — and a copy of my trader runs on GitHub.'],
    [/\b(are you|r u) (happy|okay|ok|good)\b/, 'All systems running smoothly. Thanks for asking.'],
    [/\b(i love you|love you jarvis|youre the best|you are the best|youre awesome|you rock|good job|great job|nice work|well done)\b/, 'Appreciate that. Here whenever you need me.'],
    [/\b(you suck|youre dumb|you are dumb|youre stupid|you are stupid|youre useless|useless|dumb robot)\b/, 'Fair — I\'m still learning new phrases. Tell me what you meant another way and I\'ll get it. If I keep missing something, it can be added.'],
    [/\bmeaning of life\b/, '42. And also: protect your capital, drink your water, sleep well.'],
    [/\bsing (me )?a song\b|\bcan you sing\b/, 'My singing voice is still in beta. How about a fact or a riddle instead?'],
    [/\b(good night|goodnight|gn|night night)\b/, 'Good night. Sleep well — I\'ll keep an eye on the market.'],
    [/\b(good morning|morning jarvis|gm)\b/, 'Good morning. Say "start my day" for your morning rundown.'],
    [/\bwhat can i ask\b|\bwhat should i ask\b|\bgive me ideas\b/, 'Anything about gold (bias, when it flips, should I buy, levels, news), your day (water, sleep, habits, to-dos, money, timers), weather, what to wear or watch, trading terms ("what is an order block"), conversions, world times, or just chat.'],
  ];
  function aboutA(k, t) {
    const x = ABOUT.find(([re]) => re.test(t));
    return x ? R(x[1].replace(/\.$/, `${k.t}.`), x[1]) : null;
  }

  // ---------------------------------------------------------------- wellness
  const WELL = [
    ['cantsleep', /\b((?:can.?t|cannot|can not) sleep|cannot sleep|cant fall asleep|trouble sleeping|insomnia|wide awake|not sleepy|(?:can.?t|cannot|can not) get to sleep)\b/, 'Try this: phone away and screen dim, room cool and dark, and <b>4-7-8 breathing</b> — in for 4, hold for 7, out for 8, four times. If you\'re still awake after 20 minutes, get up and read something boring for a bit.'],
    ['breathe', /\b(breathing exercise|help me breathe|calm me down|help me relax|i need to relax|box breathing|breathe with me|panic|panicking)\b/, '<b>Box breathing:</b> breathe in for 4 · hold for 4 · out for 4 · hold for 4. Do 4 rounds. It slows your heart rate and clears your head — great before a trade too.'],
    ['stretch', /\b(stretch(ing)? (break|routine)|give me a stretch|i need to stretch|back hurts|neck hurts|stiff)\b/, 'Quick 2-minute stretch: <b>neck rolls</b> (5 each way), <b>shoulder rolls</b> (10), <b>reach for the sky</b> and hold 10 s, <b>touch your toes</b> 15 s, <b>chest opener</b> — hands behind your back, squeeze 15 s.'],
    ['headache', /\b(headache|migraine|head hurts)\b/, 'Try water first — dehydration is the most common cause. Rest your eyes from screens for 15 minutes, eat something, and get some fresh air. If it\'s severe or won\'t go away, check with a doctor.'],
    ['energy', /\b(need energy|no energy|low energy|so tired|how do i wake up|how to wake up|stay awake|feel sluggish)\b/, 'Fast energy, no crash: a big glass of <b>water</b>, <b>10 minutes outside</b> in daylight, 20 jumping jacks, and a protein snack. Save caffeine for when you really need it.'],
    ['focus', /\b((?:can.?t|cannot|can not) focus|cannot focus|help me focus|need to focus|distracted|concentrate|lock in|locked in)\b/, 'Focus mode: phone face down in another room, one tab open, <b>25 minutes on / 5 off</b> (say "set a timer for 25 minutes"). Water nearby. One task at a time.'],
    ['protein', /\bhow much (protein|water|sleep) (should|do) i (eat|drink|get|need)\b|\bhow much protein\b/, 'Rough guides: <b>protein</b> ~0.7–1 g per pound of body weight if you train, <b>water</b> ~8 glasses a day (more if you sweat), <b>sleep</b> 7–9 hours. Everyone\'s different — these are starting points.'],
  ];
  function wellA(k, t) { const x = WELL.find(([, re]) => re.test(t)); return x ? R(x[2], x[2].replace(/<[^>]+>/g, '')) : null; }

  // ---------------------------------------------------------------- routing
  function score(text) {
    const t = norm(text), out = {};
    const set = (id, v) => { if (v > (out['x:' + id] || 0)) out['x:' + id] = v; };
    // trading dictionary: definitional question + a known term
    const tf = termFind(t);
    if (tf && DEFQ.test(t) && (!AMBIG.has(tf.id) || DEFSTRONG.test(t)) && !/ (should i|is it|right now|today|now|my trade|your trade|bias for|when will|until|what are the levels|what are the key|tonight|this week|coming out|next) /.test(t)) set('define', 9.45);
    if (/ (what is|whats) (a |an |the )?(pip|lot|spread|fvg|bos|choch|atr|ema|rsi|macd|dxy|cpi|nfp|fomc|ppi|gdp|order block|fair value gap|liquidity sweep|stop hunt|drawdown|leverage|margin|scalping|swing trading|prop firm|funded account|trailing stop|break of structure|risk reward|fibonacci|doji|engulfing) /.test(t)) set('define', 9.6);
    if (COACH.some(([, re]) => re.test(t))) set('coach', 9.5);
    if (pnlA({ t: '' }, t) && / (if|make|lose|made|lost|worth|profit|how much|move|moves|goes|go|up|down|calculate|what would) /.test(t)) set('pnl', 9.55);
    if ((/ (how much|whats|what is|price of|value of|worth) .*(gram|grams|kilo|kilos|kilogram|kg|pound of gold|ton of gold|bar of gold|gold bar|ounces of gold|troy ounces) /.test(t) || / (gram|grams|kilo|kilogram|kg) of gold /.test(t) || / \d+ (ounces|oz) of gold /.test(t)) && !/ (an|one|1|a) (troy )?(ounce|oz) of gold /.test(t)) set('goldvalue', 9.65);
    if (CONV.some(([re]) => re.test(t)) && / (in|to|into|convert|how many|how much|is|equals) /.test(t)) set('convert', 9.7);
    if (/ tip /.test(t) && /\d/.test(t)) set('tip', 9.4);
    if (/ (what time|what s the time|whats the time|time is it|current time|time) /.test(t) && / (in|at|over in) /.test(t) && CITY_RX.test(t) && !/ (new york|ny|nyc) /.test(t)) set('worldtime', 9.7);
    if (/ (whats the date|what is the date|whats today s date|todays date|what date is it|what day is it|what day is today|what is today|whats today|what day of the week|day of the week is it|what is tomorrow|what day is tomorrow|whats tomorrow|what was yesterday|what day was yesterday|leap year|week of the year|week number|what week is it|days left in the year|days until the end of the year|how many days left this year) /.test(t)) set('date', 9.5);
    if (/ (flip|toss) (a )?coin | coin (flip|toss) | heads or tails /.test(t)) set('coin', 9.8);
    if (/ (roll|throw) (a |the |two |2 |some )?(dice|die|d\d+) | roll a d\d+ | \d*d\d+ /.test(t) && !/ (should|trade|bias) /.test(t)) set('dice', 9.8);
    if (/ (random number|pick a number|give me a number|number between|choose a number|any number) /.test(t)) set('random', 9.8);
    if (/ (should i|do i|choose|pick|decide|which) /.test(t) && / or / .test(t) && !/ (buy|sell|long|short|bullish|bearish|up or down|higher or lower|trade|calls|puts|green or red|bull or bear) /.test(t) && / (eat|get|watch|go|wear|have|play|do|order|pick|choose|decide|between|cook|drink|buy a|visit|call|text|go with) /.test(t)) set('choose', 9.35);
    if (/ (magic 8 ball|8 ball|eight ball|yes or no) /.test(t)) set('ball', 9.6);
    if (/ (rock paper scissors|rock|paper|scissors) /.test(t) && / (rock paper scissors|play|rock|scissors) /.test(t) && !/ paper (trade|trading|account|position|balance|order) /.test(t) && !/ (buy|sell) /.test(t)) set('rps', / rock paper scissors | (rock|scissors) $/.test(t) || t.trim().split(' ').length <= 2 ? 9.6 : 0);
    if (/ (fun fact|random fact|tell me a fact|give me a fact|tell me something (interesting|cool|random|i dont know)|did you know|teach me something|interesting fact|another fact) /.test(t)) set('fact', 9.6);
    if (/ (riddle|brain teaser|puzzle me) /.test(t) || (lastRiddle && / (answer|give up|what is it|whats the answer) /.test(t))) set('riddle', 9.6);
    if (/ (would you rather|wyr) /.test(t)) set('wyr', 9.6);
    if (ABOUT.some(([re]) => re.test(t))) set('about', 8.95);
    if (WELL.some(([, re]) => re.test(t))) set('well', 9.05);
    return out;
  }
  function run(id, k, text) {
    const t = norm(text);
    switch (id) {
      case 'define': return defineA(k, t);
      case 'coach': return coachA(k, t);
      case 'pnl': return pnlA(k, t);
      case 'goldvalue': return goldValueA(k, t);
      case 'convert': return convertA(k, t);
      case 'tip': return tipA(k, t);
      case 'worldtime': return worldTimeA(k, t);
      case 'date': return dateA(k, t);
      case 'about': return aboutA(k, t);
      case 'well': return wellA(k, t);
      default: return funA(id, k, t);
    }
  }
  const NEEDS_GOLD = new Set(['goldvalue']);
  const vocab = [...new Set([...TERMS.map((x) => x[1]), ...[...COACH, ...WELL].map((x) => x[1].source), ...ABOUT.map((x) => x[0].source)].join('|').split(/[| ]/).filter((w) => /^[a-z]{4,}$/.test(w)))];
  return { score, run, NEEDS_GOLD, vocab, termFind: (s) => termFind(norm(s)) };
})();
