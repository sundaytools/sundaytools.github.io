/*!
 * HO位整理表 · 同步端点模板 C：坚果云 WebDAV 存储（零第三方依赖，Node 18+）
 *
 * 为什么需要这一层：坚果云 WebDAV 不返回 CORS 头，浏览器里的静态页面
 * 无法直接 fetch（OPTIONS 预检会被拦下），而且应用密码绝不能放进前端代码。
 * 本端点跑在服务端，前端只跟它通信；网页「设置 → 云同步」里选
 * 「自定义 REST 端点」即可直接对接，页面代码一行都不用改。
 *
 * 快速开始：
 *   1) 坚果云网页端 → 账户信息 → 安全选项 → 第三方应用管理 → 添加应用密码
 *      （填的是应用密码，不是登录密码；用登录密码会一直 401）
 *   2) NUTSTORE_USER=注册邮箱 NUTSTORE_PASS=应用密码 \
 *        node assets/sync-endpoint-jianguoyun.js
 *   3) 网页「设置 → 云同步」选「自定义 REST 端点」，端点 URL 填本服务地址，
 *      空间 ID 与同步口令自己定，多台设备填一样的即可。
 *
 * 环境变量：
 *   PORT           默认 8788
 *   NUTSTORE_USER  坚果云注册邮箱（必填）
 *   NUTSTORE_PASS  应用密码（必填）
 *   NUTSTORE_BASE  默认 https://dav.jianguoyun.com/dav/
 *                  也可换成任意标准 WebDAV：Nextcloud / 群晖 / InfiniCloud / Koofr
 *   NUTSTORE_DIR   网盘里的目录名，默认 ho-sync（会自动创建）
 *
 * 部署到国内云函数 / Cloudflare Worker：
 *   handle(body) 与 davFetch() 都是标准 fetch，可原样搬进入口函数。
 *   云函数从环境变量读凭据；Worker 从 env 读，把末尾的 createServer 部分
 *   换成 export default { fetch }，CORS 头照抄 CORS 常量即可。
 *   注意：端点必须 https（线上页面是 https，http 会被浏览器拦截混合内容）。
 *
 * 坚果云免费版限制（官方帮助中心）：单文件 500 MB；每 30 分钟不超过 600 次
 * WebDAV 请求；单次请求最多 750 个文件；每月上传 1 GB、下载 3 GB 流量。
 * 本端点每次保存最多 3 次请求、每次读取 1 次，个人使用远远够。
 *
 * 安全：空间 ID 经 SHA-256 后当文件名，网盘里看不到原始 ID；同步口令只存
 * 摘要；网盘账号与应用密码只留在服务端，前端与仓库里都没有。
 * 协议详见 README「REST 同步协议」。
 */
const http = require("http");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8788);
const DAV_BASE = String(process.env.NUTSTORE_BASE || "https://dav.jianguoyun.com/dav/")
  .replace(/\/+$/, "") + "/";
const DAV_DIR = String(process.env.NUTSTORE_DIR || "ho-sync").replace(/^\/+|\/+$/g, "") || "ho-sync";
const DAV_USER = process.env.NUTSTORE_USER || "";
const DAV_PASS = process.env.NUTSTORE_PASS || "";
const AUTH = "Basic " + Buffer.from(DAV_USER + ":" + DAV_PASS).toString("base64");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8"
};

let dirReady = false;

function sha256(s) { return crypto.createHash("sha256").update(s).digest("hex"); }
function validSpace(s) { return /^[A-Za-z0-9_-]{4,64}$/.test(s || ""); }
function dirUrl() { return DAV_BASE + encodeURIComponent(DAV_DIR) + "/"; }
function fileUrl(file) { return dirUrl() + encodeURIComponent(file); }
function reply(status, json) { return { status: status, json: json }; }

