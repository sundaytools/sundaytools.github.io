# 小工具合集 · GitHub Pages 站点

一个纯静态的个人工具合集：根目录是**合集首页**，每个工具一个子目录、一个独立地址，可以单独收藏和分享。当前已上线 [HO位整理表](ho/)（整理跑团 HO位／Handout 位并导出图片）。

**当前线上地址**：<https://sundaytools.github.io/>（合集首页） · <https://sundaytools.github.io/ho/>（HO位整理表）

所有页面都不依赖后端、不依赖外部 CDN，资源全部用相对路径，放到子目录或换域名都不用改代码。

## 目录结构

```
.
├── index.html                    合集首页（在 TOOLS 数组里加一张卡片即可新增入口）
├── favicon.svg
├── supabase.sql                  可选云同步：一键建表 + 权限脚本
├── assets/
│   ├── cloud-sync.js             多服务商同步适配器（纯 fetch，无 SDK）
│   ├── sync-endpoint-worker.js   REST 同步端点模板：Cloudflare Workers + KV
│   ├── sync-endpoint-node.js     REST 同步端点模板：通用 Node.js（可本地运行）
│   └── sync-endpoint-jianguoyun.js  REST 同步端点模板：坚果云 / 标准 WebDAV 存储
├── ho/                           HO位整理表
│   ├── index.html
│   ├── favicon.svg
│   └── vendor/html2canvas.min.js
├── ho-organizer/index.html       旧地址，自动跳转到 ho/（保留 #share 分享参数）
├── .github/workflows/deploy.yml  GitHub Pages 自动部署（可选）
├── .nojekyll
└── README.md
```

## 部署到 GitHub Pages

**推荐把仓库命名为 `<用户名>.github.io`（用户站点）**，这样子目录就是干净的独立地址：

| 仓库名 | 首页 | HO位整理表 |
| --- | --- | --- |
| `<用户名>.github.io` | `https://<用户名>.github.io/` | `https://<用户名>.github.io/ho/` |
| 其他名字（项目站点） | `https://<用户名>.github.io/<仓库名>/` | `https://<用户名>.github.io/<仓库名>/ho/` |

推送：

