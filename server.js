// ============================================================================
//  JARVIS — optional PC server (Run JARVIS.bat)
//  The dashboard itself runs in the browser. This server only:
//   - serves the files in /public on your home network
//   - adds your OANDA key from .env to requests, so you don't have to type the
//     key into the browser on this PC. The key never leaves this server.
//  On the iPhone / GitHub Pages version the key is entered in Settings instead.
//  Plain Node.js, nothing to install. Requires Node 18 or newer.
// ============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const API_KEY = (process.env.OANDA_API_KEY || '').trim();
const ACCOUNT_ID = (process.env.OANDA_ACCOUNT_ID || '').trim();
const OANDA_ENV = (process.env.OANDA_ENV || 'practice').trim().toLowerCase();
const OANDA_HOST = OANDA_ENV === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
const INSTRUMENT = 'XAU_USD';
const looksPlaceholder = (v) => !v || /your|paste|xxx|here/i.test(v);
const HAS_KEY = !looksPlaceholder(API_KEY) && !looksPlaceholder(ACCOUNT_ID);

// Only these candle parameters are passed through to OANDA
const CANDLE_PARAMS = ['granularity', 'count', 'price', 'alignmentTimezone', 'dailyAlignment', 'from', 'to'];

async function proxy(kind, query) {
  let url;
  if (kind === 'pricing') url = `${OANDA_HOST}/v3/accounts/${encodeURIComponent(ACCOUNT_ID)}/pricing?instruments=${INSTRUMENT}`;
  else if (kind === 'summary') url = `${OANDA_HOST}/v3/accounts/${encodeURIComponent(ACCOUNT_ID)}/summary`;
  else if (kind === 'candles') {
    const q = new URLSearchParams();
    for (const k of CANDLE_PARAMS) if (query.has(k)) q.set(k, query.get(k));
    url = `${OANDA_HOST}/v3/instruments/${INSTRUMENT}/candles?${q}`;
  } else return { status: 404, body: { error: 'Unknown endpoint' } };
  const r = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}`, 'Accept-Datetime-Format': 'RFC3339' }, signal: AbortSignal.timeout(10000) });
  let body = {};
  try { body = await r.json(); } catch {}
  if (!r.ok) {
    let msg = body.errorMessage || `OANDA returned HTTP ${r.status}`;
    msg += ' (check OANDA_API_KEY, OANDA_ACCOUNT_ID and OANDA_ENV in .env)';
    console.error(`[${new Date().toLocaleTimeString()}] ${msg}`);
    return { status: r.status, body: { error: msg } };
  }
  return { status: 200, body };
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function serveStatic(res, urlPath) {
  const rel = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, buf) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

// Economic calendar (Forex Factory's public weekly feed). Cached for 30 minutes —
// the feed limits how often it can be fetched.
const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
let calendarCache = { at: 0, body: null };
async function calendar() {
  if (calendarCache.body && Date.now() - calendarCache.at < 30 * 60e3) return calendarCache.body;
  try {
    const r = await fetch(CALENDAR_URL, { headers: { 'User-Agent': 'JARVIS-dashboard' }, signal: AbortSignal.timeout(10000) });
    const body = r.ok ? await r.json() : null;
    if (Array.isArray(body)) calendarCache = { at: Date.now(), body };
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString()}] calendar: ${e.message}`);
  }
  return calendarCache.body || [];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/status') return sendJson(res, 200, { proxy: HAS_KEY, env: OANDA_ENV });
    if (url.pathname === '/api/calendar') return sendJson(res, 200, await calendar());
    if (url.pathname.startsWith('/api/oanda/')) {
      if (!HAS_KEY) return sendJson(res, 503, { error: 'No OANDA key in .env' });
      const r = await proxy(url.pathname.slice('/api/oanda/'.length), url.searchParams);
      return sendJson(res, r.status, r.body);
    }
    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Unknown endpoint' });
    return serveStatic(res, url.pathname);
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString()}] ${url.pathname}: ${e.message}`);
    return sendJson(res, 502, { error: e.message });
  }
});

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ name, address: a.address });
  }
  const score = (x) => (/vethernet|virtual|vmware|vbox|hyper-v|wsl|docker/i.test(x.name) ? 2 : x.address.startsWith('192.168.') ? 0 : 1);
  return out.sort((a, b) => score(a) - score(b));
}

function openBrowser(url) {
  if (process.platform === 'win32') exec(`start "" "${url}"`);
  else if (process.platform === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`\n  JARVIS already seems to be running on port ${PORT}. Opening it in your browser.\n`);
    if (process.argv.includes('--open')) openBrowser(`http://localhost:${PORT}`);
    setTimeout(() => process.exit(0), 1500);
  } else { console.error(e); process.exit(1); }
});

server.listen(PORT, '0.0.0.0', () => {
  const line = '='.repeat(60);
  console.log(`\n${line}\n   J.A.R.V.I.S.  //  COMMAND CENTER ONLINE\n${line}`);
  console.log(`\n   On this PC:     http://localhost:${PORT}`);
  const ips = lanAddresses();
  if (ips.length) {
    console.log(`   On your iPhone: http://${ips[0].address}:${PORT}   (same Wi-Fi)`);
    for (const ip of ips.slice(1)) console.log(`                   http://${ip.address}:${PORT}   (${ip.name})`);
  }
  console.log(HAS_KEY
    ? `\n   Data feed: OANDA ${OANDA_ENV.toUpperCase()} (key from .env)`
    : '\n   !! No OANDA key in .env - the dashboard runs in DEMO mode\n   !! unless you enter a key in its Settings screen.');
  console.log('\n   Leave this window open while you use JARVIS. Close it to stop.\n');
  if (process.argv.includes('--open')) openBrowser(`http://localhost:${PORT}`);
});
