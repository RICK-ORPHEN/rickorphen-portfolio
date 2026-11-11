// 履歴書に落書きする操縦士。
// 歩いて行き、背中を向けて、ペン先の位置に合わせて一文字ずつ書く。書き終えたら振り向いて文句を言う。
const SVG = `
<svg class="pen-head cvr" viewBox="-70 -175 140 215" aria-hidden="true" focusable="false">
  <defs>
    <filter id="cvr-boil" x="-40%" y="-30%" width="180%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="1" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
    </filter>
  </defs>
  <g filter="url(#cvr-boil)">
    <g data-r="flip">
      <g data-r="legL"><path d="M-10 10V34" class="nofill" /><path d="M-19 35c0 -8 16 -8 16 0q3 7 -8 7t-8 -7z" /></g>
      <g data-r="legR"><path d="M10 10V34" class="nofill" /><path d="M3 35c0 -8 16 -8 16 0q3 7 -8 7t-8 -7z" /></g>
      <g data-r="upper">
        <g data-r="front">
          <g data-r="armL"><path d="M-20 -58C-34 -50 -37 -34 -31 -20" class="nofill" /><circle cx="-31" cy="-17" r="5.5" /></g>
          <path d="M-22 12C-26 -30 -18 -72 0 -72C18 -72 26 -30 22 12Z" />
          <path d="M0 -66V-6M-8 -71L0 -62L8 -71" class="nofill" />
          <g data-r="armR"><path d="M20 -58C34 -50 37 -34 31 -20" class="nofill" /><circle cx="31" cy="-17" r="5.5" /></g>
          <g data-r="head">
            <path d="M-42 -110a4 6 0 1 0 0 10M42 -110a4 6 0 1 1 0 10" /><ellipse cx="0" cy="-112" rx="42" ry="38" />
            <path d="M-41 -120C-44 -158 44 -158 41 -120" class="nofill" />
            <path d="M-39 -124l5 -13 2 11 6 -17 2 14 7 -19 3 16 7 -18 3 16 7 -17 3 15 7 -14 2 12 6 -10" class="nofill thin" />
            <path d="M-6 -150l-5 -13 9 8 4 -13 4 14 8 -7 -4 12" class="nofill" />
            <path d="M-40 -144L-27 -148M27 -148L40 -144M-5 -150H5" class="nofill" /><circle cx="-16" cy="-150" r="11" /><circle cx="16" cy="-150" r="11" />
            <g data-r="eyes"><circle cx="-9" cy="-112" r="2.3" class="dot" /><circle cx="9" cy="-112" r="2.3" class="dot" /></g>
            <path d="M0 -106q4 3 0 6" class="nofill" /><path d="M-6 -94q6 3 12 0" class="nofill" data-r="mouth" />
          </g>
        </g>
        <g data-r="back" style="display:none">
          <path d="M20 -58C34 -50 37 -34 31 -20" class="nofill" /><circle cx="31" cy="-17" r="5.5" />
          <path d="M-22 12C-26 -30 -18 -72 0 -72C18 -72 26 -30 22 12Z" />
          <path d="M-9 -69q9 6 18 0M0 -40V-8" class="nofill thin" />
          <path d="M-42 -110a4 6 0 1 0 0 10M42 -110a4 6 0 1 1 0 10" /><ellipse cx="0" cy="-112" rx="42" ry="38" />
          <path d="M-41 -102C-47 -160 47 -160 41 -102C28 -90 -28 -90 -41 -102Z" />
          <path d="M-31 -138l-2 38M-21 -146l-1 50M-11 -149l-.5 55M0 -150v57M11 -149l.5 55M21 -146l1 50M31 -138l2 38" class="nofill thin" />
          <path d="M-6 -150l-5 -13 9 8 4 -13 4 14 8 -7 -4 12" class="nofill" />
          <path d="M-42 -128C-20 -119 20 -119 42 -128M-42 -120C-20 -111 20 -111 42 -120" class="nofill" /><rect x="-6" y="-125" width="12" height="9" rx="1.5" />
          <path data-r="warm" d="" class="nofill" /><path data-r="wpen" d="" class="tool" /><circle data-r="whand" cx="0" cy="0" r="5.5" />
        </g>
      </g>
    </g>
  </g>
</svg>`;

const CANCEL = Symbol('cancel');
const lerp = (a, b, t) => a + (b - a) * t;

