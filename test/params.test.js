"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { params } = require("./helpers.js");

test("parseList", () => {
	assert.deepStrictEqual(params.parseList("a, b ,c,,"), ["a", "b", "c"]);
	assert.deepStrictEqual(params.parseList(""), []);
	assert.deepStrictEqual(params.parseList(undefined), []);
});

test("parseEntry", () => {
	let e = (raw) => {
		let entry = params.parseEntry(raw);
		return entry && { kind: entry.kind, name: entry.name, prefix: entry.prefix, force: entry.force, pattern: entry.pattern.type };
	};
	assert.deepStrictEqual(e("utm_*"), { kind: "query", name: "utm_", prefix: true, force: false, pattern: "global" });
	assert.deepStrictEqual(e("utm_*@omgubuntu.co.uk"), { kind: "query", name: "utm_", prefix: true, force: false, pattern: "exact" });
	assert.deepStrictEqual(e("!ref@amazon.co.uk"), { kind: "exclude", name: "ref", prefix: false, force: false, pattern: "exact" });
	assert.deepStrictEqual(e("$/ref@amazon.*"), { kind: "ending", name: "/ref", prefix: false, force: false, pattern: "suffix" });
	assert.deepStrictEqual(e("$$/ref@amazon.*"), { kind: "ending", name: "/ref", prefix: false, force: true, pattern: "suffix" });
	assert.deepStrictEqual(e("#?pk_campaign@vivaldi.com"), { kind: "hashParam", name: "pk_campaign", prefix: false, force: false, pattern: "exact" });
	assert.deepStrictEqual(e("#xtor=RSS-8"), { kind: "hashExact", name: "#xtor=RSS-8", prefix: false, force: false, pattern: "global" });
	assert.deepStrictEqual(e("#*"), { kind: "hashClear", name: "", prefix: false, force: false, pattern: "global" });
	assert.deepStrictEqual(e("#?*"), { kind: "hashClear", name: "", prefix: false, force: false, pattern: "global" });
	assert.strictEqual(e("param@"), null);
	assert.strictEqual(e("@example.com"), null);
	assert.strictEqual(e("=x"), null);
	assert.strictEqual(e("KEY{0}"), null);

	let full = (raw) => params.parseEntry(raw);
	assert.strictEqual(full("*@example.com").all, true);
	assert.strictEqual(full("KEY{11}").keyLength, 11);
	assert.deepStrictEqual([full("ref=share@amazon.com").name, full("ref=share@amazon.com").value], ["ref", "share"]);
	assert.strictEqual(full("!id").kind, "exclude");
});

test("entryMatchesKey", () => {
	let m = (raw, key, value) => params.entryMatchesKey(params.parseEntry(raw), key, value);
	assert.ok(m("*", "anything"));
	assert.ok(m("KEY{3}", "abc") && !m("KEY{3}", "abcd"));
	assert.ok(m("ref=share", "ref", "share") && !m("ref=share", "ref", "other") && !m("ref=share", "ref", undefined));
	assert.ok(m("utm_*", "utm_x") && !m("utm_*", "xutm_"));
});

test("parseList skips header lines", () => {
	assert.deepStrictEqual(params.parseList("Campaign tracking (powerdns):\nhss_channel\n\nOther:\na, b"), ["hss_channel", "a", "b"]);
});

test("parseList skips labels at the start of a line", () => {
	assert.deepStrictEqual(params.parseList("tweakers: umt@tweakers.net\ntest=222, google.com"), ["umt@tweakers.net", "test=222", "google.com"]);
	assert.deepStrictEqual(params.parseList("Campaign tracking (Adobe):  sc_cid, mkt_tok"), ["sc_cid", "mkt_tok"]);
	// Not a label: no space after the colon, or a comma, @ or = before it
	assert.deepStrictEqual(params.parseList("a:b, c"), ["a:b", "c"]);
	assert.deepStrictEqual(params.parseList("x@a.com, y: z"), ["x@a.com", "y:z"]);
	assert.deepStrictEqual(params.parseList("ref=a: b"), ["ref=a:b"]);
});

test("splitLabel", () => {
	assert.deepStrictEqual(params.splitLabel("Tweakers: nb@tweakers.net"), { label: "Tweakers: ", rules: "nb@tweakers.net" });
	assert.deepStrictEqual(params.splitLabel("Header:"), { label: "Header:", rules: "" });
	assert.deepStrictEqual(params.splitLabel("a, b"), { label: "", rules: "a, b" });
});

test("effectiveParams: defaults minus overrides plus own parameters", () => {
	assert.deepStrictEqual(params.effectiveParams(["a", "b"], ["b"], ["c", "a"]), ["a", "c"]);
});

test("compileConfig reports invalid parameters", () => {
	let config = params.compileConfig({ defaultParams: ["a"], blockedParams: "b@, c" });
	assert.deepStrictEqual(config.invalid, ["b@"]);
	assert.deepStrictEqual(config.entries.map((e) => e.raw), ["a", "c"]);
});

test("compileConfig without the default parameters (#279)", () => {
	let config = params.compileConfig({ defaultParams: ["a", "b"], useDefaultParams: false, overrides: "b", blockedParams: "c" });
	assert.deepStrictEqual(config.entries.map((e) => e.raw), ["c"]);
	assert.deepStrictEqual(params.compileConfig({ defaultParams: ["a"], useDefaultParams: true }).entries.map((e) => e.raw), ["a"]);
});

test("removesNothing", () => {
	assert.strictEqual(params.removesNothing(params.compileConfig({ defaultParams: ["a"] })), false);
	assert.strictEqual(params.removesNothing(params.compileConfig({ defaultParams: ["a"], useDefaultParams: false })), true);
	assert.strictEqual(params.removesNothing(params.compileConfig({ defaultParams: ["a"], overrides: "a" })), true);
	assert.strictEqual(params.removesNothing(params.compileConfig({ defaultParams: ["a"], useDefaultParams: false, blockedParams: "!b@x.com" })), true);
	assert.strictEqual(params.removesNothing(params.compileConfig({ defaultParams: [], blockedParams: "#?b" })), false);
	assert.strictEqual(params.removesNothing(params.compileConfig({ defaultParams: [], removeTextFragments: true })), false);
});
