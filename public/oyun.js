// Kıssahanem Zikir Halkası — 3D sürüm (three.js)
import * as THREE from 'three';

// ======================= AYARLAR =======================
const W = 720, H = 1280;
const PARAMS = new URLSearchParams(location.search);
const LIVE = PARAMS.has('canli');

// Jeton seviyeleri — sure: halkada kalma (sn), Infinity = yayın sonuna kadar
const TIERS = [
  { min: 5000, lvl: 6, zikir: 3333, dur: 13, sure: Infinity, etiket: 'yayın sonuna kadar' },
  { min: 1000, lvl: 5, zikir: 1000, dur: 11, sure: 3 * 3600, etiket: '+3 saat' },
  { min: 500, lvl: 4, zikir: 333, dur: 9, sure: 3600, etiket: '+1 saat' },
  { min: 100, lvl: 3, zikir: 99, dur: 8, sure: 1800, etiket: '+30 dk' },
  { min: 10, lvl: 2, zikir: 33, dur: 6.5, sure: 600, etiket: '+10 dk' },
  { min: 1, lvl: 1, zikir: 10, dur: 4, sure: 180, etiket: '+3 dk' },
];
const BEGENI_GIRIS = 100;     // halkaya girmek için beğeni
const SURE_GIRIS = 120;       // beğeniyle giriş: 2 dk
const SURE_BEGENI = 60;       // halkadayken her 100 beğeni: +1 dk
const SURE_ZIKIR_GIRIS = 60;  // zikir yazarak giriş: 1 dk
const SURE_ZIKIR = 20;        // halkadayken zikir yorumu: +20 sn
const UYARI_SN = 15;

const DUA_SMALL = ['Allah razı olsun', 'Rabbim kabul etsin', 'Hayırlara vesile olsun', 'Allah bereket versin'];
const DUA_BIG = [
  'Rabbim gönlüne huzur, evine bereket versin.',
  'Allah seni ve aileni her türlü kötülükten korusun.',
  'Rabbim dualarını kabul etsin, hayırlı muradına erdirsin.',
  'Allah sağlık, sıhhat ve helal rızık versin.',
  'Rabbim kalbini imanla, yüzünü nurla doldursun.',
  'Allah sevdiklerinle birlikte cennetinde buluştursun.',
  'Rabbim yolunu açık, işlerini kolay eylesin.',
];
const DUA_HUGE = [
  'Rabbim bu güzelliğini kat kat mükâfatlandırsın; seni, aileni ve sevdiklerini dünyada ve ahirette mutlu etsin.',
  'Allah ömrünü hayırlı, rızkını bol, kalbini huzurlu eylesin; duanı arşa ulaştırsın.',
];
const AYETLER = [
  ['Bilesiniz ki kalpler ancak Allah\'ı anmakla huzur bulur.', 'Ra\'d Suresi, 28'],
  ['Siz beni anın ki ben de sizi anayım.', 'Bakara Suresi, 152'],
  ['Bana dua edin, size icabet edeyim.', 'Mü\'min Suresi, 60'],
  ['Allah\'ı çokça anın ki kurtuluşa eresiniz.', 'Cuma Suresi, 10'],
  ['Kullarım beni sana sorarsa, ben çok yakınım.', 'Bakara Suresi, 186'],
];
const ZIKIRLER = [
  [/S[UÜ]BHANALLAH|S[UÜ]PHANALLAH/, 'Subhanallah'],
  [/ELHAMD[UÜ]L[İI]LLAH/, 'Elhamdülillah'],
  [/ALLAH[UÜ]?EKBER/, 'Allahu Ekber'],
  [/LA[İI]LAHE[İI]LLALLAH/, 'Lâ ilâhe illallah'],
  [/ESTA[ĞG]F[İI]RULLAH/, 'Estağfirullah'],
  [/MA[ŞS]ALLAH/, 'Maşallah'],
  [/ALLAH[UÜ]MMESALL|SALAVAT/, 'Salavat'],
  [/AM[İI]N/, 'Âmin'],
];
const GOALS = [33, 99, 333, 1000, 3333, 10000, 33333, 100000];
const HOST_LINES = [
  'Halkamıza hoş geldiniz. Ekrana dokunarak beğeni gönderin, yüz beğenide halkaya oturun.',
  'Sübhanallah yazarak zikrimize katılabilirsiniz.',
  'Hediye gönderen kardeşlerimizin adını anarak dua ediyoruz.',
  'Bu yayını paylaşın, zikrin sevabına ortak olun.',
  'Halkadaki süreniz azalınca, beğeni ya da hediye ile sürenizi uzatabilirsiniz.',
  'Takip edin, her gece bu zikir halkasında buluşalım inşallah.',
  'Bir gül gönderen üç dakika, on jeton gönderen on dakika halkada kalır.',
];

// ======================= YARDIMCILAR =======================
const rnd = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const nowMs = () => performance.now();
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const initial = n => String(n || '?').trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
const avHTML = (url, name) => url ? `<div class="av"><img src="${esc(url)}" referrerpolicy="no-referrer" onerror="this.remove()"></div>` : `<div class="av">${esc(initial(name))}</div>`;
// konuşma için isim temizliği
const spokenName = n => {
  let s = String(n || '').replace(/[_.\-]+/g, ' ').replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
  return s.length > 22 ? s.split(' ').slice(0, 2).join(' ') : s;
};
function fmtSure(r) {
  if (r === Infinity) return '∞';
  r = Math.max(0, Math.ceil(r));
  if (r >= 3600) return Math.floor(r / 3600) + 'sa ' + Math.floor(r % 3600 / 60) + 'dk';
  return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0');
}

// ======================= SAHNE =======================
const stage = $('stage'), canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  renderer.setPixelRatio(clamp((devicePixelRatio || 1) * s, 1, 1.75));
  renderer.setSize(W, H, false);
}
addEventListener('resize', fit); fit();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0f2a, 0.022);
const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);

// --- doku yardımcıları
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const glowTex = canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,240,200,.7)'); r.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
const dotTex = canvasTex(32, 32, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
function glowSprite(color, size, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}

// --- gökyüzü
const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#02041a') }, mid: { value: new THREE.Color('#14205a') }, bot: { value: new THREE.Color('#2a1640') }, glow: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform vec3 top, mid, bot; uniform float glow; varying vec3 vP;
    void main(){ float h = vP.y; vec3 c = h > 0. ? mix(mid, top, smoothstep(0., .55, h)) : mix(mid, bot, smoothstep(0., -.15, h));
      c += vec3(1.,.8,.45) * glow * .35 * (1. - smoothstep(0., .6, abs(h - .15)));
      gl_FragColor = vec4(c, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
scene.add(sky);

function starLayer(n, size, op) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(1 - Math.random() * .9), r = 80;
    p[i * 3] = r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = r * Math.cos(ph) + 2; p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ map: dotTex, size, sizeAttenuation: false, transparent: true, opacity: op, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xfff6e0 });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
}
const stars1 = starLayer(700, 2.2, .8), stars2 = starLayer(300, 3.6, .9);

// hilal
const moonTex = canvasTex(256, 256, (g, w) => {
  g.fillStyle = '#fbe3a3'; g.beginPath(); g.arc(128, 128, 90, 0, 7); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(165, 108, 82, 0, 7); g.fill();
});
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
moon.position.set(11, 24, -55); moon.scale.set(9, 9, 1); scene.add(moon);
const moonGlow = glowSprite(0xffd890, 30, .55); moonGlow.position.copy(moon.position); moonGlow.material.fog = false; scene.add(moonGlow);

// cami silueti
const silMat = new THREE.MeshBasicMaterial({ color: 0x060918, fog: false });
const winMat = new THREE.MeshBasicMaterial({ color: 0xffc570, fog: false });
const mosque = new THREE.Group(); mosque.position.set(0, -1, -48); scene.add(mosque);
(function buildMosque() {
  const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), silMat); m.position.set(x, y + h / 2, z); mosque.add(m); };
  const dome = (r, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), silMat); m.position.set(x, y, z); mosque.add(m);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(r * .08, r * .5, 8), silMat); sp.position.set(x, y + r + r * .2, z); mosque.add(sp); };
  box(34, 6, 6, 0, 0, 0); box(16, 4, 6, 0, 6, 0);
  dome(7.5, 0, 10, 0); dome(4, -10, 6, 0); dome(4, 10, 6, 0); dome(2.5, -15, 6, 1); dome(2.5, 15, 6, 1);
  [-22, 22].forEach(x => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, 28, 12), silMat); c.position.set(x, 14, 0); mosque.add(c);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .6, 12), silMat); b.position.set(x, 20, 0); mosque.add(b);
    const k = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5, 12), silMat); k.position.set(x, 30.5, 0); mosque.add(k);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(.5, 1.2), winMat); w.position.set(x, 23, 1.15); mosque.add(w);
  });
  for (let i = -6; i <= 6; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.9, 2.2), winMat); w.position.set(i * 2.3, 2.4, 3.05); mosque.add(w); }
  for (let i = -3; i <= 3; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.6), winMat); w.position.set(i * 2, 7.5, 3.05); mosque.add(w); }
})();
const horizonGlow = glowSprite(0xffb060, 70, .35); horizonGlow.position.set(0, 4, -50); horizonGlow.material.fog = false; scene.add(horizonGlow);

