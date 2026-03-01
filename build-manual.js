/**
 * FotoNatura — generator instrukcji obsługi w PDF
 * Używa pdfkit + czcionki Ubuntu (obsługa polskich znaków)
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Czcionki z obsługą polskich znaków
const FONT_DIR = '/usr/share/fonts/truetype/ubuntu';
const FONT_R  = path.join(FONT_DIR, 'Ubuntu-R.ttf');
const FONT_B  = path.join(FONT_DIR, 'Ubuntu-B.ttf');
const FONT_RI = path.join(FONT_DIR, 'Ubuntu-RI.ttf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 55, bottom: 55, left: 60, right: 60 },
  info: {
    Title: 'FotoNatura — Instrukcja obsługi',
    Author: 'Marek Zettel',
    Subject: 'Automatyczny retusz zdjęć',
    Keywords: 'fotonatura, retusz, zdjęcia, instrukcja',
  },
});

const OUT = path.join(__dirname, 'dist', 'FotoNatura_Instrukcja.pdf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
doc.pipe(fs.createWriteStream(OUT));

// ── helpers ──────────────────────────────────────────────────────────────────

const W   = doc.page.width  - 120; // szerokość tekstu
const COL = '#c8602a';             // akcent (pomarańcz)
const DARK = '#2c1e12';
const MUTED = '#7a6050';

function reg(size)  { return doc.font(FONT_R).fontSize(size).fillColor(DARK); }
function bold(size) { return doc.font(FONT_B).fontSize(size).fillColor(DARK); }
function ital(size) { return doc.font(FONT_RI).fontSize(size).fillColor(MUTED); }

function hline(y) {
  const yy = y || doc.y;
  doc.moveTo(60, yy).lineTo(535, yy).strokeColor('#e8d5c0').lineWidth(1).stroke();
}

function newPage() {
  doc.addPage();
  // Stopka
  doc.font(FONT_R).fontSize(10).fillColor(MUTED)
    .text('FotoNatura — Instrukcja obsługi   |   Autor: Marek Zettel', 60, 790, { width: W, align: 'center' });
}

function chapter(num, title) {
  if (doc.y > 680) newPage();
  doc.moveDown(1.2);
  doc.rect(58, doc.y - 4, 4, 28).fill(COL);
  bold(19).fillColor(COL).text(`${num}. ${title}`, 70, doc.y - 4, { width: W });
  doc.fillColor(DARK);
  doc.moveDown(0.4);
  hline();
  doc.moveDown(0.5);
}

function section(title) {
  if (doc.y > 710) newPage();
  doc.moveDown(0.8);
  bold(13).fillColor('#a84d20').text(title, { width: W });
  doc.fillColor(DARK);
  doc.moveDown(0.2);
}

function para(text, opts = {}) {
  reg(12).text(text, { width: W, align: 'justify', lineGap: 3, ...opts });
  doc.moveDown(0.4);
}

function bullet(items) {
  items.forEach(item => {
    reg(12).text(`•  ${item}`, { width: W - 20, indent: 12, lineGap: 2 });
  });
  doc.moveDown(0.4);
}

function tip(text) {
  const y = doc.y;
  doc.rect(60, y, W, 40).fill('#fff8f0');
  doc.rect(60, y, 3, 40).fill(COL);
  ital(11).text(`💡  ${text}`, 72, y + 8, { width: W - 20 });
  doc.x = 60;
  doc.moveDown(1.0);
}

function tableRow(cells, bold_ = false) {
  const colW = cells.length === 3 ? [80, 80, W - 165] : [160, W - 165];
  let x = 60, yStart = doc.y;
  cells.forEach((cell, i) => {
    (bold_ ? bold(11) : reg(11)).text(cell, x + 4, yStart + 4, { width: colW[i] - 8 });
    x += colW[i];
  });
  doc.y = yStart + 22;
  doc.x = 60;
  doc.moveTo(60, doc.y).lineTo(60 + W, doc.y).strokeColor('#e8d5c0').lineWidth(0.5).stroke();
}

// ── STRONA TYTUŁOWA ──────────────────────────────────────────────────────────

// Tło nagłówka
doc.rect(0, 0, doc.page.width, 260).fill('#c8602a');

// Logo tekstowe
doc.font(FONT_B).fontSize(52).fillColor('#ffffff')
  .text('FotoNatura', 60, 60, { width: W, align: 'center' });
doc.font(FONT_R).fontSize(20).fillColor('rgba(255,255,255,0.85)')
  .text('Automatyczny retusz zdjęć dla każdego', 60, 125, { width: W, align: 'center' });

doc.font(FONT_R).fontSize(13).fillColor('rgba(255,255,255,0.70)')
  .text('wersja 1.0', 60, 165, { width: W, align: 'center' });

// Sekcja poniżej tła
doc.fillColor(DARK);
doc.y = 290;

bold(15).text('Instrukcja obsługi i instalacji', { width: W, align: 'center' });
doc.moveDown(0.3);
reg(12).fillColor(MUTED).text('Kompletny przewodnik krok po kroku', { width: W, align: 'center' });
doc.moveDown(2);

// Info box
doc.rect(60, doc.y, W, 80).fill('#fff8f0').stroke('#e8d5c0');
const iy = doc.y + 14;
bold(11).fillColor(COL).text('Informacje o aplikacji', 80, iy, { width: W - 40 });
reg(10).fillColor(DARK).text('Autor: Marek Zettel', 80, iy + 18, { width: 200 });
reg(10).text('System: Windows / Linux', 80, iy + 32, { width: 250 });
reg(10).text('Licencja: Do użytku prywatnego', 80, iy + 46, { width: 250 });
doc.y += 96;

doc.moveDown(1.5);
ital(11).fillColor(MUTED)
  .text('FotoNatura to bezpłatna aplikacja desktopowa przeznaczona dla osób, które chcą szybko\n' +
        'i łatwo poprawić jakość swoich zdjęć bez potrzeby posiadania specjalistycznej wiedzy.', { width: W, align: 'center' });

// Stopka strony tytułowej
doc.font(FONT_R).fontSize(10).fillColor(MUTED)
  .text('FotoNatura — Instrukcja obsługi   |   Autor: Marek Zettel', 60, 790, { width: W, align: 'center' });

// ── SPIS TREŚCI ───────────────────────────────────────────────────────────────

newPage();
bold(20).fillColor(COL).text('Spis treści', { width: W });
hline(doc.y + 5);
doc.moveDown(0.8);

const toc = [
  ['1.', 'Wymagania systemowe',                '3'],
  ['2.', 'Instalacja',                          '3'],
  ['   2.1', 'Windows',                         '3'],
  ['   2.2', 'Linux',                           '4'],
  ['3.', 'Pierwsze uruchomienie',               '4'],
  ['4.', 'Interfejs aplikacji',                 '5'],
  ['5.', 'Wczytywanie zdjęć',                  '5'],
  ['6.', 'Profile retuszu',                     '6'],
  ['7.', 'Suwaki regulacji',                    '7'],
  ['8.', 'Auto korekta',                        '8'],
  ['9.', 'Histogram i poziomy',                 '8'],
  ['10.', 'Kadrowanie zdjęcia',                '9'],
  ['11.', 'Podpis na zdjęciu',                 '10'],
  ['12.', 'Ulubione ustawienia',               '11'],
  ['13.', 'Porównanie przed / po',             '11'],
  ['14.', 'Zapisywanie i eksport',             '12'],
  ['15.', 'Rozwiązywanie problemów',           '13'],
];
toc.forEach(([num, title, page]) => {
  const isSection = num.startsWith(' ');
  const font = isSection ? FONT_R : FONT_B;
  const size = isSection ? 11 : 12;
  const color = isSection ? MUTED : DARK;
  const indent = isSection ? 20 : 0;
  const startY = doc.y;

  doc.font(font).fontSize(size).fillColor(color)
    .text(num.trim(), 65 + indent, startY, { width: 28, lineBreak: false });

  doc.font(font).fontSize(size).fillColor(color)
    .text(title, 95 + indent, startY, { width: W - 70 - indent });
  const afterTitle = doc.y;

  doc.font(FONT_R).fontSize(size).fillColor(color)
    .text(page, 60 + W - 30, startY, { width: 30, align: 'right', lineBreak: false });

  doc.x = 60;
  doc.y = afterTitle;
  doc.moveDown(0.15);
});

// ── ROZDZIAŁ 1 ─────────────────────────────────────────────────────────────

newPage();
chapter(1, 'Wymagania systemowe');

tableRow(['System', 'Wymagania'], true);
tableRow(['Windows', 'Windows 10 lub nowszy, 64-bit']);
tableRow(['Linux', 'Ubuntu 20.04+ lub inna dystrybucja z GTK 3']);
tableRow(['Pamięć RAM', 'Minimum 2 GB (zalecane 4 GB)']);
tableRow(['Dysk', 'Minimum 200 MB wolnego miejsca']);
tableRow(['Procesor', 'Intel/AMD 64-bit']);

doc.moveDown(0.8);
tip('Aplikacja nie wymaga połączenia z Internetem — całe przetwarzanie odbywa się lokalnie na Twoim komputerze.');

para('Do otwarcia zdjęć RAW (CR2, NEF, ARW itp.) wymagane jest zainstalowanie programu dcraw — '
   + 'bezpłatnego narzędzia konwertującego pliki RAW. Zdjęcia HEIC (iPhone) są obsługiwane bez '
   + 'dodatkowych narzędzi.');

// ── ROZDZIAŁ 2 ─────────────────────────────────────────────────────────────

chapter(2, 'Instalacja');

section('2.1  Windows');
para('Pobierz plik FotoNatura Setup 1.0.0.exe i uruchom go dwukrotnym kliknięciem. '
   + 'Instalator przeprowadzi Cię przez proces krok po kroku.');
bullet([
  'Kliknij „Dalej" na ekranie powitalnym instalatora.',
  'Wybierz folder docelowy (domyślnie: C:\\Program Files\\FotoNatura).',
  'Zaznacz opcje skrótów (Pulpit, Menu Start) według potrzeb.',
  'Kliknij „Zainstaluj" — instalacja trwa około 30 sekund.',
  'Po zakończeniu kliknij „Zakończ". Aplikacja uruchomi się automatycznie.',
]);
tip('Jeśli Windows wyświetli komunikat SmartScreen — kliknij „Więcej informacji" i wybierz „Uruchom mimo to". Aplikacja jest bezpieczna.');

para('Aby odinstalować FotoNatura, przejdź do Panel sterowania → Programy → Odinstaluj program, '
   + 'zaznacz FotoNatura i kliknij Odinstaluj.');

section('2.2  Linux');
para('Dostępne są dwa formaty instalacji: plik AppImage (działa na każdej dystrybucji) '
   + 'oraz pakiet .deb (dla systemów Debian/Ubuntu).');

bold(11).text('Metoda 1 — AppImage (zalecana, wszystkie dystrybucje):');
doc.moveDown(0.2);
bullet([
  'Pobierz plik FotoNatura-1.0.0.AppImage',
  'Otwórz terminal i przejdź do folderu z plikiem:',
]);
doc.font(FONT_R).fontSize(10).fillColor('#2c1e12')
  .rect(60, doc.y, W, 28).fill('#f0f0f0')
  .fillColor('#333')
  .text('  chmod +x FotoNatura-1.0.0.AppImage\n  ./FotoNatura-1.0.0.AppImage', 68, doc.y + 6, { lineGap: 2 });
doc.y += 36;
doc.x = 60;
bullet(['Plik można też uruchomić dwukrotnym kliknięciem (jeśli dystrybucja obsługuje AppImage).']);

doc.moveDown(0.5);
bold(11).text('Metoda 2 — pakiet DEB (Ubuntu, Debian, Mint):');
doc.moveDown(0.2);
doc.rect(60, doc.y, W, 18).fill('#f0f0f0').fillColor('#333')
  .text('  sudo dpkg -i fotonatura_1.0.0_amd64.deb', 68, doc.y + 4);
doc.y += 26;
doc.x = 60;

doc.moveDown(0.4);
tip('Aby obsłużyć zdjęcia RAW na Linuksie: sudo apt install dcraw');

// ── ROZDZIAŁ 3 ─────────────────────────────────────────────────────────────

newPage();
chapter(3, 'Pierwsze uruchomienie');

para('Po uruchomieniu FotoNatura zobaczysz ekran powitalny z obszarem do przeciągania zdjęcia. '
   + 'Aplikacja nie wymaga żadnej konfiguracji — jest gotowa do pracy od razu.');
bullet([
  'Pasek nagłówka (górny) — zawiera logo, komunikaty statusu i przełącznik motywu (jasny/ciemny).',
  'Panel boczny (lewy) — wszystkie narzędzia retuszu.',
  'Obszar podglądu (prawy) — wyświetla zdjęcie w czasie rzeczywistym.',
]);
tip('Skróty klawiaturowe nie są wymagane — aplikacja jest w pełni obsługiwana myszką i ekranem dotykowym.');

// ── ROZDZIAŁ 4 ─────────────────────────────────────────────────────────────

chapter(4, 'Interfejs aplikacji');

para('Interfejs FotoNatura podzielony jest na trzy główne obszary:');

section('Panel boczny — sekcje');
tableRow(['Sekcja', 'Opis'], true);
tableRow(['1. Wczytaj zdjęcie', 'Przycisk otwierania i zamykania zdjęcia']);
tableRow(['⭐ Moje ustawienia', 'Zapisane zestawy ustawień retuszu (presety)']);
tableRow(['2. Styl retuszu', 'Profile, suwaki i narzędzia korekcji']);
tableRow(['✍️ Podpis na zdjęciu', 'Dodawanie tekstu/podpisu na zdjęcie']);
tableRow(['3. Zapisz zdjęcie', 'Eksport do JPG, PNG lub PDF']);

doc.moveDown(0.8);
section('Motyw jasny / ciemny');
para('Kliknij przycisk 🌙 / ☀️ w prawym górnym rogu nagłówka, aby przełączyć między '
   + 'motywem jasnym (kremowym) a ciemnym. Preferencja jest zapamiętywana między sesjami.');

// ── ROZDZIAŁ 5 ─────────────────────────────────────────────────────────────

newPage();
chapter(5, 'Wczytywanie zdjęć');

section('Obsługiwane formaty');
tableRow(['Kategoria', 'Formaty plików'], true);
tableRow(['Standardowe', 'JPG / JPEG, PNG, WebP, BMP']);
tableRow(['iPhone (HEIC)', 'HEIC, HEIF']);
tableRow(['Aparat RAW', 'CR2, CR3, NEF, ARW, DNG, ORF, RW2, RAF, PEF i inne']);

doc.moveDown(0.5);
section('Metody wczytywania');
bold(11).text('Metoda 1 — przycisk „Otwórz zdjęcie":');
doc.moveDown(0.2);
para('Kliknij przycisk „📂 Otwórz zdjęcie" w sekcji 1. Otworzy się okno systemowe wyboru pliku. '
   + 'Możesz filtrować według kategorii (standardowe / HEIC / RAW).');

bold(11).text('Metoda 2 — przeciąganie (Drag & Drop):');
doc.moveDown(0.2);
para('Przeciągnij plik zdjęcia bezpośrednio z Eksploratora plików na obszar podglądu. '
   + 'Obsługiwane są wszystkie formaty wymienione powyżej.');
tip('Przy wczytywaniu zdjęcia RAW (np. CR2, NEF) aplikacja wyciąga wbudowany podgląd JPEG z pliku RAW — wymaga zainstalowanego programu dcraw.');

section('Zamykanie zdjęcia');
para('Kliknij „✕ Zamknij bez zapisywania" (widoczny po wczytaniu zdjęcia, tuż pod przyciskiem „Otwórz zdjęcie"). '
   + 'Aplikacja poprosi o potwierdzenie, zanim usunie niezapisane zmiany.');

// ── ROZDZIAŁ 6 ─────────────────────────────────────────────────────────────

chapter(6, 'Profile retuszu');

para('Profile to gotowe zestawy korekt kolorystycznych i tonalnych, zoptymalizowane pod różne typy zdjęć. '
   + 'Kliknij wybrany profil, a efekt pojawi się natychmiast w podglądzie.');

tableRow(['Profil', 'Opis i przeznaczenie'], true);
tableRow(['🌿 Naturalny', 'Subtelna korekta, zachowuje autentyczność zdjęcia. Idealny do portretów i codziennych zdjęć.']);
tableRow(['🌅 Ciepły', 'Wzmacnia ciepłe tony — idealne dla zdjęć zachodu słońca, jesieni, wspomnień z wakacji.']);
tableRow(['🌈 Żywe kolory', 'Mocne nasycenie kolorów, lekko chłodniejszy błękit. Świetny dla przyrody i krajobrazów.']);
tableRow(['⬛ Czarno-białe', 'Konwersja do szarości z zachowaniem dramatyzmu. Idealne dla portretów artystycznych.']);
tableRow(['🟤 Sepia', 'Ciepły brązowy ton — retro, nostalgiczny. Świetny dla starych zdjęć i portretów.']);
tableRow(['⚡ HDR', 'Wyrównanie ekspozycji, mocny kontrast i saturacja. Polecany dla architektury i krajobrazów.']);

doc.moveDown(0.8);
tip('Profil możesz zmienić w dowolnym momencie. Zmiany działają natychmiast — bez ponownego wczytywania zdjęcia.');

// ── ROZDZIAŁ 7 ─────────────────────────────────────────────────────────────

newPage();
chapter(7, 'Suwaki regulacji');

section('Intensywność retuszu (0%–100%)');
para('Kontroluje siłę wszystkich efektów profilu retuszu jednocześnie. '
   + 'Przy wartości 0% efekty są niewidoczne, przy 100% — maksymalne. '
   + 'Domyślna wartość to 65%, co daje naturalny, przyjemny efekt dla większości zdjęć.');

section('Jasność / Ciemność (-100 do +100)');
para('Reguluje ogólną jasność zdjęcia niezależnie od retuszu. '
   + 'Wartości ujemne (minus) ściemniają obraz, wartości dodatnie (plus) go rozjaśniają. '
   + 'Korekta jest addytywna i działa jako pierwsza w potoku przetwarzania.');
tip('Do korekcji prześwietlonych i niedoświetlonych obszarów lepiej użyj suwaka Półcienie w sekcji Poziomy.');

section('Suwaki Poziomów');
para('Sekcja Poziomów oferuje precyzyjną kontrolę zakresu tonalnego:');

tableRow(['Suwak', 'Zakres', 'Działanie'], true);
const lvlRows = [
  ['Cienie', '0–254', 'Czarny punkt wejściowy — wartości poniżej tego progu staną się czarne (pełna czerń). Zwiększenie usuwa szarość z cieni.'],
  ['Światła', '1–255', 'Biały punkt wejściowy — wartości powyżej tego progu staną się białe (pełna biel). Zmniejszenie usuwa zadymienie w jasnych obszarach.'],
  ['Półcienie', '-100 do +100', 'Korekcja gamma środkowych tonów. Wartości dodatnie (+) rozjaśniają półcienie, ujemne (-) je przyciemniają, bez dotykania czerni i bieli.'],
];
lvlRows.forEach(r => {
  doc.rect(60, doc.y, W, 38).fill(doc.y % 76 < 38 ? '#fffaf5' : '#ffffff');
  const sy = doc.y + 4;
  [60, 140, 220].forEach((x, i) => {
    bold(i === 0 ? 11 : 10).fillColor(i === 0 ? COL : DARK)
      .text(r[i], x + 4, sy, { width: (i === 2 ? W - 165 : 75) - 8 });
  });
  doc.y += 46;
  doc.x = 60;
});

doc.moveDown(0.4);
para('Przycisk „↺ Zeruj poziomy" przywraca domyślne wartości (cienie: 0, światła: 255, półcienie: 0).');

// ── ROZDZIAŁ 8 ─────────────────────────────────────────────────────────────

chapter(8, 'Auto korekta');

para('Funkcja Auto korekty analizuje histogram zdjęcia i automatycznie dobiera optymalne ustawienia poziomów.');
bold(11).text('Jak działa Auto korekta:');
doc.moveDown(0.2);
bullet([
  'Czarny punkt: wyznaczany na 1,5 percentylu luminancji (usuwa nienaturalne szarości w cieniach).',
  'Biały punkt: wyznaczany na 98,5 percentylu luminancji (usuwa zadymienie w jasnych partiach).',
  'Gamma półcieni: koryguje automatycznie jeśli średnia jasność zdjęcia odbiega od optymalnej.',
  'Wyniki są widoczne na suwakach Poziomów — możesz je dalej ręcznie dostroić.',
]);
tip('Auto korekta działa najlepiej jako punkt startowy. Po jej zastosowaniu możesz ręcznie doprecyzować suwaki Cienie, Światła i Półcienie.');

// ── ROZDZIAŁ 9 ─────────────────────────────────────────────────────────────

newPage();
chapter(9, 'Histogram i poziomy');

para('Histogram wyświetlany nad suwakami Poziomów pokazuje rozkład jasności pikseli w oryginalnym zdjęciu. '
   + 'Pomaga ocenić ekspozycję i ustawić optymalne wartości poziomów.');

section('Elementy histogramu');
bullet([
  'Szary obszar — luminancja (ogólna jasność).',
  'Czerwony obszar — kanał czerwony (R).',
  'Zielony obszar — kanał zielony (G).',
  'Niebieski obszar — kanał niebieski (B).',
  'Pionowa linia pomarańczowa — aktualna pozycja czarnego punktu (Cienie).',
  'Pionowa linia niebieska — aktualna pozycja białego punktu (Światła).',
  'Przerywana żółta linia — punkt gammy (półcieni).',
  'Czerwone zaciemnienie po lewej — obszar przycinany przez cienie.',
  'Niebieskie zaciemnienie po prawej — obszar przycinany przez światła.',
]);
para('Histogram używa skali logarytmicznej, dzięki czemu zarówno rzadkie jak i częste wartości są dobrze widoczne.');
tip('Dobra ekspozycja to histogram, którego słupki rozciągają się od lewej do prawej krawędzi, bez dużych przerw. Jeśli histogram jest skupiony po jednej stronie, użyj suwaków Cienie/Światła lub Auto korekty.');

// ── ROZDZIAŁ 10 ────────────────────────────────────────────────────────────

chapter(10, 'Kadrowanie zdjęcia');

para('Narzędzie kadrowania pozwala wybrać i zachować tylko wybrany fragment zdjęcia. '
   + 'Kadrowanie modyfikuje oryginał w pamięci, nie na dysku — plik jest nadpisywany dopiero po zapisaniu.');

section('Jak kadrować:');
bullet([
  'Kliknij przycisk „✂️ Kadruj zdjęcie" — pojawi się siatka z uchwytami.',
  'Przeciągnij narożniki lub krawędzie, aby zmienić obszar kadru.',
  'Kliknij poza kadrem i przeciągnij, aby narysować nowy kadr od zera.',
  'Siatka reguły trójpodziału pomaga skomponować kadr (linie 1/3).',
  'Kliknij „✓ Zastosuj" aby zastosować kadrowanie.',
  'Kliknij „✕ Anuluj" aby anulować bez zmian.',
]);

section('Cofanie kadrowania:');
para('Po zastosowaniu kadru pojawia się przycisk „↩️ Cofnij kadrowanie" — kliknij go, '
   + 'aby przywrócić poprzedni, szerszy kadr. Możesz cofać wielokrotnie, jeśli kadrowałeś kilka razy.');
tip('W prawym dolnym rogu kadru wyświetlają się jego aktualne wymiary w pikselach.');

// ── ROZDZIAŁ 11 ────────────────────────────────────────────────────────────

newPage();
chapter(11, 'Podpis na zdjęciu');

para('Funkcja podpisu pozwala dodać dowolny tekst bezpośrednio na zdjęcie — '
   + 'np. datę, lokalizację, imię, cytat lub prawa autorskie.');

section('Opcje podpisu:');
tableRow(['Opcja', 'Opis'], true);
tableRow(['Tekst podpisu', 'Wpisz dowolny tekst (do 80 znaków)']);
tableRow(['Czcionka', '6 czcionek do wyboru: Segoe UI, Georgia, Verdana, Arial, Courier, Impact']);
tableRow(['Rozmiar', 'Mały (24px), Średni (36px), Duży (52px), Bardzo duży (72px)']);
tableRow(['Kolor', 'Biały, czarny, żółty, czerwony, niebieski']);
tableRow(['Pozycja', '9-pozycyjna siatka: 3 × 3 (rogi, krawędzie, środek)']);

doc.moveDown(0.5);
section('Przesuwanie i zmiana rozmiaru myszką:');
bullet([
  'Kliknij i przeciągnij tekst, aby zmienić jego pozycję.',
  'Kliknij i przeciągnij pomarańczowy kwadracik (⇲) w prawym dolnym rogu tekstu, aby zmienić rozmiar czcionki.',
  'Tekst jest wypalany na zdjęciu dopiero w momencie zapisywania — do tego czasu możesz go edytować.',
]);
tip('Tekst z cieniem (shadow) jest zawsze dobrze widoczny niezależnie od jasności tła zdjęcia.');

// ── ROZDZIAŁ 12 ────────────────────────────────────────────────────────────

chapter(12, 'Ulubione ustawienia (presety)');

para('Presety pozwalają zapisać kombinację profilu retuszu i intensywności jako nazwany zestaw, '
   + 'który można szybko zastosować do kolejnych zdjęć.');
section('Jak zapisać preset:');
bullet([
  'Ustaw wybrany profil i intensywność retuszu.',
  'Wpisz nazwę ustawienia w polu „Nazwa ustawienia…".',
  'Kliknij 💾 lub naciśnij Enter — preset pojawi się na liście.',
  'Możesz zapisać maksymalnie 8 presetów.',
]);
section('Jak zastosować preset:');
para('Kliknij nazwę presetu na liście — profil i intensywność zmienią się natychmiast, '
   + 'a zdjęcie zostanie ponownie przetworzone. Możesz potem jeszcze dostroić ustawienia.');
section('Jak usunąć preset:');
para('Kliknij przycisk ✕ obok nazwy presetu. Usunięcie jest nieodwracalne.');

// ── ROZDZIAŁ 13 ────────────────────────────────────────────────────────────

newPage();
chapter(13, 'Porównanie przed / po');

para('Tryb porównania pozwala zobaczyć efekty retuszu obok oryginalnego zdjęcia — rozdzielone pionową linią.');
bullet([
  'Włącz przełącznik „Porównaj przed / po" w sekcji kontrolek.',
  'Linia podziału pojawia się na środku zdjęcia.',
  'Przeciągnij linię myszką, aby przesunąć punkt podziału.',
  'Lewa strona pokazuje oryginał, prawa — po retuszu.',
  'Wyłącz przełącznik, aby wrócić do normalnego podglądu.',
]);
tip('W trybie porównania przeciąganie tekstu jest wyłączone — aby edytować podpis, wyłącz tryb porównania.');

// ── ROZDZIAŁ 14 ────────────────────────────────────────────────────────────

chapter(14, 'Zapisywanie i eksport');

section('Zapis jako JPG lub PNG:');
para('Kliknij „💾 Zapisz zdjęcie". Otworzy się okno systemowe — wybierz folder i format:');
bullet([
  'JPEG (.jpg) — mniejszy plik, dobra jakość dla fotografii.',
  'PNG (.png) — większy plik, lossless, lepszy dla tekstu i grafiki.',
]);
para('Podpis (jeśli dodany) jest automatycznie wypalany na zapisywanym zdjęciu.');

section('Eksport do PDF:');
para('Kliknij „📄 Eksportuj do PDF". Zdjęcie zostanie osadzone w pliku PDF formatu A4 '
   + '(z zachowaniem proporcji i marginesem 20 pt). Plik PDF można drukować lub wysyłać e-mailem.');
tip('Eksport PDF jest idealny do drukowania zdjęć lub wysyłania jako dokumenty — np. zdjęcia z uroczystości czy wycieczek.');

section('Cofanie zmian:');
para('Kliknij „↩️ Cofnij wszystko" aby przywrócić wszystkie ustawienia do wartości domyślnych '
   + '(profile, jasność, poziomy, tekst). Oryginalne zdjęcie w pamięci pozostaje niezmienione.');

// ── ROZDZIAŁ 15 ────────────────────────────────────────────────────────────

newPage();
chapter(15, 'Rozwiązywanie problemów');

section('Zdjęcie wygląda zamglenie / szaro po retuszu');
bullet([
  'Sprawdź suwak Intensywność retuszu — obniż wartość do 40–60%.',
  'Sprawdź suwaki Cienie i Światła w sekcji Poziomy — przywróć do wartości 0 i 255.',
  'Kliknij „↩️ Cofnij wszystko" aby zresetować wszystkie ustawienia.',
]);

section('Nie mogę otworzyć pliku RAW (CR2, NEF itp.)');
bullet([
  'Zainstaluj program dcraw:',
  '  Ubuntu/Debian: sudo apt install dcraw',
  '  Windows: pobierz dcraw.exe i umieść go w ścieżce systemowej PATH.',
  'Następnie uruchom FotoNatura ponownie.',
]);

section('Zdjęcie HEIC nie otwiera się');
bullet([
  'Format HEIC jest obsługiwany wbudowanie — nie wymaga dodatkowych narzędzi.',
  'Upewnij się, że plik nie jest uszkodzony.',
  'Spróbuj użyć przycisku „Otwórz zdjęcie" zamiast przeciągania.',
]);

section('Aplikacja nie uruchamia się na Linuksie');
bullet([
  'Nadaj plik AppImage uprawnienia do wykonywania: chmod +x FotoNatura*.AppImage',
  'Upewnij się, że biblioteka FUSE jest zainstalowana: sudo apt install fuse libfuse2',
  'Spróbuj uruchomić z terminala: ./FotoNatura*.AppImage --no-sandbox',
]);

section('Drukowanie (Windows SmartScreen)');
para('Jeśli Windows blokuje instalator: kliknij „Więcej informacji" → „Uruchom mimo to". '
   + 'Komunikat pojawia się dla nowych aplikacji bez certyfikatu podpisu kodu (Code Signing Certificate).');

// ── STOPKA DOKUMENTU ────────────────────────────────────────────────────────

doc.moveDown(2);
hline();
doc.moveDown(0.5);
ital(10).fillColor(MUTED)
  .text('FotoNatura v1.0.0  ·  Autor: Marek Zettel  ·  Wszelkie prawa zastrzeżone\n'
      + 'Aplikacja nie zbiera żadnych danych. Całe przetwarzanie odbywa się lokalnie.',
       { width: W, align: 'center' });

doc.end();
console.log(`✓  ${OUT}`);
