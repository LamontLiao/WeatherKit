import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = {
    LogLevel: "OFF",
    Storage: "Argument",
    DataSets: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly"],
};

const [{ default: parseWeatherKitURL }, { Request }, { Request: RequestDev }, { Response }, { Response: ResponseDev }, { default: database }] = await Promise.all([
    import("../src/function/parseWeatherKitURL.mjs"),
    import("../src/process/Request.mjs"),
    import("../src/process/Request.dev.mjs"),
    import("../src/process/Response.mjs"),
    import("../src/process/Response.dev.mjs"),
    import("../src/function/database.mjs"),
]);

test("WeatherKit locales split language, script, and country deterministically", () => {
    const cases = [
        ["en-US", "en", "US"],
        ["pt-BR", "pt", "BR"],
        ["zh-Hans-US", "zh-Hans", "US"],
    ];

    for (const [locale, language, country] of cases) {
        const parsed = parseWeatherKitURL(new URL(`https://weatherkit.apple.com/api/v2/weather/${locale}/22.5431/114.0579?dataSets=currentWeather`));
        assert.equal(parsed.language, language, locale);
        assert.equal(parsed.country, country, locale);
    }
});

test("request keeps future datasets while removing a known explicitly disabled dataset", async () => {
    const input = "airQuality,news,forecastPrecipitation,forecastNextHour,currentWeather";
    const expected = ["airQuality", "news", "forecastPrecipitation", "currentWeather", "dataNotice", "forecastDaily", "forecastHourly", "forecastPeriodic", "highlights", "historicalComparisons", "weatherChanges", "weatherAlerts", "weatherAlertNotifications"];

    for (const handler of [Request, RequestDev]) {
        const request = {
            headers: {},
            method: "GET",
            url: `https://weatherkit.apple.com/api/v2/weather/en-US/22.5431/114.0579?dataSets=${input}`,
        };
        const result = await handler(request);
        assert.deepEqual(new URL(result.$request.url).searchParams.get("dataSets").split(","), expected);
    }
});

test("request independently restores iOS 27 datasets when Availability is stale", async () => {
    const input = "airQuality,currentWeather,forecastDaily,forecastHourly,forecastNextHour,news,historicalComparisons,weatherAlerts,weatherChanges";
    const required = ["dataNotice", "forecastPeriodic", "highlights"];

    for (const handler of [Request, RequestDev]) {
        const request = {
            headers: {},
            method: "GET",
            url: `https://weatherkit.apple.com/api/v2/weather/en-US/22.5431/114.0579?dataSets=${input}`,
        };
        const result = await handler(request);
        const dataSets = new URL(result.$request.url).searchParams.get("dataSets").split(",");
        for (const dataSet of required) assert.equal(dataSets.includes(dataSet), true, `${handler.name}: ${dataSet}`);
    }
});

test("only response-injectable datasets remain configurable", () => {
    assert.deepEqual(database.WeatherKit.Settings.DataSets, ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour"]);
});

test("availability keeps Apple's capabilities and appends plugin requirements in prod and dev", async () => {
    const appleCapabilities = ["currentWeather", "forecastSnowfall", "weatherMaps"];
    const expected = [...new Set([...appleCapabilities, ...database.WeatherKit.Configs.Availability.v2])];
    assert.ok(expected.includes("dataNotice"));
    assert.ok(expected.includes("forecastPeriodic"));
    assert.ok(expected.includes("highlights"));

    for (const handler of [Response, ResponseDev]) {
        const response = await handler(
            { url: "https://weatherkit.apple.com/api/v1/availability/en-US/22.5431/114.0579" },
            {
                body: JSON.stringify(appleCapabilities),
                headers: { "Content-Type": "application/json", "Cache-Control": "max-age=86400", ETag: '"1hr--gzip"' },
            },
        );
        assert.deepEqual(JSON.parse(response.body), expected);
        assert.equal(response.headers["Cache-Control"], "max-age=300, public, s-maxage=300");
        assert.equal("ETag" in response.headers, false);
    }
});

test("EU EAQI metadata opts into numeric display and disables the year-long cache", async () => {
    for (const handler of [Response, ResponseDev]) {
        const response = await handler(
            { url: "https://weatherkit.apple.com/api/v1/airQualityScale/en-US/EU.EAQI.2604" },
            {
                body: JSON.stringify({ name: "EU.EAQI.2604", aqi: { numerical: false, range: [0, 60] } }),
                headers: { "Content-Type": "application/json", "Cache-Control": "max-age=31536000", ETag: '"scale"' },
            },
        );
        const body = JSON.parse(response.body);
        assert.equal(body.aqi.numerical, true);
        assert.deepEqual(body.aqi.range, [0, 60]);
        assert.equal(response.headers["Cache-Control"], "no-store");
        assert.equal("ETag" in response.headers, false);
    }
});

test("AQ scale requests force revalidation without changing the scale id", async () => {
    for (const handler of [Request, RequestDev]) {
        const request = {
            headers: { "If-None-Match": '"scale"' },
            method: "GET",
            url: "https://weatherkit.apple.com/api/v1/airQualityScale/en-US/EU.EAQI.2604",
        };
        const result = await handler(request);
        assert.equal(result.$request.url, request.url);
        assert.equal(result.$request.headers["If-None-Match"], undefined);
        assert.equal(result.$request.headers["Cache-Control"], "no-cache");
    }
});
