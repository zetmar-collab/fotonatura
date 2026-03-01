/**
 * FotoNatura — Silnik przetwarzania obrazu (Canvas API)
 */

const ImageProcessor = (() => {

  function clamp(v, lo = 0, hi = 255) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    return [h / 6, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1/3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1/3) * 255),
    ];
  }

  function gammaLUT(gamma) {
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = clamp(Math.round(Math.pow(i / 255, gamma) * 255));
    }
    return lut;
  }

  function contrastLUT(strength) {
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      lut[i] = clamp(Math.round(255 / (1 + Math.exp(-strength * 10 * (x - 0.5)))));
    }
    return lut;
  }

  // ===== Algorytmy =====

  /** Adaptacyjna jasność — koryguje tylko wyraźnie za ciemne/jasne zdjęcia */
  function adaptiveBrightness(data, t) {
    let sumLum = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avg = sumLum / n;
    if (avg >= 80 && avg <= 175) return; // dobrze naświetlone
    const target = 128;
    const rawGamma = Math.log((avg / 255) || 0.001) / Math.log(target / 255);
    const gamma = 1 + (Math.max(0.6, Math.min(1.7, rawGamma)) - 1) * t;
    const lut = gammaLUT(gamma);
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
  }

  function adjustSaturation(data, delta) {
    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const [r, g, b] = hslToRgb(h, Math.max(0, Math.min(1, s + delta)), l);
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
    }
  }

  function unsharpMask(data, width, height, amount) {
    const blurred = new Uint8ClampedArray(data.length);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              sum += data[((y + dy) * width + (x + dx)) * 4 + c];
          blurred[idx + c] = sum / 9;
        }
        blurred[idx + 3] = 255;
      }
    }
    for (let i = 0; i < data.length; i += 4)
      for (let c = 0; c < 3; c++)
        data[i + c] = clamp(data[i + c] + amount * (data[i + c] - blurred[i + c]));
  }

  function denoiseLight(data, width, height, strength) {
    const orig = new Uint8ClampedArray(data);
    const blr  = new Uint8ClampedArray(data.length);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              sum += data[((y + dy) * width + (x + dx)) * 4 + c];
          blr[idx + c] = sum / 9;
        }
        blr[idx + 3] = 255;
      }
    }
    for (let i = 0; i < data.length; i += 4)
      for (let c = 0; c < 3; c++)
        data[i + c] = clamp(orig[i + c] * (1 - strength) + blr[i + c] * strength);
  }

  // ===== Sepia =====
  // Najpierw konwersja do szarości, potem ciepłe tonowanie — daje czyste, bogate odcienie brązu.
  function applySepia(data, t) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Luminancja (pełna skala szarości)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Tonowanie sepii na szarości — ciepłe, bogate brązy
      const sr = Math.min(255, lum * 1.10 + 38);
      const sg = Math.min(255, lum * 0.94 + 20);
      const sb = Math.max(0,   lum * 0.78 +  5);
      // Mieszaj z oryginalem proporcjonalnie do intensywności
      data[i]     = Math.round(r + (sr - r) * t);
      data[i + 1] = Math.round(g + (sg - g) * t);
      data[i + 2] = Math.round(b + (sb - b) * t);
    }
  }

  // ===== HDR =====
  function applyHDR(data, width, height, t) {
    // 1. Tone mapping: lift shadows, compress highlights
    const tone = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let v = i;
      if (i < 55)  v = i + Math.round((55  - i) * 0.40 * t); // lift shadows
      else if (i > 190) v = i - Math.round((i - 190) * 0.50 * t); // compress highlights
      tone[i] = clamp(v);
    }
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = tone[data[i]];
      data[i + 1] = tone[data[i + 1]];
      data[i + 2] = tone[data[i + 2]];
    }
    // 2. Silna lokalana ostrość (Clarity / Structure)
    unsharpMask(data, width, height, 1.3 * t);
    // 3. Mocne nasycenie
    adjustSaturation(data, 0.42 * t);
    // 4. Mocny kontrast S-curve
    const lut = contrastLUT(0.75 * t);
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
  }

  // ===== Korekty profilowe (natural/warm/bw/vivid) =====
  function applyColorGrade(data, profile, t) {
    switch (profile) {
      case 'warm':
        for (let i = 0; i < data.length; i += 4) {
          data[i]     = clamp(data[i]     + Math.round(28 * t));
          data[i + 1] = clamp(data[i + 1] + Math.round(9  * t));
          data[i + 2] = clamp(data[i + 2] - Math.round(30 * t));
        }
        break;
      case 'bw':
        for (let i = 0; i < data.length; i += 4) {
          const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          data[i] = data[i + 1] = data[i + 2] = lum;
        }
        break;
      case 'vivid':
        adjustSaturation(data, 0.30 * t);
        for (let i = 0; i < data.length; i += 4) {
          data[i + 2] = clamp(data[i + 2] + Math.round(10 * t)); // lekko chłodniejszy
        }
        break;
      default: break; // natural — bez dodatkowych kolorów
    }
  }

  // ===== Poziomy (Levels) =====
  // inBlack: 0–254, inWhite: 1–255, gammaVal: -100…+100 (0 = bez zmiany)
  function applyLevels(data, inBlack, inWhite, gammaVal) {
    const gamma = Math.pow(2, gammaVal / 50); // -100→0.25, 0→1.0, +100→4.0
    const range = Math.max(1, inWhite - inBlack);
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let v = (i - inBlack) / range;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      if (gammaVal !== 0) v = Math.pow(v, 1 / gamma);
      lut[i] = Math.round(v * 255);
    }
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
  }

  // ===== GŁÓWNA FUNKCJA =====
  // brightness: -100 … +100 (0 = bez zmiany)
  // levels: { inBlack, inWhite, gamma } lub null
  function process(imageData, width, height, profile, intensity, brightness = 0, levels = null) {
    const t = intensity / 100;
    const data = new Uint8ClampedArray(imageData.data);

    // 0. Jasność / ciemność — prosta addytywna korekta
    if (brightness !== 0) {
      const bv = Math.round(brightness * 1.6); // skaluj: ±100 → ±160
      const brightLUT = new Uint8Array(256);
      for (let i = 0; i < 256; i++) brightLUT[i] = clamp(i + bv);
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = brightLUT[data[i]];
        data[i + 1] = brightLUT[data[i + 1]];
        data[i + 2] = brightLUT[data[i + 2]];
      }
    }

    // 0b. Poziomy — korekta czarnego/białego punktu i gamma półcieni
    if (levels && (levels.inBlack !== 0 || levels.inWhite !== 255 || levels.gamma !== 0)) {
      applyLevels(data, levels.inBlack, levels.inWhite, levels.gamma);
    }

    // --- HDR: własny, specjalny potok ---
    if (profile === 'hdr') {
      applyHDR(data, width, height, t);
      return new ImageData(data, width, height);
    }

    // --- Wspólny potok (natural / warm / bw / vivid / sepia) ---

    // 1. Adaptacyjna jasność (tylko gdy potrzebna)
    adaptiveBrightness(data, t);

    // 2. Kontrast S-curve — mocniejszy niż poprzednio (0.68 * t)
    const lutC = contrastLUT(0.68 * t);
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = lutC[data[i]];
      data[i + 1] = lutC[data[i + 1]];
      data[i + 2] = lutC[data[i + 2]];
    }

    // 3. Sepia lub inne profile kolorystyczne
    if (profile === 'sepia') {
      applySepia(data, t);
    } else {
      const satDelta = profile === 'bw' ? -1 : 0.22 * t;
      if (satDelta !== 0) adjustSaturation(data, satDelta);
      applyColorGrade(data, profile, t);
    }

    // 4. Wyostrzanie — mocniejsze (0.85 * t)
    if (t > 0.15) unsharpMask(data, width, height, 0.85 * t);

    // 5. Subtelny denoise tylko przy wysokiej intensywności
    if (t > 0.65) denoiseLight(data, width, height, 0.05 * t);

    return new ImageData(data, width, height);
  }

  return { process };
})();
