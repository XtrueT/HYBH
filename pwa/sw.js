// H.Y.B.H Service Worker —— 单文件应用：cache-first 秒开 + 后台刷新
const V = "hybh-v43";  // 发新版本时递增
const ASSETS = [
  "./",
  "./index.html",
  "./privacy.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // 只接管同源请求：跨域资源（如 Cloudflare 统计脚本）交给浏览器直连，
  // 既不会被 SW 自身的 CSP（connect-src）拦截，也不会污染缓存
  let url;
  try { url = new URL(e.request.url); } catch(_) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(V).then(async c => {
      const cached = await c.match(e.request);
      const net = fetch(e.request).then(res => {
        if (res && res.ok) c.put(e.request, res.clone());
        return res;
      }).catch(() => cached || Response.error());   // 兜底：绝不 reject，避免 respondWith 抛 TypeError
      return cached || net;   // 先回缓存保证离线秒开，后台静默更新，下次刷新生效
    })
  );
});
