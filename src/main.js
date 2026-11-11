import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import './fonts.css';
import './style.css';
import { works, groups } from './data.js';
import { createScene } from './scene.js';
import { createPilot } from './pilot.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- sigils: one generated mark per work ---------- */
function rng(seed) {
  let a = 0;
  for (const c of seed) a = (Math.imul(a, 31) + c.codePointAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sigil(seed, cls = '') {
  const r = rng(seed);
  const o = Math.floor(r() * 5);
  const k = Math.floor(r() * 4);
  let s = '';
  if (o === 0) s += '<path d="M4 50Q50 8 96 50Q50 92 4 50Z" fill="currentColor"/>';
  if (o === 1) s += '<circle cx="50" cy="50" r="44" fill="currentColor"/>';
  if (o === 2) s += '<path d="M50 4L96 50L50 96L4 50Z" fill="currentColor"/>';
  if (o === 3) s += '<rect x="6" y="22" width="88" height="56" rx="28" fill="currentColor"/>';
  if (o === 4) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const c = Math.cos(a);
      const d = Math.sin(a);
      s += `<line x1="${(50 + c * 31).toFixed(1)}" y1="${(50 + d * 31).toFixed(1)}" x2="${(50 + c * 47).toFixed(1)}" y2="${(50 + d * 47).toFixed(1)}" stroke="currentColor" stroke-width="3"/>`;
    }
    s += '<circle cx="50" cy="50" r="26" fill="currentColor"/>';
  }
  if (k === 0) s += '<circle cx="50" cy="50" r="19" fill="var(--paper)"/>';
  if (k === 1) s += '<circle cx="50" cy="50" r="21" fill="var(--paper)"/><circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" stroke-width="2.5"/>';
  if (k === 2) s += '<circle cx="50" cy="50" r="20" fill="var(--paper)"/><path d="M30 44H70M30 56H70" stroke="currentColor" stroke-width="2.5"/>';
  if (k === 3) s += '<circle cx="50" cy="50" r="21" fill="var(--paper)"/><circle cx="50" cy="50" r="12" fill="currentColor"/>';
  const pr = k === 3 ? 5 : 7.5;
  s += `<g class="pupil"><circle cx="50" cy="50" r="${pr}" fill="var(--red)"/></g>`;
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${s}</svg>`;
}

/* ---------- hero title ---------- */
const DOTS = { R: [34, 33], C: [66, 50], O: [50, 50], P: [40, 33], N: [72, 66] };
const letters = [];
[['.line-a', 'RICK'], ['.line-b', 'ORPHEN']].forEach(([sel, word]) => {
  const line = $(sel);
  [...word].forEach((c, i) => {
    const ch = document.createElement('span');
    ch.className = 'ch';
    ch.textContent = c;
    let dot = null;
    if (DOTS[c] && !(c === 'R' && word === 'ORPHEN')) {
      dot = document.createElement('i');
      dot.style.setProperty('--dx', DOTS[c][0] + '%');
      dot.style.setProperty('--dy', DOTS[c][1] + '%');
      ch.append(dot);
    }
    line.append(ch);
    letters.push({ ch, dot, ph: letters.length * 1.7 + i });
  });
});

/* ---------- works list ---------- */
const OFF = [0.15, 0.7, 0.0, 1.0, 0.35, 0.8, 0.5, 0.05, 0.9, 0.25];
const groupsEl = $('#work-groups');
Object.entries(groups).forEach(([key, g]) => {
  const list = works.filter((w) => w.group === key);
  const sec = document.createElement('section');
  sec.className = 'group';
  sec.setAttribute('aria-labelledby', `g-${key}`);
  sec.innerHTML = `<header class="group-head"><h3 id="g-${key}">${g.label}</h3><p>${g.note}</p><span class="count" aria-label="${list.length} 件">${list.length}</span></header><ul></ul>`;
  const ul = $('ul', sec);
  list.forEach((w) => {
    const i = works.indexOf(w);
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="row" data-id="${w.id}" aria-label="${w.name}、${w.kind}。くわしく見る">
      <span class="row-sigil">${sigil(w.id)}</span>
      <span class="row-name" data-scramble aria-hidden="true" style="--off:${OFF[i % OFF.length]}">${w.name}</span>
      <span class="row-kind" aria-hidden="true">${w.kind}</span>
    </button>`;
    ul.append(li);
  });
  groupsEl.append(sec);
});
const eyesEl = $('.eyes');
eyesEl.innerHTML = Array.from({ length: 8 }, (_, i) => sigil('eye' + i * 7)).join('');

