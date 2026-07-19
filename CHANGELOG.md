### WeatherkitFix27 / iOS 27

* 恢复天气、未来一小时降水、今日空气质量及昨日对比的全部地区设置和插件参数。
* Availability 改为能力并集合并，请求仅过滤插件可控制的数据集，透传 iOS 27 新产品。
* 使用 16 槽位 FlatBuffer 根表覆盖，只替换空气质量、当前天气、日/小时/分钟预报，保留 `forecastPeriodic` 与 `highlights`。
* 分钟预报改为 10 分钟有效期并支持多段降水；空气质量使用稳定标准别名并保留具体指数；天气替换保护日降水总量和未知枚举。
* 生成 Loon、Surge、Quantumult X、Stash、Egern 与 Workers 产物，并移除不可访问的私有 proto 子模块依赖。

### 🆕 New Features
  * 新增基于云函数的 `WeatherKit (Rewrite)` 新模块，面向 `Loon`、`Surge`、`Stash`、`Shadowrocket` 提供新的 Rewrite 版本配置。

### 🛠️ Bug Fixes
  * 修复和风天气 `YesterdayAirQuality` 在 `locationInfo` 为空时的空值访问问题，避免港澳等特殊定位条件下请求失败。
  * 修复规则拦截范围，新增 `IP-ASN 6185` 并统一 `QUIC` 拒绝表达式，减少异常直连。
  * 修复重复天气提供者设置逻辑。

### 🔣 Dependencies
  * 新增运行时依赖：`hono`、`node-fetch`、`fetch-cookie`。
  * 更新开发与基础依赖：`@rspack/cli`、`@rspack/core` 升级至 `^1.7.7`，`@nsnanocat/util` 升级至 `^2.2.3`。

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 为新的 Rewrite 版本补充基于 `Hono` 的云函数转发入口，并支持通过 `Vercel` 与 `Cloudflare Workers` 部署。
  * 新增 workers 构建链路：增加 `arguments-builder.workers.config.ts` 与 `build:args:workers`，用于生成各平台代理模块产物。
  * 统一工程结构：`Hono` 入口调整为 `src/Hono.js`，请求/响应处理拆分到 `src/process/Request*.mjs` 与 `src/process/Response*.mjs`，并统一模块后缀与命名。
  * 新增并统一 workers 模板与模块命名，配置名称追加 `(Rewrite)` 后缀，提升不同版本的辨识度。
  * 更新 `wrangler` 可观测性配置，并在 `.gitignore` 中补充 `.idea` 忽略规则。
