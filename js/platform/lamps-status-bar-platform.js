/**
 * 状态栏预留的游戏入口。
 * 向父页面要状态栏信息；父页面失败时用子页面自己的 env()。
 * 游戏代码只调 window.LampsGame.getStatusBarInfo / applyStatusBarSafeTop。
 */
(function (global) {
  "use strict";

  var HOST_TIMEOUT_MS = 1500;
  var SAT_VAR = "--sat";

  function bridge() {
    return global.__HOORAH_LAMPS_BRIDGE__;
  }

  function isUsableHeight(value) {
    return typeof value === "number" && isFinite(value) && value > 0;
  }

  function readEnvHeight() {
    var height = 0;
    try {
      var doc = global.document;
      if (!doc || !doc.documentElement) return 0;
      var probe = doc.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:absolute;visibility:hidden;pointer-events:none;" +
        "padding-top:constant(safe-area-inset-top);" +
        "padding-top:env(safe-area-inset-top, 0px);";
      doc.documentElement.appendChild(probe);
      height = parseFloat(global.getComputedStyle(probe).paddingTop) || 0;
      if (probe.parentNode) probe.parentNode.removeChild(probe);
    } catch (_) {
      height = 0;
    }
    return isUsableHeight(height) ? height : 0;
  }

  function applySat(px) {
    var height = typeof px === "number" && isFinite(px) && px > 0 ? px : 0;
    try {
      var root = global.document && global.document.documentElement;
      if (root && root.style) {
        root.style.setProperty(SAT_VAR, height + "px");
      }
    } catch (_) {}
    return height;
  }

  function pickParentHeight(msg) {
    if (!msg || msg.ok === false || !msg.data || typeof msg.data !== "object") {
      return null;
    }
    var height = Number(msg.data.height);
    return isUsableHeight(height) ? height : null;
  }

  function askParent() {
    var b = bridge();
    if (!b || typeof b.callHost !== "function") {
      return Promise.resolve(null);
    }
    return b
      .callHost("getStatusBarInfo", {}, HOST_TIMEOUT_MS)
      .then(pickParentHeight)
      .catch(function () {
        return null;
      });
  }

  function getStatusBarInfo() {
    var envHeight = readEnvHeight();
    return askParent().then(function (parentHeight) {
      var height = parentHeight != null ? parentHeight : envHeight;
      return {
        ok: true,
        data: { height: height },
      };
    });
  }

  function applyStatusBarSafeTop() {
    applySat(readEnvHeight());
    return getStatusBarInfo().then(function (res) {
      applySat(res.data.height);
      return res;
    });
  }

  var api = global.LampsGame || {};
  api.getStatusBarInfo = getStatusBarInfo;
  api.applyStatusBarSafeTop = applyStatusBarSafeTop;
  if (!api.bridge) api.bridge = bridge;
  global.LampsGame = api;

  try {
    applyStatusBarSafeTop();
  } catch (_) {}
})(typeof window !== "undefined" ? window : globalThis);
