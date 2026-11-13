# JARVIS: Personal Command Center

A gold-trading command center you can talk to. It shows the live XAU/USD price, a stable rule-based bias, session countdowns and links to your projects.
There is **no AI**. Everything is plain code and keyword matching.

It works in two ways:
- **On your iPhone, anywhere.** The app runs on the phone itself and talks straight to OANDA. Your PC doesn't need to be on.
- **On your PC.** Double-click `Run JARVIS.bat`. Your phone can also open it over home Wi-Fi this way.

---

## Using it on your iPhone (anywhere)
1. Open your JARVIS web address in **Safari**. You get it after publishing to GitHub Pages; it looks like `https://yourname.github.io/jarvis/`.
2. Tap **Share → Add to Home Screen → Add**. You now have a JARVIS app icon.
   *This step matters.* iPhone can wipe saved website data after 7 days in Safari, but Home Screen apps are protected.
3. Open JARVIS from the icon, tap the **gear ⚙** (top right) and enter:
   - **API key**: from OANDA → My Account → Manage API Access
   - **Account ID**: looks like `101-001-1234567-001`
   - **Account type**: Practice or Live, matching the key
4. Tap **TEST & SAVE**. It checks the key with OANDA before saving.

The key is saved **only on that phone**. It isn't in the app's files and isn't sent anywhere except OANDA.
Keep Face ID or a passcode on your phone, because an OANDA key can also place trades.

## Using it on your PC
1. Install **Node.js LTS** from https://nodejs.org (one time only).
2. Put your key in the `.env` file. See *Your .env file* below.
3. Double-click **`Run JARVIS.bat`**. Keep the black window open while you use it.
4. To use it from your phone on home Wi-Fi, type the `On your iPhone:` address from the black window into Safari.

---

## Talking to JARVIS
There are no exact commands to memorise. JARVIS has a big catalog of phrasings, so you can just talk. It answers **out loud and on screen**.

**Three ways to talk:**
- **Hands-free:** tap the 🎧 button (or turn it on in Settings). Then say "Hey JARVIS, what's the bias?", or just "Hey JARVIS" and wait for "Yes, sir?".
- **Mic:** tap 🎙 (or the core at the top left) and speak.
- **Type:** type into the bar and press Enter.

**Things you can say (any wording works):**