export function createScribbler(dialog, { reduced = false } = {}) {
  const wrap = dialog.querySelector('.cv-wrap');
  const runner = dialog.querySelector('.cv-runner');
  const bubble = runner.querySelector('.cv-rb');
  runner.insertAdjacentHTML('beforeend', SVG);
  const r = {};
  runner.querySelectorAll('[data-r]').forEach((n) => (r[n.dataset.r] = n));
  const turb = runner.querySelector('feTurbulence');
  const steps = [...dialog.querySelectorAll('.cv-step')];

  // every pen note becomes single letters, so they can appear one by one under the pen tip
  dialog.querySelectorAll('.pen').forEach((pen) => {
    const text = (pen.matches('.cv-row > .pen') ? '↳ ' : '') + pen.textContent;
    pen.textContent = '';
    for (const c of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      pen.append(s);
    }
  });
  const marks = () => ({
    ch: dialog.querySelectorAll('.ch'), s: dialog.querySelectorAll('.cv-step s'), pen: dialog.querySelectorAll('.pen'),
    memo: dialog.querySelectorAll('.cv-memo'), photo: dialog.querySelectorAll('.cv-photo'),
  });
  const setAll = (on) => {
    const m = marks();
    m.ch.forEach((e) => e.classList.toggle('on', on));
    m.s.forEach((e) => e.classList.toggle('struck', on));
    m.pen.forEach((e) => e.classList.toggle('done', on));
    m.memo.forEach((e) => e.classList.toggle('on', on));
    m.photo.forEach((e) => e.classList.toggle('hit', on));
  };

  const S = { x: 0, y: 0, tx: 0, ty: 0, speed: 520, view: 'front', turn: 1, writing: false, gesture: 'idle' };
  const pose = { aL: 0, aR: 0, hd: 0, by: 0 };
  let run = 0, raf = 0, last = 0, seed = 0, lastBoil = 0;
  const K = () => runner.clientWidth / 140;
  const ok = (id) => { if (id !== run) throw CANCEL; };
  const sleep = (ms, id) => new Promise((res) => setTimeout(res, ms)).then(() => ok(id));
  const tween = (fn, ms, id) => new Promise((res) => {
    const t0 = performance.now();
    const f = (now) => { const a = Math.min(1, (now - t0) / ms); fn(a); a < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }).then(() => ok(id));
  const at = (rect, fx = 1, fy = 0.55) => { const w = wrap.getBoundingClientRect(); return { x: rect.left - w.left + rect.width * fx, y: rect.top - w.top + rect.height * fy }; };
  const go = (p, speed = 520) => { S.tx = p.x; S.ty = p.y; S.speed = speed; };
  const arrive = async (id) => { while (Math.hypot(S.tx - S.x, S.ty - S.y) > 1.5) await sleep(30, id); };
  const face = async (v, id) => {
    if (S.view === v) return;
    await tween((a) => (S.turn = 1 - a), 100, id);
    S.view = v;
    await tween((a) => (S.turn = a), 100, id);
  };
  const say = (text) => {
    bubble.textContent = text;
    bubble.classList.toggle('on', !!text);
    bubble.classList.toggle('flip', S.x > wrap.clientWidth * 0.5);
  };

  async function strike(el, id) {
    const rects = [...el.getClientRects()].filter((q) => q.width > 2);
    if (!rects.length) return;
    go(at(rects[0], 0, 0.5));
    await arrive(id);
    await face('back', id);
    await sleep(120, id);
    S.writing = true;
    el.classList.add('struck');
    for (const q of rects) {
      go(at(q, 0, 0.5), 1600);
      await arrive(id);
      go(at(q, 1, 0.5), Math.max(260, q.width / 0.42));
      await arrive(id);
    }
    S.writing = false;
  }
  async function write(pen, cps, id) {
    const chars = [...pen.querySelectorAll('.ch')];
    if (!chars.length) return;
    go(at(chars[0].getBoundingClientRect(), 0));
    await arrive(id);
    await face('back', id);
    await sleep(100, id);
    S.writing = true;
    for (const c of chars) {
      go(at(c.getBoundingClientRect(), 1), 1500);
      c.classList.add('on');
      await sleep(/[、。！？　 ]/.test(c.textContent) ? 2200 / cps : 1000 / cps, id);
    }
    S.writing = false;
    pen.classList.add('done');
  }
  async function paste(p, apply, id) {
    go(p);
    await arrive(id);
    await face('back', id);
    S.gesture = 'paste';
    await sleep(260, id);
    apply();
    await sleep(460, id);
    S.gesture = 'idle';
  }

  async function play(id) {
    const gestures = ['point', 'shrug', 'scratch'];
    let gi = 0;
    await sleep(700, id);
    for (const step of steps) {
      let waited = 0;
      while (step.getBoundingClientRect().top > innerHeight * 0.8) {
        if ((waited += 200) === 1600) say('下へスクロールして。');
        await sleep(200, id);
      }
      say('');
      S.gesture = 'idle';
      if (step.matches('.cv-photo')) await paste(at(step.getBoundingClientRect(), 0.3, 0.45), () => step.classList.add('hit'), id);
      for (const s of step.querySelectorAll('s')) await strike(s, id);
      for (const pen of step.querySelectorAll('.pen')) await write(pen, pen.matches('.cv-wish-text') ? 7 : 26, id);
      const memo = step.querySelector('.cv-memo');
      if (memo) {
        const q = step.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        await paste({ x: q.right - w.left - memo.offsetWidth * 0.7, y: q.top - w.top + memo.offsetTop + 18 }, () => memo.classList.add('on'), id);
        go({ x: S.x - memo.offsetWidth * 0.5 - 60 * K(), y: S.y });
        await arrive(id);
      }
      await face('front', id);
      S.gesture = gestures[gi++ % gestures.length];
      say(step.dataset.say || '');
      await sleep(1200, id);
      S.gesture = 'idle';
    }
    // step out to the margin so the last line stays readable, then beg
    go({ x: wrap.clientWidth - runner.clientWidth - 6, y: S.y });
    await arrive(id);
    say('たのむ。');
    S.gesture = 'cheer';
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const t = now / 1000;
    const dx = S.tx - S.x, dy = S.ty - S.y, d = Math.hypot(dx, dy);
    const stepLen = S.speed * dt;
    if (d <= stepLen) { S.x = S.tx; S.y = S.ty; } else { S.x += (dx / d) * stepLen; S.y += (dy / d) * stepLen; }
    const moving = d > 2 && !S.writing;
    const k = K();
    runner.style.transform = `translate(${(S.x - 2 * k).toFixed(1)}px, ${(S.y - 67 * k).toFixed(1)}px)`;
    if (now - lastBoil > 110) { lastBoil = now; turb.setAttribute('seed', String((seed = (seed % 6) + 1))); }

    const sw = moving ? Math.sin(t * 15) : S.writing ? Math.sin(t * 9) * 0.25 : 0;
    const amp = S.view === 'back' ? 14 : 24;
    r.legL.setAttribute('transform', `rotate(${(sw * amp).toFixed(1)} -10 10)`);
    r.legR.setAttribute('transform', `rotate(${(-sw * amp).toFixed(1)} 10 10)`);
    r.flip.setAttribute('transform', `scale(${Math.max(0.03, S.turn).toFixed(3)} 1)`);
    r.front.style.display = S.view === 'front' ? '' : 'none';
    r.back.style.display = S.view === 'back' ? '' : 'none';

    let aL = sw * 16 + Math.sin(t * 2.4) * 2, aR = sw * 16, hd = Math.sin(t * 1.1) * 2, by = moving ? -Math.abs(Math.sin(t * 15)) * 2.5 : Math.sin(t * 2.4) * 0.8;
    const g = S.gesture;
    if (g === 'point') { aL = 98 + Math.sin(t * 9) * 6; hd = -8; }
    else if (g === 'shrug') { aL = 62; aR = -62; hd = Math.sin(t * 5) * 5; by = -3; }
    else if (g === 'scratch') { aR = -150 + Math.sin(t * 17) * 8; hd = 10; }
    else if (g === 'cheer') { aL = 150 + Math.sin(t * 12) * 14; aR = -150 - Math.sin(t * 12) * 14; by = -Math.abs(Math.sin(t * 6)) * 8; }
    const e = 1 - Math.exp(-dt * 14);
    pose.aL = lerp(pose.aL, aL, e); pose.aR = lerp(pose.aR, aR, e); pose.hd = lerp(pose.hd, hd, e); pose.by = lerp(pose.by, by, e);
    r.upper.setAttribute('transform', `translate(0 ${pose.by.toFixed(1)})`);
    if (S.view === 'front') {
      r.armL.setAttribute('transform', `rotate(${pose.aL.toFixed(1)} -20 -58)`);
      r.armR.setAttribute('transform', `rotate(${pose.aR.toFixed(1)} 20 -58)`);
      r.head.setAttribute('transform', `rotate(${pose.hd.toFixed(1)} 0 -74)`);
      const bl = t % 3.1 < 0.11 ? 0.15 : 1;
      r.eyes.setAttribute('transform', `translate(0 ${(-112 * (1 - bl)).toFixed(1)}) scale(1 ${bl})`);
    } else {
      // the writing arm: shoulder → elbow → hand, with the pen running on to the tip
      let hx = -58, hy = -96 - pose.by;
      if (S.writing) { hx += Math.sin(t * 31) * 2.6; hy += Math.cos(t * 23) * 3.4; }
      if (g === 'paste') { hx = -50 + Math.sin(t * 28) * 2; hy = -106 + Math.abs(Math.sin(t * 14)) * 6; }
      r.warm.setAttribute('d', `M-20 -58Q${(-50 + (hx + 58) * 0.4).toFixed(1)} ${(-50 + (hy + 96) * 0.3).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`);
      r.whand.setAttribute('cx', hx.toFixed(1));
      r.whand.setAttribute('cy', hy.toFixed(1));
      r.wpen.setAttribute('d', g === 'paste' ? '' : `M${(hx + 5).toFixed(1)} ${(hy + 6).toFixed(1)}L${(hx - 10).toFixed(1)} ${(hy - 12).toFixed(1)}`);
    }
  }

  function stop() {
    run++;
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function start() {
    stop();
    say('');
    Object.assign(S, { view: 'front', turn: 1, writing: false, gesture: 'idle' });
    S.x = S.tx = wrap.clientWidth - runner.clientWidth - 8;
    S.y = S.ty = 150;
    if (reduced) { setAll(true); frame(performance.now()); cancelAnimationFrame(raf); return; }
    setAll(false);
    const id = ++run;
    last = performance.now();
    raf = requestAnimationFrame(frame);
    play(id).catch((err) => { if (err !== CANCEL) throw err; });
  }
  return { start, stop };
}
