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

For the best voice on iPhone: Settings → Accessibility → Spoken Content → Voices → English → download **Daniel (Enhanced)** or **Arthur (Premium)**, then pick it in JARVIS. On PC, Microsoft Edge has very natural "Online (Natural)" voices.

Notes:
- Speech-to-text is done by Apple or Google, the same service as keyboard dictation. Everything after that is plain code.
- **Reminders** pop up as a silent REMINDER card (tap to hear) when their time comes while the app is open. Otherwise they're read out the next time you open the app. "Next time I open the app" reminders also show when you come back to the app after 10+ minutes away.
- **Better hearing:** JARVIS asks the speech engine for several guesses and uses the one that makes the most sense as a command. It also fixes common mishearings ("cell now" → "sell now", "bearish into one" → "bearish until when", "brake even" → "break even").
- **More human voice (iPhone):** the browser can only use voices installed on your phone. In iPhone **Settings → Accessibility → Spoken Content → Voices → English**, download a voice marked **Premium** (best) or **Enhanced**. Then in JARVIS Settings ⚙ → Voice, pick it and tap Preview. JARVIS picks Premium voices first automatically.
- **Stop button:** while JARVIS is talking, the mic button turns into an orange ■ stop button. Tap it to cut it off. Saying "stop" or pressing Esc works too.
- **Stop being asked for the mic every time (iPhone):** a website can't give itself permanent mic access; you have to set it once. In Safari, open JARVIS, tap the **aA** button in the address bar → **Website Settings** → **Microphone** → **Allow**. If you use JARVIS from the Home Screen icon, go to **Settings → Apps → Safari → Microphone → Allow**.
- **iPhone:** if the mic gives an error, check Settings → Safari → Microphone, and Settings → General → Keyboard → Enable Dictation. Hands-free on iPhone may stop listening now and then. If it does, tap 🎧 or the core to wake it.
- Hands-free and the mic need a secure (https) page, so use the GitHub Pages address on your phone, not the home Wi-Fi address.

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
