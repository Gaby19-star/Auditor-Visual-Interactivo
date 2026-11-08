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
  prot: [
    [0.56667, 0.43333, 0.00000],
    [0.55833, 0.44167, 0.00000],
    [0.00000, 0.24167, 0.75833]
  ],
  deut: [
    [0.62500, 0.37500, 0.00000],
    [0.70000, 0.30000, 0.00000],
    [0.00000, 0.30000, 0.70000]
  ],
  trit: [
    [0.95000, 0.05000, 0.00000],
    [0.00000, 0.43333, 0.56667],
    [0.00000, 0.47500, 0.52500]
  ],
  achro: [
    [0.29900, 0.58700, 0.11400],
    [0.29900, 0.58700, 0.11400],
    [0.29900, 0.58700, 0.11400]
  ]
};

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
    for (let i = 0; i < len; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      pixels[i]     = mat[0][0] * r + mat[0][1] * g + mat[0][2] * b;
      pixels[i + 1] = mat[1][0] * r + mat[1][1] * g + mat[1][2] * b;
      pixels[i + 2] = mat[2][0] * r + mat[2][1] * g + mat[2][2] * b;
    }
  }

  offscreenCanvas.width = CW;
  offscreenCanvas.height = CH;
  oCtx.putImageData(imgData, 0, 0);

  aCtx.clearRect(0, 0, CW, CH);
  aCtx.filter = CSS_EFFECTS[currentMode] || 'none';
  aCtx.drawImage(offscreenCanvas, 0, 0);
  aCtx.filter = 'none';

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
  badge.textContent = isPass ? 'Pass' : 'Fail';
  badge.className = 'status-badge ' + (isPass ? 'status-pass' : 'status-fail');
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


const SCRIPTS = {
  news: [
    { time: '0:00 a 0:20', title: 'Titular · ¿Tu web es invisible?', text: 'A cámara con fondo azul #006199 y rótulo animado: «Buenas noches. En Multimedia Noticias: ¿y si la página que diseñaste no la puede leer 1 de cada 12 hombres? Cerca del 8% de los hombres tiene daltonismo y la mayoría de las webs nunca se prueban para ellos».' },
    { time: '0:20 a 1:00', title: 'Reportaje · Pantalla Dividida', text: 'A la izquierda web normal con botón "Eliminar" rojo y "Guardar" verde. A la derecha, con protanopía, ambos botones se ven idénticos. Cierra con texto gris claro sobre fondo blanco (#8A8A8A) que se vuelve ilegible.' },
    { time: '1:00 a 1:40', title: 'Demo · Auditor Visual Interactivo', text: 'Grabación de pantalla del Auditor Visual. Cargas la imagen de ejemplo, eliges protanopía y mueves el slider. Luego cambias a deuteranopía, tritanopía, baja visión y fatiga visual.' },
    { time: '1:40 a 2:10', title: 'Solución · Medidor WCAG 2.1', text: 'Se ve el gris #8A8A8A sobre blanco con 3.45:1 y Fail. Se ajusta a #595959, la barra de la gráfica sube y aparece Pass cumpliendo nivel AAA.' },
    { time: '2:10 a 2:30', title: 'Cierre · Conclusión Inclusiva', text: 'A cámara con el logo del proyecto: «Diseñar con buen contraste y sin depender solo del color no es un detalle: es lograr que la web funcione para todos. Buenas noches».' }
  ],
  doc: [
    { time: '0:00 a 0:30', title: 'Apertura · Ver el mundo distinto', text: 'Planos cerrados de semáforos, frutas, mapas y botones de una app pasando por filtro de protanopía. El daltonismo afecta al 8% de los hombres y a menos del 1% de las mujeres.' },
    { time: '0:30 a 1:45', title: 'Testimonio · Experiencia de Usuario', text: 'Entrevista a persona con daltonismo describiendo confusiones habituales en apps y webs. Muestra de cómo el simulador visualiza lo que el usuario describe.' },
    { time: '1:45 a 2:45', title: 'Experimento · Auditoría de Sitio Real', text: 'Capturas de una página real analizadas con cada filtro, marcando con círculo amarillo #FFD444 los avisos de error y éxito que dejan de distinguirse.' },
    { time: '2:45 a 3:30', title: 'Historia · De Ishihara al W3C', text: 'Línea de tiempo animada: John Dalton (1798), láminas de Shinobu Ishihara (1917) y directrices WCAG del W3C (1999 y 2.1 de 2018) con el umbral 4.5:1.' },
    { time: '3:30 a 4:00', title: 'Cierre · Diseño Responsable', text: '«Ver distinto no es un problema de las personas: es un problema del diseño que no las tuvo en cuenta. Con herramientas como el Auditor Visual, cualquier diseñador puede comprobarlo antes de publicar».' }
  ]
};

const tabNews = $('tabNews');
const tabDoc  = $('tabDoc');
const scriptContainer = $('scriptContent');

function renderScript(type) {
  if (!scriptContainer) return;
  const steps = SCRIPTS[type] || [];
  scriptContainer.innerHTML = steps.map(s => 
    '<div class="step-card">' +
      '<div class="step-time">' + s.time + '</div>' +
      '<div class="step-title">' + s.title + '</div>' +
      '<div class="step-text">' + s.text + '</div>' +
    '</div>'
  ).join('');
}

if (tabNews && tabDoc) {
  tabNews.addEventListener('click', () => {
    tabNews.classList.add('active');
    tabNews.setAttribute('aria-selected', 'true');
    tabDoc.classList.remove('active');
    tabDoc.setAttribute('aria-selected', 'false');
    renderScript('news');
  });

  tabDoc.addEventListener('click', () => {
    tabDoc.classList.add('active');
    tabDoc.setAttribute('aria-selected', 'true');
    tabNews.classList.remove('active');
    tabNews.setAttribute('aria-selected', 'false');
    renderScript('doc');
  });
}

const videoFileInput = $('videoFile');
const videoPlayer    = $('videoPlayer');

if (videoFileInput && videoPlayer) {
  videoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.style.display = 'block';
    videoPlayer.load();
    showToast('Video cargado en el reproductor');
  });
}

function loadDefaultCanvasPlaceholder() {
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

function initApp() {
  calculateContrast();
  renderScript('news');
  loadDefaultCanvasPlaceholder();
  applySplit(50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}