// 操縦士: ダイヤルが 100 になるとハッチから出てくる、手描き線画の男の子。
// 線は SVG、関節は回転、輪郭はノイズで毎コマ少しずつ揺らして手描きの「線のゆらぎ」を出す。
const SVG = `
<svg class="boy" viewBox="-120 -250 240 300" aria-hidden="true" focusable="false">
  <defs>
    <filter id="boy-boil" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="1" seed="1" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" />
    </filter>
    <clipPath id="boy-hatch"><rect x="-120" y="-250" width="240" height="252" /></clipPath>
  </defs>
  <g filter="url(#boy-boil)">
    <path d="M-56 0a56 13 0 0 1 112 0" class="nofill" />
    <g clip-path="url(#boy-hatch)">
      <g data-p="all">
        <g data-p="armL"><path d="M-23 -58C-37 -50 -40 -34 -34 -20" class="nofill" /><circle cx="-34" cy="-17" r="6.5" /></g>
        <path d="M-27 2C-32 -38 -23 -73 0 -73C23 -73 32 -38 27 2Z" />
        <path d="M0 -66V-6M-9 -72L0 -62L9 -72" class="nofill" />
        <path d="M13 -50l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" class="red" />
        <g data-p="armR">
          <path d="M23 -58C37 -50 40 -34 34 -20" class="nofill" /><circle cx="34" cy="-17" r="6.5" />
          <g data-p="spy" style="display:none"><path d="M26 -14h20l4 -3v-9l-4 -3h-20zM50 -17h16v-9h-16" /></g>
        </g>
        <g data-p="head">
          <path d="M-46 -112a5 7 0 1 0 0 12M46 -112a5 7 0 1 1 0 12" />
          <ellipse cx="0" cy="-114" rx="46" ry="41" />
          <path d="M-45 -120C-50 -168 50 -168 45 -120C31 -138 15 -132 5 -141C-8 -131 -29 -139 -45 -120Z" class="ink" />
          <path d="M-8 -157l-7 -15 11 9 5 -15 5 16 10 -8 -5 14" class="ink" />
          <g data-p="gog"><path d="M-44 -140L-30 -144M30 -144L44 -140M-5 -146H5" class="nofill" /><circle cx="-17" cy="-146" r="12.5" /><circle cx="17" cy="-146" r="12.5" /></g>
          <g data-p="face">
            <circle cx="-29" cy="-98" r="7.5" class="cheek" /><circle cx="29" cy="-98" r="7.5" class="cheek" />
            <g data-p="eyes"><ellipse cx="-15" cy="-112" rx="3.8" ry="5.4" class="ink" data-p="eyeL" /><ellipse cx="15" cy="-112" rx="3.8" ry="5.4" class="ink" data-p="eyeR" /></g>
            <path d="M-20 -111q5 4 10 0M10 -111q5 4 10 0" class="nofill" data-p="shut" style="display:none" />
            <path d="M-1 -105q4 3 0 6" class="nofill" />
            <path d="M-10 -93q10 9 20 0" class="nofill" data-p="smile" />
            <ellipse cx="0" cy="-90" rx="6" ry="7.5" class="ink" data-p="oh" style="display:none" />
          </g>
        </g>
      </g>
    </g>
    <path d="M-56 0a56 13 0 0 0 112 0" class="nofill" />
    <g data-p="legs" style="display:none">
      <g data-p="legL"><path d="M-15 -4C-18 10 -17 24 -15 36" class="nofill" /><path d="M-24 37c0 -9 17 -9 17 0q4 9 -9 9t-8 -9z" class="ink" /></g>
      <g data-p="legR"><path d="M15 -4C18 10 17 24 15 36" class="nofill" /><path d="M7 37c0 -9 17 -9 17 0q4 9 -9 9t-8 -9z" class="ink" /></g>
    </g>
    <g data-p="zzz" style="display:none" class="zzz"><text x="46" y="-168">z</text><text x="60" y="-188">z</text><text x="78" y="-212">Z</text></g>
  </g>
</svg>`;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const outCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
const SAY = { idle: 'ここ、ぼくの操縦席。', wave: 'やあ！', spy: '見えてるよ。', sleepy: '……ねむい。', startle: 'わっ！', peek: '', bye: 'またね！' };