| Topic | Examples |
|---|---|
| Bias | "Give me gold bias", "What's the bias?", "Bullish or bearish?" |
| Why | "Why is it bearish?", "Explain the bias", "Walk me through it" |
| Trade check | "Should I sell right now?", "Do I buy here?", "If I sell now will I be good?", "Good time to go long?" |
| Day / swing plans | "If I were to swing trade right now, what would that look like?", "If I day trade right now, what would that look like?", "If I sell now, where should my stop loss and take profit go if I was swing trading?" |
| Grade my trade | "I'm in a sell, stop loss 4068, take profit 4048, is this a good trade?", "I sold at 4060, stop 4068, TP 4048" |
| Where's my TP? | "My entry is 4009, stop 4018, where should I put my take profit?", "If I sell, where should my TP be?", "Where do I get out?" |
| How far can it go? | "Will price go up any more than this?", "At what point will price stop going up?", "…stop going down?", "How far can it go?" |
| Bearish / bullish until when? | "Price is bearish until when?", "Bullish until when?", "How long will it stay bearish?", "When does the downtrend end?" (says where price could run to first, e.g. "bearish down toward ~3,990, then 3,980", then the price that would end the bias and the soonest it could change) |
| Safe until? | "Buying is safe until what?", "Selling is safe until what?", "What would invalidate the sell?" |
| Pending orders | "Put a sell order at 4050", "Put a buy order at 3950", "I want a buy order at 3940", "Cancel my orders" |
| Reminders | "Remind me in an hour to do the dishes", "Remind me at 5 PM to call mom", "Remind me tomorrow to trade London", "Next time I open the app, remind me to check the news", "What are my reminders?", "Delete reminder 2", "Clear my reminders" |
| Paper trading | "Sell now", "Buy now", "Sell 50 units at 4009, stop loss 4018, take profit 3980", "Buy 2 lots", "How's my paper trade?", "Are we in profit?", "Move my stop to break even", "Set TP to 3985", "Close my trade", "Close all", "Cancel my order", "Set my paper balance to 50k" |
| Weekly report | "Weekly report", "How did we do this week?", "How did we do last week?", "What's my win rate?" (trades, wins/losses, profit, best session, best/worst trade, one tip) |
| Weather | "What's the weather?", "Weather tomorrow", "Weather in Miami", "Do I need a jacket?" |
| Your day | "What should I do today?", "I'm not trading right now, what should I do?", "I'm done trading for the day", "Give me a workout", "Give me a workout plan", "Workout plan at home", "Give me a workout challenge" |
| Should I trade now? | "Should I hop in and trade right now?", "Is it a good time to trade?", "When should I not trade?", "Best time to trade?" |
| News | "When's the next high-impact news?", "When's news?", "Any news today?", "News tomorrow?", "Red folders this week?", "When is CPI / NFP / FOMC?" |
| Birthdays | "When's my birthday?", "When's your birthday?" |
| Big picture | "Are the timeframes aligned?", "What's the 4 hour saying?" |
| Price & levels | "Where's gold?", "Key levels", "How far is the weekly open?", "How far from yesterday's high?" |
| The day | "How's the day?", "How's the market?", "Catch me up", "Briefing" |
| Range | "How much has it moved today?", "Is it stretched?" |
| Math | "Risk 1% with a 6 dollar stop", "What's 4065 minus 4030?" |
| Account (read-only) | "What's my balance?", "How am I doing?" |
| Sessions & hours | "When does London open?", "Is the market open?", "When's the weekly close?" |
| Small talk | "How are you?", "What's up?", "It's Friday, how you doing?", "What should I do this weekend?", "Thanks", "Tell me a joke", "I got stopped out", "Good night" |
| Controls | "Ambient mode", "Exit", "Any callouts?", "Mute", "Unmute", "Open Aegis", "Help" |

Small talk depends on the day and time:
- On Fridays it reminds you about the weekly close.
- At the weekend it tells you to enjoy the break, and to work out, drink water and get some sleep.
- Late at night it tells you to get some rest.
- On your birthday (set in Settings ⚙, default 11-15) it says happy birthday, and counts down the week before.
- Special lines (birthday countdown, fun facts, holidays, new month) are said **once a day**, not every time you open the app.
- If you reopen the app within an hour, it just says "Welcome back, sir", gives the gold price and your paper trade, and skips the full greeting.
- On the first weekend open, it gives a one-line summary of your paper week.
- New month: the first time you open the app in a new month (first week only) it says e.g. "Hey sir, it's December 1st — a new month."
- It knows the big holidays too (New Year, July 4th, Thanksgiving, Christmas).
- If there's high-impact US news today, the greeting mentions it.

**Trade checks** score your setup on several things:
- your confirmed bias
- any pending flip
- the 4H and daily trend
- room to the next level
- how much of the day's range is already used
- the spread and which sessions are open

You get a verdict, the reasons, and a stop loss with two take profits. It's what *your rules* say, not a guarantee.

**Day trade vs swing.** Say "day trade" or "swing" and the plan changes:
- **Day trade:** uses the 1-hour chart. The stop goes just past the nearest level behind you (about 1–2.5× the 1H ATR). Targets sit just in front of the next levels, and JARVIS warns if a target is further than what's left of today's normal range. Be out before the New York afternoon or big news.
- **Swing:** uses the 4-hour and daily charts. The direction follows the daily trend, the stop is wider (past a daily level or $50 number), the targets are bigger (1.5R and 3R or more), and you'd hold for 2–5 days. Trade smaller so you risk the same dollars.
- Ask without a style ("should I sell?") and you get the day-trade view.

