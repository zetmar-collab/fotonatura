const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Wyłącz akcelerację GPU — główna przyczyna białego tła na Windows.
// Musi być wywołane PRZED app.whenReady() i requestSingleInstanceLock().
app.disableHardwareAcceleration();

// Wymuszenie jednej instancji — NSIS installer może poprawnie wykryć i zamknąć aplikację
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 650,
    title: 'FotoNatura',
    backgroundColor: '#fdf6ee',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Wyłącz sandbox renderera — konieczne na Windows dla poprawnego ładowania file://
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);
  // Zapobiegaj nawigacji Electron przy upuszczeniu pliku na okno
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  // Jeśli strona nie załaduje się poprawnie, spróbuj ponownie po chwili
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    if (errorCode === -3) return; // ERR_ABORTED — normalne przy przekierowaniach
    console.error('Błąd ładowania:', errorCode, errorDescription);
    setTimeout(() => win.loadFile(path.join(__dirname, 'renderer', 'index.html')), 1000);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Gdy druga instancja próbuje się uruchomić — przywróć pierwsze okno
app.on('second-instance', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const win = windows[0];
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Rozszerzenia RAW obsługiwane przez dcraw
const RAW_EXTENSIONS = ['cr2','cr3','nef','arw','dng','orf','rw2','raw','raf','pef','srw','x3f','3fr','mef','mrw'];
const STD_EXTENSIONS = ['jpg','jpeg','png','webp','bmp'];
const HEIC_EXTENSIONS = ['heic','heif'];

// Otwieranie pliku
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Wybierz zdjęcie',
    filters: [
      { name: 'Wszystkie zdjęcia', extensions: [...STD_EXTENSIONS, ...HEIC_EXTENSIONS, ...RAW_EXTENSIONS] },
      { name: 'Zdjęcia standardowe', extensions: STD_EXTENSIONS },
      { name: 'HEIC / HEIF (iPhone)', extensions: HEIC_EXTENSIONS },
      { name: 'Zdjęcia RAW', extensions: RAW_EXTENSIONS },
    ],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;

  const filePath = filePaths[0];
  const ext = path.extname(filePath).slice(1).toLowerCase();

  // Standardowe formaty — czytaj bezpośrednio
  if (STD_EXTENSIONS.includes(ext)) {
    const data = fs.readFileSync(filePath);
    const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', bmp: 'bmp' };
    const mime = mimeMap[ext] || 'jpeg';
    return `data:image/${mime};base64,${data.toString('base64')}`;
  }

  // HEIC / HEIF — konwertuj przez heic-convert
  if (HEIC_EXTENSIONS.includes(ext)) {
    return await convertHeic(filePath);
  }

  // RAW — użyj dcraw do wyciągnięcia wbudowanego podglądu JPEG
  if (RAW_EXTENSIONS.includes(ext)) {
    return await extractRawPreview(filePath);
  }

  return { error: 'Nieobsługiwany format pliku.' };
});

async function convertHeic(filePath) {
  try {
    const heicConvert = require('heic-convert');
    const inputBuf = fs.readFileSync(filePath);
    const outputBuf = await heicConvert({ buffer: inputBuf, format: 'JPEG', quality: 0.95 });
    return `data:image/jpeg;base64,${Buffer.from(outputBuf).toString('base64')}`;
  } catch (err) {
    return { error: `Nie udało się otworzyć pliku HEIC: ${err.message}` };
  }
}

function extractRawPreview(filePath) {
  return new Promise((resolve) => {
    // dcraw -e -c: wyciągnij wbudowany podgląd i wyślij na stdout
    execFile('dcraw', ['-e', '-c', filePath], { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        // Sprawdź czy dcraw w ogóle istnieje
        execFile('which', ['dcraw'], (whichErr) => {
          if (whichErr) {
            resolve({ error: 'dcraw nie jest zainstalowany. Aby otworzyć zdjęcia RAW, zainstaluj dcraw:\n  Ubuntu/Debian: sudo apt install dcraw\n  macOS: brew install dcraw' });
          } else {
            resolve({ error: `Nie udało się odczytać pliku RAW: ${err.message}` });
          }
        });
        return;
      }
      if (!stdout || stdout.length < 100) {
        resolve({ error: 'Brak wbudowanego podglądu w pliku RAW. Spróbuj innego pliku.' });
        return;
      }
      resolve(`data:image/jpeg;base64,${stdout.toString('base64')}`);
    });
  });
}

