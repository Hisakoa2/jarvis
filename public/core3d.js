// v22: the real 3D JARVIS core (WebGL / three.js with bloom).
// Plasma energy sphere (animated noise shader) inside a glass shell, a lattice cage, three gyroscope rings with
// light travelling round them, and a swirling particle halo. Colour follows JARVIS: cyan idle, green listening,
// violet speaking (and it pulses with the voice). Sits on the boot screen / ambient mode, and floats behind the HUD.
// If WebGL or the library can't load, the old flat core stays — nothing breaks.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = innerWidth < 760 || /iPhone|Android/i.test(navigator.userAgent);

// crash guard: if the app died while the 3D core was running last time, never run it on this device again
const LS = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
if (LS.get('jarvis.core3dBusy') === '1') LS.set('jarvis.core3dOff', '1');
const bootGone = () => { const b = document.getElementById('boot'); return !b || b.hidden || b.classList.contains('done'); };
if (LS.get('jarvis.core3dOff') === '1' || bootGone()) { LS.set('jarvis.core3dBusy', null); document.body.classList.remove('core-wait'); throw new Error('3D core skipped'); }
LS.set('jarvis.core3dBusy', '1');
// leaving the app normally (switching away / closing) isn't a crash: only an abrupt death leaves the mark
document.addEventListener('visibilitychange', () => { if (document.hidden) LS.set('jarvis.core3dBusy', null); else if (!dead) LS.set('jarvis.core3dBusy', '1'); });
addEventListener('pagehide', () => LS.set('jarvis.core3dBusy', null));
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: !phone, alpha: true, powerPreference: 'high-performance' }); }
catch { throw new Error('no webgl'); }
const cv = renderer.domElement;
cv.id = 'core3d'; cv.setAttribute('aria-hidden', 'true');
cv.style.opacity = '0'; // fades in after a few rendered frames, so a bright first frame never shows
document.body.appendChild(cv);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1 : 1.5));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 9);
const core = new THREE.Group();
scene.add(core);

const uni = { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x5cecff) }, uHot: { value: new THREE.Color(0xe8fdff) }, uPulse: { value: 0 } };

// ---- 1. plasma sphere ----
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
const plasma = new THREE.Mesh(
  new THREE.SphereGeometry(1, phone ? 40 : 96, phone ? 40 : 96),
  new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `uniform float uTime; uniform float uPulse; varying vec3 vN; varying vec3 vP; varying float vD; ${NOISE}
      void main(){ float d = snoise(normal*2.2 + uTime*0.35)*0.08 + snoise(normal*5.0 - uTime*0.6)*0.03;
        vD = d; vec3 p = position*(1.0 + d + uPulse*0.06); vN = normalize(normalMatrix*normal); vP = (modelViewMatrix*vec4(p,1.)).xyz;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform vec3 uHot; uniform float uPulse; varying vec3 vN; varying vec3 vP; varying float vD; ${NOISE}
      void main(){ vec3 V = normalize(-vP); float f = 1.0 - max(dot(vN, V), 0.0);
        float swirl = snoise(vN*3.0 + vec3(0., uTime*0.5, uTime*0.2));
        float veins = smoothstep(0.55, 0.95, abs(snoise(vN*6.0 + uTime*0.4)));
        float centre = pow(1.0 - f, 3.0);
        vec3 c = mix(uColor*0.45, uHot, centre*0.55 + veins*0.45) + uColor*pow(f, 2.2)*1.6;
        c += uColor*swirl*0.15 + uHot*vD*2.0;
        gl_FragColor = vec4(c*(0.8 + uPulse*0.6), 0.4*centre + 0.8*pow(f,1.5) + veins*0.35); }`,
  }));
core.add(plasma);

// ---- 2. glass shell (fresnel rim only) ----
const shell = new THREE.Mesh(new THREE.SphereGeometry(1.32, 64, 64), new THREE.ShaderMaterial({
  uniforms: uni, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
  vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = (modelViewMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*vec4(vP,1.); }`,
  fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec3 vN; varying vec3 vP;
    void main(){ float f = pow(1.0 - max(dot(vN, normalize(-vP)), 0.0), 3.5);
      float band = 0.5 + 0.5*sin(vN.y*40.0 + uTime*2.0);
      gl_FragColor = vec4(uColor*(f*1.4 + f*band*0.25), f*0.9); }`,
}));
core.add(shell);

