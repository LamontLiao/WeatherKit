import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import matchRegion from "../src/function/matchRegion.mjs";

test("legacy region expressions and array settings are both supported", () => {
    assert.equal(matchRegion("CN|HK|MO", "CN"), true);
    assert.equal(matchRegion("CN|HK|MO", "US"), false);
    assert.equal(matchRegion(["CN", "HK"], "HK"), true);
    assert.equal(matchRegion(["CN", "HK"], "MO"), false);
    assert.equal(matchRegion("[", "CN"), false);
    assert.equal(matchRegion(undefined, "CN"), false);
});

test("the generated settings source retains every screenshot region control", async () => {
    const source = await readFile(new URL("../arguments-builder-full.config.ts", import.meta.url), "utf8");
    const keys = [
        "Weather.Replace",
        "Weather.Provider",
        "NextHour.Fill",
        "NextHour.Provider",
        "AirQuality.Current.Fill",
        "AirQuality.Current.Pollutants.Provider",
        "AirQuality.Current.Index.Replace",
        "AirQuality.Current.Index.Provider",
        "AirQuality.Current.Index.ForceCNPrimaryPollutants",
        "AirQuality.Comparison.Fill",
        "AirQuality.Comparison.Yesterday.PollutantsProvider",
        "AirQuality.Comparison.Yesterday.IndexProvider",
        "AirQuality.Calculate.Algorithm",
        "AirQuality.Calculate.AllowOverRange",
        "API.ColorfulClouds.Token",
        "API.QWeather.Host",
        "API.QWeather.Token",
        "API.WAQI.Token",
        "Storage",
        "LogLevel",
    ];

    let previousIndex = -1;
    for (const key of keys) {
        const index = source.indexOf(`key: "${key}"`);
        assert.ok(index > previousIndex, `${key} must exist in screenshot order`);
        previousIndex = index;
    }
});

test("published platform artifacts share the full settings and branch bundle", async () => {
    const artifactNames = [
        "iRingo.WeatherKit.plugin",
        "iRingo.WeatherKit.sgmodule",
        "iRingo.WeatherKit.yaml",
        "iRingo.WeatherKit.snippet",
        "iRingo.WeatherKit.stoverride",
    ];
    const responseBundle = "https://raw.githubusercontent.com/LamontLiao/WeatherKit/WeatherkitFix27/modules/WeatherkitFix27/response.bundle.js";
    const requestBundle = "https://raw.githubusercontent.com/LamontLiao/WeatherKit/WeatherkitFix27/modules/WeatherkitFix27/request.bundle.js";

    for (const name of artifactNames) {
        const artifact = await readFile(new URL(`../modules/WeatherkitFix27/${name}`, import.meta.url), "utf8");
        assert.match(artifact, /weatherkit\.apple\.com/);
        assert.match(artifact, /airQualityScale/);
        assert.match(artifact, /api\\?\/v2\\?\/weather|api\/v2\/weather/);
        assert.equal(artifact.includes(responseBundle), true, name);
        assert.equal(artifact.includes(requestBundle), true, name);
    }

    const loon = await readFile(new URL("../modules/WeatherkitFix27/iRingo.WeatherKit.plugin", import.meta.url), "utf8");
    for (const key of ["Weather.Replace", "NextHour.Fill", "AirQuality.Current.Fill", "AirQuality.Comparison.Fill"]) assert.equal(loon.includes(key), true, key);
});
