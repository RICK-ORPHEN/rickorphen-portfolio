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
uniform float uTime; uniform float uAmp; uniform float uSpike; uniform vec3 uEye; uniform vec3 uSeat; uniform float uPilot;
float roDisp(vec3 p){
  float t = uTime;
  float a = ro_snoise(p*1.15 + vec3(0.0, t*0.22, t*0.10)) * 0.62
          + ro_snoise(p*2.4 - vec3(t*0.18, 0.0, t*0.12)) * 0.26;
  float sp = pow(max(ro_snoise(p*3.6 + vec3(t*0.3)), 0.0), 2.5);
  float d = dot(p, uEye);
  float mask = 1.0 - smoothstep(0.66, 0.84, d);
  mask *= 1.0 - smoothstep(0.78, 0.93, dot(p, uSeat)) * uPilot; // a calm patch for the pilot to sit on
  float lid = smoothstep(0.70, 0.80, d) * (1.0 - smoothstep(0.80, 0.86, d));
  return (a * uAmp + sp * uSpike) * mask + lid * 0.05;
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
  [0.0, 0.0, 1.4, 0, 0.0],
  [4.2, -1.95, 0.72, 0, 0.0],
  [-2.7, 0.0, 1.65, 1, 0.1],
  [3.0, 0.75, 0.9, 0, 1.0],
];
const KF_PORT = [
  [0.0, 0.4, 0.7, 0, 0.0],
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
    seat: { value: new THREE.Vector3(0, 0.94, 0.34).normalize() },
    pilot: { value: 0 },
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
    shader.uniforms.uSeat = U.seat;
    shader.uniforms.uPilot = U.pilot;
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

  // a wet, realistic eyeball that sits in a socket of the chrome and rolls to follow the pointer
  const look = new THREE.Group();
  eye.add(look);
  const LIGHT = new THREE.Vector3(-0.45, 0.75, 0.6).normalize();
  const EU = {
    uPupil: { value: 0.34 },
    uTime: U.time,
    uLight: { value: LIGHT },
    uLightObj: { value: new THREE.Vector3(0, 0, 1) },
    uLidUp: { value: new THREE.Vector3(0, 0, -1) },
    uLidLow: { value: new THREE.Vector3(0, 0, -1) },
  };
  const eyeballMat = new THREE.ShaderMaterial({
    uniforms: EU,
    vertexShader: /* glsl */ `
      varying vec3 vObjPos; varying vec3 vObjCam; varying vec3 vWorldN;
      void main(){
        vObjPos = position;
        vObjCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        vWorldN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uPupil; uniform float uTime; uniform vec3 uLight; uniform vec3 uLightObj; uniform vec3 uLidUp; uniform vec3 uLidLow;
      varying vec3 vObjPos; varying vec3 vObjCam; varying vec3 vWorldN;
      const float IRIS = 0.60;
      void main(){
        vec3 N = normalize(vObjPos);
        vec3 V = normalize(vObjCam - vObjPos);
        float ang = acos(clamp(N.y, -1.0, 1.0));
        // the iris lies behind the cornea: refract the view ray and intersect the iris plane
        vec3 rd = refract(-V, N, 1.0 / 1.38);
        float planeY = cos(IRIS) - 0.05;
        float t = (planeY - N.y) / min(rd.y, -0.08);
        vec3 hit = N + rd * t;
        vec2 ic = hit.xz / sin(IRIS);
        float inCornea = smoothstep(IRIS + 0.05, IRIS - 0.04, ang);
        float r = mix(ang / IRIS, length(ic), inCornea);
        vec2 dir = ic / max(length(ic), 1e-4);

        // iris: radial fibres, crypts, an amber collarette and a dark limbal ring
        float f1 = ro_snoise(vec3(dir * 4.0, r * 1.1));
        float f2 = ro_snoise(vec3(dir * 15.0, r * 2.6 + 5.0));
        float f3 = ro_snoise(vec3(dir * 46.0, r * 3.5 + 11.0));
        float fib = f1 * 0.35 + f2 * 0.4 + f3 * 0.3;
        vec3 deep = vec3(0.05, 0.13, 0.24);
        vec3 lightC = vec3(0.46, 0.66, 0.78);
        vec3 iris = mix(deep, lightC, smoothstep(-0.35, 0.55, fib));
        float crypt = smoothstep(0.45, 0.8, ro_snoise(vec3(ic * 5.0, 2.0)));
        iris *= 1.0 - crypt * 0.45 * smoothstep(0.35, 0.6, r) * (1.0 - smoothstep(0.75, 0.95, r));
        float col = smoothstep(uPupil + 0.26, uPupil + 0.02, r);
        iris = mix(iris, vec3(0.70, 0.46, 0.16), col * (0.55 + 0.35 * f2));
        iris *= mix(1.0, 0.16, smoothstep(0.80, 1.0, r));
        float caustic = clamp(dot(dir, -normalize(uLightObj.xz + 1e-4)) * 0.5 + 0.5, 0.0, 1.0);
        iris *= 0.7 + caustic * 0.9;
        float pup = smoothstep(uPupil, uPupil - 0.04, r + f3 * 0.012);
        iris = mix(iris, vec3(0.004), pup);

        // sclera: off-white, pinker and veined toward the back
        vec3 q = N * 3.0;
        float w = ro_snoise(q * 1.3);
        float v1 = pow(1.0 - abs(ro_snoise(q * 2.1 + w * 0.9)), 11.0);
        float v2 = pow(1.0 - abs(ro_snoise(q * 5.2 + w * 1.6 + 7.0)), 14.0);
        float back = smoothstep(IRIS + 0.03, IRIS + 0.45, ang);
        vec3 scl = mix(vec3(0.95, 0.93, 0.90), vec3(0.90, 0.70, 0.66), back * 0.45);
        scl = mix(scl, vec3(0.52, 0.06, 0.05), clamp(v1 * 0.85 + v2 * 0.55, 0.0, 1.0) * (0.2 + back) * 0.9);

        vec3 base = mix(scl, iris, smoothstep(1.04, 0.96, r));
        base *= mix(0.72, 1.0, smoothstep(1.0, 1.12, r) + step(r, 1.0)); // soft shadow ring just outside the limbus

        // lighting: wrapped diffuse, plus occlusion where the chrome lid closes in
        float ndl = dot(normalize(vWorldN), normalize(uLight));
        float diff = 0.38 + 0.72 * pow(clamp(ndl * 0.5 + 0.5, 0.0, 1.0), 1.4);
        float ao = mix(0.22, 1.0, smoothstep(0.54, 0.84, N.y));
        // the lids cast a soft shadow on the eye instead of drawing a hard line
        float shUp = smoothstep(-0.26, 0.02, dot(N, uLidUp));
        float shLow = smoothstep(-0.12, 0.02, dot(N, uLidLow));
        vec3 c = base * diff * ao * (1.0 - 0.6 * shUp * shUp) * (1.0 - 0.3 * shLow);
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
  const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.66, 72, 48), eyeballMat);
  // the wet film: reflections only, added on top
  const wet = new THREE.Mesh(
    new THREE.SphereGeometry(0.664, 72, 48),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.02, metalness: 0, envMapIntensity: 2.6, clearcoat: 1, clearcoatRoughness: 0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
  );
  look.add(eyeball, wet);

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

  // ---------- eyelids: chrome shells hinged at the corners of the eye ----------
  const LID_R = 0.676;
  const lidMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.09, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const lids = new THREE.Group();
  eye.add(lids);
  const makeLid = (upper) => {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(LID_R, 56, 20, 0, Math.PI * 2, upper ? 0 : Math.PI / 2, Math.PI / 2), lidMat);
    // a thin chrome lip rounds off the edge; the dark is left to the shadow on the eye
    shell.add(new THREE.Mesh(new THREE.TorusGeometry(LID_R, 0.009, 8, 56, Math.PI).rotateX(Math.PI / 2), lidMat));
    lids.add(shell);
    return shell;
  };
  const lidUp = makeLid(true);
  const lidLow = makeLid(false);
  const DEG = Math.PI / 180;
  const vRight = new THREE.Vector3();
  const vUp = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  // ---------- the pilot: a small boy who climbs out when the dial hits 100 ----------
  const SEAT = U.seat.value;
  const pilot = new THREE.Group();
  pilot.visible = false;
  eye.add(pilot);
  {
    const pz = new THREE.Vector3(0, 0, 1).addScaledVector(SEAT, -SEAT.z).normalize();
    const px = new THREE.Vector3().crossVectors(SEAT, pz);
    pilot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(px, SEAT, pz));
  }
  const pm = (c, rough = 0.65) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: rough, metalness: 0 });
  const mSkin = pm('#f3dcc6');
  const mSuit = pm(RED, 0.45);
  const mHair = pm('#141414', 0.4);
  const mScarf = pm(COBALT, 0.5);
  const put = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const boy = { body: new THREE.Group(), head: new THREE.Group(), arms: [], legs: [], eyes: [], wave: 0 };
  pilot.add(boy.body);
  put(pilot, new THREE.TorusGeometry(0.2, 0.022, 10, 40), mats.chrome, 0, 0.012, 0).rotation.x = Math.PI / 2; // hatch rim
  put(boy.body, new THREE.CapsuleGeometry(0.105, 0.1, 6, 16), mSuit, 0, 0.21, 0);
  put(boy.body, new THREE.TorusGeometry(0.085, 0.032, 10, 24), mScarf, 0, 0.335, 0).rotation.x = Math.PI / 2;
  boy.tail = put(boy.body, new THREE.BoxGeometry(0.05, 0.17, 0.02).translate(0, -0.085, 0), mScarf, -0.08, 0.34, -0.08);
  boy.head.position.set(0, 0.5, 0);
  boy.body.add(boy.head);
  put(boy.head, new THREE.SphereGeometry(0.17, 32, 24), mSkin, 0, 0, 0);
  put(boy.head, new THREE.SphereGeometry(0.179, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), mHair, 0, 0.008, -0.012).rotation.x = -0.38;
  put(boy.head, new THREE.ConeGeometry(0.03, 0.09, 8), mHair, 0.025, 0.19, -0.01).rotation.z = -0.45;
  for (const sx of [-1, 1]) {
    boy.eyes.push(put(boy.head, new THREE.SphereGeometry(0.023, 12, 12), mHair, sx * 0.062, 0.0, 0.156));
    put(boy.head, new THREE.SphereGeometry(0.03, 12, 12), mSuit, sx * 0.106, -0.052, 0.126).scale.set(1, 0.7, 0.35); // cheeks
    put(boy.head, new THREE.TorusGeometry(0.045, 0.012, 8, 20), mats.chrome, sx * 0.058, 0.108, 0.122).rotation.x = -0.6; // goggles, pushed up
    const arm = new THREE.Group();
    arm.position.set(sx * 0.125, 0.3, 0);
    put(arm, new THREE.CapsuleGeometry(0.035, 0.13, 4, 10), mSuit, 0, -0.09, 0);
    put(arm, new THREE.SphereGeometry(0.042, 12, 12), mSkin, 0, -0.185, 0);
    boy.body.add(arm);
    boy.arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(sx * 0.062, 0.1, 0.04);
    put(leg, new THREE.CapsuleGeometry(0.042, 0.12, 4, 10), mSuit, 0, -0.1, 0);
    put(leg, new THREE.SphereGeometry(0.056, 12, 12), mHair, 0, -0.2, 0.012);
    boy.body.add(leg);
    boy.legs.push(leg);
  }
  put(boy.head, new THREE.TorusGeometry(0.028, 0.006, 6, 14, Math.PI), mHair, 0, -0.056, 0.159).rotation.z = Math.PI; // smile

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
    pupilBase: 0.34,
    sacT: 0,
    nextBlink: 2.5,
    lid: 0,
    lidHold: null,
    again: false,
    pilot: 0,
  };
  const sac = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
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
    // rAF can hand back a timestamp older than `last` after a long first task; never step backwards
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    const n = S.n;
    const speed = reducedMotion ? 0.12 : 0.6 + n * 1.5;
    U.time.value += dt * speed;
    const k = 1 - Math.exp(-dt * 4.5);

    const [kx, ky, ks, kh, kt] = keyframe();
    target.set(kx, ky - 0.45 * S.pilot, 0); // make headroom for the pilot under the top bar
    eye.position.lerp(target, k);
    S.scale = lerp(S.scale, ks, k);
    S.half = lerp(S.half, kh, k);
    S.terr = lerp(S.terr, kt, k);

    // blink: quick close, slower open, now and then a double blink
    S.nextBlink -= dt;
    if (S.nextBlink < 0 && S.blinkT < 0) {
      S.blinkT = 0;
      S.again = !S.again && Math.random() < 0.18;
      S.nextBlink = S.again ? 0.16 : 2.2 + Math.random() * 4.5;
    }
    let shut = 0;
    if (S.blinkT >= 0) {
      S.blinkT += dt / 0.34;
      if (S.blinkT >= 1) S.blinkT = -1;
      else if (S.blinkT < 0.3) shut = Math.pow(S.blinkT / 0.3, 1.8);
      else shut = Math.pow(1 - (S.blinkT - 0.3) / 0.7, 2.4);
    }
    if (S.lidHold !== null) shut = S.lidHold;
    S.lid = shut;
    const prot = 0.47 - shut * 0.025;
    eyeball.position.y = wet.position.y = prot;
    eye.scale.setScalar(S.scale);
    rig.position.copy(eye.position);
    rig.scale.setScalar(S.scale);

    // the eye follows the pointer; with no pointer (touch, or an idle mouse) it looks around on its own
    if (now - S.pointerAt > 3500) S.pointer.set(Math.sin(U.time.value * 0.45) * 0.7, Math.cos(U.time.value * 0.31) * 0.45);
    ray.origin.copy(camera.position);
    ray.direction.set(S.pointer.x, S.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    if (ray.intersectPlane(plane, tmp)) {
      eyeTarget.copy(tmp).sub(eye.position).normalize();
    }
    // micro-saccades
    S.sacT -= dt;
    if (S.sacT < 0) { S.sacT = 0.25 + Math.random() * 1.2; sac.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, 0); }
    if (!reducedMotion) eyeTarget.add(sac).normalize();
    U.eye.value.lerp(eyeTarget, 1 - Math.exp(-dt * 7)).normalize();
    look.quaternion.setFromUnitVectors(UP, U.eye.value);
    // lids ride with the gaze, hinge on a level axis; the upper lid does most of the travel
    vRight.crossVectors(UP, U.eye.value);
    if (vRight.lengthSq() < 1e-4) vRight.set(1, 0, 0);
    vRight.normalize();
    vUp.crossVectors(U.eye.value, vRight);
    lids.quaternion.setFromRotationMatrix(basis.makeBasis(vRight, vUp, U.eye.value));
    lids.position.copy(U.eye.value).multiplyScalar(0.47 - S.lid * 0.025);
    const rest = 44 + U.eye.value.y * 10; // looking down lowers the upper lid a little
    lidUp.rotation.x = -lerp(rest, -15, S.lid) * DEG;
    lidLow.rotation.x = -lerp(-55, -15, Math.min(1, S.lid * 1.05)) * DEG;
    // lid edge planes, expressed in the eyeball's own space, for the shadow
    tmpQ.copy(look.quaternion).invert();
    EU.uLidUp.value.set(0, Math.cos(lidUp.rotation.x), Math.sin(lidUp.rotation.x)).applyQuaternion(lids.quaternion).applyQuaternion(tmpQ);
    EU.uLidLow.value.set(0, -Math.cos(lidLow.rotation.x), -Math.sin(lidLow.rotation.x)).applyQuaternion(lids.quaternion).applyQuaternion(tmpQ);
    EU.uLightObj.value.copy(LIGHT).applyQuaternion(tmpQ.copy(look.quaternion).invert());
    const pupilTo = S.pupilBase + (S.hi ? 0.09 : 0) + Math.sin(U.time.value * 1.9) * 0.012 + (S.blinkT >= 0 ? 0.06 : 0);
    EU.uPupil.value = lerp(EU.uPupil.value, pupilTo, 1 - Math.exp(-dt * 3.5));

    U.amp.value = lerp(U.amp.value, 0.05 + n * 0.42, k);
    U.spike.value = lerp(U.spike.value, Math.max(0, n - 0.45) * 1.5, k);
    blobMat.roughness = 0.05 + Math.max(0, n - 0.8) * 0.3;

    // the pilot
    const pTo = S.n >= 0.995 ? 1 : 0;
    S.pilot += (pTo - S.pilot) * (1 - Math.exp(-dt * (pTo ? 3.2 : 9)));
    U.pilot.value = S.pilot;
    pilot.visible = S.pilot > 0.01;
    if (pilot.visible) {
      const a = S.pilot;
      const tt = now / 1000;
      pilot.scale.setScalar(1.2 * Math.max(0.001, 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2)));
      pilot.position.copy(SEAT).multiplyScalar(1 - (1 - a) * 0.4);
      boy.body.position.y = Math.sin(tt * 2.2) * 0.012;
      boy.body.rotation.z = Math.sin(tt * 1.1) * 0.05;
      boy.head.rotation.y = lerp(boy.head.rotation.y, S.pointer.x * 0.7, k);
      boy.head.rotation.x = lerp(boy.head.rotation.x, -S.pointer.y * 0.35, k);
      boy.head.rotation.z = Math.sin(tt * 0.9) * 0.1;
      boy.legs[0].rotation.x = -1.25 + Math.sin(tt * 3.2) * 0.4;
      boy.legs[1].rotation.x = -1.25 - Math.sin(tt * 3.2) * 0.4;
      boy.wave = lerp(boy.wave, tt % 5.5 < 2 ? 1 : 0, 1 - Math.exp(-dt * 8));
      boy.arms[1].rotation.z = lerp(0.25, 2.5 + Math.sin(tt * 11) * 0.35, boy.wave);
      boy.arms[0].rotation.z = -0.25 - Math.sin(tt * 2.2) * 0.06;
      const bl = tt % 3.7 < 0.12 ? 0.1 : 1;
      boy.eyes[0].scale.y = boy.eyes[1].scale.y = bl;
      boy.tail.rotation.z = 0.5 + Math.sin(tt * 5) * 0.25;
    }

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
    holdLid(v) { S.lidHold = v; },
    onLabels(fn) { S.onLabels = fn; },
    setTheme(theme) {
      ink.set(theme === 'void' ? PAPER : '#000000');
      // materials copy their colour on construction, so update each one
      for (const m of [lineMat, mats.ink]) m.color.copy(ink);
      S.pupilBase = theme === 'void' ? 0.55 : 0.34; // the pupil opens in the dark
    },
    eyeScreen() {
      tmp.copy(eye.position).project(camera);
      const worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return { x: (tmp.x * 0.5 + 0.5) * S.w, y: (-tmp.y * 0.5 + 0.5) * S.h, r: (S.scale * S.h) / worldH };
    },
    pilotScreen() {
      if (S.pilot < 0.6) return null;
      boy.head.getWorldPosition(tmp).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * S.w, y: (-tmp.y * 0.5 + 0.5) * S.h, s: S.scale };
    },
    gaze() { return { x: U.eye.value.x, y: U.eye.value.y, pupil: EU.uPupil.value }; },
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
