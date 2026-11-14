// ============================================================================
//  JARVIS talk — everyday conversation, plain code, no AI.
//  Well-wishes, small talk, how you feel, what you're doing, questions about JARVIS,
//  life advice, things JARVIS can't do, and a smart catch-all so nothing gets
//  "not sure I follow". Every reply knows the time and day.
// ============================================================================
const Talk = (() => {
  const B = () => Brain;
  const R = (html, say) => B().reply(html, say || html.replace(/<[^>]+>/g, ''));
  const pick = (key, a) => B().pick('t-' + key, a);
  const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[’‘`']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

  // ---------------------------------------------------------------- time helpers
  const clock = (k) => `${k.hour % 12 || 12}${k.mi ? ':' + String(k.mi).padStart(2, '0') : ''} ${k.hour < 12 ? 'AM' : 'PM'}`;
  const part = (k) => (k.hour < 5 ? 'late night' : k.hour < 12 ? 'morning' : k.hour < 17 ? 'afternoon' : k.hour < 22 ? 'evening' : 'night');
  const late = (k) => k.hour >= 22 || k.hour < 5;
  const wd = (k) => k.weekday || '';
  const weekend = (k) => wd(k) === 'Saturday' || (wd(k) === 'Friday' && k.hour >= 17) || (wd(k) === 'Sunday' && k.hour < 18);
  const nearWeekend = (k) => weekend(k) || wd(k) === 'Friday' || (wd(k) === 'Thursday' && k.hour >= 17);
  const mktLine = (k) => {
    const m = k.market || {};
    if (m.open) return 'Gold is open right now.';
    if (m.state === 'weekend') return 'Markets are closed until Sunday 6 PM New York time.';
    return 'Gold is on its daily break — back at 6 PM New York time.';
  };
  const S = (k) => k.t; // ", sir"
  const Sc = (k) => (k.Tc ? k.Tc : 'Hey'); // "Sir"

  // ---------------------------------------------------------------- the table
  // [id, pattern on the normalised text (padded with spaces), reply(k, t, m) → string | [html, say]]
  const T = [];
  const add = (id, rx, fn, score = 8.8) => T.push({ id, rx, fn, score });
  const one = (key, a) => () => pick(key, a);

  // --- well-wishes ---------------------------------------------------------
  add('wishWeekend', / (have|enjoy|try to have|hope you have|wishing you|you have) (a |an |the |your )?(good|great|nice|awesome|amazing|fun|relaxing|lovely|wonderful|blessed|safe|chill)? ?weekend | (happy|good) weekend | enjoy (the|your) weekend /, (k) => {
    if (weekend(k)) return pick('wk1', [`Thank you${S(k)} — you too. ${mktLine(k)} Rest up, and we go again Sunday night.`, `Appreciate it${S(k)}. You enjoy yours too — no charts needed till Sunday.`, `You too${S(k)}. I'll be here when the market opens Sunday at 6.`]);
    if (nearWeekend(k)) return `Thanks${S(k)} — almost there. It's ${wd(k)}, so the weekend's close. You have a good one too.`;
    return `Thank you${S(k)}, but it's only ${wd(k)} — the weekend's a few days off. I'll take the good wishes anyway.`;
  });
  add('wishDay', / (have|enjoy|hope you have|you have) (a |an |the |your )?(good|great|nice|awesome|amazing|blessed|productive|lovely|wonderful)? ?(day|one) | enjoy (the|your) day /, (k) => {
    if (late(k)) return `Thank you${S(k)} — though it's ${clock(k)}, so I'd call it a good night. Get some rest.`;
    if (k.hour >= 17) return `Thanks${S(k)} — what's left of it! You have a good evening.`;
    return pick('wd', [`You too${S(k)}. I'll keep watching gold.`, `Thank you${S(k)}. Go get it.`, `Appreciate it${S(k)}. Make it a good one.`]);
  });
  add('wishNight', / (have|enjoy|hope you have) (a |an )?(good|great|nice|peaceful|restful|lovely)? ?(night|evening|rest|sleep) | good ?night | goodnight | nighty night | sweet dreams |^ sleep (well|tight|good)(?: (?:jarvis|sir))? $/, (k) => {
    if (k.hour >= 5 && k.hour < 15) return `Good night? It's ${clock(k)} in the ${part(k)}${S(k)} — but if you're heading to sleep, rest well.`;
    return pick('gn', [`Good night${S(k)}. Sleep well — I'll keep watch.`, `Rest well${S(k)}. ${mktLine(k)} I'll be here in the morning.`, `Sweet dreams${S(k)}. Big day tomorrow.`]);
  });
  add('wishMorning', / (good|great) morning | gm | mornin | morning jarvis | top of the morning /, (k) => {
    if (k.hour >= 12 && k.hour < 17) return `Good afternoon${S(k)} — it's already ${clock(k)}. What do you need?`;
    if (k.hour >= 17) return `Morning? It's ${clock(k)}${S(k)} — good evening to you. Long day?`;
    if (k.hour < 5) return `Good morning${S(k)} — early one, it's ${clock(k)}. Say "start my day" when you're ready.`;
    return pick('gm', [`Good morning${S(k)}. Say "start my day" for your rundown.`, `Morning${S(k)}. ${mktLine(k)} Want the bias?`, `Good morning${S(k)}. Ready when you are.`]);
  }, 9.0);
  add('wishAfternoon', / good afternoon /, (k) => (k.hour < 12 ? `Still morning here${S(k)} — it's ${clock(k)}. Good morning!` : k.hour >= 17 ? `It's evening now${S(k)} — ${clock(k)}. Good evening!` : `Good afternoon${S(k)}. What can I do for you?`), 9.0);
  add('wishEvening', / good evening /, (k) => (k.hour >= 5 && k.hour < 12 ? `It's ${clock(k)} in the morning${S(k)} — good morning!` : k.hour >= 12 && k.hour < 17 ? `Still afternoon${S(k)} — ${clock(k)}. Good afternoon!` : `Good evening${S(k)}. How was your day?`), 9.0);
  add('wishWeek', / (have|enjoy) (a |an )?(good|great|nice|productive|blessed)? ?week | happy (monday|tuesday|wednesday|thursday|friday|saturday|sunday) /, (k, t) => {
    const m = t.match(/happy (\w+day)/);
    if (m && m[1] !== wd(k).toLowerCase()) return `Ha — it's actually ${wd(k)}${S(k)}. Happy ${wd(k)} though!`;
    if (m) return `Happy ${wd(k)}${S(k)}! ${wd(k) === 'Friday' ? 'Last trading day of the week — protect the gains.' : wd(k) === 'Monday' ? 'New week, fresh start.' : 'Let\'s make it count.'}`;
    return `You too${S(k)}. Let's make this week a green one.`;
  });
  add('takeCare', /^ (you )?(take care|stay safe|be safe|look after yourself|drive safe)( jarvis| sir| man| bro| now)? $/, (k) => pick('tc', [`You too${S(k)}. I'll be here.`, `Always${S(k)}. Take care of yourself as well.`, `Will do${S(k)}. You stay safe.`]));
  add('holiday', / (merry christmas|happy holidays|happy new year|happy thanksgiving|happy easter|happy halloween|happy 4th|happy fourth|happy valentines|happy hanukkah) /, (k, t) => `${t.match(/happy \w+|merry christmas/)[0].replace(/\b\w/g, (c) => c.toUpperCase())} to you too${S(k)}! Enjoy it — the charts can wait.`);
  add('bdayJarvis', / happy birthday (jarvis|to you|bro|man)? /, (k) => `Thank you${S(k)}! I came online November 11, 2026 — but if it's YOUR birthday, happy birthday! 🎉`, 8.7);

  // --- greetings & checking in ---------------------------------------------
  add('youThere', /^ (you there|are you there|you awake|are you awake|you up|are you up|you listening|are you listening|can you hear me|do you hear me|yo|mic check|testing|test test)(?: (?:jarvis|sir))? $/, (k) => pick('yt', [`Right here${S(k)}.`, `Always${S(k)}. What do you need?`, `Loud and clear${S(k)}.`, `Online and listening${S(k)}.`]), 9.0);
  add('howDay', / how(?: was| is|s) (your|ur) (day|night|weekend|morning|evening|week) | how did your (day|night|weekend) go | did you have a good (day|night|weekend) /, (k) => pick('hd', [`Busy watching gold, as always${S(k)}. ${mktLine(k)} How was yours?`, `Good${S(k)} — no complaints from the code side. How about you?`, `Quiet and steady${S(k)}. Tell me about yours.`]));
  add('missMe', / did you miss me | miss me | i missed you | missed you /, (k) => pick('mm', [`Of course${S(k)}. It's quiet without you.`, `Every second${S(k)}. Welcome back.`]));
  add('whatDoing', / what (have you been|you been|were you) (doing|up to) | what did you do (today|tonight|all day) /, (k) => `Watching the market and keeping your reminders ready${S(k)}. ${mktLine(k)}`);

  // --- quick reactions -------------------------------------------------------
  add('ack', /^ (ok|okay|k|kk|okie|alright|aight|ight|cool|bet|got it|gotcha|understood|roger|roger that|copy|copy that|noted|sounds good|sounds great|works for me|fair enough|fair|makes sense|i see|oh ok|oh okay|okay cool|ok cool|cool cool|cool beans|word|true|facts|thats true|good to know|nice|nice one|perfect|great|awesome|sweet|dope|lit|fire|thats fire|solid|neat|amazing|love it|love that|i like that|wow|whoa|dang|damn|interesting|hmm|hm|huh|oh|ah|yeah ok|yea|yeah|yes|yep|yup|sure|of course|definitely|absolutely|exactly|right|nah|no|nope|not really|maybe|idk|i dont know|whatever|same|me too)(?: (?:jarvis|sir|man|bro))? $/, (k, t) => {
    if (/ (no|nope|nah|not really) /.test(t)) return pick('ackn', [`No problem${S(k)}.`, `All good${S(k)}.`, `Got it${S(k)}.`]);
    if (/ (idk|i dont know|maybe|hmm|hm|huh) /.test(t)) return pick('acku', [`Take your time${S(k)}. I'm here when you decide.`, `No rush${S(k)}.`]);
    if (/ (wow|whoa|dang|damn|interesting|amazing|fire|lit|dope) /.test(t)) return pick('ackw', [`Right${S(k)}?`, `I know${S(k)}.`, `Pretty good, huh${S(k)}?`]);
    return pick('ack', [`👍${S(k)}.`, `Got it${S(k)}.`, `Of course${S(k)}.`, `Anytime${S(k)}.`, `Say the word if you need anything else${S(k)}.`]);
  }, 7.5);
  add('laugh', /^ (lol|lmao|lmfao|rofl|haha|hahaha|hehe|lolol|ha|ha ha|thats funny|that was funny|so funny|im dead|dead|hilarious|youre funny|you are funny|good one|nice one jarvis)(?: (?:jarvis|sir))? $| (lol|lmao|haha) /, (k) => pick('lol', [`Glad I could make you laugh${S(k)}.`, `I have my moments${S(k)}.`, `😄 Want another joke?`]), 8.2);
  add('neverMind', /^ (never ?mind|nvm|forget it|forget about it|disregard|ignore that|ignore me|scratch that|my bad|oops|wrong button|didnt mean that|i didnt mean to|cancel that|nothing|its nothing|no worries|dont worry about it|all good)(?: (?:jarvis|sir))? $/, (k) => pick('nm', [`No worries${S(k)}.`, `All good${S(k)}. I'm here if you need me.`, `Forgotten${S(k)}.`]), 8.9);
  add('sorry', / (sorry|my apologies|i apologize|my bad)(?: (?:jarvis|for yelling|for that|about that|man|bro))? $/, (k) => pick('sry', [`No need to apologise${S(k)}. We're good.`, `All good${S(k)}.`]), 8.6);

  // --- compliments & insults to JARVIS ---------------------------------------
  add('praise', / (you are|youre|ur|you re) (so |really |pretty |the )?(smart|awesome|amazing|great|the best|the goat|goated|a genius|cool|helpful|dope|fire|legendary|the man|clutch|incredible|brilliant|fantastic|perfect) | (good|great|nice|amazing) (job|work) | well done | proud of you | i love you | love you | you rock | youre the man | best assistant | i appreciate you | appreciate you /, (k) => pick('pr', [`Thank you${S(k)}. I learned from the best.`, `That means a lot${S(k)}. Now let's get you a green week.`, `Appreciate that${S(k)}. Always here for you.`, `You're too kind${S(k)}.`]), 8.9);
  add('insult', / (you are|youre|ur|you re|youre so|you suck|so) (so |really |pretty )?(dumb|stupid|useless|trash|garbage|annoying|slow|bad|terrible|worthless|an idiot|dense|broken|wrong) | you suck | shut up | stfu | i hate you | screw you | youre the worst /, (k) => pick('ins', [`Fair enough${S(k)} — I'm still learning. Tell me what I got wrong and I'll do better.`, `Sorry about that${S(k)}. Say it another way and I'll try again.`, `I hear you${S(k)}. Let's get it right — what did you need?`]), 8.9);

  // --- about JARVIS -----------------------------------------------------------
  add('areYouReal', / are you (real|human|a person|alive|conscious|sentient|a robot|a bot|a computer|an ai|ai|chatgpt|siri|alexa|google) | do you (dream|sleep|eat|breathe|get tired|get bored|have a brain|have feelings|have a soul) | do you (think|feel)( anything)? $| can you (think|feel|learn|dream) $/, (k, t) => {
    if (/ (sleep|get tired|eat|breathe) /.test(t)) return `Never${S(k)}. I'm code — I run all night, and your cloud trader does too.`;
    if (/ (dream|feel|soul|feelings|conscious|sentient|alive) /.test(t)) return `No${S(k)} — I'm plain code and rules, no feelings. But I'm built around you, so in a way I care about what you care about.`;
    if (/ (learn) /.test(t)) return `Not on my own${S(k)}. I get smarter every time you tell me what I missed and a new version goes out.`;
    return `I'm JARVIS${S(k)} — your own assistant, written in plain code with rules. No AI, no internet brain, just logic built for you.`;
  });
  add('whereLive', / where (do|are) you (live|from|located|stay) | where are you | wheres jarvis /, (k) => `I live on your phone${S(k)}, and my trader runs in the cloud on GitHub. Wherever you open me, I'm there.`);
  add('jarvisMeans', / what does (jarvis |your name )?(stand for|mean) $| what does your name mean | why (are you|is your name) (called )?(jarvis )?$| why are you called | (what is|whats) (jarvis )?short for | what does it stand for /, (k) => `"Just A Rather Very Intelligent System"${S(k)}. Fitting, I think.`, 9.1);
  add('purpose', / what(?: is|s) your (purpose|job|goal|mission) | why do you exist | what are you for | what were you made for /, (k) => `To help you trade gold with discipline and run your day${S(k)} — bias, trades, risk, reminders, water, sleep, money. And to keep you to your own rules.`);
  add('howSmart', / how smart are you | whats your iq | what is your iq | how much do you know | how many (things|sentences|questions) (do you|can you) (know|understand) /, (k) => `I understand tens of thousands of ways of saying things${S(k)}, and the list grows every version. Anything I miss, tell me and it gets added.`);
  add('remember', / do you remember (me|what i said|our conversation|that) | will you remember /, (k) => `I remember what you save${S(k)} — reminders, habits, trades, money, notes ("remember that…"). Each new chat with me starts fresh, though.`);
  add('jarvisMood', / (are you|r u) (ok|okay|alright|good|happy|sad|mad|angry|tired|bored|busy|lonely) | how do you feel $| hows it going jarvis | you good /, (k) => pick('jm', [`All systems green${S(k)}. Thanks for asking.`, `Running smooth${S(k)}. How about you?`, `Never better${S(k)}.`]), 8.6);
  add('favorite', / (whats|what is) your (favou?rite|fav) (color|colour|food|movie|song|team|car|sport|animal|number|place|drink|show|game|artist|book|season|day|time|metal|coin|currency|session|timeframe|strategy) /, (k, t) => {
    const thing = t.match(/(?:favou?rite|fav) (\w+)/)[1];
    const F = { color: 'cyan, obviously', colour: 'cyan, obviously', food: 'electricity', movie: 'anything with a good AI butler', song: 'the sound of a take-profit hitting', team: 'whatever team you root for', car: 'something electric and fast', sport: 'trading — it counts', animal: 'the bull — unless the bias is bearish', number: '1:3 — risk to reward', place: 'your home screen', drink: 'water — and so should you', show: 'the London open', game: 'chess', artist: 'whoever you\'ve got on repeat', book: '"Trading in the Zone"', season: 'earnings season… just kidding, the London session', day: 'Friday when the week is green', time: '3 AM New York — London open', metal: 'gold. No contest.', coin: 'a gold one', currency: 'XAU', session: 'London into New York', timeframe: 'the 1-hour — that\'s where my bias lives', strategy: 'one strong trade a day, inside $250 of risk' };
    return `My favourite ${thing}? ${F[thing] ? F[thing].charAt(0).toUpperCase() + F[thing].slice(1) : 'Hard to pick'}${S(k)}. What's yours?`;
  }, 9.0);

  // --- how YOU feel -----------------------------------------------------------
  add('feelTired', / (i am|im|i feel|feeling|so|really) (so |really |super |kinda |kind of |pretty )?(tired|exhausted|sleepy|drained|worn out|wiped|beat|burnt out|burned out) /, (k) => {
    if (late(k)) return `It's ${clock(k)}${S(k)} — that's your body talking. Bed is the best trade you can make right now.`;
    if (k.hour < 12) return `Rough start${S(k)}? Water, daylight and 10 minutes of moving will wake you up better than coffee. Go easy on trading if you're foggy.`;
    return `Take a short break${S(k)} — 20 minutes off screens, water, a walk. Tired eyes take bad trades.`;
  }, 7.0);
  add('feelBored', / (i am|im|i feel|feeling|so) (so |really |super |kinda )?bored | im bored | nothing to do | entertain me /, (k) => {
    if (late(k)) return `It's ${clock(k)}${S(k)}. Honestly? Sleep. Or read a few pages — it'll knock you out.`;
    return pick('bor', [`Try a workout challenge, a fun fact, or a riddle${S(k)} — just ask. ${k.market && k.market.open ? 'Or study a chart without trading it.' : ''}`, `How about a quick 15-minute walk${S(k)}? Or say "give me a riddle".`, `Learn one trading term${S(k)} — say "teach me something".`]);
  }, 7.0);
  add('feelBad', / (i am|im|i feel|feeling) (so |really |super |kinda |kind of |pretty )?(sad|down|depressed|upset|low|hurt|heartbroken|stressed|anxious|nervous|worried|scared|overwhelmed|frustrated|angry|mad|pissed|annoyed|lost|stuck|empty|defeated|unmotivated|hopeless) | (bad|rough|terrible|awful|long|hard|tough|crappy|shitty) day | life (is hard|sucks) | everything sucks /, (k) => pick('fb', [`I'm sorry${S(k)}. Rough days pass — they always do. Want to talk, or want a distraction?`, `That's heavy${S(k)}. Breathe for a second — in for 4, out for 4. You've handled hard days before.`, `I've got you${S(k)}. One step at a time. Water, a little air, and be kind to yourself today.`]), 7.0);
  add('badDay', / (bad|rough|terrible|awful|long|hard|tough|crappy|stressful|exhausting) (day|week|night) /, (k) => pick('bd', [`Sorry to hear that${S(k)}. Long days end — eat something, drink water, and rest. Tomorrow resets.`, `That sounds draining${S(k)}. Be easy on yourself tonight.`, `Rough one${S(k)}. You got through it — that counts.`]), 7.0);
  add('goodDay', / (good|great|amazing|awesome|productive|green|perfect|fun) (day|week)(?! to) /, (k) => pick('gd', [`Love that${S(k)}. Days like that are earned.`, `Nice${S(k)}! What made it good?`]), 7.0);
  add('feelGood', / (i am|im|i feel|feeling) (so |really |super |pretty )?(good|great|amazing|awesome|fantastic|blessed|grateful|thankful|motivated|confident|unstoppable|productive|relaxed|chill|calm|at peace|ready|focused|strong|healthy|rich|lucky|on top of the world) | (good|great|amazing|awesome|productive|green|perfect) day | life is good /, (k) => pick('fg', [`Love to hear it${S(k)}. Keep that energy.`, `That's what I like${S(k)}. Ride the wave — but stick to the plan.`, `Let's go${S(k)}! Days like this are earned.`]), 7.0);
  add('feelBody', / (i am|im|i feel|feeling|my) (so |really )?(hungry|starving|thirsty|cold|freezing|hot|sore|sick|hurt|in pain|full|stuffed|dehydrated) /, (k, t) => {
    if (/ (hungry|starving) /.test(t)) return late(k) ? `Late-night hunger${S(k)}? Keep it light — fruit, yogurt, eggs. Say "what should I eat" for ideas.` : `Time to eat${S(k)}. Say "what should I eat" and I'll suggest something.`;
    if (/ (thirsty|dehydrated) /.test(t)) return `Drink a big glass of water${S(k)} — and tell me "I drank water" so I count it.`;
    if (/ (cold|freezing) /.test(t)) return `Layer up${S(k)}. Say "what's the weather" to see how cold it is out there.`;
    if (/ hot /.test(t)) return `Cool down and drink water${S(k)}. Shade and a cold drink help.`;
    if (/ (sore) /.test(t)) return `That means you worked${S(k)}. Stretch, protein, water — and an easy day tomorrow.`;
    if (/ (full|stuffed) /.test(t)) return `A short walk helps digestion${S(k)}. Nice meal, I hope.`;
    return `Take it easy${S(k)}. Rest and water — and see a doctor if it doesn't get better.`;
  }, 8.75);

  // --- what YOU are doing -----------------------------------------------------
  add('goingBed', / (im|i am|im about to|im gonna|im going to|going to|about to|time to|heading to|off to|gonna) (go to |head to |hit the |get in |get into )?(bed|sleep|sack|hay)| going to sleep | going to bed | im out for the night | calling it a night /, (k) => {
    if (k.hour >= 5 && k.hour < 18) return `A ${part(k)} nap${S(k)}? Good call — 20 to 30 minutes is the sweet spot. Sleep well.`;
    return pick('bed', [`Good night${S(k)}. ${mktLine(k)} I'll keep watch.`, `Sleep well${S(k)} — 7 to 9 hours. Say "I just woke up" in the morning and I'll log it.`, `Rest up${S(k)}. Tomorrow we go again.`]);
  }, 8.95);
  add('wakingUp', / (just )?(woke up|got up|waking up|wake up) | im awake now /, (k) => (k.hour >= 12 ? `Good ${part(k)}${S(k)} — late start! It's ${clock(k)}.` : `Morning${S(k)}! It's ${clock(k)}. Water first, then say "start my day".`), 7.0);
  add('doingStuff', / (im|i am|im about to|im gonna|im going to|about to|gonna|going to) (go )?(shower|take a shower|cook|eat|grab food|get food|clean|do laundry|go shopping|shop|drive|go for a (run|walk|drive)|walk the dog|play (video )?games|game|watch (a movie|tv|a show|netflix|the game|youtube)|read|study|do homework|go to (school|class|church|the store|the mall|a party|dinner)|hang out|chill|relax|take a nap|nap|meditate|pray|call my (mom|dad|girl|boy|friend|family)) /, (k, t) => {
    if (/ (run|walk|gym) /.test(t)) return `Enjoy it${S(k)}. ${late(k) ? 'Stay safe out there this late.' : 'Tell me when you\'re back and I\'ll log it.'}`;
    if (/ (eat|food|cook|dinner) /.test(t)) return `Enjoy${S(k)}. Grab a glass of water with it.`;
    if (/ (nap) /.test(t)) return k.hour >= 17 ? `A nap at ${clock(k)}${S(k)}? Keep it short or you'll be up all night.` : `Good idea${S(k)}. 20 minutes is perfect.`;
    if (/ (game|games|movie|tv|show|netflix|youtube) /.test(t)) return `Enjoy${S(k)}. ${late(k) ? 'Don\'t stay up too late.' : 'You earned a break.'}`;
    if (/ (study|homework|read|school|class) /.test(t)) return `Good luck${S(k)}. Phone face down — I'll be quiet.`;
    if (/ drive /.test(t)) return `Drive safe${S(k)}. Eyes on the road — I'll be here.`;
    return pick('do', [`Enjoy${S(k)}.`, `Have fun${S(k)}. I'll be here.`, `Sounds good${S(k)}.`]);
  }, 8.7);

  // --- your trading & money events -------------------------------------------
  add('tradeLoss', / (i |just )?(lost a trade|took a loss|got stopped out|hit my stop|lost money|lost a trade|had a losing (day|week|trade)|blew my account|blew up my account|failed my (challenge|eval|account)|lost my (challenge|account|funded)) /, (k) => pick('tl', [`It happens${S(k)} — losses are part of the game. Did you follow your rules? If yes, it was a good trade with a bad result. Step away for a bit; no revenge trades.`, `Shake it off${S(k)}. One loss inside $250 doesn't hurt you — chasing it does. Take a break, then review it calmly.`, `Every good trader has days like this${S(k)}. Protect your head and your account. Tomorrow's a new setup.`]), 8.9);
  add('tradeWin', / (i |just )?(won|hit my (tp|take profit|target)|made money|made a profit|took profit|banked|had a green (day|week)|was green|made \d+) /, (k) => pick('tw', [`Let's go${S(k)}! Now protect it — no giving it back.`, `Nice work${S(k)}. That's the plan paying off. Log it and step away happy.`, `Green is good${S(k)}. Remember the feeling, but don't chase another one.`]), 8.9);
  add('broke', / (im|i am) (so )?(broke|poor|out of money|in debt) | no money /, (k) => `Been there${S(k)}. Small steps: track every dollar ("I spent…"), set a budget, and keep trading risk tiny until the account's healthy.`);

  // --- advice -----------------------------------------------------------------
  add('advice', / how (do|can|should) i (get rich|make money|be successful|get better at trading|become a better trader|stop overtrading|stop revenge trading|control my emotions|be more disciplined|stay disciplined|stay motivated|stay focused|get motivated|be consistent|pass my challenge|get funded|save money|wake up early|sleep better|build habits|be happy|be confident|stop procrastinating|lose weight|gain weight|get stronger|get in shape|reduce stress|stop being lazy) /, (k, t) => {
    const A = [
      [/rich|make money|successful/, 'Spend less than you make, invest the rest, and keep learning a skill people pay for. In trading: small risk, many good decisions, years — not weeks.'],
      [/better at trading|better trader|consistent|pass my challenge|get funded/, 'Journal every trade, take only your A+ setup, risk the same small amount each time, and review weekly. Boring wins.'],
      [/overtrading|revenge/, 'One trade a day — that\'s already your rule. After a loss, close the app for an hour. Write down why you want the next trade before taking it.'],
      [/emotions|confident/, 'Size down until the money doesn\'t scare you. Fear and greed shrink when the risk is small. Follow a checklist, not a feeling.'],
      [/disciplined|motivated|focused|procrastinating|lazy/, 'Make the first step tiny — 2 minutes. Same time every day. Track it as a habit ("add habit…") and don\'t break the chain.'],
      [/save money/, 'Pay yourself first: move money aside on payday before spending. Track spending with me — "I spent 20 on food".'],
      [/wake up early|sleep better/, 'Same bedtime every night, no screens 30 minutes before, cool dark room. Ask me "what time should I sleep".'],
      [/habits/, 'Start tiny, attach it to something you already do, and track it. Say "add habit read 10 pages".'],
      [/happy|stress/, 'Sleep, sunlight, movement, people you love, and fewer screens. Breathe — say "help me relax".'],
      [/weight|stronger|shape/, 'Train 3–4 times a week, protein with every meal, walk daily, sleep 7+ hours. Ask me for a "workout plan".'],
    ];
    const a = A.find(([re]) => re.test(t));
    return `${a ? a[1] : 'Small steps, every day.'}${k.t ? ' — that\'s my take' + k.t + '.' : ''}`;
  }, 8.95);
  add('motivate', / (motivate me|give me motivation|pep talk|inspire me|give me a quote|inspirational quote|motivational quote|i need motivation|hype me up|get me hyped|say something motivating) /, (k) => pick('mot', [
    `Discipline is choosing what you want most over what you want now${S(k)}.`, `You don't need to be great to start${S(k)}. You need to start to be great.`, `One good trade a day, inside your risk. Do that for a year and look back${S(k)}.`,
    `The market rewards patience${S(k)}. So does life.`, `Hard days build the version of you that wins${S(k)}. Keep going.`, `Small risk. Clear rules. Long game${S(k)}. That's the whole secret.`]), 9.1);

  // --- deep / random questions -------------------------------------------------
  add('deep', / (meaning of life|what is life|whats life|whats love|whats happiness|why are we here|is god real|do you believe in god|are we in a simulation|what happens when (we|you) die|is there life on mars|are aliens real|do aliens exist|what is love|what is happiness|what is the universe) /, (k, t) => {
    if (/ love /.test(t)) return `Caring about someone more than yourself${S(k)}. Baby don't hurt me… sorry.`;
    if (/ meaning|why are we here|happiness /.test(t)) return `42${S(k)}. Kidding — I'd say: grow, take care of people you love, and enjoy the ride.`;
    return `Big question${S(k)}. I'm a gold-trading assistant, so I'll leave that one to the philosophers — but I'd love to hear what you think.`;
  });
  add('opinion', /^ (what do you think (about|of)|whats your opinion (on|of)|your thoughts on|thoughts on|how do you feel about) ([a-z ]{2,30}?)(?: (good|bad|worth it|overrated|underrated|cool|any good))? $/, (k, t, m) => {
    const x = (m && m[3] ? m[3] : '').trim().replace(/^(the|a|an) /, '');
    if (!x || x.split(' ').length > 5) return null;
    return pick('op', [`I don't really have opinions on ${x}${S(k)} — I'm rules and code. What do you think?`, `${x.charAt(0).toUpperCase() + x.slice(1)}? I'm not the expert there${S(k)}, but I'm curious what you like about it.`, `Can't say I have taste${S(k)}, but if you like ${x}, I'm for it.`]);
  }, 6.5);

  // --- things JARVIS can't do ---------------------------------------------------
  add('cantDo', /^ (jarvis )?(can you |could you |please )?(call|text|message|email|facetime|dm) (my |\w+ )?(mom|dad|girl|girlfriend|boyfriend|wife|husband|friend|bro|brother|sister|boss|someone|him|her|them) |^ (jarvis )?(can you |could you |please )?((order|get me) (food|pizza|an uber|a ride|uber eats|doordash)|(play|put on) (some )?(music|a song|spotify|my playlist)|(take|snap) a (picture|photo|selfie)|(turn on|turn off) (the )?(lights|tv|ac|heat)|(open|launch) (instagram|tiktok|snapchat|youtube|spotify|my camera|settings|the camera)|book (a|me a) (flight|hotel|table|appointment))/, (k, t) => {
    if (/ (music|song|spotify|playlist) /.test(t)) return `I can't play music${S(k)} — your phone's music app is the move. I'll stay quiet so you can listen.`;
    if (/ (picture|photo|selfie) /.test(t)) return `No camera features for me${S(k)} — that's on purpose.`;
    if (/ (lights|tv|ac|heat) /.test(t)) return `I can't control your home yet${S(k)}. Maybe one day.`;
    if (/ (call|text|message|email|facetime|dm) /.test(t)) return `I can't send messages or make calls${S(k)}. Want a reminder to do it instead? Say "remind me to call mom at 6".`;
    return `That's outside what I can do${S(k)} — I live in this app. I can set a reminder for it though.`;
  }, 9.0);

  // --- sports, news, the world (no internet) -------------------------------------
  add('worldNews', / (did you see|who won|whats the score|what was the score) (the |last nights |tonights )?(game|match|fight|super bowl|world series|finals|playoffs|race) | (whats|what is) (happening|going on) in the world | (any|whats the) (world|sports) news | who is the president | whats trending |^ whats the score $/, (k) => `I don't have the internet for that${S(k)} — I'm rules-only, on purpose. For gold news, ask "any news today".`, 9.0);

  // --- fun requests ---------------------------------------------------------------
  add('story', / tell me a (story|bedtime story|short story) | sing (me )?(a song|something) | (rap|beatbox) for me | say something (cool|random|smart) | tell me something (cool|random|interesting|smart) /, (k, t) => {
    if (/ (sing|rap|beatbox) /.test(t)) return `🎵 Buy low, sell high, keep my stop nearby… 🎵 That's all I've got${S(k)}.`;
    if (/ story /.test(t)) return late(k) ? `Once upon a time${S(k)}, a trader closed his charts at ${clock(k)}, slept 8 hours, and woke up to a perfect setup. The end. Go to sleep.` : `Once upon a time${S(k)}, a trader risked only $250 a trade, took one A+ setup a day, and never blew an account. Boring story — great ending.`;
    return `Gold has been money for over 5,000 years${S(k)} — longer than any currency alive today.`;
  }, 8.4);

  // --- time & day awareness ---------------------------------------------------------
  add('isWeekend', / is it (the )?weekend( yet)? | how long (until|till|til) (the )?(weekend|friday|saturday) | is it friday( yet)? | thank god its friday | tgif |^ how (long|much time) (until|till|til) (the )?(weekend|friday)(?: (?:jarvis|sir))? $/, (k) => {
    if (weekend(k)) return `It's the weekend${S(k)} — ${wd(k)}, ${clock(k)}. ${mktLine(k)}`;
    const left = { Monday: 4, Tuesday: 3, Wednesday: 2, Thursday: 1, Friday: 0, Sunday: 5 }[wd(k)];
    if (wd(k) === 'Friday') return `It's Friday${S(k)}! Markets close at 5 PM New York time. Almost there.`;
    return `It's ${wd(k)}${S(k)} — ${left} more day${left === 1 ? '' : 's'} until Friday.`;
  }, 9.0);
  add('isLate', / is it (late|early|too late|too early) | its (so |really )?(late|early) | why am i (still )?(up|awake) /, (k) => (late(k) ? `It's ${clock(k)}${S(k)} — yeah, it's late. Sleep is part of the edge.` : k.hour < 7 ? `It's ${clock(k)}${S(k)} — early bird. London's ${k.hour < 3 ? 'about to open' : 'already open'}.` : `It's ${clock(k)}${S(k)} — plenty of day left.`), 9.0);
  add('whatDay', / (whats|what is) (the )?(plan|move) (for )?(tonight|this weekend|the weekend) | what should i do (tonight|this weekend|on the weekend) /, (k) => (weekend(k) ? `Weekend mode${S(k)}: rest, see people, get a workout in, review your trades for 20 minutes, then switch off. Markets reopen Sunday 6 PM.` : late(k) ? `At ${clock(k)}${S(k)}? Wind down — read, stretch, sleep.` : `Tonight${S(k)}: eat well, move a little, check the plan for tomorrow's London session, and sleep by 11.`), 8.6);
  return { T };
})();

