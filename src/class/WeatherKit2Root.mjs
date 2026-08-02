import { FlatBufferRootProcessor } from "../../packages/flatbuffer-root/src/index.mjs";
import database from "../function/database.mjs";
import * as WK2 from "../proto/apple/wk2.js";
import WeatherKit2Codec from "./WeatherKit2.mjs";

/**
 * WeatherKit v2 root-table processor backed by the repository's pinned local
 * schema. Product codecs remain in WeatherKit2.mjs; this layer only controls
 * selective root decoding, patch compilation, and opaque slot preservation.
 */
const WeatherKit2Root = new FlatBufferRootProcessor({
    name: "WeatherKit2",
    rootClass: WK2.Weather,
    configurableRootNames: database.WeatherKit.Settings.DataSets,
    codecs: {
        airQuality: productCodec("airQuality", WK2.AirQuality),
        currentWeather: productCodec("currentWeather", WK2.CurrentWeatherData),
        forecastDaily: productCodec("forecastDaily", WK2.DailyForecastData),
        forecastHourly: productCodec("forecastHourly", WK2.HourlyForecastData),
        forecastNextHour: productCodec("forecastNextHour", WK2.NextHourForecastData),
        news: productCodec("news", WK2.News),
        weatherAlerts: productCodec("weatherAlerts", WK2.WeatherAlertCollectionData),
        weatherChanges: productCodec("weatherChange", WK2.WeatherChanges),
        historicalComparisons: productCodec("trendComparison", WK2.HistoricalComparison),
        locationInfo: productCodec("locationInfo", WK2.LocationInfo),
    },
});

export default WeatherKit2Root;

function productCodec(dataSet, tableClass) {
    return {
        tableClass,
        decode: table => WeatherKit2Codec.decode(undefined, dataSet, table),
        encode: (builder, data) => WeatherKit2Codec.encode(builder, dataSet, data),
    };
}
