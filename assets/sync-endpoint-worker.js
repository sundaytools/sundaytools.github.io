/*!
 * HO位整理表 · 自定义 REST 同步端点模板 A：Cloudflare Workers + KV
 *
 * 免费额度（Free 计划）：Workers 每天 10 万次请求；KV 每天 10 万次读、
 * 1000 次写/删除/列表，1 GB 存储。个人用完全够，不需要信用卡。
 * 国内访问没有境内节点，实测常见 150–300 ms，晚高峰偶发超时 —— 页面是
 * 「本地优先 + 后台异步同步」，连不上会自动降级为纯本地，不影响填写。
 *
 * 部署：
 *   1. Cloudflare 控制台 → Workers & Pages → KV → 新建命名空间（例如 HO_SYNC）
 *   2. Workers & Pages → 创建 Worker → 粘贴本文件全部内容 → 部署
 *   3. Worker 设置 → 变量 → 「KV 命名空间绑定」，变量名必须填 HO_KV，选刚建的命名空间
 *   4. 复制 Worker 的 https 地址，填进网页「设置 → 云同步 → 同步端点 URL」
 *      同步服务选「自定义 REST 端点」，空间 ID + 口令自己定，其他设备填一样的
 *
 * 安全：口令只以 SHA-256 摘要存 KV，服务端校验；前端不放任何云厂商密钥。
 * 空间 ID 是随机串，口令至少 6 位，请当作密码保管。
 * 协议详见 README「REST 同步协议」。
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8"
};

function reply(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: CORS });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return b.toString(16).padStart(2, "0");
  }).join("");
}

function cleanSpace(s) {
  return /^[A-Za-z0-9_-]{4,64}$/.test(s || "") ? s : null;
}

export default {
  async fetch(request, env) {
    // 浏览器对 application/json 的跨域 POST 会先发 OPTIONS 预检
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "POST") return reply({ ok: false, error: "POST only" }, 405);
    if (!env.HO_KV) return reply({ ok: false, error: "HO_KV binding missing" }, 500);

    let body;
    try { body = await request.json(); } catch (e) { return reply({ ok: false, error: "bad json" }, 400); }

    const space = cleanSpace(body.space);
    const secret = typeof body.secret === "string" ? body.secret : "";
    if (!space || secret.length < 6) return reply({ ok: false, error: "bad space or secret" }, 400);

    const key = "ho:" + space;
    let rec = null;
    try { rec = JSON.parse((await env.HO_KV.get(key)) || "null"); } catch (e) { rec = null; }
    const hash = await sha256(secret);

    if (body.action === "load") {
      if (!rec) return reply({ ok: true, data: null });
      if (rec.hash !== hash) return reply({ ok: false, error: "bad secret" }, 403);
      return reply({ ok: true, rev: rec.rev, data: rec.data });
    }

    if (body.action === "save") {
      if (rec && rec.hash !== hash) return reply({ ok: false, error: "bad secret" }, 403);
      if (!body.data || !Array.isArray(body.data.columns)) {
        return reply({ ok: false, error: "bad data" }, 400);
      }
      await env.HO_KV.put(key, JSON.stringify({
        hash: hash, rev: Number(body.rev) || Date.now(), data: body.data
      }));
      return reply({ ok: true });
    }

    return reply({ ok: false, error: "bad action" }, 400);
  }
};