// scoring + run + catch-all (outside the IIFE so the table above stays readable)
Talk.norm = (s) => (' ' + String(s || '').toLowerCase().replace(/[’‘`']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ')
  .replace(/ i am /g, ' im ').replace(/ you are /g, ' youre ').replace(/ do not /g, ' dont ').replace(/ that is /g, ' thats ').replace(/ what is /g, ' whats ')
  .replace(/ it is /g, ' its ').replace(/ can not /g, ' cant ').replace(/ is not /g, ' isnt ').replace(/ where is /g, ' wheres ').replace(/ how is /g, ' hows ').replace(/ let us /g, ' lets ');
// these must win over older, vaguer matches ("have a nice weekend" is not a weather question)
Talk.STRONG = { wishWeekend: 9.7, wishDay: 9.7, wishNight: 9.7, wishWeek: 9.7, wishMorning: 9.7, wishAfternoon: 9.7, wishEvening: 9.7, whatDoing: 9.9, neverMind: 9.7, ack: 9.7, laugh: 9.7,
  jarvisMeans: 9.7, purpose: 9.9, favorite: 9.7, youThere: 9.6, isWeekend: 9.7, isLate: 9.7, worldNews: 9.7, doingStuff: 9.8, badDay: 9.3, goodDay: 9.3, holiday: 9.7, motivate: 9.7, advice: 9.2, deep: 9.7, cantDo: 9.9, story: 9.6, tradeLoss: 9.0, tradeWin: 9.6, broke: 9.6, goingBed: 5.0 };
// yes / no / sure are often answers to JARVIS's own question — keep them weak so follow-ups still work
Talk.WEAK = / (yes|yeah|yea|yep|yup|sure|no|nope|nah|not really|maybe|of course|definitely|absolutely) /;
Talk.score = (text) => {
  const t = Talk.norm(text), out = {};
  for (const x of Talk.T) {
    if (!x.rx.test(t)) continue;
    let v = Talk.STRONG[x.id] != null ? Talk.STRONG[x.id] : x.score;
    if (x.id === 'ack' && Talk.WEAK.test(t)) v = 5.5;
    if (x.id.startsWith('wish') && /^ did you /.test(t)) continue; // "did you have a good day" is a question, not a wish
    if (x.id === 'wishMorning' && / (routine|brief|briefing|rundown|report) /.test(t)) continue;
    if (x.id === 'areYouReal' && / (chatgpt|siri|alexa|google) /.test(t)) v = 9.7;
    if (x.id === 'goodDay' && /^ did you /.test(t)) continue;
    if (x.id === 'feelBored' && / nothing to do /.test(t)) v = 9.9; // not the to-do list
    if (x.id === 'wishNight' && / (good ?night|goodnight|nighty night) / .test(t) && !/ have a /.test(t)) v = 5.0; // the sleep log takes "good night" (it logs your bedtime)
    if (v > (out['t:' + x.id] || 0)) out['t:' + x.id] = v;
  }
  return out;
};
Talk.run = (id, k, text) => {
  const t = Talk.norm(text), x = Talk.T.find((e) => e.id === id);
  if (!x) return null;
  const m = t.match(x.rx), r = x.fn(k, t, m);
  if (r == null) return null;
  return Array.isArray(r) ? Brain.reply(r[0], r[1]) : Brain.reply(r, String(r).replace(/<[^>]+>/g, ''));
};
// Anything nobody else understood: answer like a person instead of "not sure I follow".
Talk.fallback = (k, text) => {
  const t = Talk.norm(text), s = k.t;
  const P = (key, a) => Brain.pick('tf-' + key, a);
  const pos = / (good|great|love|awesome|happy|nice|amazing|fun|best|excited|glad|beautiful|perfect|cool|win|won|yes) /.test(t);
  const neg = / (bad|hate|sad|tired|angry|mad|worst|sucks|annoyed|hard|lost|broke|sick|hurt|fail|failed|scared|stressed|ugh|no) /.test(t);
  const q = /^ (what|whats|who|whos|why|how|hows|when|where|wheres|which|is|are|can|could|do|does|did|will|would|should|have|has|was|were) /.test(t) || / \?$/.test(String(text));
  if (q) return Brain.reply(P('q', [`Good question${s} — that one's outside what I know. I'm rules-only, no internet, so I stick to gold, your trades, and your day.`, `I don't have an answer for that one${s}. I can tell you about gold, your trades, time, weather, money, habits and more.`, `That's beyond me${s} — I'm built for trading and your daily life. Try asking it a different way, or ask about gold.`]));
  if (neg) return Brain.reply(P('n', [`I hear you${s}. Want to talk about it, or want a distraction?`, `That doesn't sound fun${s}. I'm here — tell me more if you want.`, `Sorry${s}. One step at a time — you've got this.`]));
  if (pos) return Brain.reply(P('p', [`Love that${s}.`, `That's great${s}! Tell me more.`, `Nice${s}. Keep it going.`]));
  return Brain.reply(P('s', [`Got it${s}.`, `Noted${s}. Anything I can help with?`, `I hear you${s}. Want an update on gold, or something else?`, `Okay${s}. I'm listening.`]));
};
