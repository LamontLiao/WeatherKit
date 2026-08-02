import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

globalThis.require = createRequire(import.meta.url);
globalThis.$environment = { "surge-version": "test" };
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { LogLevel: "OFF", Storage: "database" };
let sourceHtmlResponse = "";
globalThis.$httpClient = {
    get(_request, callback) {
        callback(null, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }, sourceHtmlResponse);
    },
};

const [{ default: WeatherAlerts }, { Request: ProcessRequest }, { Request: RequestDev }, { onRequest }] = await Promise.all([
    import("../src/class/WeatherAlerts.mjs"),
    import("../src/process/Request.mjs"),
    import("../src/process/Request.dev.mjs"),
    import("../functions/[[route]].js"),
]);

const sourceHtml = `<!doctype html><html><head><title>建邺天气预警</title></head><body>
<h1 class="c-submenu__location">建邺</h1><span class="c-submenu__location-adm">江苏 南京</span>
<div class="c-city-warning-events warning--orange"><h3>建邺区气象台发布雷暴橙色预警</h3>
<p>发布日期：2026-07-31T11:00:00+08:00</p><p class="warning-events__txt">预计午后将出现雷暴天气。</p>
<div class="warning-explain"><h4>Description</h4><p>可能伴有短时强降水。</p></div>
<div class="warning-defense__txt"><p>1. 注意防范雷电。</p><p>2. 远离高大树木。</p></div></div>
<div class="c-city-warning-around"></div><div class="c-data-source"><a class="data-source__txt">预警数据来源：国家预警信息发布中心</a></div>
</body></html>`;

test("QWeather alert HTML becomes Apple-compatible alert metadata", () => {
    const extracted = WeatherAlerts.ExtractQWeather(sourceHtml);
    const [alert] = WeatherAlerts.Build(extracted, {
        attributionUrl: new URL("https://www.qweather.com//severe-weather/jianye-101190110.html"),
        identifier: "jianye-101190110",
        language: "zh-CN",
        countryCode: "CN",
    });

    assert.equal(extracted.areaName, "建邺");
    assert.equal(alert.description, "雷暴橙色预警");
    assert.equal(alert.reportedAt, "2026-07-31T03:00:00.000Z");
    assert.equal(alert.source, "国家预警信息发布中心");
    assert.equal(alert.severity, "severe");
    assert.deepEqual(alert.responses, ["prepare", "avoid"]);
    assert.match(alert.id, /^[0-9a-f-]{36}$/);
});

test("request handlers synthesize QWeather alerts and leave Apple UUIDs untouched", async () => {
    sourceHtmlResponse = sourceHtml;
    try {
        for (const handler of [ProcessRequest, RequestDev]) {
            const qweather = await handler({
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110",
                headers: { "Accept-Language": "zh-CN" },
            });
            assert.equal(qweather.$response.status, 200);
            assert.equal(qweather.$response.headers["Cache-Control"], "max-age=0");
            assert.equal(JSON.parse(qweather.$response.body)[0].description, "雷暴橙色预警");

            const native = await handler({
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=35889ee6-fa82-5f9f-8e49-fad78c4f383a",
                headers: {},
            });
            assert.equal(native.$response, undefined);
        }
    } finally {
        sourceHtmlResponse = "";
    }
});

test("Cloudflare Pages handles direct and host-prefixed alert routes", async () => {
    sourceHtmlResponse = sourceHtml;
    try {
        for (const pathname of ["/api/v1/weatherAlerts", "/weatherkit.apple.com/api/v1/weatherAlerts"]) {
            const response = await onRequest({
                request: new globalThis.Request(`https://weatherkit.pages.dev${pathname}?lang=zh-CN&ids=jianye-101190110`),
                env: {},
            });
            const body = await response.json();
            assert.equal(response.status, 200, pathname);
            assert.equal(response.headers.get("Cache-Control"), "max-age=0", pathname);
            assert.equal(body[0].description, "雷暴橙色预警", pathname);
        }
    } finally {
        sourceHtmlResponse = "";
    }
});

test("QWeather identifiers require a nine-digit location token", () => {
    assert.equal(WeatherAlerts.IsQWeatherIdentifier("jianye-101190110"), true);
    assert.equal(WeatherAlerts.IsQWeatherIdentifier("jianye-10119011"), false);
    assert.equal(WeatherAlerts.IsQWeatherIdentifier("35889ee6-fa82-5f9f-8e49-fad78c4f383a"), false);
});