// ---- 3. lattice cage ----
const lattice = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.55, 1)),
  new THREE.LineBasicMaterial({ color: 0x5cecff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
core.add(lattice);
// glowing nodes on the cage corners
const cageNodes = new THREE.Points(new THREE.IcosahedronGeometry(1.55, 1), new THREE.PointsMaterial({ color: 0xbff8ff, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
core.add(cageNodes);

// ---- 4. gyroscope rings (metal + travelling light) ----
const ringMat = (op) => new THREE.MeshBasicMaterial({ color: 0x5cecff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
const rings = [];
[[2.05, 0.012, [Math.PI / 2.2, 0, 0], 0.35], [2.35, 0.008, [0.4, Math.PI / 3, 0], -0.25], [2.7, 0.006, [-0.9, -0.5, 0.3], 0.18]].forEach(([r, w, rot, sp], i) => {
  const g = new THREE.Group(); g.rotation.set(...rot);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, w, 8, 220), ringMat(0.55 - i * 0.12)));
  // tick marks
  const ticks = new THREE.Group();
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2, m = new THREE.Mesh(new THREE.BoxGeometry(0.012, k % 4 ? 0.05 : 0.12, 0.012), ringMat(0.5));
    m.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); m.rotation.z = a + Math.PI / 2; ticks.add(m);
  }
  if (i === 0) g.add(ticks);
  // light comets
  const comet = new THREE.Mesh(new THREE.SphereGeometry(w * 4 + 0.025, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true }));
  const trail = new THREE.Mesh(new THREE.TorusGeometry(r, w * 2.5, 6, 64, 0.9), new THREE.MeshBasicMaterial({ color: 0x5cecff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(comet, trail);
  core.add(g);
  rings.push({ g, comet, trail, r, sp, mats: [g.children[0].material, trail.material] });
});

// ---- 5. particle halo ----
const PN = phone ? 700 : 2400;
const pg = new THREE.BufferGeometry(), pos = new Float32Array(PN * 3), seed = new Float32Array(PN);
for (let i = 0; i < PN; i++) {
  const r = 1.7 + Math.pow(Math.random(), 2) * 2.6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
  const flat = Math.random() < 0.55 ? 0.18 : 1; // most particles in a disc, some in a sphere
  pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * flat, r * Math.sin(ph) * Math.sin(th)], i * 3); seed[i] = Math.random();
}
pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
const halo = new THREE.Points(pg, new THREE.ShaderMaterial({
  uniforms: { ...uni, uSize: { value: (phone ? 22 : 30) * renderer.getPixelRatio() } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: `uniform float uTime; uniform float uSize; attribute float seed; varying float vA;
    void main(){ vec3 p = position; float a = uTime*(0.05 + seed*0.12)/(length(p.xz)*0.5); float c = cos(a), s = sin(a);
      p.xz = mat2(c,-s,s,c)*p.xz; p.y += sin(uTime*0.6 + seed*20.0)*0.05;
      vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
      vA = 0.25 + 0.75*fract(seed*7.3 + uTime*0.15*seed); gl_PointSize = uSize*(0.3 + seed*0.7)/-mv.z; }`,
  fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
    gl_FragColor = vec4(uColor*1.4, (1.0 - d*2.0)*vA*0.7); }`,
}));
core.add(halo);
core.rotation.x = 0.25;

// ---- bloom ----
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.25, 0.6, 0.1);
composer.addPass(bloom);

// ---- layout: where the core sits ----
let W = 0, H = 0;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false); composer.setSize(W, H);
  bloom.resolution.set(W / (phone ? 4 : 2), H / (phone ? 4 : 2));
  camera.aspect = W / H; camera.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);
const visible = (id) => { const e = document.getElementById(id); if (!e) return null; const box = e.closest('.boot, .ambient'); if (box && (box.hidden || getComputedStyle(box).display === 'none' || box.classList.contains('done'))) return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
// screen point + pixel size → world position / scale at z=0
function place(cx, cy, px) {
  const hView = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
  const unit = H / hView; // pixels per world unit
  return { x: (cx - W / 2) / unit, y: -(cy - H / 2) / unit, s: px / unit / 5.6 };
}
const target = { x: 0, y: 0, s: 1, front: false };
function layout() {
  const r = visible('bootCore') || visible('ambCore');
  if (r) { Object.assign(target, place(r.left + r.width / 2, r.top + r.height / 2, Math.max(r.width, r.height) * 0.8), { front: true }); return; }
  // boot is over: shut the 3D core down completely so it costs nothing (phones were crashing with it running)
  shutdown();
}
var dead = false;
function shutdown() {
  if (dead) return; dead = true; running = false;
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
  composer.passes.forEach((p) => p.dispose && p.dispose());
  renderer.dispose(); try { renderer.forceContextLoss(); } catch {}
  cv.remove();
  LS.set('jarvis.core3dBusy', null);
  document.body.classList.remove('core3d'); // ambient mode falls back to the light flat core
}

// ---- colour by voice state ----
const COL = { idle: new THREE.Color(0x5cecff), listen: new THREE.Color(0x2ff5a6), speak: new THREE.Color(0xa58cff) };
const state = () => { const c = document.body.classList; return c.contains('v-listening') || c.contains('v-awake') ? 'listen' : c.contains('v-speaking') ? 'speak' : 'idle'; };

let px = 0, py = 0, tx = 0, ty = 0;
addEventListener('pointermove', (e) => { tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5; }, { passive: true });

const clock = new THREE.Clock();
let running = true, t = 0, drawn = 0;
function frame() {
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 0.05) * (reduce ? 0.25 : 1);
  t += dt; uni.uTime.value = t;
  layout();
  if (dead) return;
  const k = 1 - Math.pow(0.002, dt);
  core.position.x += (target.x - core.position.x) * k; core.position.y += (target.y - core.position.y) * k;
  const sc = core.scale.x + (target.s - core.scale.x) * k; core.scale.setScalar(sc);
  cv.classList.toggle('front', target.front);
  

  const s = state();
  uni.uColor.value.lerp(COL[s], 1 - Math.pow(0.02, dt));
  const pulseTarget = s === 'speak' ? 0.5 + 0.5 * Math.abs(Math.sin(t * 9) * Math.sin(t * 3.3)) : s === 'listen' ? 0.3 + 0.2 * Math.sin(t * 4) : 0.08 + 0.06 * Math.sin(t * 1.5);
  uni.uPulse.value += (pulseTarget - uni.uPulse.value) * 0.2;
  lattice.material.color.copy(uni.uColor.value); cageNodes.material.color.copy(uni.uColor.value).lerp(new THREE.Color(1, 1, 1), 0.6);
  rings.forEach((R, i) => {
    R.mats.forEach((m) => m.color.copy(uni.uColor.value));
    const a = t * R.sp * (s === 'speak' ? 2.2 : s === 'listen' ? 1.6 : 1) * 2.5;
    R.comet.position.set(Math.cos(a) * R.r, Math.sin(a) * R.r, 0); R.trail.rotation.z = a - 0.9;
    R.g.rotation.z += dt * R.sp * 0.4; R.g.rotation.y += dt * 0.05 * (i - 1);
  });
  lattice.rotation.y += dt * 0.12; lattice.rotation.x += dt * 0.05; cageNodes.rotation.copy(lattice.rotation);
  plasma.rotation.y += dt * 0.2; halo.rotation.y += dt * 0.03;
  px += (tx - px) * 0.05; py += (ty - py) * 0.05;
  core.rotation.y = px * 0.6; core.rotation.x = 0.25 + py * 0.4;
  bloom.strength = 0.85 + uni.uPulse.value * 0.8;
  composer.render();
  if (++drawn === 4) cv.style.opacity = '1';
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });
document.body.classList.add('core3d');
document.body.classList.remove('core-wait');
layout(); core.position.set(target.x, target.y, 0); core.scale.setScalar(target.s); // start at the right size, no zoom-in jump
requestAnimationFrame(frame);
