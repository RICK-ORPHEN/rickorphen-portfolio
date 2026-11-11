import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PAPER = '#d9dad6';
const RED = '#f0231c';
const COBALT = '#1b2ce0';

// Simplex noise (Ian McEwan / Ashima Arts, MIT), prefixed to avoid clashing with three's chunks.
const NOISE = /* glsl */ `
vec3 ro_mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 ro_mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 ro_permute(vec4 x){return ro_mod289(((x*34.0)+1.0)*x);}
vec4 ro_tis(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float ro_snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
  i = ro_mod289(i);
  vec4 p = ro_permute(ro_permute(ro_permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = ro_tis(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const DISP = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uSpike; uniform vec3 uEye;
float roDisp(vec3 p){
  float t = uTime;
  float a = ro_snoise(p*1.15 + vec3(0.0, t*0.22, t*0.10)) * 0.62
          + ro_snoise(p*2.4 - vec3(t*0.18, 0.0, t*0.12)) * 0.26;
  float sp = pow(max(ro_snoise(p*3.6 + vec3(t*0.3)), 0.0), 2.5);
  float mask = 1.0 - smoothstep(0.72, 0.93, dot(p, uEye));
  return (a * uAmp + sp * uSpike) * mask;
}`;

const HALFTONE = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uHalf: { value: 0 },
    uCell: { value: 8 },
    uInk: { value: new THREE.Color(COBALT) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uHalf; uniform float uCell; uniform vec3 uInk;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (uHalf < 0.001) { gl_FragColor = c; return; }
      vec2 p = vUv * uRes;
      float a = 0.7853981634; float cs = cos(a); float sn = sin(a);
      vec2 q = vec2(p.x*cs + p.y*sn, -p.x*sn + p.y*cs);
      vec2 cell = (floor(q / uCell) + 0.5) * uCell;
      vec2 cp = vec2(cell.x*cs - cell.y*sn, cell.x*sn + cell.y*cs);
      vec4 s = texture2D(tDiffuse, cp / uRes);
      float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114)) / max(s.a, 0.001);
      float ink = s.a * max(1.0 - smoothstep(0.0, 0.85, lum), 0.10);
      float r = sqrt(ink) * uCell * 0.72;
      float d = distance(q, cell);
      float dotA = smoothstep(r + 0.8, r - 0.8, d) * step(0.004, ink);
      vec4 h = vec4(uInk * dotA, dotA);
      gl_FragColor = mix(c, h, uHalf);
    }`,
};

// [x, y, scale, halftone, terrain]
const KF_LAND = [
  [0.0, 0.05, 1.22, 0, 0.0],
  [4.2, -1.95, 0.72, 0, 0.0],
  [-2.7, 0.0, 1.65, 1, 0.1],
  [3.0, 0.75, 0.9, 0, 1.0],
];
const KF_PORT = [
  [0.0, -0.2, 0.74, 0, 0.0],
  [1.05, -2.45, 0.3, 0, 0.0],
  [0.0, -2.0, 0.85, 1, 0.1],
  [0.85, -1.25, 0.36, 0, 1.0],
];

export function createScene(canvas, works, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // A small photo studio for the chrome to reflect: grey walls, white softboxes, black flags.
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x84878a, side: THREE.BackSide })));
  const panel = (w, h, v, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    studio.add(m);
  };
  panel(16, 7, 5, [0, 11, 9]);
  panel(4, 16, 4, [-13, 2, 7]);
  panel(3, 14, 3.5, [13, -1, 5]);
  panel(10, 5, 2.5, [0, 3, -14]);
  panel(20, 9, 0.015, [0, -9, 10]);
  panel(7, 9, 0.015, [8, 6, 12]);
  panel(6, 12, 0.015, [-9, -2, -11]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, 0.02).texture;

  const ink = new THREE.Color('#000000');
  const U = {
    time: { value: 0 },
    amp: { value: 0.12 },
    spike: { value: 0 },
    eye: { value: new THREE.Vector3(0, 0, 1) },
  };

  // ---------- the eye ----------
  const eye = new THREE.Group();
  scene.add(eye);

  const blobMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, envMapIntensity: 1.2 });
  blobMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = U.time;
    shader.uniforms.uAmp = U.amp;
    shader.uniforms.uSpike = U.spike;
    shader.uniforms.uEye = U.eye;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${NOISE}\n${DISP}`)
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 roN = normalize(position);
        vec3 roUp = abs(roN.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 roT1 = normalize(cross(roN, roUp));
        vec3 roT2 = normalize(cross(roN, roT1));
        float roE = 0.012;
        vec3 roP0 = roN * (1.0 + roDisp(roN));
        vec3 roA = normalize(roN + roT1 * roE); roA *= (1.0 + roDisp(roA));
        vec3 roB = normalize(roN + roT2 * roE); roB *= (1.0 + roDisp(roB));
        vec3 objectNormal = normalize(cross(roA - roP0, roB - roP0));
        `
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = roP0;');
  };
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 40), blobMat);
  eye.add(blob);

  // iris / pupil as spherical caps that slide over the surface
  const look = new THREE.Group();
  eye.add(look);
  const cap = (radius, angle, material) => new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 12, 0, Math.PI * 2, 0, angle), material);
  const irisMat = new THREE.MeshBasicMaterial({ color: ink });
  const pupilMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(RED) });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  look.add(cap(1.004, 0.4, irisMat));
  look.add(cap(1.009, 0.15, pupilMat));
  const glint = cap(1.013, 0.045, glintMat);
  glint.rotation.set(0.2, 0, -0.22);
  look.add(glint);

  // ---------- orbits & satellites ----------
  const rig = new THREE.Group();
  scene.add(rig);
  const lineMat = new THREE.LineBasicMaterial({ color: ink });
  const ringOf = (r) => {
    const pts = [];
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  };
  const rings = {
    b2b: Object.assign(ringOf(2.05), { userData: { r: 2.05, speed: 0.11 } }),
    b2c: Object.assign(ringOf(2.8), { userData: { r: 2.8, speed: -0.075 } }),
  };
  rings.b2b.rotation.set(1.22, 0, 0.22);
  rings.b2c.rotation.set(1.38, 0, -0.3);
  rig.add(rings.b2b, rings.b2c);

  const mats = {
    ink: new THREE.MeshBasicMaterial({ color: ink }),
    red: new THREE.MeshStandardMaterial({ color: new THREE.Color(RED), roughness: 0.35, metalness: 0 }),
    cobalt: new THREE.MeshStandardMaterial({ color: new THREE.Color(COBALT), roughness: 0.35, metalness: 0 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 1 }),
  };
  const shapes = [
    () => new THREE.TorusKnotGeometry(0.6, 0.2, 96, 12),
    () => new THREE.OctahedronGeometry(0.95),
    () => new THREE.TorusGeometry(0.65, 0.26, 16, 48),
    () => new THREE.ConeGeometry(0.75, 1.35, 4),
    () => new THREE.BoxGeometry(1.05, 1.05, 1.05),
    () => new THREE.IcosahedronGeometry(0.95, 0),
    () => new THREE.CylinderGeometry(0.5, 0.5, 1.25, 28),
    () => new THREE.TetrahedronGeometry(1.05),
    () => new THREE.CapsuleGeometry(0.42, 0.8, 6, 18),
    () => new THREE.DodecahedronGeometry(0.9),
  ];
  const matOrder = ['chrome', 'ink', 'red', 'ink', 'cobalt', 'chrome', 'ink', 'red', 'cobalt', 'ink'];
  const sats = [];
  const perGroup = { b2b: works.filter((w) => w.group === 'b2b').length, b2c: works.filter((w) => w.group === 'b2c').length };
  const seen = { b2b: 0, b2c: 0 };
  works.forEach((w, i) => {
    const mesh = new THREE.Mesh(shapes[i % shapes.length](), mats[matOrder[i % matOrder.length]]);
    const k = seen[w.group]++;
    mesh.userData = { id: w.id, base: (k / perGroup[w.group]) * Math.PI * 2 + (w.group === 'b2c' ? 0.6 : 0), size: 0.2, grow: 0, i };
    rings[w.group].add(mesh);
    sats.push(mesh);
  });

  // ---------- wireframe ground ----------
  const NX = 64;
  const NZ = 34;
  const X0 = -15;
  const X1 = 15;
  const Z0 = -13;
  const Z1 = 3;
  const tp = [];
  const P = (i, j) => [X0 + ((X1 - X0) * i) / NX, 0, Z0 + ((Z1 - Z0) * j) / NZ];
  for (let j = 0; j <= NZ; j++) for (let i = 0; i < NX; i++) tp.push(...P(i, j), ...P(i + 1, j));
  for (let i = 0; i <= NX; i++) for (let j = 0; j < NZ; j++) tp.push(...P(i, j), ...P(i, j + 1));
  const terrGeo = new THREE.BufferGeometry();
  terrGeo.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  const TU = { uTime: U.time, uAmp: { value: 0.5 }, uOpacity: { value: 0 }, uInk: { value: ink } };
  const terrain = new THREE.LineSegments(
    terrGeo,
    new THREE.ShaderMaterial({
      uniforms: TU,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        ${NOISE}
        uniform float uTime; uniform float uAmp; varying float vFade;
        void main(){
          vec3 p = position;
          float h = ro_snoise(vec3(p.x*0.16, p.z*0.16 + uTime*0.12, uTime*0.05)) + 0.45 * ro_snoise(vec3(p.x*0.42, p.z*0.42 - uTime*0.1, 3.0));
          p.y = -2.7 + h * uAmp;
          vFade = smoothstep(-13.0, -6.0, p.z) * (1.0 - smoothstep(9.0, 15.0, abs(p.x)));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uInk; uniform float uOpacity; varying float vFade;
        void main(){ gl_FragColor = vec4(uInk, uOpacity * vFade); }`,
    })
  );
  terrain.frustumCulled = false;
  scene.add(terrain);

  // ---------- post ----------
  let composer = null;
  let halfPass = null;
  try {
    const rt = new THREE.WebGLRenderTarget(2, 2, { samples: 4, type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    const rp = new RenderPass(scene, camera);
    rp.clearColor = new THREE.Color(0x000000);
    rp.clearAlpha = 0;
    composer.addPass(rp);
    halfPass = new ShaderPass(HALFTONE);
    composer.addPass(halfPass);
    composer.addPass(new OutputPass());
  } catch (e) {
    composer = null;
  }

  // ---------- state ----------
  const S = {
    n: 0.35,
    zone: 0,
    pointer: new THREE.Vector2(0, 0),
    hi: null,
    spin: 0,
    spinVel: 0,
    blinkT: -1,
    w: 1,
    h: 1,
    half: 0,
    terr: 0,
    scale: 1,
    onLabels: null,
    pointerAt: -1e9,
  };
  const target = new THREE.Vector3();
  const eyeTarget = new THREE.Vector3(0, 0, 1);
  const tmp = new THREE.Vector3();
  const ray = new THREE.Ray();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.6);
  const UP = new THREE.Vector3(0, 1, 0);
  const lerp = (a, b, t) => a + (b - a) * t;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    S.w = w;
    S.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      halfPass.uniforms.uRes.value.set(w * pr, h * pr);
      halfPass.uniforms.uCell.value = 7 * pr;
    }
  }

  function keyframe() {
    const aspect = S.w / S.h;
    const port = aspect < 0.82;
    const kf = port ? KF_PORT : KF_LAND;
    const f = port ? 1 : THREE.MathUtils.clamp(aspect / 1.6, 0.62, 1.08);
    const i = Math.min(Math.floor(S.zone), kf.length - 2);
    const t = THREE.MathUtils.clamp(S.zone - i, 0, 1);
    const a = kf[i];
    const b = kf[i + 1];
    return [lerp(a[0], b[0], t) * f, lerp(a[1], b[1], t), lerp(a[2], b[2], t) * (port ? 1 : Math.min(f, 1)), lerp(a[3], b[3], t), lerp(a[4], b[4], t)];
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const n = S.n;
    const speed = reducedMotion ? 0.12 : 0.6 + n * 1.5;
    U.time.value += dt * speed;
    const k = 1 - Math.exp(-dt * 4.5);

    const [kx, ky, ks, kh, kt] = keyframe();
    target.set(kx, ky, 0);
    eye.position.lerp(target, k);
    S.scale = lerp(S.scale, ks, k);
    S.half = lerp(S.half, kh, k);
    S.terr = lerp(S.terr, kt, k);

    // blink squash
    let squash = 1;
    if (S.blinkT >= 0) {
      S.blinkT += dt / 0.38;
      if (S.blinkT >= 1) S.blinkT = -1;
      else squash = 1 - Math.sin(Math.PI * S.blinkT) * 0.93;
    }
    eye.scale.set(S.scale, S.scale * squash, S.scale);
    rig.position.copy(eye.position);
    rig.scale.setScalar(S.scale);

    // the eye follows the pointer; with no pointer (touch, or an idle mouse) it looks around on its own
    if (now - S.pointerAt > 3500) S.pointer.set(Math.sin(U.time.value * 0.45) * 0.7, Math.cos(U.time.value * 0.31) * 0.45);
    ray.origin.copy(camera.position);
    ray.direction.set(S.pointer.x, S.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    if (ray.intersectPlane(plane, tmp)) {
      eyeTarget.copy(tmp).sub(eye.position).normalize();
    }
    U.eye.value.lerp(eyeTarget, 1 - Math.exp(-dt * 7)).normalize();
    look.quaternion.setFromUnitVectors(UP, U.eye.value);

    U.amp.value = lerp(U.amp.value, 0.05 + n * 0.42, k);
    U.spike.value = lerp(U.spike.value, Math.max(0, n - 0.45) * 1.5, k);
    blobMat.roughness = 0.05 + Math.max(0, n - 0.8) * 0.3;

    // orbits
    S.spinVel *= Math.exp(-dt * 2.2);
    S.spin += S.spinVel * dt + dt * 0.05 * speed;
    rig.rotation.y = S.spin;
    rig.rotation.z = Math.sin(U.time.value * 0.21) * 0.08 * (0.3 + n);
    const t = U.time.value;
    for (const m of sats) {
      const ring = m.parent;
      const d = m.userData;
      const a = d.base + t * ring.userData.speed * 2.2;
      const r = ring.userData.r * (1 + 0.22 * n * Math.sin(3 * a + d.i));
      m.position.set(Math.cos(a) * r, Math.sin(a) * r, n * 0.55 * Math.sin(t * 1.3 + d.i * 1.7));
      d.grow = lerp(d.grow, S.hi === d.id ? 1 : 0, 1 - Math.exp(-dt * 9));
      m.scale.setScalar(d.size * (1 + d.grow * 1.9));
      m.rotation.x += dt * (0.5 + d.grow * 3 + n);
      m.rotation.y += dt * (0.7 + d.grow * 3 + n * 0.6);
    }

    TU.uAmp.value = lerp(TU.uAmp.value, 0.22 + n * 1.2, k);
    TU.uOpacity.value = S.terr * 0.9;
    terrain.visible = S.terr > 0.01;

    if (S.onLabels) {
      const out = [];
      for (const m of sats) {
        m.getWorldPosition(tmp);
        const depth = tmp.z - eye.position.z;
        tmp.project(camera);
        out.push({ id: m.userData.id, x: (tmp.x * 0.5 + 0.5) * S.w, y: (-tmp.y * 0.5 + 0.5) * S.h, front: depth > -0.6 * S.scale });
      }
      S.onLabels(out);
    }

    if (composer) {
      halfPass.uniforms.uHalf.value = S.half < 0.004 ? 0 : S.half;
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    frame,
    setNonsense(v) { S.n = v; },
    setZone(v) { S.zone = v; },
    setPointer(x, y) { S.pointer.set(x, y); S.pointerAt = performance.now(); },
    highlight(id) { S.hi = id; },
    spin(dx) { S.spinVel += dx * 0.012; },
    blink() { S.blinkT = 0; },
    onLabels(fn) { S.onLabels = fn; },
    setTheme(theme) {
      ink.set(theme === 'void' ? PAPER : '#000000');
      // materials copy their colour on construction, so update each one
      for (const m of [irisMat, lineMat, mats.ink]) m.color.copy(ink);
      glintMat.color.set(theme === 'void' ? '#000000' : '#ffffff');
    },
    hitEye(cx, cy) {
      tmp.copy(eye.position).project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * S.w;
      const sy = (-tmp.y * 0.5 + 0.5) * S.h;
      const worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const rpx = (S.scale * 1.08 * S.h) / worldH;
      return Math.hypot(cx - sx, cy - sy) < rpx;
    },
  };
}
