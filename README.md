# Kıssahanem Zikir Halkası

TikTok LIVE için etkileşimli zikir oyunu. İzleyiciler zikir yazınca halkaya katılır, jeton gönderenlerin adı dua kartıyla ekrana gelir.

- Oyun: `public/index.html` (müzik ve efektler kodla üretilir, sesli dualar `public/sesler.js` içinde)
- Köprü: `server.js` — TikTok yayınını okuyup oyuna iletir

## Render ayarları
- Build Command: `npm install`
- Start Command: `npm start`
- Ortam değişkeni: `TIKTOK_USER` = `kissahanem`

Oyun adresi: Render'ın verdiği adres (otomatik olarak `/oyun?canli` sayfasına yönlenir).
Test butonları için: `/oyun?canli&test`
