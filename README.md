# H.Y.B.H 健身追踪

> 训练与饮食打卡追踪 · 一个纯静态、可离线使用的 PWA
>
> 项目地址：<https://github.com/XtrueT/HYBH>

H.Y.B.H 是一个面向个人的健身与饮食打卡工具。它把「训练计划 + 饮食方案 + 每日打卡 + 坚持热力图」整合在一个页面里，数据全部保存在本机浏览器，无需注册、无需后端。

---

## 功能

底部四个 tab：**今日 / 计划 / 库 / 设置**（可在 设置 → 界面 里切回顶部标签栏）。

| 模块 | 说明 |
| --- | --- |
| **今日** | 当天训练动作打卡、饮食打卡，实时进度条；底部可展开「负重选择 / 进阶路线 / 恢复要点」 |
| **计划** | 横向轮播：第 1 页是饮食方案（含每周采购与蛋白等价交换表），第 2–8 页是周一至周日训练安排（每天列出动作名与组次） |
| **库** | 内置动作库（只读）+ 自定义动作增删改 |
| **设置** | 个人数据、方案管理（训练计划 / 饮食方案 / AI 定制）、界面（导航栏位置、热力图开关与范围、统计看板）、安装、数据备份、关于 |
| **热力图** | 首页按月分列的打卡强度视图，支持近 3 月 / 6 月 / 1 年，收起时显示连击与本月摘要 |
| **分享** | Canvas 生成打卡海报（LOGO + 热力图 + 本周计划 / 饮食方案双列 + 站点二维码），**先预览**再分享或保存 |
| **AI 定制** | 复制内置 SKILL 契约给任意大模型，回贴 JSON 一键导入定制计划与饮食（入口：设置 → 方案管理） |

内置数据：2 套训练计划（哑铃增肌周 / 减脂循环周）、2 套饮食方案（增肌餐 / 减脂餐）、35 个动作种子。

---

## 目录结构

```
HYBH/
├── pwa/                      # ← 部署目录（Cloudflare Pages 输出此目录）
│   ├── index.html            # 应用主体（HTML + CSS + JS 单文件）
│   ├── sw.js                 # Service Worker：cache-first 离线 + 后台静默更新
│   ├── manifest.webmanifest  # PWA 清单（standalone / 竖屏 / 主题色）
│   ├── privacy.html          # 隐私政策页
│   ├── SKILL.md              # AI 定制契约（唯一来源；应用内 fetch 加载，AI 也可直接抓取 URL）
│   ├── llms.txt              # 面向 LLM 的站点说明（中英双语，llmstxt.org 约定）
│   ├── robots.txt            # 爬虫指引
│   ├── sitemap.xml           # 站点地图
│   ├── _headers              # Cloudflare Pages 安全响应头（CSP 等）
│   └── icons/                # 应用图标（192 / 512 / maskable / apple-touch）
├── package/                  # 三端套壳工程（Android / iOS / 鸿蒙），构建产物与签名不进仓库
├── test/
│   └── test.js               # Node 回归测试（放在 pwa/ 之外，不会随站点发布）
├── docs/                     # 本地设计与评审资料（已 gitignore，不随仓库提交）
└── .gitignore
```

> `SKILL.md` 是 AI 定制契约的**唯一来源**：应用通过 设置 → 方案管理 →「AI 定制」弹窗里的 `fetch("SKILL.md")` 异步加载（离线由 Service Worker 预缓存），AI 也可直接抓取该 URL。无需维护第二份副本。

---

## 本地运行

Service Worker 需要 `http(s)` 环境（`file://` 无法注册 SW），因此请用任意静态服务器打开：

```bash
cd pwa
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080
```

---

## 仿真测试

`node test/test.js` 只覆盖纯逻辑。界面与浏览器行为相关的场景按下表手动/自动验证。

### 1. 模拟「禁用 JavaScript」

DevTools（`F12`）→ 按 `F1` 打开设置 → Preferences → Debugger → 勾选 **Disable JavaScript** → 刷新，应看到全屏提示「本应用需要启用 JavaScript 才能运行」。

### 2. 模拟「存储不可用」

在控制台执行（需先按上面的方式起 http 服务，`file://` 下不生效）：

```js
localStorage.setItem = () => { throw new Error("disabled"); };
storageNotice();          // 应出现红色提示条
```

