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
  async function place(city) {
    if (city) {
      const g = await json(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(city)}`);
      const r = g.results && g.results[0];
      if (!r) throw new Error('city-not-found');
      return { lat: r.latitude, lon: r.longitude, name: r.name };
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