// Otwieranie pliku po ścieżce (drag & drop HEIC/RAW)
ipcMain.handle('open-file-path', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') return { error: 'Nieprawidłowa ścieżka pliku.' };
  if (!fs.existsSync(filePath)) return { error: `Plik nie istnieje: ${filePath}` };

  const ext = path.extname(filePath).slice(1).toLowerCase();

  if (STD_EXTENSIONS.includes(ext)) {
    const data = fs.readFileSync(filePath);
    const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', bmp: 'bmp' };
    return `data:image/${mimeMap[ext] || 'jpeg'};base64,${data.toString('base64')}`;
  }
  if (HEIC_EXTENSIONS.includes(ext)) return await convertHeic(filePath);
  if (RAW_EXTENSIONS.includes(ext))  return await extractRawPreview(filePath);

  return { error: `Nieobsługiwany format: .${ext}` };
});

// Zapisywanie pliku
ipcMain.handle('save-file', async (event, dataUrl) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Zapisz zdjęcie',
    defaultPath: 'retuszowane_zdjecie.jpg',
    filters: [
      { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
      { name: 'PNG', extensions: ['png'] },
    ],
  });
  if (canceled || !filePath) return false;

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return true;
});

// Zapisywanie PDF
ipcMain.handle('save-pdf', async (event, jpegBase64) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Eksportuj do PDF',
    defaultPath: 'zdjecie_fotonatura.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return false;

  const imgBuf = Buffer.from(jpegBase64, 'base64');
  const pdfBuf = buildPdf(imgBuf);
  fs.writeFileSync(filePath, pdfBuf);
  return true;
});

/**
 * Tworzy minimalny plik PDF z jednym obrazem JPEG, bez zewnętrznych zależności.
 * Obraz jest skalowany do formatu A4 (595×842 pt) z zachowaniem proporcji.
 */
function buildPdf(jpegBuf) {
  // Odczytaj wymiary JPEG z nagłówka SOF0/SOF2
  let imgW = 800, imgH = 600;
  for (let i = 0; i < jpegBuf.length - 8; i++) {
    if (jpegBuf[i] === 0xFF && (jpegBuf[i + 1] === 0xC0 || jpegBuf[i + 1] === 0xC2)) {
      imgH = (jpegBuf[i + 5] << 8) | jpegBuf[i + 6];
      imgW = (jpegBuf[i + 7] << 8) | jpegBuf[i + 8];
      break;
    }
  }

  // Wylicz rozmiar obrazu na stronie A4 (595×842 pt) z marginesem 20pt
  const margin = 20;
  const pageW = 595, pageH = 842;
  const maxW = pageW - 2 * margin;
  const maxH = pageH - 2 * margin;
  const scale = Math.min(maxW / imgW, maxH / imgH);
  const drawW = Math.round(imgW * scale);
  const drawH = Math.round(imgH * scale);
  const drawX = Math.round((pageW - drawW) / 2);
  const drawY = Math.round((pageH - drawH) / 2);

  const imgLen = jpegBuf.length;

  // Buduj obiekty PDF
  const lines = [];
  const offsets = [];

  const push = (s) => lines.push(s);

  push('%PDF-1.4');
  push('%\xE2\xE3\xCF\xD3'); // binary comment (4 bytes > 127)

  // Obiekt 1: Catalog
  offsets[1] = lines.join('\n').length + 1;
  push('');
  push('1 0 obj');
  push('<< /Type /Catalog /Pages 2 0 R >>');
  push('endobj');

  // Obiekt 2: Pages
  offsets[2] = lines.join('\n').length + 1;
  push('');
  push('2 0 obj');
  push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  push('endobj');

  // Obiekt 3: Page
  offsets[3] = lines.join('\n').length + 1;
  push('');
  push('3 0 obj');
  push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}]`);
  push(`   /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>`);
  push('endobj');

  // Obiekt 4: Content stream
  const contentStr = `q ${drawW} 0 0 ${drawH} ${drawX} ${drawY} cm /Im1 Do Q`;
  const contentLen = contentStr.length;
  offsets[4] = lines.join('\n').length + 1;
  push('');
  push('4 0 obj');
  push(`<< /Length ${contentLen} >>`);
  push('stream');
  push(contentStr);
  push('endstream');
  push('endobj');

  // Obiekt 5: Image XObject (JPEG) — musimy doklejać jako Buffer
  const headerStr = lines.join('\n');
  offsets[5] = headerStr.length + 1;

  const imgHeader = [
    '',
    '5 0 obj',
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH}`,
    `   /ColorSpace /DeviceRGB /BitsPerComponent 8`,
    `   /Filter /DCTDecode /Length ${imgLen} >>`,
    'stream',
    '',
  ].join('\n');

  const imgFooter = [
    '\nendstream',
    'endobj',
    '',
  ].join('\n');

  // Cross-reference table
  const xrefOffset = headerStr.length + imgHeader.length + imgLen + imgFooter.length;

  const xref = [
    'xref',
    `0 6`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size 6 /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n');

  return Buffer.concat([
    Buffer.from(headerStr, 'binary'),
    Buffer.from(imgHeader, 'binary'),
    jpegBuf,
    Buffer.from(imgFooter, 'binary'),
    Buffer.from(xref, 'binary'),
  ]);
}
