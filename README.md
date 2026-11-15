# 小工具合集 · GitHub Pages 站点

一个纯静态的个人工具合集：根目录是**合集首页**，每个工具一个子目录、一个独立地址，可以单独收藏和分享。当前已上线 [HO 位整理表](ho-organizer/)（整理跑团 HO 位／Handout 位并导出图片）。

**当前线上地址**：<https://sundaytools.github.io/>（合集首页） · <https://sundaytools.github.io/ho-organizer/>（HO 位整理表）

所有页面都不依赖后端、不依赖外部 CDN，资源全部用相对路径，放到子目录或换域名都不用改代码。

## 目录结构

```
.
├── index.html                    合集首页（在 TOOLS 数组里加一张卡片即可新增入口）
├── favicon.svg
├── supabase.sql                  可选云同步：一键建表 + 权限脚本
├── assets/
│   └── cloud-sync.js             通用云同步适配器（纯 fetch，无 SDK）
├── ho-organizer/                 HO 位整理表
│   ├── index.html
│   ├── favicon.svg
│   └── vendor/html2canvas.min.js
├── .github/workflows/deploy.yml  GitHub Pages 自动部署（可选）
├── .nojekyll
└── README.md
```

## 部署到 GitHub Pages

**推荐把仓库命名为 `<用户名>.github.io`（用户站点）**，这样子目录就是干净的独立地址：

| 仓库名 | 首页 | HO 位整理表 |
| --- | --- | --- |
| `<用户名>.github.io` | `https://<用户名>.github.io/` | `https://<用户名>.github.io/ho-organizer/` |
| 其他名字（项目站点） | `https://<用户名>.github.io/<仓库名>/` | `https://<用户名>.github.io/<仓库名>/ho-organizer/` |

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
- **方式 B · Actions 自动部署**：Source 改选 `GitHub Actions`。仓库自带的 workflow 会把 `index.html`、`assets/`、`ho-organizer/` 等静态文件打包上传（不会把 `.git`、README 之类发布出去），之后每次 push 到 main 自动更新。

**新增一个工具**：在仓库里建同名子目录（如 `dice-roller/index.html`），再到根目录 `index.html` 的 `TOOLS` 数组里加一条记录，push 一次全部上线。

### 关于「要不要专门注册一个 GitHub 账号」

**不建议，而且不行。** GitHub 服务条款 B.3 明确写着「一个人或一个法律实体最多只能拥有一个免费帐户」，注册第二个免费个人号属于违反条款（只允许额外一个用于自动化的机器账号）。

如果你只是想要一个和主账号分开的独立身份，正确做法是：

- 在现有账号下建一个 **Organization**，用 `<组织名>.github.io` 作为仓库名 —— 组织站点同样是用户站点，URL 一样干净；
- 或者给现有站点绑定**自定义域名**（Settings → Pages → Custom domain）。

注意：换域名后浏览器 localStorage 是按域名隔离的，旧数据不会自动跟过来，记得先「导出数据」再「导入数据」。

---

## 可选：Supabase 云同步

HO 位整理表默认**纯本地、离线可用**；在「设置 → 云同步」里打开开关后，才会启用多设备同步。不开开关，行为和之前完全一样。

### 免费吗？

| 项目 | 免费层现状（以官网为准） |
| --- | --- |
| 价格 | $0/月，不是试用、没有到期日 |
| 数据库 | 500 MB／项目，超出后转只读 |
| 带宽 | 约 10 GB/月（5 GB egress + 5 GB cached egress） |
| 活跃免费项目 | 2 个 |
| 自动备份 | **没有** |
| 休眠 | **7 天低活动自动暂停**，需到控制台点 `Resume project` 恢复；暂停后 1 年内数据仍可恢复 |
| 取消暂停 | 升级 Pro，$25/月起 |

结论：**不收费，但不是「一直在线免费」**。政策可能调整，且免费层没有备份，所以「导出数据」依然要定期做。

### 国内写入会不会很慢？

会。Supabase 没有国内节点，API 在海外，常见 200–500 ms 延迟，偶发超时或 SSL 握手失败；升级 Pro 也改变不了物理距离。

所以这里用的是**本地优先 + 后台异步同步**架构：

