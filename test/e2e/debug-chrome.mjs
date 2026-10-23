// Debug helper: loads dist/chrome with a config and shows which rules match a URL.
// Usage: node test/e2e/debug-chrome.mjs "<blocked params>" <url> [<url> ...]
import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const [blocked, ...urls] = process.argv.slice(2);

const browser = await puppeteer.launch({ browser: "chrome", headless: true, pipe: true, enableExtensions: true });
await browser.installExtension(path.join(ROOT, "dist/chrome"));
const target = await browser.waitForTarget((t) => t.type() == "service_worker");
const worker = await target.worker();
worker.on("console", (message) => console.log("[sw]", message.type(), message.text()));

console.log(await worker.evaluate(`(async () => {
	await chrome.storage.local.set({ neat_url_blocked_params: ${JSON.stringify(blocked || "")} });
	await new Promise((resolve) => setTimeout(resolve, 1500));
	let state = await NeatURL.background.ensureState();
	let compiled = NeatURL.dnr.compileDnrRules(state.config, { types: state.types });
	let unsupported = [];
	for(let rule of compiled.rules.filter((r) => r.condition.regexFilter)){
		let check = await chrome.declarativeNetRequest.isRegexSupported({ regex: rule.condition.regexFilter, isCaseSensitive: true, requireCapturing: true });
		if(!check.isSupported) unsupported.push(check.reason + " id" + rule.id + " p" + rule.priority + " " + rule.condition.regexFilter);
	}
	let installed = await chrome.declarativeNetRequest.getDynamicRules();
	let byId = new Map(installed.map((r) => [r.id, r]));
	let matches = {};
	for(let url of ${JSON.stringify(urls)}){
		let outcome = await chrome.declarativeNetRequest.testMatchOutcome({ url: url, type: "main_frame" });
		matches[url] = outcome.matchedRules.map((m) => JSON.stringify(byId.get(m.ruleId)));
	}
	let related = installed.filter((r) => JSON.stringify(r.condition).includes(${JSON.stringify(process.env.RULE_FILTER || "")})).map((r) => r.id + " p" + r.priority + " " + r.action.type + " " + JSON.stringify(r.condition));
	return JSON.stringify({ compiled: compiled.rules.length, installed: installed.length, unsupported, matches, related }, null, 2);
})()`));
await browser.close();
