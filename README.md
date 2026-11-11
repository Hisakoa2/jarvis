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
| Big picture | "Are the timeframes aligned?", "What's the 4 hour saying?" |
| Price & levels | "Where's gold?", "Key levels", "How far is the weekly open?", "How far from yesterday's high?" |
| The day | "How's the day?", "How's the market?", "Catch me up", "Briefing" |
| Range | "How much has it moved today?", "Is it stretched?" |
| Math | "Risk 1% with a 6 dollar stop", "Sell at 4060 stop 4070 target 4030", "What's 4065 minus 4030?" |
| Account (read-only) | "What's my balance?", "How am I doing?" |
| Sessions & hours | "When does London open?", "Is the market open?", "When's the weekly close?" |
| Small talk | "How are you?", "What's up?", "It's Friday, how you doing?", "Thanks", "Tell me a joke", "I got stopped out", "Good night" |
| Controls | "Ambient mode", "Exit", "Any callouts?", "Mute", "Unmute", "Open Aegis", "Help" |

Small talk depends on the day and time. On Fridays it reminds you about the weekly close. At the weekend it tells you to enjoy the break. Late at night it notices.

**Trade checks** score your setup on several things:
- your confirmed bias
- any pending flip
- the 4H and daily trend
- room to the next level
- how much of the day's range is already used
- the spread and which sessions are open

You get a verdict, the reasons, and a structure-based stop, target and R. It's what *your rules* say, not a guarantee.

**Callouts.** When something happens, JARVIS pops up a silent CALLOUT. Tap it to hear it. Callouts fire for:
- a bias flip, or a flip that's pending
- all timeframes lining up
- price breaking yesterday's high or low, the weekly open, the Asia range or a $50 level
- a session opening in 15 minutes, and opening
- the weekly close being 30 minutes away
- price moving a full average day's range

Missed ones are kept under the 🔔 bell.

**Ambient mode** (the ⛶ button, or say "ambient mode") is a full-screen HUD with a huge price, the bias and the core. It's made for a second monitor or a phone on a stand, and it keeps the screen awake.

**Voice settings (⚙):**
- choose what JARVIS calls you (default "sir")
- pick a voice and adjust its speed and pitch, with a preview
- turn hands-free on or off
- turn the boot animation on or off

For the best voice on iPhone: Settings → Accessibility → Spoken Content → Voices → English → download **Daniel (Enhanced)** or **Arthur (Premium)**, then pick it in JARVIS. On PC, Microsoft Edge has very natural "Online (Natural)" voices.

Notes:
- Speech-to-text is done by Apple or Google, the same service as keyboard dictation. Everything after that is plain code.
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
