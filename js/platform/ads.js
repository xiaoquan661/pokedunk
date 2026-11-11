/**
 * 激励视频统一入口：Lamps 平台调用 showRewardedVideo；本地非 iframe 用 3 秒模拟。
 * 只有返回 ok=true 才允许发奖。
 */
export function watchRewardedAd(source = "none") {
  return new Promise((resolve) => {
    const g = window.LampsGame;
    const inHost = window.parent && window.parent !== window;
    if (inHost && g && typeof g.showRewardedVideo === "function") {
      g.showRewardedVideo({ source })
        .then((res) => resolve({ ok: !!(res && res.ok), message: res && res.message }))
        .catch(() => resolve({ ok: false, message: "激励视频暂不可用" }));
      return;
    }
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:970;background:#05060f;display:grid;place-items:center;color:#f5c542;font:700 16px var(--sport, sans-serif)";
    ov.textContent = "广告播放中…";
    document.body.appendChild(ov);
    let s = 3;
    const iv = setInterval(() => {
      s--;
      ov.textContent = `广告播放中… ${s}s`;
      if (s <= 0) {
        clearInterval(iv);
        ov.remove();
        resolve({ ok: true });
      }
    }, 1000);
  });
}
