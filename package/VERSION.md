# 版本约定（semver）

`主版本.次版本.修订号`，与业界一致：

| 变更类型 | 例子 | 结果 |
|---|---|---|
| 修订号 +1 | 缺陷修复、文案微调 | `1.0.1` |
| 次版本 +1 | 新功能（统计维度、自动备份） | `1.1.0` |
| 主版本 +1 | 数据结构破坏性变更、UI 重构 | `2.0.0` |

## 各处版本号一览

| 位置 | 字段 | 当前值 | 说明 |
|---|---|---|---|
| `pwa/index.html` | `APP_VERSION` | `1.0.0` | 设置页下载卡片展示 |
| Android | `appVersionName` / `appVersionCode` | `1.0.0` / `1` | `android/twa-manifest.json` |
| iOS | `CFBundleShortVersionString` / `CFBundleVersion` | `1.0.0` / `1` | Xcode 工程（cap add 生成后改） |
| 鸿蒙 | `versionName` / `versionCode` | `1.0.0` / `1` | `harmony/app.json5` |
| `pwa/sw.js` | `V` | `hybh-vNN` | **内部离线缓存代号，与应用版本无关**；改了被 SW 缓存的资源才递增 |

发版时把上表所有 `1.0.0` 一起提升，避免「应用内显示的版本」和「安装包的版本」不一致。

## 发布产物命名

- **固定文件名**：`HYBH-android.apk` / `HYBH-harmonyos.hap`
- 配合 GitHub 的稳定直链 `releases/latest/download/<固定文件名>`，
  应用内下载卡片**不需要随版本改链接**
- 版本号写在 Release 的标题与说明里
- iOS 走 App Store / TestFlight，不提供 ipa 直链（签名与合规要求）