/* ---------- 3D ---------- */
let scene = null;
try {
  scene = createScene($('#gl'), works, { reducedMotion: reduced });
} catch (err) {
  root.classList.add('no-webgl');
}

window.rickEye = scene; // try rickEye.blink() in the console

/* ---------- labels that ride the satellites ---------- */
const labelEls = {};
const labelsEl = $('.labels');
works.forEach((w) => {
  const s = document.createElement('span');
  s.textContent = w.name;
  labelsEl.append(s);
  labelEls[w.id] = s;
});
let zone = 0;
scene?.onLabels((list) => {
  const show = zone < 0.35 && !$('#sheet').open;
  for (const l of list) {
    const el = labelEls[l.id];
    el.style.opacity = show && l.front ? 1 : 0;
    if (show) el.style.transform = `translate(${l.x + 10}px, ${l.y - 5}px)`;
  }
});

/* ---------- 訳わからなさ dial ---------- */
const dial = $('#dial');
const dialOut = $('#dial-out');
const dialState = $('#dial-state');
let n = 0.35;
function setN(v, fromUser = true) {
  n = Math.max(0, Math.min(1, v));
  const pct = Math.round(n * 100);
  root.style.setProperty('--n', n.toFixed(3));
  dialOut.textContent = pct;
  dialState.textContent = pct === 0 ? '正気' : pct < 40 ? 'まだ読める' : pct < 80 ? 'だいぶおかしい' : pct < 100 ? '解読不能' : '操縦士、登場';
  if (!fromUser) dial.value = pct;
  scene?.setNonsense(n);
}
dial.addEventListener('input', () => setN(dial.value / 100));
$('#calm').addEventListener('click', () => setN(0, false));
setN(reduced ? 0 : 0.35, false);

/* ---------- scramble ---------- */
const POOL_JA = 'アカサタナハマヤラワヰヱ〒※◎●○▲▽◆□';
const POOL_EN = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789&?';
const scr = $$('[data-scramble]');
scr.forEach((el) => {
  el.dataset.text = el.textContent;
  const h = el.closest('h2');
  if (h && !h.hasAttribute('aria-label')) h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ''));
  if (h) el.setAttribute('aria-hidden', 'true');
});
const junk = (c) => {
  if (c === ' ' || c === '.' || c === '-') return c;
  const pool = /[ -~]/.test(c) ? POOL_EN : POOL_JA;
  return pool[Math.floor(Math.random() * pool.length)];
};
function decode(el, ms = 650) {
  if (reduced) return;
  const text = el.dataset.text;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now - t0) / ms, 1);
    const keep = Math.floor(p * text.length);
    el.textContent = text.slice(0, keep) + [...text.slice(keep)].map(junk).join('');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = text;
  };
  requestAnimationFrame(step);
}
function glitch(el, count, ms = 240) {
  if (el.dataset.busy) return;
  const text = el.dataset.text;
  const arr = [...text];
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * arr.length);
    arr[k] = junk(arr[k]);
  }
  el.dataset.busy = '1';
  el.textContent = arr.join('');
  setTimeout(() => {
    el.textContent = text;
    delete el.dataset.busy;
  }, ms);
}
const visible = new Set();
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        if (!visible.has(e.target) && e.target.closest('h2')) decode(e.target);
        visible.add(e.target);
      } else visible.delete(e.target);
    }
  },
  { threshold: 0.4 }
);
scr.forEach((el) => io.observe(el));
if (!reduced) {
  setInterval(() => {
    if (document.hidden || $('#sheet').open || !visible.size || Math.random() > n * 0.75) return;
    const pool = [...visible];
    glitch(pool[Math.floor(Math.random() * pool.length)], Math.ceil(n * 4));
  }, 380);
}

