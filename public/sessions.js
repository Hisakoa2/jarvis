// Session clock math. Pure time-zone arithmetic, handles daylight saving automatically.
const Sessions = (() => {
  const fmtCache = {};
  function parts(date, tz) {
    const f = (fmtCache[tz] ||= new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
    const o = {};
    for (const p of f.formatToParts(date)) if (p.type !== 'literal') o[p.type] = +p.value;
    return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
  }

  // The UTC instant at which the wall clock in `tz` reads y-m-d h:mi
  function zonedToUtc(y, m, d, h, mi, tz) {
    const target = Date.UTC(y, m - 1, d, h, mi);
    let guess = target;
    for (let i = 0; i < 3; i++) {
      const p = parts(new Date(guess), tz);
      const diff = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - target;
      if (diff === 0) break;
      guess -= diff;
    }
    return guess;
  }

  const addDays = (y, m, d, k) => {
    const t = new Date(Date.UTC(y, m - 1, d + k));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
  };
  const hm = (s) => s.split(':').map(Number);
  const isWeekend = (wd) => wd === 0 || wd === 6;

  // Returns { open: bool, opensAt, closesAt, progress } for one session
  function status(sess, now = Date.now()) {
    const [oh, om] = hm(sess.open);
    const [ch, cm] = hm(sess.close);
    const today = parts(new Date(now), sess.timezone);
    // check yesterday..+7 days for a current window or the next open
    let next = null;
    for (let k = -1; k <= 8; k++) {
      const day = addDays(today.y, today.m, today.d, k);
      if (isWeekend(day.wd)) continue;
      const openAt = zonedToUtc(day.y, day.m, day.d, oh, om, sess.timezone);
      let closeAt = zonedToUtc(day.y, day.m, day.d, ch, cm, sess.timezone);
      if (closeAt <= openAt) closeAt += 24 * 3600e3; // overnight session
      if (now >= openAt && now < closeAt) {
        return { name: sess.name, open: true, opensAt: openAt, closesAt: closeAt, progress: (now - openAt) / (closeAt - openAt) };
      }
      if (openAt > now && !next) next = { name: sess.name, open: false, opensAt: openAt, closesAt: closeAt, progress: 0 };
    }
    return next;
  }

  function countdown(ms) {
    if (ms < 0) ms = 0;
    const t = Math.floor(ms / 1000);
    const d = Math.floor(t / 86400);
    const h = Math.floor((t % 86400) / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return (d ? `${d}d ` : '') + `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }

  function countdownWords(ms) {
    const t = Math.max(0, Math.round(ms / 60000));
    const d = Math.floor(t / 1440);
    const h = Math.floor((t % 1440) / 60);
    const m = t % 60;
    const out = [];
    if (d) out.push(`${d} day${d > 1 ? 's' : ''}`);
    if (h) out.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m || !out.length) out.push(`${m} minute${m !== 1 ? 's' : ''}`);
    return out.join(' ');
  }

  function fmtTime(ms, tz, withDay = true) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: '2-digit', ...(withDay ? { weekday: 'short' } : {}),
    }).format(new Date(ms));
  }

  return { status, countdown, countdownWords, fmtTime, parts };
})();