// zemin
const floorTex = canvasTex(512, 512, (g, w) => {
  g.fillStyle = '#231a2c'; g.fillRect(0, 0, w, w);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, w); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  g.fillStyle = 'rgba(201,165,74,.12)';
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if ((x + y) % 2 === 0) { g.save(); g.translate(x * 64 + 32, y * 64 + 32); g.rotate(Math.PI / 4); g.fillRect(-10, -10, 20, 20); g.restore(); }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(14, 14);
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .95, metalness: 0 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);

// halı
const carpetTex = canvasTex(1024, 1024, (g, w) => {
  const c = w / 2; g.translate(c, c);
  const ring = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); };
  ring(510, '#d4a94a'); ring(495, '#6a1622'); ring(470, '#d4a94a'); ring(462, '#8c1f2e');
  for (let i = 0; i < 48; i++) { g.save(); g.rotate(i / 48 * Math.PI * 2); g.fillStyle = i % 2 ? '#d4a94a' : '#1f2a5a'; g.beginPath(); g.moveTo(0, -455); g.lineTo(14, -420); g.lineTo(0, -385); g.lineTo(-14, -420); g.fill(); g.restore(); }
  ring(375, '#d4a94a'); ring(368, '#5a1420');
  for (let i = 0; i < 16; i++) { g.save(); g.rotate(i / 16 * Math.PI * 2); g.fillStyle = '#7a2232'; g.beginPath(); g.ellipse(0, -290, 34, 70, 0, 0, 7); g.fill(); g.strokeStyle = '#d4a94a'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#1f2a5a'; g.beginPath(); g.ellipse(0, -290, 14, 34, 0, 0, 7); g.fill(); g.restore(); }
  ring(200, '#d4a94a'); ring(192, '#1f2a5a');
  g.save(); for (let k = 0; k < 2; k++) { g.rotate(Math.PI / 8); g.fillStyle = k ? '#7a2232' : '#8c1f2e'; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 90 : 175; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = '#d4a94a'; g.lineWidth = 5; g.stroke(); } g.restore();
  ring(60, '#d4a94a'); ring(48, '#5a1420');
  // doku
  const id = g.getImageData(0, 0, w, w); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - .5) * 18; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0);
});
const carpet = new THREE.Mesh(new THREE.CircleGeometry(4.6, 72), new THREE.MeshStandardMaterial({ map: carpetTex, roughness: .9 }));
carpet.rotation.x = -Math.PI / 2; carpet.position.y = .015; scene.add(carpet);

// ışıklar
const hemi = new THREE.HemisphereLight(0x5a6ab8, 0x3a2028, 1.1); scene.add(hemi);
const moonLight = new THREE.DirectionalLight(0x9fb4ff, .9); moonLight.position.set(8, 14, -6); scene.add(moonLight);
const fillLight = new THREE.DirectionalLight(0xffd9a8, .55); fillLight.position.set(0, 6, 12); scene.add(fillLight);
const centerLight = new THREE.PointLight(0xffa850, 38, 0, 1.7); centerLight.position.set(0, 1.3, 0); scene.add(centerLight);

// orta kandil (yerde büyük fener)
const brass = new THREE.MeshStandardMaterial({ color: 0xc9953a, metalness: .85, roughness: .35 });
const lampGlass = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffa040, emissiveIntensity: 2.2, transparent: true, opacity: .9 });
const centerLamp = new THREE.Group(); scene.add(centerLamp);
(() => {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .12, 16), brass); base.position.y = .06; centerLamp.add(base);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.18, .2, .42, 8, 1, true), lampGlass); glass.position.y = .33; centerLamp.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.26, .3, 8), brass); cap.position.y = .69; centerLamp.add(cap);
  const top = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), brass); top.position.y = .86; centerLamp.add(top);
  const g = glowSprite(0xffb050, 2.6, .9); g.position.y = .4; centerLamp.add(g); centerLamp.userData.glow = g;
})();

// tesbih (yerde, kandilin etrafında)
const beadMat = new THREE.MeshStandardMaterial({ color: 0x7a3a18, roughness: .35, metalness: .1 });
const beadGold = new THREE.MeshStandardMaterial({ color: 0xe9c46a, roughness: .3, metalness: .8, emissive: 0x3a2a00 });
const tesbih = new THREE.Group(); scene.add(tesbih);
const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 12, 10), beadMat, 33);
const bm = new THREE.Matrix4();
for (let i = 0; i < 33; i++) { const a = i / 33 * Math.PI * 2; bm.makeTranslation(Math.cos(a) * 1.0, .08, Math.sin(a) * 1.0); beads.setMatrixAt(i, bm); }
tesbih.add(beads);
const imame = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 12), beadGold); imame.position.set(1.0, .1, 0); tesbih.add(imame);
const tesbihGlow = glowSprite(0xffd27a, 3.4, 0); tesbihGlow.position.y = .2; tesbih.add(tesbihGlow);

// mumlar (halının kenarında)
const candleMat = new THREE.MeshStandardMaterial({ color: 0xf4ead0, roughness: .6 });
const candles = [];
for (let i = 0; i < 14; i++) {
  const a = i / 14 * Math.PI * 2 + .11, r = 4.35;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .22, 8), candleMat); c.position.set(Math.cos(a) * r, .11, Math.sin(a) * r); scene.add(c);
  const f = glowSprite(0xffb048, .55, .95); f.position.set(c.position.x, .3, c.position.z); scene.add(f);
  candles.push(f);
}

// asılı kandiller (isim yazan)
const kandils = [];
const kandilGlassOff = new THREE.MeshStandardMaterial({ color: 0x4a5a7a, emissive: 0x000000, transparent: true, opacity: .55, roughness: .2 });
const chainMat = new THREE.LineBasicMaterial({ color: 0x8a6a30 });
[[-4.2, 3.7, -2.6], [-2.1, 4.2, -4.1], [0, 4.5, -4.7], [2.1, 4.2, -4.1], [4.2, 3.7, -2.6]].forEach((p, i) => {
  const g = new THREE.Group(); g.position.set(...p); scene.add(g);
  const chain = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 9, 0)]), chainMat); g.add(chain);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.2, .18, 8), brass); cap.position.y = .02; cap.rotation.x = Math.PI; g.add(cap);
  const glassM = kandilGlassOff.clone();
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), glassM); glass.scale.y = 1.3; glass.position.y = -.25; g.add(glass);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(.1, .2, 8), brass); bot.position.y = -.6; bot.rotation.x = Math.PI; g.add(bot);
  const glow = glowSprite(0xffb050, 3, 0); glow.position.y = -.25; g.add(glow);
  kandils.push({ g, glassM, glow, name: null, avatar: '', lit: 0, flare: 0, ph: i * 1.3, label: null });
});

// ateş böcekleri / nur zerreleri (sürekli canlılık)
const FF = 160;
const ffPos = new Float32Array(FF * 3), ffSeed = [];
for (let i = 0; i < FF; i++) { ffSeed.push({ r: 1.5 + Math.random() * 7, a: Math.random() * 7, h: .3 + Math.random() * 4, s: .05 + Math.random() * .15, p: Math.random() * 7 }); }
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ map: dotTex, size: .11, color: 0xffd68a, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(fireflies);

// gölge diskleri (tek çizim)
const shadowTex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.6)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }, false);
const SHMAX = 64;
const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }), SHMAX);
shadows.position.y = .03; shadows.count = 0; scene.add(shadows);

// ======================= PARÇACIKLAR =======================
const PMAX = 900;
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pVel = [], pLife = new Float32Array(PMAX);
for (let i = 0; i < PMAX; i++) { pVel.push(new THREE.Vector3()); pPos[i * 3 + 1] = -99; }
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: dotTex, size: .16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(sparks);
let pIdx = 0;
function burst(x, y, z, n, color = 0xffd27a, speed = 2, up = 1.5, life = 1.6) {
  const col = new THREE.Color(color);
  for (let k = 0; k < n; k++) {
    const i = pIdx = (pIdx + 1) % PMAX;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
    pVel[i].set(Math.cos(a) * s, Math.random() * up + .3, Math.sin(a) * s);
    pCol[i * 3] = col.r; pCol[i * 3 + 1] = col.g; pCol[i * 3 + 2] = col.b; pLife[i] = life * (.6 + Math.random() * .6);
  }
}
function rainNur(n) { for (let k = 0; k < n; k++) { const i = pIdx = (pIdx + 1) % PMAX; pPos[i * 3] = (Math.random() - .5) * 14; pPos[i * 3 + 1] = 6 + Math.random() * 6; pPos[i * 3 + 2] = (Math.random() - .5) * 10;
  pVel[i].set((Math.random() - .5) * .2, -1.2 - Math.random(), 0); pCol[i * 3] = 1; pCol[i * 3 + 1] = .9; pCol[i * 3 + 2] = .6; pLife[i] = 7; } }
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    const v = pVel[i];
    if (v.y > -1) v.y -= dt * .8;
    pPos[i * 3] += v.x * dt; pPos[i * 3 + 1] += v.y * dt; pPos[i * 3 + 2] += v.z * dt;
    v.x *= .985; v.z *= .985;
    const f = clamp(pLife[i], 0, 1); pCol[i * 3] *= .995; pCol[i * 3 + 1] *= .995; pCol[i * 3 + 2] *= .995;
    if (pLife[i] <= 0 || pPos[i * 3 + 1] < 0) { pPos[i * 3 + 1] = -99; pLife[i] = 0; }
    if (f < .3) { pCol[i * 3] *= .9; pCol[i * 3 + 1] *= .9; pCol[i * 3 + 2] *= .9; }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
}

