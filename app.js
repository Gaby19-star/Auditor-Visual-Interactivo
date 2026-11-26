const $ = id => document.getElementById(id);

function showToast(text) {
  const t = $('toastMessage');
  if (!t) return;
  t.textContent = text;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2600);
}


const views = document.querySelectorAll('.clay-section-view');
const dockButtons = document.querySelectorAll('.clay-dock .dock-btn');
const navSwitchButtons = document.querySelectorAll('.nav-switch-btn');

function switchView(targetId) {
  views.forEach(v => {
    if (v.id === targetId) {
      v.classList.add('active');
    } else {
      v.classList.remove('active');
    }
  });

  dockButtons.forEach(btn => {
    if (btn.dataset.target === targetId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

dockButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target) switchView(target);
  });
});

navSwitchButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target) switchView(target);
  });
});


const COLOR_MATRICES = {
  prot: [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
  deut: [[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
  trit: [[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]],
  achro: [[0.299,0.587,0.114],[0.299,0.587,0.114],[0.299,0.587,0.114]]
};
const LINEAR_MODES = { prot: 1, deut: 1, trit: 1 };
const LIN = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
const toSRGB = v => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };

// ---- Sonido sintetizado (Web Audio, sin archivos) ----
let sfxOn = true, actx, lastPass = null;
function tone(f, d = 0.09, type = 'sine', v = 0.06, when = 0) {
  if (!sfxOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
const SFX = {
  click: () => tone(520, 0.07, 'triangle'),
  nav:   () => { tone(392, 0.08); tone(587, 0.12, 'sine', 0.06, 0.07); },
  pass:  () => { tone(523, 0.1); tone(659, 0.1, 'sine', 0.06, 0.09); tone(784, 0.2, 'sine', 0.06, 0.18); },
  fail:  () => { tone(220, 0.18, 'sawtooth', 0.04); tone(165, 0.26, 'sawtooth', 0.04, 0.12); }
};
document.addEventListener('click', e => {
  if (e.target.closest('#sfxToggle, #musicToggle, #mascot')) return;
  if (e.target.closest('.dock-btn')) SFX.nav(); else if (e.target.closest('button')) SFX.click();
});
const sfxBtn = document.getElementById('sfxToggle');
if (sfxBtn) sfxBtn.addEventListener('click', () => {
  sfxOn = !sfxOn;
  sfxBtn.setAttribute('aria-pressed', String(sfxOn));
  sfxBtn.textContent = sfxOn ? '🔊' : '🔇';
  sfxBtn.setAttribute('aria-label', sfxOn ? 'Sonido activado. Pulsa para silenciar' : 'Sonido desactivado. Pulsa para activar');
  SFX.click();
});

// ---- Música de fondo suave (pad sintetizado) ----
let musicOn = true, amb = null, ducked = false;
const AMB_VOL = 0.05;
function ambTarget() { return musicOn && !ducked ? AMB_VOL : 0; }
function fadeAmb(sec) { if (amb) { amb.gain.cancelScheduledValues(actx.currentTime); amb.gain.linearRampToValueAtTime(ambTarget(), actx.currentTime + sec); } }
function startAmbient() {
  if (amb || !musicOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(master);
    [130.81, 196.0, 261.63, 329.63].forEach((f, i) => {
      const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
      const g = actx.createGain(); g.gain.value = 0.25;
      const lfo = actx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.02;
      const lg = actx.createGain(); lg.gain.value = 0.12; lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(lp); o.start(); lfo.start();
    });
    amb = master; fadeAmb(4);
  } catch (e) {}
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, startAmbient, { once: true }));
// al reproducir un video, la música baja sola
document.addEventListener('play', e => { if (e.target.tagName === 'VIDEO') { ducked = true; fadeAmb(0.8); } }, true);
['pause', 'ended'].forEach(ev => document.addEventListener(ev, e => { if (e.target.tagName === 'VIDEO') { ducked = false; fadeAmb(1.5); } }, true));
const musicBtn = document.getElementById('musicToggle');
if (musicBtn) musicBtn.addEventListener('click', () => {
  musicOn = !musicOn;
  musicBtn.setAttribute('aria-pressed', String(musicOn));
  musicBtn.setAttribute('aria-label', musicOn ? 'Música de fondo activada. Pulsa para silenciar' : 'Música de fondo desactivada. Pulsa para activar');
  if (musicOn && !amb) startAmbient(); else fadeAmb(1.2);
});

// ---- Mascota: consejos por sección ----
const TIPS = {
  'view-home': '¿Sabías que cerca de 1 de cada 12 hombres tiene daltonismo? Diseña pensando en todos.',
  'view-simulador': 'Mueve el control para comparar la imagen original con la simulada.',
  'view-wcag': 'Para texto normal, WCAG AA pide un contraste de al menos 4.5:1.',
  'view-guiones': 'Dale play: la música de fondo baja sola mientras ves el video.'
};
const mascot = document.getElementById('mascot'), bubble = document.getElementById('mascotBubble');
let bubbleTimer;
function mascotSay(id) {
  if (!bubble) return;
  bubble.textContent = TIPS[id] || TIPS['view-home'];
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 5500);
}
if (mascot) {
  mascot.addEventListener('click', () => {
    const v = document.querySelector('.clay-section-view.active');
    tone(300, 0.08, 'sine', 0.07); tone(620, 0.14, 'sine', 0.07, 0.06);
    mascot.classList.remove('jump'); void mascot.offsetWidth; mascot.classList.add('jump');
    mascotSay(v && v.id);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.dock-btn');
    if (b) setTimeout(() => mascotSay(b.dataset.target), 350);
  });
  setTimeout(() => mascotSay('view-home'), 1600);
}

// ---- Par de colores bajo cada tipo de daltonismo ----
function simHex(hex, m) {
  const c = [1, 3, 5].map(i => LIN[parseInt(hex.substr(i, 2), 16)]);
  return '#' + m.map(r => Math.round(toSRGB(r[0] * c[0] + r[1] * c[1] + r[2] * c[2])).toString(16).padStart(2, '0')).join('');
}
function renderPairSim() {
  const box = document.getElementById('pairSim');
  if (!box) return;
  const names = { prot: 'Protanopía', deut: 'Deuteranopía', trit: 'Tritanopía' };
  box.innerHTML = Object.keys(names).map(k => {
    const f = simHex(fgColorInput.value, COLOR_MATRICES[k]), g = simHex(bgColorInput.value, COLOR_MATRICES[k]);
    const r = getContrastRatio(f, g);
    return `<div class="pair-cell" style="color:${f};background:${g}">Aa<small>${names[k]} ${r.toFixed(2)}:1 ${r >= 4.5 ? '✓' : '✕'}</small></div>`;
  }).join('');
}

const CSS_EFFECTS = {
  low: 'blur(5px) contrast(0.75) brightness(0.95)',
  fat: 'blur(1.5px) contrast(0.7) brightness(0.9) sepia(0.15)'
};

const CONDITION_LABELS = {
  prot: 'Simulación: Protanopía (Falta conos rojos / L)',
  deut: 'Simulación: Deuteranopía (Falta conos verdes / M)',
  trit: 'Simulación: Tritanopía (Falta conos azules / S)',
  achro: 'Simulación: Acromatopsia (Monocromo)',
  low: 'Simulación: Baja Visión / Pérdida Agudeza',
  fat: 'Simulación: Fatiga Visual / Deslumbramiento'
};

let currentMode = 'prot';
const beforeCanvas = $('before');
const afterCanvas = $('after');
const bCtx = beforeCanvas.getContext('2d');
const aCtx = afterCanvas.getContext('2d');
const conditionTag = $('conditionTag');

const offscreenCanvas = document.createElement('canvas');
const oCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

let activeImage = null;
const CW = 960, CH = 540;

function renderSimulation() {
  if (!activeImage) return;

  const imgData = bCtx.getImageData(0, 0, CW, CH);
  const pixels = imgData.data;

  if (COLOR_MATRICES[currentMode]) {
    const mat = COLOR_MATRICES[currentMode];
    const len = pixels.length;
    const lm = LINEAR_MODES[currentMode];
    for (let i = 0; i < len; i += 4) {
      let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (lm) { r = LIN[r]; g = LIN[g]; b = LIN[b]; }
      let R = mat[0][0] * r + mat[0][1] * g + mat[0][2] * b;
      let G = mat[1][0] * r + mat[1][1] * g + mat[1][2] * b;
      let B = mat[2][0] * r + mat[2][1] * g + mat[2][2] * b;
      if (lm) { R = toSRGB(R); G = toSRGB(G); B = toSRGB(B); }
      pixels[i] = R; pixels[i + 1] = G; pixels[i + 2] = B;
    }
  }

  offscreenCanvas.width = CW;
  offscreenCanvas.height = CH;
  oCtx.putImageData(imgData, 0, 0);

  aCtx.clearRect(0, 0, CW, CH);
  aCtx.filter = CSS_EFFECTS[currentMode] || 'none';
  aCtx.drawImage(offscreenCanvas, 0, 0);
  aCtx.filter = 'none';

  beforeCanvas.setAttribute('role', 'img'); beforeCanvas.setAttribute('aria-label', 'Imagen original');
  afterCanvas.setAttribute('role', 'img'); afterCanvas.setAttribute('aria-label', 'Imagen con simulación: ' + CONDITION_LABELS[currentMode]);
  afterCanvas.classList.remove('swap'); void afterCanvas.offsetWidth; afterCanvas.classList.add('swap');
  if (conditionTag) {
    conditionTag.textContent = CONDITION_LABELS[currentMode];
  }
}

function drawFittedImage(source) {
  beforeCanvas.width = afterCanvas.width = CW;
  beforeCanvas.height = afterCanvas.height = CH;

  bCtx.fillStyle = '#FFFFFF';
  bCtx.fillRect(0, 0, CW, CH);

  const sWidth = source.width || source.videoWidth;
  const sHeight = source.height || source.videoHeight;
  const scale = Math.min(CW / sWidth, CH / sHeight);
  const dWidth = sWidth * scale;
  const dHeight = sHeight * scale;
  const dx = (CW - dWidth) / 2;
  const dy = (CH - dHeight) / 2;

  bCtx.drawImage(source, dx, dy, dWidth, dHeight);
  renderSimulation();
}

const filterButtons = document.querySelectorAll('.filter-options .pill-btn');
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    currentMode = btn.dataset.mode;
    renderSimulation();
  });
});

