import { webview } from '@kit.ArkWeb';

/**
 * H.Y.B.H 鸿蒙套壳页：WebView 直接加载线上 PWA。
 * 应用数据存在 WebView 的 localStorage（domStorageAccess 已放行），
 * 后续需镜像到 @ohos.data.preferences 以防系统清理（与 iOS 同思路）。
 */
@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

  build() {
    Web({ src: 'https://fitness.hybh.link/', controller: this.controller })
      .width('100%')
      .height('100%')
      .domStorageAccess(true)       // 放行 localStorage（应用数据存这里）
      .javaScriptAccess(true)
      .onlineImageAccess(true)
      .fileAccess(false)
      .zoomAccess(false)            // 与 PWA 行为一致：禁止双指缩放页面
      .darkMode(WebDarkMode.Off)    // 应用为纯亮色设计
      .forceDarkAccess(false)
      .onBackPressed(() => {
        // 网页内有历史则后退，否则交给系统退出
        if (this.controller.accessBackward()) {
          this.controller.backward();
          return true;
        }
        return false;
      })
  }
}
