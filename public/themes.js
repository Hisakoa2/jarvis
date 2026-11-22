// v23 color themes. Runs in <head> so the right color shows from the very first frame.
// "auto" changes with the time of day: gold at dawn, blue by day, purple at sunset, red at night.
(function () {
  var KEY = 'jarvis.theme';
  var THEMES = {
    blue:   { acc: '92, 236, 255',  hi: '170, 246, 255', acc2: '255, 196, 64',  bg: '#010309' },
    red:    { acc: '255, 72, 88',   hi: '255, 170, 160', acc2: '255, 200, 80',  bg: '#090103' },
    green:  { acc: '60, 255, 150',  hi: '180, 255, 210', acc2: '210, 255, 90',  bg: '#010904' },
    gold:   { acc: '255, 196, 64',  hi: '255, 232, 160', acc2: '92, 236, 255',  bg: '#080501' },
    purple: { acc: '170, 120, 255', hi: '220, 200, 255', acc2: '255, 110, 210', bg: '#050210' },
    orange: { acc: '255, 128, 40',  hi: '255, 205, 150', acc2: '92, 236, 255',  bg: '#090401' },
    white:  { acc: '215, 235, 255', hi: '255, 255, 255', acc2: '92, 236, 255',  bg: '#030407' },
  };
  function autoName(d) {
    var h = (d || new Date()).getHours();
    if (h >= 5 && h < 10) return 'gold';
    if (h >= 10 && h < 17) return 'blue';
    if (h >= 17 && h < 21) return 'purple';
    return 'red';
  }
  function choice() { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } }
  var current = '';
  var subs = [];
  function apply() {
    var c = choice();
    var name = c === 'auto' || !THEMES[c] ? autoName() : c;
    if (name === current) return;
    current = name;
    var t = THEMES[name], r = document.documentElement;
    r.setAttribute('data-theme', name);
    r.style.setProperty('--acc', t.acc);
    r.style.setProperty('--acc-hi', t.hi);
    r.style.setProperty('--acc2', t.acc2);
    r.style.setProperty('--bg', t.bg);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t.bg);
    for (var i = 0; i < subs.length; i++) { try { subs[i](name, t); } catch (e) {} }
  }
  apply();
  setInterval(apply, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) apply(); });
  window.Themes = {
    list: Object.keys(THEMES),
    choice: choice,
    current: function () { return current; },
    rgb: function () { return THEMES[current].acc.split(',').map(Number); },
    set: function (c) { try { localStorage.setItem(KEY, c); } catch (e) {} current = ''; apply(); },
    onChange: function (fn) { subs.push(fn); },
  };
})();
