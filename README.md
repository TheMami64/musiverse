# Musiverse

Modern PWA müzik oynatıcısı. Dikey (mobil öncelikli) arayüz.

## Özellikler
- Şarkı ekleme (cihazdan, IndexedDB ile saklanır)
- Oynat / Durdur, Önceki / Sonraki, Karıştır, Tekrar, Ses ve ilerleme çubuğu
- Medya Oturumu (Media Session) desteği
- PWA: Android & iOS'ta ana ekrana kurulabilir, offline çalışır

## Yerelde çalıştır
```bash
python -m http.server 8080
# veya
npx serve .
```
Tarayıcıda `http://localhost:8080` aç.

## Netlify'a dağıt
1. Repoyu GitHub'a push et.
2. Netlify'da **New site from Git** ile repo seç.
3. Build command boş, publish directory `site` (veya kök). Otomatik değişikliklerde deploy edilir.

Doğrudan sürükle-bırak: Netlify "Deploys" → drag & drop klasörü bırak.

## İkonlar
`icons/` klasöründe 192 ve 512px PNG bulunur. Yerleşik ikonları beğenmezsen kendin üretip aynı isimle değiştir.