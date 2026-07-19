import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };

const { InjectForecastNextHour, hasUsableAndFreshForecastNextHour } = await import("../src/process/Response.mjs");

test("fresh Apple minute data bypasses the fallback in an enabled region", async () => {
    const now = Math.trunc(Date.now() / 1000);
    const apple = minuteForecast(now, "Apple Weather");
    let calls = 0;
    const result = await InjectForecastNextHour(apple, settings("CN|HK"), environment("CN", async () => {
        calls++;
        return minuteForecast(now, "彩云天气");
    }));

    assert.equal(result, apple);
    assert.equal(calls, 0);
    assert.equal(hasUsableAndFreshForecastNextHour(apple, now), true);
});

test("an expired Apple product refreshes only inside NextHour.Fill", async () => {
    const now = Math.trunc(Date.now() / 1000);
    const expired = minuteForecast(now, "Apple Weather", now - 1);
    const fallback = minuteForecast(now, "彩云天气");
    let calls = 0;

    const outside = await InjectForecastNextHour(expired, settings("CN|HK"), environment("US", async () => {
        calls++;
        return fallback;
    }));
    assert.equal(outside, expired);
    assert.equal(calls, 0);

    const inside = await InjectForecastNextHour(expired, settings("CN|HK"), environment("CN", async () => {
        calls++;
        return fallback;
    }));
    assert.equal(inside.metadata.providerName, "彩云天气");
    assert.equal(calls, 1);
});

function settings(fill) {
    return { NextHour: { Fill: fill, Provider: "ColorfulClouds" } };
}

function environment(country, minutely) {
    return { country, colorfulClouds: { Minutely: minutely } };
}

function minuteForecast(now, providerName, expireTime = now + 10 * 60) {
    return {
        metadata: { expireTime, providerName, readTime: now, temporarilyUnavailable: false },
        condition: [],
        forecastEnd: now + 3600,
        forecastStart: now,
        minutes: [{ precipitationIntensity: 0.2, startTime: now }],
        summary: [],
    };
}
