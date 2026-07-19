export default function mergeWeatherKitAvailability(appleCapabilities, pluginCapabilities = []) {
    if (!Array.isArray(appleCapabilities)) return appleCapabilities;

    // 在 Apple 返回值上补齐插件能力，避免系统新增 capability 被固定列表吞掉。
    return [...new Set([...appleCapabilities, ...pluginCapabilities])];
}

/**
 * Availability 会被 WeatherKit 客户端长时间缓存。插件扩展能力列表后缩短缓存，
 * 避免更新插件后继续使用缺少 iOS 27 dataNotice/highlights 的旧能力集。
 */
export function refreshWeatherKitAvailabilityCache(headers = {}) {
    const cacheControlKey = Object.keys(headers).find(key => key.toLowerCase() === "cache-control") ?? "Cache-Control";
    headers[cacheControlKey] = "max-age=300, public, s-maxage=300";

    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "etag") delete headers[key];
    }
    return headers;
}