### 3. 模拟「无痕 / 隐私模式」

检测依赖真实浏览器行为（OPFS 抛错 / IndexedDB 持久化耗时比），**DevTools 无法伪造**，请用真实隐私窗口：

| 浏览器 | 快捷键 |
|---|---|
| Chrome / Edge | `Ctrl`/`Cmd` + `Shift` + `N` |
| Firefox | `Ctrl`/`Cmd` + `Shift` + `P` |
| Safari | `Cmd` + `Shift` + `N` |

在隐私窗口打开 `http://localhost:8080`，应出现提示条。**必须走 `http(s)`**——`getDirectory()` 需要安全上下文，`file://` 测不出来。

只验证 UI 时可在控制台强制触发：

```js
detectPrivateMode().then(console.log);                  // 查看真实检测结果
document.getElementById("storwarn").hidden = false;     // 强制显示提示条看样式
```

### 4. 模拟「离线 / 弱网」

DevTools → Network → 节流改为 **Offline** → 刷新。应用应仍能打开（Service Worker 缓存），且**不应**出现任何 CSP / SW 报错。

### 5. 模拟「暗色模式 / 刘海屏」

- 暗色：DevTools → Rendering → **Emulate CSS media feature `prefers-color-scheme`** → `dark`，检查输入框是否仍为深字浅底。
- 刘海屏：DevTools 设备工具栏选 iPhone 15 Pro 等机型；`env(safe-area-inset-*)` 需真机或模拟器才准确。

### 6. 自动化（Playwright）

⚠️ **Playwright 的 `browser.newContext()` 本身就是无痕上下文**，会命中隐私模式检测；要模拟普通模式必须用持久化上下文：

```js
const normal    = await chromium.launchPersistentContext(userDataDir);  // 普通模式
const incognito = await browser.newContext();                           // 无痕（会触发提示条）
```

### 7. 一键回归

```bash
node test/test.js
# 期望：ALL PASS · 35 通过, 0 失败
```

---

## 部署

以 **Cloudflare Pages** 为例：

- 构建命令：留空
- 输出目录：`pwa`
- `_headers` 会被 Pages 原生识别并生效（CSP、`X-Frame-Options` 等）

部署后手机上「添加到主屏幕」即可作为独立应用使用；首次访问后即可离线打开。

---

## 数据与备份

- 数据保存在浏览器 **localStorage**，键名 `dumbbell_fit_v1`（`schemaVersion` 6，含历史版本迁移）。
- 换设备前请在「设置 → 数据备份」中**导出 JSON**；导入仅接受本站导出的备份或 AI 定制包。
- 备份导入会经过结构校验与字段净化（`sanitizeBackup`），畸形或越界数据会被夹紧或回退。

### AI 定制工作流

1. 打开 设置 → 方案管理 →「AI 定制」，点「复制 SKILL」把契约文本发给任意大模型，并附上你的身高体重、目标、器材、伤病史；
2. 模型返回一份 `kind: "hybh-custom"` 的 JSON；
3. 粘贴到同一个弹窗 → 点「导入」，确认预览后写入。

导入是**幂等**的：动作按名字复用，同名计划与同名饮食方案为「更新」而非重复新增，可反复迭代。契约全文只在 `pwa/SKILL.md` 一处维护。

---

## 测试

```bash
node test/test.js
# 期望输出：ALL PASS · 35 通过, 0 失败
```

覆盖：数据迁移与种子、AI 定制包幂等导入、XSS 渲染转义、备份导入净化、打卡原地更新、二维码结构自检。

---

## 安全设计

- **CSP**：`default-src 'none'` 起步，仅放行必要来源（含 Cloudflare Pages 自带的匿名访问统计）；`img-src` 额外放行 `blob:`（分享图预览用的 object URL）；`frame-ancestors 'none'` 仅通过 `_headers` 下发（meta 不支持）。
- **输出转义**：所有用户输入在渲染前统一经过 `esc()`。
- **导入净化**：备份/定制包的 key 走白名单校验，数值范围夹紧，防属性注入与自伤。
- **数据本地**：训练 / 饮食数据全部存在浏览器，无自建后端；站点仅使用 Cloudflare Pages 自带的匿名访问统计（无 Cookie、不含个人数据）。

---

## 免责声明

本工具仅作健康生活参考，**不构成医疗建议**。如有不适请咨询专业人士。
