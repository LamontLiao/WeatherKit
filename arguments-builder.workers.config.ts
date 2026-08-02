import { defineConfig } from "@iringo/arguments-builder";

const endpoint = {
	key: "endpoint",
	name: "[重写] 服务端点",
	defaultValue: "weatherkit.pages.dev",
	type: "string" as const,
	description: "Cloudflare Pages/Workers 或兼容反向代理的主机名（不含协议与路径）。",
};

export default defineConfig({
	args: [endpoint],
	output: {
		surge: {
			path: "./dist/iRingo.WeatherKit.Workers.sgmodule",
			template: "./template/surge.workers.handlebars",
			transformEgern: {
				enable: true,
				path: "./dist/iRingo.WeatherKit.Workers.yaml",
			},
		},
		loon: {
			path: "./dist/iRingo.WeatherKit.Workers.plugin",
			template: "./template/loon.workers.handlebars",
		},
		customItems: [
			{
				path: "./dist/iRingo.WeatherKit.Workers.srmodule",
				template: "./template/shadowrocket.workers.handlebars",
			},
			{
				path: "./dist/iRingo.WeatherKit.Workers.stoverride",
				template: "./template/stash.workers.handlebars",
			},
		],
		boxjsSettings: {
			path: "./dist/iRingo.WeatherKit.Workers.boxjs.json",
		},
	},
});
