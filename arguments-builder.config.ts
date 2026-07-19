import { defineConfig } from "@iringo/arguments-builder";
import { airQualityFull, api, calculateFull, logLevel, nextHourFull, output, storage, weatherFull } from "./arguments-builder-full.config";

export default defineConfig({
    output: output,
    args: [...weatherFull, ...nextHourFull, ...airQualityFull, ...calculateFull, ...api, ...storage, ...logLevel],
});
