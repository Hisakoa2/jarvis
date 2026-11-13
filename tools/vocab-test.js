// Vocabulary test: fires thousands of sentence combinations at JARVIS's brain and checks each one
// lands on the right answer. Run:  node tools/vocab-test.js      (add -v to list every failure)
// Templates use {a|b|c} — every combination is generated, like a combination lock.
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
const store = new Map();
const sb = {
  console, Intl, Date, Math, JSON, setTimeout, clearTimeout, URLSearchParams, AbortSignal,
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  fetch: async () => ({ ok: false, json: async () => null }),
  document: { hidden: true }, window: {},
};
vm.createContext(sb);
for (const f of ['sessions.js', 'bias-rules.js', 'paper.js', 'reminders.js', 'lexicon.js', 'extras.js', 'brain.js', 'life.js']) {
  vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8') + `\n;globalThis.__x = 1;`, sb, { filename: f });
}
// expose the IIFE consts
const B = vm.runInContext('({ Brain, Life, Lex, Paper })', sb);
const sessions = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'sessions.json'), 'utf8'));
const ctx = { tz: 'America/New_York', title: 'sir', sessions, projects: [], gold: () => null, paper: B.Paper, riskPct: 1 };
// an open paper trade, so partial-close and trade-status sentences make sense
B.Paper.place({ side: 1, units: 40, sl: 4000, tp: 4100, bid: 4050, ask: 4050.3 });

function expand(t) {
  const m = t.match(/\{([^{}]*)\}/);
  if (!m) return [t.replace(/\s+/g, ' ').trim()];
  return m[1].split('|').flatMap((alt) => expand(t.slice(0, m.index) + alt + t.slice(m.index + m[0].length)));
}