async function davFetch(url, method, body) {
  const headers = { "Authorization": AUTH };
  if (body !== undefined) headers["Content-Type"] = "application/json; charset=utf-8";
  const extra = (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function")
    ? { signal: AbortSignal.timeout(15000) } : {};
  return fetch(url, Object.assign({ method: method, headers: headers, body: body }, extra));
}

async function ensureDir() {
  if (dirReady) return;
  const r = await davFetch(dirUrl(), "MKCOL");
  await r.arrayBuffer().catch(function () {});
  if (r.status === 401 || r.status === 403) throw new Error("webdav auth failed");
  // 201 新建、405/301/409 已存在或可忽略，其余视为失败
  if ([200, 201, 204, 301, 302, 405, 409].indexOf(r.status) < 0) {
    throw new Error("webdav mkdir failed (" + r.status + ")");
  }
  dirReady = true;
}

async function readRec(file) {
  const r = await davFetch(fileUrl(file), "GET");
  if (r.status === 404) return { missing: true };
  if (r.status === 401 || r.status === 403) throw new Error("webdav auth failed");
  if (!r.ok) throw new Error("webdav read failed (" + r.status + ")");
  let text = await r.text();
  try { return { rec: JSON.parse(text) }; }
  catch (e) { throw new Error("bad stored data"); }
}

async function writeRec(file, rec) {
  await ensureDir();
  const r = await davFetch(fileUrl(file), "PUT", JSON.stringify(rec));
  await r.arrayBuffer().catch(function () {});
  if (r.status === 401 || r.status === 403) throw new Error("webdav auth failed");
  if (!r.ok) throw new Error("webdav write failed (" + r.status + ")");
}

/* 与协议一一对应，可整体搬进任意云函数（async，调用处 await 即可） */
async function handle(body) {
  body = body || {};
  const space = validSpace(body.space) ? body.space : null;
  const secret = typeof body.secret === "string" ? body.secret : "";
  if (body.action !== "load" && body.action !== "save") {
    return reply(400, { ok: false, error: "bad action" });
  }
  if (!space || secret.length < 6) {
    return reply(400, { ok: false, error: "bad space or secret" });
  }
  if (!DAV_USER || !DAV_PASS) {
    return reply(500, { ok: false, error: "server not configured" });
  }

  const file = sha256(space).slice(0, 32) + ".json";
  const hash = sha256(secret);
  try {
    const got = await readRec(file);
    const rec = got.rec || null;

    if (body.action === "load") {
      if (got.missing) return reply(200, { ok: true, data: null });
      if (!rec || rec.hash !== hash) return reply(403, { ok: false, error: "bad secret" });
      return reply(200, { ok: true, rev: rec.rev, data: rec.data });
    }

    // save：已存在的空间必须先通过口令校验，防止别人覆盖
    if (!got.missing && (!rec || rec.hash !== hash)) {
      return reply(403, { ok: false, error: "bad secret" });
    }
    if (!body.data || !Array.isArray(body.data.columns)) {
      return reply(400, { ok: false, error: "bad data" });
    }
    await writeRec(file, {
      v: 1, hash: hash, rev: Number(body.rev) || Date.now(),
      data: body.data, updatedAt: new Date().toISOString()
    });
    return reply(200, { ok: true });
  } catch (e) {
    const msg = /auth failed/.test(String(e.message))
      ? "webdav auth failed" : "webdav unreachable: " + String(e.message);
    return reply(502, { ok: false, error: msg });
  }
}

if (require.main === module) {
  const server = http.createServer(async function (req, res) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS); res.end(); return;
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        ok: true, backend: "nutstore-webdav",
        configured: !!(DAV_USER && DAV_PASS), dir: DAV_DIR
      }));
      return;
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
    req.on("end", async function () {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch (e) { body = {}; }
      const r = await handle(body);
      res.writeHead(r.status, CORS);
      res.end(JSON.stringify(r.json));
    });
  });

  server.listen(PORT, function () {
    console.log("HO同步端点（坚果云 WebDAV）已启动: http://127.0.0.1:" + PORT);
    console.log("WebDAV 地址: " + dirUrl());
    console.log("账号已配置: " + (!!(DAV_USER && DAV_PASS)));
    if (!DAV_USER || !DAV_PASS) {
      console.log("提示：请设置 NUTSTORE_USER（注册邮箱）与 NUTSTORE_PASS（应用密码）");
    }
  });
}

module.exports = { handle: handle, davFetch: davFetch, ensureDir: ensureDir };
