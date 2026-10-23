"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { dnr, domain, clean, CASES, makeConfig, simulateDnr } = require("./helpers.js");

for(let noopBlocks of [false, true]){
	test(`cases.json with the Chrome engine (simulated declarativeNetRequest, no-op redirect ${noopBlocks ? "blocks" : "falls through"})`, async (t) => {
		for(let c of CASES){
			await t.test(c.name, () => {
				let config = makeConfig(c.config);
				let { rules, unsupported } = dnr.compileDnrRules(config, { types: ["main_frame"] });
				// URLs inside parameters and rules marked "fallback" are not done by the rules, but by chrome.js
				let expected = c.expectedRules || (c.nested ? clean.cleanUrl(c.url, config, { nested: false }) : c.expected);
				assert.strictEqual(simulateDnr(rules, c.url, "main_frame", { noopBlocks }), expected);
				assert.strictEqual(dnr.needsFallback(c.url, config, unsupported), !!c.fallback, "needsFallback");
			});
		}
	});
}

test("the default config stays well within Chrome's limits", () => {
	let { rules, warnings } = dnr.compileDnrRules(makeConfig(), { types: ["main_frame"] });
	assert.deepStrictEqual(warnings, []);
	let regexRules = rules.filter((rule) => rule.condition.regexFilter).length;
	assert.ok(rules.length < 500, "rules: " + rules.length);
	assert.ok(regexRules < 300, "regex rules: " + regexRules);
});

test("with one alternative per rule the default config is still within Chrome's limits", () => {
	let { rules, warnings } = dnr.compileDnrRules(makeConfig(), { types: ["main_frame"], maxAlternatives: 1 });
	assert.deepStrictEqual(warnings, []);
	assert.ok(rules.filter((rule) => rule.condition.regexFilter).length < 1000);
});

test("fewer alternatives per rule give the same result", () => {
	for(let c of CASES){
		let config = makeConfig(c.config);
		let { rules } = dnr.compileDnrRules(config, { types: ["main_frame"], maxAlternatives: 1 });
		let expected = c.expectedRules || (c.nested ? clean.cleanUrl(c.url, config, { nested: false }) : c.expected);
		assert.strictEqual(simulateDnr(rules, c.url), expected, c.name);
	}
});

test("rule ids are unique and priorities positive", () => {
	let { rules } = dnr.compileDnrRules(makeConfig({ blocked: "#?pk_*, $/ref@amazon.*, a@*.example.com, b@example.*" }), { types: ["main_frame"] });
	assert.strictEqual(new Set(rules.map((rule) => rule.id)).size, rules.length);
	assert.ok(rules.every((rule) => rule.priority >= 1));
});

test("request types are part of every rule, the blacklist and signed URLs are allowed first", () => {
	let { rules } = dnr.compileDnrRules(makeConfig({ blacklist: "example.org, archive.*" }), { types: ["main_frame", "beacon", "unknown"] });
	for(let rule of rules){
		assert.deepStrictEqual(rule.condition.resourceTypes, ["main_frame", "ping"]);
	}
	let top = Math.max(...rules.map((rule) => rule.priority));
	let allowFirst = rules.filter((rule) => rule.priority == top);
	assert.strictEqual(allowFirst.length, 3);
	assert.ok(allowFirst.every((rule) => rule.action.type == "allow"));
});

test("the rules of a fallback are only needed on that domain", () => {
	let config = makeConfig({ blocked: "*@example.com, !id@example.com" });
	let { unsupported } = dnr.compileDnrRules(config, { types: ["main_frame"] });
	assert.ok(dnr.needsFallback("https://example.com/?a=1", config, unsupported));
	assert.ok(!dnr.needsFallback("https://other.com/?utm_source=1", config, unsupported));
});

test("no rules without supported request types", () => {
	let result = dnr.compileDnrRules(makeConfig(), { types: ["unknown"] });
	assert.strictEqual(result.rules.length, 0);
	assert.strictEqual(result.warnings.length, 1);
});

test("sub_frame rules", () => {
	let { rules } = dnr.compileDnrRules(makeConfig(), { types: ["main_frame", "sub_frame"] });
	assert.strictEqual(simulateDnr(rules, "https://example.com/?utm_source=a", "sub_frame"), "https://example.com/");
	assert.strictEqual(simulateDnr(rules, "https://example.com/?utm_source=a", "image"), "https://example.com/?utm_source=a");
});

test("covers", () => {
	let suffixSet = makeConfig().suffixSet;
	let p = (raw) => domain.parsePattern(raw);
	let g = { type: "global", domain: "" };
	assert.ok(dnr.covers(g, p("example.com"), suffixSet));
	assert.ok(dnr.covers(p("*.example.com"), p("a.example.com"), suffixSet));
	assert.ok(dnr.covers(p("example.*"), p("example.co.uk"), suffixSet));
	assert.ok(dnr.covers(p("*.google.*"), p("*.mail.google.com"), suffixSet));
	assert.ok(!dnr.covers(p("*.example.com"), p("example.*"), suffixSet));
	assert.ok(!dnr.covers(p("example.*"), p("*.example.com"), suffixSet));
	assert.ok(!dnr.covers(p("example.com"), g, suffixSet));
});

test("intersections of overlapping patterns", () => {
	let suffixSet = makeConfig().suffixSet;
	let patterns = dnr.addIntersections(["*.google.com", "mail.google.*", "*.example.co.uk", "*.sub.example.*"].map(domain.parsePattern), suffixSet);
	let keys = patterns.map(domain.patternKey);
	assert.ok(keys.includes("exact:mail.google.com"));
	assert.ok(keys.includes("root:sub.example.co.uk"));
});
