// v22 "2070" look: a live 3D holographic globe + particle field behind the HUD, and panels that tilt in 3D.
// Plain canvas (no libraries), pauses when the app is hidden, calmer with "reduce motion" on.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // phones: no animated background at all (it fought with the glass blur and drained battery / crashed)
  const phone = innerWidth < 760 || /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (!phone) {
  const cv = document.createElement('canvas');
  cv.id = 'holo'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size(); addEventListener('resize', size);

  // points on a sphere (golden spiral) = the globe; a few orbit rings; loose dust further out
  const N = 480;
  const globe = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    globe.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  const rings = [{ r: 1.45, tilt: 1.15, n: 160, sp: 0.6 }, { r: 1.8, tilt: -0.5, n: 200, sp: -0.35 }];
  const dust = Array.from({ length: innerWidth < 700 ? 60 : 120 }, () => [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 6, Math.random()]);

  // follow the pointer / phone tilt a little (parallax)
  let tx = 0, ty = 0, px = 0, py = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / W - 0.5) * 2; ty = (e.clientY / H - 0.5) * 2; }, { passive: true });

  const accent = () => (document.body.classList.contains('v-listening') || document.body.classList.contains('v-awake') ? [47, 245, 166] : document.body.classList.contains('v-speaking') ? [139, 123, 255] : [62, 232, 255]);
  let col = [62, 232, 255];

  function project(x, y, z, cx, cy, R) {
    const f = 3.2 / (3.2 + z);
    return [cx + x * R * f, cy + y * R * f, f];
  }
  let t = 0, last = performance.now(), running = true;
  let skip = false;
  function frame(now) {
    if (!running) return;
    skip = !skip; if (skip) { requestAnimationFrame(frame); return; } // ~30 fps is plenty for a background
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt * (reduce ? 0.15 : 1);
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    const a = accent(); col = col.map((c, i) => c + (a[i] - c) * 0.06);
    const [r, g, b] = col.map(Math.round);
    ctx.clearRect(0, 0, W, H);

    const has3d = document.body.classList.contains('core3d');
    const R = Math.min(W, H) * (W < 700 ? 0.36 : 0.3);
    const cx = W * (W < 700 ? 0.5 : 0.72) + px * 18, cy = H * 0.42 + py * 12;
    const ay = t * 0.12 + px * 0.25, ax = 0.35 + py * 0.15;
    const cyA = Math.cos(ay), syA = Math.sin(ay), cxA = Math.cos(ax), sxA = Math.sin(ax);
    const rot = (x, y, z) => { const x1 = x * cyA + z * syA, z1 = -x * syA + z * cyA; return [x1, y * cxA - z1 * sxA, y * sxA + z1 * cxA]; };

    if (!has3d) {
    // soft core glow
    const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    gl.addColorStop(0, `rgba(${r},${g},${b},0.10)`); gl.addColorStop(0.5, `rgba(${r},${g},${b},0.03)`); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);

    // globe dots — front ones bigger/brighter (that's the 3D)
    for (const p of globe) {
      const [x, y, z] = rot(p[0], p[1], p[2]);
      const [sx, sy, f] = project(x, y, z, cx, cy, R);
      const front = (1 - z) / 2; // 0 back … 1 front
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + p[1] * 6);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + front * 0.55 * (0.7 + 0.3 * pulse)})`;
      const s = (0.6 + front * 1.3) * f;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
    }
    // orbit rings with a travelling light
    for (const ring of rings) {
      const ct = Math.cos(ring.tilt), st = Math.sin(ring.tilt);
      for (let i = 0; i < ring.n; i++) {
        const an = (i / ring.n) * Math.PI * 2;
        let x = Math.cos(an) * ring.r, y = 0, z = Math.sin(an) * ring.r;
        [y, z] = [y * ct - z * st, y * st + z * ct];
        const [X, Y, Z] = rot(x, y, z);
        const [sx, sy, f] = project(X, Y, Z, cx, cy, R);
        const head = (an - t * ring.sp + Math.PI * 20) % (Math.PI * 2);
        const glow = Math.max(0, 1 - head / 1.2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.05 + (1 - Z) * 0.08 + glow * 0.7})`;
        const s = (0.8 + glow * 1.8) * f;
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      }
    }
    }
    // drifting dust, deep parallax
    for (const d of dust) {
      d[1] -= dt * 0.04 * (0.5 + d[3]); if (d[1] < -2.5) d[1] = 2.5;
      const f = 3 / (3 + d[2] + 3);
      const sx = W / 2 + (d[0] + px * (0.3 + d[3])) * W * 0.18 * f, sy = H / 2 + (d[1] + py * 0.3) * H * 0.22 * f;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + d[3] * 0.25})`;
      ctx.fillRect(sx, sy, 1.2 * f + 0.4, 1.2 * f + 0.4);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });

  }
  // panels tilt toward the pointer in 3D (mouse / trackpad only — touch scrolling stays normal)
  if (matchMedia('(pointer: fine)').matches && !reduce) {
    let cur = null;
    document.addEventListener('pointermove', (e) => {
      const p = e.target.closest && e.target.closest('.panel');
      if (cur && cur !== p) { cur.style.removeProperty('--rx'); cur.style.removeProperty('--ry'); cur.style.removeProperty('--mx'); cur.style.removeProperty('--my'); }
      cur = p; if (!p || p.closest('dialog')) return;
      const b = p.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      p.style.setProperty('--ry', ((x - 0.5) * 4).toFixed(2) + 'deg');
      p.style.setProperty('--rx', ((0.5 - y) * 4).toFixed(2) + 'deg');
      p.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      p.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    }, { passive: true });
  }
})();