// [expected intent, templates...]
const CASES = [
  ['openBias',
    "{what's|what is|whats} the bias {for|at|on} {the open|monday|tomorrow|when the market opens|next session|sunday}",
    "{what|which} {way|direction} {will|is} {gold|price|the market} {going|gonna go|going to go} {when the market opens|at the open|on monday|tomorrow|next week}",
    "{bullish or bearish|up or down|buy or sell} {when it opens|at the open|monday|tomorrow|for the open}",
    "{what will|what's|what is} {gold|price} {gonna do|going to do|do} {monday|tomorrow|when the market opens|at the open|next week}",
    "{is|will} {gold|price} be {bullish|bearish} {tomorrow|monday|at the open|next week}",
    "{bias|direction|outlook} for {tomorrow|monday|the open|next week}"],
  ['biasUntil',
    "when {will|is|does} {gold|price|it|the market} {stop|quit|finish} being {bullish|bearish}",
    "when {will|is} {gold|price|the market} {gonna be|going to be|be|turn|flip} {bullish|bearish}",
    "{bullish|bearish} {until|till|til} when",
    "how long {will|is} {gold|price|it} {stay|be|remain|gonna stay|going to stay} {bullish|bearish}",
    "when {will|does} {gold|price} {go up|start going up|drop|start dropping|rally|go down|fall}",
    "how long {until|till} {gold|price} {goes up|drops|turns bullish|turns bearish}",
    "when {does|will} the {bias|trend|direction} {change|flip|switch|end}",
    "{is|will} {gold|price} {gonna|going to} {stay|keep} {bullish|bearish|going up|going down}",
    "when {is|will} the {uptrend|downtrend|rally|sell off} {over|done|end}"],
  ['bias',
    "{what's|what is|whats} the {bias|direction|trend|outlook}",
    "{what's|what is} {your|the} {read|take|call|view} on {gold|the market|price}",
    "{is|are} {gold|price|we} {bullish|bearish}",
    "{up or down|bullish or bearish|buy or sell|long or short|which way} {today|right now|now|}",
    "{is|will} {gold|price} {going|gonna go|going to go} {up or down|higher or lower}",
    "what {will|is} {gold|price} {gonna do|going to do|do} {today|now|}",
    "which {way|direction|side} {is|are} {gold|we|price} {leaning|going|on}"],
  ['day',
    "{what's|what is|whats} {gold|price|the market} doing{| today| right now}",
    "how{'s| is} {gold|price|the market} {looking|doing|moving|acting} {today|right now|}",
    "what{'s| is} going on with {gold|the market|price}",
    "{catch me up|fill me in|what did i miss|give me an update|run it down for me}",
    "how{'s| is} {gold|the market} today"],
  ['price',
    "{what's|what is|whats} {gold|price|the price of gold|gold price} {at|right now|now|trading at}",
    "{where is|where's} {gold|price} {trading|at|sitting|right now}",
    "how much is {gold|an ounce of gold} {right now|today|}",
    "{price check|gold price|quote me gold|give me the price}"],
  ['trade',
    "should i {buy|sell|go long|go short|short|long} {now|right now|here|gold|today|}",
    "{is it|is now} a good time to {buy|sell}",
    "{can i|could i|do i} {buy|sell|go long|go short} {here|now|right now}",
    "would you {buy|sell} {gold|here|right now}"],
  ['tradenow',
    "should i {trade|take a trade|get in|jump in} {today|now|right now}",
    "{is it|is now} a good time to {trade|get in}",
    "{any|got any} {trades|setups} {right now|today}"],
  ['timing',
    "when should i {trade|buy|sell|get in}",
    "what{'s| is} the best time {to trade|of day to trade|to get in}"],
  ['stall',
    "how {far|high|low} {can|will|could} {gold|price|it} {go|drop|run|fall}",
    "where {is|will} {gold|price} {heading|headed|going} {today|}",
    "where {will|does} {price|gold} stop"],
  ['levels',
    "{where's|where is|what's} {support|resistance|the high|the low}",
    "{what|which} levels {should i watch|matter today|are key}"],
  ['news',
    "{any|is there|is there any} {news|red folder|big news|data} {today|this week|coming out|}",
    "when is {cpi|nfp|fomc|the fed|powell}"],
  ['market',
    "{is|when does} the market {open|close|closed|reopen}",
    "{what time|when} does {gold|the market} {open|close|reopen}"],
  ['life:bot',
    "how did your trade go {today|}",
    "{did you|have you} {trade|take a trade} today",
    "{how's|how is} your {trade|position}",
    "what did you {trade|take} today"],
  ['life:water',
    "how much water {did i drink|have i had} today",
    "{log|add} {a|one|this one} glass{| of water}{| that i drank}",
    "i {drank|had|just drank|just had} {a|one|two|another} {glass|glasses|bottle|cup} of water",
    "log this one glass that i drank",
    "{turn on|enable} water reminders"],
  ['life:habit',
    "add a habit of {me working out|working out|reading|meditating} {today|every day|}",
    "{add|new|start|track} {a |}habit {reading|workout|journal}",
    "{show|what are} my {habits|streaks}"],
  ['life:sleepQ',
    "what time should i {go to sleep|go to bed|sleep}",
    "{when|what time} should i {go to bed|sleep} if i {wake up|get up} at {6|7 am|six}",
    "{bedtime|when should i sleep} {tonight|}"],
  ['weather',
    "what is the weather {looking like|like} {today|}",
    "what is it {feeling|looking} like outside",
    "is it {cold|hot|raining|nice} outside",
    "do i need an umbrella"],
  ['life:wear', "what should i wear {today|tonight|}", "{outfit|what to wear} {today|}"],
  ['life:vibe', "what's the vibe {for today|for tonight|today|tonight}", "vibe check"],
  ['life:books', "{any|got any} books to read", "{recommend|suggest} {a book|some books}"],
  ['life:movies', "{any|got any} {movies|shows} to watch", "what should i watch {tonight|}"],
  ['life:myday', "how{'s| is| was} your day{| going}"],
  ['life:mood',
    "i'm feeling {great|tired|stressed|good|amazing}",
    "honestly today was rough, work was a lot and i didn't sleep well but i'm hanging in there",
    "i feel really good today, the gym was great and i got a lot done",
    "man i'm so stressed about money and my boss was on me all day"],
  ['life:todo', "add {milk|eggs} to my {list|to do list}", "what's on my to do list"],
  ['life:countdown', "how many days until {christmas|my birthday}"],
  ['life:timer', "set a timer for {5|ten} minutes"],
  ['life:memory', "remember my locker is 42", "what did i tell you to remember"],
  ['life:morning', "{start my day|morning routine|morning briefing}"],
  // more everyday ways to ask
  ['bias',
    "{yo|hey|ok} {what's|what is} the {bias|direction} {looking like|today|right now|}",
    "{give me|tell me} the bias",
    "{what do you think|what are your thoughts} {gold|price} {is gonna do|will do} today",
    "{are we|is it} {bullish|bearish} {today|right now|}",
    "{green or red|bull or bear} today"],
  ['biasUntil',
    "{until when|till when} {is|will} {gold|price|it} {be|stay} {bullish|bearish}",
    "when {will|does} {gold|price} {start|begin} {going up|going down|dropping|rallying}",
    "{is|will} the {bullish|bearish} {trend|move|run} {over|done|ending} {soon|yet|}",
    "how much longer {will|is} {gold|price|it} {gonna be|going to be|be} {bullish|bearish}"],
  ['trade',
    "{should|shall} i {take a buy|take a sell|buy gold|sell gold|get long|get short} {now|here|right now|}",
    "{is it|would it be} {smart|wise} to {buy|sell} {here|now|right now}",
    "{you think|do you think} i should {buy|sell} {now|here|}"],
  ['day', "{what's|what is} {going on|happening} in the {market|gold market} {today|right now|}", "{sitrep|status report|quick update}"],
  ['price', "{what's|what is} gold {at|trading at} {right now|now|}", "{what's|what is} the price of gold {right now|today|}"],
  // things that worked before must still work
  ['paperOrder', "{buy|sell} {50|100|40} {units|contracts|} {at market|now|} stop {4000|4100} {target|tp} {4100|4000}"],
  ['remindAdd', "remind me {to take out the trash|to call mom} {every monday|tomorrow at 9|at 5 pm}"],
  ['weekly', "{how did we do|how did i do} this week", "{weekly report|weekly recap}"],
  ['life:partial', "take partials {for|on} {20|half} {contracts|} {on our current trade|}", "close half"],
  ['life:best', "{what was|show me} my {best|worst} trade {this week|}"],
  ['life:money', "i spent {20|50} dollars on {food|gas}", "how much did i spend this week"],
  ['help', "{help|what can you do}"],
  ['joke', "tell me a joke"],
  ['why', "why is {gold|price} {bearish|bullish|dropping|going up}"],
  ['openTrade',
    "{should i|can i|do i} {hop on a trade|jump in|take a trade|get in} {when the market opens|at the open|tomorrow|monday|when it opens|tonight}",
    "{should i|do i} {buy|sell} {at the open|monday|when it opens|tomorrow}",
    "{what's|what is} the {plan|game plan|play} for {the open|tomorrow|monday|tonight}",
    "{any|will there be} {trades|setups} {at the open|tomorrow|monday|tonight}"],
  ['life:sleepQ',
    "{i'm|i am} trying to wake up at {9:30|9 30|6|7 am|six thirty}",
    "i {need|have|want} to {be up|wake up|get up} {by|at} {7|6:45|8 am} {tomorrow|}"],
  ['x:define',
    "{what is|what's|explain|define} {a pip|an order block|a fair value gap|fvg|a liquidity sweep|break of structure|drawdown|leverage|the spread|risk reward|atr|an ema|rsi|fibonacci}",
    "what does {fomc|cpi|nfp|bos|choch|dxy|ath} {mean|stand for}",
    "{how does the bias work|what does bias mean|explain the bias}",
    "{teach me about|tell me about} {order blocks|liquidity|support and resistance|candlesticks|prop firms|the london session}"],
  ['x:coach',
    "{i keep|i've been} {revenge trading|overtrading|chasing losses}",
    "i'm {scared|afraid|nervous} to {take the trade|pull the trigger|enter}",
    "i {blew my account|failed my challenge|lost my funded account}",
    "{how do i|how can i} {be more disciplined|stick to my plan|be more consistent|improve my trading}",
    "{i have fomo|i missed the move|i'm on a losing streak|i keep losing}"],
  ['x:pnl', "if i {buy|sell} {40|50|100} {contracts|units} and it {goes up|drops|moves} {10|15|20} {dollars|points}", "how much {is|would i make on} {40|60} units {on|with} a {10|25} dollar move"],
  ['x:goldvalue', "how much is {a gram|10 grams|a kilo|a kilogram} of gold", "{what's|what is} a {gold bar|kilo of gold} worth"],
  ['x:convert', "{what's|what is|convert} {70|32|100} {fahrenheit|f|degrees f} {in|to} celsius", "how many km is {5|10} miles", "{what is|convert} {5|10} miles {in km|to km}", "{what is|convert} {5|80} {kg in pounds|pounds in kg|feet in meters|oz in grams}"],
  ['x:worldtime', "what time is it in {london|tokyo|la|los angeles|dubai|sydney|chicago}", "{whats the time|time} in {london|tokyo|hong kong}"],
  ['x:date', "{what's the date|what is the date|what day is it|what day is today|what's today's date}", "{what day is tomorrow|is it a leap year|what week is it}"],
  ['x:coin', "{flip a coin|toss a coin|heads or tails}"],
  ['x:dice', "{roll a die|roll the dice|roll two dice|roll a d20}"],
  ['x:random', "{pick a number|give me a random number|random number} {between 1 and 100|from 1 to 10|}"],
  ['x:choose', "should i {eat|get|order} {pizza|tacos|sushi} or {burgers|wings|chinese} {for dinner|tonight|}", "{pick|choose} between {the gym|a walk} or {a run|yoga}"],
  ['x:fact', "{tell me a fact|fun fact|tell me something interesting|random fact|did you know}"],
  ['x:riddle', "{tell me a riddle|give me a riddle|riddle me}"],
  ['x:about', "{what's your name|who made you|are you ai|are you real|how do you work|can you learn|where do you live}"],
  ['x:well', "{i can't sleep|help me relax|give me a stretch|i have a headache|i can't focus|i need energy|breathing exercise}"],
  // slang & messy speech
  ['bias', "{yo|bro|ok so|alright} {which way we going|what side we on|we buying or selling|we long or short} {today|rn|}", "{is gold|is price} {bullish|bearish} {or nah|or not|right now|}", "{what are your thoughts on|how do you feel about|what's your read on} gold {today|right now|}"],
  ['day', "{bro|yo|ok} {what is gold even doing|what's gold up to|how's gold moving} {rn|right now|today|}", "{how's the market treating us|how's gold been today|what's the market been like today}"],
  ['reach', "{do you think|you think|will|can} {gold|price|we|it} {hit|reach|get to|touch|see} {4000|4100|3950} {today|this week|tonight|}", "will {it|gold|price} {break|take out} {the high|the low|today's high|today's low}"],
  ['coach', "should i {close|cut|hold|keep} my {trade|position|sell|buy}", "{should i hold or cut it|should i close it|should i let it run}"],
  ['tradenow', "should i {sit out|stay out|take the day off|skip trading} today", "{is it a good day to trade|is today a good day to trade|good day to trade}"],
  ['biasUntil', "{when's|when is} {gold|price|it} {gonna|going to} {turn around|reverse|flip}", "how much longer {is|will} {this|the} {sell off|rally|downtrend|uptrend} {last|go on|continue}"],
  ['openBias', "{what's|what is} {gold|price} {gonna do|going to do} when {asia|london|new york} opens"],
  ['life:sleep', "{i just woke up|just got up|i'm up|i woke up}"],
  ['life:habit', "did i {work out|read|meditate} today"],
  ['dayplan', "{what's the move|what are we doing} {tonight|today|}"],
  ['life:water', "{i'm thirsty log a glass|log another glass|add one more glass of water|put down 2 glasses}"],
  ['weather', "{is it|gonna be} {cold|hot|rainy|nice} {today|tomorrow|tonight|outside}", "{what's|what is} the {weather|forecast} {for tomorrow|tomorrow|this weekend|tonight}"],
];

// extra patterns kept in a plain text file: intent|template
for (const line of fs.readFileSync(path.join(__dirname, 'vocab-more.txt'), 'utf8').split(String.fromCharCode(10)).map((x) => x.trim())) { const i = line.indexOf('|'); if (i > 0 && !line.startsWith('#')) CASES.push([line.slice(0, i), line.slice(i + 1)]); }

const verbose = process.argv.includes('-v');
let total = 0, pass = 0;
const fails = {};
for (const [want, ...tpls] of CASES) {
  for (const tp of tpls) for (const s of expand(tp)) {
    total++;
    let r;
    try { r = B.Brain.routeOf(s, ctx); } catch (e) { r = { id: 'ERROR ' + e.message }; }
    const got = r && r.id;
    if (got === want) pass++;
    else (fails[want] = fails[want] || []).push(`${s}  →  ${got}`);
  }
}
console.log(`${pass}/${total} sentences understood correctly (${(pass / total * 100).toFixed(1)}%)`);
for (const [w, list] of Object.entries(fails)) {
  console.log(`\n✗ ${w}: ${list.length} missed`);
  for (const x of list.slice(0, verbose ? 999 : 6)) console.log('   ' + x);
}
process.exitCode = pass === total ? 0 : 1;
