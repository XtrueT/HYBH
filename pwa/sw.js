// H.Y.B.H Service Worker —— 单文件应用：cache-first 秒开 + 后台刷新
const V = "hybh-v92";  // 发新版本时递增
const ASSETS = [
  "./",
  "./index.html",
  "./privacy.html",
  "./privacy",
  "./manifest.webmanifest",
  "./SKILL.md",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png"
];
self.addEventListener("install", e => {
  // 逐个添加：单个资源失败（如被重定向 / 404）不影响整体安装，避免 addAll 的「全有或全无」
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
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
  // 页面导航只接管：应用壳（/、/index.html）与隐私页（/privacy，CF Pages 会把
  // /privacy.html 308 重定向到这里，故以无扩展名形式预缓存与接管）。其余路径
  // （包括会触发重定向的 /privacy.html）交给浏览器原生处理 —— SW 把重定向响应
  // 交给 respondWith 会报 "redirected response ... not follow"，导致页面加载失败。
  const SHELL = ["/", "/index.html", "/privacy"];
  if (e.request.mode === "navigate" && !SHELL.includes(url.pathname)) return;
  e.respondWith(
    caches.open(V).then(async c => {
      const cached = await c.match(e.request);
      // 显式 follow 重定向：否则 3xx 响应交给 respondWith 会报
      // "a redirected response was used for a request whose redirect mode is not follow"
      const net = fetch(e.request, { redirect: "follow" }).then(res => {
        if (res && res.ok && !res.redirected) c.put(e.request, res.clone());   // 重定向后的响应不写缓存
        return res;
      }).catch(() => cached || Response.error());   // 兜底：绝不 reject，避免 respondWith 抛 TypeError
      return cached || net;   // 先回缓存保证离线秒开，后台静默更新，下次刷新生效
    })
  );
});
