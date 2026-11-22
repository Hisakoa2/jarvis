// v23 JARVIS emblem: layered HUD rings (boot, ambient, header).
// Each ring is its own flat SVG inside its own div, and only the div is rotated/faded.
// That keeps every animation on the GPU (transform + opacity only), so it stays smooth on iPhone.
window.Emblem = (() => {
  const C = 100;
  const rad = (d) => (d - 90) * Math.PI / 180;
  const pt = (r, d) => `${(C + r * Math.cos(rad(d))).toFixed(2)},${(C + r * Math.sin(rad(d))).toFixed(2)}`;
  const arc = (r, a0, a1) => `M${pt(r, a0)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(r, a1)}`;
  const svg = (inner) => `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">${inner}</svg>`;

  // ring pieces
  const outer = () => svg(
    `<circle cx="100" cy="100" r="97" class="s thin" opacity=".35"/>` +
    [[-8, 34], [62, 118], [146, 200], [232, 290]].map(([a, b]) => `<path d="${arc(93, a, b)}" class="s w3"/>`).join('') +
    `<path d="${arc(93, 300, 318)}" class="s w3 a2"/>`);
  const ticks = () => {
    let d = '';
    for (let i = 0; i < 72; i++) { const a = i * 5, long = i % 6 === 0; d += `M${pt(long ? 80 : 83, a)} L${pt(88, a)} `; }
    return svg(`<path d="${d}" class="s thin" opacity=".7"/>`);
  };
  const band = () => svg(
    `<path d="${arc(71, 20, 340)}" class="s w12" opacity=".28"/>` +
    [[24, 96], [104, 150], [158, 250], [258, 336]].map(([a, b]) => `<path d="${arc(71, a, b)}" class="s w12" opacity=".55"/>`).join('') +
    `<path d="${arc(71, 158, 200)}" class="s w12 hot"/>`);
  const accent = () => {
    let dots = '';
    for (let i = 0; i < 5; i++) { const [x, y] = pt(79, -14 + i * 7).split(','); dots += `<circle cx="${x}" cy="${y}" r="1.8" class="f a2"/>`; }
    return svg(`<path d="${arc(62, 232, 300)}" class="s w4 a2"/><path d="${arc(62, 304, 312)}" class="s w4 a2" opacity=".6"/>${dots}`);
  };
  const dashes = () => {
    let r = '';
    for (let i = 0; i < 44; i++) {
      if (i % 11 === 10) continue;
      const a = i * (360 / 44);
      r += `<rect x="97.6" y="40" width="4.8" height="7" rx="1.6" class="s thin" transform="rotate(${a.toFixed(2)} 100 100)"/>`;
    }
    return svg(r);
  };
  const inner = (mini) => svg(
    `<defs><radialGradient id="embGlow${mini ? 'm' : ''}"><stop offset="0" stop-color="currentColor" stop-opacity="${mini ? '.9' : '.32'}"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="100" cy="100" r="${mini ? 30 : 46}" fill="url(#embGlow${mini ? 'm' : ''})"/>` +
    `<circle cx="100" cy="100" r="44" class="s w3 hot"/>` +
    `<circle cx="100" cy="100" r="38" class="s thin" opacity=".55"/>` +
    (mini ? `<circle cx="100" cy="100" r="11" class="f hot"/>` : ''));

  const layer = (cls, html) => `<div class="L ${cls}"><div class="R">${html}</div></div>`;

  function build(el, opts = {}) {
    if (!el) return;
    const mini = !!opts.mini;
    let h = '';
    if (mini) {
      h = layer('l-ticks', ticks()) + layer('l-band', band()) + layer('l-inner', inner(true));
    } else {
      h = layer('l-outer', outer()) + layer('l-ticks', ticks()) + layer('l-band', band()) +
        layer('l-accent', accent()) + layer('l-dash', dashes()) +
        (opts.sweep ? `<div class="L l-sweep"><div class="R"></div></div>` : '') +
        layer('l-inner', inner(false)) +
        `<div class="emb-text"><span>J.A.R.V.I.S.</span></div>`;
    }
    el.innerHTML = h;
    el.classList.add('emb');
    if (mini) el.classList.add('emb-mini');
  }
  return { build };
})();
