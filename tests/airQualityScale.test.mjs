import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };

const [{ default: AirQuality }, { default: QWeather }, { default: WAQI }, { default: WeatherKit2 }, { Console }] = await Promise.all([import("../src/class/AirQuality.mjs"), import("../src/class/QWeather.mjs"), import("../src/class/WAQI.mjs"), import("../src/class/WeatherKit2.mjs"), import("@nsnanocat/util")]);
const { InjectAirQuality } = await import("../src/process/Response.mjs");
const { default: resolveWeatherKitAirQualityScale } = await import("../src/function/resolveWeatherKitAirQualityScale.mjs");
Console.logLevel = "OFF";

test("all built-in AQ algorithms use Apple versionless scale aliases", () => {
    const expectedScales = {
        UBA: "UBA",
        EU_EAQI: "EU.EAQI",
        HJ6332012: "HJ6332012",
        HJ6332025_DRAFT: "HJ6332012",
        EPA_NowCast: "EPA_NowCast",
        WAQI_InstantCast_US: "EPA_NowCast",
        WAQI_InstantCast_CN: "HJ6332012",
        WAQI_InstantCast_CN_25_DRAFT: "HJ6332012",
    };

    for (const [algorithm, expectedScale] of Object.entries(expectedScales)) {
        assert.equal(AirQuality.ToWeatherKitScale(AirQuality.Config.Scales[algorithm].weatherKitScale), expectedScale, algorithm);
    }
});

test("scale helpers preserve dotted aliases and optional custom versions", () => {
    assert.equal(AirQuality.GetNameFromScale("EU.EAQI"), "EU.EAQI");
    assert.equal(AirQuality.GetNameFromScale("EU.EAQI.2414"), "EU.EAQI");
    assert.equal(AirQuality.ToWeatherKitScale({ name: "HK.AQHI", version: "2414" }), "HK.AQHI.2414");
    assert.equal(AirQuality.MatchWeatherKitScaleVersion("EU.EAQI", "HJ6332012.2604"), "EU.EAQI.2604");
    assert.equal(AirQuality.MatchWeatherKitScaleVersion("EPA_NowCast.2414", "DAQI.2604"), "EPA_NowCast.2604");
    assert.equal(AirQuality.MatchWeatherKitScaleVersion("EU.EAQI", undefined), "EU.EAQI");
});

test("iOS 27 keeps Apple's scale version when no index replacement succeeds", async () => {
    const airQuality = {
        metadata: { providerName: "QWeather", temporarilyUnavailable: false },
        categoryIndex: 1,
        index: 28,
        pollutants: [{ amount: 15, pollutantType: "PM2_5", units: "MICROGRAMS_PER_CUBIC_METER" }],
        previousDayComparison: "SAME",
        primaryPollutant: "NOT_AVAILABLE",
        scale: "HJ6332012.2604",
    };
    const result = await InjectAirQuality(
        airQuality,
        {
            AirQuality: {
                Current: { Fill: "CN", Pollutants: { Units: { Replace: [], Mode: "Scale" } }, Index: { Replace: [], Provider: "Calculate" } },
                Comparison: { Fill: "", ReplaceWhenCurrentChange: false },
            },
        },
        {},
        { country: "CN" },
    );

    assert.equal(result.scale, "HJ6332012.2604");
    assert.equal(result.index, 28);
    assert.equal(result.categoryIndex, 1);
});

test("iOS 27 injected indexes adopt the current Apple scale version", async () => {
    const airQuality = {
        metadata: { providerName: "QWeather", temporarilyUnavailable: false },
        categoryIndex: 1,
        index: 28,
        pollutants: [{ amount: 15, pollutantType: "PM2_5", units: "MICROGRAMS_PER_CUBIC_METER" }],
        previousDayComparison: "SAME",
        primaryPollutant: "NOT_AVAILABLE",
        scale: "HJ6332012.2604",
    };
    const result = await InjectAirQuality(
        airQuality,
        {
            AirQuality: {
                Current: {
                    Fill: "CN",
                    Pollutants: { Units: { Replace: [], Mode: "Scale" } },
                    Index: { Replace: ["HJ6332012"], Provider: "Calculate", ForceCNPrimaryPollutants: true },
                },
                Comparison: { Fill: "", ReplaceWhenCurrentChange: false },
                Calculate: { Algorithm: "EU_EAQI", AllowOverRange: true },
            },
        },
        {},
        { country: "CN" },
    );

    assert.equal(result.scale, "EU.EAQI.2604");
    assert.equal(Number.isFinite(result.index), true);
    assert.equal(Number.isFinite(result.categoryIndex), true);
});

test("cities without an Apple AQ table resolve the current canonical scale dynamically", async () => {
    let requestedUrl;
    const result = await resolveWeatherKitAirQualityScale(
        "EU.EAQI",
        undefined,
        "en-US",
        { Authorization: "test-token", "User-Agent": "WeatherKit test" },
        async request => {
            requestedUrl = request.url;
            assert.equal(request.headers.Authorization, "test-token");
            return { body: JSON.stringify({ name: "EU.EAQI.2604" }), ok: true, status: 200 };
        },
    );

    assert.equal(requestedUrl, "https://weatherkit.apple.com/api/v1/airQualityScale/en-US/EU.EAQI");
    assert.equal(result, "EU.EAQI.2604");
});

