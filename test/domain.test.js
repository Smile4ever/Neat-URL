"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { domain, params, makeConfig } = require("./helpers.js");

const suffixSet = makeConfig().suffixSet;

test("splitHost", () => {
	assert.deepStrictEqual(domain.splitHost("news.google.co.uk", suffixSet), { host: "news.google.co.uk", root: "google.co.uk", minusSuffix: "news.google", suffix: "co.uk" });
	assert.deepStrictEqual(domain.splitHost("www.google.com", suffixSet), { host: "google.com", root: "google.com", minusSuffix: "google", suffix: "com" });
	// B8: short domains
	assert.deepStrictEqual(domain.splitHost("x.com", suffixSet), { host: "x.com", root: "x.com", minusSuffix: "x", suffix: "com" });
	assert.deepStrictEqual(domain.splitHost("item.jd.com", suffixSet), { host: "item.jd.com", root: "jd.com", minusSuffix: "item.jd", suffix: "com" });
	assert.strictEqual(domain.splitHost("127.0.0.1", suffixSet).suffix, "");
	assert.strictEqual(domain.splitHost("localhost", suffixSet).root, "localhost");
});

test("parsePattern", () => {
	assert.deepStrictEqual(domain.parsePattern("www.Example.com"), { type: "exact", domain: "example.com" });
	assert.deepStrictEqual(domain.parsePattern("*.wired.com"), { type: "root", domain: "wired.com" });
	assert.deepStrictEqual(domain.parsePattern("google.*"), { type: "suffix", domain: "google" });
	assert.deepStrictEqual(domain.parsePattern("*.google.*"), { type: "rootSuffix", domain: "google" });
	assert.strictEqual(domain.parsePattern(""), null);
	assert.strictEqual(domain.parsePattern("*"), null);
	assert.strictEqual(domain.parsePattern("a*b.com"), null);
});

test("matchesPattern", () => {
	let host = (h) => domain.splitHost(h, suffixSet);
	let m = (pattern, h) => domain.matchesPattern(domain.parsePattern(pattern), host(h));
	assert.ok(m("example.com", "www.example.com"));
	assert.ok(!m("example.com", "sub.example.com"));
	assert.ok(m("*.example.com", "example.com"));
	assert.ok(m("*.example.com", "a.b.example.com"));
	assert.ok(m("google.*", "google.co.uk"));
	assert.ok(!m("google.*", "news.google.com"));
	assert.ok(m("*.aliexpress.*", "nl.aliexpress.com")); // B6
	assert.ok(m("*.aliexpress.*", "aliexpress.ru"));
	assert.ok(!m("*.aliexpress.*", "notaliexpress.com"));
});

test("isBlacklisted (B9)", () => {
	let blacklisted = (host, list) => domain.isBlacklisted(domain.splitHost(host, suffixSet), params.parseBlacklist(list));
	assert.ok(blacklisted("www.example.com", "example.com"));
	assert.ok(blacklisted("sub.example.com", "example.com"));
	assert.ok(!blacklisted("example.com", "ample.com"));
	assert.ok(blacklisted("archive.org", "archive.*"));
	assert.ok(!blacklisted("web.archive.org", "archive.*"));
	assert.ok(blacklisted("web.archive.org", "*.archive.*"));
});
