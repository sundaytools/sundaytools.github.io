/*!
 * HO位整理表 · 自定义 REST 同步端点模板 B：通用 Node.js（零第三方依赖）
 *
 * 用途一：本地/自建服务器直接跑
 *   node assets/sync-endpoint-node.js
 *   然后在网页「设置 → 云同步」里把同步端点 URL 填 http://127.0.0.1:8787
 *   （浏览器是 https 页面时会被混合内容拦截，本地测试请用 http 打开页面，
 *     或给这个服务套一层 https 反向代理）
 *   可用环境变量：PORT=8787  HO_STORE=/path/to/store.json
 *
 * 用途二：部署到国内云函数（腾讯云开发 CloudBase / 腾讯云 SCF / 阿里云 FC 等）
 *   把下面的 handle(body) 函数原样搬进云函数入口，把 load()/save() 换成
 *   该平台的云数据库或对象存储读写即可。云函数无状态，不要用文件存储。
 *   记得给 HTTP 触发路径配好 CORS 响应头（OPTIONS 返回 204 + CORS 头）。
 *
 * 免费额度参考：腾讯云开发免费体验版每账号 1 个环境、每月 3000 资源点
 * （需实名认证；默认域名有访问频率限制与安全提示中间页，正式使用建议绑自定义域名）。
 *
 * 安全：口令只以 SHA-256 摘要保存，服务端校验；前端不放任何云厂商密钥。
 * 协议详见 README「REST 同步协议」。
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8787);
const FILE = process.env.HO_STORE || path.join(__dirname, "..", ".ho-sync-store.json");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8"
};

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { return {}; }
}
function save(db) {
  fs.writeFileSync(FILE, JSON.stringify(db), "utf8");
}
function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function validSpace(s) {
  return /^[A-Za-z0-9_-]{4,64}$/.test(s || "");
}

/* 与协议一一对应，可整体搬进任意云函数 */
function handle(body) {
  body = body || {};
  const space = validSpace(body.space) ? body.space : null;
  const secret = typeof body.secret === "string" ? body.secret : "";
  if (!space || secret.length < 6) {
    return { status: 400, json: { ok: false, error: "bad space or secret" } };
  }

  const db = load();
  const rec = db[space] || null;
  const hash = sha256(secret);

  if (body.action === "load") {
    if (!rec) return { status: 200, json: { ok: true, data: null } };
    if (rec.hash !== hash) return { status: 403, json: { ok: false, error: "bad secret" } };
    return { status: 200, json: { ok: true, rev: rec.rev, data: rec.data } };
  }

  if (body.action === "save") {
    if (rec && rec.hash !== hash) return { status: 403, json: { ok: false, error: "bad secret" } };
    if (!body.data || !Array.isArray(body.data.columns)) {
      return { status: 400, json: { ok: false, error: "bad data" } };
    }
    db[space] = { hash: hash, rev: Number(body.rev) || Date.now(), data: body.data };
    save(db);
    return { status: 200, json: { ok: true } };
  }

  return { status: 400, json: { ok: false, error: "bad action" } };
}

const server = http.createServer(function (req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS); res.end(); return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, CORS);
    res.end(JSON.stringify({ ok: false, error: "POST only" }));
    return;
  }
  let raw = "";
  req.on("data", function (chunk) {
    raw += chunk;
    if (raw.length > 1024 * 1024) req.destroy();
  });
  req.on("end", function () {
    let body = {};
    try { body = JSON.parse(raw || "{}"); } catch (e) { body = {}; }
    const r = handle(body);
    res.writeHead(r.status, CORS);
    res.end(JSON.stringify(r.json));
  });
});

server.listen(PORT, function () {
  console.log("HO同步端点已启动: http://127.0.0.1:" + PORT);
  console.log("数据文件: " + FILE);
});

module.exports = { handle: handle };
