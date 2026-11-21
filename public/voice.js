// ============================================================================
//  JARVIS voice. Built-in browser speech (no AI):
//   - Speaking: speechSynthesis, runs on the device. Pick any installed voice.
//   - Listening: SpeechRecognition. Apple/Google turn speech into text on their
//     servers (same as Siri / keyboard dictation).
//   - Hands-free: listens continuously while the app is open and wakes up when
//     it hears "JARVIS" ("hey" optional).
// ============================================================================
const Voice = (() => {
  const PREF_KEY = 'jarvis.voice';
  const synth = window.speechSynthesis || null;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let prefs = { muted: false, voiceURI: null, rate: 1.0, pitch: 1.0, handsFree: true };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch {}
  try { if (localStorage.getItem('jarvis.muted') === '1') prefs.muted = true; } catch {}
  // v11: hands-free (just say "Jarvis") is on for everyone once; you can still switch it off in Settings
  try { if (!prefs.wake11) { prefs.handsFree = true; prefs.wake11 = true; localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } } catch {}
  const save = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} };

  // Rank voices so the best-sounding British male voice is the default.
  const GOOD = [/natural|neural|premium|enhanced|online/i];
  const MALE = /daniel|arthur|ryan|george|oliver|malcolm|rishi|thomas|james|guy|eric|aaron|alex|fred|david|mark|uk english male|male/i;
  function rank(v) {
    let s = 0;
    if (!v.lang.toLowerCase().startsWith('en')) return -100;
    if (v.lang === 'en-GB') s += 30;
    if (/premium/i.test(v.name)) s += 60; // Apple's best on-device voices
    else if (/natural|neural|online/i.test(v.name)) s += 55; // Edge's natural voices
    else if (/enhanced/i.test(v.name)) s += 45;
    if (/^(samantha|fred|albert|bad news|junior|kathy|ralph|trinoids|whisper|zarvox)$/i.test(v.name.split(' ')[0]) && !/enhanced|premium/i.test(v.name)) s -= 15;
    if (MALE.test(v.name)) s += 20;
    if (/novelty|bad news|bells|bubbles|boing|cellos|hysterical|organ|trinoids|whisper|zarvox|albert|jester|superstar|wobble|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i.test(v.name)) s -= 80;
    if (v.localService === false) s += 5;
    return s;
  }
  let voices = [];
  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')).sort((a, b) => rank(b) - rank(a));
  }
  if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }
  const current = () => voices.find((v) => v.voiceURI === prefs.voiceURI) || voices[0] || null;

  // iPhone only allows speech after a tap — speak a silent word on the first tap.
  let unlocked = false;
  function unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }
  ['touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));

  const listeners = new Set();
  const emit = (state) => listeners.forEach((fn) => fn(state));
  let speaking = false;

  // Make prices and symbols sound natural
  function speakable(t) {
    return String(t).replace(/XAU\s*\/?\s*USD/gi, 'gold').replace(/\bET\b/g, '').replace(/\b1H\b/g, 'one hour').replace(/\b4H\b/g, 'four hour')
      .replace(/(\d),(\d{3})/g, '$1$2').replace(/\s+/g, ' ').trim();
  }

  function speak(text, { force = false, onStart, onEnd } = {}) {
    if (!synth || (!force && prefs.muted) || !text) { onEnd && onEnd(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    const v = current();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = prefs.rate;
    u.pitch = prefs.pitch;
    u.onstart = () => { speaking = true; pauseWake(); emit('speaking'); onStart && onStart(); };
    u.onend = u.onerror = () => { speaking = false; emit('idle'); resumeWake(); onEnd && onEnd(); };
    synth.speak(u);
  }
  function stopSpeaking() { if (synth) synth.cancel(); speaking = false; emit('idle'); }

  // ---------------------------------------------------------------- listening
  // One-shot (mic button) and hands-free share one recogniser.
  let rec = null, recMode = null; // 'once' | 'wake'
  let onceHandlers = null, wakeHandlers = null;
  let wakePaused = false, wakeWanted = false, awaitingCommand = false, awaitTimer = null;
  // just say "Jarvis" ("hey" is optional), plus the ways speech-to-text often mishears it
  const WAKE_RE = /\b(?:hey|hi|ok|okay|yo)?\s*(?:jarvis|jervis|javis|jarvas|jarves|jarvus|jarvez|jarviss|travis|jarvi|charvis|garvis|darvis|jar vis)\b/i;

  const ERRORS = {
    'not-allowed': 'Microphone access was blocked. To stop being asked every time on iPhone: in Safari tap the “aA” button → Website Settings → Microphone → Allow. Home Screen app: Settings → Apps → Safari → Microphone → Allow.',
    'service-not-allowed': 'Speech recognition is off. iPhone: Settings → General → Keyboard → Enable Dictation (and allow Siri).',
    'audio-capture': 'No microphone found.',
    'network': 'Voice needs an internet connection.',
  };

  function makeRec(mode) {
    const r = new Rec();
    r.lang = 'en-US';
    r.interimResults = true;
    r.continuous = mode === 'wake';
    r.maxAlternatives = 4; // several guesses: the app picks the one that makes the most sense
    return r;
  }

  // ---- v22: the "good ear". The browser still spots "JARVIS" and when you stop talking.
  // SMART mode (default): if the browser is sure of what you said, JARVIS answers instantly. Only when it's
  // unsure (or heard nothing, usually quiet talking) does the recording go through Whisper.
  // Whisper runs ON THIS DEVICE (free, no key): on a PC with a graphics card it uses the GPU (well under a second);
  // otherwise a smaller model on the processor. It downloads once and is cached. A Groq key, if ever added, is used instead.
  const Ear = (() => {
    const VOCAB = 'JARVIS, gold, XAU/USD, take profit, stop loss, TP, SL, liquidity sweep, higher high, lower low, 1 hour, 4 hour, London session, New York session, Asia session, bias, bullish, bearish, contracts, paper trade, calendar.';
    const JUNK = /^(thanks?( you)?( for watching)?|you|bye|okay|\.+|\[.*\]|\(.*\)|subtitles.*)[.!]?$/i;
    let stream = null, mr = null, chunks = [], judge = null;
    const st = { state: 'off', pct: 0, device: '', model: '', err: '' };
    const subs = [];
    const set = (o) => { Object.assign(st, o); subs.forEach((f) => { try { f({ ...st }); } catch {} }); };
    const key = () => { try { return (localStorage.getItem('jarvis.groqKey') || '').trim(); } catch { return ''; } };
    const mode = () => prefs.ear || 'smart'; // smart | whisper | browser
    const PHONE = /iPhone|iPad|Android/i.test(navigator.userAgent) || innerWidth < 760;
    // only record when the recording will actually be used (Groq key, or Whisper loaded and ready)
    const on = () => mode() !== 'browser' && (key().length >= 20 || st.state === 'ready') && typeof MediaRecorder !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    async function start() {
      if (!on() || mr) return;
      try {
        if (!stream || !stream.active) stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        chunks = []; mr = new MediaRecorder(stream);
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        mr.start();
      } catch { mr = null; }
    }
    function release() { if (stream && !wakeWanted) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
    function stop() {
      return new Promise((res) => {
        if (!mr) return res(null);
        const m = mr; mr = null;
        m.onstop = () => res(new Blob(chunks, { type: m.mimeType || 'audio/webm' }));
        try { m.stop(); } catch { res(null); }
      });
    }
    function cancel() { if (mr) { try { mr.onstop = null; mr.stop(); } catch {} mr = null; } release(); }

    // ---- on-device Whisper (transformers.js; GPU when available) ----
    let asr = null;
    const savedFlagRaw = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const savedFlag = () => savedFlagRaw('jarvis.whisperReady');
    const flag = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
    function load() {
      if (asr) return asr;
      flag('jarvis.whisperBusy', '1'); // crash guard: cleared when loading finishes either way
      set({ state: 'downloading', pct: 0, err: '' });
      const files = {};
      asr = (async () => {
        const T = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
        let gpu = false;
        try { gpu = !PHONE && !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch {} // phones: always the small model
        const model = gpu ? 'onnx-community/whisper-base.en' : 'onnx-community/whisper-tiny.en';
        set({ device: gpu ? 'graphics card' : 'processor', model: gpu ? 'base' : 'tiny' });
        const p = await T.pipeline('automatic-speech-recognition', model, {
          device: gpu ? 'webgpu' : 'wasm',
          dtype: gpu ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
          progress_callback: (e) => {
            if (e.status === 'progress' && e.total) {
              files[e.file] = [e.loaded, e.total];
              const v = Object.values(files), l = v.reduce((x, y) => x + y[0], 0), t = v.reduce((x, y) => x + y[1], 0);
              set({ pct: Math.round((l / t) * 100) });
            }
          },
        });
        set({ state: 'warming', pct: 100 });
        await p(new Float32Array(16000)); // first run compiles the GPU code: do it now, not on your first command
        try { localStorage.setItem('jarvis.whisperReady', st.model); } catch {}
        flag('jarvis.whisperBusy', null);
        set({ state: 'ready' });
        return p;
      })().catch((e) => { asr = null; flag('jarvis.whisperBusy', null); set({ state: 'error', err: String((e && e.message) || e).slice(0, 120) }); throw e; });
      return asr;
    }
    async function toPcm(blob) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC({ sampleRate: 16000 });
      try { const buf = await ac.decodeAudioData(await blob.arrayBuffer()); return buf.getChannelData(0); } finally { if (ac.close) ac.close(); }
    }
    async function local(blob) {
      const run = await load();
      const out = await run(await toPcm(blob));
      return ((out && out.text) || '').trim();
    }
    async function groq(blob) {
      const ext = /mp4|aac|m4a/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
      const fd = new FormData();
      fd.append('file', blob, 'speech.' + ext); fd.append('model', 'whisper-large-v3-turbo');
      fd.append('language', 'en'); fd.append('temperature', '0'); fd.append('prompt', VOCAB);
      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key() }, body: fd, signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
      if (!r.ok) throw new Error('whisper ' + r.status);
      return ((await r.json()).text || '').trim();
    }
    async function transcribe(blob) {
      if (!blob || blob.size < 1500) return null;
      if (key().length >= 20) return groq(blob);
      if (st.state !== 'ready') { load().catch(() => {}); return null; } // still downloading: use the browser's words this time
      return Promise.race([local(blob), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]);
    }
    // is the browser's text good enough to answer right now?
    function sure(text, conf) {
      if (!text || mode() === 'whisper') return false;
      if (conf >= 0.8) return true;
      try { return !!(judge && judge(text) >= 6); } catch { return false; }
    }
    // pick the words: instant if the browser is sure, otherwise Whisper (falls back to the browser's words)
    async function finish(fallback, conf = 0) {
      if (sure(fallback, conf)) { cancel(); return fallback; }
      const b = await stop(); release();
      try { const t = await transcribe(b); return t && !JUNK.test(t) ? t.replace(/^[\s.,]+|[\s.]+$/g, '') : fallback; } catch { return fallback; }
    }
    // crash guard: if the app died while Whisper was loading last time, don't auto-load it again on this device
    if (savedFlagRaw('jarvis.whisperBusy') === '1') { flag('jarvis.whisperBusy', null); flag('jarvis.whisperCrashed', '1'); }
    if (savedFlagRaw('jarvis.whisperCrashed') === '1') st.state = 'crashed';
    // get the model ready in the background on the first tap. Phones: only if you turned it on before and it never crashed.
    const auto = () => mode() !== 'browser' && !key() && st.state !== 'crashed' && (!PHONE || !!savedFlag());
    const warm = () => { if (auto()) load().catch(() => {}); };
    ['click', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, () => setTimeout(warm, 1500), { once: true }));
    // manual load from Settings also clears an old crash mark (you chose to try again)
    document.addEventListener('visibilitychange', () => { if (document.hidden) flag('jarvis.whisperBusy', null); else if (st.state === 'downloading' || st.state === 'warming') flag('jarvis.whisperBusy', '1'); });
    addEventListener('pagehide', () => flag('jarvis.whisperBusy', null));
    const manualLoad = () => { flag('jarvis.whisperCrashed', null); if (st.state === 'crashed') st.state = 'off'; return load(); };
    return { on, start, finish, cancel, load: manualLoad, phone: PHONE, recording: () => !!mr, status: () => ({ ...st, saved: savedFlag() }), onStatus: (f) => subs.push(f), setJudge: (f) => { judge = f; } };
  })();

  function stopRec() { if (rec) { try { rec.onend = null; rec.abort(); } catch {} } rec = null; recMode = null; }

  // ---- one-shot: tap the mic, say a command
  function listenOnce(h) {
    if (!Rec) { h.onError('Voice commands aren’t supported in this browser. Use Safari on iPhone or Chrome/Edge on PC — or the keyboard’s dictation mic.'); return; }
    if (recMode === 'once') { stopRec(); h.onState(false); resumeWake(); return; }
    stopSpeaking();
    stopRec();
    onceHandlers = h;
    rec = makeRec('once'); recMode = 'once';
    let finalText = '', finalAlts = [], finalConf = 1;
    rec.onstart = () => { h.onState(true); emit('listening'); Ear.start(); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; finalConf = Math.min(finalConf, e.results[i][0].confidence || 0); finalAlts.push(Array.from(e.results[i]).map((a) => a.transcript)); } else interim += e.results[i][0].transcript;
      }
      h.onInterim((finalText + interim).trim());
    };
    rec.onerror = (e) => { if (ERRORS[e.error]) h.onError(ERRORS[e.error]); else if (e.error === 'no-speech' && !Ear.recording()) h.onError('I didn’t hear anything.'); };
    rec.onend = async () => {
      rec = null; recMode = null;
      h.onState(false); emit('idle');
      const heard = finalText.trim();
      // Whisper also gets a go when the browser heard nothing — that's usually quiet talking
      const text = Ear.recording() ? await Ear.finish(heard, heard ? finalConf : 0) : heard;
      // one spoken chunk → offer every guess; several chunks → just the joined best text
      if (text) h.onFinal(text, text === heard && finalAlts.length === 1 ? finalAlts[0].map((x) => x.trim()).filter(Boolean) : null);
      else if (!heard) h.onError('I didn’t hear anything.');
      setTimeout(resumeWake, 300);
    };
    try { rec.start(); } catch (err) { h.onError(`Couldn’t start the microphone: ${err.message}`); }
  }

  // ---- hands-free: always listening for "JARVIS"
  // h: { onWake(), onCommand(text), onInterim(text), onState('on'|'off'|'awake'), onError(msg) }
  function startWake(h) {
    if (!Rec) { h.onError('Hands-free needs Safari (iPhone) or Chrome/Edge (PC).'); return false; }
    wakeHandlers = h; wakeWanted = true;
    runWake();
    return true;
  }
  function stopWake() {
    wakeWanted = false; awaitingCommand = false; clearTimeout(awaitTimer);
    if (recMode === 'wake') stopRec();
    wakeHandlers && wakeHandlers.onState('off');
  }
  function pauseWake() { wakePaused = true; if (recMode === 'wake') stopRec(); }
  function resumeWake() { wakePaused = false; if (wakeWanted && !rec && !speaking) setTimeout(runWake, 250); }

  let failures = 0;
  function runWake() {
    if (!wakeWanted || wakePaused || rec || speaking || document.hidden) return;
    const h = wakeHandlers;
    rec = makeRec('wake'); recMode = 'wake';
    const started = Date.now();
    rec.onstart = () => { h.onState(awaitingCommand ? 'awake' : 'on'); };
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i], text = res[0].transcript.trim();
        if (!res.isFinal) {
          if (awaitingCommand || WAKE_RE.test(text)) { h.onInterim(text); Ear.start(); }
          continue;
        }
        const alts = Array.from(res).map((a) => a.transcript.trim()).filter(Boolean);
        const conf = res[0].confidence || 0;
        const send = (t) => { if (!Ear.recording()) return h.onCommand(t, alts); Ear.finish(t, conf).then((w) => { w = w || t; if (w !== t && !WAKE_RE.test(w)) w = 'Jarvis, ' + w; h.onCommand(w, w === t ? alts : [w]); }); };
        if (awaitingCommand) { endAwait(); if (text) send(text); else Ear.cancel(); continue; }
        const m = text.match(WAKE_RE);
        if (!m) { Ear.cancel(); continue; }
        const after = text.slice(m.index + m[0].length).replace(/^[\s,.!?]+/, '').trim();
        if (after.split(' ').length >= 2 || (after && !/^(please|um|uh)$/i.test(after))) send(text);
        else { // just "JARVIS" → wait for the command (keep recording — Whisper gets the command)
          Ear.start();
          awaitingCommand = true;
          h.onWake();
          h.onState('awake');
          clearTimeout(awaitTimer);
          awaitTimer = setTimeout(() => { endAwait(); Ear.cancel(); h.onState('on'); }, 8000);
        }
      }
    };
    rec.onerror = (e) => {
      if (ERRORS[e.error]) { h.onError(ERRORS[e.error]); if (e.error === 'not-allowed' || e.error === 'service-not-allowed') stopWake(); }
    };
    rec.onend = () => {
      rec = null; recMode = null;
      // browsers stop listening every so often — restart, backing off if it keeps failing
      failures = Date.now() - started < 1500 ? failures + 1 : 0;
      if (failures > 6) { h.onError('Hands-free keeps stopping — tap the core or the mic to wake it.'); h.onState('paused'); failures = 0; return; }
      if (wakeWanted && !wakePaused) setTimeout(runWake, failures ? 600 * failures : 150);
    };
    try { rec.start(); } catch { rec = null; recMode = null; setTimeout(runWake, 1000); }
  }
  function endAwait() { awaitingCommand = false; clearTimeout(awaitTimer); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (recMode === 'wake') stopRec(); } else resumeWake(); });

  return {
    speak, stopSpeaking, listenOnce, startWake, stopWake, resumeWake,
    onState: (fn) => listeners.add(fn),
    setMuted(m) { prefs.muted = !!m; save(); if (m) stopSpeaking(); },
    isMuted: () => prefs.muted,
    get prefs() { return { ...prefs }; },
    setPref(k, v) { prefs[k] = v; save(); },
    voices: () => { loadVoices(); return voices; },
    voiceName: () => (current() ? current().name : 'default'),
    canListen: !!Rec,
    ear: Ear,
    canSpeak: !!synth,
    isSpeaking: () => speaking,
  };
})();
