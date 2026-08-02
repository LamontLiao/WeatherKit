import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "modules/WeatherkitFix27");

const artifacts = [
    "request.bundle.js",
    "response.bundle.js",
    "iRingo.WeatherKit.plugin",
    "iRingo.WeatherKit.sgmodule",
    "iRingo.WeatherKit.yaml",
    "iRingo.WeatherKit.snippet",
    "iRingo.WeatherKit.stoverride",
    "iRingo.WeatherKit.Workers.plugin",
    "iRingo.WeatherKit.Workers.sgmodule",
    "iRingo.WeatherKit.Workers.yaml",
    "iRingo.WeatherKit.Workers.srmodule",
    "iRingo.WeatherKit.Workers.stoverride",
];

await mkdir(output, { recursive: true });
for (const artifact of artifacts) await copyFile(resolve(root, "dist", artifact), resolve(output, artifact));