/* ---------- work sheet ---------- */
const sheet = $('#sheet');
let current = 0;
function fill(i) {
  current = (i + works.length) % works.length;
  const w = works[current];
  $('#sheet-group').textContent = `${groups[w.group].label} / ${groups[w.group].note}`;
  $('#sheet-name').textContent = w.name;
  $('#sheet-lead').textContent = w.lead;
  $('#sheet-body').textContent = w.body;
  $('#sheet-facts').innerHTML = w.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const act = $('#sheet-actions');
  act.innerHTML = w.url
    ? `<a class="btn" href="${w.url}" target="_blank" rel="noopener">${w.id === 'movie' ? '制作アーカイブを開く' : 'サイトを開く'}</a>`
    : '';
  const vis = $('#sheet-visual');
  if (w.shot) {
    vis.innerHTML = `<a class="shot" href="${w.url}" target="_blank" rel="noopener" aria-label="${w.name} の画面。サイトを開く">
      <img src="/shots/${w.shot}-ht.webp" alt="" />
      <img class="real" src="/shots/${w.shot}.webp" alt="${w.name} の画面" loading="lazy" />
    </a><p class="shot-note">${fine ? '網点にカーソルを乗せると、実際の画面になります。' : '画面を押すと、実際の画面になります。'}</p>`;
    if (!fine) {
      const a = $('.shot', vis);
      a.addEventListener('click', (e) => {
        if (!a.classList.contains('show')) {
          e.preventDefault();
          a.classList.add('show');
        }
      });
    }
  } else if (w.cases) {
    vis.innerHTML = `<span class="big-num" aria-hidden="true">${w.cases.length}</span>`;
  } else {
    vis.innerHTML = sigil(w.id, 'big-sigil');
  }
  $('#sheet-cases').innerHTML = w.cases
    ? `<header class="cases-head"><h3>事例</h3><p>${w.cases.length} 件</p></header>` +
      w.cases
        .map(
          (c) => `<article class="case${c.tall ? ' tall' : ''}">
        <video controls playsinline preload="none" poster="/video/${c.clips[0].src}.jpg" src="/video/${c.clips[0].src}.mp4" aria-label="${c.title}"></video>
        ${
          c.clips.length > 1
            ? `<div class="clips" role="group" aria-label="${c.title} の動画を選ぶ">${c.clips
                .map((k, n) => `<button type="button" data-src="${k.src}" aria-pressed="${n === 0}">${k.label}</button>`)
                .join('')}</div>`
            : ''
        }
        <span class="case-no">${c.no}</span>
        <h4>${c.title}</h4>
        <p class="case-spec">${c.spec}</p>
        <p class="case-note">${c.note}</p>
      </article>`
        )
        .join('')
    : '';
  history.replaceState(null, '', `#${w.id}`);
  sheet.scrollTop = 0;
}
function openSheet(i, ev) {
  if (ev && ev.clientX) {
    sheet.style.setProperty('--ox', `${ev.clientX}px`);
    sheet.style.setProperty('--oy', `${ev.clientY}px`);
  }
  fill(i);
  if (!sheet.open) sheet.showModal();
  thumb.classList.remove('on');
}
// cases: one video plays at a time; clip buttons swap the source
const casesEl = $('#sheet-cases');
const stopVideos = (except) => $$('video', casesEl).forEach((v) => v !== except && v.pause());
casesEl.addEventListener('play', (e) => stopVideos(e.target), true);
casesEl.addEventListener('click', (e) => {
  const b = e.target.closest('.clips button');
  if (!b) return;
  const v = $('video', b.closest('.case'));
  $$('button', b.parentElement).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  v.poster = `/video/${b.dataset.src}.jpg`;
  v.src = `/video/${b.dataset.src}.mp4`;
  v.play().catch(() => {});
});
$('#sheet-close').addEventListener('click', () => sheet.close());
$('#sheet-prev').addEventListener('click', () => fill(current - 1));
$('#sheet-next').addEventListener('click', () => fill(current + 1));
sheet.addEventListener('close', () => {
  stopVideos();
  history.replaceState(null, '', location.pathname);
  $(`.row[data-id="${works[current].id}"]`)?.focus({ preventScroll: true });
});
sheet.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') fill(current + 1);
  if (e.key === 'ArrowLeft') fill(current - 1);
});