1. 每次填写/改动**立即**写入本机 localStorage，界面零延迟、断网也能用；
2. 云端同步在后台延迟 1.8 秒合并执行，不阻塞操作；
3. 连不上就自动显示「离线 · 数据已存本地」，恢复后自动补传；
4. 打开页面时先拉云端，按 `rev` 时间戳判断谁更新，多设备最后写入获胜。

也就是说跨境慢**你感觉不到**，真正需要留意的是「偶发连不上」和「7 天休眠」，两者都有降级方案。

如果确实需要国内低延迟，可以换成腾讯云 CloudBase 等国内 BaaS（国内节点约 20–40 ms、有免费额度，但需要实名认证）：页面逻辑不用动，只改 `assets/cloud-sync.js` 里的两个请求端点与鉴权头即可。

### 配置步骤（约 5 分钟）

1. 注册 [Supabase](https://supabase.com/)（可用现有 GitHub 账号登录）→ **New project**，区域建议选 Singapore / Tokyo。
2. 左侧 **SQL Editor** → New query → 把仓库根目录 `supabase.sql` 全文粘贴进去 → **Run**。
3. **Project Settings → API**：复制 `Project URL` 和 `anon public` key。**不要用 `service_role` key。**
4. 打开 `.../ho-organizer/` → **设置 → 云同步** → 勾选「启用多设备云同步」→ 填入 URL 和 key → 点「随机生成」得到空间 ID → 自己设一个同步口令。
5. 第二台设备打开同一页面，填**相同的**空间 ID 与口令，数据就会自动同步过去。

这 4 个值只保存在浏览器 localStorage，**不会写进仓库，也不会出现在导出的 JSON 里**。关掉开关即刻变回纯本地。

### 安全与隐私

- `supabase.sql` 启用了 RLS，并**收回了 anon 对数据表的直接权限**；浏览器只能调用 `ho_load` / `ho_save` 两个函数，且必须同时知道**空间 ID + 口令**，别人无法枚举或读取别人的数据。
- `anon public` key 设计上就是给前端用的；`service_role` key、数据库密码、GitHub Token 绝对不能放进 Pages 的代码。
- 云端数据是明文 `jsonb`，**不要放敏感信息**。
- 口令忘了：作为项目所有者可以在 Supabase 控制台的 Table Editor 里直接查看/修改数据；或者换一个新空间 ID 重新开始。定期导出 JSON 才是最稳的兜底。
- 免费项目休眠后页面会显示「离线 · 数据已存本地」，去 Dashboard 点 `Resume project` 即可恢复；想避免就每周打开一次页面产生数据库请求（或升级 Pro）。

---

## HO 位整理表功能

| 功能 | 说明 |
| --- | --- |
| 栏目 | 默认 Ho1~Ho4 / 无 HO；改标题、增删、拖拽排序，10 组配色轮换 |
| 条目 | 模组名、角色名、备注；状态标签点击切换「卫星中 → 进行中 → 暂停中 → 已结团 → 已散桌」；跨栏目拖拽或「⇄ 移动到」 |
| 工具 | 状态统计、撤销、自动保存、示例数据、标题/落款/日期设置 |
| 导出 | 横向宽图、竖向长图（2 倍 PNG），可长按保存 / 下载 / 系统分享 |
| 备份 | JSON 导出（复制 / 下载）与导入（粘贴 / 选文件），**兼容原版 HOrganizer 备份** |
| 同步 | 可选 Supabase 云同步，默认关闭 |

## 常见问题

**页面打开但「保存为图片」没反应？** 确认 `ho-organizer/vendor/html2canvas.min.js` 已随仓库一起 push。

**手机上保存不了图片？** 用手机默认浏览器（Safari / Chrome）打开，微信、QQ 内置浏览器常拦截下载；生成后长按预览图保存，或点「下载图片」。

**云同步一直显示离线？** 依次检查：4 项配置是否填全、SQL 是否执行成功、项目是否被暂停、当前网络能否访问 `*.supabase.co`。离线不影响本地使用。

**数据会丢吗？** 本地数据在清理浏览器缓存、换设备、换域名时会「看不见了」，用导出/导入迁移；云端数据免费层没有自动备份，也建议定期导出。

**栏目多，宽图挤？** 切到「竖向长图」，会自动排成两列。
