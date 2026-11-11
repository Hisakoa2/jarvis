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
Tap the **🎙 mic**, speak, and JARVIS answers **out loud and on screen**. You can also type into the bar and press Enter.

| Say or type something like… | You get |
|---|---|
| "What's the bias?", "Tell me the bias", "What's the bias for gold?" | The confirmed bias, how long it has held, and whether a flip is pending |
| "Why is it bearish?", "Why is it bullish?", "Explain the bias" | Every rule: how far the last close was above or below its level |
| "Gold price", "Where's gold?" | Live bid price and today's change |
| "Levels" | Price vs the daily open, the 50 EMA and yesterday's midpoint |
| "JARVIS", "Briefing", "Status report" | Price, bias and sessions in one go |
| "When does London open?", "Time until NY open", "Asia open" | Countdown in New York time |
| "Sessions" | All sessions |
| "Open Aegis", or just "Aegis" | Opens that project |
| "Mute" / "Unmute" | Turns spoken replies off or on (also the 🔊 button) |
| "Help" | Everything it understands |

Notes:
- Starting with "Hey JARVIS…" works too.
- Typos are fixed for you. If it doesn't understand, it suggests the closest commands.
- Speech-to-text is done by Apple or Google, the same service as keyboard dictation. Everything after that is plain code.
- **iPhone:** if the mic gives an error, check Settings → Safari → Microphone, and Settings → General → Keyboard → Enable Dictation. The keyboard's own dictation mic always works as a backup.

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