/* ---------- rows: hover thumbnail + satellite highlight ---------- */
const thumb = $('.thumb');
const thumbImg = $('img', thumb);
$$('.row').forEach((row) => {
  const i = works.findIndex((w) => w.id === row.dataset.id);
  const w = works[i];
  const on = () => {
    scene?.highlight(w.id);
    if (fine && w.shot) {
      thumbImg.src = `/shots/${w.shot}-ht.webp`;
      thumb.classList.add('on');
    }
  };
  const off = () => {
    scene?.highlight(null);
    thumb.classList.remove('on');
  };
  row.addEventListener('pointerenter', on);
  row.addEventListener('pointerleave', off);
  row.addEventListener('focus', on);
  row.addEventListener('blur', off);
  row.addEventListener('click', (e) => openSheet(i, e));
});

/* ---------- theme flip (the eye) ---------- */
let flipping = false;
function flip() {
  if (flipping) return;
  const next = root.dataset.theme === 'void' ? 'paper' : 'void';
  const apply = () => {
    root.dataset.theme = next;
    $('meta[name=theme-color]').content = next === 'void' ? '#000000' : '#D9DAD6';
    scene?.setTheme(next);
  };
  scene?.blink();
  if (reduced) return apply();
  flipping = true;
  root.classList.add('blink');
  setTimeout(apply, 170);
  setTimeout(() => {
    root.classList.remove('blink');
    flipping = false;
  }, 300);
}
const hint = $('.hero-hint');
hint.addEventListener('click', flip);

/* ---------- pointer ---------- */
const pet = $('.pet');
const P = { x: innerWidth / 2, y: innerHeight / 2, px: innerWidth / 2, py: innerHeight / 2, down: null };
const interactive = (t) => t instanceof Element && t.closest('a, button, input, label, dialog, .bar');
addEventListener('pointermove', (e) => {
  P.x = e.clientX;
  P.y = e.clientY;
  scene?.setPointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (P.down && !P.down.blocked) {
    scene?.spin(e.clientX - P.down.lx);
    P.down.lx = e.clientX;
    P.down.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  }
  if (fine && scene) root.style.cursor = !interactive(e.target) && scene.hitEye(e.clientX, e.clientY) ? 'pointer' : '';
});
addEventListener('pointerdown', (e) => {
  P.down = { x: e.clientX, y: e.clientY, lx: e.clientX, moved: 0, t: performance.now(), blocked: !!interactive(e.target) };
});
addEventListener('pointerup', (e) => {
  const d = P.down;
  P.down = null;
  if (!d || d.blocked || !scene) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8 && performance.now() - d.t < 500 && scene.hitEye(e.clientX, e.clientY)) flip();
});

/* ---------- hero bars: stripes that bend around the eye ---------- */
const bars = $('.bars');
const NB = 9;
const barPaths = Array.from({ length: NB }, () => {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bars.append(p);
  return p;
});
function drawBars(t) {
  const box = bars.getBoundingClientRect();
  if (box.bottom < 0 || !scene) return;
  const tb = title.getBoundingClientRect();
  const e = scene.eyeScreen();
  const ex = e.x - box.left;
  const ey = e.y - box.top;
  const R = e.r * 1.5;
  const top = tb.top - box.top;
  const floor = $('.hero-foot').getBoundingClientRect().top - box.top - 14;
  const period = tb.height / NB;
  const thick = period * 0.4;
  const W = box.width;
  const edge = (y0, i) => {
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const x = (W * k) / 40;
      const dx = (x - ex) / R;
      const dy = (y0 - ey) / R;
      const push = Math.sign(dy || 1) * R * 0.62 * Math.exp(-(dx * dx + dy * dy * 0.7));
      const wave = Math.sin(x * 0.006 + t * 0.8 + i * 0.9) * n * period * 0.45;
      pts.push(`${x.toFixed(1)} ${Math.min(y0 + push + wave, floor - (NB - i) * 3).toFixed(1)}`);
    }
    return pts;
  };
  for (let i = 0; i < NB; i++) {
    const y = top + period * i + (period - thick) / 2;
    const a = edge(y, i);
    const b = edge(y + thick, i).reverse();
    barPaths[i].setAttribute('d', `M${a.join('L')}L${b.join('L')}Z`);
  }
}

/* ---------- the pilot (hand-drawn, appears at 100, stays until the dial drops below 80) ---------- */
const pilot = createPilot();
const ptr = { x: 0, y: 0, px: -999, py: -999, speed: 0 };
let jolt = false;
addEventListener('pointermove', (e) => {
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ptr.speed = ptr.speed * 0.6 + Math.hypot(e.clientX - ptr.px, e.clientY - ptr.py) * 0.4;
  ptr.px = e.clientX;
  ptr.py = e.clientY;
});
dial.addEventListener('input', () => (jolt = true));

