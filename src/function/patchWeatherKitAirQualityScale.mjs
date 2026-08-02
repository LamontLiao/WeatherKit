import AirQuality from "../class/AirQuality.mjs";

/**
 * WeatherKit marks the EU EAQI scale as categorical (`numerical: false`).
 * The injected product still carries a concrete EAQI value, so opt in to the
 * numeric presentation expected by this module without changing its ranges,
 * categories, labels, or colours.
 */
export default function patchWeatherKitAirQualityScale(scale) {
    if (AirQuality.GetNameFromScale(scale?.name) !== "EU.EAQI" || !scale?.aqi || scale.aqi.numerical === true) return scale;
    return { ...scale, aqi: { ...scale.aqi, numerical: true } };
}

export function disableWeatherKitAirQualityScaleCache(headers = {}) {
    const result = { ...headers };
    for (const key of Object.keys(result)) {
        if (["cache-control", "etag", "expires", "last-modified"].includes(key.toLowerCase())) delete result[key];
    }
    result["Cache-Control"] = "no-store";
    return result;
}
