import { Console, fetch } from "@nsnanocat/util";
import AirQuality from "../class/AirQuality.mjs";

/**
 * Resolve a stable/injected AQ scale alias to Apple's current canonical id.
 *
 * When Apple supplied an AQ product, its scale is the preferred version
 * reference. Some cities have no Apple AQ table at all, so query Apple's
 * versionless scale endpoint and use the canonical `name` returned there.
 */
export default async function resolveWeatherKitAirQualityScale(scale, referenceScale, locale = "en-US", requestHeaders = {}, fetcher = fetch) {
    const matchedScale = AirQuality.MatchWeatherKitScaleVersion(scale, referenceScale);
    if (typeof matchedScale !== "string" || /\.\d+$/.test(matchedScale)) return matchedScale;

    const normalizedLocale = /^[A-Za-z0-9-]+$/.test(locale) ? locale : "en-US";
    const headers = pickHeaders(requestHeaders, ["authorization", "user-agent", "accept-language"]);
    if (!headers.Authorization && !headers.authorization) return matchedScale;

    try {
        const response = await fetcher({
            url: `https://weatherkit.apple.com/api/v1/airQualityScale/${normalizedLocale}/${encodeURIComponent(AirQuality.GetNameFromScale(matchedScale))}`,
            headers,
        });
        if (!(response?.ok ?? response?.status === 200)) return matchedScale;

        const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
        const canonicalScale = body?.name;
        return AirQuality.GetNameFromScale(canonicalScale) === AirQuality.GetNameFromScale(matchedScale) && /\.\d+$/.test(canonicalScale) ? canonicalScale : matchedScale;
    } catch (error) {
        Console.warn("resolveWeatherKitAirQualityScale", error);
        return matchedScale;
    }
}

function pickHeaders(headers, names) {
    const allowed = new Set(names);
    return Object.fromEntries(Object.entries(headers ?? {}).filter(([key]) => allowed.has(key.toLowerCase())));
}