// gül yaprakları
const PETALS = 260;
const petalMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(.07, 6).scale(1, .6, 1), new THREE.MeshStandardMaterial({ color: 0xe0506e, side: THREE.DoubleSide, roughness: .6, emissive: 0x3a0010 }), PETALS);
petalMesh.count = 0; scene.add(petalMesh);
const petals = [];
function dropPetals(n) { for (let i = 0; i < n; i++) petals.push({ x: (Math.random() - .5) * 11, y: 6 + Math.random() * 5, z: (Math.random() - .5) * 9, r: Math.random() * 7, v: .7 + Math.random() * .8, w: Math.random() * 3 }); if (petals.length > PETALS) petals.splice(0, petals.length - PETALS); }
const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pe = new THREE.Euler(), ps = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
const shQ = new THREE.Quaternion(), shS = new THREE.Vector3();
function updatePetals(dt, t) {
  for (let i = petals.length - 1; i >= 0; i--) { const p = petals[i]; p.y -= p.v * dt; p.r += dt * p.w; if (p.y < .05) { p.y = .05; p.v = 0; p.life = (p.life ?? 6) - dt; if (p.life < 0) petals.splice(i, 1); } }
  petals.forEach((p, i) => { pe.set(p.r, p.r * .7, p.r * .3); pq.setFromEuler(pe); pv.set(p.x + Math.sin(t + p.r) * .3 * (p.v ? 1 : 0), p.y, p.z); pm.compose(pv, pq, ps); petalMesh.setMatrixAt(i, pm); });
  petalMesh.count = petals.length; petalMesh.instanceMatrix.needsUpdate = true;
}

// ışık sütunu (halkaya inen kişi / büyük hediye)
const beamTex = canvasTex(64, 256, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, 'rgba(255,230,160,0)'); l.addColorStop(.6, 'rgba(255,230,160,.5)'); l.addColorStop(1, 'rgba(255,240,200,.9)'); g.fillStyle = l; g.fillRect(0, 0, w, h);
  const s = g.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = s; g.fillRect(0, 0, w, h); });
const beams = [];
function beam(x, z, life = 2.2, width = .7, color = 0xffe2a0) {
  if (beams.length >= 3) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(width, width * 1.1, 9, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0 }));
  m.position.set(x, 4.5, z); scene.add(m); beams.push({ m, t: 0, life });
}
function updateBeams(dt) {
  for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; const k = b.t / b.life; b.m.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * .5; b.m.rotation.y += dt;
    if (k >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); beams.splice(i, 1); } }
}
// yerde genişleyen nur halkası
const rings = [];
function shockRing(color = 0xffd27a) {
  const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1.05, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.y = .06; scene.add(m); rings.push({ m, t: 0 });
}
function updateRings(dt) { for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = 1 + r.t * 4; r.m.scale.set(s, 1, s); r.m.material.opacity = Math.max(0, .32 - r.t / 5); if (r.t > 1.6) { scene.remove(r.m); rings.splice(i, 1); } } }
// kayan yıldız
const shooters = [];
function shootingStar() { const s = glowSprite(0xfff3d0, 1.6, 1); s.material.fog = false; s.scale.set(4, .25, 1); const x = (Math.random() - .3) * 50, y = 22 + Math.random() * 14;
  s.position.set(x, y, -50); scene.add(s); shooters.push({ s, t: 0 }); }
function updateShooters(dt) { for (let i = shooters.length - 1; i >= 0; i--) { const o = shooters[i]; o.t += dt; o.s.position.x -= dt * 40; o.s.position.y -= dt * 18; o.s.material.rotation = .42; o.s.material.opacity = 1 - o.t; if (o.t > 1) { scene.remove(o.s); shooters.splice(i, 1); } } }

// ======================= KARAKTERLER =======================
const ROBES = ['#2a2f6a', '#3d2a5a', '#1f4a46', '#5a3a22', '#e8e0c8', '#2a4a7a', '#6a2430', '#2f5a34', '#6a5a9a', '#f2ecdc', '#7a5a2a'];
const HIJABS = ['#ece6f4', '#3a3f7a', '#7a2a44', '#2a6a6a', '#c9b48a', '#f6f0e6', '#5a2a6a', '#1f2a4a'];
const SKINS = ['#efc09a', '#dba57a', '#b67d55', '#f4cfae', '#9a6a48'];
const BEARDS = ['#2a1a10', '#3a2618', '#5a4030', '#cfc8c0'];
const matCache = {};
const mat = (col, opt = {}) => { const k = col + JSON.stringify(opt); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: col, roughness: .78, metalness: 0, ...opt })); };
const faceCache = {};
function faceMat(skin, kind, beard) {
  const k = skin + kind + beard; if (faceCache[k]) return faceCache[k];
  const tex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    const cx = w * .25, cy = h * .5; // yüzün ön tarafı (u=.25)
    // yanaklar
    g.fillStyle = 'rgba(230,110,100,.28)'; g.beginPath(); g.ellipse(cx - 30, cy + 14, 13, 8, 0, 0, 7); g.ellipse(cx + 30, cy + 14, 13, 8, 0, 0, 7); g.fill();
    // kaşlar
    g.strokeStyle = kind === 'f' ? '#3a2416' : beard; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 34, cy - 18); g.quadraticCurveTo(cx - 22, cy - 25, cx - 10, cy - 19); g.stroke();
    g.beginPath(); g.moveTo(cx + 34, cy - 18); g.quadraticCurveTo(cx + 22, cy - 25, cx + 10, cy - 19); g.stroke();
    // kapalı gözler (huşu)
    g.strokeStyle = '#1a0e08'; g.lineWidth = 4;
    g.beginPath(); g.arc(cx - 21, cy - 6, 9, .25, Math.PI - .25); g.stroke();
    g.beginPath(); g.arc(cx + 21, cy - 6, 9, .25, Math.PI - .25); g.stroke();
    // kirpik
    g.lineWidth = 2; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(cx + s * 21 + s * 8, cy - 2); g.lineTo(cx + s * 21 + s * 12, cy + 1); g.stroke(); });
    // burun
    g.strokeStyle = 'rgba(90,40,20,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 2, cy - 2); g.quadraticCurveTo(cx - 7, cy + 12, cx + 3, cy + 13); g.stroke();
    if (kind === 'b') { // sakal
      g.fillStyle = beard; g.beginPath(); g.moveTo(cx - 52, cy - 4); g.quadraticCurveTo(cx - 50, cy + 62, cx, cy + 70); g.quadraticCurveTo(cx + 50, cy + 62, cx + 52, cy - 4);
      g.quadraticCurveTo(cx + 40, cy + 24, cx + 14, cy + 22); g.quadraticCurveTo(cx, cy + 18, cx - 14, cy + 22); g.quadraticCurveTo(cx - 40, cy + 24, cx - 52, cy - 4); g.fill();
      g.fillRect(cx - 18, cy + 17, 36, 6); // bıyık
    }
  });
  return (faceCache[k] = new THREE.MeshStandardMaterial({ map: tex, roughness: .7 }));
}
const G = {
  base: new THREE.CylinderGeometry(.44, .5, .2, 22),
  knee: new THREE.SphereGeometry(.17, 14, 10),
  robe: new THREE.LatheGeometry([[0, 0], [.4, 0], [.39, .1], [.33, .32], [.25, .5], [.19, .6], [.1, .66], [0, .67]].map(([x, y]) => new THREE.Vector2(x, y)), 26),
  head: new THREE.SphereGeometry(.17, 28, 20),
  mouth: new THREE.SphereGeometry(.026, 10, 8),
  upper: new THREE.CapsuleGeometry(.058, .17, 4, 10).translate(0, -.12, 0),
  fore: new THREE.CapsuleGeometry(.052, .15, 4, 10).translate(0, -.1, 0),
  hand: new THREE.SphereGeometry(.055, 12, 10),
  turban: new THREE.TorusGeometry(.14, .065, 12, 28),
  turbanTop: new THREE.SphereGeometry(.13, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  takke: new THREE.SphereGeometry(.176, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2.7),
  hijabTop: new THREE.SphereGeometry(.205, 26, 14, 0, Math.PI * 2, 0, .95),
  hijabSide: new THREE.SphereGeometry(.205, 26, 14, Math.PI / 2 + .95, Math.PI * 2 - 1.9, .95, Math.PI - .95),
  drape: new THREE.CylinderGeometry(.16, .4, .42, 26, 1, true),
  tesbihHand: new THREE.TorusGeometry(.07, .014, 6, 16),
};
const mouthMat = mat('#5a1c14');
const whiteMat = mat('#f6f2e8');
const sashMat = mat('#c9953a', { metalness: .4, roughness: .5 });
const handTesbihMat = mat('#7a3a18');

function buildPerson(p) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const robeM = mat(p.robe), robeD = mat(new THREE.Color(p.robe).multiplyScalar(.75).getStyle());
  const skinM = mat(p.skin);
  const base = new THREE.Mesh(G.base, robeD); base.position.y = .1; root.add(base);
  [-1, 1].forEach(s => { const k = new THREE.Mesh(G.knee, robeD); k.scale.set(1, .55, 1.25); k.position.set(s * .2, .15, .16); root.add(k); });
  const robe = new THREE.Mesh(G.robe, robeM); robe.position.y = .14; body.add(robe);
  if (!p.female) { const sash = new THREE.Mesh(new THREE.TorusGeometry(.31, .025, 6, 24), sashMat); sash.rotation.x = Math.PI / 2; sash.position.y = .38; body.add(sash); }
  // kollar
  const arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(s * .21, .72, 0); body.add(sh);
    const up = new THREE.Mesh(G.upper, robeM); sh.add(up);
    const el = new THREE.Group(); el.position.y = -.25; sh.add(el);
    const fo = new THREE.Mesh(G.fore, robeM); el.add(fo);
    const hd = new THREE.Mesh(G.hand, skinM); hd.position.y = -.22; el.add(hd);
    return { sh, el, s };
  });
  const tes = new THREE.Mesh(G.tesbihHand, handTesbihMat); tes.position.set(0, .3, .27); tes.rotation.x = -1.2; body.add(tes);
  // baş
  const head = new THREE.Group(); head.position.y = .82; body.add(head);
  const kind = p.female ? 'f' : (p.beard ? 'b' : 'n');
  const hm = new THREE.Mesh(G.head, faceMat(p.skin, kind, p.beardCol)); hm.scale.set(1, 1.08, 1); head.add(hm);
  const mouth = new THREE.Mesh(G.mouth, mouthMat); mouth.scale.set(1.2, .35, .5); mouth.position.set(0, -.075, .158); head.add(mouth);
  if (p.female) {
    const hjM = mat(p.hijab, { side: THREE.DoubleSide });
    const t = new THREE.Mesh(G.hijabTop, hjM); t.position.set(0, .01, -.02); head.add(t);
    const sd = new THREE.Mesh(G.hijabSide, hjM); sd.position.set(0, .01, -.02); head.add(sd);
    const dr = new THREE.Mesh(G.drape, hjM); dr.position.y = -.27; body.add(dr); dr.position.y = .6;
  } else if (p.sarik) {
    const tb = new THREE.Mesh(G.turban, whiteMat); tb.rotation.x = Math.PI / 2; tb.position.y = .1; tb.scale.set(1, 1, .9); head.add(tb);
    const tt = new THREE.Mesh(G.turbanTop, mat(p.sarikTop)); tt.position.y = .12; head.add(tt);
  } else {
    const tk = new THREE.Mesh(G.takke, whiteMat); tk.position.y = .015; head.add(tk);
  }
  const halo = glowSprite(0xffe2a0, 1.6, 0); halo.position.y = .85; root.add(halo);
  root.scale.setScalar(.001);
  scene.add(root);
  p.obj = { root, body, head, arms, mouth, halo, tes };
}
function disposePerson(p) { if (p.obj) { scene.remove(p.obj.root); p.obj.halo.material.dispose(); p.obj = null; } }

