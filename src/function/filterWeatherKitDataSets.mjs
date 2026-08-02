export default function filterWeatherKitDataSets(requestedDataSets = [], enabledDataSets = [], configurableDataSets = [], availableDataSets = []) {
    const enabled = new Set(enabledDataSets);
    const configurable = new Set(configurableDataSets);
    const merged = [...new Set([...requestedDataSets, ...availableDataSets])];

    // Availability 可能仍被天气 App 缓存。每个天气请求都重新合并插件声明的能力，
    // 同时保留 Apple 后续新增的数据集；配置只负责关闭插件已知的数据集。
    return merged.filter(dataSet => !configurable.has(dataSet) || enabled.has(dataSet));
}
