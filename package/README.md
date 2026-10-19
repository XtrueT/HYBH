# 原生包构建（Android / iOS / 鸿蒙）

> ⚠️ **本目录放的是可构建的原生工程，不是编译产物。**
> 真正的安装包必须用各平台的官方工具链构建，它们无法凭空生成：
>
> | 平台 | 硬性要求 |
> |---|---|
> | Android | JDK 17 + Android SDK（bubblewrap 可自动下载）+ 自建签名密钥 |
> | iOS | **只能 macOS + Xcode**，且需要 Apple 开发者账号签名 |
> | 鸿蒙 | DevEco Studio（含 hvigor 工具链）+ 华为签名证书 |
>
> 构建产物统一按固定文件名（见 [VERSION.md](./VERSION.md)）附加到 GitHub Release，
> 应用内「设置 → 下载安装」的直链即可生效。

## 版本约定

见 [VERSION.md](./VERSION.md)。当前版本 **1.0.0**（versionCode 1）。

## 发布流程

1. 提升 `pwa/index.html` 里的 `APP_VERSION` 与三个平台工程内的版本号（对照 VERSION.md）
2. 按下文构建，产物重命名为 `HYBH-android.apk` / `HYBH-harmonyos.hap`
3. GitHub 创建 Release（标题带版本号）并附加产物
4. 应用内下载卡片用 `releases/latest/download/<固定文件名>` 稳定直链，**无需随版本改代码**

## Android —— TWA（可信 Web 活动）

TWA = 一个空壳 APK 打开 `https://fitness.hybh.link`，配合 Digital Asset Links 域名校验后
**不显示地址栏**，体验与原生无异，且零代码重复（应用仍是这个网页）。

```bash
npm i -g @bubblewrap/cli
cd package/android
bubblewrap init --manifest https://fitness.hybh.link/manifest.webmanifest   # 首次生成工程
# 用本目录的 twa-manifest.json 校对生成的配置
bubblewrap build        # 产出 app-release-signed.apk / app-release-bundle.aab
```

- 首次 build 生成签名密钥 `hybh.keystore` —— **务必妥善保管，已列入 .gitignore 严禁提交**
- 域名校验：把 `keytool -list -v -keystore hybh.keystore` 输出的 SHA-256 指纹
  填入 `assetlinks.json.template`，部署为 `pwa/.well-known/assetlinks.json`
- 应用内 `save()` 已内置 Capacitor/原生镜像钩子；TWA 的 WebView 由系统 Chrome 提供，
  localStorage 持久性良好，可暂不接 Preferences

## iOS —— Capacitor 套壳

```bash
cd package/ios
npm install            # capacitor 依赖以 npm 最新稳定版为准
npx cap add ios        # 生成 Xcode 工程（只能在 macOS 上执行）
npx cap install @capacitor/preferences   # 原生键值存储（数据镜像用）
npx cap open ios       # Xcode 打开 → 选团队签名 → Archive → 上架
```

- `capacitor.config.json` 的 `server.url` 已指向线上地址，WebView 直接加载站点
- ⚠️ **iOS WKWebView 的脚本存储会被系统在 7 天不使用后清除（ITP）**。
  `index.html` 的 `save()` 已内置双写镜像（检测到 `window.Capacitor` 即启用），
  配合 `@capacitor/preferences` 把数据落到原生存储，启动时自动恢复
- 上架注意：Apple 对纯网页套壳可能引用 4.2（最小功能性）条款，建议后续加原生能力（分享 / 推送）

## 鸿蒙 —— ArkTS Web 组件套壳

用 DevEco Studio（API 12+）新建「Empty Ability」工程，然后把本目录的文件替换进去：

| 本目录文件 | 放到工程里的位置 |
|---|---|
| `app.json5` | `AppScope/app.json5` |
| `module.json5` | `entry/src/main/module.json5` |
| `Index.ets` | `entry/src/main/ets/pages/Index.ets` |

```bash
hvigorw assembleHap --mode module -p product=default
# 产物在 entry/build/default/outputs/default/*.hap
```

- `Index.ets` 已开 `domStorageAccess(true)`（放行 localStorage）
- 数据迁移：套壳版需在启动时把 localStorage 镜像到 `@ohos.data.preferences`（与 iOS 同思路）
- **鸿蒙「快应用 / 元服务」是另一套 DSL，网页代码无法复用**，需整体重写 —— 不建议现阶段做

### 可以不装 DevEco Studio 吗？

**可以，但不建议首次就走这条路。**

- 华为官方提供 **Command Line Tools**（`commandline-tools-harmonyos-*.tar.gz`，含 hvigor / ohpm / hdc / 签名工具），专为无 IDE 的 CI 构建设计
- 上架流程本身（AGC 后台：实名、建应用、备案、送审）**完全不需要任何 IDE**

不装 DevEco 的三个代价：

1. **工程模板缺失**：本目录只有 3 个关键文件，完整工程还需 EntryAbility.ets、build-profile.json5、hvigorfile.ts、hvigor-config.json5、oh-package.json5、resources（string/color/media/main_pages）等约 10 个文件 —— 手写易踩坑。
   无 IDE 的补救：用 **capacitor-harmony** 适配器 `npx cap add harmony` 自动生成完整原生工程（模板来自社区，见 https://github.com/zxdong262/capacitor-harmony ）
2. **签名手动**：hap-sign-tool 三件套（.p12 密钥库 + .cer 证书 + .p7b Profile）全命令行
3. **真机调试/日志**只能靠 hdc 命令行

DevEco Studio（Windows 版约 2~3 GB）换来的是：工程模板一键生成、**自动签名**（证书/Profile 全自动申请）、真机一键运行与日志 —— 首次做鸿蒙建议装。

### 不上架装到自己手机（调试签名，免费）

鸿蒙 NEXT 没有侧载开关（无法像 Android 直接装 APK），但**调试签名的 HAP 可以装在注册过 UDID 的设备上**：

1. AGC（AppGallery Connect）创建项目/应用，包名 `link.hybh.fitness`（个人实名账号，免费）
2. 手机连电脑，`hdc shell bm get --udid` 取设备 UDID，在 AGC 的「用户与访问 → 设备」注册
3. DevEco 生成 CSR → AGC 申请**调试证书**（.cer）与**调试 Profile**（.p7b）
4. DevEco → File > Project Structure > Signing Configs 勾选 Automatically generate signature（或手动选证书）
5. 连手机点 Run，或 `hdc install entry-default-signed.hap`

限制：调试证书**有效期 1 年**（实名账号；未实名仅 14 天），每个账号最多 3 张，到期需重新构建签名。
HAP 的 WebView 与浏览器数据隔离 → 装好后用应用内「导出 JSON / 导入 JSON」把浏览器里的数据迁移过去。