// ======================= DURUM =======================
let people = [], byId = {}, seq = 0;
const visitors = {};
let count = 0, totalLikes = 0, beadBoost = 0, handsUp = 0, standUp = 0, skyOpen = 0, nurFlash = 0, goalIdx = 0;
let totals = {}, sultan = null;
let camFocus = null, camFocusT = 0;

function visitor(id, name, avatar) {
  let v = visitors[id];
  if (!v) v = visitors[id] = { id, name: name || id, avatar: avatar || '', likes: 0 };
  if (name) v.name = name; if (avatar) v.avatar = avatar;
  return v;
}
const inRing = id => byId[id] && byId[id].leaving < 0;
function remaining(p) { return p.until === Infinity ? Infinity : (p.until - nowMs()) / 1000; }
function getPerson(id, name, avatar, npc) {
  let p = byId[id];
  if (p) { if (name) p.name = name; if (avatar) p.avatar = avatar; return p; }
  const female = Math.random() < .4;
  p = { id, name: name || '', avatar: avatar || '', npc: !!npc, female, robe: rnd(ROBES), hijab: rnd(HIJABS), skin: rnd(SKINS),
    sarik: Math.random() < .55, sarikTop: rnd(['#8a2a2a', '#2a5a3a', '#f6f2e8', '#2a3a6a']), beard: Math.random() < .65, beardCol: rnd(BEARDS),
    ph: Math.random() * 6, nur: 0, talk: 0, gift: 0, seq: seq++, until: npc ? Infinity : nowMs(), warned: false, leaving: -1,
    x: 0, z: 0, ang: 0, spawn: 0, seat: null, label: null, labelKey: '' };
  buildPerson(p);
  byId[id] = p; people.push(p); trim(p); return p;
}
function removePerson(p) { const i = people.indexOf(p); if (i >= 0) people.splice(i, 1); if (byId[p.id] === p) delete byId[p.id]; disposePerson(p); if (p.label) { p.label.remove(); p.label = null; } }
function trim(keep) {
  const MAX = 42;
  while (people.length > MAX) {
    const pool = people.filter(p => p !== keep && (p.npc || (p.gift === 0 && p.until !== Infinity)));
    const list = pool.length ? pool : people.filter(p => p !== keep);
    removePerson(list.find(p => p.npc) || list.reduce((a, b) => remaining(a) < remaining(b) ? a : b));
  }
}
function sitOrExtend(id, name, avatar, sec, why, quiet) {
  if (byId[id] && byId[id].leaving >= 0) removePerson(byId[id]);
  const isNew = !byId[id];
  const p = getPerson(id, name, avatar);
  if (isNew && quiet) p.quietSpawn = true;
  if (sec === Infinity) p.until = Infinity;
  else if (p.until !== Infinity) p.until = Math.max(nowMs(), p.until) + sec * 1000;
  p.warned = false;
  if (isNew) {
    p.talk = 2;
    if (!quiet) { feed(`<b>${esc(cut(p.name, 16))}</b> halkaya oturdu ${why ? '• ' + esc(why) : ''}`, p.avatar, p.name); Speech.batchName('oturdu', p.name); sfx.join(); }
  }
  return p;
}
function extend(p, sec) { if (p.until !== Infinity) { p.until = Math.max(nowMs(), p.until) + sec * 1000; } p.warned = false; }

// ======================= OLAYLAR =======================
function onJoin(id, name, avatar) {
  const v = visitor(id, name, avatar);
  showWelcome(v);
  Speech.batchName('hosgeldin', v.name);
}
function onChat(id, name, text, avatar) {
  visitor(id, name, avatar);
  const t = String(text || '').toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜÂÎÛ]/g, '');
  if (t === 'KADIN' || t === 'KIZ' || t === 'ERKEK') {
    const p = byId[id]; if (p && p.leaving < 0) { p.female = t !== 'ERKEK'; disposePerson(p); buildPerson(p); p.obj.root.scale.setScalar(1); p.spawn = 1; burst(p.x, .8, p.z, 25); }
    return;
  }
  const z = ZIKIRLER.find(([re]) => re.test(t));
  if (!z) return;
  let p;
  if (inRing(id)) { p = byId[id]; extend(p, SURE_ZIKIR); }
  else p = sitOrExtend(id, name, avatar, SURE_ZIKIR_GIRIS, 'zikir ile 1 dk');
  p.talk = 2.5; floatText(p, z[1]);
  burst(p.x, 1.2, p.z, 6, 0xffe7a8, .6, .8, 1.2);
  addCount(1); sfx.zikir();
}
function onLike(id, name, n, avatar, total) {
  n = Math.max(0, n | 0);
  if (total) totalLikes = Math.max(totalLikes, total); else totalLikes += n;
  beadBoost = Math.max(beadBoost, .35);
  const v = visitor(id, name, avatar); v.likes += n;
  // her 100 beğeni bir kez sayılır, artan beğeni kaybolmaz
  while (v.likes >= BEGENI_GIRIS) {
    v.likes -= BEGENI_GIRIS;
    if (!inRing(id)) sitOrExtend(id, v.name, v.avatar, SURE_GIRIS, '❤ 2 dk');
    else { const p = byId[id]; extend(p, SURE_BEGENI); p.talk = 1; floatText(p, '❤ +1 dk'); }
  }
  renderNear();
}
function onFollow(id, name, avatar) {
  visitor(id, name, avatar);
  feed(`💚 <b>${esc(cut(name, 16))}</b> takip etti — Allah razı olsun`, avatar, name);
  Speech.batchName('takip', name);
}
function onShare(id, name, avatar) {
  feed(`📤 <b>${esc(cut(name, 16))}</b> yayını paylaştı`, avatar, name);
  Speech.batchName('paylasim', name);
}
function onGift(id, name, coins, giftName, avatar) {
  coins = Math.max(1, Math.round(coins || 1));
  const T = TIERS.find(t => coins >= t.min);
  visitor(id, name, avatar);
  const p = sitOrExtend(id, name, avatar, T.sure, '🎁 ' + T.etiket, true);
  p.gift += coins; p.nur = Math.max(p.nur, 4 + T.lvl); p.talk = 3;
  totals[id] = { name: p.name, avatar: p.avatar, coins: (totals[id]?.coins || 0) + coins };
  const top = Object.values(totals).sort((a, b) => b.coins - a.coins)[0];
  floatText(p, '⏳ ' + T.etiket);
  sfx.gift(T.lvl);
  beam(p.x, p.z, 1.6 + T.lvl * .5, .5 + T.lvl * .08);
  burst(p.x, 1, p.z, 20 + T.lvl * 25, 0xffd27a, 1.5 + T.lvl * .3, 2 + T.lvl * .4);
  if (T.lvl === 1) {
    feed(`🌹 <b>${esc(cut(p.name, 16))}</b>: ${rnd(DUA_SMALL)} • +3 dk`, p.avatar, p.name);
    Speech.batchName('gul', p.name);
    addCount(T.zikir); renderNear(); return;
  }
  beadBoost = 1; shockRing();
  if (T.lvl >= 3) { lightKandil(p.name, p.avatar); dropPetals(90 + T.lvl * 20); }
  if (T.lvl >= 4) { skyOpen = T.dur; for (let i = 0; i < 5; i++) setTimeout(shootingStar, i * 450); camFocus = p; camFocusT = T.dur * .8; }
  if (T.lvl >= 5) { rainNur(260); nurFlash = 1; }
  if (T.lvl >= 6) { standUp = T.dur; sultan = top; }
  const text = T.lvl >= 5 ? rnd(DUA_HUGE) : rnd(DUA_BIG);
  duaQ.push({ kind: 'dua', name: p.name, avatar: p.avatar, gift: giftName || 'Hediye', coins, lvl: T.lvl, text, dur: T.dur, etiket: T.etiket, person: p });
  if (T.lvl >= 6) { const a = rnd(AYETLER); duaQ.push({ kind: 'ayet', text: a[0], ref: a[1], lvl: 6, dur: 8 }); }
  addCount(T.zikir);
}
function addCount(n) {
  count += n;
  while (goalIdx < GOALS.length && count >= GOALS[goalIdx]) {
    const g = GOALS[goalIdx++], a = AYETLER[goalIdx % AYETLER.length];
    nurFlash = Math.max(nurFlash, .8); shockRing(0xfff0c0); sfx.gift(4);
    duaQ.push({ kind: 'ayet', text: a[0], ref: a[1], goal: g, lvl: 4, dur: 8 });
  }
}
function lightKandil(name, avatar) {
  const k = kandils.find(k => !k.name) || kandils.reduce((a, b) => a.lit < b.lit ? a : b);
  k.name = name; k.avatar = avatar; k.lit = nowMs(); k.flare = 1;
  const wp = new THREE.Vector3(); k.g.getWorldPosition(wp); burst(wp.x, wp.y - .25, wp.z, 50, 0xffc060, 1.2, 1);
}