```bash
git init
git add .
git commit -m "init: 小工具合集"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

开启 Pages（二选一）：

- **方式 A · 分支部署（最简单）**：Settings → Pages → Source 选 `Deploy from a branch` → `main` / `(root)` → Save。不需要 workflow。
- **方式 B · Actions 自动部署**：Source 改选 `GitHub Actions`。仓库自带的 workflow 会把 `index.html`、`assets/`、`ho/` 等静态文件打包上传（不会把 `.git`、README 之类发布出去），之后每次 push 到 main 自动更新。

**新增一个工具**：在仓库里建同名子目录（如 `dice-roller/index.html`），再到根目录 `index.html` 的 `TOOLS` 数组里加一条记录，push 一次全部上线。

### 关于「要不要专门注册一个 GitHub 账号」

**不建议，而且不行。** GitHub 服务条款 B.3 明确写着「一个人或一个法律实体最多只能拥有一个免费帐户」，注册第二个免费个人号属于违反条款（只允许额外一个用于自动化的机器账号）。

如果你只是想要一个和主账号分开的独立身份，正确做法是：

- 在现有账号下建一个 **Organization**，用 `<组织名>.github.io` 作为仓库名 —— 组织站点同样是用户站点，URL 一样干净；
- 或者给现有站点绑定**自定义域名**（Settings → Pages → Custom domain）。

注意：换域名后浏览器 localStorage 是按域名隔离的，旧数据不会自动跟过来，记得先「导出数据」再「导入数据」。

---

## 可选：云同步（多服务商）

HO位整理表默认**纯本地、离线可用**；在「设置 → 云同步」里打开开关后才会启用多设备同步。不开开关，行为和之前完全一样。「同步服务」下拉提供 3 种后端，另有不需要任何云的「只读分享链接」。

### 先说结论：国内 + 免费 + 纯静态直连，为什么这么难

GitHub Pages 只发布静态文件，前端代码全网公开，所以**任何有写权限的密钥都不能放进页面**。能安全使用的后端只有两类：设计上就公开的前端 key + 服务端校验（Supabase 系），或者自己部署一层服务端（自定义 REST 端点）。国内 BaaS 大多还卡在实名认证、备案域名、前端密钥这三道门槛上。

| 服务 | 免费层（以官网为准） | 国内速度 | 静态页能直连吗 | 关键门槛 | 建议 |
| --- | --- | --- | --- | --- | --- |
| [Supabase 官方](https://supabase.com/pricing) | $0；500 MB 库、约 10 GB/月带宽 | 慢，200–500 ms，偶发超时 | 可以，anon key + RLS | **7 天无活动自动暂停**、无自动备份 | 零成本首选，慢但不花钱 |
| MemFire Cloud（国内 Supabase 兼容） | **免费项目已取消**，入门版约 ¥29.9/月 | 快，国内节点 | 可以，协议与官方相同 | 需付费 | 想省事又要国内快，性价比一般 |
| 阿里云 RDS Supabase | 平台不收费，按 RDS / NAT / EIP 计费 | 快 | 可以 | 配置复杂、按云资源计费 | 适合本来就在用阿里云 |
| [腾讯云开发 CloudBase](https://cloudbase.net/) | 免费体验版：每账号 1 个环境、每月 3000 资源点 | 快，国内节点 | **不能裸连**，要云函数 + HTTP 访问服务 | 需实名；默认域名有频率限制与安全提示中间页 | 国内低延迟可行，但要部署一层函数 |
| [LeanCloud 国际版](https://leancloud.app/) | 开发版免费（约 1 GB、3 万次请求/天） | 中等，节点在海外 | REST 可直连，但 AppKey 公开后**无法做口令隔离** | 国内版需实名 + 已备案域名，GitHub Pages 域名无法备案 | 只适合不介意数据公开的场景 |
| [Bmob](https://www.bmobapp.com/) | 免费版 100 万次数据 API、10 万行 | 快，国内节点 | 同类问题：REST Key 放前端等于公开可写 | 需支付宝实名 | 同上 |
| [Cloudflare Workers + KV](https://developers.cloudflare.com/kv/platform/pricing/) | 免费：每天 10 万请求；KV 10 万读 / 1000 写、1 GB | 中等，150–300 ms，晚高峰偶发不稳 | 需要部署 Worker（本仓库给模板） | 无国内节点 | **免费方案里最省事的** |
| [坚果云 WebDAV](https://help.jianguoyun.com/?p=2064) | 免费版每月 1 GB 上传 / 3 GB 下载流量 | 快，国内节点 | **不能直连**，不返回 CORS 头；需经 REST 端点 | 应用密码不能放前端；30 分钟 600 次请求上限 | **配 `sync-endpoint-jianguoyun.js` 中转，国内免费首选** |
| OneDrive（Microsoft Graph） | 个人版 5 GB 免费 | 慢，国内常超时 | 可以，支持 CORS + PKCE | 需注册 Azure 应用、OAuth 跳转、token 刷新 | 技术上唯一能直连的网盘，国内体验差 |
| 百度网盘 / 阿里云盘 / 夸克 / 115 | 有免费容量 | 快 | **不能**，无 WebDAV / 无 CORS / 需企业资质 | 百度需实名 + SecretKey 且只开放 `/apps` 目录；阿里云盘 2025 年 7 月起暂停个人开发者 | 不适用 |
| 只读分享链接 | 完全免费 | 最快，不发网络请求 | 不需要后端 | 只读；数据多时链接较长 | 只想发给别人看时用这个 |

> 一句话：**「国内 + 免费 + 填个 key 就能用」的组合基本不存在**。要国内低延迟且不花钱，就得部署一层免费 Serverless（坚果云 WebDAV 就挂在这一层后面）；不想部署，就用 Supabase（慢）或分享链接（只读）。网盘为什么不能直连，见后面的「补充」章节。

### 架构：本地优先 + 后台异步同步

1. 每次填写/改动**立即**写入本机 localStorage，界面零延迟、断网也能用；
2. 云端同步在后台延迟 1.8 秒合并执行，不阻塞操作；
3. 连不上就自动显示「离线 · 数据已存本地」，恢复后自动补传；
4. 打开页面时先拉云端，按 `rev` 时间戳判断谁更新，多设备最后写入获胜。

所以跨境慢**你感觉不到**，需要留意的只有「偶发连不上」和「免费项目休眠」，两者都有降级方案。

### 方案一：Supabase 官方（零部署，海外免费）

| 项目 | 免费层现状 |
| --- | --- |
| 价格 | $0/月，不是试用、没有到期日 |
| 数据库 | 500 MB／项目，超出后转只读 |
| 带宽 | 约 10 GB/月 |
| 活跃免费项目 | 2 个 |
| 自动备份 | **没有** |
| 休眠 | **7 天低活动自动暂停**，需到控制台点 `Resume project`；暂停后 1 年内数据仍可恢复 |
| 取消暂停 | 升级 Pro，$25/月起 |

配置（约 5 分钟）：

1. 注册 [Supabase](https://supabase.com/)（可用 GitHub 账号登录）→ **New project**，区域建议 Singapore / Tokyo。
2. 左侧 **SQL Editor** → New query → 把仓库根目录 `supabase.sql` 全文粘贴 → **Run**。
3. **Project Settings → API** 复制 `Project URL` 和 `anon public` key。**不要用 `service_role` key。**
4. 打开 `.../ho/` → **设置 → 云同步** → 同步服务选「Supabase 官方」→ 勾「启用多设备云同步」→ 填 URL 与 key → 点「随机生成」得到空间 ID → 自己设一个口令。
5. 第二台设备打开同一页面，填**相同的**空间 ID 与口令即可自动同步。

这些值只存在浏览器 localStorage，**不会写进仓库，也不会出现在导出的 JSON 里**。关掉开关即刻变回纯本地。

### 方案二：Supabase 兼容平台（国内节点，多为付费）

下拉选「Supabase 兼容平台」，**仍然执行同一份 `supabase.sql`**，只把服务地址换成 MemFire Cloud / 阿里云 RDS Supabase / 自建 Supabase 的地址，其余字段不变。优点是国内延迟低、不用改代码；缺点是这些平台目前基本没有免费层（MemFire 约 ¥29.9/月起，阿里云按 RDS、NAT、EIP 计费）。

### 方案三：自定义 REST 端点（国内免费推荐）

下拉选「自定义 REST 端点」，只需填**端点 URL + 空间 ID + 口令**，不需要 anon key（该字段会自动隐藏）。仓库给了两份可直接用的模板：

- `assets/sync-endpoint-worker.js` — Cloudflare Workers + KV，免费层足够个人用
- `assets/sync-endpoint-node.js` — 通用 Node.js 版，零依赖，本地可直接跑，也方便搬进国内云函数
- `assets/sync-endpoint-jianguoyun.js` — 把数据存进**坚果云 WebDAV**（或任意标准 WebDAV），国内节点、免费、网盘里能直接看到 JSON

**部署 Cloudflare Worker：**

1. 控制台 → Workers & Pages → KV → 新建命名空间（例如 `HO_SYNC`）
2. Workers & Pages → 创建 Worker → 粘贴 `sync-endpoint-worker.js` 全文 → 部署
3. Worker 设置 → 变量 → 添加 **KV 命名空间绑定**，变量名必须是 `HO_KV`
4. 复制 Worker 的 https 地址，填进「同步端点 URL」；空间 ID + 口令自己定

**本地测试 / 自建：** `node assets/sync-endpoint-node.js`，端点填 `http://127.0.0.1:8787`。注意线上页面是 https，浏览器会拦截 http 的 mixed content，本地测试请用 http 打开页面，或给服务套一层 https 反代。数据文件 `.ho-sync-store.json` 已被 `.gitignore` 排除。

