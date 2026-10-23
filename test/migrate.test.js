"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { migrate, defaults, DEFAULT_PARAMS } = require("./helpers.js");

const V4_DEFAULTS = defaults.VERSION_4_DEFAULT_PARAMS;

test("compareVersions", () => {
	assert.strictEqual(migrate.compareVersions("4.1.5", "5.0.0"), -1);
	assert.strictEqual(migrate.compareVersions("5.0.0", "5.0"), 0);
	assert.strictEqual(migrate.compareVersions("5.0.10", "5.0.9"), 1);
});

test("fresh install only stores the version", () => {
	assert.deepStrictEqual(migrate.migrate({}, "5.0.0", DEFAULT_PARAMS).changes, { neat_url_version: "5.0.0" });
});

test("runs only once per version (B1)", () => {
	let stored = { neat_url_version: "5.0.0", neat_url_blocked_params: "utm_source@mysite.com, fbclid" };
	assert.deepStrictEqual(migrate.migrate(stored, "5.0.0", DEFAULT_PARAMS).changes, {});
});

test("own domain parameters are kept (B2)", () => {
	let stored = { neat_url_version: "4.1.5", neat_url_blocked_params: V4_DEFAULTS.concat(["utm_source@mysite.com", "nb@tweakers.net"]).join(", "), neat_url_hidden_params: "" };
	let changes = migrate.migrate(stored, "5.0.0", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_blocked_params, "utm_source@mysite.com, nb@tweakers.net");
	assert.strictEqual(changes.neat_url_override_default_blocked_params, undefined);
});

test("defaults removed in 4.x stay disabled (B7)", () => {
	let removed = ["utm_source", "ved@google.*", "fbclid"];
	let blocked = V4_DEFAULTS.filter((param) => !removed.includes(param));
	let stored = { neat_url_version: "4.1.5", neat_url_blocked_params: blocked.join(", "), neat_url_hidden_params: removed.join(", ") };
	let changes = migrate.migrate(stored, "5.0.0", DEFAULT_PARAMS).changes;
	// fbclid and ved@google.* are 5.0 defaults: override them
	assert.strictEqual(changes.neat_url_override_default_blocked_params, "ved@google.*, fbclid");
	// utm_source is covered by utm_* in 5.0: exclude it
	assert.strictEqual(changes.neat_url_blocked_params, "!utm_source");
});

test("without neat_url_hidden_params the removed defaults are derived from the list", () => {
	let blocked = V4_DEFAULTS.filter((param) => param != "fbclid");
	let stored = { neat_url_version: "4.0.0", neat_url_blocked_params: blocked.join(", ") };
	let changes = migrate.migrate(stored, "5.0.0", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_override_default_blocked_params, "fbclid");
	assert.strictEqual(changes.neat_url_blocked_params, "");
});

test("a stored list without a version is not treated as 4.x", () => {
	let changes = migrate.migrate({ neat_url_blocked_params: "nb@tweakers.net" }, "5.0.0", DEFAULT_PARAMS).changes;
	assert.deepStrictEqual(changes, { neat_url_version: "5.0.0" });
});

test("exact duplicates of new defaults are removed after an update", () => {
	let stored = { neat_url_version: "5.0.0", neat_url_blocked_params: "gclid, mine" };
	let changes = migrate.migrate(stored, "5.1.0", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_blocked_params, "mine");
});

test("update from 5.0 or 6.x keeps the lines and headers of the user's list", () => {
	let stored = { neat_url_version: "5.0.0", neat_url_blocked_params: "Mine:\nfoo, gclid\n\nTwitter:\ncxt@*.twitter.com, bar@x.com" };
	let changes = migrate.migrate(stored, "7.0.0", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_blocked_params, "Mine:\nfoo\n\nTwitter:\nbar@x.com");
	assert.strictEqual(changes.neat_url_version, "7.0.0");
});

test("old counter color upgrade", () => {
	let changes = migrate.migrate({ neat_url_counter_color: "#eeeeee" }, "5.0.0", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_counter_default_color, true);
});
