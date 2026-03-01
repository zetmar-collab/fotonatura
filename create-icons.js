/**
 * FotoNatura — generator ikon aplikacji (PNG + ICO)
 * Tworzy ikonę 1024×1024 bez zewnętrznych narzędzi systemowych.
 */
const { PNG } = require('pngjs');
// png-to-ico v3 jest ES module — używamy dynamic import
async function loadPngToIco() {
  const mod = await import('png-to-ico');
  return mod.default;
}
const fs = require('fs');

const SIZE = 1024;
const png = new PNG({ width: SIZE, height: SIZE, filterType: -1 });

// Wypełnij przezroczystością
png.data.fill(0);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  png.data[i] = r; png.data[i+1] = g; png.data[i+2] = b; png.data[i+3] = a;
}

// Antyaliasing dla okręgu
function setPixelAA(x, y, r, g, b, alpha) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const a = (png.data[i+3] / 255);
  const na = alpha / 255;
  const out = na + a * (1 - na);
  if (out === 0) return;
  png.data[i]   = Math.round((r * na + png.data[i]   * a * (1 - na)) / out);
  png.data[i+1] = Math.round((g * na + png.data[i+1] * a * (1 - na)) / out);
  png.data[i+2] = Math.round((b * na + png.data[i+2] * a * (1 - na)) / out);
  png.data[i+3] = Math.round(out * 255);
}

const cx = SIZE / 2, cy = SIZE / 2;

// 1. Tło: ciepły gradient (kolory FotoNatura)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const R = SIZE * 0.46;

    // Zaokrąglony kwadrat: supereliipsa n=6
    const sx = Math.pow(Math.abs(dx) / R, 6);
    const sy = Math.pow(Math.abs(dy) / R, 6);
    const insideness = 1 - (sx + sy);
    if (insideness <= 0) continue;

    // Gradient: od #d97030 (góra-lewa) do #a84d20 (dół-prawa)
    const t = (x + y) / (SIZE * 2);
    const tr = Math.round(217 - t * 40);
    const tg = Math.round(112 - t * 30);
    const tb = Math.round(48  - t * 20);

    const aa = Math.min(1, insideness * 8) * 255;
    setPixelAA(x, y, tr, tg, tb, aa);
  }
}

// 2. Białe koło w środku
const whiteR = SIZE * 0.33;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < whiteR - 1) setPixel(x, y, 255, 255, 255);
    else if (dist < whiteR + 1) {
      const aa = (whiteR + 1 - dist) / 2;
      setPixelAA(x, y, 255, 255, 255, Math.round(aa * 255));
    }
  }
}

// 3. Zielony liść — krzywa Béziera przez rysowanie elipsy obróconej 30°
function drawLeaf(x0, y0, rw, rh, angleDeg, r, g, b) {
  const a = angleDeg * Math.PI / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - x0, dy = y - y0;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const val = (lx / rw) ** 2 + (ly / rh) ** 2;
      if (val < 1) {
        const aa = Math.min(1, (1 - val) * 8) * 255;
        setPixelAA(x, y, r, g, b, aa);
      }
    }
  }
}

// Duży liść (ciemnozielony)
drawLeaf(cx - 30, cy + 20, SIZE * 0.14, SIZE * 0.21, -35, 35, 120, 35);
// Mały liść (jaśniejszy)
drawLeaf(cx + 60, cy - 40, SIZE * 0.09, SIZE * 0.16, 25, 60, 160, 50);
// Łodyżka (ciemna kreska)
for (let t = 0; t <= 200; t++) {
  const px = Math.round(cx - 5 + t * 0.2);
  const py = Math.round(cy + 90 - t * 0.7);
  for (let d = -5; d <= 5; d++) {
    const aa = Math.max(0, 1 - Math.abs(d) / 5) * 200;
    setPixelAA(px + d, py, 30, 90, 30, aa);
    setPixelAA(px, py + d, 30, 90, 30, aa);
  }
}

// 4. Zapisz PNG
fs.mkdirSync('assets', { recursive: true });
const pngBuf = PNG.sync.write(png);
fs.writeFileSync('assets/icon.png', pngBuf);
console.log('✓  assets/icon.png (1024×1024)');

// 5. Zapisz ICO dla Windows
loadPngToIco()
  .then(pngToIco => pngToIco('assets/icon.png'))
  .then(ico => {
    fs.writeFileSync('assets/icon.ico', ico);
    console.log('✓  assets/icon.ico (Windows)');
  })
  .catch(e => console.warn('⚠  ICO pominięte:', e.message));
