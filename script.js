// =========================================================
// Eduvia · script principal + animaciones estilo Apple
// =========================================================

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

// ---------- Resortes (modelo de Apple: response + dampingRatio) ----------
function springConfig(response, dampingRatio) {
  return {
    k: Math.pow((2 * Math.PI) / response, 2),   // rigidez
    c: (4 * Math.PI * dampingRatio) / response  // amortiguación (masa = 1)
  };
}

// Anima varios valores con resorte; siempre parte del valor actual
// y conserva la velocidad, así se puede interrumpir en cualquier momento.
function createSpring(initial, cfg, onFrame, onRest) {
  const cur = { ...initial }, vel = {}, tgt = { ...initial };
  Object.keys(cur).forEach(k => (vel[k] = 0));
  let raf = 0, last = 0;

  function step(t) {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    let moving = false;
    for (const k in cur) {
      for (let i = 0; i < n; i++) {
        const a = -cfg.k * (cur[k] - tgt[k]) - cfg.c * vel[k];
        vel[k] += a * h;
        cur[k] += vel[k] * h;
      }
      if (Math.abs(vel[k]) > 0.0005 || Math.abs(cur[k] - tgt[k]) > 0.0005) moving = true;
      else { cur[k] = tgt[k]; vel[k] = 0; }
    }
    onFrame(cur);
    if (moving) raf = requestAnimationFrame(step);
    else { raf = 0; onRest && onRest(cur, initial); }
  }

  return {
    set(values) {
      Object.assign(tgt, values);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    }
  };
}

// =========================================================
// Funciones originales
// =========================================================

// Header con sombra al hacer scroll
const header = document.querySelector('header');
let scrollGen = 0;
addEventListener('scroll', () => {
  header.classList.toggle('scrolled', scrollY > 10);
  scrollGen++;
}, { passive: true });

// Menú móvil
const menu = document.getElementById('menu');
document.getElementById('burger').addEventListener('click', () => menu.classList.toggle('open'));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

// Enlace activo según la sección visible
const links = [...menu.querySelectorAll('a')];
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['inicio', 'cursos', 'como', 'beneficios', 'testimonios', 'faq'].forEach(id => io.observe(document.getElementById(id)));

// =========================================================
// Revelado al hacer scroll
// =========================================================
const TILT_SEL = '.card, .cat, .course, .t';

function finishReveal(el) {
  if (!el.hasAttribute('data-reveal')) return;
  el.removeAttribute('data-reveal');
  el.classList.remove('is-in');
  el.style.removeProperty('--ev-d');
  if (el.matches(TILT_SEL)) initTilt(el);
}

const revealIO = new IntersectionObserver(entries => {
  // Los que entran juntos se escalonan en orden de lectura
  const visibles = entries
    .filter(e => e.isIntersecting)
    .map(e => e.target)
    .sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (ra.top - rb.top) || (ra.left - rb.left);
    });

  let i = 0;
  visibles.forEach(el => {
    revealIO.unobserve(el);
    if (el.classList.contains('ev-split')) { playSplit(el); return; }
    const delay = Math.min(i++, 7) * (+el.dataset.evStep || 70);
    el.style.setProperty('--ev-d', delay + 'ms');
    el.classList.add('is-in');
    setTimeout(() => finishReveal(el), delay + 1200);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

function reveal(selector, type = 'up', step = 70) {
  document.querySelectorAll(selector).forEach(el => {
    if (el.hasAttribute('data-reveal')) return;
    el.setAttribute('data-reveal', type);
    el.dataset.evStep = step;
    revealIO.observe(el);
  });
}

// Divide un título en palabras que suben desde una máscara
function splitWords(root) {
  root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
  const wrap = content => {
    const w = document.createElement('span');
    w.className = 'ev-w';
    w.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.append(content);
    w.append(inner);
    return w;
  };
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          frag.append(/^\s+$/.test(p) ? document.createTextNode(p) : wrap(p));
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        const cs = getComputedStyle(n);
        // Texto con degradado: se anima como una sola pieza para no romperlo
        if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') {
          const placeholder = document.createComment('');
          n.replaceWith(placeholder);
          placeholder.replaceWith(wrap(n));
        } else walk(n);
      }
    });
  };
  walk(root);
  root.querySelectorAll('.ev-w > span').forEach((s, i) => s.style.setProperty('--i', i));
  root.classList.add('ev-split');
}

// Lanza la animación de un título dividido y, al terminar, quita la máscara
// (así la sombra del texto en los títulos sobre imagen no queda recortada)
function playSplit(el) {
  el.classList.add('is-in');
  const words = el.querySelectorAll('.ev-w').length;
  const base = parseFloat(el.style.getPropertyValue('--base')) || 0;
  setTimeout(() => el.classList.add('ev-done'), base + words * 42 + 1150);
}

