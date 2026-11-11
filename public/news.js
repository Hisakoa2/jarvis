// Economic calendar (this week's events) — plain data, no AI.
// Where it comes from:
//   • On GitHub Pages: data/calendar.json, refreshed every couple of hours by the
//     GitHub Action (.github/workflows/pages.yml) from the public Forex Factory feed.
//   • On the PC server: /api/calendar (server.js fetches the same feed).
// Gold reacts mostly to US data, so JARVIS focuses on USD events.
const News = (() => {
  let events = [], loadedAt = 0, ok = false, loading = null;

  function parse(list) {
    return (Array.isArray(list) ? list : [])
      .map((e) => ({
        title: String(e.title || '').replace(/\s+/g, ' ').trim(),
        country: String(e.country || ''),
        impact: String(e.impact || ''),
        at: Date.parse(e.date),
        forecast: e.forecast || '',
        previous: e.previous || '',
      }))
      .filter((e) => e.title && isFinite(e.at))
      .sort((a, b) => a.at - b.at);
  }

  async function fetchJson(url) {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function load(force = false) {
    if (!force && ok && Date.now() - loadedAt < 30 * 60e3) return events;
    if (loading) return loading;
    loading = (async () => {
      let server = false;
      try { server = typeof Data !== 'undefined' && (await Data.detectServer()); } catch {}
      const urls = location.protocol === 'file:' ? [] : server ? ['api/calendar', 'data/calendar.json'] : ['data/calendar.json'];
      for (const u of urls) {
        try {
          const list = parse(await fetchJson(u));
          if (list.length) { events = list; ok = true; loadedAt = Date.now(); break; }
        } catch { /* try the next source */ }
      }
      loading = null;
      return events;
    })();
    return loading;
  }

  const isUsd = (e) => e.country === 'USD';
  const isHigh = (e) => e.impact === 'High';
  const isMed = (e) => e.impact === 'Medium';
  // "Bank Holiday" style rows are flagged Holiday by the feed
  const isHoliday = (e) => e.impact === 'Holiday';

  // Events that matter for gold: USD high + medium impact
  function relevant() { return events.filter((e) => isUsd(e) && (isHigh(e) || isMed(e))); }
  function nextHigh(now = Date.now()) { return events.find((e) => isUsd(e) && isHigh(e) && e.at > now - 60e3) || null; }
  function nextAny(now = Date.now()) { return relevant().find((e) => e.at > now - 60e3) || null; }
  // High-impact USD event within `beforeMin` minutes ahead or `afterMin` minutes behind
  function near(now = Date.now(), beforeMin = 30, afterMin = 15) {
    return events.filter((e) => isUsd(e) && isHigh(e) && e.at - now <= beforeMin * 60e3 && now - e.at <= afterMin * 60e3);
  }
  // The latest event date in the feed, so we know how far ahead we can see
  const coversUntil = () => (events.length ? events[events.length - 1].at : 0);

  return {
    load, parse, relevant, nextHigh, nextAny, near, coversUntil, isUsd, isHigh, isMed, isHoliday,
    all: () => events, ok: () => ok, loadedAt: () => loadedAt,
  };
})();