**搬到国内云函数（腾讯云开发 CloudBase / SCF / 阿里云 FC 等）：** 把 `sync-endpoint-node.js` 里的 `handle(body)` 原样搬进入口函数，`load()` / `save()` 换成该平台的云数据库或对象存储读写（云函数无状态，别用文件存储），并给 HTTP 触发路径配好 CORS 响应头。CloudBase 免费体验版需实名认证，默认域名有访问频率限制与安全提示中间页，正式使用建议绑自定义域名。

#### 用坚果云 WebDAV 当存储（国内免费、网盘里能直接看到数据）

`assets/sync-endpoint-jianguoyun.js` 与上面的端点**协议完全相同**，只是把存储从本地文件 / KV 换成坚果云 WebDAV，所以网页端配置一模一样：选「自定义 REST 端点」，填**端点 URL + 空间 ID + 口令**，anon key 字段依旧隐藏。

1. 坚果云网页端 → 右上角账户名 → **账户信息 → 安全选项 → 第三方应用管理 → 添加应用密码**，名称随便填（如 `ho-sync`）。**这一步生成的是应用密码，不是登录密码**，用登录密码会一直 401。
2. 本地跑起来（Node 18+，零第三方依赖）：
   ```bash
   NUTSTORE_USER=你的注册邮箱 NUTSTORE_PASS=应用密码 \
     node assets/sync-endpoint-jianguoyun.js
   ```
   默认监听 `8788`，数据落在网盘 `ho-sync/` 目录；访问 `GET /health` 可检查配置是否生效。
