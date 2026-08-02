/**
 * Match a two-letter WeatherKit country code against the legacy region setting.
 * String settings keep the original regular-expression semantics; arrays are
 * accepted for compatibility with newer generated modules.
 */
export default function matchRegion(setting, country) {
    if (!country || setting == null || setting === "") return false;

    const pattern = Array.isArray(setting) ? setting.filter(Boolean).join("|") : String(setting);
    if (!pattern) return false;

    try {
        return new RegExp(pattern).test(String(country));
    } catch {
        return false;
    }
}
