# Rollup 独立评估

评估日期：2026-08-02

## 结论

本轮不从 Rspack 切换到 Rollup。Rollup 可以直接打包当前本地源码，说明迁移在技术上可行；但单次本地对比中没有获得体积或速度收益，而现有 Rspack 产物已经通过全部平台生成与回归测试。构建器迁移应放在独立变更中，避免与 iOS 27、空气质量、分钟降水及灾害预警修复耦合。

## 实测

同一工作区、同一依赖状态、生产压缩模式下各运行一次：

| 构建器 | CLI 总时间 | request.bundle.js | response.bundle.js | 合计 |
| --- | ---: | ---: | ---: | ---: |
| Rspack 1.7.7 | 1.14 s（编译器报告 95 ms） | 31,720 B | 256,290 B | 288,010 B |
| Rollup 4.62.4 | 1.45 s | 31,752 B | 259,160 B | 290,912 B |

Rollup 合计大约大 1.0%，本次冷启动总时间也更长。两组产物均通过 `node --check`。该数据是单机单次测量，只用于判断本轮是否值得迁移，不作为长期性能基准。

## 与 beta4 配置的差异

beta4 的 Rollup 配置通过 alias 指向 npm 包 `@nsringo/weatherkit/dist/index.js`，并依赖发布版 `@nsringo/weatherkit` 与 `@nsringo/flatbuffer-root`。本分支刻意继续使用仓库内的 WeatherKit schema、编解码器和通用根槽位处理器，因此不能原样复制该 alias 配置。

当前源码在没有 Rollup Node polyfill 插件时也能完成打包，这表明后续可以单独检查 Rspack 的 `node-polyfill-webpack-plugin` 是否仍有必要；这与切换 Rollup 是两个问题，不应在本次功能修复中同时改变。

## 如果后续迁移

建议单独提交，并至少满足：

1. Rollup 入口直接使用本仓库 `src/request.js` 与 `src/response.js`，不 alias 到远端 npm WeatherKit 实现。
2. 生成后的所有脚本插件和 Rewrite 插件与当前文件集合、参数、规则完全一致。
3. 在 Surge、Loon、Quantumult X、Stash、Egern、Shadowrocket 至少完成语法与真实运行冒烟测试。
4. 使用同一锁文件和多轮构建测量，再决定是否删除 Rspack 与 Node polyfill 依赖。
