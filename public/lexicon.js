// ============================================================================
//  JARVIS word & sentence library (plain code, no AI).
//
//  How it works — like a combination lock where the digits can come in any order:
//   1. Every word or phrase belongs to a MEANING GROUP ("when", "bullish", "gold", "should", …).
//      Each group holds lots of ways people actually say it (slang and speech-to-text slips too).
//   2. A sentence is turned into the set of groups it contains. Order doesn't matter:
//      "when will gold stop being bullish", "bullish until when", "how long is price gonna stay bullish"
//      all become  {WHEN, GOLD, STOPV, BULL}.
//   3. RULES say which combination of groups means which question. The most specific match wins.
//  So a handful of rules covers thousands of sentences.
// ============================================================================
const Lex = (() => {
  // ---- 1. meaning groups --------------------------------------------------------------
  const W = {
    // question words
    WHEN: 'when|whens|what time|wat time|how soon|howlong|how much time|how much longer|how many hours|how many more hours|until when|till when|til when|by when|at what point|what point|what day|which day|any idea when|roughly when|about when|what hour',
    UNTIL: 'until|till|til|untill|up until|up to when',
    WHAT: 'what|whats|wat|wut|which|whatre|what is|what are',
    HOW: 'how|hows|howre|how is|how are|how was|hows it',
    WHERE: 'where|wheres|whereabouts',
    WHY: 'why|how come|whys|what made|what is making|whats making|what makes|reason|reasons|explain',
    IS: 'is|are|was|will|does|do|did|has|have|am',
    ANY: 'any|anything|got any|is there|are there|have any',
    SHOULD: 'should|shall|shld|shud|can i|could i|may i|do i|would you|wud you|would it be|is it smart|is it wise|is it worth|worth it|ok to|okay to|good idea|bad idea|good time|right time|time to|is now|now a good|allowed to|safe to|is it a good|is this a good|you think i should|do you think|would you recommend|recommend|advice|advise|green light|go time|smart to|wise to',
    WILL: 'will|would|going to|gonna|gunna|finna|bout to|about to|gon|expected to|likely to|might|could|may|is it going to|are we going to|do you think|you think|predict|prediction|expect',
    DOV: 'do|doing|does|did|act|move|go',
    STOPV: 'stop|stops|stopping|end|ends|ending|finish|finished|be over|over|done|quit|cool off|cool down|calm down|die down|fade|fades|run out|lose steam|losing steam|run out of steam|flip|flips|flipping|change|changes|changing|switch|switches|turn around|turns around|reverse|reverses|reversal|reversing|break down|no longer|not be|stop being|quit being|top out|bottom out|exhaust|exhausted|over with',
    STAYV: 'stay|stays|staying|remain|remains|remaining|keep|keeps|last|lasts|lasting|hold|holds|holding|continue|continues|still',
    // the market
    GOLD: 'gold|xau|xauusd|xau usd|goal|golds|price|prices|the market|market|markets|the chart|chart|charts|the metal|bullion|spot gold|ounce|xau dollar|gold dollar|the pair|this pair|price action',
    DOING: 'doing|up to|moving|movin|acting|looking|looking like|look like|looks like|behaving|going on|happening|playing out|shaping up|holding up|treating us|been doing|been up to|up to today|been like',
    BULL: 'bullish|bull|bulls|bully|bullsh|upside|higher|go higher|going higher|rise|rises|rising|rally|rallies|rallying|pump|pumps|pumping|moon|mooning|green|climb|climbs|climbing|go up|goes up|going up|move up|moves up|moving up|head up|heading up|push up|pushing up|uptrend|up trend|buyers|bid up|recover|recovering|bounce|bouncing|rip|ripping|run up|running up|breakout|break out|new highs|all time high|ath',
    BEAR: 'bearish|bear|bears|barish|bearsh|downside|lower|go lower|going lower|drop|drops|dropping|fall|falls|falling|dump|dumps|dumping|tank|tanks|tanking|crash|crashes|crashing|red|sink|sinks|sinking|go down|goes down|going down|move down|moves down|moving down|head down|heading down|push down|pushing down|downtrend|down trend|sellers|sell off|selloff|selling off|plunge|plunging|slide|sliding|bleed|bleeding|breakdown|new lows|pull back|pullback|pulling back|retrace|retracing|correction',
    BIAS: 'feel about|how do you feel about|think about|think of|thoughts about|bias|biased|biases|direction|lean|leaning|leans|sentiment|outlook|game plan|plan of attack|your read|the read|my read|your take|your call|your view|the view|the take|the call|take on|call on|read on|view on|thoughts on|feeling on|your opinion|opinion|your thoughts|thoughts on|which side|what side|side of the market|which way|what way|trend|trending|momentum|feel for the market|vibe of the market|market vibe|signal|signals',
    UPDOWN: 'up or down|down or up|higher or lower|lower or higher|bullish or bearish|bearish or bullish|buy or sell|sell or buy|buying or selling|selling or buying|long or short|short or long|longs or shorts|calls or puts|which way|what way|what direction|which direction|green or red|red or green|bull or bear|bear or bull|up down',
    BUY: 'buy|buys|buying|bought|long|longs|longing|go long|get long|buy in|buy it|buy gold|get in long|enter long|load up|take a buy|take a long|add to my buy|bid',
    SELL: 'sell|sells|selling|sold|short|shorting|go short|get short|enter short|take a sell|take a short|sell it|sell gold|fade it|short it',
    ENTER: 'get in|getting in|jump in|hop in|hop on|hop on a trade|jump on|get on|get on a trade|take one|take a trade|get a trade|catch a trade|catch a move|enter a trade|trade it|trade the open|scalp|scalp it|enter|entry|take a trade|take the trade|place a trade|pull the trigger|trade|trades|trading|take a position|get involved|ape in|send it|take a shot|play|plays|setup|setups|set up|opportunity|opportunities|entries|position|in the market|get into|be in',
    NOW: 'now|right now|rn|currently|at the moment|this moment|here|at this price|at these prices|today|this morning|this afternoon|this evening|yet|atm|immediately|asap|at this level|this second|as we speak',
    OPENT: 'when the market opens|when market opens|when markets open|when the markets open|when it opens|when it reopens|when gold opens|when the market reopens|market open|market opening|the open|at the open|on the open|for the open|into the open|opening|next session|next week|monday|sunday|tomorrow|tomorrow morning|tonight|later tonight|after the break|when it comes back|when trading starts|start of the week|when the session starts|when the session opens|asia open|asian open|when asia opens|when london opens|when new york opens|when ny opens|london open|new york open|ny open|first thing|over the weekend|weekend|next trading day|when we open|when it starts back',
    MARKETW: 'market|markets|gold market|gold|session|sessions|exchange|trading|forex|futures',
    OPENV: 'open|opens|opened|opening|reopen|reopens|start|starts|begin|begins|come back|comes back|back open|start back',
    CLOSEDW: 'closed|close|closes|closing|shut|shuts|off|weekend|break|halt',
    LEVEL: 'today is high|today is low|level|levels|support|supports|resistance|resistances|zone|zones|key levels|key prices|highs|lows|high of the day|low of the day|day high|day low|todays high|todays low|areas|line in the sand|floor|ceiling|round number|round numbers|big figure|liquidity|pivot|pivots|demand|supply',
    HOWFAR: 'how far|how high|how low|how much further|how much farther|how much more|how much lower|how much higher|where to|heading|headed|where is it going|where its going|where is price going|where is gold going|run to|drop to|fall to|next stop|end up|top out at|bottom out at|room to run|how much room|price target|target for today|daily target|where will it stop|where does it stop|where will price stop|stall|stalls|stalling',
    TP: 'take profit|take profits|taking profit|tp|tps|exit|exits|get out|cash out|close it out|bank it|secure profit|secure the bag|secure it|where to exit|where do i close|close the trade|lock in|lock it in|book profit|book it',
    SL: 'stop loss|stoploss|sl|stop out|stopped out|my stop|the stop|invalidation',
    NEWS: 'news|cpi|ppi|nfp|non farm|nonfarm|payrolls|jobs report|jobs data|fomc|fed|feds|federal reserve|powell|rate decision|rate cut|rate hike|interest rate|interest rates|economic calendar|calendar|red folder|red folders|high impact|data|data release|data today|announcement|gdp|unemployment|jobless claims|claims|pmi|ism|retail sales|inflation|press conference|speech|minutes|events|event',
    MYTRADE: 'my trade|my trades|my position|my positions|our trade|our position|my buy|my sell|my long|my short|this trade|my order|my entry|the position|the trade im in|the trade i am in|trade im in|im in a trade|i am in a trade|im in a buy|im in a sell|i am long|i am short|im long|im short',
    YOURTRADE: 'your trade|your trades|your position|your positions|you trade|you trading|you take|you took|did you trade|did you take|have you traded|jarvis trade|jarvis trades|jarvis s trade|jarviss trade|you in a trade|are you in|you get in|your pnl|your p l|your p and l|your profit|you make|you made|you lose|you lost|your win|your record|your stats|your account|your buy|your sell|bot trade|the bot',
    SAFE: 'safe|safely|valid|invalid|invalidate|invalidated|wrong|kill|kills|killed|ruin|ruins|risk|risky|danger|in danger|trouble|worried|good for|still good|still valid|work|working|hold up|survive',
    PRICEW: 'price|priced|tradingat|sitting at|at|cost|costs|worth|quote|quoted|number|value|rate|ticker|spot',
    HOWMUCH: 'how much|whats|what is|where is|wheres|check|give me|tell me|show me|pull up|read me',
    BEST: 'best|good|better|ideal|optimal|right|perfect|prime|top|ideal|smartest|safest',
    TIMEW: 'time|times|hour|hours|session|sessions|window|windows|part of the day|time of day|o clock',
    RECAP: 'catch me up|fill me in|what did i miss|recap|run it down|rundown|run down|update me|give me an update|quick update|whats new|what is new|whats the latest|the latest|status report|sitrep|brief me|summary|summarize|overview|lay of the land|lowdown|the scoop|the tea',
    // life
    WATERW: 'water|h2o|hydrate|hydrated|hydrating|hydration|agua',
    GLASSU: 'glass|glasses|cup|cups|bottle|bottles|ounce|ounces|oz|liter|liters|litre|litres|gallon|jug|tumbler|stanley|hydro flask|hydroflask|refill',
    DRINKV: 'drank|drink|drinking|drunk|had|have had|chugged|chug|downed|finished|sipped|sip|log|logged|add|count|track|put down|record|note|mark|another|one more',
    OTHERDRINK: 'coffee|tea|soda|beer|wine|juice|milk|liquor|vodka|whiskey|energy drink|monster|red bull|protein shake|shake|smoothie|lemonade',
    SLEEPW: 'sleep|sleeping|bed|bedtime|bed time|go to bed|go to sleep|get to bed|get in bed|knock out|crash out|hit the hay|hit the sack|lay down|lie down|nap|turn in|call it a night|pass out',
    WAKEW: 'wakeup|wake up|wake|waking|woke|get up|getting up|up at|up by|be up|be awake|alarm|alarm for|rise and shine|wake time|out of bed',
    REMINDW: 'remind|reminder|reminders|dont let me forget',
    WEATHERW: 'forecast|weather|wether|outside|out side|temperature|temp|temps|rain|raining|rainy|snow|snowing|sunny|sun out|cloudy|windy|cold|hot|warm|chilly|freezing|humid|humidity|umbrella|degrees|storm|stormy|thunder|sky|nice out|nice day|heat|feels like outside|forecast today|forecast for today|forecast tomorrow',
    WEARW: 'wear|wearing|outfit|outfits|dress|dressed|put on|clothes|clothing|fit check|layers|hoodie|sweater|jacket|coat|shorts or pants|pants or shorts|tshirt|t shirt|long sleeve',
    HABITW: 'habit|habits|streak|streaks|routine tracker|daily goal|daily goals',
    TODOW: 'to do list|my to do|the to do|on my to do|todo|to dos|todos|task|tasks|chores|checklist|my list|the list|shopping list|grocery list|errands',
    MONEYW: 'spent|spend|spending|paid|pay|bought|cost me|expenses|expense|budget|money|dollars|bucks|cash',
    TIMERW: 'timer|timers|countdown timer|set an alarm|alarm for|minutes from now|stopwatch',
    COUNTW: 'countdown|countdowns|days until|days till|days til|how many days|how long until|how long till|how many sleeps|days left|weeks until',
    MEMW: 'remember|remembered|memorize|dont forget|do not forget|keep in mind|note that|make a note|save this|what did i tell you|recall',
    MORNINGW: 'morning routine|morning briefing|morning brief|morning rundown|morning report|start my day|start the day|daily briefing|daily brief|good morning routine|wake up routine|what is my day|whats my day|my day looking|day look like',
    VIBEW: 'vibe|vibes|vibe check|energy today|energy tonight|mood of the day|kind of day|what kinda day|feel of the day',
    BOOKW: 'book|books|novel|novels|read|reading|audiobook|audiobooks',
    MOVIEW: 'movie|movies|film|films|show|shows|series|netflix|tv|watch|watching|binge|hulu|anime|documentary|documentaries',
    FOODW: 'eat|eating|food|dinner|lunch|breakfast|snack|hungry|starving|cook|cooking|meal|meals|recipe|order out|takeout',
    SUGGEST: 'any|recommend|recommendation|recommendations|suggest|suggestion|suggestions|ideas|idea|good|what should|give me|got any|something to|need a|need something|options|top|best',
  };

  // ---- 2. rules: which combination means which question ---------------------------------
  // all: every listed slot must be present (a slot "A|B" means A or B); not: none may be present.
  // dir: works out bullish (+1) / bearish (−1) when it matters.
  const R = [
    // —— bias & direction ——
    { id: 'openBias', s: 9.05, all: ['OPENT', 'BIAS|UPDOWN|BULL|BEAR'], not: ['MYTRADE', 'YOURTRADE', 'HOWFAR', 'TP', 'SL', 'NEWS', 'WEATHERW', 'VIBEW'] },
    { id: 'openBias', s: 9.0, all: ['OPENT', 'WHAT', 'GOLD', 'WILL|DOFUT|DOING'], not: ['MYTRADE', 'YOURTRADE', 'NEWS', 'WEATHERW', 'QUOTEME', 'HOWFAR'] },
    { id: 'openBias', s: 8.95, all: ['OPENT', 'SHOULD', 'BUY|SELL|UPDOWN'], not: ['MYTRADE', 'YOURTRADE'] },
    { id: 'openTrade', s: 9.4, all: ['OPENT', 'SHOULD|WILL|ANY|PLANW', 'ENTER|BUY|SELL'], not: ['MYTRADE', 'YOURTRADE', 'TP', 'SL', 'UPDOWN'] },
    { id: 'openTrade', s: 9.3, all: ['OPENT', 'PLANW'], not: ['MYTRADE', 'YOURTRADE', 'TODOW', 'WEATHERW', 'SLEEPW', 'FOODW'] },
    { id: 'biasUntil', s: 8.95, all: ['WHEN|UNTIL', 'BULL|BEAR'], not: ['MYTRADE', 'YOURTRADE', 'NEWS', 'HOWFAR', 'TP', 'OPENT', 'BUY', 'SELL', 'WAKEW', 'SLEEPW'] },
    { id: 'biasUntil', s: 8.92, all: ['IS', 'BULL|BEAR', 'STOPV'], not: ['MYTRADE', 'YOURTRADE', 'HOWFAR', 'BUY', 'SELL', 'NEWS', 'TP', 'OPENT'] },
    { id: 'biasUntil', s: 8.9, all: ['WHEN|UNTIL', 'STOPV|STAYV', 'BIAS'], not: ['MYTRADE', 'YOURTRADE', 'NEWS'] },
    { id: 'biasUntil', s: 8.85, all: ['WILL', 'GOLD', 'STAYV', 'BULL|BEAR'], not: ['MYTRADE', 'HOWFAR', 'BUY', 'SELL'] },
    { id: 'biasUntil', s: 8.85, all: ['WILL', 'GOLD', 'STOPV', 'BULL|BEAR'], not: ['MYTRADE', 'HOWFAR', 'BUY', 'SELL'] },
    { id: 'bias', s: 8.6, all: ['UPDOWN'], not: ['MYTRADE', 'YOURTRADE', 'OPENT', 'WHEN', 'HOWFAR'] },
    { id: 'bias', s: 8.4, all: ['WHAT|HOW|IS|GIVE', 'BIAS'], not: ['MYTRADE', 'YOURTRADE', 'OPENT', 'WHEN', 'UNTIL', 'WHY', 'HOWFAR'] },
    { id: 'bias', s: 8.28, all: ['WHAT', 'GOLD', 'DOFUT'], not: ['DOING', 'PAST', 'OPENT', 'WHEN', 'MYTRADE', 'YOURTRADE', 'HOWFAR', 'RECAP'] },
    { id: 'bias', s: 8.3, all: ['WHAT', 'GOLD', 'WILL', 'DOV'], not: ['OPENT', 'WHEN', 'MYTRADE', 'YOURTRADE', 'HOWFAR'] },
    { id: 'bias', s: 8.25, all: ['IS', 'WEUS', 'BULL|BEAR'], not: ['WHY', 'WHEN', 'UNTIL', 'HOWFAR', 'MYTRADE', 'YOURTRADE', 'OPENT', 'STOPV', 'STAYV', 'HOWMUCH'] },
    { id: 'bias', s: 8.2, all: ['WILL', 'GOLD', 'BULL|BEAR'], not: ['WHY', 'WHEN', 'UNTIL', 'HOWFAR', 'MYTRADE', 'YOURTRADE', 'OPENT', 'STOPV', 'STAYV'] },
    { id: 'why', s: 8.5, all: ['WHY', 'GOLD|BIAS|BULL|BEAR'], not: ['MYTRADE', 'YOURTRADE', 'NEWS'] },
    // —— what's price doing / price ——
    { id: 'day', s: 8.3, all: ['WHAT|HOW', 'GOLD', 'DOING'], not: ['OPENT', 'BIAS', 'UPDOWN', 'YOURTRADE', 'MYTRADE', 'NEWS', 'WEATHERW', 'WILL', 'HOWFAR', 'WHY'] },
    { id: 'day', s: 8.2, all: ['RECAP'], not: ['YOURTRADE', 'MYTRADE', 'NEWS', 'WEATHERW', 'MORNINGW', 'OPENT'] },
    { id: 'day', s: 7.9, all: ['HOW', 'GOLD', 'NOW'], not: ['OPENT', 'BIAS', 'YOURTRADE', 'MYTRADE', 'NEWS', 'WEATHERW', 'PRICEW', 'HOWMUCH', 'WILL'] },
    { id: 'price', s: 8.25, all: ['HOWMUCH|WHAT|WHERE', 'GOLD', 'PRICEW|NOW'], not: ['DOING', 'BIAS', 'UPDOWN', 'LEVEL', 'TP', 'SL', 'HOWFAR', 'MYTRADE', 'YOURTRADE', 'OPENT', 'NEWS', 'WILL', 'WHY', 'BULL', 'BEAR', 'ENTER'] },
    { id: 'price', s: 8.0, all: ['GOLD', 'PRICEW'], not: ['DOING', 'BIAS', 'UPDOWN', 'LEVEL', 'TP', 'SL', 'HOWFAR', 'MYTRADE', 'YOURTRADE', 'OPENT', 'NEWS', 'WILL', 'WHY', 'BULL', 'BEAR', 'SHOULD', 'BUY', 'SELL', 'ENTER', 'WHEN'] },
    // —— should I buy / sell / trade ——
    { id: 'trade', s: 8.7, all: ['SHOULD', 'BUY'], not: ['SELL', 'MYTRADE', 'YOURTRADE', 'OPENT', 'TP', 'WHEN', 'MONEYW'] },
    { id: 'trade', s: 8.7, all: ['SHOULD', 'SELL'], not: ['BUY', 'MYTRADE', 'YOURTRADE', 'OPENT', 'TP', 'WHEN'] },
    { id: 'trade', s: 8.3, all: ['IS', 'GOOD', 'BUY|SELL'], not: ['MYTRADE', 'YOURTRADE', 'OPENT', 'UPDOWN'] },
    { id: 'timing', s: 8.6, all: ['WHEN', 'SHOULD|BEST', 'ENTER|BUY|SELL'], not: ['MYTRADE', 'YOURTRADE', 'NEWS', 'TP'] },
    { id: 'timing', s: 8.4, all: ['WHAT', 'BEST', 'TIMEW'], not: ['MYTRADE', 'YOURTRADE', 'SLEEPW', 'WAKEW', 'FOODW'] },
    { id: 'tradenow', s: 8.35, all: ['SHOULD', 'ENTER'], not: ['BUY', 'SELL', 'MYTRADE', 'YOURTRADE', 'WHEN', 'OPENT', 'TP', 'SL', 'NEWS'] },
    { id: 'tradenow', s: 8.2, all: ['ANY', 'ENTER', 'NOW'], not: ['MYTRADE', 'YOURTRADE', 'NEWS'] },
    // —— where does it go / levels / targets ——
    { id: 'reach', s: 9.1, all: ['HITV', 'NUMBIG|HILO'], not: ['MYTRADE', 'YOURTRADE', 'TP', 'SL', 'REMINDW', 'TIMERW', 'MONEYW'] },
    { id: 'reach', s: 8.9, all: ['WILL|IS|SHOULD', 'HITV', 'GOLD'], not: ['MYTRADE', 'YOURTRADE', 'TP', 'SL', 'BIAS', 'UPDOWN', 'OPENT'] },
    { id: 'manage', s: 9.3, all: ['SHOULD|WHEN|WHAT', 'CLOSEV', 'MYTRADE'], not: ['YOURTRADE'] },
    { id: 'manage', s: 9.2, all: ['SHOULD', 'CLOSEV', 'IT'], not: ['YOURTRADE', 'MARKETW', 'GOLD', 'WEATHERW', 'TODOW', 'TIMERW'] },
    { id: 'tradenow', s: 9.1, all: ['GOODDAY'], not: ['MYTRADE', 'YOURTRADE', 'OPENT'] },
    { id: 'biasUntil', s: 8.8, all: ['WHEN', 'GOLD|IT', 'STOPV'], not: ['MYTRADE', 'YOURTRADE', 'HOWFAR', 'NEWS', 'OPENT', 'TIMERW', 'SLEEPW', 'COUNTW', 'TP', 'SL', 'WEATHERW'] },
    { id: 'weather', s: 8.8, all: ['IS|WILL', 'NICEW'], not: ['GOLD', 'MARKETW', 'BIAS', 'MYTRADE', 'YOURTRADE', 'FOODW', 'MOVIEW', 'BOOKW', 'WEARW'] },
    { id: 'tradenow', s: 9.0, all: ['SHOULD|WILL', 'SITOUT'], not: ['MYTRADE', 'YOURTRADE', 'OPENT'] },
    { id: 'dayplan', s: 8.9, all: ['MOVEQ'], not: ['GOLD', 'BIAS', 'BULL', 'BEAR', 'MARKETW'] },
    { id: 'life:sleep', s: 9.2, all: ['WOKE'], not: ['WHEN', 'SHOULD', 'CLOCKT'] },
    { id: 'life:habit', s: 9.25, all: ['PAST', 'HABITACT'], not: ['GOLD', 'MYTRADE'] },
    { id: 'stall', s: 8.35, all: ['WHERE', 'GOLD', 'STOPV|GOW'], not: ['MYTRADE', 'TP', 'SL', 'YOURTRADE', 'OPENT', 'WEATHERW'] },
    { id: 'levels', s: 9.5, all: ['LEVEL', 'WATCHV'], not: ['MYTRADE', 'YOURTRADE'] },
    { id: 'levels', s: 8.2, all: ['WHERE|WHAT|HOWMUCH', 'HILO'], not: ['MYTRADE', 'YOURTRADE', 'WEATHERW', 'HOWFAR'] },
    { id: 'price', s: 9.6, all: ['QUOTEME', 'GOLD'], not: ['MYTRADE', 'YOURTRADE', 'OPENT'] },
    { id: 'timing', s: 9.35, all: ['BEST', 'TIMEW', 'ENTER'], not: ['MYTRADE', 'YOURTRADE', 'SLEEPW', 'NOWGOOD'] },
    { id: 'tradenow', s: 8.6, all: ['NOWGOOD', 'ENTER'], not: ['BUY', 'SELL', 'MYTRADE', 'YOURTRADE', 'OPENT'] },
    { id: 'weather', s: 9.6, all: ['UMB'], not: [] },
    { id: 'session', s: 9.15, all: ['SESSNAME', 'SESSV|WHEN|IS'], not: ['BIAS', 'UPDOWN', 'BULL', 'BEAR', 'WILL', 'DOING', 'MYTRADE', 'YOURTRADE', 'HOWFAR', 'BUY', 'SELL', 'ENTER', 'WEATHERW', 'TIMEZ'] },
    { id: 'sessions', s: 9.0, all: ['WHAT|WHICH|ANY', 'SESSWHICH'], not: ['SESSNAME', 'BIAS', 'MYTRADE'] },
    { id: 'life:money', s: 9.75, all: ['MONEYQ'], not: ['SUBW', 'GOLD', 'MYTRADE', 'YOURTRADE', 'WATERW', 'TIMERW'] },
    { id: 'life:money', s: 9.8, all: ['MONEYQ', 'BUDGETW'], not: ['GOLD'] },
    { id: 'life:subs', s: 9.7, all: ['SUBW'], not: ['MONEYQ', 'GOLD', 'TIMERW', 'WATERW', 'HABITW', 'MYTRADE', 'YOURTRADE', 'REMINDW', 'NEWS'] },
    { id: 'life:subs', s: 9.7, all: ['DUEW'], not: ['GOLD', 'NEWS', 'TODOW', 'REMINDW'] },
    { id: 'help', s: 9.2, all: ['HELPQ'], not: [] },
    { id: 'stall', s: 8.3, all: ['HOWFAR'], not: ['MYTRADE', 'TP', 'SL', 'YOURTRADE', 'WEATHERW', 'TIMERW', 'COUNTW'] },
    { id: 'levels', s: 8.1, all: ['WHERE|WHAT|ANY|HOWMUCH|IS', 'LEVEL'], not: ['SL', 'TP', 'MYTRADE', 'HOWFAR', 'WEATHERW', 'YOURTRADE'] },
    { id: 'tpq', s: 8.45, all: ['WHERE|WHEN|SHOULD|WHAT|HOW', 'TP'], not: ['YOURTRADE'] },
    { id: 'safe', s: 8.75, all: ['WHEN|UNTIL', 'BUY|SELL', 'SAFE|STAYV|STOPV'], not: ['YOURTRADE', 'OPENT'] },
    { id: 'safe', s: 8.7, all: ['MYTRADE', 'SAFE'], not: ['YOURTRADE', 'TP'] },
    // —— news, market hours ——
    { id: 'news', s: 8.3, all: ['ANY|WHAT|WHEN|IS', 'NEWS'], not: ['YOURTRADE', 'WEATHERW'] },
    { id: 'news', s: 7.6, all: ['NEWS'], not: ['YOURTRADE', 'WEATHERW'] },
    { id: 'market', s: 8.4, all: ['WHEN|IS|WHAT', 'MARKETW', 'OPENV|CLOSEDW'], not: ['BIAS', 'BULL', 'BEAR', 'UPDOWN', 'BUY', 'SELL', 'OPENT', 'DOING', 'WILL', 'MYTRADE', 'YOURTRADE'] },
    // —— trades ——
    { id: 'life:bot', s: 9.0, all: ['YOURTRADE'], not: ['MYTRADE'] },
    { id: 'paperStatus', s: 8.35, all: ['HOW|IS|WHAT|WHERE', 'MYTRADE'], not: ['YOURTRADE', 'TP', 'SL', 'SAFE'] },
    // —— life ——
    { id: 'life:water', s: 9.7, all: ['WATERW'], not: ['WEATHERW', 'OTHERDRINK'] },
    { id: 'life:water', s: 9.5, all: ['DRINKV', 'GLASSU'], not: ['OTHERDRINK', 'WEATHERW'] },
    { id: 'life:water', s: 9.4, all: ['HOWMUCH', 'GLASSU'], not: ['OTHERDRINK', 'WEATHERW', 'GOLD'] },
    { id: 'life:sleepQ', s: 9.1, all: ['WHEN|WHAT|SHOULD', 'SLEEPW'], not: ['WEATHERW'] },
    { id: 'life:sleepQ', s: 9.35, all: ['WAKEW', 'CLOCKT'], not: ['WEATHERW', 'TIMERW', 'BULL', 'BEAR', 'GOLD', 'MARKETW', 'REMINDW'] },
    { id: 'life:sleepQ', s: 9.0, all: ['WHEN|SHOULD', 'WAKEW'], not: ['WEATHERW', 'TIMERW', 'BULL', 'BEAR'] },
    { id: 'weather', s: 8.7, all: ['WEATHERW'], not: ['WEARW', 'GOLD', 'NEWS', 'BIAS', 'VIBEW'] },
    { id: 'life:wear', s: 9.4, all: ['WEARW'], not: ['GOLD', 'BIAS'] },
    { id: 'life:habit', s: 9.25, all: ['HABITW'], not: [] },
    { id: 'life:todo', s: 9.0, all: ['TODOW'], not: ['HABITW', 'NEWS'] },
    { id: 'life:countdown', s: 9.0, all: ['COUNTW'], not: ['GOLD', 'OPENT', 'MARKETW', 'TIMERW'] },
    { id: 'life:timer', s: 9.0, all: ['TIMERW'], not: [] },
    { id: 'life:memory', s: 8.9, all: ['MEMW'], not: ['TODOW'] },
    { id: 'life:morning', s: 9.0, all: ['MORNINGW'], not: ['GOLD', 'BIAS'] },
    { id: 'life:vibe', s: 9.0, all: ['VIBEW'], not: ['BIAS'] },
    { id: 'life:books', s: 8.8, all: ['SUGGEST|WHAT|ANY', 'BOOKW'], not: ['MOVIEW', 'GOLD', 'BIAS', 'NEWS'] },
    { id: 'life:movies', s: 8.8, all: ['SUGGEST|WHAT|ANY', 'MOVIEW'], not: ['GOLD', 'BIAS', 'NEWS', 'TIMERW'] },
    { id: 'life:food', s: 8.6, all: ['SUGGEST|WHAT|SHOULD', 'FOODW'], not: ['GOLD', 'MONEYW'] },
  ];
  // a couple of tiny helper groups used by rules
  W.QUOTEME = 'quote me|quote on|quote for|price check|whats the price|what is the price';
  W.GOW = 'going|go|goes|headed|heading|move|moving|run|go next';
  W.HILO = 'today is high|today is low|the high|the low|todays high|todays low|high of day|low of day|hod|lod|high today|low today|day high|day low|weekly high|weekly low|yesterdays high|yesterdays low';
  W.WATCHV = 'watch|watching|keep an eye on|eye on|look at|looking at|focus on|care about|pay attention to';
  W.DOFUT = 'do|gonna do|going to do|will do|gon do|finna do';
  W.PAST = 'did|was|were|had|yesterday|last week|earlier';
  W.WEUS = 'we|gold|price|it|the market|market|xau';
  W.NOWGOOD = 'is it a good time|is now a good time|good time to|right time to|is this a good time|is it the right time';
  W.HELPQ = 'what can you do|what do you do|what are you able to do|what can i ask|what can i say|what can i ask you|how do i use you|what are your features|your features|what are your commands|list of commands|what do you know how to do';
  W.PLANW = 'plan|game plan|gameplan|strategy|approach|play|playbook|setup|setups|what am i looking for|what to look for|look for';
  W.CLOCKT = '1|2|3|4|5|6|7|8|9|10|11|12|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|midnight';
  W.HITV = 'hit|hits|reach|reaches|get to|gets to|touch|touches|tag|tags|see|break|breaks|break above|break below|take out|takes out|make it to|go to|run to|drop to|fall to|test|tests|retest|revisit|come back to|get back to|trade at|trade above|trade below';
  W.NUMBIG = '1[0-9]{3}|[2-9][0-9]{3}|[1-9][0-9]{3}\\.[0-9]+';
  W.CLOSEV = 'close|closing|exit|get out|cut|cut it|take it off|bail|secure|hold|keep|let it run|stay in|ride';
  W.SITOUT = 'sit out|sit this out|sit it out|stay out|stay away|take the day off|skip today|skip trading|not trade|avoid trading|stay flat|be flat';
  W.MOVEQ = 'whats the move|what is the move|whats the wave|what are we doing|whats good tonight|whats the plan tonight|what is the plan tonight';
  W.WOKE = 'just woke up|i woke up|woke up|im up|i am up|just got up|i got up|im awake|i am awake|just got out of bed';
  W.HABITACT = 'work out|workout|worked out|gym|read|meditate|journal|walk|run|stretch|pray|study';
  W.GOODDAY = 'good day to trade|good time to trade|good day for trading|a day to trade|day to trade|good day for a trade';
  W.NICEW = 'nice|nice out|beautiful|cold|hot|warm|chilly|freezing|rainy|sunny|cloudy|windy|humid|gloomy';
  W.DUEW = 'anything due|any bills|any bills due|bills coming up|whats due|what is due|bills due|bill due|due this week|due soon|due today|due tomorrow|payments due|my bills|upcoming bills|upcoming payments';
  W.SESSNAME = 'asia|asian|tokyo|japan|london|uk|europe|european|ldn|new york|newyork|ny|nyc|us session|american session|sydney';
  W.SESSV = 'start|starts|starting|begin|begins|kick off|kicks off|open|opens|opening|close|closes|closing|end|ends|ending|finish|finishes|over|done|session|sessions|time|hours|come in|comes in|get going|live|active|on';
  W.SESSWHICH = 'session are we in|session is it|session is open|sessions are open|session right now|session now|sessions open|session we in|what session|which session|current session';
  W.TIMEZ = 'time is it in|time in|whats the time in|clock in';
  W.MONEYQ = 'biggest expense|biggest expenses|my expenses|expenses|spending|spent|budget|budgets|money tracker|how much money';
  W.SUBW = 'subscription|subscriptions|membership|memberships|monthly|a month|per month|every month|yearly|a year|per year|every year|annual';
  W.BUDGETW = 'budget|budgets';
  W.UMB = 'umbrella|raincoat|rain jacket|rain boots';
  W.GIVE = 'give me|tell me|show me|whats|what is|update';
  W.GOOD = 'good|great|nice|solid|decent|clean|smart';

  // ---- 3. matcher ----------------------------------------------------------------------------
  // phrases squashed into one token first, so their words don't trigger other groups ("how long" ≠ "go long")
  W.IT = 'it|this|that|this trade|this one';
  const PRE = [[/ how long /g, ' howlong '], [/ as long as /g, ' aslongas '], [/ (a )?long (day|time|week|night|run|way) /g, ' longtime '], [/ so long /g, ' solong '], [/ short (term|time|while|walk|story) /g, ' shorttime '], [/ in short /g, ' inshort '], [/ trading at /g, ' tradingat '], [/ (sitting|sits|sat) at /g, ' tradingat '], [/ sell(ing)? offs? /g, ' selloff '], [/ can not /g, ' cant '], [/ do not /g, ' dont '], [/ did not /g, ' didnt '], [/ will not /g, ' wont '], [/ is not /g, ' isnt '], [/ was not /g, ' wasnt '], [/ losing streak /g, ' losingstreak '], [/ short squeeze /g, ' squeeze '], [/ long story short /g, ' storyshort ']];
  const norm = (s) => {
    let t = ' ' + String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    for (const [re, to] of PRE) t = t.replace(re, to);
    return t;
  };
  const RX = {};
  for (const [k, v] of Object.entries(W)) {
    const alts = v.split('|').map((x) => x.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
    RX[k] = new RegExp(' (?:' + alts.join('|') + ') ');
  }
  function tags(text) {
    const t = norm(text), out = new Set();
    for (const [k, re] of Object.entries(RX)) if (re.test(t)) out.add(k);
    return out;
  }
  function score(text) {
    const T = tags(text), S = {};
    for (const r of R) {
      if (!r.all.every((slot) => slot.split('|').some((g) => T.has(g)))) continue;
      if (r.not.some((g) => T.has(g))) continue;
      const v = r.s + r.all.length * 0.01;
      if (v > (S[r.id] || 0)) S[r.id] = v;
    }
    // feelings: a sentence or a whole paragraph about how you are
    const m = mood(text);
    if (m.hits.length && m.first) {
      const question = /^ ?(what|when|how|where|why|should|can|could|would|will|is|are|do|does|did|which|who) /.test(norm(text)) || T.has('SHOULD');
      const v = question ? 5.5 : m.words >= 9 && m.hits.length >= 2 ? 9.3 : m.hits.length >= 2 ? 8.8 : 7.2;
      if (v > (S['life:mood'] || 0)) S['life:mood'] = v;
    }
    return S;
  }
  // +1 bullish / −1 bearish / 0 unknown (for "when will it be bullish", "how far can it drop" …)
  function dir(text) {
    const t = norm(text);
    const b = RX.BULL.test(t), s = RX.BEAR.test(t);
    if (b && !s) return 1;
    if (s && !b) return -1;
    if (b && s) { const i = t.search(RX.BULL), j = t.search(RX.BEAR); return i < j ? 1 : -1; }
    return 0;
  }
  // +1 buy / −1 sell / 0
  function side(text) {
    const t = norm(text), b = RX.BUY.test(t), s = RX.SELL.test(t);
    return b && !s ? 1 : s && !b ? -1 : 0;
  }

  // ---- 4. feelings: understands a whole paragraph ----------------------------------------------
  // Each feeling word adds or takes away points. "not", "never", "don't" flip the next few words.
  const POS = 'great|amazing|awesome|fantastic|incredible|excellent|wonderful|good|happy|glad|grateful|thankful|blessed|excited|pumped|hyped|motivated|focused|productive|energized|energetic|confident|proud|calm|relaxed|peaceful|chill|rested|refreshed|fresh|strong|lucky|love|loved|loving|enjoy|enjoyed|enjoying|fun|nice|better|best|well|fine|okay|ok|alright|decent|solid|content|optimistic|hopeful|inspired|accomplished|winning|won|crushed it|killed it|nailed it|on fire|vibing|good mood|great mood|smiling|laughing|lit|fire|dope|sick day|cooking|locked in|dialed in|on point'.split('|');
  const NEG = 'bad|terrible|awful|horrible|sad|down|depressed|upset|unhappy|miserable|lonely|tired|exhausted|drained|sleepy|burnt out|burned out|burnout|stressed|stressing|stress|anxious|anxiety|nervous|worried|worry|scared|afraid|overwhelmed|frustrated|annoyed|irritated|angry|mad|pissed|furious|hurt|sick|ill|lazy|unmotivated|bored|stuck|lost|confused|hopeless|defeated|discouraged|disappointed|rough|hard|tough|struggling|struggle|sucks|sucked|trash|garbage|meh|blah|off|not great|not good|could be better|losing|lost money|blew|blown|failed|fail|failing|behind|broke|heartbroken|crying|cried|pain|hurting|headache|grumpy|cranky|moody|restless|insomnia|cant sleep|couldnt sleep|rough day|bad day|long day|hate'.split('|');
  const FLIP = /^(not|never|dont|didnt|isnt|wasnt|arent|cant|couldnt|wont|no|nothing|hardly|barely|aint)$/;
  const TOPICS = {
    trading: 'trade|trades|trading|chart|charts|market|gold|loss|losses|stopped out|stop loss|funded|prop|account|pnl|entry|win|setup',
    work: 'work|job|boss|shift|coworker|coworkers|office|meeting|meetings|deadline|project|client|clients|school|class|homework|exam|test|teacher',
    sleep: 'sleep|slept|tired|exhausted|nap|insomnia|bed|woke|wake',
    body: 'gym|workout|worked out|sore|lifted|run|ran|training|exercise|sick|ill|headache|hurt|pain',
    people: 'friend|friends|family|mom|dad|brother|sister|girlfriend|boyfriend|wife|husband|partner|kids|son|daughter|people|relationship|breakup|date',
    money: 'money|bills|rent|broke|paid|paycheck|debt|spent|budget|cash|car payment',
  };
  function mood(text) {
    const words = norm(text).trim().split(' ');
    const t = ' ' + words.join(' ') + ' ';
    let score = 0, hits = [], flipLeft = 0;
    for (let i = 0; i < words.length; i++) {
      if (FLIP.test(words[i])) { flipLeft = 3; continue; }
      let found = null;
      for (const n of [3, 2, 1]) {
        const ph = words.slice(i, i + n).join(' ');
        if (n > 1 && words.length < i + n) continue;
        if (POS.includes(ph)) { found = { w: ph, v: 1, n }; break; }
        if (NEG.includes(ph)) { found = { w: ph, v: -1, n }; break; }
      }
      if (found) {
        let v = found.v;
        if (flipLeft > 0) { v = -v * 0.8; found.w = 'not ' + found.w; }
        if (i > 0 && /^(so|really|very|super|extremely|mad|hella|too|pretty|kinda)$/.test(words[i - 1])) v *= 1.4;
        score += v; hits.push(found.w); i += found.n - 1; flipLeft = 0; continue;
      }
      if (flipLeft > 0) flipLeft--;
    }
    if (/\b(but|though|however|anyway|still)\b/.test(t) && hits.length > 1) score += 0.2; // ends on a turn — usually hopeful
    const topics = Object.entries(TOPICS).filter(([, v]) => new RegExp(' (?:' + v + ') ').test(t)).map(([k]) => k);
    const first = / (i|im|i am|ive|i was|my|me|today|this morning|tonight|feeling|feel|felt) /.test(t);
    return { score, hits, topics, first, words: words.length };
  }

  // When no rule matched: pick an answer from the strongest topic you mentioned, so JARVIS replies
  // about the right thing instead of "I didn't catch that".
  const TOPIC = [['MYTRADE', 'paperStatus'], ['YOURTRADE', 'life:bot'], ['OPENT+GOLD', 'openBias'], ['UPDOWN', 'bias'], ['BIAS', 'bias'], ['BULL', 'bias'], ['BEAR', 'bias'], ['NEWS', 'news'], ['LEVEL', 'levels'], ['HOWFAR', 'stall'], ['TP', 'tpq'], ['BUY', 'trade'], ['SELL', 'trade'], ['ENTER', 'tradenow'], ['GOLD', 'day'], ['WATERW', 'life:water'], ['SLEEPW', 'life:sleepQ'], ['WAKEW', 'life:sleepQ'], ['WEARW', 'life:wear'], ['WEATHERW', 'weather'], ['HABITW', 'life:habit'], ['TODOW', 'life:todo'], ['MONEYW', 'life:money'], ['TIMERW', 'life:timer'], ['COUNTW', 'life:countdown'], ['MORNINGW', 'life:morning'], ['VIBEW', 'life:vibe'], ['FOODW', 'life:food'], ['MOVIEW', 'life:movies'], ['BOOKW', 'life:books'], ['MEMW', 'life:memory'], ['RECAP', 'day']];
  function topic(text) {
    const T = tags(text);
    for (const [need, id] of TOPIC) if (need.split('+').every((g) => T.has(g))) return id;
    return null;
  }

  const vocab = [...new Set(Object.values(W).join('|').split(/[| ]/).filter((w) => /^[a-z]{4,}$/.test(w)))];
  return { tags, score, dir, side, mood, topic, vocab, norm, RULES: R };
})();
