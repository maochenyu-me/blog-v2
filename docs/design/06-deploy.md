# 06 · 构建与部署：GitHub Actions → Cloudflare Pages

## 结论

构建全部在 GitHub Actions 完成，Cloudflare Pages 只当静态托管用（Direct Upload）。
CF 侧**不要**接入 Git 集成——两边都构建会互相覆盖，而且 CF 构建机没有本项目的字体工具链。

流水线文件：`.github/workflows/deploy.yml`

```
push master
   │
   ├─ build（ubuntu, Node 24, pnpm 12.8.1）
   │    ├─ pnpm install --frozen-lockfile
   │    ├─ node scripts/audit-hardcode.mjs      # 硬编码审计，纯静态扫描
   │    ├─ pnpm build                           # nuxt build + copy-404 + fix-contrast + font-preload
   │    ├─ 产物断言（index/404/_nuxt/rss）
   │    └─ upload-artifact: dist
   │
   └─ deploy（仅 push / 手动触发，PR 跳过）
        ├─ download-artifact
        ├─ wrangler pages project create（幂等，已存在则放行）
        ├─ wrangler pages deploy dist --branch=master
        └─ 冒烟：https://kemiaosw-blog.pages.dev/ 返回 200
```

## 关键决策

**为什么不设 `NITRO_PRESET=cloudflare_pages`**
`nuxt.config.ts` 里已经写明：本地/CI 构建走默认 node-server preset，`nuxt generate` 只把预渲染结果落到 `dist/`。
设了 cloudflare preset 会额外产出 `_worker.js` / `_routes.json`，而纯 SSG 站点没有任何运行时逻辑，
多一个 Worker 只是白白引入冷启动和 3 MB 体积上限。`wrangler pages deploy` 只上传 `dist/`，
不带 `_worker.js` 就是纯静态部署，这正是我们要的形态。

**为什么用 Direct Upload 而不是 CF 的 Git 集成**
- CF 构建镜像里没有 `python3 + fonttools`，`pnpm fonts` 跑不了；虽然字体产物已提交进仓库，但任何需要
  fonttools 的后续改动都会在 CF 侧断掉。
- CF 构建没法跑我们自己的产物断言。
- Actions 里能拿到完整日志、artifact 和手动重跑按钮。

**为什么不跑 `pnpm verify`**
`scripts/verify.mjs` 依赖 `puppeteer-core` + 硬编码的 Windows Chrome 路径（`C:/Program Files/...`），
还要预先起 `preview:dist` 服务。CI 里跑不了，所以门禁只保留 `audit-hardcode.mjs` + 产物断言。
真要做浏览器级验收，得另开一个带 Chrome 的 job，属于后续扩展。

**构建脚本的坑：`failOnError: false`**
`nitro.prerender.failOnError = false` 意味着个别路由预渲染失败**不会**让 `pnpm build` 退出非零。
所以「构建成功」不等于「站点完整」，必须靠产物断言兜住（`index.html` / `404.html` / `_nuxt` / `rss.xml`）。

## 一次性准备

### 1. 创建 API Token

Cloudflare Dashboard → My Profile → API Tokens → Create Token，用 **Edit Cloudflare Workers** 模板
（新版控制台里 Pages 的权限挂在 Workers 下），或自定义：

- `Account` → `Cloudflare Pages` → `Edit`
- 若要脚本化绑域名，再加 `Zone` → `DNS` → `Edit`

同时记下 Account ID（Dashboard 右侧栏）。

### 2. 写入仓库 Secrets

Settings → Secrets and variables → Actions → New repository secret：

| 名称 | 值 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 上一步的 token |
| `CLOUDFLARE_ACCOUNT_ID` | 账户 ID |

### 3. 项目自动创建

首次运行 deploy job 时会执行 `wrangler pages project create kemiaosw-blog --production-branch=master`。
已存在则跳过，不需要手工建。想换名字就改 `deploy.yml` 顶部的 `PAGES_PROJECT`（同时要改
`environment.url` 和冒烟检查里的地址）。

### 4. 自定义域名（迁移，非新增）

实测 `https://www.kemiaosw.top/` 当前返回：

```
Server: Vercel
X-Powered-By: Nuxt
X-Vercel-Id: sfo1::iad1::...
```

也就是说线上现在是 **Vercel + Nuxt 运行时渲染**，不是静态托管。切到 Cloudflare Pages 属于平台迁移，
顺序不能错：

1. 先让 `kemiaosw-blog.pages.dev` 跑通（工作流首次运行成功、冒烟 200）。
2. Vercel 项目里移除 `www.kemiaosw.top` 自定义域名——**必须先移除**，否则 CF 添加域名时会报已被占用。
3. CF Pages 项目 → Custom domains → 添加 `www.kemiaosw.top`。域名若托管在 Cloudflare，CNAME 会自动写入；
   若在别处，手工把 `www` 的 CNAME 指向 `kemiaosw-blog.pages.dev`。
4. `kemiaosw.top` 裸域加一条 Redirect Rule 到 `https://www.kemiaosw.top`。

切换窗口内旧页面会短暂 404 或证书签发中，属正常。**建议先确认静态产物与 Vercel 版内容一致再切域名**，
回滚方式是把 CNAME 指回 Vercel（Vercel 项目别删）。

## 缓存策略

`public/_headers` 随构建复制到 `dist/_headers`，由 CF Pages 在边缘生效：

| 路径 | 策略 |
| --- | --- |
| `/_nuxt/*` | `max-age=31536000, immutable`（文件名带构建哈希） |
| `/fonts/*` | 同上（文件名固定，改动时需手动改版本号） |
| `/images/*` | `max-age=604800`（文件名不带哈希，留一周滞后） |
| 其余（HTML） | CF 默认，走 ETag 协商 |

注意：`/fonts/*` 的 `immutable` 有个前提——字体文件名不变但内容会变（重新跑 `pnpm fonts`）。
真要替换字体时，得同时改 `nuxt.config.ts` 里的 preload 地址或文件名加版本号，否则老访客一年看不到新字体。

**`dist/_headers` 里会多出一段你没写的规则。** 那是 `nuxt-ai-ready`（`@nuxtjs/seo` 的依赖）在
`nitro:compiled` 钩子里追加的 `/*.md` 内容协商规则。它的行为是：读现有 `_headers` → 拼接 → 写回，
所以 `public/_headers` 的内容永远排在前、不会被覆盖；而且**只有在 `_headers` 已存在时它才动手**
（`exists || isCloudflarePreset`）。这也解释了为什么加 `public/_headers` 之前 `dist/` 里根本没有这个文件。

## 已知限制

- PR 只构建、不部署，也不评论预览地址。要做预览部署的话，把 deploy job 的 `if` 放开并传
  `--branch=${{ github.head_ref }}`，CF 会自动分配 `<branch>.<project>.pages.dev`。
- `wrangler@4` 用 `npx --yes` 拉取，没锁版本。要确定性就把 wrangler 加进 devDependencies 并改
  成 `pnpm exec wrangler`。
- 首次部署前若 `https://kemiaosw-blog.pages.dev` 还没解析，冒烟检查会重试 6 次（约 60s）后失败。
  这是预期行为，不是部署没成功。

## 验收记录

- [ ] 本地 `pnpm build` 产物包含 `dist/_headers`（待首次构建确认）
- [ ] Actions 首次运行：build ✅ / deploy ✅ / 冒烟 200
- [ ] `https://kemiaosw-blog.pages.dev/` 与 `www.kemiaosw.top` 内容一致
- [ ] 二次 push 走缓存，build 耗时明显低于首次