// ======================= ARAYÜZ (HTML) =======================
const labelsEl = $('labels'), feedEl = $('feed'), welcomeEl = $('welcome');
function feed(html, avatar, name, cls = '') {
  const d = document.createElement('div'); d.className = 'ev ' + cls; d.innerHTML = `${avHTML(avatar, name)}<span>${html}</span>`;
  feedEl.prepend(d);
  while (feedEl.children.length > 5) feedEl.lastChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 6500);
}
let wQueue = [], wShown = 0;
function showWelcome(v) {
  if (wQueue.some(x => x.id === v.id)) return;
  wQueue.push(v); if (wQueue.length > 8) wQueue.shift();
  pumpWelcome();
}
function pumpWelcome() {
  while (wShown < 3 && wQueue.length) {
    const v = wQueue.shift(); wShown++;
    const d = document.createElement('div'); d.className = 'wcard';
    const sub = inRing(v.id) ? 'Halkada yerin hazır, zikre devam!' : `❤ ${BEGENI_GIRIS} beğeni gönder, halkaya otur`;
    d.innerHTML = `${avHTML(v.avatar, v.name)}<div><div class="t1">Hoş geldin, ${esc(cut(v.name, 18))} 🤍</div><div class="t2">${sub}</div></div>`;
    welcomeEl.appendChild(d);
    const life = wQueue.length > 2 ? 2600 : 4200;
    setTimeout(() => { d.classList.add('out'); setTimeout(() => { d.remove(); wShown--; pumpWelcome(); }, 450); }, life);
  }
}
const nearEl = $('near'), nearList = $('nearList');
let nearDirty = false;
function renderNear() { nearDirty = true; }
function drawNear() {
  if (!nearDirty) return; nearDirty = false;
  const list = Object.values(visitors).filter(v => v.likes > 0 && !inRing(v.id)).sort((a, b) => b.likes - a.likes).slice(0, 3);
  nearEl.style.display = list.length ? 'block' : 'none';
  nearList.innerHTML = list.map(v => `<div class="nr">${avHTML(v.avatar, v.name)}<div class="info"><div class="nm">${esc(cut(v.name, 16))}</div><div class="bar"><i style="width:${Math.min(100, v.likes / BEGENI_GIRIS * 100)}%"></i></div></div><span class="ct">${v.likes}/${BEGENI_GIRIS}</span></div>`).join('');
}
// yükselen yazı (3D konumdan)
const floats = [];
function floatText(p, txt) {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:0;top:0;font:700 22px "Noto Serif";color:#ffe7a8;text-shadow:0 0 8px #000,0 0 14px rgba(255,180,60,.8);white-space:nowrap;pointer-events:none';
  d.textContent = txt; labelsEl.appendChild(d); floats.push({ d, p, t: 0 });
}
// dua / ayet kartı
const duaEl = $('dua'), veil = $('veil');
const duaQ = []; let dua = null;
function nextDua() {
  if (dua || !duaQ.length) return;
  dua = duaQ.shift(); dua.t = 0; if (duaQ.length > 3) dua.dur *= .6;
  duaEl.className = 'glass show' + (dua.lvl >= 5 ? ' big' : '') + (dua.kind === 'ayet' ? ' ayet' : '');
  if (dua.kind === 'ayet') {
    duaEl.innerHTML = `<div class="gift">✨ ${dua.goal ? dua.goal.toLocaleString('tr-TR') + ' zikre ulaşıldı' : 'Ayet-i Kerime'} ✨</div><div class="text" style="margin-top:10px">“${esc(dua.text)}”</div><div class="ref">(${esc(dua.ref)})</div>`;
    Speech.say(dua.text, 2);
  } else {
    duaEl.innerHTML = `${avHTML(dua.avatar, dua.name)}<div class="gift">🤲 ${esc(cut(dua.gift, 20))} • ${dua.coins.toLocaleString('tr-TR')} jeton</div><div class="name">${esc(cut(dua.name, 18))}</div><div class="text">${esc(dua.text)}</div><div class="time">⏳ Halkada ${esc(dua.etiket)}</div>`;
    handsUp = Math.max(handsUp, dua.dur);
    const sn = spokenName(dua.name);
    Speech.say(`${sn ? sn + ', ' : ''}Allah razı olsun. ${dua.text}${dua.lvl >= 5 ? ' Âmin.' : ''}`, 3);
  }
  veil.classList.toggle('on', dua.lvl >= 5 || dua.kind === 'ayet');
}
function updateDua(dt) {
  if (!dua) { nextDua(); return; }
  dua.t += dt;
  if (dua.t > dua.dur) { duaEl.className = 'glass show hide' + (dua.lvl >= 5 ? ' big' : ''); veil.classList.remove('on'); const d = dua; dua = null; setTimeout(() => { if (!dua) duaEl.className = 'glass'; }, 480); }
}
// alt panel
const zcEl = $('zc'), lcEl = $('lc'), progEl = document.querySelector('#prog i'), infoEl = $('info');
let infoPage = -1;
function updateBottom(t) {
  const goal = GOALS[Math.min(goalIdx, GOALS.length - 1)], prev = goalIdx > 0 ? GOALS[goalIdx - 1] : 0;
  zcEl.textContent = `📿 ${count.toLocaleString('tr-TR')} zikir • hedef ${goal.toLocaleString('tr-TR')}`;
  lcEl.textContent = `❤ ${totalLikes.toLocaleString('tr-TR')}`;
  progEl.style.width = (clamp((count - prev) / (goal - prev), 0, 1) * 100) + '%';
  const page = Math.floor(t / 7) % 4;
  if (page === infoPage) return; infoPage = page;
  const real = people.filter(p => !p.npc && p.leaving < 0).length;
  const top = Object.values(totals).sort((a, b) => b.coins - a.coins).slice(0, 3);
  const html = [
    sultan ? `👑 Halkanın Sultanı: <b>${esc(cut(sultan.name, 18))}</b><br>🤲 Dua listesi: ${top.map((p, i) => `${i + 1}. ${esc(cut(p.name, 12))}`).join('  ')}`
      : `🤲 <b>Dua listesi</b> • halkada ${real} kişi<br>${top.length ? top.map((p, i) => `${i + 1}. ${esc(cut(p.name, 12))}`).join('   ') : 'İlk hediyeyi gönderenin adı burada'}`,
    `⏳ <b>Halkada kalma süresi</b><br>🌹 1 jeton <b>3 dk</b> • 10 jeton <b>10 dk</b> • 100 jeton <b>30 dk</b>`,
    `✨ <b>Büyük hediyeler</b><br>500 jeton <b>1 saat</b> • 1000 jeton <b>3 saat</b> • 5000 jeton <b>yayın sonuna kadar</b>`,
    `❤ <b>${BEGENI_GIRIS} beğeni</b> → halkaya otur (2 dk) • her 100 beğeni <b>+1 dk</b><br>✍️ Zikir yaz → <b>+20 sn</b> • KADIN / ERKEK yaz`,
  ][page];
  infoEl.style.opacity = 0; setTimeout(() => { infoEl.innerHTML = html; infoEl.style.opacity = 1; }, 380);
}
const statusEl = $('status'); let statusTO = 0;
function setStatus(txt, ms = 7000) { statusEl.textContent = txt; statusEl.classList.add('on'); clearTimeout(statusTO); statusTO = setTimeout(() => statusEl.classList.remove('on'), ms); }