export function createPilot() {
  const wrap = document.createElement('div');
  wrap.innerHTML = SVG;
  const el = wrap.firstElementChild;
  document.body.append(el);
  const say = document.createElement('div');
  say.className = 'say';
  say.setAttribute('aria-hidden', 'true');
  document.body.append(say);
  const p = {};
  el.querySelectorAll('[data-p]').forEach((n) => (p[n.dataset.p] = n));
  const turb = el.querySelector('feTurbulence');
  const show = (n, on) => (n.style.display = on ? '' : 'none');
  let active = false;
  let tOn = 0;
  let tOff = -10;
  let seed = 0;
  let lastBoil = 0;

  return function update(now, seat, ptr, wantOn, hide) {
    const t = now / 1000;
    if (wantOn && !active) { active = true; tOn = t; }
    if (!wantOn && active) { active = false; tOff = t; }
    const leaving = !active && t - tOff < 0.5;
    const visible = !!seat && !hide && (active || leaving);
    el.style.display = visible ? '' : 'none';
    say.classList.toggle('on', false);
    if (!visible) return;

    // hand-drawn line boil, about 9 drawings a second
    if (now - lastBoil > 110) { lastBoil = now; turb.setAttribute('seed', String((seed = (seed % 6) + 1))); }

    const W = seat.r * 1.65;
    const H = (W * 300) / 240;
    el.style.width = `${W}px`;
    el.style.height = `${H}px`;
    el.style.transform = `translate(${(seat.x - W / 2).toFixed(1)}px, ${(seat.y - (H * 250) / 300).toFixed(1)}px)`;

    let y = 0, sx = 1, sy = 1, seated = false, act = 'idle';
    let armL = 0, armR = 0, head = Math.sin(t * 0.9) * 4, legA = 16, legF = 3.2;
    let lookX = ptr.x * 7, lookY = -ptr.y * 4, shut = false, oh = false, eyeS = 1, gog = 0;
    if (active) {
      const u = t - tOn;
      if (u < 0.75) { act = 'peek'; y = lerp(200, 96, outCubic(u / 0.3)); lookX = Math.sin(u * 9) * 9; lookY = 0; }
      else if (u < 1.1) { act = 'peek'; const v = (u - 0.75) / 0.35; y = lerp(96, -26, outCubic(v)); sy = 1.12; sx = 0.92; armL = 150; armR = -150; oh = true; }
      else if (u < 1.32) { act = 'peek'; const v = (u - 1.1) / 0.22; y = lerp(-26, 0, v * v); armL = 150 * (1 - v); armR = -150 * (1 - v); oh = true; }
      else {
        seated = true;
        const q = clamp((u - 1.32) / 0.22);
        sy = 1 - 0.14 * Math.sin(Math.PI * q); sx = 1 + 0.1 * Math.sin(Math.PI * q);
        const L = (u - 1.6) % 13.2;
        y = Math.sin(t * 2.2) * 1.5;
        if (L > 2.4 && L < 4.8) { act = 'wave'; const e = clamp((L - 2.4) / 0.25) * clamp((4.8 - L) / 0.25); armR = lerp(0, -150 + Math.sin(t * 13) * 20, e); oh = e > 0.5; }
        else if (L > 5.6 && L < 8.6) { act = 'spy'; const e = clamp((L - 5.6) / 0.35) * clamp((8.6 - L) / 0.3); armR = lerp(0, -118, e); head += ptr.x * 12 * e; lookX = ptr.x * 10; gog = 0; }
        else if (L > 9.3 && L < 11.7) { act = 'sleepy'; const e = clamp((L - 9.3) / 0.9); head = 4 + 13 * e + Math.sin(t * 1.4) * 2; shut = true; legA = 5; legF = 1.2; lookX = 3; lookY = 3; }
        else if (L >= 11.7 && L < 12.4) { act = 'startle'; const v = (L - 11.7) / 0.7; y -= Math.sin(Math.PI * clamp(v * 1.6)) * 20; eyeS = 1.35; oh = true; armL = 60 * (1 - v); armR = -60 * (1 - v); }
      }
    } else {
      act = 'bye';
      const v = (t - tOff) / 0.5;
      y = lerp(0, 210, v * v) - Math.sin(Math.PI * clamp(v * 2.4)) * 16;
      armR = -150; oh = true;
    }
    if (!shut && t % 3.3 < 0.12) eyeS = 0.12;

    p.all.setAttribute('transform', `translate(0 ${y.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
    p.armL.setAttribute('transform', `rotate(${(armL + Math.sin(t * 2.2) * 3).toFixed(1)} -23 -58)`);
    p.armR.setAttribute('transform', `rotate(${armR.toFixed(1)} 23 -58)`);
    p.head.setAttribute('transform', `rotate(${head.toFixed(1)} 0 -74)`);
    p.face.setAttribute('transform', `translate(${lookX.toFixed(1)} ${lookY.toFixed(1)})`);
    p.gog.setAttribute('transform', `translate(${(lookX * 0.4).toFixed(1)} ${gog})`);
    p.eyes.setAttribute('transform', `translate(0 ${(-112 * (1 - eyeS)).toFixed(1)}) scale(1 ${eyeS.toFixed(2)})`);
    show(p.eyes, !shut);
    show(p.shut, shut);
    show(p.eyeR, act !== 'spy');
    show(p.spy, act === 'spy');
    show(p.smile, !oh);
    show(p.oh, oh);
    show(p.zzz, act === 'sleepy');
    show(p.legs, seated);
    if (seated) {
      p.legL.setAttribute('transform', `rotate(${(Math.sin(t * legF) * legA).toFixed(1)} -15 -4)`);
      p.legR.setAttribute('transform', `rotate(${(-Math.sin(t * legF) * legA).toFixed(1)} 15 -4)`);
    }
    if (act === 'sleepy') p.zzz.setAttribute('transform', `translate(0 ${(-((t * 14) % 16)).toFixed(1)})`);

    const text = SAY[act];
    if (text) {
      say.textContent = text;
      say.classList.add('on');
      const k = W / 240;
      say.style.transform = `translate(${(seat.x + 52 * k).toFixed(1)}px, ${Math.max(seat.y - 150 * k + y * k, 64).toFixed(1)}px)`;
    }
  };
}
