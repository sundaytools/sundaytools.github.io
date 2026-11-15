/*!
 * 通用云端同步适配器 · 纯 fetch 调用 Supabase PostgREST RPC，不引入任何 SDK
 * 任何页面都能复用：配置好 url / key / space / secret 后调用 pull() 或 push()
 * 注意：anon public key 设计上可公开，但不要使用 service_role key。
 */
(function () {
  "use strict";

  function normalizeUrl(u) {
    return String(u || "").trim().replace(/\/+$/, "");
  }

  function rpc(cfg, fn, body, timeoutMs) {
    if (!window.CloudSync.ready(cfg)) {
      return Promise.reject(new Error("云同步配置不完整"));
    }
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    var done = function () { if (timer) { clearTimeout(timer); timer = null; } };
    var opts = {
      method: "POST",
      headers: {
        "apikey": cfg.key,
        "Authorization": "Bearer " + cfg.key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    };
    if (controller) {
      opts.signal = controller.signal;
      timer = setTimeout(function () { controller.abort(); }, timeoutMs || 12000);
    }
    return fetch(normalizeUrl(cfg.url) + "/rest/v1/rpc/" + fn, opts)
      .then(function (res) {
        done();
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error("HTTP " + res.status + " " + String(t).slice(0, 160));
          });
        }
        return res.json();
      }, function (err) {
        done();
        if (err && err.name === "AbortError") throw new Error("连接超时");
        throw err;
      });
  }

  window.CloudSync = {
    ready: function (cfg) {
      return !!(cfg && cfg.enabled && normalizeUrl(cfg.url) && cfg.key && cfg.space && cfg.secret);
    },
    // 读取：返回整份数据对象；空间不存在或口令错误时返回 null
    pull: function (cfg) {
      return rpc(cfg, "ho_load", { p_space: cfg.space, p_secret: cfg.secret });
    },
    // 写入：返回 true / false（false 表示口令不匹配或被拒绝）
    push: function (cfg, data) {
      return rpc(cfg, "ho_save", { p_space: cfg.space, p_secret: cfg.secret, p_data: data });
    }
  };
})();