3. 正式使用把这份代码搬进**国内云函数**或 Cloudflare Worker（都是标准 `fetch`，`handle()` 可原样复制），给端点配好 https 与 CORS，把邮箱 / 应用密码放在平台的环境变量里，**不要写进代码或仓库**。
4. 网页「同步端点 URL」填这个服务的 https 地址，空间 ID 和口令自己定；第二台设备填一样的即可自动同步。

**免费版限制**（[官方帮助中心](https://help.jianguoyun.com/?p=2064)）：单文件 500 MB、每 30 分钟不超过 600 次 WebDAV 请求、单次列出最多 750 个文件；每月上传 1 GB、下载 3 GB 流量。本端点每次保存最多 3 次请求、每次读取 1 次，个人使用远远够；HO位表通常只有几十 KB，流量也几乎不消耗。端点也支持 `NUTSTORE_BASE` 换成 Nextcloud / 群晖 / InfiniCloud / Koofr 等任意标准 WebDAV。

> 安全细节：空间 ID 经 SHA-256 后当文件名，网盘里看不到原始 ID；同步口令只存摘要。**不要把网盘账号或应用密码填进网页设置**，那一栏只填端点 URL。坚果云自带历史版本，误覆盖可以在网盘里回滚——这反而是 Supabase 免费层（无自动备份）没有的。

#### REST 同步协议

全部走 `POST` + `Content-Type: application/json`，口令放在请求体里（不进 URL，避免落到访问日志）：

```
请求  {"action":"load", "space":"ho-xxx", "secret":"..."}
响应  {"ok":true,"rev":1700000000000,"data":{...}}   // data 为 null 表示云端暂无数据
      {"ok":false,"error":"bad secret"}             // 口令不匹配

请求  {"action":"save", "space":"ho-xxx", "secret":"...", "rev":..., "data":{...}}
响应  {"ok":true}
      {"ok":false,"error":"bad secret"}
```

端点**必须**处理 `OPTIONS` 预检并返回 `Access-Control-Allow-Origin` / `-Methods` / `-Headers`；口令只在服务端校验，服务端只存 SHA-256 摘要。三份模板都已实现这些。

### 方案四：只读分享链接（零云、零配置）

设置面板最下方「生成分享链接」会把当前数据压进 URL 的 `#share=` 里并复制。对方打开链接会询问是否导入，导入后就是一份独立快照。**不发任何网络请求、不需要账号、国内最快**，适合整理完发给朋友看。数据多时链接会很长（微信里可能被截断），那种情况直接用「导出数据」更稳。

### 补充：坚果云 / 网盘到底能不能直连

结论：**绝大多数不能，坚果云尤其不能；但加一层 REST 端点后，坚果云反而是国内最好用的免费方案。**

| 网盘 | 纯静态页直连 | 原因 |
| --- | --- | --- |
| 坚果云 | 不行 | WebDAV 服务 `dav.jianguoyun.com` **不返回 CORS 头**，浏览器 `OPTIONS` 预检直接被拦；且需要「应用密码」，放进前端等于公开整个网盘 |
| OneDrive | 技术上可以 | Microsoft Graph 支持 CORS（`Access-Control-Allow-Origin`）与 PKCE 授权码流程，SPA 无需 client secret，个人版 5 GB 免费。但要在 Microsoft Entra 注册应用、配置回调、处理 token 刷新，且国内连接慢、常超时 |
| Dropbox | 技术上可以 | 官方 API 明确支持浏览器 JS 与 CORS 预检，免费 2 GB。国内基本连不上，同样需要注册应用 + OAuth |
| 百度网盘 | 不行 | 开放平台需实名认证，`SecretKey` 只能放服务端；2026 年起新应用只允许访问 `/apps/{应用名}` 目录；无 WebDAV |
| 阿里云盘 / 夸克 / 115 | 不行 | 不开放 WebDAV；阿里云盘 2025 年 7 月起暂停个人开发者申请 |
| Nextcloud / 群晖 NAS / InfiniCloud / Koofr | 看部署 | 标准 WebDAV，自己配了 CORS 头就能直连；否则同样走端点模板 |

一个容易混淆的点：**「网盘支持 WebDAV」不等于「网页能直连」**。WebDAV 是给客户端 / 桌面软件用的协议，坚果云、Nextcloud 默认都不给浏览器发 CORS 头；KeeWeb、Obsidian、思源等工具的浏览器版也都只能靠同源代理或桌面壳绕过。GitHub Pages 没有服务端，绕不过去。

所以网盘的正确用法是**当「存储层」而不是「后端」**：浏览器 → 你部署的 REST 端点 → 坚果云 WebDAV。前端仍然只填端点 URL + 空间 ID + 口令，网盘账号和应用密码只留在服务端环境变量里。数据在网盘里就是一个 `.json` 文件，能直接打开看，还能利用坚果云自带的**历史版本**回滚。

如果确实想让浏览器直连网盘，唯一现实的选择是 OneDrive / Dropbox 的官方 API：注册应用 → PKCE 授权跳转 → 拿到 access token → 调 Graph/Dropbox API 读写一个 JSON 文件。这条链路不需要后端也不需要密钥，但要处理 OAuth 回调、token 过期刷新，而且国内访问不稳定，投入产出比明显不如「坚果云 + 一层免费端点」。

### 安全与隐私

- `supabase.sql` 启用了 RLS 并**收回 anon 对数据表的直接权限**：浏览器只能调 `ho_load` / `ho_save`，且必须同时知道**空间 ID + 口令**，无法枚举别人的数据。REST 端点同理，口令在服务端校验、只存哈希。
- `anon public` key 设计上就是给前端用的；`service_role` key、数据库密码、云厂商 SecretId/SecretKey、GitHub Token **绝对不能放进 Pages 代码**。
- 云端数据是明文 JSON，**不要放敏感信息**。
- 口令忘了：Supabase 项目所有者可在 Table Editor 里直接查看/修改数据；自建端点删掉对应记录即可；也可以换一个新空间 ID 重来。定期导出 JSON 才是最稳的兜底。
- 免费项目休眠后页面会显示「离线 · 数据已存本地」，去 Dashboard 点 `Resume project` 恢复；每周打开一次页面产生请求即可避免。

---

## HO位整理表功能

| 功能 | 说明 |
| --- | --- |
| 栏目 | 默认 Ho1~Ho4 / 无HO；改标题、增删、拖拽排序，10 组配色轮换 |
| 条目 | 模组名（主标题）、角色名、备注；状态标签点击切换「卫星中 → 进行中 → 暂停中 → 已结团 → 已散桌」；跨栏目拖拽或「⇄ 移动到」 |
| 角色头像 | 位于条目右下、与角色行对齐，每条可传可不传；上传后进入裁切器，可拖动图片取景、滚轮/双指/滑块缩放，确认后裁成 1:1 并压到 256×256；支持更换、移除、撤销；导出的图片会带上头像 |
| 工具 | 状态统计、撤销、自动保存、示例数据、标题/落款/日期设置 |
| 导出 | 横向宽图、竖向长图（2 倍 PNG），可长按保存 / 下载 / 系统分享 |
| 备份 | JSON 导出（复制 / 下载）与导入（粘贴 / 选文件），**兼容原版 HOrganizer 备份** |
| 同步 | 可选云同步（Supabase 官方 / Supabase 兼容平台 / 自定义 REST 端点，端点可接坚果云 WebDAV），默认关闭；另有零云只读分享链接 |

## 常见问题

**页面打开但「保存为图片」没反应？** 确认 `ho/vendor/html2canvas.min.js` 已随仓库一起 push。

**手机上保存不了图片？** 用手机默认浏览器（Safari / Chrome）打开，微信、QQ 内置浏览器常拦截下载；生成后长按预览图保存，或点「下载图片」。

**角色头像怎么裁？会占很多空间吗？** 选中图片后会弹出裁切框：拖动图片调整取景，滚轮 / 双指 / 滑块缩放，「重置」回到铺满状态，方框内就是最终效果；确认后裁成 1:1、压到 256×256 的 WebP（通常 10–40 KB）后存进浏览器；含头像的 JSON 备份会相应变大，**只读分享链接会自动剥离头像**以免网址过长。开启云同步时头像也会一并上传/拉取，图片较多时首次同步会稍慢。条目右侧角色行旁的虚线方框就是头像位，不上传也会保持占位（只有「＋头像」），所以有无头像不会导致排版跳动。若提示「本机存储空间不足」，移除几张头像或先导出备份即可。

**云同步一直显示离线？** 依次检查：所选服务要求的字段是否填全（REST 端点不需要 anon key）、Supabase 的 SQL 是否执行成功、免费项目是否被暂停、端点是否允许跨域并正确处理 `OPTIONS` 预检、当前网络能否访问该域名。离线不影响本地使用。

**国内有没有免费又不卡的？** 见上面的对比表：严格满足「国内节点 + 免费 + 纯静态直连」的服务基本没有。最实际的组合是「Supabase 官方（慢但免费）」或「Cloudflare Worker / 国内云函数 + 本仓库模板（免费、需部署一层）」；只想分享结果就用只读链接。

**坚果云 / 网盘能当数据库吗？** 纯静态页面**不能直连**：坚果云 WebDAV 不返回 CORS 头，应用密码也不能放前端。用本仓库 `sync-endpoint-jianguoyun.js` 中转一层就可以，网页配置完全不变（仍是「自定义 REST 端点」），详见「用坚果云 WebDAV 当存储」。OneDrive / Dropbox 官方 API 技术上能直连，但需 OAuth 且国内慢，不推荐。

**数据会丢吗？** 本地数据在清理浏览器缓存、换设备、换域名时会「看不见了」，用导出/导入迁移；云端数据免费层没有自动备份，也建议定期导出。

**栏目多，宽图挤？** 切到「竖向长图」，会自动排成两列。
