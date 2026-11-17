// Kıssahanem Zikir Halkası — TikTok LIVE köprüsü
// TikTok yayınındaki yorum, hediye, beğeni ve takipleri okuyup oyun sayfasına iletir.
// Ayar: Render'da TIKTOK_USER ortam değişkenine TikTok kullanıcı adını (başında @ olmadan) yaz.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const USER = (process.env.TIKTOK_USER || 'kissahanem').replace(/^@/, '');
const PORT = process.env.PORT || 3000;
const SIGN_KEY = process.env.EULER_API_KEY || undefined; // isteğe bağlı, ücretsiz anahtar
const PAGE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
const SESLER = fs.readFileSync(path.join(__dirname, 'public', 'sesler.js'));
const ICON = fs.readFileSync(path.join(__dirname, 'public', 'icon.png'));
const MANIFEST = JSON.stringify({ name: 'Zikir Halkası', short_name: 'Zikir Halkası', start_url: '/oyun?canli', display: 'fullscreen', orientation: 'portrait', background_color: '#000000', theme_color: '#000000', icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }] });

const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(302, { Location: '/oyun?canli' }); return res.end(); }
  if (req.url.startsWith('/oyun')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(PAGE);
  }
  if (req.url.startsWith('/sesler.js')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'max-age=86400' });
    return res.end(SESLER);
  }
  if (req.url === '/icon.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(ICON); }
  if (req.url === '/manifest.json') { res.writeHead(200, { 'Content-Type': 'application/manifest+json' }); return res.end(MANIFEST); }
  if (req.url === '/saglik') { res.writeHead(200); return res.end('ok'); }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });
let lastStatus = 'Yayın bekleniyor…';
const send = (o) => { const s = JSON.stringify(o); wss.clients.forEach(c => c.readyState === 1 && c.send(s)); };
const status = (t) => { lastStatus = t; console.log(new Date().toISOString(), t); send({ type: 'status', text: t }); };
wss.on('connection', ws => ws.send(JSON.stringify({ type: 'status', text: lastStatus })));

const avatar = (u) => {
  const p = u?.profilePicture || {};
  const list = p.urls || p.url || p.urlList || [];
  return (Array.isArray(list) ? list.find(x => /\.(jpe?g|webp|png)/i.test(x)) || list[0] : list) || u?.profilePictureUrl || '';
};
const who = (d) => ({ id: d.user?.uniqueId || 'anon', name: d.user?.nickname || d.user?.uniqueId || 'Misafir', avatar: avatar(d.user) });

let conn = null, retry = null;
function start() {
  conn = new TikTokLiveConnection(USER, { processInitialData: false, enableExtendedGiftInfo: false, signApiKey: SIGN_KEY });

  conn.on(WebcastEvent.CHAT, d => send({ type: 'chat', ...who(d), text: d.comment || '' }));

  conn.on(WebcastEvent.GIFT, d => {
    const g = d.giftDetails || {};
    const type = g.giftType ?? d.giftType;
    if (type === 1 && !d.repeatEnd) return;               // seri devam ediyor, bitince say
    const unit = g.diamondCount ?? d.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1;
    const coins = Math.max(1, unit * (d.repeatCount || 1));
    send({ type: 'gift', ...who(d), gift: g.giftName || d.extendedGiftInfo?.name || 'Hediye', coins });
  });

  conn.on(WebcastEvent.LIKE, d => send({ type: 'like', ...who(d), count: d.likeCount || 1 }));
  conn.on(WebcastEvent.MEMBER, d => send({ type: 'join', ...who(d) }));
  conn.on(WebcastEvent.FOLLOW, d => send({ type: 'follow', ...who(d) }));
  conn.on(WebcastEvent.STREAM_END, () => { status('Yayın bitti, yeni yayın bekleniyor…'); schedule(); });
  conn.on(ControlEvent.DISCONNECTED, () => { status('Bağlantı koptu, tekrar deneniyor…'); schedule(); });
  conn.on(ControlEvent.ERROR, e => console.log('hata:', e?.message || e));

  conn.connect()
    .then(() => status('Canlı yayına bağlandı: @' + USER))
    .catch(e => { status('@' + USER + ' şu an canlıda değil, 20 sn sonra tekrar bakılacak'); console.log(e?.message || e); schedule(); });
}

function schedule() {
  if (retry) return;
  retry = setTimeout(() => {
    retry = null;
    try { conn && conn.removeAllListeners(); conn && conn.disconnect(); } catch (_) {}
    start();
  }, 20000);
}

server.listen(PORT, () => { console.log('Sunucu hazır, port', PORT, '— hesap: @' + USER); start(); });
