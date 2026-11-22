// v23 JARVIS emblem: layered HUD rings (boot, ambient, header).
// Each ring is its own flat SVG inside its own div, and only the div is rotated/faded.
// That keeps every animation on the GPU (transform + opacity only), so it stays smooth on iPhone.
window.Emblem = (() => {
  const C = 100;
  const rad = (d) => (d - 90) * Math.PI / 180;
  const xy = (r, d) => [C + r * Math.cos(rad(d)), C + r * Math.sin(rad(d))];
  const pt = (r, d) => xy(r, d).map((v) => v.toFixed(2)).join(',');
  const arc = (r, a0, a1) => `M${pt(r, a0)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(r, a1)}`;
  const svg = (inner) => `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">${inner}</svg>`;
  const radial = (n, r0, r1, skip) => { let d = ''; for (let i = 0; i < n; i++) { if (skip && skip(i)) continue; const a = i * 360 / n; d += `M${pt(r0, a)}L${pt(r1, a)}`; } return d; };

  // outer frame: double hairline, bracket arcs, cardinal markers
  const outer = () => svg(
    `<circle cx="100" cy="100" r="98.5" class="s hair" opacity=".3"/>` +
    `<circle cx="100" cy="100" r="96" class="s hair" stroke-dasharray="1 2.2" opacity=".55"/>` +
    [[-10, 32], [58, 122], [148, 202], [238, 292]].map(([a, b]) => `<path d="${arc(92.5, a, b)}" class="s w3"/><path d="${radial(1, 89.5, 95.5)}" class="s thin" transform="rotate(${a} 100 100)"/><path d="${radial(1, 89.5, 95.5)}" class="s thin" transform="rotate(${b} 100 100)"/>`).join('') +
    `<path d="${arc(92.5, 300, 320)}" class="s w3 a2"/>` +
    [0, 90, 180, 270].map((a) => `<path d="M${pt(99.5, a - 2.2)}L${pt(95, a)}L${pt(99.5, a + 2.2)}Z" class="f hot"/>`).join(''));
  // fine scale: 120 hairline ticks, every 10th long, plus a dotted inner track
  const ticks = () => svg(
    `<path d="${radial(120, 84.5, 88, (i) => i % 10 === 0)}" class="s hair" opacity=".7"/>` +
    `<path d="${radial(12, 81, 88)}" class="s thin hot"/>` +
    `<circle cx="100" cy="100" r="80" class="s hair" stroke-dasharray=".6 2.9" opacity=".8"/>`);
  // a travelling light on the scale
  const scan = () => svg(`<path d="${arc(86.2, 0, 26)}" class="s w2 hot" opacity=".9"/><path d="${arc(86.2, -18, 0)}" class="s w2" opacity=".35"/>`);
  // main band: machined blocks with edge rails
  const band = () => svg(
    `<circle cx="100" cy="100" r="77.6" class="s hair" opacity=".6"/><circle cx="100" cy="100" r="64.4" class="s hair" opacity=".6"/>` +
    `<path d="${arc(71, 0, 360)}" class="s w12" opacity=".14"/>` +
    [[22, 98], [106, 150], [158, 252], [260, 338]].map(([a, b]) => `<path d="${arc(71, a, b)}" class="s w12" stroke-dasharray="7 1.4" opacity=".55"/>`).join('') +
    `<path d="${arc(71, 158, 202)}" class="s w12 hot" stroke-dasharray="7 1.4"/>` +
    `<path d="${radial(4, 63, 79)}" class="s thin hot" transform="rotate(20 100 100)"/>`);
  // secondary-color accents (warning arc + indicator dots)
  const accent = () => {
    let dots = '';
    for (let i = 0; i < 5; i++) { const [x, y] = xy(80.5, -14 + i * 7); dots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.7" class="f a2"/>`; }
    return svg(`<path d="${arc(61, 232, 298)}" class="s w4 a2"/><path d="${arc(61, 302, 310)}" class="s w4 a2" opacity=".55"/>${dots}`);
  };
  // capsule ring
  const dashes = () => {
    let r = '';
    for (let i = 0; i < 48; i++) {
      if (i % 12 === 11) continue;
      r += `<rect x="98.1" y="42.6" width="3.8" height="5" rx="1.3" class="s thin" transform="rotate(${(i * 7.5).toFixed(2)} 100 100)"/>`;
    }
    return svg(r);
  };
  // gear ring around the core
  const gear = () => {
    let d = '';
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = i * 360 / n, w = 360 / n;
      d += `${i ? 'L' : 'M'}${pt(46.5, a)}L${pt(46.5, a + w * 0.2)}L${pt(49.5, a + w * 0.3)}L${pt(49.5, a + w * 0.7)}L${pt(46.5, a + w * 0.8)}`;
    }
    return svg(`<path d="${d}Z" class="s thin" opacity=".75"/>`);
  };
  const inner = (mini) => svg(
    `<defs><radialGradient id="embGlow${mini ? 'm' : ''}"><stop offset="0" stop-color="currentColor" stop-opacity="${mini ? '.9' : '.3'}"/><stop offset=".7" stop-color="currentColor" stop-opacity="${mini ? '.2' : '.08'}"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="100" cy="100" r="${mini ? 30 : 44}" fill="url(#embGlow${mini ? 'm' : ''})"/>` +
    `<circle cx="100" cy="100" r="43" class="s w3 hot"/>` +
    `<circle cx="100" cy="100" r="39" class="s hair" opacity=".7"/>` +
    (mini ? `<circle cx="100" cy="100" r="11" class="f hot"/>`
      : `<circle cx="100" cy="100" r="36" class="s hair" stroke-dasharray="2 3" opacity=".5"/><path d="${radial(4, 33, 37.5)}" class="s thin hot" transform="rotate(45 100 100)"/>`));

  const layer = (cls, html) => `<div class="L ${cls}"><div class="R">${html}</div></div>`;

  function build(el, opts = {}) {
    if (!el) return;
    const mini = !!opts.mini;
    let h = '';
    if (mini) {
      h = layer('l-ticks', ticks()) + layer('l-band', band()) + layer('l-inner', inner(true));
    } else {
      h = layer('l-outer', outer()) + layer('l-ticks', ticks()) + layer('l-scan', scan()) + layer('l-band', band()) +
        layer('l-accent', accent()) + layer('l-dash', dashes()) + layer('l-gear', gear()) +
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