// ======================= SES =======================
let AC = null, master = null, musicGain = null, fxBus = null;
const sfx = { zikir() {}, gift() {}, join() {} };
const music = { els: [], cur: 0, base: .55 };
function duck(on) { if (!musicGain) return; const t = AC.currentTime; musicGain.gain.cancelScheduledValues(t); musicGain.gain.setTargetAtTime(on ? .14 : music.base, t, on ? .15 : .8); }
function audioInit() {
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = .95; master.connect(AC.destination);
  const rev = AC.createConvolver(), len = AC.sampleRate * 2.8, buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  rev.buffer = buf; const wet = AC.createGain(); wet.gain.value = .45; rev.connect(wet); wet.connect(master);
  fxBus = AC.createGain(); fxBus.gain.value = .6; fxBus.connect(master); fxBus.connect(rev);
  musicGain = AC.createGain(); musicGain.gain.value = music.base; musicGain.connect(master);
  // müzik: iki nasheed sırayla
  ['muzik/1.mp3', 'muzik/2.mp3'].forEach((src, i) => {
    const a = new Audio(); a.src = src; a.preload = 'auto'; a.crossOrigin = 'anonymous'; a.setAttribute('playsinline', '');
    try { AC.createMediaElementSource(a).connect(musicGain); } catch (e) { console.log(e); }
    a.addEventListener('ended', () => { music.cur = (i + 1) % music.els.length; music.els[music.cur].currentTime = 0; music.els[music.cur].play().catch(() => {}); });
    music.els.push(a);
  });
  music.els[0].play().catch(e => console.log('müzik', e));
  const PENTA = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];
  function bell(f, t, v, d = 2.2) { const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), g2 = AC.createGain();
    o.frequency.value = f; o2.frequency.value = f * 2.76; g2.gain.value = .3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(fxBus); o.start(t); o2.start(t); o.stop(t + d); o2.stop(t + d); }
  function pad(freqs, t, d, v) { freqs.forEach(f => [-5, 5].forEach(dt => { const o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; fl.type = 'lowpass'; fl.frequency.value = 1100;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 1); g.gain.setValueAtTime(v, t + d - 1.4); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(fl); fl.connect(g); g.connect(fxBus); o.start(t); o.stop(t + d); })); }
  let lastZ = 0;
  sfx.zikir = () => { const t = AC.currentTime; if (t - lastZ < .15) return; lastZ = t; bell(rnd(PENTA), t, .045, 1.3); };
  sfx.join = () => { const t = AC.currentTime; bell(880, t, .05, 1.2); bell(1174.66, t + .12, .05, 1.4); };
  sfx.gift = lvl => { const t = AC.currentTime, n = Math.min(2 + lvl * 2, 12);
    for (let i = 0; i < n; i++) bell(PENTA[i % 6] * (i >= 6 ? 2 : 1) / (lvl >= 4 ? 2 : 1), t + i * .09, .08 + lvl * .015);
    if (lvl >= 3) pad([146.83, 220, 293.66, 369.99], t, 3 + lvl, .01 + lvl * .004);
    if (lvl >= 5) pad([73.42, 110, 146.83], t + .5, 8, .025); };
  Voice.init();
}

// --- Kayıtlı dualar (Speko ile üretildi, telifsiz)
const DUA_YAZI = [
  'Allah\'ım, bu halkada seni ananları affet. Kalplerimizi zikrinle huzura kavuştur. Âmin.',
  'Rabbimiz, bize dünyada da iyilik ver, ahirette de iyilik ver. Bizi ateş azabından koru. Âmin.',
  'Allah\'ım, duasıyla, hediyesiyle bu halkaya katılan herkesten razı ol. Evlerine bereket, gönüllerine huzur ver. Âmin.',
  'Rabbim, hastalarımıza şifa, dertlilerimize deva, borçlularımıza eda nasip eyle. Âmin.',
  'Allah\'ım, anne babalarımızı, sevdiklerimizi ve ahirete göçmüş bütün müminleri rahmetinle kucakla. Âmin.',
];
const Voice = {
  dualar: [], busy: false, idx: 0, bus: null,
  async init() {
    if (!window.SESLER) return;
    this.bus = AC.createGain(); this.bus.gain.value = 1.15; this.bus.connect(master);
    const dec = async u => { const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return AC.decodeAudioData(a.buffer); };
    try { this.dualar = await Promise.all(SESLER.dualar.map(dec)); } catch (e) { return; }
    setInterval(() => this.duaOku(), 150000);
    setTimeout(() => this.duaOku(), 45000);
  },
  duaOku() {
    if (!this.dualar.length || this.busy || Speech.busy || dua) return;
    const i = this.idx++ % this.dualar.length, b = this.dualar[i];
    this.busy = true; duck(true); showSub(`🤲 ${DUA_YAZI[i]}`); handsUp = Math.max(handsUp, b.duration + .6);
    const s = AC.createBufferSource(); s.buffer = b; s.connect(this.bus); s.start(AC.currentTime + .25);
    s.onended = () => { this.busy = false; duck(false); hideSub(); Speech.next(); };
  },
};

// --- Canlı konuşma (telefonun Türkçe sesiyle, isim söyler)
const subEl = $('sub'); let subTO = 0;
function showSub(txt) { subEl.innerHTML = esc(txt).replace(/^🤲/, '<b>🤲</b>'); subEl.classList.add('on'); clearTimeout(subTO); subTO = setTimeout(hideSub, 12000); }
function hideSub() { subEl.classList.remove('on'); }
const Speech = {
  ok: 'speechSynthesis' in window, voice: null, q: [], busy: false, last: 0, batches: {}, to: 0,
  init() {
    if (!this.ok) return;
    const pick = () => { const vs = speechSynthesis.getVoices(); this.voice = vs.find(v => /^tr/i.test(v.lang) && /Yelda|Google|Emel|Filiz|Ahmet|Cem/i.test(v.name)) || vs.find(v => /^tr/i.test(v.lang)) || null; };
    pick(); speechSynthesis.onvoiceschanged = pick;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (_) {}
  },
  say(text, prio = 1) {
    if (!text) return;
    if (this.q.length >= 5) { this.q = this.q.filter(x => x.prio >= prio); if (this.q.length >= 5) return; }
    this.q.push({ text, prio }); this.next();
  },
  next() {
    if (this.busy || !this.q.length || Voice.busy) return;
    this.q.sort((a, b) => b.prio - a.prio);
    const it = this.q.shift();
    this.busy = true; this.last = nowMs(); duck(true); showSub(it.text);
    const done = () => { if (!this.busy) return; this.busy = false; clearTimeout(this.to); duck(false); hideSub(); setTimeout(() => this.next(), 300); };
    if (!this.ok) { this.to = setTimeout(done, 1500 + it.text.length * 55); return; }
    const u = new SpeechSynthesisUtterance(it.text); u.lang = 'tr-TR'; if (this.voice) u.voice = this.voice; u.rate = 1.02; u.pitch = 1;
    u.onend = done; u.onerror = done;
    this.to = setTimeout(done, 2500 + it.text.length * 90);
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  },
  // aynı türden olayları birleştirip tek cümlede söyler
  batchName(kind, name) {
    const n = spokenName(name); if (!n) return;
    const b = this.batches[kind] || (this.batches[kind] = { names: [], to: 0 });
    if (!b.names.includes(n)) b.names.push(n);
    clearTimeout(b.to); b.to = setTimeout(() => this.flush(kind), 1800);
  },
  flush(kind) {
    const b = this.batches[kind]; if (!b || !b.names.length) return;
    const ns = b.names.splice(0); const many = ns.length > 3, list = ns.slice(0, 3);
    const join = list.length > 1 ? list.slice(0, -1).join(', ') + ' ve ' + list[list.length - 1] : list[0];
    const tail = many ? ` ve ${ns.length - 3} kardeşimiz daha` : '';
    const L = {
      hosgeldin: [`Hoş geldin ${join}${tail}.`, `${join}${tail}, halkamıza hoş geldin.`, `Selamün aleyküm ${join}${tail}, hoş geldin.`],
      oturdu: [`${join}${tail} halkaya oturdu. Zikrin kabul olsun.`, `Maşallah, ${join}${tail} halkamıza katıldı.`],
      gul: [`${join}${tail}, gül için Allah razı olsun.`, `${join}${tail}, Allah razı olsun, Rabbim kabul etsin.`],
      takip: [`${join}${tail}, takip için teşekkürler, Allah razı olsun.`],
      paylasim: [`${join}${tail}, paylaştığın için Allah razı olsun.`],
      uyari: [`${join}, süren bitmek üzere. Beğeni ya da hediye ile halkada kalabilirsin.`],
    }[kind];
    if (kind === 'hosgeldin' && ns.length === 1) { const v = Object.values(visitors).find(v => spokenName(v.name) === ns[0]); if (v && !inRing(v.id) && Math.random() < .5) { this.say(`Hoş geldin ${ns[0]}. Yüz beğeni gönder, halkaya otur.`, 1); return; } }
    this.say(rnd(L), kind === 'gul' ? 2 : 1);
  },
};
// sunucu konuşmaları (sessizlikte)
let hostIdx = 0, hostT = 25;
function hostTick(dt) {
  hostT -= dt; if (hostT > 0) return;
  hostT = 38 + Math.random() * 20;
  if (Speech.busy || Voice.busy || dua || nowMs() - Speech.last < 15000) return;
  const real = people.filter(p => !p.npc && p.leaving < 0);
  const near = Object.values(visitors).filter(v => v.likes > 30 && !inRing(v.id)).sort((a, b) => b.likes - a.likes)[0];
  const opts = [() => HOST_LINES[hostIdx++ % HOST_LINES.length]];
  if (real.length >= 3) opts.push(() => `Şu an halkada ${real.length} kişi zikrediyor. Maşallah.`);
  if (near && spokenName(near.name)) opts.push(() => `${spokenName(near.name)}, halkaya oturmana ${BEGENI_GIRIS - near.likes} beğeni kaldı.`);
  if (sultan && spokenName(sultan.name)) opts.push(() => `Bu akşam halkamızın sultanı ${spokenName(sultan.name)}. Allah razı olsun.`);
  Speech.say(rnd(opts)(), 1);
}

