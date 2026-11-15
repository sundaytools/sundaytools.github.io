/*!
 * 通用云端同步适配器 · 纯 fetch，不引入任何 SDK
 *
 * 支持三类后端：
 *   supabase     Supabase 官方（海外），走 PostgREST RPC：ho_load / ho_save
 *   supabase_cn  Supabase 兼容平台（MemFire Cloud / 阿里云 RDS Supabase / 自建），协议同上
 *   rest         自定义 REST 端点，走极简 JSON 协议（见 README「REST 同步协议」）
 *
 * 对外契约固定：ready(cfg) -> bool；pull(cfg) -> 数据对象或 null；push(cfg, data) -> true/false
 * 旧配置没有 provider 字段时默认按 supabase 处理，行为不变。
 * 安全：前端只放设计上公开的 anon key；service_role / 数据库密码 / 云厂商密钥绝不能写进页面。
 */
(function () {
  "use strict";

  var PROVIDERS = ["supabase", "supabase_cn", "rest"];

  function normalizeUrl(u) {
    return String(u || "").trim().replace(/\/+$/, "");
  }
  function normalizeProvider(p) {
    p = String(p || "").trim();
    return PROVIDERS.indexOf(p) >= 0 ? p : "supabase";
  }
  function isRest(cfg) {
    return normalizeProvider(cfg && cfg.provider) === "rest";
  }

  function ready(cfg) {
    cfg = cfg || {};
    if (!cfg.enabled) return false;
    if (!normalizeUrl(cfg.url) || !cfg.space || !cfg.secret) return false;
    if (!isRest(cfg) && !cfg.key) return false;
    return true;
  }

  // 统一的 fetch：超时 + 非 2xx 抛错（让上层降级为「离线 · 数据已存本地」）
  function request(url, opts, timeoutMs) {
    if (!ready(opts.cfg)) {
      return Promise.reject(new Error("云同步配置不完整"));
    }
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    var done = function () { if (timer) { clearTimeout(timer); timer = null; } };
    var init = {
      method: opts.method || "POST",
      headers: opts.headers || {},
      body: opts.body
    };
    if (controller) {
      init.signal = controller.signal;
      timer = setTimeout(function () { controller.abort(); }, timeoutMs || 12000);
    }
    return fetch(url, init).then(function (res) {
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

  /* ── Supabase 系（官方 / 国内兼容 / 自建，共用 supabase.sql） ── */
  function rpc(cfg, fn, body) {
    return request(normalizeUrl(cfg.url) + "/rest/v1/rpc/" + fn, {
      cfg: cfg,
      headers: {
        "apikey": cfg.key,
        "Authorization": "Bearer " + cfg.key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  }
  function supaPull(cfg) {
    return rpc(cfg, "ho_load", { p_space: cfg.space, p_secret: cfg.secret });
  }
  function supaPush(cfg, data) {
    return rpc(cfg, "ho_save", { p_space: cfg.space, p_secret: cfg.secret, p_data: data });
  }

  /* ── 自定义 REST 端点 ── */
  function restCall(cfg, payload) {
    return request(normalizeUrl(cfg.url), {
      cfg: cfg,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  function restPull(cfg) {
    return restCall(cfg, { action: "load", space: cfg.space, secret: cfg.secret })
      .then(function (r) {
        if (!r || r.ok !== true) return null;
        return r.data || null;
      });
  }
  function restPush(cfg, data) {
    return restCall(cfg, {
      action: "save", space: cfg.space, secret: cfg.secret,
      rev: data && data.rev ? data.rev : Date.now(), data: data
    }).then(function (r) { return !!(r && r.ok === true); });
  }

  window.CloudSync = {
    providers: PROVIDERS.slice(),
    normalizeProvider: normalizeProvider,
    ready: ready,
    // 读取：返回整份数据对象；空间不存在或口令错误时返回 null
    pull: function (cfg) { return isRest(cfg) ? restPull(cfg) : supaPull(cfg); },
    // 写入：返回 true / false（false 表示口令不匹配或被拒绝）
    push: function (cfg, data) { return isRest(cfg) ? restPush(cfg, data) : supaPush(cfg, data); }
  };
})();
