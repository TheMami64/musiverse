# Musiverse 🎵

> Modern PWA müzik oynatıcısı (Mobil öncelikli dikey arayüz).

![Status](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue.svg)

**Musiverse**, YouTube Data API altyapısını kullanan ve aynı zamanda cihazında yerel müzik saklamanı sağlayan açık kaynaklı modern bir web müzik oynatıcı projesidir[cite: 1].

---

## ✨ Özellikler

* **YouTube Entegrasyonu:** YouTube Data API anahtarınız ile arama yapın ve müziklerin keyfini çıkarın[cite: 1].
* **Yerel Depolama:** Şarkıları cihazınızdan ekleyin, IndexedDB ile güvenle saklayın.
* **Zengin Oynatıcı Kontrolleri:** Oynat / Durdur, Önceki / Sonraki, Karıştır (Shuffle), Tekrar (Loop), ses ve hassas ilerleme çubuğu.
* **Medya Oturumu (Media Session):** Kilit ekranından veya bildirim panelinden medya kontrol desteği.
* **PWA Desteği:** PWA olarak kurulabilir. *(Not: Arka plan kısıtlamaları nedeniyle şu an için optimize deneyim ağırlıklı olarak Android cihazlarda tam verimli çalışmaktadır; iOS tarafında tarayıcı arka plan kısıtlamaları bulunabilmektedir.)*

---

## ⚙️ Kurulum ve Yapılandırma

Projeyi yerelinizde çalıştırmak için kendi YouTube API anahtarınızı tanımlamanız gerekmektedir[cite: 1]:

1. Repoyu klonlayın:
   ```bash
   git clone [https://github.com/TheMami64/musiverse.git](https://github.com/TheMami64/musiverse.git)