test("an Apple-provided scale version avoids an extra metadata request", async () => {
    const result = await resolveWeatherKitAirQualityScale("EU.EAQI", "HJ6332012.2604", "en-US", { Authorization: "test-token" }, async () => {
        throw new Error("fetch should not run");
    });

    assert.equal(result, "EU.EAQI.2604");
});

test("calculated EU AQI keeps its numeric fields and current scale through FlatBuffer encoding", () => {
    const airQuality = AirQuality.Pollutants2AQI(
        {
            metadata: { providerName: "test" },
            pollutants: [{ pollutantType: "PM2_5", amount: 25, units: "MICROGRAMS_PER_CUBIC_METER" }],
        },
        {},
        { algorithm: "EU_EAQI" },
    );

    assert.equal(Number.isFinite(airQuality.index), true);
    assert.equal(Number.isFinite(airQuality.categoryIndex), true);
    assert.equal(airQuality.scale, "EU.EAQI");

    const builder = new Builder(1024);
    const root = WeatherKit2.encode(builder, "all", { airQuality });
    builder.finish(root);
    const decoded = WeatherKit2.decode(new ByteBuffer(builder.asUint8Array()), "airQuality");

    assert.equal(decoded.index, airQuality.index);
    assert.equal(decoded.categoryIndex, airQuality.categoryIndex);
    assert.equal(decoded.scale, "EU.EAQI");
});

test("AQ scale normalization never discards a version without an Apple reference", () => {
    const stale = { categoryIndex: 2, index: 13, pollutants: [{ pollutantType: "NO2" }], scale: "EU.EAQI.2414" };
    const unchanged = AirQuality.NormalizeScaleIdentifier(stale);
    const migrated = AirQuality.NormalizeScaleIdentifier(stale, "HJ6332012.2604");

    assert.equal(unchanged, stale);
    assert.equal(migrated.scale, "EU.EAQI.2604");
    assert.equal(migrated.index, stale.index);
    assert.deepEqual(migrated.pollutants, stale.pollutants);
    assert.equal(AirQuality.NormalizeScaleIdentifier({ scale: "EU.EAQI.2604" }).scale, "EU.EAQI.2604");
    assert.equal(AirQuality.NormalizeScaleIdentifier({ scale: "HK.AQHI.2414" }).scale, "HK.AQHI.2414");
    assert.equal(AirQuality.NormalizeScaleIdentifier({ scale: "UNKNOWN.2414" }).scale, "UNKNOWN.2414");
});

test("WAQI normalizes category and stable scale alias before WeatherKit encoding", async () => {
    globalThis.$httpClient = {
        get(request, callback) {
            assert.match(request.url, /api2\.waqi\.info\/feed\/geo:/);
            callback(
                null,
                { headers: {}, status: 200 },
                JSON.stringify({
                    status: "ok",
                    data: {
                        aqi: "42",
                        city: { geo: [22.5, 113.9], name: "test", url: "https://example.com" },
                        dominentpol: "pm25",
                        idx: "1",
                        time: { v: 1_784_271_600 },
                    },
                }),
            );
        },
    };

    const airQuality = await new WAQI({ country: "CN", language: "zh-Hans", latitude: 22.5, longitude: 113.9, version: "v2" }, "test-token").AQI2();

    assert.equal(airQuality.index, 42);
    assert.equal(airQuality.categoryIndex, 1);
    assert.equal(airQuality.isSignificant, false);
    assert.equal(airQuality.primaryPollutant, "PM2_5");
    assert.equal(airQuality.scale, "EPA_NowCast");
});

test("QWeather derives a valid category when its index level is null", async () => {
    globalThis.$httpClient = {
        get(request, callback) {
            assert.match(request.url, /airquality\/v1\/current/);
            callback(
                null,
                { headers: {}, status: 200 },
                JSON.stringify({
                    indexes: [{ aqi: "46", code: "us-epa", level: null, primaryPollutant: { code: "pm25" } }],
                    pollutants: [
                        {
                            code: "pm25",
                            concentration: { unit: "μg/m3", value: 12 },
                            subIndexes: [{ aqi: 46, code: "us-epa" }],
                        },
                    ],
                }),
            );
        },
    };

    const airQuality = await new QWeather({ country: "US", language: "en", latitude: 40.7, longitude: -74, version: "v2" }, "test-token").CurrentAirQuality();

    assert.equal(airQuality.index, 46);
    assert.equal(airQuality.categoryIndex, 1);
    assert.equal(airQuality.scale, "EPA_NowCast");
});

test("air-quality comparison rejects unavailable category sentinels", () => {
    const { UNKNOWN } = AirQuality.Config.CompareCategoryIndexes;
    for (const pair of [
        [-1, 2],
        [0, 2],
        [null, 2],
        [2, -1],
        [2, undefined],
    ]) {
        assert.equal(AirQuality.CompareCategoryIndexes(...pair), UNKNOWN, JSON.stringify(pair));
    }
});
