// Kıssahanem Zikir Halkası — TikTok LIVE köprüsü + oyun sunucusu
// Ayar: Render'da TIKTOK_USER ortam değişkenine TikTok kullanıcı adını (başında @ olmadan) yaz.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const USER = (process.env.TIKTOK_USER || 'kissahanem').replace(/^@/, '');
const PORT = process.env.PORT || 3000;
const SIGN_KEY = process.env.EULER_API_KEY || undefined;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.css': 'text/css' };
const MANIFEST = JSON.stringify({ name: 'Zikir Halkası', short_name: 'Zikir Halkası', start_url: '/oyun?canli', display: 'fullscreen', orientation: 'portrait', background_color: '#000000', theme_color: '#000000', icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }] });

function sendFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'max-age=3600' };
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) { // iPhone müzik çalarken parça parça ister
      let start = range[1] ? +range[1] : st.size - +range[2], end = range[2] && range[1] ? +range[2] : st.size - 1;
      start = Math.max(0, start); end = Math.min(end, st.size - 1);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') { res.writeHead(302, { Location: '/oyun?canli' }); return res.end(); }
  if (url === '/oyun') return sendFile(req, res, path.join(PUBLIC, 'index.html'));
  if (url === '/manifest.json') { res.writeHead(200, { 'Content-Type': 'application/manifest+json' }); return res.end(MANIFEST); }
  if (url === '/saglik') { res.writeHead(200); return res.end('ok'); }
  const file = path.normalize(path.join(PUBLIC, url));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  sendFile(req, res, file);
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
    if (type === 1 && !d.repeatEnd) return; // seri devam ediyor, bitince say
    const unit = g.diamondCount ?? d.diamondCount ?? 1;
    const coins = Math.max(1, unit * (d.repeatCount || 1));
    send({ type: 'gift', ...who(d), gift: g.giftName || 'Hediye', coins });
    console.log('hediye', who(d).id, g.giftName, coins);
  });
  conn.on(WebcastEvent.LIKE, d => {
    send({ type: 'like', ...who(d), count: d.likeCount || 1, total: d.totalLikeCount || 0 });
    console.log('beğeni', who(d).id, d.likeCount, 'toplam', d.totalLikeCount);
  });
  conn.on(WebcastEvent.MEMBER, d => send({ type: 'join', ...who(d) }));
  conn.on(WebcastEvent.FOLLOW, d => send({ type: 'follow', ...who(d) }));
  conn.on(WebcastEvent.SHARE, d => send({ type: 'share', ...who(d) }));
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