/* ---------- telemetry ---------- */
const tPupil = $('#t-pupil');
const tGaze = $('#t-gaze');
const tTime = $('#t-time');
const t0 = performance.now();
const sgn = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2);
function drawTele() {
  if (!scene) return;
  const g = scene.gaze();
  tPupil.textContent = `${(2 + g.pupil * 7).toFixed(1)} mm`;
  tGaze.textContent = `${sgn(g.x)} / ${sgn(g.y)}`;
  const s = Math.floor((performance.now() - t0) / 1000);
  tTime.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------- frame loop ---------- */
const secs = ['.hero', '#works', '#about', '#contact'].map((s) => $(s));
const title = $('.hero-title');
let pupils = [];
const refreshPupils = () => (pupils = $$('.pupil'));
refreshPupils();
new MutationObserver(refreshPupils).observe($('#sheet-visual'), { childList: true });

function zoneNow() {
  const vh = innerHeight;
  let z = 0;
  for (let i = 1; i < secs.length; i++) {
    const top = secs[i].getBoundingClientRect().top;
    const u = Math.max(0, Math.min(1, (vh - top) / vh));
    z = Math.max(z, i - 1 + u * u * (3 - 2 * u));
    if (u < 1) break;
  }
  return z;
}

let tick = 0;
function loop(now) {
  zone = zoneNow();
  scene?.setZone(zone);
  scene?.frame(now);

  const t = now / 1000;
  if (zone < 1 && !reduced) drawBars(t);
  if (tick % 6 === 0) drawTele();
  ptr.speed *= 0.9;
  const out = pilot(now, scene ? scene.seatScreen() : null, ptr, { summon: n >= 0.995 && !reduced, keep: n >= 0.8, hide: sheet.open, jolt: jolt && n < 0.995 });
  jolt = false;
  scene?.setPilot(out);
  // hero letters drift with the dial
  if (!reduced && zone < 1) {
    const fs = parseFloat(getComputedStyle(title).fontSize);
    for (const l of letters) {
      const a = n * fs * 0.075;
      const x = Math.sin(t * 0.7 + l.ph) * a;
      const y = Math.cos(t * 0.55 + l.ph * 1.3) * a;
      const r = Math.sin(t * 0.4 + l.ph * 0.7) * 9 * n * n;
      l.ch.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`;
      if (l.dot) {
        const d = (0.02 + n * 0.3) * fs;
        l.dot.style.transform = `translate(-50%, -50%) translate(${(Math.cos(t * 1.1 + l.ph) * d).toFixed(1)}px, ${(Math.sin(t * 0.9 + l.ph * 2) * d).toFixed(1)}px)`;
      }
    }
  } else {
    for (const l of letters) if (l.dot) l.dot.style.transform = 'translate(-50%, -50%)';
  }

  // every generated mark watches the pointer
  if (++tick % 2 === 0) {
    for (const g of pupils) {
      const svg = g.ownerSVGElement;
      const b = svg.getBoundingClientRect();
      if (b.bottom < 0 || b.top > innerHeight || b.width === 0) continue;
      const dx = P.x - (b.left + b.width / 2);
      const dy = P.y - (b.top + b.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(9, d / 30);
      g.setAttribute('transform', `translate(${((dx / d) * m).toFixed(1)} ${((dy / d) * m).toFixed(1)})`);
    }
  }

  // followers
  P.px += (P.x - P.px) * 0.18;
  P.py += (P.y - P.py) * 0.18;
  if (fine) {
    pet.style.transform = `translate(${P.px.toFixed(1)}px, ${P.py.toFixed(1)}px)`;
    if (thumb.classList.contains('on')) {
      const w = thumb.offsetWidth;
      const h = thumb.offsetHeight;
      const x = Math.min(P.px + 28, innerWidth - w - 12);
      const y = Math.min(Math.max(P.py - h / 2, 70), innerHeight - h - 12);
      thumb.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(-3 + n * 8).toFixed(1)}deg)`;
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- deep link ---------- */
const fromHash = () => {
  const i = works.findIndex((w) => `#${w.id}` === location.hash);
  if (i >= 0) openSheet(i);
};
addEventListener('hashchange', fromHash);
fromHash();