const fileInput = $('fileInput');
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      activeImage = img;
      drawFittedImage(img);
      URL.revokeObjectURL(img.src);
      showToast('Imagen cargada correctamente');
    };
    img.src = URL.createObjectURL(file);
  });
}


const cmpWrapper = $('cmpWrapper');
const sliderLine = $('sliderLine');
const splitRange = $('splitRange');
const splitPct   = $('splitPct');

let currentSplitPercent = 50;
let isDraggingSlider = false;

function applySplit(percent) {
  percent = Math.max(0, Math.min(100, percent));
  currentSplitPercent = percent;
  afterCanvas.style.clipPath = 'polygon(' + percent + '% 0, 100% 0, 100% 100%, ' + percent + '% 100%)';
  sliderLine.style.left = percent + '%';
  if (splitRange) splitRange.value = percent;
  if (splitPct) splitPct.textContent = Math.round(percent) + '%';
}

function handlePointerCoord(clientX) {
  const rect = cmpWrapper.getBoundingClientRect();
  const percent = ((clientX - rect.left) / rect.width) * 100;
  applySplit(percent);
}

if (splitRange) {
  splitRange.addEventListener('input', (e) => {
    applySplit(parseFloat(e.target.value));
  });
}

cmpWrapper.addEventListener('mousedown', (e) => {
  isDraggingSlider = true;
  handlePointerCoord(e.clientX);
});