const heroTitle = document.querySelector('.hero h1');

if (reduce) {
  // Movimiento reducido: solo fundidos, sin desplazamientos
  reveal('section:not(.hero) h2');
} else {
  if (heroTitle) {
    splitWords(heroTitle);
    heroTitle.style.setProperty('--base', '320ms');
    requestAnimationFrame(() => requestAnimationFrame(() => playSplit(heroTitle)));
  }
  document.querySelectorAll('section:not(.hero) h2').forEach(h => {
    splitWords(h);
    revealIO.observe(h);
  });
}

reveal('.stats .stat', 'up', 90);
reveal('section:not(.hero) .eyebrow, .why .lead, .band .wrap > div > p, .cta1 .wrap p, .final .wrap p, .head > a');
reveal('.cards4 .card', 'up', 90);
reveal('.catgrid .cat', 'up', 55);
reveal('.tabs', 'up');
reveal('.courses .course', 'up', 80);
reveal('.center .btn, .cta1 .btn, .final .btn');
reveal('.pills .pill', 'pop', 60);
reveal('.steps .step', 'up', 110);
reveal('.tgrid .t', 'up', 100);
reveal('.faqgrid .q', 'up', 60);
reveal('footer .fgrid > div, footer .copy', 'up', 60);

// =========================================================
// Inclinación 3D con resorte en tarjetas
// =========================================================
function initTilt(el) {
  if (!finePointer || reduce || el.dataset.evTilt) return;
  el.dataset.evTilt = '1';
  el.classList.add('ev-tilt');
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const glare = document.createElement('span');
  glare.className = 'ev-glare';
  glare.setAttribute('aria-hidden', 'true');
  el.append(glare);

  const max = el.classList.contains('course') ? 4 : 6; // grados
  const rest = { rx: 0, ry: 0, y: 0, s: 1 };
  const spring = createSpring(rest, springConfig(0.35, 1), c => {
    el.style.transform =
      `perspective(1000px) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg) ` +
      `translate3d(0, ${c.y.toFixed(2)}px, 0) scale(${c.s.toFixed(4)})`;
  }, c => {
    if (c.rx === 0 && c.ry === 0 && c.y === 0 && c.s === 1) el.style.transform = '';
  });

  let rect = null, gen = -1, hovering = false;
  const getRect = () => {
    if (!rect || gen !== scrollGen) { rect = el.getBoundingClientRect(); gen = scrollGen; }
    return rect;
  };

  el.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse') return;
    hovering = true;
    rect = null;
    spring.set({ y: -4, s: 1.01 });
    glare.style.opacity = '1';
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = getRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    spring.set({ rx: -ny * 2 * max, ry: nx * 2 * max });
    glare.style.setProperty('--gx', (nx + 0.5) * 100 + '%');
    glare.style.setProperty('--gy', (ny + 0.5) * 100 + '%');
  });
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') spring.set({ s: 0.985, y: -1 }); });
  el.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && hovering) spring.set({ s: 1.01, y: -4 }); });
  el.addEventListener('pointerleave', () => {
    hovering = false;
    spring.set(rest);
    glare.style.opacity = '0';
  });
}
// Tarjetas que no se revelan (por si acaso) también reciben la inclinación
document.querySelectorAll(TILT_SEL).forEach(el => { if (!el.hasAttribute('data-reveal')) initTilt(el); });

