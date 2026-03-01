/**
 * FotoNatura — Logika UI / Renderer Process
 */
(function () {

  // ===== STAN =====
  let originalImageData = null;
  let processedImageData = null;
  let currentProfile = 'natural';
  let currentIntensity = 65;
  let currentBrightness = 0;
  let currentLevels = { inBlack: 0, inWhite: 255, gamma: 0 };
  let cropHistory = []; // stos: każdy wpis to {imageData, w, h} przed zastosowaniem kadru
  let compareMode = false;
  let compareX = 0.5;
  let isDraggingCompare = false;

  // Tekst — pozycja jako znormalizowane 0..1 względem obrazu
  let txt = { text: '', fontSize: 36, color: '#ffffff', nx: 0.5, ny: 0.88, font: 'Segoe UI' };

  // Drag tekstu
  let tDrag = { on: false, type: null, mx0: 0, my0: 0, nx0: 0, ny0: 0, fs0: 0 };

  // Kadrowanie — cropRect w pikselach oryginalnego obrazu
  let cropMode = false;
  let cropRect = { x1: 0, y1: 0, x2: 0, y2: 0 };
  let cDrag = { on: false, type: null, mx0: 0, my0: 0, r0: null };

  // ===== DOM =====
  const dropZone     = document.getElementById('dropZone');
  const dropHint     = document.getElementById('dropHint');
  const canvasWrap   = document.getElementById('canvasWrapper');
  const cvResult     = document.getElementById('canvasResult');
  const cvOriginal   = document.getElementById('canvasOriginal');
  const cvOverlay    = document.getElementById('canvasOverlay');
  const compareLine  = document.getElementById('compareLine');
  const procOverlay  = document.getElementById('processingOverlay');
  const statusBar    = document.getElementById('statusBar');
  const ctrlSection  = document.getElementById('controlsSection');
  const textSection  = document.getElementById('textSection');
  const actSection   = document.getElementById('actionSection');
  const cropBar      = document.getElementById('cropBar');
  const cropInfo     = document.getElementById('cropInfo');
  const btnOpen      = document.getElementById('btnOpen');
  const btnSave      = document.getElementById('btnSave');
  const btnReset     = document.getElementById('btnReset');
  const btnCrop      = document.getElementById('btnCrop');
  const btnApplyCrop = document.getElementById('btnApplyCrop');
  const btnCancelCrop= document.getElementById('btnCancelCrop');
  const btnClearText   = document.getElementById('btnClearText');
  const presetsSection = document.getElementById('presetsSection');
  const presetsList    = document.getElementById('presetsList');
  const presetNameInput= document.getElementById('presetNameInput');
  const btnSavePreset  = document.getElementById('btnSavePreset');
  const slider           = document.getElementById('intensitySlider');
  const sliderVal        = document.getElementById('intensityValue');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessVal    = document.getElementById('brightnessValue');
  const btnSavePDF       = document.getElementById('btnSavePDF');
  const levelsBlack      = document.getElementById('levelsBlack');
  const levelsWhite      = document.getElementById('levelsWhite');
  const levelsGamma      = document.getElementById('levelsGamma');
  const levelsBlackVal   = document.getElementById('levelsBlackVal');
  const levelsWhiteVal   = document.getElementById('levelsWhiteVal');
  const levelsGammaVal   = document.getElementById('levelsGammaVal');
  const btnResetLevels   = document.getElementById('btnResetLevels');
  const btnUndoCrop      = document.getElementById('btnUndoCrop');
  const btnAutoCorrect   = document.getElementById('btnAutoCorrect');
  const btnClose         = document.getElementById('btnClose');
  const histCanvas       = document.getElementById('histogramCanvas');
  const histCtx          = histCanvas.getContext('2d');
  let   histData         = null; // { r, g, b, lum } — znormalizowane log-wartości
  const compareToggle= document.getElementById('compareToggle');
  const themeToggle  = document.getElementById('themeToggle');
  const themeIcon    = document.getElementById('themeIcon');
  const profileBtns  = document.querySelectorAll('.profile-btn');
  const textInput    = document.getElementById('textInput');
  const sizeBtns     = document.querySelectorAll('.size-btn');
  const colorBtns    = document.querySelectorAll('.color-btn');
  const posBtns      = document.querySelectorAll('.pos-btn');
  const fontBtns     = document.querySelectorAll('.font-btn');

  const ctx    = cvResult.getContext('2d',   { willReadFrequently: true });
  const ctxOri = cvOriginal.getContext('2d', { willReadFrequently: true });
  const ctxOvl = cvOverlay.getContext('2d');

  // ===== MOTYW =====
  function applyTheme(dark) {
    document.body.classList.toggle('dark', dark);
    themeIcon.textContent = dark ? '☀️' : '🌙';
    localStorage.setItem('fn-theme', dark ? 'dark' : 'light');
  }
  themeToggle.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark')));
  applyTheme(localStorage.getItem('fn-theme') === 'dark');

  // ===== STATUS =====
  function setStatus(msg) { statusBar.textContent = msg; }

  // ===== HISTOGRAM =====
  function buildHistogram(imageData) {
    const d = imageData.data;
    const r   = new Float32Array(256);
    const g   = new Float32Array(256);
    const b   = new Float32Array(256);
    const lum = new Float32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      r[d[i]]++;
      g[d[i + 1]]++;
      b[d[i + 2]]++;
      lum[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }
    // Skala logarytmiczna — spłaszcza dominujące piki
    let maxRaw = 1;
    for (let i = 0; i < 256; i++) {
      if (r[i] > maxRaw) maxRaw = r[i];
      if (g[i] > maxRaw) maxRaw = g[i];
      if (b[i] > maxRaw) maxRaw = b[i];
    }
    const scale = 1 / Math.log1p(maxRaw);
    histData = {
      r:   r.map(v => Math.log1p(v) * scale),
      g:   g.map(v => Math.log1p(v) * scale),
      b:   b.map(v => Math.log1p(v) * scale),
      lum: lum.map(v => Math.log1p(v) * scale),
    };
    drawHistogram();
  }

  function drawHistogram() {
    const w = histCanvas.width, h = histCanvas.height;
    histCtx.clearRect(0, 0, w, h);
    histCtx.fillStyle = '#111';
    histCtx.fillRect(0, 0, w, h);

    if (!histData) return;

    // Pomocnicza funkcja rysowania kanału jako wypełniony area-chart
    function drawCh(vals, color) {
      histCtx.beginPath();
      histCtx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        histCtx.lineTo(i, h - vals[i] * (h - 2));
      }
      histCtx.lineTo(255, h);
      histCtx.closePath();
      histCtx.fillStyle = color;
      histCtx.fill();
    }

    drawCh(histData.r,   'rgba(255,60,60,0.40)');
    drawCh(histData.g,   'rgba(50,200,50,0.40)');
    drawCh(histData.b,   'rgba(60,120,255,0.40)');
    drawCh(histData.lum, 'rgba(210,210,210,0.55)');

    // Strefy clippingu
    const bx = currentLevels.inBlack;
    const wx = currentLevels.inWhite;
    if (bx > 0) {
      histCtx.fillStyle = 'rgba(180,0,0,0.38)';
      histCtx.fillRect(0, 0, bx, h);
    }
    if (wx < 255) {
      histCtx.fillStyle = 'rgba(0,60,200,0.38)';
      histCtx.fillRect(wx, 0, 256 - wx, h);
    }

    // Linia czarnego punktu
    histCtx.strokeStyle = '#ff7755';
    histCtx.lineWidth = 1.5;
    histCtx.beginPath();
    histCtx.moveTo(bx, 0); histCtx.lineTo(bx, h);
    histCtx.stroke();

    // Linia białego punktu
    histCtx.strokeStyle = '#88aaff';
    histCtx.lineWidth = 1.5;
    histCtx.beginPath();
    histCtx.moveTo(wx, 0); histCtx.lineTo(wx, h);
    histCtx.stroke();

    // Marker gamma (półcienie) — przerywana żółta linia
    const gamma = Math.pow(2, currentLevels.gamma / 50);
    const gammaX = bx + (wx - bx) * Math.pow(0.5, gamma);
    histCtx.strokeStyle = 'rgba(255,218,40,0.85)';
    histCtx.lineWidth = 1;
    histCtx.setLineDash([3, 3]);
    histCtx.beginPath();
    histCtx.moveTo(gammaX, 0); histCtx.lineTo(gammaX, h);
    histCtx.stroke();
    histCtx.setLineDash([]);
  }

  // ===== OVERLAY — synchronizacja pozycji/rozmiaru z cvResult =====
  function syncOverlay() {
    const wr = canvasWrap.getBoundingClientRect();
    const cr = cvResult.getBoundingClientRect();
    const left = cr.left - wr.left;
    const top  = cr.top  - wr.top;
    const w = Math.round(cr.width);
    const h = Math.round(cr.height);
    cvOverlay.style.left   = left + 'px';
    cvOverlay.style.top    = top  + 'px';
    cvOverlay.style.width  = w + 'px';
    cvOverlay.style.height = h + 'px';
    if (cvOverlay.width  !== w) cvOverlay.width  = w;
    if (cvOverlay.height !== h) cvOverlay.height = h;
  }

  // Przeliczenie pozycji myszy → współrzędne w overlayCanvas
  function overlayPos(e) {
    const r = cvOverlay.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const sx = cvResult.width  / cvOverlay.width;
    const sy = cvResult.height / cvOverlay.height;
    return { dx, dy, ix: dx * sx, iy: dy * sy };
  }

  // Interaktywność overlayu
  function updateOverlayInteractivity() {
    const active = cropMode || (txt.text.trim() !== '' && !compareMode);
    cvOverlay.classList.toggle('interactive', active);
  }

  // ===== POKAZANIE KONTROLEK =====
  function showControls() {
    dropHint.style.display    = 'none';
    canvasWrap.style.display  = 'flex';
    presetsSection.style.display = 'block';
    ctrlSection.style.display = 'block';
    textSection.style.display = 'block';
    actSection.style.display  = 'block';
    btnClose.style.display    = 'block';
    dropZone.style.border = '2px solid var(--border)';
    renderPresetsList();
  }

  // ===== ULUBIONE USTAWIENIA (PRESETY) =====
  const PRESETS_KEY = 'fn-presets';
  const PROFILE_LABELS = { natural:'Naturalny', warm:'Ciepły', vivid:'Żywe kolory', bw:'Czarno-białe', sepia:'Sepia', hdr:'HDR' };

  function loadPresets() {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || []; }
    catch { return []; }
  }

  function savePresetsToStorage(presets) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }

  function renderPresetsList() {
    const presets = loadPresets();
    presetsList.innerHTML = '';
    if (presets.length === 0) {
      presetsList.innerHTML = '<div class="presets-empty">Brak zapisanych ustawień.<br>Ustaw styl i intensywność, a potem zapisz.</div>';
      return;
    }
    presets.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.innerHTML = `
        <button class="preset-apply" data-idx="${idx}" title="Zastosuj: ${p.name}">
          <span class="preset-name">⭐ ${p.name}</span>
          <span class="preset-tag">${PROFILE_LABELS[p.profile] || p.profile} ${p.intensity}%</span>
        </button>
        <button class="preset-delete" data-idx="${idx}" title="Usuń ustawienie">✕</button>
      `;
      presetsList.appendChild(item);
    });
  }

  presetsList.addEventListener('click', (e) => {
    const applyBtn  = e.target.closest('.preset-apply');
    const deleteBtn = e.target.closest('.preset-delete');
    if (applyBtn) {
      const idx = +applyBtn.dataset.idx;
      const presets = loadPresets();
      const p = presets[idx];
      if (!p) return;
      currentProfile = p.profile;
      currentIntensity = p.intensity;
      slider.value = p.intensity;
      sliderVal.textContent = p.intensity;
      profileBtns.forEach(b => b.classList.toggle('active', b.dataset.profile === p.profile));
      applyRetouch();
      setStatus(`Zastosowano ustawienie: „${p.name}"`);
    }
    if (deleteBtn) {
      const idx = +deleteBtn.dataset.idx;
      const presets = loadPresets();
      const name = presets[idx]?.name || '';
      presets.splice(idx, 1);
      savePresetsToStorage(presets);
      renderPresetsList();
      setStatus(`Usunięto ustawienie: „${name}"`);
    }
  });

  btnSavePreset.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    if (!name) { presetNameInput.focus(); setStatus('Wpisz nazwę ustawienia przed zapisem.'); return; }
    const presets = loadPresets();
    if (presets.length >= 8) { setStatus('Możesz zapisać maksymalnie 8 ustawień. Usuń jedno, aby dodać nowe.'); return; }
    presets.push({ name, profile: currentProfile, intensity: currentIntensity });
    savePresetsToStorage(presets);
    renderPresetsList();
    presetNameInput.value = '';
    setStatus(`Zapisano ustawienie: „${name}"`);
  });

  // Zapisz przez Enter w polu nazwy
  presetNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnSavePreset.click();
  });

  // ===== WCZYTANIE OBRAZU =====
  function loadImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      cvOriginal.width = img.naturalWidth;
      cvOriginal.height = img.naturalHeight;
      ctxOri.drawImage(img, 0, 0);
      originalImageData = ctxOri.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

      cvResult.width  = img.naturalWidth;
      cvResult.height = img.naturalHeight;
      cropRect = { x1: 0, y1: 0, x2: img.naturalWidth, y2: img.naturalHeight };
      cropHistory = [];
      btnUndoCrop.style.display = 'none';
      txt.nx = 0.5; txt.ny = 0.88;

      showControls();
      buildHistogram(originalImageData);
      applyRetouch();

      requestAnimationFrame(() => requestAnimationFrame(() => { syncOverlay(); drawOverlay(); }));
    };
    img.src = dataUrl;
  }

  // ===== RYSOWANIE TEKSTU na canvas =====
  function drawText(c, w, h) {
    if (!txt.text.trim()) return;
    const sz = txt.fontSize;
    c.save();
    c.font = `bold ${sz}px '${txt.font}', sans-serif`;
    c.fillStyle = txt.color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.70)';
    c.shadowBlur = sz * 0.32;
    c.shadowOffsetX = sz * 0.04;
    c.shadowOffsetY = sz * 0.04;
    c.fillText(txt.text, txt.nx * w, txt.ny * h);
    c.restore();
  }

  // ===== RENDER WYNIKU =====
  function renderResult() {
    if (!processedImageData) return;
    ctx.putImageData(processedImageData, 0, 0);
    drawText(ctx, cvResult.width, cvResult.height);
  }

  // ===== RETUSZ =====
  function applyRetouch() {
    if (!originalImageData) return;
    setStatus('Przetwarzanie...');
    procOverlay.style.display = 'flex';
    setTimeout(() => {
      processedImageData = ImageProcessor.process(
        originalImageData, originalImageData.width, originalImageData.height,
        currentProfile, currentIntensity, currentBrightness, currentLevels
      );
      compareMode ? drawCompare() : renderResult();
      procOverlay.style.display = 'none';
      syncOverlay();
      drawOverlay();
      const n = { natural:'Naturalny', warm:'Ciepły', vivid:'Żywe kolory', bw:'Czarno-białe', sepia:'Sepia', hdr:'HDR' };
      setStatus(`Gotowe! Styl: ${n[currentProfile]}, intensywność: ${currentIntensity}%`);
    }, 30);
  }

  // ===== PORÓWNANIE =====
  function drawCompare() {
    if (!originalImageData || !processedImageData) return;
    const w = cvResult.width, h = cvResult.height;
    const splitX = Math.round(w * compareX);
    const oriData = ctxOri.getImageData(0, 0, w, h);
    const combined = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const src = x < splitX ? oriData : processedImageData;
        combined.data[i]   = src.data[i];
        combined.data[i+1] = src.data[i+1];
        combined.data[i+2] = src.data[i+2];
        combined.data[i+3] = 255;
      }
    }
    ctx.putImageData(combined, 0, 0);
    ctx.save();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h); ctx.stroke();
    ctx.restore();
    drawText(ctx, w, h);
  }

  function updateCompareLine() {
    const px = compareX * cvResult.getBoundingClientRect().width;
    compareLine.style.left = px + 'px';
    compareLine.style.transform = 'translateX(-50%)';
  }

  function refreshPreview() {
    if (!processedImageData) return;
    compareMode ? drawCompare() : renderResult();
    syncOverlay(); drawOverlay();
  }

  // ===== OVERLAY — rysowanie =====
  function drawOverlay() {
    const ow = cvOverlay.width, oh = cvOverlay.height;
    if (!ow || !oh) return;
    ctxOvl.clearRect(0, 0, ow, oh);
    if (cropMode && originalImageData)    { drawCropOverlay(ow, oh); return; }
    if (txt.text.trim() && !compareMode) { drawTextHandle(ow, oh); }
  }

  // ----- Text handle -----
  function textHandleRect(ow, oh) {
    const scale = ow / cvResult.width;
    const dfs = txt.fontSize * scale;
    ctxOvl.font = `bold ${dfs}px '${txt.font}', sans-serif`;
    const tw = ctxOvl.measureText(txt.text || 'A').width;
    const th = dfs * 1.4;
    const cx = txt.nx * ow, cy = txt.ny * oh;
    const pad = 9;
    return {
      x: cx - tw/2 - pad, y: cy - th/2 - pad,
      w: tw + pad*2, h: th + pad*2,
      cx, cy,
      rh: { x: cx + tw/2 + pad - 9, y: cy + th/2 + pad - 9 }, // resize handle center
    };
  }

  function drawTextHandle(ow, oh) {
    if (!txt.text.trim()) return;
    const r = textHandleRect(ow, oh);

    ctxOvl.save();
    // Zewnętrzna ramka (cień)
    ctxOvl.strokeStyle = 'rgba(0,0,0,0.45)'; ctxOvl.lineWidth = 3.5;
    ctxOvl.setLineDash([]); ctxOvl.strokeRect(r.x-1, r.y-1, r.w+2, r.h+2);
    // Przerywana ramka wewnętrzna
    ctxOvl.strokeStyle = 'rgba(255,255,255,0.92)'; ctxOvl.lineWidth = 1.5;
    ctxOvl.setLineDash([6, 3]); ctxOvl.strokeRect(r.x, r.y, r.w, r.h);
    // Resize handle (kwadrat w prawym dolnym rogu)
    ctxOvl.setLineDash([]);
    ctxOvl.fillStyle = '#c8602a'; ctxOvl.strokeStyle = '#fff'; ctxOvl.lineWidth = 1.5;
    ctxOvl.beginPath();
    ctxOvl.roundRect(r.rh.x - 9, r.rh.y - 9, 18, 18, 4);
    ctxOvl.fill(); ctxOvl.stroke();
    // Ikona resize
    ctxOvl.fillStyle = '#fff'; ctxOvl.font = '12px sans-serif';
    ctxOvl.textAlign = 'center'; ctxOvl.textBaseline = 'middle'; ctxOvl.setLineDash([]);
    ctxOvl.fillText('⇲', r.rh.x, r.rh.y);
    ctxOvl.restore();
  }

  function hitText(dx, dy, ow, oh) {
    if (!txt.text.trim()) return null;
    const r = textHandleRect(ow, oh);
    if (Math.hypot(dx - r.rh.x, dy - r.rh.y) < 14) return 'resize';
    if (dx >= r.x && dx <= r.x+r.w && dy >= r.y && dy <= r.y+r.h) return 'move';
    return null;
  }

  // ----- Crop overlay -----
  const H = 9; // handle radius

  function cropDisplayRect(ow, oh) {
    const sx = ow / cvResult.width, sy = oh / cvResult.height;
    return { x1: cropRect.x1*sx, y1: cropRect.y1*sy, x2: cropRect.x2*sx, y2: cropRect.y2*sy };
  }

  function cropHandles(x1, y1, x2, y2) {
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    return { tl:{x:x1,y:y1}, tc:{x:mx,y:y1}, tr:{x:x2,y:y1}, ml:{x:x1,y:my}, mr:{x:x2,y:my}, bl:{x:x1,y:y2}, bc:{x:mx,y:y2}, br:{x:x2,y:y2} };
  }

  function drawCropOverlay(ow, oh) {
    const d = cropDisplayRect(ow, oh);
    const { x1, y1, x2, y2 } = d;
    const cw = x2-x1, ch = y2-y1;

    // Ciemna maska poza kadrem
    ctxOvl.fillStyle = 'rgba(0,0,0,0.54)';
    ctxOvl.fillRect(0, 0, ow, y1);
    ctxOvl.fillRect(0, y2, ow, oh-y2);
    ctxOvl.fillRect(0, y1, x1, ch);
    ctxOvl.fillRect(x2, y1, ow-x2, ch);

    // Obramowanie kadru
    ctxOvl.strokeStyle = '#fff'; ctxOvl.lineWidth = 2; ctxOvl.setLineDash([]);
    ctxOvl.strokeRect(x1, y1, cw, ch);

    // Reguła trójpodziału
    ctxOvl.strokeStyle = 'rgba(255,255,255,0.28)'; ctxOvl.lineWidth = 1;
    ctxOvl.beginPath();
    for (let k = 1; k <= 2; k++) {
      ctxOvl.moveTo(x1 + cw*k/3, y1); ctxOvl.lineTo(x1 + cw*k/3, y2);
      ctxOvl.moveTo(x1, y1 + ch*k/3); ctxOvl.lineTo(x2, y1 + ch*k/3);
    }
    ctxOvl.stroke();

    // Uchwyty narożne + krawędziowe
    const hs = cropHandles(x1, y1, x2, y2);
    ctxOvl.fillStyle = '#fff'; ctxOvl.strokeStyle = '#c8602a'; ctxOvl.lineWidth = 2;
    for (const p of Object.values(hs)) {
      ctxOvl.beginPath(); ctxOvl.arc(p.x, p.y, H, 0, Math.PI*2);
      ctxOvl.fill(); ctxOvl.stroke();
    }

    // Etykieta rozmiaru
    const cW = Math.round(cropRect.x2 - cropRect.x1);
    const cH = Math.round(cropRect.y2 - cropRect.y1);
    const label = `${cW} × ${cH} px`;
    ctxOvl.fillStyle = 'rgba(0,0,0,0.68)';
    ctxOvl.beginPath(); ctxOvl.roundRect(x1, y2+5, 120, 22, 4); ctxOvl.fill();
    ctxOvl.fillStyle = '#fff'; ctxOvl.font = 'bold 12px sans-serif';
    ctxOvl.textAlign = 'left'; ctxOvl.textBaseline = 'middle';
    ctxOvl.fillText(label, x1+8, y2+16);
    // Update info w crop barze
    cropInfo.textContent = label;
  }

  function hitCrop(dx, dy, ow, oh) {
    const d = cropDisplayRect(ow, oh);
    const hs = cropHandles(d.x1, d.y1, d.x2, d.y2);
    for (const [name, p] of Object.entries(hs)) {
      if (Math.hypot(dx-p.x, dy-p.y) <= H+5) return name;
    }
    if (dx>d.x1 && dx<d.x2 && dy>d.y1 && dy<d.y2) return 'move';
    return null;
  }

  const cropCursors = { tl:'nw-resize', tc:'n-resize', tr:'ne-resize', ml:'w-resize', mr:'e-resize', bl:'sw-resize', bc:'s-resize', br:'se-resize', move:'move' };

  // ===== KADROWANIE =====
  function enterCrop() {
    cropMode = true;
    cropRect = { x1: 0, y1: 0, x2: cvResult.width, y2: cvResult.height };
    if (compareMode) { compareMode = false; compareToggle.checked = false; compareLine.style.display = 'none'; }
    cropBar.style.display = 'flex';
    btnCrop.classList.add('active');
    updateOverlayInteractivity();
    syncOverlay(); drawOverlay();
    setStatus('Przeciągnij narożniki lub krawędzie, aby wybrać kadr. Kliknij poza kadrem, by narysować nowy.');
  }

  function exitCrop() {
    cropMode = false;
    cropBar.style.display = 'none';
    btnCrop.classList.remove('active');
    updateOverlayInteractivity();
    syncOverlay(); drawOverlay();
  }

  function applyCrop() {
    if (!originalImageData) return;
    const x1 = Math.max(0, Math.round(Math.min(cropRect.x1, cropRect.x2)));
    const y1 = Math.max(0, Math.round(Math.min(cropRect.y1, cropRect.y2)));
    const x2 = Math.min(originalImageData.width,  Math.round(Math.max(cropRect.x1, cropRect.x2)));
    const y2 = Math.min(originalImageData.height, Math.round(Math.max(cropRect.y1, cropRect.y2)));
    const cw = x2-x1, ch = y2-y1;
    if (cw < 10 || ch < 10) { setStatus('Kadr jest za mały — spróbuj ponownie.'); return; }

    // Zapisz stan przed kadrowaniem (do cofnięcia)
    cropHistory.push({
      imageData: new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height),
      w: originalImageData.width,
      h: originalImageData.height,
    });
    btnUndoCrop.style.display = 'block';

    const cropped = ctxOri.getImageData(x1, y1, cw, ch);
    cvOriginal.width = cw; cvOriginal.height = ch;
    ctxOri.putImageData(cropped, 0, 0);
    originalImageData = ctxOri.getImageData(0, 0, cw, ch);
    cvResult.width = cw; cvResult.height = ch;
    cropRect = { x1:0, y1:0, x2:cw, y2:ch };

    exitCrop();
    buildHistogram(originalImageData);
    applyRetouch();
    setStatus(`Kadrowanie zastosowane! (${cw}×${ch} px)`);
  }

  function undoCrop() {
    if (cropHistory.length === 0) return;
    const prev = cropHistory.pop();
    cvOriginal.width = prev.w; cvOriginal.height = prev.h;
    ctxOri.putImageData(prev.imageData, 0, 0);
    originalImageData = new ImageData(new Uint8ClampedArray(prev.imageData.data), prev.w, prev.h);
    cvResult.width = prev.w; cvResult.height = prev.h;
    cropRect = { x1:0, y1:0, x2:prev.w, y2:prev.h };
    if (cropHistory.length === 0) btnUndoCrop.style.display = 'none';
    buildHistogram(originalImageData);
    applyRetouch();
    setStatus(`Cofnięto kadrowanie. (${prev.w}×${prev.h} px)`);
  }

  // ===== ZDARZENIA OVERLAY =====

  cvOverlay.addEventListener('mousemove', (e) => {
    const p = overlayPos(e);
    const ow = cvOverlay.width, oh = cvOverlay.height;
    if (cropMode) {
      if (cDrag.on) { moveCropDrag(p); drawOverlay(); }
      else { const h = hitCrop(p.dx, p.dy, ow, oh); cvOverlay.style.cursor = h ? cropCursors[h] : 'crosshair'; }
    } else if (txt.text.trim() && !compareMode) {
      if (tDrag.on) { moveTextDrag(p); refreshPreview(); }
      else { const h = hitText(p.dx, p.dy, ow, oh); cvOverlay.style.cursor = h === 'resize' ? 'se-resize' : h === 'move' ? 'move' : 'default'; }
    }
  });

  cvOverlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const p = overlayPos(e);
    const ow = cvOverlay.width, oh = cvOverlay.height;
    if (cropMode) {
      const h = hitCrop(p.dx, p.dy, ow, oh);
      if (h) {
        cDrag = { on:true, type:h, mx0:p.dx, my0:p.dy, r0:{...cropRect} };
      } else {
        // Rysuj nowy kadr od miejsca kliknięcia
        cropRect = { x1:p.ix, y1:p.iy, x2:p.ix+1, y2:p.iy+1 };
        cDrag = { on:true, type:'br', mx0:p.dx, my0:p.dy, r0:{...cropRect} };
      }
    } else if (txt.text.trim() && !compareMode) {
      const h = hitText(p.dx, p.dy, ow, oh);
      if (h) tDrag = { on:true, type:h, mx0:p.dx, my0:p.dy, nx0:txt.nx, ny0:txt.ny, fs0:txt.fontSize };
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (cDrag.on && cropMode)           { moveCropDrag(overlayPos(e)); drawOverlay(); }
    if (tDrag.on && !cropMode)          { moveTextDrag(overlayPos(e)); refreshPreview(); }
    if (isDraggingCompare && compareMode) moveCompare(e);
  });

  document.addEventListener('mouseup', () => {
    cDrag.on = false;
    if (tDrag.on) { tDrag.on = false; drawOverlay(); }
    isDraggingCompare = false;
  });

  function moveCropDrag(p) {
    const imgW = cvResult.width, imgH = cvResult.height;
    const sx = imgW / cvOverlay.width, sy = imgH / cvOverlay.height;
    const dix = (p.dx - cDrag.mx0) * sx;
    const diy = (p.dy - cDrag.my0) * sy;
    const s = cDrag.r0;
    const min = 20;
    let r = { ...s };
    switch (cDrag.type) {
      case 'tl': r.x1 = Math.min(s.x1+dix, s.x2-min); r.y1 = Math.min(s.y1+diy, s.y2-min); break;
      case 'tc': r.y1 = Math.min(s.y1+diy, s.y2-min); break;
      case 'tr': r.x2 = Math.max(s.x2+dix, s.x1+min); r.y1 = Math.min(s.y1+diy, s.y2-min); break;
      case 'ml': r.x1 = Math.min(s.x1+dix, s.x2-min); break;
      case 'mr': r.x2 = Math.max(s.x2+dix, s.x1+min); break;
      case 'bl': r.x1 = Math.min(s.x1+dix, s.x2-min); r.y2 = Math.max(s.y2+diy, s.y1+min); break;
      case 'bc': r.y2 = Math.max(s.y2+diy, s.y1+min); break;
      case 'br': r.x2 = Math.max(s.x2+dix, s.x1+min); r.y2 = Math.max(s.y2+diy, s.y1+min); break;
      case 'move': {
        const rw = s.x2-s.x1, rh = s.y2-s.y1;
        r.x1 = Math.max(0, Math.min(s.x1+dix, imgW-rw));
        r.y1 = Math.max(0, Math.min(s.y1+diy, imgH-rh));
        r.x2 = r.x1+rw; r.y2 = r.y1+rh;
        break;
      }
    }
    r.x1 = Math.max(0, r.x1); r.y1 = Math.max(0, r.y1);
    r.x2 = Math.min(imgW, r.x2); r.y2 = Math.min(imgH, r.y2);
    cropRect = r;
  }

  function moveTextDrag(p) {
    const ow = cvOverlay.width, oh = cvOverlay.height;
    const dx = p.dx - tDrag.mx0, dy = p.dy - tDrag.my0;
    if (tDrag.type === 'move') {
      txt.nx = Math.max(0.01, Math.min(0.99, tDrag.nx0 + dx/ow));
      txt.ny = Math.max(0.01, Math.min(0.99, tDrag.ny0 + dy/oh));
    } else if (tDrag.type === 'resize') {
      // przeciągnięcie w prawo/dół = większa czcionka
      txt.fontSize = Math.max(10, Math.min(200, Math.round(tDrag.fs0 + (dx + dy) * 0.38)));
    }
  }

  // ===== AUTO KOREKTA =====
  function autoCorrect() {
    if (!originalImageData) return;
    const d = originalImageData.data;
    const n = d.length / 4;

    // Histogramy dla każdego kanału i luminancji
    const lumHist = new Uint32Array(256);
    const rHist   = new Uint32Array(256);
    const gHist   = new Uint32Array(256);
    const bHist   = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      rHist[d[i]]++;
      gHist[d[i + 1]]++;
      bHist[d[i + 2]]++;
      lumHist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }

    // Percentyl: wartość przy której histograf skumulowany przekroczy pct*n
    function percentile(hist, pct) {
      const target = n * pct;
      let sum = 0;
      for (let i = 0; i < 256; i++) { sum += hist[i]; if (sum >= target) return i; }
      return 255;
    }

    // Czarny i biały punkt z 1.5% obcinania po obu stronach
    const autoBlack = percentile(lumHist, 0.015);
    const autoWhite = percentile(lumHist, 0.985);

    // Gamma: korekta średniej jasności w stronę 128
    let sumLum = 0;
    for (let i = 0; i < 256; i++) sumLum += i * lumHist[i];
    const avgLum = sumLum / n;
    let autoGamma = 0;
    if (avgLum < 95)  autoGamma = Math.min(60,  Math.round((95  - avgLum) / 1.5));
    if (avgLum > 165) autoGamma = Math.max(-60, -Math.round((avgLum - 165) / 2));

    // Zastosuj
    currentLevels = { inBlack: autoBlack, inWhite: autoWhite, gamma: autoGamma };
    levelsBlack.value = autoBlack; levelsBlackVal.textContent = autoBlack;
    levelsWhite.value = autoWhite; levelsWhiteVal.textContent = autoWhite;
    levelsGamma.value = autoGamma; levelsGammaVal.textContent = levelsDisplay(autoGamma);
    drawHistogram();
    applyRetouch();
    setStatus(`✨ Auto korekta: cienie ${autoBlack}, światła ${autoWhite}, gamma ${levelsDisplay(autoGamma)}`);
  }

  // ===== ZAMKNIJ ZDJĘCIE =====
  function closeImage() {
    if (cropMode) exitCrop();
    originalImageData = null;
    processedImageData = null;
    histData = null;
    cropHistory = [];
    currentProfile = 'natural'; currentIntensity = 65;
    currentBrightness = 0;
    currentLevels = { inBlack: 0, inWhite: 255, gamma: 0 };
    compareMode = false; compareX = 0.5;
    txt = { text: '', fontSize: 36, color: '#ffffff', nx: 0.5, ny: 0.88, font: 'Segoe UI' };

    // Przywróć UI do stanu początkowego
    canvasWrap.style.display  = 'none';
    dropHint.style.display    = '';        // CSS decyduje (block/flex)
    presetsSection.style.display = 'none';
    ctrlSection.style.display = 'none';
    textSection.style.display = 'none';
    actSection.style.display  = 'none';
    btnClose.style.display    = 'none';
    dropZone.style.border     = '';
    compareLine.style.display = 'none';
    cvResult.classList.remove('compare-cursor');
    btnUndoCrop.style.display = 'none';
    compareToggle.checked = false;

    // Reset kontrolek do domyślnych
    slider.value = 65; sliderVal.textContent = '65';
    brightnessSlider.value = 0; brightnessVal.textContent = '0';
    levelsBlack.value = 0; levelsBlackVal.textContent = '0';
    levelsWhite.value = 255; levelsWhiteVal.textContent = '255';
    levelsGamma.value = 0; levelsGammaVal.textContent = '0';
    textInput.value = '';
    profileBtns.forEach(b => b.classList.toggle('active', b.dataset.profile === 'natural'));
    sizeBtns.forEach(b => b.classList.toggle('active', b.dataset.size === '36'));
    colorBtns.forEach(b => b.classList.toggle('active', b.dataset.color === '#ffffff'));
    posBtns.forEach(b => b.classList.toggle('active', b.dataset.pos === 'bot-center'));
    fontBtns.forEach(b => b.classList.toggle('active', b.dataset.font === 'Segoe UI'));

    // Wyczyść canvasy i histogram
    ctx.clearRect(0, 0, cvResult.width, cvResult.height);
    ctxOvl.clearRect(0, 0, cvOverlay.width, cvOverlay.height);
    drawHistogram();

    setStatus('Witaj! Wczytaj zdjęcie, aby rozpocząć.');
  }

  // ===== ZDARZENIA UI =====

  btnOpen.addEventListener('click', async () => {
    const d = await window.electronAPI.openFile();
    if (!d) return;
    if (typeof d === 'object' && d.error) {
      setStatus('Błąd: ' + d.error.split('\n')[0]);
      alert(d.error);
      return;
    }
    loadImage(d);
  });

  btnSave.addEventListener('click', async () => {
    if (!processedImageData) return;
    const tmp = document.createElement('canvas');
    tmp.width = cvResult.width; tmp.height = cvResult.height;
    const tc = tmp.getContext('2d');
    tc.putImageData(processedImageData, 0, 0);
    drawText(tc, tmp.width, tmp.height);
    setStatus('Zapisywanie...');
    const ok = await window.electronAPI.saveFile(tmp.toDataURL('image/jpeg', 0.95));
    setStatus(ok ? 'Zdjęcie zostało zapisane pomyślnie!' : 'Zapis anulowany.');
  });

  btnReset.addEventListener('click', () => {
    if (!originalImageData) return;
    currentProfile = 'natural'; currentIntensity = 65; currentBrightness = 0;
    currentLevels = { inBlack: 0, inWhite: 255, gamma: 0 };
    slider.value = 65; sliderVal.textContent = '65';
    brightnessSlider.value = 0; brightnessVal.textContent = '0';
    levelsBlack.value = 0; levelsBlackVal.textContent = '0';
    levelsWhite.value = 255; levelsWhiteVal.textContent = '255';
    levelsGamma.value = 0; levelsGammaVal.textContent = '0';
    compareToggle.checked = false; compareMode = false;
    compareLine.style.display = 'none';
    cvResult.classList.remove('compare-cursor');
    txt = { text:'', fontSize:36, color:'#ffffff', nx:0.5, ny:0.88, font:'Segoe UI' };
    textInput.value = '';
    profileBtns.forEach(b => b.classList.toggle('active', b.dataset.profile === 'natural'));
    sizeBtns.forEach(b => b.classList.toggle('active', b.dataset.size === '36'));
    colorBtns.forEach(b => b.classList.toggle('active', b.dataset.color === '#ffffff'));
    posBtns.forEach(b => b.classList.toggle('active', b.dataset.pos === 'bot-center'));
    fontBtns.forEach(b => b.classList.toggle('active', b.dataset.font === 'Segoe UI'));
    if (cropMode) exitCrop();
    applyRetouch();
    setStatus('Przywrócono ustawienia domyślne.');
  });

  btnCrop.addEventListener('click', () => {
    if (!originalImageData) return;
    cropMode ? exitCrop() : enterCrop();
  });
  btnApplyCrop.addEventListener('click', applyCrop);
  btnCancelCrop.addEventListener('click', exitCrop);

  btnClearText.addEventListener('click', () => {
    txt.text = ''; textInput.value = '';
    refreshPreview(); updateOverlayInteractivity();
    setStatus('Podpis usunięty.');
  });

  profileBtns.forEach(btn => btn.addEventListener('click', () => {
    profileBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentProfile = btn.dataset.profile;
    applyRetouch();
  }));

  slider.addEventListener('input', () => { currentIntensity = +slider.value; sliderVal.textContent = currentIntensity; });
  slider.addEventListener('change', applyRetouch);

  brightnessSlider.addEventListener('input', () => {
    currentBrightness = +brightnessSlider.value;
    brightnessVal.textContent = currentBrightness > 0 ? '+' + currentBrightness : currentBrightness;
  });
  brightnessSlider.addEventListener('change', applyRetouch);

  // Poziomy
  function levelsDisplay(v) { return v > 0 ? '+' + v : String(v); }

  levelsBlack.addEventListener('input', () => {
    const v = +levelsBlack.value;
    if (v >= currentLevels.inWhite) { levelsBlack.value = currentLevels.inWhite - 1; return; }
    currentLevels.inBlack = v;
    levelsBlackVal.textContent = v;
    drawHistogram();
  });
  levelsBlack.addEventListener('change', applyRetouch);

  levelsWhite.addEventListener('input', () => {
    const v = +levelsWhite.value;
    if (v <= currentLevels.inBlack) { levelsWhite.value = currentLevels.inBlack + 1; return; }
    currentLevels.inWhite = v;
    levelsWhiteVal.textContent = v;
    drawHistogram();
  });
  levelsWhite.addEventListener('change', applyRetouch);

  levelsGamma.addEventListener('input', () => {
    currentLevels.gamma = +levelsGamma.value;
    levelsGammaVal.textContent = levelsDisplay(currentLevels.gamma);
    drawHistogram();
  });
  levelsGamma.addEventListener('change', applyRetouch);

  btnResetLevels.addEventListener('click', () => {
    currentLevels = { inBlack: 0, inWhite: 255, gamma: 0 };
    levelsBlack.value = 0; levelsBlackVal.textContent = '0';
    levelsWhite.value = 255; levelsWhiteVal.textContent = '255';
    levelsGamma.value = 0; levelsGammaVal.textContent = '0';
    drawHistogram();
    applyRetouch();
    setStatus('Poziomy zresetowane.');
  });

  btnUndoCrop.addEventListener('click', undoCrop);
  btnAutoCorrect.addEventListener('click', autoCorrect);
  btnClose.addEventListener('click', () => {
    if (!confirm('Zamknąć zdjęcie bez zapisywania? Niezapisane zmiany zostaną utracone.')) return;
    closeImage();
  });

  compareToggle.addEventListener('change', () => {
    if (cropMode) exitCrop();
    compareMode = compareToggle.checked;
    if (compareMode) {
      compareX = 0.5; compareLine.style.display = 'block';
      cvResult.classList.add('compare-cursor');
      applyRetouch(); updateCompareLine();
      setStatus('Przeciągnij linię podziału, aby porównać oryginał i retusz');
    } else {
      compareLine.style.display = 'none';
      cvResult.classList.remove('compare-cursor');
      renderResult();
    }
    updateOverlayInteractivity();
    syncOverlay(); drawOverlay();
  });

  // Tekst
  textInput.addEventListener('input', () => {
    txt.text = textInput.value;
    refreshPreview(); updateOverlayInteractivity();
  });

  sizeBtns.forEach(btn => btn.addEventListener('click', () => {
    sizeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    txt.fontSize = +btn.dataset.size;
    refreshPreview();
  }));

  colorBtns.forEach(btn => btn.addEventListener('click', () => {
    colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    txt.color = btn.dataset.color;
    refreshPreview();
  }));

  const posMap = {
    'top-left':{nx:.08,ny:.06}, 'top-center':{nx:.5,ny:.06}, 'top-right':{nx:.92,ny:.06},
    'mid-left':{nx:.08,ny:.5},  'mid-center':{nx:.5,ny:.5},  'mid-right':{nx:.92,ny:.5},
    'bot-left':{nx:.08,ny:.92}, 'bot-center':{nx:.5,ny:.92}, 'bot-right':{nx:.92,ny:.92},
  };
  posBtns.forEach(btn => btn.addEventListener('click', () => {
    posBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = posMap[btn.dataset.pos] || {nx:.5,ny:.92};
    txt.nx = p.nx; txt.ny = p.ny;
    refreshPreview();
  }));

  // Czcionka
  fontBtns.forEach(btn => btn.addEventListener('click', () => {
    fontBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    txt.font = btn.dataset.font;
    refreshPreview();
  }));

  // PDF eksport
  btnSavePDF.addEventListener('click', async () => {
    if (!processedImageData) return;
    const tmp = document.createElement('canvas');
    tmp.width = cvResult.width; tmp.height = cvResult.height;
    const tc = tmp.getContext('2d');
    tc.putImageData(processedImageData, 0, 0);
    drawText(tc, tmp.width, tmp.height);
    setStatus('Eksportowanie do PDF...');
    const jpegBase64 = tmp.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
    const ok = await window.electronAPI.savePDF(jpegBase64);
    setStatus(ok ? 'Plik PDF zapisany pomyślnie!' : 'Eksport PDF anulowany.');
  });

  // ===== DRAG & DROP PLIK =====
  // Zapobiega nawigacji Electron przy upuszczeniu pliku gdziekolwiek w oknie
  document.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
  document.addEventListener('drop',     e => { e.preventDefault(); e.stopPropagation(); });

  async function handleFileDrop(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const rawExts  = ['cr2','cr3','nef','arw','dng','orf','rw2','raw','raf','pef','srw','x3f','3fr','mef','mrw'];
    const heicExts = ['heic','heif'];

    // HEIC i RAW: użyj ścieżki systemowej i IPC do konwersji w main procesie
    if (rawExts.includes(ext) || heicExts.includes(ext)) {
      const filePath = file.path; // dostępne w Electron
      if (!filePath) {
        setStatus('Nie można odczytać ścieżki pliku. Użyj przycisku „Otwórz zdjęcie".');
        return;
      }
      setStatus(`Otwieranie ${file.name}…`);
      const result = await window.electronAPI.openFilePath(filePath);
      if (!result) return;
      if (typeof result === 'object' && result.error) {
        setStatus('Błąd: ' + result.error.split('\n')[0]);
        alert(result.error);
        return;
      }
      loadImage(result);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus('Nieobsługiwany format. Użyj JPG, PNG, WebP, BMP, HEIC lub RAW.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => loadImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  // Cały obszar podglądu przyjmuje drop (dropZone i jego dzieci)
  dropZone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', e => {
    // Tylko gdy opuścimy dropZone, a nie wejdziemy w dziecko
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.remove('drag-over');
    handleFileDrop(e.dataTransfer.files[0]);
  });

  // ===== LINIA PORÓWNANIA =====
  compareLine.addEventListener('mousedown', e => { if (!compareMode) return; isDraggingCompare = true; e.preventDefault(); });
  cvResult.addEventListener('mousedown', e => { if (!compareMode || cropMode) return; isDraggingCompare = true; moveCompare(e); });
  compareLine.addEventListener('touchstart', e => { if (!compareMode) return; isDraggingCompare = true; e.preventDefault(); });
  document.addEventListener('touchmove', e => { if (isDraggingCompare && compareMode) { moveCompare(e.touches[0]); e.preventDefault(); } }, { passive: false });
  document.addEventListener('touchend', () => { isDraggingCompare = false; });

  function moveCompare(e) {
    const r = cvResult.getBoundingClientRect();
    compareX = Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width));
    updateCompareLine();
    if (processedImageData) drawCompare();
  }

  // ===== RESIZE OBSERVER — synchronizacja overlayu przy zmianie rozmiaru okna =====
  new ResizeObserver(() => { syncOverlay(); drawOverlay(); }).observe(canvasWrap);

  setStatus('Witaj! Wczytaj zdjęcie, aby rozpocząć.');
})();
