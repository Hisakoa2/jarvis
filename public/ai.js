// JARVIS AI helper (optional). It uses YOUR free Groq key, saved only on this device, never in the code.
// It only answers things JARVIS's own rules don't understand, or anything you start with "ask AI".
// Trade calls (bias, buy/sell, stops, sizing, the bot) always stay with JARVIS's rules.
const AI = (() => {
  const KEY = 'jarvis.groqKey', MODEL_KEY = 'jarvis.groqModel';
  const BASE = 'https://api.groq.com/openai/v1';
  // first one Groq still offers wins; if Groq retires them all, JARVIS picks another chat model itself
  const PREFER = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
  const get = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const put = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch {} };
  const key = () => get(KEY).trim();
  const ready = () => key().length >= 20;
  let chat = []; // the last few back-and-forths, so follow-up questions make sense

  const fail = (code, msg) => Object.assign(new Error(msg || String(code)), { code });
  async function req(path, opts = {}) {
    let r;
    try {
      r = await fetch(BASE + path, { ...opts, headers: { Authorization: 'Bearer ' + key(), 'Content-Type': 'application/json' }, signal: AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined });
    } catch { throw fail('net'); }
    let body = null;
    try { body = await r.json(); } catch {}
    if (!r.ok) throw fail(r.status, (body && body.error && body.error.message) || 'HTTP ' + r.status);
    return body;
  }
  async function model(force) {
    const saved = get(MODEL_KEY);
    if (saved && !force) return saved;
    const list = await req('/models');
    const ids = ((list && list.data) || []).filter((m) => m && m.id && m.active !== false).map((m) => m.id);
    const pick = PREFER.find((p) => ids.includes(p)) ||
      ids.find((i) => /llama|gpt-oss|qwen|gemma|mixtral|kimi/i.test(i) && !/guard|whisper|tts|vision|prompt|distil|orpheus|playai/i.test(i));
    if (!pick) throw fail('model');
    put(MODEL_KEY, pick);
    return pick;
  }
  function system(title) {
    const t = title || 'sir';
    const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    return [
      `You are JARVIS, a calm, friendly personal assistant. Address the user as "${t}".`,
      'Your reply is read out loud, so write plain sentences only: no markdown, bullet points, headings, emojis or links.',
      'Keep it short (one to four sentences) unless they ask for more detail. Use simple everyday words.',
      'Be accurate. If you are not sure, say so. You have no live data (news, prices, scores, weather), so say that instead of guessing.',
      'Never make trading calls: no buy, sell or hold calls, no entries, stop losses, take profits or position sizes, and no personal investment advice.',
      `If they ask for one, say: "For trade calls, ask me about the bias or your trade, ${t}, and I'll use your rules." You may explain trading ideas in general terms.`,
      'Stay positive and encouraging.',
      `Right now it is ${now} in New York.`,
    ].join(' ');
  }
  // plain text for speaking: drop thinking blocks and markdown symbols
  const tidy = (s) => String(s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/[*_#`>]+/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n{2,}/g, '\n').trim();

  async function ask(text, { title } = {}) {
    if (!ready()) throw fail('nokey');
    const messages = [{ role: 'system', content: system(title) }, ...chat.slice(-8), { role: 'user', content: String(text).slice(0, 2000) }];
    const send = async (m) => req('/chat/completions', { method: 'POST', body: JSON.stringify({ model: m, messages, max_tokens: 400, temperature: 0.6 }) });
    let out;
    try { out = await send(await model()); }
    catch (e) {
      // the saved model was retired → pick a new one and try once more
      if (e.code === 404 || (e.code === 400 && /model/i.test(e.message))) out = await send(await model(true));
      else throw e;
    }
    const a = tidy(out && out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content);
    if (!a) throw fail('empty');
    chat.push({ role: 'user', content: String(text).slice(0, 2000) }, { role: 'assistant', content: a });
    chat = chat.slice(-8);
    return a;
  }
  async function test(title) { await model(true); const a = await ask('Reply with exactly: AI helper ready.', { title }); chat = []; return a; }
  function why(e, title) {
    const t = title ? `, ${title}` : '';
    const c = e && e.code;
    if (c === 'nokey') return `My AI helper isn't set up yet${t}. Add your free Groq key in Settings, under AI helper.`;
    if (c === 401 || c === 403) return `My AI key isn't working${t}. Check it in Settings, under AI helper.`;
    if (c === 429) return /day|daily|TPD|RPD/i.test(e.message) ? `My AI helper is out of questions for today${t}. It resets tomorrow.` : `My AI helper is busy for a moment${t}. Try again in a minute.`;
    if (c === 'net') return `I can't reach my AI helper right now${t}. Check your connection.`;
    if (c === 'model') return `My AI helper couldn't find a model to use${t}.`;
    return `My AI helper had a problem${t}. Try again in a bit.`;
  }
  function setKey(v) { put(KEY, String(v || '').trim()); put(MODEL_KEY, ''); chat = []; }
  // "ask AI …", "AI, …", "hey AI …" go straight to the helper
  function direct(text) {
    const m = String(text).match(/^\s*(?:hey\s+|ok\s+|okay\s+)?(?:(?:ask|use)\s+(?:the\s+|my\s+)?(?:ai|a\.i\.|groq)(?:\s+helper)?|ai|a\.i\.)\s*[,:]?\s+(.{2,})$/i);
    return m ? m[1].trim() : null;
  }
  return { ready, ask, test, why, setKey, direct, hasKey: () => !!key() };
})();
