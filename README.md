# Musiverse

Modern PWA müzik oynatıcısı. Dikey (mobil öncelikli) arayüz.

## Özellikler
- Şarkı ekleme (cihazdan, IndexedDB ile saklanır)
- Oynat / Durdur, Önceki / Sonraki, Karıştır, Tekrar, Ses ve ilerleme çubuğu
- Medya Oturumu (Media Session) desteği
- PWA: Sadece Android cihazlarda çalışır. Neden IOS cihazlarda çalışmamasının sebebi Apple'ın kendi Safari veya başka bir tarayıcının arkaplanda çalışmasının engellemesidir.

## Nasıl Çalıştırılır?
- [app.bat] dosyasını çalıştırıp açılan tarayıcı sayfasından test edebilirsiniz.

## Yerelde çalıştır
```bash
python -m http.server 8080
# veya
npx serve .
```
Tarayıcıda `http://localhost:8080` aç.

## İkonlar
`icons/` klasöründe 192 ve 512px PNG bulunur. Yerleşik ikonları beğenmezsen kendin üretip aynı isimle değiştir.
