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

  function stopRec() { if (rec) { try { rec.onend = null; rec.abort(); } catch {} } rec = null; recMode = null; }

  // ---- one-shot: tap the mic, say a command
  function listenOnce(h) {
    if (!Rec) { h.onError('Voice commands aren’t supported in this browser. Use Safari on iPhone or Chrome/Edge on PC — or the keyboard’s dictation mic.'); return; }
    if (recMode === 'once') { stopRec(); h.onState(false); resumeWake(); return; }
    stopSpeaking();
    stopRec();
    onceHandlers = h;
    rec = makeRec('once'); recMode = 'once';
    let finalText = '', finalAlts = [];
    rec.onstart = () => { h.onState(true); emit('listening'); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; finalAlts.push(Array.from(e.results[i]).map((a) => a.transcript)); } else interim += e.results[i][0].transcript;
      }
      h.onInterim((finalText + interim).trim());
    };
    rec.onerror = (e) => { if (ERRORS[e.error]) h.onError(ERRORS[e.error]); else if (e.error === 'no-speech') h.onError('I didn’t hear anything.'); };
    rec.onend = () => {
      rec = null; recMode = null;
      h.onState(false); emit('idle');
      // one spoken chunk → offer every guess; several chunks → just the joined best text
      if (finalText.trim()) h.onFinal(finalText.trim(), finalAlts.length === 1 ? finalAlts[0].map((x) => x.trim()).filter(Boolean) : null);
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
          if (awaitingCommand || WAKE_RE.test(text)) h.onInterim(text);
          continue;
        }
        const alts = Array.from(res).map((a) => a.transcript.trim()).filter(Boolean);
        if (awaitingCommand) { endAwait(); if (text) h.onCommand(text, alts); continue; }
        const m = text.match(WAKE_RE);
        if (!m) continue;
        const after = text.slice(m.index + m[0].length).replace(/^[\s,.!?]+/, '').trim();
        if (after.split(' ').length >= 2 || (after && !/^(please|um|uh)$/i.test(after))) h.onCommand(text, alts);
        else { // just "JARVIS" → wait for the command
          awaitingCommand = true;
          h.onWake();
          h.onState('awake');
          clearTimeout(awaitTimer);
          awaitTimer = setTimeout(() => { endAwait(); h.onState('on'); }, 8000);
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
    canSpeak: !!synth,
    isSpeaking: () => speaking,
  };
})();