**Where price may stop / safe until.**
- "At what point will price stop going up?" lists the next resistance levels and where an *average day* would top out (today's low + the 14-day average range). Going down works the same way. Nobody can know for sure, so these are the likely spots, not promises.
- "Buying is safe until what?" gives the price where your own 3 bias rules would turn neutral, and the price where they'd flip the other way. Both are judged on closed 1-hour candles, 2 in a row. If the bias is against you, it tells you what it would take to turn.

**Take-profit ideas.** Give an entry and a stop (or just ask "if I sell, where's my TP?") and JARVIS suggests TP1 and TP2 just in front of the next levels, with the R for each. It also warns you if a level sits closer than 1R.

**Grading your trade.** Tell JARVIS your side, stop and take profit (and entry, if you're already in). It checks:
- risk:reward
- whether the bias and the 4H/daily trends are with you
- whether your stop is too tight, or sitting right on a level where it could get poked
- which levels are in the way of your target
- whether the target fits today's range
- news coming up

**Should I trade right now?** JARVIS says "No, sir" when:
- it's late in the New York session (after 3 PM ET)
- high-impact US news is in the next 30 minutes or just came out
- the market is closed

It says "be careful" for:
- the first couple of hours after the 6 PM reopen
- the Asia session
- the New York afternoon
- Friday afternoon
- a wide spread, a full day's range already done, or a neutral bias

The best window for gold is about 3 AM – 11:30 AM ET (London open to New York midday).

**Paper trading (pretend money).** A practice account that lives only on your device. Nothing is ever sent to OANDA.
- **Start:** say "sell now" or "buy now". JARVIS picks the stop (just past the nearest level) and the take profit, and sizes the trade to risk 1% of the paper account. It also tells you whether your rules back the trade.
- **Your way:** "sell 50 units at 4009, stop loss 4018, take profit 3980". If 4009 isn't the current price, it becomes an order that fills when price gets there.
- **Size:** units (1 unit = 1 oz, so a $1 move = $1 per unit), "contracts" (same as units), or "lots" (100 units). "Risk 2%" or "risk 500 dollars" sizes it from your stop.
- **Manage it:** "move my stop to break even", "set TP to 3985", "close my trade", "close all", "cancel my order".
- **Watch it:** the PAPER TRADING panel shows balance, equity, open profit or loss, win rate, and a bar showing where price is between your stop and TP. Ask "how's my paper trade?" anytime.
- **When it's hit:** a silent pop-up says "We hit TP, sir!" or "Unfortunately, sir, we hit our stop loss… we'll learn from this." If the app was closed, JARVIS checks the 5-minute candles when you open it again and tells you in the greeting. If a stop and a target were both inside one 5-minute candle, it assumes the stop (the safe guess).
- **Buttons:** the panel has an order ticket (Size, Entry, Stop, Target + SELL / BUY; leave a box blank and JARVIS fills it in, and an entry away from the price makes a pending order). Each trade has **BE** (stop to break-even), **EDIT** (change stop / target) and **CLOSE**; pending orders have EDIT and CANCEL; **CLOSE ALL** shows when you have 2+ trades.
- **Risk per trade:** when JARVIS picks the size, it risks 1% of the paper balance. Change that in Settings ⚙ → Paper trading.
- **Starting balance:** set it in Settings ⚙ → Paper trading (e.g. 50,000 or 100,000), or say "set my paper balance to 50k". Resetting clears paper trades and history.
- Buys fill at the ask and close at the bid, and sells the other way round, just like a real broker.

**Weather.** Type your city in Settings ⚙ (Weather city), or leave it blank and allow location when your phone asks. It uses Open-Meteo, a free weather service with no account needed. Rainy days get an "indoor workout" tip.

**What should I do today?** JARVIS gives you a short plan based on the time and day:
- whether you're in the trading window, and what the bias says
- any big news to watch
- a workout idea
- journalling, water and sleep

At the weekend it's training, reviewing the week and prepping for Monday. "Give me a workout" gives you a full routine.

**It understands more ways of saying things.** If what you say doesn't match a keyword, JARVIS compares it word by word against a bank of example sentences (allowing for spelling mistakes) and picks the closest one. It's still plain code, no AI.

**News.** JARVIS reads this week's economic calendar (the public Forex Factory feed) and focuses on US news, since that's what moves gold. The dashboard shows a "NEXT RED NEWS" countdown, and a silent callout pops up 15 minutes before any high-impact US release. On GitHub Pages the calendar refreshes every 2 hours. Next week's calendar appears on Sunday.

**Callouts.** When something happens, JARVIS pops up a silent CALLOUT. Tap it to hear it. Callouts fire for:
- a bias flip, or a flip that's pending
- all timeframes lining up
- price breaking yesterday's high or low, the weekly open, the Asia range or a $50 level
- a session opening in 15 minutes, and opening
- the weekly close being 30 minutes away
- high-impact US news being 15 minutes away
- price moving a full average day's range

Missed ones are kept under the 🔔 bell.

**Ambient mode** (the ⛶ button, or say "ambient mode") is a full-screen HUD with a huge price, the bias and the core. It's made for a second monitor or a phone on a stand, and it keeps the screen awake.

**Voice settings (⚙):**
- choose what JARVIS calls you (default "sir")
- your birthday (month-day, e.g. 11-15)
- your weather city
- the paper account's starting balance (and a reset button)
- pick a voice and adjust its speed and pitch, with a preview
- turn hands-free on or off
- turn the boot animation on or off

For the best voice on iPhone: Settings → Accessibility → Read & Speak → Voices → English → download **Daniel (Enhanced)** or **Arthur (Premium)**, then pick it in JARVIS. On PC, Microsoft Edge has very natural "Online (Natural)" voices.

Notes:
- Speech-to-text is done by Apple or Google, the same service as keyboard dictation. Everything after that is plain code.
- **Reminders** pop up as a silent REMINDER card (tap to hear) when their time comes while the app is open. Otherwise they're read out the next time you open the app. "Next time I open the app" reminders also show when you come back to the app after 10+ minutes away.
- **Better hearing:** JARVIS asks the speech engine for several guesses and uses the one that makes the most sense as a command. It also fixes common mishearings ("cell now" → "sell now", "bearish into one" → "bearish until when", "brake even" → "break even").
- **More human voice (iPhone):** the browser can only use voices installed on your phone. In iPhone **Settings → Accessibility → Read & Speak → Voices → English**, download a voice marked **Premium** (best) or **Enhanced**. Then in JARVIS Settings ⚙ → Voice, pick it and tap Preview. JARVIS picks Premium voices first automatically.
- **Stop button:** while JARVIS is talking, the mic button turns into an orange ■ stop button. Tap it to cut it off. Saying "stop" or pressing Esc works too.
- **Stop being asked for the mic every time (iPhone):** a website can't give itself permanent mic access; you have to set it once. In Safari, open JARVIS, tap the **aA** button in the address bar → **Website Settings** → **Microphone** → **Allow**. If you use JARVIS from the Home Screen icon, go to **Settings → Apps → Safari → Microphone → Allow**.
- **iPhone:** if the mic gives an error, check Settings → Safari → Microphone, and Settings → General → Keyboard → Enable Dictation. Hands-free on iPhone may stop listening now and then. If it does, tap 🎧 or the core to wake it.
- Hands-free and the mic need a secure (https) page, so use the GitHub Pages address on your phone, not the home Wi-Fi address.

### New in v13
- **Wins & losses calendar.** Tap **CALENDAR** in the paper trading panel. Each day shows green or red with its total. Tap a day to see its trades, then tap a trade to see:
  - entry and exit (price and time)
  - stop loss and take profit, as prices and in dollars
  - the risk-to-reward, like 1:2.3
  - the result, in dollars and in R
  - the **deepest drawdown** (how far it went against you)
  - the **best profit** (how far it went for you)
- **Open trades show the money.** Each open trade shows "TP +$400 · SL −$150 · 1:2.7" and the time you opened it.
- **Straight "Yes, sir / No, sir" trade answers.** Ask "should I hold?", "should I close?", "should I take partials?", "should I move my stop to break even?", "can I lower my take profit?" or "should I trail my stop?". JARVIS uses your open paper trade, or a trade you describe like "I'm in a sell at 4000".
- **Check your own stop or target.** Say "is it cool if I put my stop loss at 4005?" or "is 3950 a good take profit?". JARVIS answers "You're good for that, sir", "It's on the tight side" or "I'd advise against that, sir", and gives the dollars and the 1:R.
- **"Where should my stop and take profit be?"** Say "I'm in a trade at 4000, where should my stop loss and take profit be?" and JARVIS gives the stop, TP1 and TP2, with 1:R and dollars once it knows your contracts.
- **Position size.** Say "If I buy now and want to risk $100, how many contracts?". JARVIS uses its own stop and tells you the contract count, the take profit and what you'd make.
- **"Is it OK to trade right now?"** now starts with a plain yes or no. JARVIS also pops up a silent **TRADE ALERT** when its rules line up for a buy or sell, so you don't have to remember to ask. Tap it to hear it.
- **1:2 is the new minimum.** Suggested take profits and JARVIS's own trades now aim for at least twice the risk.
- **The bias and the targets agree.** When JARVIS says "bearish toward 3955", its hold and take-profit answers now point to 3955 as the first stop on the way (a spot for partials) instead of naming a different number.
- **JARVIS can trade twice a day.** A second trade is only taken after the first one has closed, at least 30 minutes later, and only if the setup is valid. If the first trade lost, the second needs a stronger setup.
- **The cloud trader saves its hourly "I'm alive" check** (this was broken before).
- **"Sell 40 now"** opens 40 contracts.

### New in v12

**Subscriptions understand you properly.** "My Claude subscription is due on December 1st" now saves Claude, due Dec 1, and asks how much it is (it used to read the "1" in "1st" as $1). Then "Claude is 20 dollars" fills in the price. "Netflix is now 17.99" / "change Netflix to 18.99" update the price instead of adding a new one. It also fixes common mishearings ("cloud" → Claude, "net flicks" → Netflix).
- **"Remove subscriptions"** / "delete all my bills" removes them all.
- **Settings → Subscriptions & Bills**: see every one with its price and day, tap ✕ to remove one, or Remove All.

**Every feature now has its opposite:**
- Water: "remove a glass", "take off 2 glasses", "I didn't drink that", "reset my water"
- Habits: "I didn't work out today", "uncheck reading", "stop tracking reading"
- To-do: "uncheck eggs", "put eggs back", "remove milk from my list" (removes, doesn't mark done), "I got the bread" (done). Spoken lists like "add milk eggs and bread" now become three items.
- Money: "delete the lunch expense", "remove my food budget", "delete all budgets"
- Memory: "forget my locker" · Reminders: "clear my reminders" · Hands-free: "stop listening" / "start listening" · Voice: "go silent" / "turn your voice back on" · Sleep: "heading to bed" / "I just woke up"
- **"Undo that" / "scratch that"** takes back the last thing you logged (water, habit, expense, to-do, subscription) within 10 minutes.

**Smarter hearing.** Letters said one at a time ("c p i", "f o m c") join up; swapped letters ("bais" → bias) and common slips ("buy us" → bias, "bear ish" → bearish, "rn", "tmrw") are understood; month names, apps and services are never "corrected" into other words.

**Two tests now guard everything:**
- `node tools/vocab-test.js` — 7,053 sentences, checks each goes to the right feature.
- `node tools/behavior-test.js` — 83 real conversations in order, checks the actual answers (including every opposite).

### New in v11

**Just say "Jarvis".** Hands-free listening is now on by default — no tapping, no "hey". Say "Jarvis, what's the bias" or just "Jarvis" and wait. Works while the app is open on screen (Safari can't listen in the background). Turn it off in Settings if you want.

**Money tracker.** "I spent 20 on food", "dropped 45 on dinner", "bought shoes for 60", "paid 30 for gas". It sorts spending into categories (food, gas, shopping, bills, fun…).
- "How much did I spend this week / this month / on food / yesterday", "biggest expense this month", "show my spending"
- Budgets: "set my food budget to 300", "set a monthly budget of 2000", "my budget" — and every time you log, it tells you what's left.
- "Undo last expense"

**Subscriptions & bills.** "Add Netflix 15.99 a month on the 5th", "I pay 10 for Spotify every month", "rent is 1200 due on the 1st".
- "My subscriptions" (with the monthly and yearly total), "when is rent due", "what's due this week", "cancel Netflix"
- A silent pop-up the day before and the day each one is due.

**Follow-up memory.** It remembers what you just asked for 3 minutes:
- "What time is it in London?" → "what about Tokyo?"
- "How much did I spend this week?" → "what about on food?"
- "What's the bias?" → "and on Monday?" · "Tell me a fact" → "another one"

**Teach JARVIS your own phrases.** "When I say status, show the bias then my subscriptions" — now "status" does both. "My shortcuts" lists them, "forget status" removes one.

**Sessions.** "When does the Asia session start?", "is London open?", "when does New York close?", "what session are we in?" — with start and end times.

**Everyday chat.** "I'm going to the gym", "I'm home", "wish me luck", "I got paid", "I passed my challenge", "cheer me up", "talk to me", "what's up", "do you like music"…

The vocabulary test now checks **6,412** sentence combinations (`node tools/vocab-test.js`; more patterns live in `tools/vocab-more.txt`). Try any sentence with `node tools/ask.js "your question"`.

### New in v10

**Ready for the market being closed.** "Should I hop on a trade when the market opens?", "should I buy when it opens", "what's the plan for Monday" now give the plan for the open: which side your rules favour, whether your idea goes with or against them, where it flips, and a reminder that the first hour is thin.

**More market questions**
- "Do you think we hit 4000 today?", "will it break the high?", "can gold get to 4100 this week?" — distance, bias direction, how much room an average day leaves, and levels in the way.
- "Should I close my trade?", "should I hold or cut it?" — your open paper trade's P&L plus where it stays valid.
- "Should I sit out today?", "is it a good day to trade?", "when's gold gonna turn around?", "what's gold gonna do when London opens?"

**Trading dictionary** — "what is an order block", "explain fair value gaps", "what does FOMC mean", "how does the bias work", "what's a liquidity sweep" and about 50 more terms.

**Trading coach** — "I keep revenge trading", "I'm scared to pull the trigger", "I blew my account", "I'm on a losing streak", "how do I stay disciplined".

**Calculators** — "if I buy 50 contracts and it goes up 12 dollars", "how much is a gram of gold", "70 fahrenheit in celsius", "5 miles in km", "20 percent tip on 45".

**Dates & world clocks** — "what's the date", "what day is tomorrow", "what time is it in London / Tokyo / LA".

**Fun & wellness** — flip a coin, roll dice, random number, "pizza or tacos?", magic 8 ball, rock paper scissors, fun facts, riddles, would-you-rather, "I can't sleep", "help me relax", "I can't focus", stretch break.

**Sleep** — "I'm trying to wake up at 9:30", "I need to be up by 7", "I just woke up".

**When it doesn't know the exact question**, it now answers about the closest topic you mentioned (gold, weather, sleep, water…) instead of "I didn't catch that".

**Clock** — the big clock now shows 12-hour time like your phone (5:44:35 PM), New York time.

The vocabulary test now checks **4,925** sentence combinations: `node tools/vocab-test.js`.

### New in v9

**JARVIS only trades when it's actually valid.** It does not force a trade to fill the day.
- At most one trade per trading day. Entries are allowed from **6:15 PM to 4 PM New York time**.
- It needs all of these: the 1H bias pointing one way (never neutral), the setup score agreeing (3+ in London/New York hours, 4+ at other times), no high-impact news within 30 minutes, and a target at least **1.5× the stop**.
- If nothing qualifies, it sits out that day. Ask "how did your trade go today?" and it tells you why it waited.
- Still at least 40 units, still never moves its stop, still closes its own trade at 4:50 PM.

**Cloud trader (trades while your phone is off).** A copy of the same rules runs on GitHub every 5 minutes, Sunday to Friday. It only reads prices; it never touches your real OANDA account. It saves its paper trades to a small file, and the app copies them into your paper P&L the next time you open it.
- One-time setup on the PC: double-click **Set up cloud trader.bat**. It copies your OANDA key from `.env` into GitHub's encrypted secret storage (never into the code).
- Until that's done, JARVIS still trades while the app is open, the same valid-only way.
- GitHub's timer can run a few minutes late, so entries and exits can be a few minutes off.

**Bias for when the market opens.** When the market is closed, "what's the bias?" gives the read going into the open: which side, where it would flip, the first target, and the soonest it can change (two hourly closes after the open). Ask any time: "what's the bias for Monday", "bullish or bearish at the open", "what will gold do when the market opens".

**When will it be bullish / bearish.** "When will price be bullish?", "when will gold stop being bearish?", "how long will it stay bullish?", "when does the trend flip?" give the exact price that changes it and the soonest time it could change.

**A much bigger word library.** JARVIS now understands questions as meaning groups, in any order, like a combination lock. "When will gold stop being bullish", "bullish till when" and "how long is price gonna stay bullish" all mean the same thing to it. The library holds hundreds of words and slang, and a test checks 2,800+ sentence combinations (`node tools/vocab-test.js`). Examples:
- "what's price doing", "how's gold looking", "catch me up", "what's going on with the market"
- "should I buy now", "is it smart to sell here", "would you go long", "is it a good time to trade"
- "where's price heading", "how low can it go", "what levels should I watch"
- "log this one glass that I drank", "add a habit of me working out today"
- Tell it about your day in a whole paragraph. It picks up every feeling word, notices "not" and "never", sees what it's about (work, trading, sleep, gym, people, money), and always answers positively.

### New in v8

**JARVIS trader.** JARVIS takes its own paper trade once per trading day (6 PM to 5 PM New York time). It uses your same paper account, so its result adds to your P&L.
- (v9: it now only trades valid setups — see above.)
- Every trade is **at least 40 units** (contracts) and the target is always **1.5× the stop** or more, so it's better than 1:1.
- It never moves its stop. At 4:50 PM New York time it closes its own trade so each day stands on its own.
- It stays quiet. You'll only see it in the paper panel (purple **JARVIS** tag and the "JARVIS TRADER" line), or when you ask "how did your trade go today?" or "what's your record?"
- (v9: the cloud trader covers days when your phone is off — see above.)

**Trading extras**
- Partials: "take partials for 20 contracts", "close half", or the **½** button on a trade.
- "best trade", "worst trade this week", "best and worst trade"
- "give me a trading challenge", "how am I doing on the challenge"

**Life tools** (saved on your phone only)
- Water: "I drank 2 glasses of water", "how much water did I drink today", "set water goal to 10", "turn on water reminders" (a pop-up every 2 hours from 9 AM to 9 PM).
- Habits: "add habit reading", "I read today", "my habits" (shows streaks).
- Check-in and mood: "I feel great", "I'm tired", "check in", "how have I been feeling". Answers are always encouraging.
- Repeating reminders: "remind me every Monday to take out the trash", "remind me every day at 9 to stretch".
- To-do list: "add milk and eggs to my list", "what's on my list", "check off milk", "clear my list".
- Countdowns: "add a countdown to my trip on March 3rd", "change trip to March 10th", "how many days until Christmas", "my countdowns", "delete countdown trip".
- Remember things: "remember my locker is 42", "what's my locker number?", "what do you remember", "forget my locker".
- Sleep: "going to bed" / "I'm up" logs your sleep. Also "I slept 7 hours", "how did I sleep", "what time should I go to sleep if I wake up at 6".
- Money: "I spent 20 dollars on food", "how much did I spend this week", "undo last expense".
- Timers: "set a timer for 10 minutes", "how much time is left", "cancel timer". It plays a chime, so keep the app open.
- Morning routine: "morning routine" or "start my day" gives you weather, gold, news, reminders, your list, habits and countdowns.

**Just talk to it**
- "how's your day?", "what's the vibe today / tonight?", "what's it feeling like outside?", "what should I wear?", "do I need a jacket?"
- "any books to read?", "trading books", "any movies to watch?", "shows to binge", "what should I eat?", "what's for dinner?"
- "motivate me", "daily quote", "I'm bored", "are you real?"
- If a sentence doesn't match anything exactly, JARVIS picks the closest thing it knows.

**New look.** Glass panels with rounded corners and a soft glow. No more retro grid or cut corners.

---

## How the bias works (and why it doesn't flicker)
1. **Only closed 1-hour candles count.** The live price never votes, so a candle spiking for a moment can't change the bias. The bias is re-checked once per hour, right after each candle closes.
2. **Each rule needs a clear margin.** The close has to be beyond the level by more than a **buffer**: 20% of the average 1H candle size (ATR). Inside the buffer, the rule says "too close to call" and doesn't vote.
3. **Majority wins.** More bullish votes means Bullish, more bearish votes means Bearish, and a tie means Neutral.
4. **A flip needs confirmation.** The bias only changes after the new reading holds for **2 closed candles in a row**. Until then, the tile shows "BULLISH FLIP PENDING · 1/2".

The rules:

| Rule | Bullish vote | Bearish vote |
|---|---|---|
| Daily open | Close clearly above it | Close clearly below it |
| 50 EMA on the 1H | Close clearly above it | Close clearly below it |
| Previous day's midpoint (high+low)/2 | Close clearly above it | Close clearly below it |

The tile always shows:
- when the bias started
- when it was last checked and when it will check next
- each level and how far the last close was from it
- the live distance from the price to each level (for information only)

**Prices are BID prices,** the same as TradingView's OANDA:XAUUSD chart. "Daily open" and "previous day" use the forex day, which runs from 5pm to 5pm New York time.

Since everything is worked out from OANDA's candles, your phone and your PC always show the same bias.

---

## Customising
Edit these files, save, and refresh. On the GitHub version, upload the changed file again.

| To change… | Edit |
|---|---|
| Bias rules: EMA length, buffer size, confirmation candles, adding or removing rules | `public/bias-rules.js` (settings at the top) |
| Project tiles | `public/config/projects.json` |
| Session times | `public/config/sessions.json` |
| App icon | `tools/make-icons.ps1` (run it to redraw the icons) |

**Project tiles:** links that start with `http://localhost` only work at home, because they point at apps on your PC.

## Your .env file (PC only)
Copy `.env.example`, rename the copy to `.env`, open it in Notepad and fill in `OANDA_API_KEY`, `OANDA_ACCOUNT_ID` and `OANDA_ENV` (`practice` or `live`). Never share this file. It's excluded from GitHub automatically.

## Troubleshooting
- **"LINK DOWN" / "FEED ERROR"**: the message says what's wrong. It's usually a wrong key or account ID, or Practice/Live set to the wrong account type.
- **Price isn't moving**: gold is closed from Friday 5pm to Sunday 6pm New York time. The app shows "MARKET CLOSED".
- **No voice on iPhone**: tap anywhere on the page once first, because iPhones only allow speech after a tap. Also check the 🔊 button isn't muted and the phone isn't on silent.
- **PC: iPhone can't connect over Wi-Fi**: allow Node.js through Windows Firewall on *Private* networks.