// ======================= YERLEŞİM & ANİMASYON =======================
const PSCALE = 1.28;
const RINGS = [{ n: 10, r: 2.05 }, { n: 14, r: 2.95 }, { n: 18, r: 3.85 }];
const tmpV = new THREE.Vector3();
function project(x, y, z) { tmpV.set(x, y, z).project(camera); return [(tmpV.x * .5 + .5) * W, (-tmpV.y * .5 + .5) * H, tmpV.z]; }
function updateLabel(p) {
  if (p.npc || p.silent || !p.obj) return;
  if (!p.label) { p.label = document.createElement('div'); p.label.className = 'lbl'; labelsEl.appendChild(p.label); }
  const r = remaining(p), tm = fmtSure(r), low = r < UYARI_SN;
  const key = p.name + '|' + tm + '|' + (p.gift > 0) + '|' + low + '|' + p.avatar;
  if (key !== p.labelKey) {
    p.labelKey = key;
    p.label.className = 'lbl' + (p.gift ? ' gift' : '') + (low ? ' low' : '');
    p.label.innerHTML = `${avHTML(p.avatar, p.name)}<span class="n">${esc(cut(p.name, 14))}</span><span class="tm">${tm}</span>`;
  }
  const s = p.obj.root.scale.x;
  const [sx, sy, sz] = project(p.obj.root.position.x, p.obj.root.position.y + 1.25 * s + (standUp > 0 ? .25 : 0), p.obj.root.position.z);
  const sc = clamp(1.25 - sz * .0, .75, 1.2) * (p.depthScale || 1);
  p.label.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-100%) scale(${sc})`;
  p.label.style.opacity = p.leaving >= 0 ? clamp(1 - p.leaving, 0, 1) : clamp(s * 1.2, 0, 1);
  p.label.style.zIndex = String(Math.round(1000 + p.obj.root.position.z * 50));
}
function updatePeople(dt, t) {
  const n = nowMs();
  // süre kontrolü
  people.slice().forEach(p => {
    if (p.npc) return;
    if (p.leaving >= 0) { p.leaving += dt; if (p.leaving > 1.5) removePerson(p); return; }
    if (p.silent) return;
    const r = remaining(p);
    if (r < UYARI_SN && !p.warned) { p.warned = true; feed(`⏳ <b>${esc(cut(p.name, 14))}</b>, süren bitiyor! ❤ beğeni ya da 🎁 ile kal`, p.avatar, p.name, 'warn'); Speech.batchName('uyari', p.name); }
    if (r <= 0) { p.leaving = 0; feed(`👋 <b>${esc(cut(p.name, 14))}</b> halkadan kalktı`, p.avatar, p.name); burst(p.x, .8, p.z, 30, 0xbfd8ff, 1, 2); }
  });
  // boş kalmasın: isimsiz cemaat
  const real = people.filter(p => !p.npc && p.leaving < 0).length, npcs = people.filter(p => p.npc);
  const want = Math.max(0, 7 - real);
  if (npcs.length < want) { const p = getPerson('npc' + seq, '', '', true); }
  else if (npcs.length > want) { const q = npcs[0]; q.leaving = 0; q.npc = false; q.until = 0; q.warned = true; q.name = ''; q.silent = true; }
  // yerleşim
  const order = people.filter(p => p.leaving < 0).sort((a, b) => (a.npc - b.npc) || (b.gift - a.gift) || (a.seq - b.seq));
  let idx = 0;
  RINGS.forEach((R, ri) => {
    const list = order.slice(idx, idx + R.n); idx += R.n;
    list.forEach((p, k) => {
      const ang = (k / list.length) * Math.PI * 2 + ri * .25 + t * .02;
      p.tx = Math.cos(ang) * R.r; p.tz = Math.sin(ang) * R.r;
    });
  });
  const handsT = handsUp > 0 || standUp > 0 ? 1 : 0;
  people.forEach(p => {
    const o = p.obj; if (!o) return;
    if (p.tx === undefined) { p.tx = 0; p.tz = 0; }
    if (p.spawn === 0) { p.x = p.tx; p.z = p.tz; if (!p.npc && !p.quietSpawn) { beam(p.x, p.z, 2, .5); burst(p.x, .3, p.z, 40, 0xffe7a8, 1.2, 2.5); } else burst(p.x, .3, p.z, 10, 0xffe7a8, .6, 1); }
    p.spawn = Math.min(1, p.spawn + dt * 1.1);
    p.x = lerp(p.x, p.tx, Math.min(1, dt * 1.8)); p.z = lerp(p.z, p.tz, Math.min(1, dt * 1.8));
    const sp = p.spawn, ease = 1 - Math.pow(1 - sp, 3);
    let y = (1 - ease) * 3.2, sc = .2 + .8 * ease;
    if (p.leaving >= 0) { y = p.leaving * p.leaving * 3; sc = Math.max(.001, 1 - p.leaving * .6); }
    o.root.position.set(p.x, y, p.z); o.root.scale.setScalar(sc * PSCALE);
    o.root.rotation.y = Math.atan2(-p.x, -p.z);
    // zikir sallanması (öne-arkaya, ritmik)
    const tempo = p.talk > 0 ? 3.6 : 2.2, sw = Math.sin(t * tempo + p.ph);
    o.body.rotation.x = sw * (handsT ? .04 : .13) + (handsT ? -.05 : .06);
    o.body.rotation.z = Math.sin(t * tempo * .5 + p.ph) * .03;
    o.body.position.y = (standUp > 0 ? .12 : 0);
    o.head.rotation.x = Math.sin(t * tempo + p.ph + .6) * .12 - (handsT ? .18 : 0);
    o.head.rotation.y = Math.sin(t * .4 + p.ph * 2) * .15;
    o.mouth.scale.y = p.talk > 0 ? .35 + Math.abs(Math.sin(t * 11 + p.ph)) * .9 : .35;
    // kollar: kucakta tesbih ↔ dua
    p.pose = lerp(p.pose ?? 0, handsT, Math.min(1, dt * 3));
    const k = p.pose;
    o.arms.forEach(a => {
      a.sh.rotation.x = lerp(-.55, -1.25, k) + (1 - k) * Math.sin(t * 3 + p.ph) * .04;
      a.sh.rotation.z = a.s * lerp(.12, .32, k);
      a.el.rotation.x = lerp(-1.05, -1.35, k);
      a.el.rotation.z = -a.s * lerp(0, .2, k);
    });
    o.tes.visible = k < .5;
    p.talk = Math.max(0, p.talk - dt);
    // nur
    p.nur = Math.max(0, p.nur - dt * .4);
    o.halo.material.opacity = clamp(p.nur / 3, 0, 1) * (.75 + .25 * Math.sin(t * 5 + p.ph));
    o.halo.scale.setScalar(1.4 + Math.min(p.nur, 6) * .12);
    p.depthScale = clamp(1 + p.z * .05, .85, 1.2);
    updateLabel(p);
  });
  // gölgeler
  let si = 0;
  people.forEach(p => { if (!p.obj || si >= SHMAX) return; const s = p.obj.root.scale.x; bm.compose(tmpV.set(p.x, 0, p.z), shQ, shS.set(s, 1, s)); shadows.setMatrixAt(si++, bm); });
  shadows.count = si; shadows.instanceMatrix.needsUpdate = true;
}
function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt;
    if (!f.p.obj || f.t > 2.2) { f.d.remove(); floats.splice(i, 1); continue; }
    const [x, y] = project(f.p.x, 1.6 + f.t * .7, f.p.z);
    f.d.style.transform = `translate(${x}px,${y - 30}px) translate(-50%,-100%) scale(${1 + f.t * .1})`;
    f.d.style.opacity = 1 - f.t / 2.2;
  }
}
const kandilLabels = [];
function updateKandils(dt, t) {
  kandils.forEach((k, i) => {
    k.g.rotation.z = Math.sin(t * .8 + k.ph) * .05; k.g.rotation.x = Math.cos(t * .6 + k.ph) * .04;
    const lit = !!k.name; k.flare = Math.max(0, k.flare - dt * .4);
    k.glassM.emissive.setHex(lit ? 0xff9a30 : 0x000000); k.glassM.emissiveIntensity = lit ? 2 + Math.sin(t * 9 + k.ph) * .3 : 0;
    k.glassM.color.setHex(lit ? 0xffc070 : 0x4a5a7a);
    k.glow.material.opacity = lit ? .8 + Math.sin(t * 7 + k.ph) * .1 : 0; k.glow.scale.setScalar(3 + k.flare * 5);
    if (lit) {
      if (!k.label) { k.label = document.createElement('div'); k.label.className = 'lbl kandil'; labelsEl.appendChild(k.label); }
      k.label.innerHTML = `${avHTML(k.avatar, k.name)}<span class="n">🪔 ${esc(cut(k.name, 11))}</span>`;
      const wp = new THREE.Vector3(); k.g.getWorldPosition(wp); const [x, y] = project(wp.x, wp.y - .75, wp.z);
      k.label.style.transform = `translate(${x}px,${y}px) translate(-50%,0) scale(.9)`;
    }
  });
}
// kamera
const camState = { ang: 0, r: 8.6, h: 9.6, look: new THREE.Vector3(0, .2, .3) };
function updateCamera(dt, t) {
  let tAng = Math.sin(t * .045) * .4, tR = 8.6 + Math.sin(t * .07) * .4, tH = 9.6 + Math.sin(t * .09) * .4;
  const look = new THREE.Vector3(0, .2, .3);
  if (camFocus && camFocusT > 0 && camFocus.obj) {
    camFocusT -= dt;
    tAng = Math.atan2(camFocus.x, camFocus.z); tR = 7.2; tH = 7.2; look.set(camFocus.x * .5, .6, camFocus.z * .5);
  } else camFocus = null;
  camState.ang = lerp(camState.ang, tAng, Math.min(1, dt * .9)); camState.r = lerp(camState.r, tR, Math.min(1, dt * .9)); camState.h = lerp(camState.h, tH, Math.min(1, dt * .9));
  camState.look.lerp(look, Math.min(1, dt * 1.2));
  camera.position.set(Math.sin(camState.ang) * camState.r, camState.h, Math.cos(camState.ang) * camState.r);
  camera.lookAt(camState.look);
}

// ======================= DÖNGÜ =======================
let last = performance.now(), started = false;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  handsUp = Math.max(0, handsUp - dt); standUp = Math.max(0, standUp - dt); skyOpen = Math.max(0, skyOpen - dt);
  // ortam
  stars1.material.opacity = .55 + Math.sin(t * 1.3) * .2 + (skyOpen > 0 ? .3 : 0);
  stars2.material.opacity = .65 + Math.cos(t * 1.7) * .25;
  sky.material.uniforms.glow.value = lerp(sky.material.uniforms.glow.value, skyOpen > 0 ? 1 : 0, dt * 1.5);
  moonGlow.material.opacity = .45 + (skyOpen > 0 ? .4 : 0) + Math.sin(t * .8) * .05;
  if (skyOpen > 0 && Math.random() < dt * 1.2) shootingStar();
  if (Math.random() < dt * .04) shootingStar();
  centerLight.intensity = 34 + Math.sin(t * 9) * 2.5 + Math.sin(t * 13.7) * 2 + beadBoost * 25 + nurFlash * 60;
  centerLamp.userData.glow.material.opacity = .75 + Math.sin(t * 8) * .08 + beadBoost * .2;
  hemi.intensity = 1.1 + nurFlash * 1.5;
  nurFlash = Math.max(0, nurFlash - dt * .35);
  candles.forEach((c, i) => { const f = .5 + Math.sin(t * 10 + i * 2.1) * .06 + Math.sin(t * 17 + i) * .04; c.scale.set(f, f * 1.25, 1); });
  // tesbih
  tesbih.rotation.y += dt * (.15 + beadBoost * 3); beadBoost = Math.max(0, beadBoost - dt * .45);
  tesbihGlow.material.opacity = beadBoost * .9;
  // ateş böcekleri
  for (let i = 0; i < FF; i++) { const s = ffSeed[i], a = s.a + t * s.s; ffPos[i * 3] = Math.cos(a) * s.r; ffPos[i * 3 + 1] = s.h + Math.sin(t * .7 + s.p) * .4; ffPos[i * 3 + 2] = Math.sin(a) * s.r; }
  ffGeo.attributes.position.needsUpdate = true; fireflies.material.opacity = .6 + Math.sin(t * 2) * .2;
  updatePeople(dt, t);
  updateFloats(dt);
  updateKandils(dt, t);
  updateParticles(dt); updatePetals(dt, t); updateBeams(dt); updateRings(dt); updateShooters(dt);
  updateCamera(dt, t);
  updateDua(dt); updateBottom(t); drawNear();
  if (started) hostTick(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ======================= BAĞLANTI =======================
function connect() {
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (_) { return; }
    try {
      if (m.type === 'chat') onChat(m.id, m.name, m.text, m.avatar);
      else if (m.type === 'gift') onGift(m.id, m.name, m.coins, m.gift, m.avatar);
      else if (m.type === 'like') onLike(m.id, m.name, m.count, m.avatar, m.total);
      else if (m.type === 'join') onJoin(m.id, m.name, m.avatar);
      else if (m.type === 'follow') onFollow(m.id, m.name, m.avatar);
      else if (m.type === 'share') onShare(m.id, m.name, m.avatar);
      else if (m.type === 'status') setStatus(m.text);
    } catch (err) { console.log('olay hatası', err); }
  };
  ws.onclose = () => { setStatus('Sunucu bağlantısı koptu, yeniden bağlanıyor…', 4000); setTimeout(connect, 3000); };
}

// ======================= TEST / DEMO =======================
const FAKE = ['hümeyra', 'ahmethan', 'Sena', 'Nur', 'ömer', 'efeberk0', 'Betül', 'Yusuf_34', 'zeynep.k', 'Mustafa', 'Elif', 'haticee', 'burak21', 'Esma', 'kerem', 'Rabia', 'Selim', 'ayşe_nur', 'hamza', 'Meryem', 'Abdullah', 'Kübra', 'Emre_63', 'fatma.', 'Zehra'];
const GIFTNAMES = { 1: 'Gül', 10: 'Parmak Kalp', 100: 'El Kalp', 500: 'Hilal', 1000: 'Galaksi', 5000: 'Aslan' };
const ZW = ['SUBHANALLAH', 'Elhamdülillah', 'allahuekber', 'Lâ ilâhe illallah', 'estağfirullah', 'Maşallah', 'amin'];
const fake = () => { const n = rnd(FAKE); return [n.toLowerCase(), n]; };
let demo = false, demoT = 0;
setInterval(() => {
  if (!demo) return; demoT -= .1; if (demoT > 0) return; demoT = .5 + Math.random() * 1.1;
  const r = Math.random(), [id, nm] = fake();
  if (r < .2) onJoin(id, nm);
  else if (r < .5) onChat(id, nm, rnd(ZW));
  else if (r < .8) onLike(id, nm, 15 + Math.floor(Math.random() * 40));
  else if (r < .92) onGift(id, nm, 1, 'Gül');
  else if (r < .975) onGift(id, nm, 10, 'Parmak Kalp');
  else if (r < .993) onGift(id, nm, 100, 'El Kalp');
  else onGift(id, nm, 500, 'Hilal');
}, 100);
const testEl = $('test');
let lastFake = null;
testEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const [id, nm] = (b.dataset.a === 'like' && lastFake) ? lastFake : fake(); lastFake = [id, nm];
  if (b.dataset.c) onGift(id, nm, +b.dataset.c, GIFTNAMES[b.dataset.c]);
  else if (b.dataset.a === 'zikir') onChat(id, nm, rnd(ZW));
  else if (b.dataset.a === 'like') onLike(id, nm, 40);
  else if (b.dataset.a === 'join') onJoin(id, nm);
  else if (b.dataset.a === 'dua') { if (AC) Voice.duaOku(); }
  else if (b.dataset.a === 'demo') { demo = !demo; b.classList.toggle('on', demo); }
  else if (b.dataset.a === 'hide') testEl.style.display = 'none';
});
window.zikir = { onJoin, onChat, onLike, onGift, people, byId, visitors, Speech };

// ======================= BAŞLAT =======================
$('startInfo').textContent = LIVE
  ? 'Başlat\'a bas, sonra TikTok\'ta ekran paylaşımıyla canlı yayını aç. Ses ve konuşma için bu dokunuş gerekli.'
  : 'Önizleme: Başlat\'a bas. Alttaki butonlarla giriş, beğeni, zikir ve hediyeleri deneyebilirsin.';
if (!LIVE) for (let i = 0; i < 9; i++) { const [id, nm] = fake(); sitOrExtend(id, nm, '', 60 + Math.random() * 150, '', true); }
$('go').onclick = () => {
  $('start').style.display = 'none'; started = true;
  try { audioInit(); } catch (e) { console.log(e); }
  Speech.init();
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) {}
  if (LIVE) connect();
  if (!LIVE || PARAMS.has('test')) { testEl.style.display = 'flex'; if (!LIVE) { demo = true; $('demoBtn').classList.add('on'); } }
  setTimeout(() => Speech.say('Zikir halkamıza hoş geldiniz. Ekrana dokunarak beğeni gönderin, yüz beğenide halkaya oturun.', 2), 1500);
};
requestAnimationFrame(frame);
