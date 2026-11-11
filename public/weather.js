// Weather from Open-Meteo (free, no key, no account). Plain data, no AI.
// Location: the city typed in Settings, or — if none — the phone's location (it asks first).
const Weather = (() => {
  let cache = null; // { at, place, data }
  const CODES = {
    0: 'clear skies', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 48: 'foggy',
    51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
    71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'rain showers', 81: 'rain showers', 82: 'heavy showers',
    85: 'snow showers', 86: 'heavy snow showers', 95: 'thunderstorms', 96: 'thunderstorms with hail', 99: 'thunderstorms with hail',
  };
  const word = (c) => CODES[c] || 'mixed weather';
  const wet = (c) => c >= 51;

  async function json(url) {
    const r = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  function here() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('no-geo'));
      navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, name: 'your area' }), () => rej(new Error('geo-denied')), { timeout: 10000, maximumAge: 3600e3 });
    });
  }
  const STATES = { al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california', co: 'colorado', ct: 'connecticut', de: 'delaware', fl: 'florida', ga: 'georgia', hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa', ks: 'kansas', ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland', ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi', mo: 'missouri', mt: 'montana', ne: 'nebraska', nv: 'nevada', nh: 'new hampshire', nj: 'new jersey', nm: 'new mexico', ny: 'new york', nc: 'north carolina', nd: 'north dakota', oh: 'ohio', ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania', ri: 'rhode island', sc: 'south carolina', sd: 'south dakota', tn: 'tennessee', tx: 'texas', ut: 'utah', vt: 'vermont', va: 'virginia', wa: 'washington', wv: 'west virginia', wi: 'wisconsin', wy: 'wyoming', dc: 'district of columbia' };
  // "Avondale Estates, GA" / "Avondale Estates Georgia" / "Atlanta": the place name is searched,
  // and a state or country after it picks the right match.
  async function place(city) {
    if (city) {
      const words = city.replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
      for (let cut = 0; cut <= Math.min(2, words.length - 1); cut++) {
        const name = words.slice(0, words.length - cut).join(' ');
        const tail = words.slice(words.length - cut).join(' ').toLowerCase().replace(/\.$/, '');
        const g = await json(`https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=${encodeURIComponent(name)}`);
        let rs = g.results || [];
        if (!rs.length) continue;
        if (tail) {
          const st = STATES[tail] || tail;
          const f = rs.filter((r) => [r.admin1, r.country, r.country_code].some((x) => x && x.toLowerCase() === st) || (tail.length === 2 && (r.country_code || '').toLowerCase() === tail && !STATES[tail]));
          if (!f.length) continue;
          rs = f;
        }
        const r = rs[0];
        return { lat: r.latitude, lon: r.longitude, name: r.name + (cut && r.admin1 ? `, ${r.admin1}` : '') };
      }
      throw new Error('city-not-found');
    }
    return here();
  }

  async function get(city, force = false) {
    const key = city || '@here';
    if (!force && cache && cache.key === key && Date.now() - cache.at < 20 * 60e3) return cache;
    const p = await place(city);
    const d = await json(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(3)}&longitude=${p.lon.toFixed(3)}` +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset' +
      '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=2');
    cache = { key, at: Date.now(), place: p.name, d };
    return cache;
  }

  return { get, word, wet, cached: () => cache };
})();
