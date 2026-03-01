# FotoNatura

**Automatyczny retusz zdjęć dla każdego**

FotoNatura to bezpłatna aplikacja desktopowa do szybkiej poprawy jakości zdjęć. Działa w pełni lokalnie — nie wymaga połączenia z Internetem ani konta użytkownika.

---

## Funkcje

- **Profile retuszu** — Naturalny, Ciepły, Żywe kolory, Czarno-białe, Sepia, HDR
- **Suwaki regulacji** — intensywność, jasność, cienie, światła, półcienie
- **Auto korekta** — automatyczne dopasowanie poziomów na podstawie histogramu
- **Histogram** — podgląd rozkładu jasności z zaznaczeniem punktów przycinania
- **Kadrowanie** — interaktywne z siatką reguły trójpodziału i możliwością cofania
- **Podpis na zdjęciu** — tekst z wyborem czcionki, rozmiaru, koloru i pozycji
- **Presety** — zapisywanie i szybkie stosowanie ulubionych ustawień (do 8 zestawów)
- **Porównanie przed / po** — suwak podziału ekranu
- **Eksport** — JPG, PNG lub PDF (format A4)
- **Obsługiwane formaty** — JPG, PNG, WebP, BMP, HEIC/HEIF (iPhone), RAW (CR2, NEF, ARW, DNG i inne)
- **Motyw jasny / ciemny**

---

## Pobieranie

Przejdź do sekcji [**Releases**](../../releases/latest) i pobierz instalator dla swojego systemu:

| System | Plik | Opis |
|--------|------|------|
| Windows | `FotoNatura Setup 1.0.0.exe` | Instalator NSIS |
| Windows | `FotoNatura 1.0.0.exe` | Wersja portable (bez instalacji) |
| Linux | `FotoNatura-1.0.0.AppImage` | Działa na każdej dystrybucji |
| Linux | `fotonatura_1.0.0_amd64.deb` | Pakiet dla Debian/Ubuntu/Mint |
| — | `FotoNatura_Instrukcja.pdf` | Instrukcja obsługi i instalacji |

---

## Instalacja

### Windows
Uruchom `FotoNatura Setup 1.0.0.exe` i postępuj zgodnie z kreatorem.
Jeśli Windows wyświetli ostrzeżenie SmartScreen — kliknij **Więcej informacji → Uruchom mimo to**.

### Linux — AppImage
```bash
chmod +x FotoNatura-1.0.0.AppImage
./FotoNatura-1.0.0.AppImage
```

### Linux — pakiet DEB
```bash
sudo dpkg -i fotonatura_1.0.0_amd64.deb
```

---

## Wymagania systemowe

| | Wymagania |
|---|---|
| Windows | Windows 10 lub nowszy, 64-bit |
| Linux | Ubuntu 20.04+ lub dystrybucja z GTK 3 |
| RAM | Minimum 2 GB (zalecane 4 GB) |
| Dysk | Minimum 200 MB wolnego miejsca |
| Procesor | Intel/AMD 64-bit |

### Obsługa zdjęć RAW
Do otwierania plików RAW wymagany jest program **dcraw**:
- **Linux:** `sudo apt install dcraw`
- **Windows:** pobierz `dcraw.exe` i umieść go w ścieżce systemowej PATH

Zdjęcia HEIC (iPhone) są obsługiwane bez dodatkowych narzędzi.

---

## Zbudowany przy użyciu

- [Electron](https://www.electronjs.org/) — framework desktop
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) — silnik przetwarzania obrazu
- [heic-convert](https://github.com/catdad-experiments/heic-convert) — obsługa HEIC
- [electron-builder](https://www.electron.build/) — pakowanie instalatorów

---

## Autor

**Marek Zettel** · Licencja: Do użytku prywatnego