window.addEventListener('mousemove', (e) => {
  if (!isDraggingSlider) return;
  handlePointerCoord(e.clientX);
});

window.addEventListener('mouseup', () => {
  isDraggingSlider = false;
});

cmpWrapper.addEventListener('touchstart', (e) => {
  isDraggingSlider = true;
  if (e.touches[0]) handlePointerCoord(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isDraggingSlider || !e.touches[0]) return;
  handlePointerCoord(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchend', () => {
  isDraggingSlider = false;
});


const fgColorInput = $('fgColor');
const fgHexInput   = $('fgHex');
const bgColorInput = $('bgColor');
const bgHexInput   = $('bgHex');

const ratioValEl      = $('ratioVal');
const verdictBadge    = $('verdictBadge');
const previewBox      = $('previewBox');
const mathDetailsEl   = $('mathDetails');
const btnAutoFix      = $('btnAutoFix');

const badgeAANormal   = $('badge-aa-normal');
const badgeAALarge    = $('badge-aa-large');
const badgeAAANormal  = $('badge-aaa-normal');
const badgeAAALarge   = $('badge-aaa-large');

function sRGBtoLinear(val) {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function calculateLuminance(hex) {
  const cleanHex = hex.replace('#', '').padEnd(6, '0');
  const num = parseInt(cleanHex, 16) || 0;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

function getContrastRatio(hex1, hex2) {
  const l1 = calculateLuminance(hex1);
  const l2 = calculateLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

let currentRatio = 3.45;

function renderNativeChart() {
  const canvas = $('nativeChartCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const textColor = 'rgba(255, 255, 255, 0.85)';
  const gridColor = 'rgba(255, 255, 255, 0.12)';

  ctx.clearRect(0, 0, w, h);

  const bars = [
    { label: 'Tu Ratio', val: currentRatio, color: currentRatio >= 4.5 ? '#22C55E' : '#EF4444' },
    { label: 'AA Grande', val: 3.0, color: '#8ACFF8' },
    { label: 'AA Normal', val: 4.5, color: '#FCEEF1' },
    { label: 'AAA Normal', val: 7.0, color: '#FFD444' }
  ];

  const maxVal = 21;
  const chartTop = 24;
  const chartBottom = h - 35;
  const chartHeight = chartBottom - chartTop;
  const barWidth = 62;
  const spacing = (w - (barWidth * bars.length)) / (bars.length + 1);

  [0, 7, 14, 21].forEach(tick => {
    const y = chartBottom - (tick / maxVal) * chartHeight;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(w - 12, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px monospace';
    ctx.fillText(tick + ':1', 2, y + 3);
  });

  bars.forEach((b, idx) => {
    const x = spacing + idx * (barWidth + spacing);
    const clampedVal = Math.min(maxVal, b.val);
    const barH = Math.max(4, (clampedVal / maxVal) * chartHeight);
    const y = chartBottom - barH;
    const r = Math.min(8, barH / 2);

    ctx.fillStyle = b.color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barWidth, barH, [r, r, 0, 0]);
    } else {
      ctx.rect(x, y, barWidth, barH);
    }
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.val.toFixed(2), x + barWidth / 2, y - 7);

    ctx.fillStyle = textColor;
    ctx.font = '700 11px sans-serif';
    ctx.fillText(b.label, x + barWidth / 2, chartBottom + 18);
  });
  ctx.textAlign = 'left';
}

function calculateContrast() {
  const fg = fgColorInput.value;
  const bg = bgColorInput.value;

  const l1 = calculateLuminance(fg);
  const l2 = calculateLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  currentRatio = ratio;

  ratioValEl.textContent = ratio.toFixed(2) + ':1';
  ratioValEl.classList.remove('bump'); void ratioValEl.offsetWidth; ratioValEl.classList.add('bump');
  const okNow = ratio >= 4.5;
  if (lastPass !== null && lastPass !== okNow) SFX[okNow ? 'pass' : 'fail']();
  lastPass = okNow;
  renderPairSim();

  previewBox.style.color = fg;
  previewBox.style.backgroundColor = bg;

  const passAANormal  = ratio >= 4.5;
  const passAALarge   = ratio >= 3.0;
  const passAAANormal = ratio >= 7.0;
  const passAAALarge  = ratio >= 4.5;

  updateBadge(badgeAANormal, passAANormal);
  updateBadge(badgeAALarge, passAALarge);
  updateBadge(badgeAAANormal, passAAANormal);
  updateBadge(badgeAAALarge, passAAALarge);

  const chartVerdict = $('chartVerdict');
  if (passAAANormal) {
    verdictBadge.className = 'status-badge status-pass';
    verdictBadge.innerHTML = '<span>✓ Cumple WCAG AAA</span>';
    ratioValEl.style.color = 'var(--accent-ok)';
    if (chartVerdict) {
      chartVerdict.style.color = 'var(--accent-ok)';
      chartVerdict.textContent = ratio.toFixed(2) + ':1 (Excelente)';
    }
  } else if (passAANormal) {
    verdictBadge.className = 'status-badge status-pass';
    verdictBadge.innerHTML = '<span>✓ Cumple WCAG AA</span>';
    ratioValEl.style.color = 'var(--accent-ok)';
    if (chartVerdict) {
      chartVerdict.style.color = 'var(--accent-ok)';
      chartVerdict.textContent = ratio.toFixed(2) + ':1 (Aprobado)';
    }
  } else if (passAALarge) {
    verdictBadge.className = 'status-badge';
    verdictBadge.style.background = 'rgba(255, 212, 68, 0.2)';
    verdictBadge.style.color = '#B45309';
    verdictBadge.innerHTML = '<span>⚠️ Solo Texto Grande</span>';
    ratioValEl.style.color = '#D97706';
    if (chartVerdict) {
      chartVerdict.style.color = '#D97706';
      chartVerdict.textContent = ratio.toFixed(2) + ':1 (Solo texto grande)';
    }
  } else {
    verdictBadge.className = 'status-badge status-fail';
    verdictBadge.innerHTML = '<span>✕ No cumple AA</span>';
    ratioValEl.style.color = 'var(--accent-fail)';
    if (chartVerdict) {
      chartVerdict.style.color = 'var(--accent-fail)';
      chartVerdict.textContent = ratio.toFixed(2) + ':1 (Insuficiente)';
    }
  }

  mathDetailsEl.innerHTML = 
    'Luminancia Texto (L₁): <b>' + l1.toFixed(4) + '</b><br>' +
    'Luminancia Fondo (L₂): <b>' + l2.toFixed(4) + '</b><br>' +
    'Ratio = (' + lighter.toFixed(4) + ' + 0.05) / (' + darker.toFixed(4) + ' + 0.05) = <b>' + ratio.toFixed(2) + ':1</b><br>' +
    'Fórmula: L = 0.2126·R_lin + 0.7152·G_lin + 0.0722·B_lin';

  renderNativeChart();
}

function updateBadge(badge, isPass) {
  if (!badge) return;
  const s = badge.querySelector('.badge-status');
  if (s) s.textContent = isPass ? '✓' : '✕';
  badge.className = 'status-badge ' + (isPass ? 'status-pass' : 'status-fail');
  void badge.offsetWidth; badge.classList.add('pop');
}

function syncColor(inputColor, inputHex) {
  inputColor.addEventListener('input', () => {
    inputHex.value = inputColor.value.toUpperCase();
    calculateContrast();
  });
  inputHex.addEventListener('input', () => {
    let val = inputHex.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      inputColor.value = val;
      calculateContrast();
    }
  });
}
syncColor(fgColorInput, fgHexInput);
syncColor(bgColorInput, bgHexInput);

btnAutoFix.addEventListener('click', () => {
  let fg = fgColorInput.value;
  const bg = bgColorInput.value;
  const bgLum = calculateLuminance(bg);

  const shouldDarken = bgLum > 0.45;
  let hexNum = parseInt(fg.replace('#', ''), 16) || 0;
  let r = (hexNum >> 16) & 255;
  let g = (hexNum >> 8) & 255;
  let b = hexNum & 255;

  let found = false;
  for (let step = 0; step < 80; step++) {
    if (shouldDarken) {
      r = Math.max(0, r - 4);
      g = Math.max(0, g - 4);
      b = Math.max(0, b - 4);
    } else {
      r = Math.min(255, r + 4);
      g = Math.min(255, g + 4);
      b = Math.min(255, b + 4);
    }
    const candidateHex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    if (getContrastRatio(candidateHex, bg) >= 4.55) {
      fg = candidateHex.toUpperCase();
      found = true;
      break;
    }
  }

  if (found) {
    fgColorInput.value = fg;
    fgHexInput.value = fg;
    calculateContrast();
    showToast('Ajustado a WCAG AA: ' + currentRatio.toFixed(2) + ':1');
  } else {
    showToast('No fue posible alcanzar 4.5:1 con este fondo.');
  }
});


const tabNews = $('tabNews');
const tabDoc  = $('tabDoc');
const panelNews = $('panelNews');
const panelDoc  = $('panelDoc');
const videoNews = $('videoNews');
const videoDoc  = $('videoDoc');

function showVideoTab(which) {
  const isNews = which === 'news';
  tabNews.classList.toggle('active', isNews);
  tabNews.setAttribute('aria-selected', String(isNews));
  tabDoc.classList.toggle('active', !isNews);
  tabDoc.setAttribute('aria-selected', String(!isNews));
  panelNews.classList.toggle('active', isNews);
  panelDoc.classList.toggle('active', !isNews);
  (isNews ? videoDoc : videoNews).pause();
}

if (tabNews && tabDoc) {
  tabNews.addEventListener('click', () => showVideoTab('news'));
  tabDoc.addEventListener('click', () => showVideoTab('doc'));
}

function loadFallbackPlaceholder() {
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, CW, CH);

  ctx.fillStyle = '#8ACFF8';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Sube una imagen o haz clic en "Subir Imagen Propia"', CW / 2, CH / 2 - 20);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '18px sans-serif';
  ctx.fillText('Para evaluar el daltonismo y el contraste en tiempo real', CW / 2, CH / 2 + 25);
  ctx.textAlign = 'left';

  activeImage = c;
  drawFittedImage(c);
}

function loadDefaultImage() {
  const img = new Image();
  img.onload = () => {
    activeImage = img;
    drawFittedImage(img);
  };
  img.onerror = loadFallbackPlaceholder;
  img.src = DEFAULT_IMAGE_SRC;
}

function initApp() {
  calculateContrast();
  loadDefaultImage();
  applySplit(50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}