// Reminders: "remind me in an hour to do the dishes", "next time I open the app remind me to trade".
// Saved on this device only (localStorage). Plain date math, no AI.
//   due = a time (ms)  → pops up when that time comes (or the next time you open the app after it)
//   due = null         → shown the next time you open the app
const Reminders = (() => {
  const KEY = 'jarvis.reminders';
  const SESSION = Date.now() + '-' + Math.random().toString(36).slice(2, 7); // this app launch
  let list = load();
  function load() { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} }

  const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty five': 45, fifty: 50, sixty: 60, couple: 2, few: 3 };
  const UNIT = { s: 1000, sec: 1000, second: 1000, m: 60e3, min: 60e3, minute: 60e3, h: 3600e3, hr: 3600e3, hour: 3600e3, d: 864e5, day: 864e5, week: 7 * 864e5 };

  // Clock time in the user's time zone → timestamp (today, or tomorrow if `nextDay`)
  function atClock(now, tz, h, mi, dayOffset = 0) {
    const p = Sessions.parts(new Date(now), tz);
    const sec = new Date(now).getSeconds() * 1000 + new Date(now).getMilliseconds();
    return now - sec + (((h * 60 + mi) - (p.h * 60 + p.mi)) * 60e3) + dayOffset * 864e5;
  }

  // Pull the time out of a sentence. Returns { due, rest, when } — rest is the sentence without the time words.
  function parseWhen(s, now, tz) {
    let t = ' ' + s + ' ', due, when = 'next';
    const cut = (re) => { t = t.replace(re, ' '); };
    // "in an hour", "in 20 minutes", "in half an hour", "in a couple hours"
    let m = t.match(/\b(?:in|after)\s+(half an? hour|an? hour and a half|(?:a\s+)?(?:couple|few)(?:\s+of)?|\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty five|forty|fifty|sixty)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|[smhd])?\b/);
    if (m && (m[2] || /half|hour/.test(m[1]))) {
      if (/half an? hour/.test(m[1])) due = now + 30 * 60e3;
      else if (/hour and a half/.test(m[1])) due = now + 90 * 60e3;
      else {
        const n = /^\d/.test(m[1]) ? +m[1] : NUM[m[1].replace(/^a\s+/, '').replace(/\s+of$/, '')] || 1;
        const u = (m[2] || 'hour').replace(/s$/, '');
        due = now + n * (UNIT[u] || 3600e3);
      }
      when = 'time'; cut(m[0]);
    }
    // "tomorrow", "tonight", "this afternoon", "in the morning"
    let dayOff = 0, defH = null;
    if (/\btomorrow\b/.test(t)) { dayOff = 1; defH = 9; cut(/\b(?:tomorrow morning|tomorrow night|tomorrow evening|tomorrow afternoon|tomorrow)\b/); if (/tomorrow (night|evening)/.test(s)) defH = 19; if (/tomorrow afternoon/.test(s)) defH = 14; if (/tomorrow morning/.test(s)) defH = 8; }
    else if (/\btonight\b|\bthis evening\b/.test(t)) { defH = 20; cut(/\b(?:tonight|this evening)\b/); }
    else if (/\bthis afternoon\b/.test(t)) { defH = 14; cut(/\bthis afternoon\b/); }
    else if (/\b(?:this|in the) morning\b/.test(t)) { defH = 8; cut(/\b(?:this|in the) morning\b/); }
    // "at 5", "at 5:30 pm", "at 17:00", "at noon"
    m = t.match(/\b(?:at|by|around)\s+(noon|midnight|\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?(?=\s|$)/);
    if (due == null && (m || defH != null)) {
      let h = defH, mi = 0;
      if (m) {
        if (m[1] === 'noon') h = 12; else if (m[1] === 'midnight') h = 0; else h = +m[1];
        mi = m[2] ? +m[2] : 0;
        const ap = m[3] ? m[3][0] : null;
        if (ap === 'p' && h < 12) h += 12;
        if (ap === 'a' && h === 12) h = 0;
        if (!ap && m[1] !== 'noon' && m[1] !== 'midnight' && h <= 12) {
          // no am/pm: evening words → pm; otherwise the next time that clock time comes round
          if (defH != null && defH >= 14 && h < 12) h += 12;
          else if (!dayOff) { const p = Sessions.parts(new Date(now), tz); if (h < 12 && (p.h * 60 + p.mi) >= h * 60 + mi) h += 12; }
        }
        cut(m[0]);
      }
      due = atClock(now, tz, h, mi, dayOff);
      if (due <= now) due += 864e5;
      when = 'time';
    }
    // "next time I open the app", "when I come back"
    if (/\b(?:next time|when i (?:open|come back|get back|log in|check)|later)\b/.test(t)) cut(/\b(?:the\s+)?next time(?:\s+i\s+(?:open|check|use|come back to|get on)\s+(?:up\s+)?(?:the app|this app|the application|jarvis|you|it)?(?:\s+up)?)?|when i (?:open|come back|get back|log in|check)(?:\s+(?:up\s+)?(?:the app|this app|jarvis|you|it))?(?:\s+up)?|\blater\b/g);
    return { due: due == null ? null : due, rest: t.replace(/\s+/g, ' ').trim(), when };
  }

  // "remind me to do the dishes" → "do the dishes"; first person → second person
  function tidy(s) {
    let t = ' ' + s.toLowerCase() + ' ';
    t = t.replace(/\b(?:hey|ok|okay|yo)?\s*jarvis\b/g, ' ')
      .replace(/\b(?:can you|could you|would you|will you|please|go ahead and|i want you to|i need you to|make sure (?:you|to))\b/g, ' ')
      .replace(/\b(?:set (?:a|an|me a)?\s*reminder(?: for me)?|add (?:a|an)?\s*reminder|reminder|remind me|don'?t let me forget|make sure i|remember)\b/g, ' ')
      .replace(/^\s*(?:to|that|about|of|for)\s+/, ' ')
      .replace(/^\s*(?:i (?:need|have|got|gotta|must|should) to|i need|i have|i gotta)\s+/, ' ')
      .replace(/\bmy\b/g, 'your').replace(/\bmyself\b/g, 'yourself').replace(/\bi am\b|\bi'm\b/g, 'you are').replace(/\bi\b/g, 'you').replace(/\bme\b/g, 'you')
      .replace(/[.!?,]+\s*$/, '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^(?:to|that|about|of)\s+/, '').replace(/\s+(?:to|and|then)$/, '').trim();
    return t;
  }

  function add(raw, now, tz) {
    const w = parseWhen(raw.toLowerCase().replace(/[’‘]/g, "'"), now, tz);
    const text = tidy(w.rest);
    if (!text || text.length < 2) return null;
    const r = { id: now.toString(36) + Math.random().toString(36).slice(2, 5), text, due: w.due, created: now, session: SESSION };
    list.push(r); save();
    return r;
  }
  // Reminders to show at app launch: timed ones that are due, and "next open" ones made in an earlier launch
  function takeOnOpen(now) {
    const out = list.filter((r) => (r.due == null ? r.session !== SESSION : r.due <= now));
    if (out.length) { list = list.filter((r) => !out.includes(r)); save(); }
    return out;
  }
  // While the app is open: timed reminders that just came due
  function takeDue(now) {
    const out = list.filter((r) => r.due != null && r.due <= now);
    if (out.length) { list = list.filter((r) => !out.includes(r)); save(); }
    return out;
  }
  // Coming back to the app after a while counts as "opening" it for next-open reminders
  function takeOnReturn() {
    const out = list.filter((r) => r.due == null);
    if (out.length) { list = list.filter((r) => !out.includes(r)); save(); }
    return out;
  }
  function remove(match) {
    const before = list.length;
    if (match == null) list = [];
    else if (typeof match === 'number') list = list.filter((_, i) => i !== match);
    else { const q = match.toLowerCase(); list = list.filter((r) => !r.text.includes(q)); }
    save();
    return before - list.length;
  }
  function all() { return list.slice().sort((a, b) => (a.due || Infinity) - (b.due || Infinity)); }
  return { add, takeOnOpen, takeDue, takeOnReturn, remove, all, parseWhen, tidy };
})();
