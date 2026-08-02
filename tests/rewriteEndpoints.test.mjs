import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dist = new URL("../dist/", import.meta.url);

test("Rewrite artifacts keep AQ and add configurable prefixed WeatherKit routes", async () => {
    const configurable = ["iRingo.WeatherKit.Workers.sgmodule", "iRingo.WeatherKit.Workers.srmodule"];
    for (const filename of configurable) {
        const content = await readFile(new URL(filename, dist), "utf8");
        assert.match(content, /#!arguments\s*=\s*endpoint:/);
        assert.match(content, /https:\/\/\{\{\{endpoint\}\}\}\/weatherkit\.apple\.com\/api\/v1\/airQualityScale/);
        assert.match(content, /weatherkit\.apple\.com\/api\/v1\/weatherAlerts/);
        assert.match(content, /www\.qweather\.com/);
    }

    const loon = await readFile(new URL("iRingo.WeatherKit.Workers.plugin", dist), "utf8");
    assert.match(loon, /\[Argument\][\s\S]*endpoint = input/);
    assert.match(loon, /https:\/\/\{endpoint\}\/weatherkit\.apple\.com\/api\/v2\/weather/);

    const stash = await readFile(new URL("iRingo.WeatherKit.Workers.stoverride", dist), "utf8");
    assert.match(stash, /weatherkit\.pages\.dev\/weatherkit\.apple\.com\/api\/v1\/weatherAlerts/);
});
