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

test("removeParams keeps other parts exactly", () => {
	assert.strictEqual(clean.removeParams("a=1&b&c=%20", (key) => key == "a"), "b&c=%20");
	assert.strictEqual(clean.removeParams("a%5Fb=1&c=2", (key) => key == "a_b"), "c=2");
	assert.strictEqual(clean.removeParams("", () => true), "");
});
