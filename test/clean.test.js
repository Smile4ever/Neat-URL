"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { clean, CASES, makeConfig } = require("./helpers.js");

test("cases.json with the Firefox engine (cleanUrl)", async (t) => {
	for(let c of CASES){
		await t.test(c.name, () => {
			assert.strictEqual(clean.cleanUrl(c.url, makeConfig(c.config)), c.expected);
		});
	}
});

test("cleaning twice gives the same result (no redirect loops)", () => {
	for(let c of CASES){
		let config = makeConfig(c.config);
		let once = clean.cleanUrl(c.url, config);
		assert.strictEqual(clean.cleanUrl(once, config), once, c.name);
	}
});

test("non-http URLs are not changed", () => {
	let config = makeConfig();
	assert.strictEqual(clean.cleanUrl("ftp://example.com/?utm_source=a", config), "ftp://example.com/?utm_source=a");
	assert.strictEqual(clean.cleanUrl("not a url", config), "not a url");
});

test("options.applied gets the rules that changed the URL (for the log)", () => {
	let applied = (url, caseConfig) => {
		let set = new Set();
		clean.cleanUrl(url, makeConfig(caseConfig), { applied: set });
		return Array.from(set).sort();
	};
	assert.deepStrictEqual(applied("https://example.com/?utm_source=a&utm_medium=b&fbclid=c&x=1"), ["fbclid", "utm_*"]);
	assert.deepStrictEqual(applied("https://example.com/?x=1"), []);
	assert.deepStrictEqual(applied("https://example.com/?a=1&b=2", { blocked: "a, !b, b" }), ["a"]);
	assert.deepStrictEqual(applied("https://example.com/#x=1&y=2", { blocked: "#?x" }), ["#?x"]);
	assert.deepStrictEqual(applied("https://example.com/page/ref=abc", { blocked: "$/ref@example.com" }), ["$/ref@example.com"]);
	assert.deepStrictEqual(applied("https://example.com/?url=https%3A%2F%2Fexample.org%2F%3Ffbclid%3Dx", { cleanNested: true }), ["fbclid"]);
});

test("removeParams keeps other parts exactly", () => {
	assert.strictEqual(clean.removeParams("a=1&b&c=%20", (key) => key == "a"), "b&c=%20");
	assert.strictEqual(clean.removeParams("a%5Fb=1&c=2", (key) => key == "a_b"), "c=2");
	assert.strictEqual(clean.removeParams("", () => true), "");
});
