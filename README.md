#  iRingo: 🌤 WeatherKit

## WeatherkitFix27

本分支在保留原版天气替换、未来一小时降水、空气质量、昨日对比和全部地区设置的基础上，兼容 iOS 27 的 16 槽位 WeatherKit 响应。

- Loon：`modules/WeatherkitFix27/iRingo.WeatherKit.plugin`
- Surge：`modules/WeatherkitFix27/iRingo.WeatherKit.sgmodule`
- Quantumult X：`modules/WeatherkitFix27/iRingo.WeatherKit.snippet`
- Stash：`modules/WeatherkitFix27/iRingo.WeatherKit.stoverride`
- Egern：`modules/WeatherkitFix27/iRingo.WeatherKit.yaml`

所有本地脚本版本统一引用 `modules/WeatherkitFix27/response.bundle.js`。仍使用 WeatherKit `/api/v2/weather`，不引入未确认的 v3 接口。
