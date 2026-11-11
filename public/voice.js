// ============================================================================
//  JARVIS voice. Uses the browser's built-in speech features (no AI):
//   - Speaking: speechSynthesis, runs on the device.
//   - Listening: SpeechRecognition. Note: Apple/Google convert your speech to
//     text on their servers (same as Siri / keyboard dictation).
// ============================================================================
const Voice = (() => {
  const MUTE_KEY = 'jarvis.muted';
  const synth = window.speechSynthesis || null;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch {}

  // Prefer a British male voice — the most "JARVIS" option on each platform
  const PREFERRED = ['Daniel', 'Arthur', 'Google UK English Male', 'Microsoft Ryan', 'Microsoft George', 'Oliver', 'Malcolm', 'Rishi'];
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const all = synth.getVoices();
    if (!all.length) return;
    for (const name of PREFERRED) {
      const v = all.find((x) => x.name.includes(name) && x.lang.startsWith('en'));
      if (v) { voice = v; return; }
    }
    voice = all.find((x) => x.lang === 'en-GB') || all.find((x) => x.lang.startsWith('en')) || all[0];
  }
  if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  }

  // iPhone only allows speech after a tap. Speak a silent word on the first tap to unlock it.
  let unlocked = false;
  function unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }
  ['touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { once: false, passive: true }));

  function speak(text, onStart, onEnd) {
    if (!synth || muted || !text) { onEnd && onEnd(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-GB';
    u.rate = 1.02;
    u.pitch = 0.95;
    u.onstart = () => onStart && onStart();
    u.onend = u.onerror = () => onEnd && onEnd();
    synth.speak(u);
  }

  function stopSpeaking() { if (synth) synth.cancel(); }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
    if (muted) stopSpeaking();
  }

  // ---- listening -----------------------------------------------------------
  let rec = null, listening = false;
  // handlers: { onInterim(text), onFinal(text), onState(listening), onError(message) }
  function listen(h) {
    if (!Rec) { h.onError('Voice commands aren’t supported in this browser. Use Safari on iPhone or Chrome/Edge on PC — or the keyboard’s dictation mic.'); return; }
    if (listening) { rec && rec.stop(); return; }
    stopSpeaking();
    rec = new Rec();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => { listening = true; h.onState(true); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      h.onInterim((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      const map = {
        'not-allowed': 'Microphone access was blocked. Allow the microphone for this site (iPhone: Settings → Safari → Microphone).',
        'service-not-allowed': 'Speech recognition is turned off. iPhone: Settings → General → Keyboard → Enable Dictation, and Siri must be allowed.',
        'no-speech': 'I didn’t hear anything. Tap the mic and try again.',
        'audio-capture': 'No microphone found.',
        'network': 'Voice needs an internet connection.',
        'aborted': '',
      };
      const m = map[e.error] ?? `Voice error: ${e.error}`;
      if (m) h.onError(m);
    };
    rec.onend = () => {
      listening = false;
      h.onState(false);
      if (finalText.trim()) h.onFinal(finalText.trim());
    };
    try { rec.start(); } catch (err) { h.onError(`Couldn’t start the microphone: ${err.message}`); }
  }

  return {
    speak, stopSpeaking, listen, setMuted,
    isMuted: () => muted,
    canListen: !!Rec,
    canSpeak: !!synth,
    voiceName: () => (voice ? voice.name : 'default'),
  };
})();