// =========================================================
// Botones principales magnéticos
// =========================================================
function initMagnet(btn) {
  if (!finePointer || reduce) return;
  btn.classList.add('ev-mag');
  const rest = { x: 0, y: 0, s: 1 };
  const spring = createSpring(rest, springConfig(0.4, 0.85), c => {
    btn.style.transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) scale(${c.s.toFixed(4)})`;
  }, c => {
    if (c.x === 0 && c.y === 0 && c.s === 1) btn.style.transform = '';
  });
  const busy = () => btn.hasAttribute('data-reveal') || btn.closest('[data-reveal]');

  btn.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || busy()) return;
    const r = btn.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    spring.set({
      x: Math.max(-8, Math.min(8, dx * 0.2)),
      y: Math.max(-6, Math.min(6, dy * 0.3))
    });
  });
  btn.addEventListener('pointerdown', () => { if (!busy()) spring.set({ s: 0.96 }); });
  btn.addEventListener('pointerup', () => spring.set({ s: 1 }));
  btn.addEventListener('pointerleave', () => spring.set(rest));
}
document.querySelectorAll('.hero .btn, .cta1 .btn, .final .btn, .nav-cta .btn-p').forEach(initMagnet);

// =========================================================
// Parallax del fondo + hero que se desvanece al bajar
// =========================================================
if (!reduce) {
  const hero = document.querySelector('.hero');
  const heroWrap = hero && hero.querySelector('.wrap');
  const bgs = [...document.querySelectorAll('.hero-bg, .cta1-bg, .final-bg')];
  const t0 = performance.now();
  const INTRO = 1800; // el fondo del hero "se asienta" al cargar
  let ticking = false;

  const frame = now => {
    ticking = false;
    const vh = innerHeight;
    const p = Math.min(1, (now - t0) / INTRO);
    const introExtra = 0.1 * Math.pow(1 - p, 3);

    bgs.forEach(img => {
      const sec = img.parentElement;
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const prog = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
      const ty = -prog * r.height * 0.045;
      const s = 1.1 + (img.classList.contains('hero-bg') ? introExtra : 0);
      img.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    });

    if (heroWrap) {
      const h = hero.offsetHeight;
      const y = Math.min(Math.max(scrollY, 0), h);
      heroWrap.style.transform = y ? `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)` : '';
      heroWrap.style.opacity = y ? (1 - Math.min(1, y / (h * 0.75))).toFixed(3) : '';
    }
    if (p < 1) request();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  request();
}

// =========================================================
// Pestañas tipo control segmentado + filtro de cursos
// =========================================================
const tabsEl = document.getElementById('tabs');
const tabs = document.querySelectorAll('.tab');
let indicator = null;

function placeIndicator(animate) {
  if (!indicator) return;
  const on = tabsEl.querySelector('.tab.on');
  if (!on) return;
  if (!animate) indicator.style.transition = 'none';
  indicator.style.width = on.offsetWidth + 'px';
  indicator.style.height = on.offsetHeight + 'px';
  indicator.style.transform = `translate3d(${on.offsetLeft}px, ${on.offsetTop}px, 0)`;
  if (!animate) { indicator.offsetWidth; indicator.style.transition = ''; }
}

(function setupIndicator() {
  const on = tabsEl && tabsEl.querySelector('.tab.on');
  if (!on) return;
  // El estilo del indicador (azul, pill, sombra) vive en styles.css → .ev-ind
  indicator = document.createElement('span');
  indicator.className = 'ev-ind';
  indicator.setAttribute('aria-hidden', 'true');
  tabsEl.prepend(indicator);
  tabsEl.classList.add('ev-seg');
  placeIndicator(false);
  addEventListener('resize', () => placeIndicator(false));
  if (document.fonts) document.fonts.ready.then(() => placeIndicator(false));
})();

function filtrar(f) {
  tabs.forEach(t => t.classList.toggle('on', t.dataset.f === f));
  placeIndicator(true);

  const visibles = [];
  document.querySelectorAll('.course').forEach(c => {
    const ocultar = f !== 'all' && c.dataset.c !== f;
    c.classList.toggle('hide', ocultar);
    if (!ocultar) visibles.push(c);
  });

  // Los cursos que quedan entran escalonados
  visibles.forEach((c, i) => {
    revealIO.unobserve(c);
    finishReveal(c);
    c.animate(
      reduce
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.97)', filter: 'blur(6px)' },
           { opacity: 1, transform: 'none', filter: 'none' }],
      { duration: reduce ? 250 : 650, delay: reduce ? 0 : i * 55, easing: EASE_OUT, fill: 'backwards' }
    );
  });
}
tabs.forEach(t => t.addEventListener('click', () => filtrar(t.dataset.f)));
document.querySelectorAll('.cat').forEach(c => c.addEventListener('click', () => {
  const f = c.dataset.f;
  const existe = [...tabs].some(t => t.dataset.f === f);
  filtrar(existe ? f : 'all');
  document.getElementById('cursos').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}));

// =========================================================
// Acordeón de preguntas frecuentes
// =========================================================
document.querySelectorAll('.q').forEach(q => q.querySelector('button').addEventListener('click', () => {
  const open = q.classList.toggle('open');
  q.querySelector('div').style.maxHeight = open ? q.querySelector('div').scrollHeight + 'px' : 0;
}));

// =========================================================
// Contadores animados (con desaceleración, no lineales)
// =========================================================
const fmt = (n, s) => (s === '+' ? n + '+' : '+' + n.toLocaleString('en-US'));
const easeOutExpo = p => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p));
const co = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, end = +el.dataset.n, s = el.dataset.s;
  co.unobserve(el);
  if (reduce) { el.textContent = fmt(end, s); return; }
  const t0 = performance.now(), DUR = 1800;
  (function tick(t) {
    const p = Math.min((t - t0) / DUR, 1);
    el.textContent = fmt(Math.round(end * easeOutExpo(p)), s);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}), { threshold: 0.6 });
document.querySelectorAll('[data-n]').forEach(el => co.observe(el));