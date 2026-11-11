// 操縦士: ダイヤルが 100 になるとハッチから出てくる、手描き線画の男の子。
// 線は SVG、関節は回転、輪郭はノイズで毎コマ少しずつ揺らして手描きの「線のゆらぎ」を出す。
const SVG = `
<svg class="boy" viewBox="-120 -250 240 300" aria-hidden="true" focusable="false">
  <defs>
    <filter id="boy-boil" x="-60%" y="-40%" width="220%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="1" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" />
    </filter>
    <clipPath id="boy-hatch"><rect x="-500" y="-600" width="1000" height="602" /></clipPath>
  </defs>
  <g filter="url(#boy-boil)">
    <path d="M-56 0a56 13 0 0 1 112 0" class="nofill" />
    <g clip-path="url(#boy-hatch)">
      <g data-p="all">
        <g data-p="armL"><path d="M-23 -58C-37 -50 -40 -34 -34 -20" class="nofill" /><circle cx="-34" cy="-17" r="5.5" /></g>
        <path d="M-25 2C-30 -38 -21 -72 0 -72C21 -72 30 -38 25 2Z" />
        <path d="M0 -66V-6M-8 -71L0 -62L8 -71" class="nofill" />
        <path d="M8 -47q5.5 -5 11 0q-5.5 5 -11 0z" class="pen hair" /><circle cx="13.5" cy="-47" r="2" class="hair" /><circle cx="13.5" cy="-47" r="0.9" class="reddot" />
        <g data-p="armR">
          <path d="M23 -58C37 -50 40 -34 34 -20" class="nofill" /><circle cx="34" cy="-17" r="5.5" />
          <g data-p="spy" style="display:none"><path d="M26 -14h20l4 -3v-9l-4 -3h-20zM50 -17h16v-9h-16" /></g>
        </g>
        <g data-p="head">
          <path d="M-42 -110a4 6 0 1 0 0 10M42 -110a4 6 0 1 1 0 10" />
          <ellipse cx="0" cy="-112" rx="42" ry="38" />
          <path d="M-41 -120C-44 -158 44 -158 41 -120" class="nofill" />
          <path d="M-39 -124l5 -13 2 11 6 -17 2 14 7 -19 3 16 7 -18 3 16 7 -17 3 15 7 -14 2 12 6 -10" class="nofill thin" />
          <path d="M-36 -134l4 -9 3 8 5 -12 3 10 6 -13 3 11 6 -12 3 10 6 -11 3 9 5 -8" class="nofill thin" />
          <path d="M-6 -150l-5 -13 9 8 4 -13 4 14 8 -7 -4 12" class="nofill" />
          <g data-p="gog"><path d="M-40 -136L-27 -140M27 -140L40 -136M-5 -142H5" class="nofill" /><circle cx="-16" cy="-142" r="11" /><circle cx="16" cy="-142" r="11" /><path d="M-21 -146l4 -3M11 -146l4 -3" class="nofill thin" /></g>
          <g data-p="face">
            <g data-p="eyes"><circle cx="-9" cy="-112" r="2.3" class="dot" /><circle cx="9" cy="-112" r="2.3" class="dot" data-p="eyeR" /></g>
            <path d="M-13 -112q4 3 8 0M5 -112q4 3 8 0" class="nofill" data-p="shut" style="display:none" />
            <path d="M5 -112q4 3 8 0" class="nofill" data-p="wink" style="display:none" />
            <path d="M0 -106q4 3 0 6" class="nofill" />
            <path d="M-6 -94q6 3 12 0" class="nofill" data-p="smile" />
            <circle cx="0" cy="-93" r="3.6" class="nofill" data-p="oh" style="display:none" />
          </g>
          <g data-p="sweat" style="display:none"><path d="M48 -138q4 7 0 9q-4 -2 0 -9zM57 -118q3 6 0 8q-3 -2 0 -8zM-52 -132q4 7 0 9q-4 -2 0 -9z" class="nofill thin" /></g>
        </g>
        <g data-p="sign" style="display:none">
          <rect x="-98" y="-62" width="196" height="46" rx="2" />
          <text x="0" y="-33" text-anchor="middle" class="signtext">割りのいい仕事をください！</text>
          <path d="M-66 -62v-5q5 -4 10 0v5M56 -62v-5q5 -4 10 0v5" />
        </g>
      </g>
    </g>
    <path d="M-56 0a56 13 0 0 0 112 0" class="nofill" />
    <g data-p="legs" style="display:none">
      <g data-p="legL"><path d="M-15 -4C-18 10 -17 24 -15 36" class="nofill" /><path d="M-24 37c0 -9 17 -9 17 0q4 9 -9 9t-8 -9z" /><path d="M-20 44l5 -8M-15 45l5 -8" class="nofill thin" /></g>
      <g data-p="legR"><path d="M15 -4C18 10 17 24 15 36" class="nofill" /><path d="M7 37c0 -9 17 -9 17 0q4 9 -9 9t-8 -9z" /><path d="M11 44l5 -8M16 45l5 -8" class="nofill thin" /></g>
    </g>
    <g data-p="zzz" style="display:none" class="zzz"><text x="42" y="-160">z</text><text x="54" y="-178">z</text><text x="68" y="-198">Z</text></g>
  </g>
</svg>`;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const outCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
const ACTS = { sign: 3.4, wave: 2.2, spy: 3.0, doze: 3.5, fall: 3.1, goggles: 2.8, bounce: 2.2 };
const WISH = '割りのいい仕事をください！';

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
  let cur = null;
  let last = '';
  let lastFall = -10;
  let smT = 0;
  let sm = {};

  // st: { summon, keep, hide, jolt }  ptr: { x, y (−1…1), px, py, speed }
  return function update(now, seat, ptr, st) {
    const t = now / 1000;
    if (st.summon && !active) { active = true; tOn = t; cur = null; last = ''; sm = {}; }
    if (!st.keep && active) { active = false; tOff = t; }
    const leaving = !active && t - tOff < 0.5;
    const visible = !!seat && !st.hide && (active || leaving);
    el.style.display = visible ? '' : 'none';
    say.classList.remove('on');
    if (!visible) return active;

    // hand-drawn line boil, about 9 drawings a second
    if (now - lastBoil > 110) { lastBoil = now; turb.setAttribute('seed', String((seed = (seed % 6) + 1))); }

    const W = seat.r * 1.65;
    const H = (W * 300) / 240;
    const k = W / 240;
    el.style.width = `${W}px`;
    el.style.height = `${H}px`;
    el.style.transform = `translate(${(seat.x - W / 2).toFixed(1)}px, ${(seat.y - (H * 250) / 300).toFixed(1)}px)`;

    let y = 0, sx = 1, sy = 1, seated = false, lean = 0, slide = 0, text = '';
    let armL = Math.sin(t * 2.2) * 3, armR = 0, head = Math.sin(t * 0.9) * 4, legA = 16, legF = 3.2;
    let lookX = ptr.x * 7, lookY = -ptr.y * 4, shut = false, wink = false, oh = false, eyeS = 1, gog = 0;
    let sweat = false, zzz = false, spy = false, sign = false;

    if (active) {
      const u = t - tOn;
      if (u < 0.75) { y = lerp(200, 96, outCubic(u / 0.3)); lookX = Math.sin(u * 9) * 9; lookY = 0; }
      else if (u < 1.1) { const v = (u - 0.75) / 0.35; y = lerp(96, -26, outCubic(v)); sy = 1.12; sx = 0.92; armL = 150; armR = -150; oh = true; }
      else if (u < 1.32) { const v = (u - 1.1) / 0.22; y = lerp(-26, 0, v * v); armL = 150 * (1 - v); armR = -150 * (1 - v); oh = true; }
      else {
        seated = true;
        const q = clamp((u - 1.32) / 0.22);
        sy = 1 - 0.14 * Math.sin(Math.PI * q); sx = 1 + 0.1 * Math.sin(Math.PI * q);
        y = Math.sin(t * 2.2) * 1.5;
        text = Math.floor(t / 4) % 2 ? 'ここ、ぼくの操縦席。' : WISH;

        // what he does next: a short rest, then a different act each time
        if (!cur || t >= cur.t0 + cur.dur) {
          if (cur && cur.name !== 'rest') cur = { name: 'rest', t0: t, dur: 0.6 + Math.random() * 1.5 };
          else {
            const names = Object.keys(ACTS).filter((n) => n !== last);
            last = last ? names[Math.floor(Math.random() * names.length)] : 'sign';
            cur = { name: last, t0: t, dur: ACTS[last] };
          }
        }
        // a jolt (the dial moved, or the pointer whipped past him) knocks him off balance
        const near = Math.hypot(ptr.px - seat.x, ptr.py - (seat.y - 110 * k)) < W * 0.9;
        if ((st.jolt || (near && ptr.speed > 55)) && cur.name !== 'fall' && t - lastFall > 3.6 && u > 2.2) cur = { name: 'fall', t0: t, dur: ACTS.fall };

        const v = t - cur.t0;
        const e = clamp(v / 0.25) * clamp((cur.dur - v) / 0.25);
        if (cur.name === 'sign') { armL = 62 * e; armR = -62 * e; sign = e > 0.55; text = ''; }
        else if (cur.name === 'wave') { armR = lerp(0, -150 + Math.sin(t * 13) * 20, e); oh = e > 0.5; text = 'やあ！'; }
        else if (cur.name === 'spy') { armR = lerp(0, -118, e); head += ptr.x * 12 * e; lookX = ptr.x * 10; spy = e > 0.6; wink = spy; text = '見えてるよ。'; }
        else if (cur.name === 'goggles') { gog = 38 * e; lookX = Math.sin(v * 3.2) * 12; head = lookX * 0.8; armL = lerp(armL, 150, clamp(v / 0.3) * clamp((0.7 - v) / 0.2)); text = 'よく見える。'; }
        else if (cur.name === 'bounce') { const b = Math.abs(Math.sin(v * 7)); y -= b * 15 * e; sy = 1 + 0.06 * b * e; armL = (125 + Math.sin(v * 14) * 22) * e; armR = -(125 - Math.sin(v * 14) * 22) * e; shut = e > 0.4; legA = 26; legF = 7; text = '♪'; }
        else if (cur.name === 'doze') {
          if (v < 2.7) { const d = clamp(v / 0.9); head = 4 + 14 * d + Math.sin(t * 1.4) * 2; shut = true; zzz = true; legA = 5; legF = 1.2; lookX = 3; lookY = 3; lean = 7 * d; text = '……ねむい。'; }
          else { const w = (v - 2.7) / 0.8; y -= Math.sin(Math.PI * clamp(w * 1.6)) * 20; eyeS = 1.35; oh = true; armL = 60 * (1 - w); armR = -60 * (1 - w); text = 'わっ！'; }
        }
        else if (cur.name === 'fall') {
          lastFall = t;
          if (v < 0.45) { const d = outCubic(v / 0.45); lean = 48 * d; slide = 30 * d; y += 14 * d; text = 'わわっ'; }
          else if (v < 1.7) { lean = 48 + Math.sin(t * 9) * 5; slide = 30; y += 14 + Math.sin(t * 9) * 2; text = 'お、落ちる！'; }
          else if (v < 2.15) { const d = (v - 1.7) / 0.45; lean = lerp(48, -9, outCubic(d)); slide = lerp(30, 0, d); y += 14 * (1 - d); text = 'お、落ちる！'; }
          else { lean = -9 * (1 - clamp((v - 2.15) / 0.25)); }
          if (v < 2.15) { armL = 150 + Math.sin(t * 22) * 55; armR = -150 + Math.cos(t * 22) * 55; legA = 36; legF = 15; eyeS = 1.4; oh = true; sweat = true; }
          else { armL = lerp(0, 132, clamp((v - 2.2) / 0.2) * clamp((cur.dur - v) / 0.2)); shut = true; sweat = v < 2.8; text = 'ふう……。'; }
        }
      }
    } else {
      const v = (t - tOff) / 0.5;
      y = lerp(0, 210, v * v) - Math.sin(Math.PI * clamp(v * 2.4)) * 16;
      armR = -150; oh = true; text = 'またね！';
    }
    if (!shut && eyeS === 1 && t % 3.3 < 0.11) eyeS = 0.15;
    // smooth every joint toward its target so nothing snaps between acts
    const sdt = Math.min(0.05, Math.max(0, t - smT)); smT = t;
    const sk = 1 - Math.exp(-sdt * 16);
    const tg = { y, armL, armR, head, lean, slide, gog, lookX, lookY };
    for (const key in tg) sm[key] = sm[key] === undefined ? tg[key] : sm[key] + (tg[key] - sm[key]) * sk;
    ({ y, armL, armR, head, lean, slide, gog, lookX, lookY } = sm);

    p.all.setAttribute('transform', `rotate(${lean.toFixed(1)}) translate(${slide.toFixed(1)} ${y.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
    p.armL.setAttribute('transform', `rotate(${armL.toFixed(1)} -23 -58)`);
    p.armR.setAttribute('transform', `rotate(${armR.toFixed(1)} 23 -58)`);
    p.head.setAttribute('transform', `rotate(${head.toFixed(1)} 0 -74)`);
    p.face.setAttribute('transform', `translate(${lookX.toFixed(1)} ${lookY.toFixed(1)})`);
    p.gog.setAttribute('transform', `translate(${(lookX * (gog > 1 ? 1 : 0.4)).toFixed(1)} ${(gog - 8 + (gog > 1 ? lookY : 0)).toFixed(1)})`);
    p.eyes.setAttribute('transform', `translate(0 ${(-112 * (1 - eyeS)).toFixed(1)}) scale(1 ${eyeS.toFixed(2)})`);
    show(p.eyes, !shut);
    show(p.eyeR, !wink);
    show(p.wink, wink && !shut);
    show(p.shut, shut);
    show(p.spy, spy);
    show(p.sign, sign);
    show(p.smile, !oh);
    show(p.oh, oh);
    show(p.zzz, zzz);
    show(p.sweat, sweat);
    show(p.legs, seated);
    if (seated) {
      p.legs.setAttribute('transform', `rotate(${(lean * 0.9).toFixed(1)}) translate(${slide.toFixed(1)} ${Math.max(0, y * 0.4).toFixed(1)})`);
      p.legL.setAttribute('transform', `rotate(${(Math.sin(t * legF) * legA).toFixed(1)} -15 -4)`);
      p.legR.setAttribute('transform', `rotate(${(-Math.sin(t * legF + 0.6) * legA).toFixed(1)} 15 -4)`);
    }
    if (zzz) p.zzz.setAttribute('transform', `translate(0 ${(-((t * 14) % 16)).toFixed(1)})`);

    if (text) {
      say.textContent = text;
      say.classList.add('on');
      say.style.transform = `translate(${(seat.x + (56 + slide + lean * 1.4) * k).toFixed(1)}px, ${Math.max(seat.y - 150 * k + y * k, 64).toFixed(1)}px)`;
    }
    return active;
  };
}
