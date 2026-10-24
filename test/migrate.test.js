"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { migrate, defaults, clean, DEFAULT_PARAMS, makeConfig } = require("./helpers.js");

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
	let changes = migrate.migrate(stored, "2026.10.24", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_blocked_params, "Mine:\nfoo\n\nTwitter:\nbar@x.com");
	assert.strictEqual(changes.neat_url_version, "2026.10.24");
});

test("update keeps the labels of the user's list", () => {
	let stored = { neat_url_version: "5.0.0", neat_url_blocked_params: "Mine: foo, gclid\ntweakers: umt@tweakers.net" };
	let changes = migrate.migrate(stored, "2026.10.24", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_blocked_params, "Mine: foo\ntweakers: umt@tweakers.net");
});

test("old counter color upgrade", () => {
	let changes = migrate.migrate({ neat_url_counter_color: "#eeeeee" }, "5.0.0", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_counter_default_color, true);
});

test("icon themes for notifications become dark or light", () => {
	assert.strictEqual(migrate.migrate({ neat_url_version: "5.0.0", neat_url_icon_theme: "dark_notiflight" }, "2026.10.24", DEFAULT_PARAMS).changes.neat_url_icon_theme, "dark");
	assert.strictEqual(migrate.migrate({ neat_url_version: "5.0.0", neat_url_icon_theme: "light_notifdark" }, "2026.10.24", DEFAULT_PARAMS).changes.neat_url_icon_theme, "light");
	assert.strictEqual(migrate.migrate({ neat_url_version: "5.0.0", neat_url_icon_theme: "light" }, "2026.10.24", DEFAULT_PARAMS).changes.neat_url_icon_theme, undefined);
});

// Linkumori was an update of Neat URL in the Chrome Web Store: its data is in storage.local when 2026.10.24 is installed
const LINKUMORI = {
	PurifyUrlsSettings: { status: true },
	customRules: [{ domain: "example.com", param: "ref" }, { domain: "shop.example.org", params: ["aff", "src", "ref"] }],
	whitelist: ["bank.example", "xn--bcher-kva.example"],
	stats: { urlsCleaned: 12 },
	theme: "dark"
};

test("Linkumori: custom rules and whitelist are added to the lists", () => {
	let result = migrate.migrate(LINKUMORI, "2026.10.24", DEFAULT_PARAMS);
	assert.strictEqual(result.changes.neat_url_blocked_params, "ref@*.example.com, aff@*.shop.example.org, src@*.shop.example.org, ref@*.shop.example.org");
	assert.strictEqual(result.changes.neat_url_blacklist, "bank.example, xn--bcher-kva.example");
	assert.strictEqual(result.changes.neat_url_version, "2026.10.24");
	assert.deepStrictEqual(result.remove.sort(), ["PurifyUrlsSettings", "customRules", "stats", "theme", "whitelist"]);
});

test("Linkumori: the old Neat URL preferences are kept, duplicates are skipped", () => {
	let stored = Object.assign({ neat_url_version: "5.0.0", neat_url_blocked_params: "Mine: foo\nref@*.example.com", neat_url_blacklist: "bank.example" }, LINKUMORI);
	let changes = migrate.migrate(stored, "2026.10.24", DEFAULT_PARAMS).changes;
	assert.strictEqual(changes.neat_url_blocked_params, "Mine: foo\nref@*.example.com\naff@*.shop.example.org, src@*.shop.example.org, ref@*.shop.example.org");
	assert.strictEqual(changes.neat_url_blacklist, "bank.example\nxn--bcher-kva.example");
});

test("Linkumori: rules with characters that mean something in Neat URL, and invalid domains are skipped", () => {
	let stored = { PurifyUrlsSettings: { status: true }, customRules: [{ domain: "example.com", params: ["a b", "$x", "u*", "ok"] }, { domain: "", param: "z" }, null], whitelist: ["", 5] };
	let result = migrate.migrate(stored, "2026.10.24", DEFAULT_PARAMS);
	assert.strictEqual(result.changes.neat_url_blocked_params, "ok@*.example.com");
	assert.strictEqual(result.changes.neat_url_blacklist, undefined);
	assert.deepStrictEqual(result.remove.sort(), ["PurifyUrlsSettings", "customRules", "whitelist"]);
});

test("Linkumori: nothing happens without its settings key", () => {
	let result = migrate.migrate({ neat_url_version: "2026.10.24", customRules: [{ domain: "example.com", param: "ref" }] }, "2026.10.24", DEFAULT_PARAMS);
	assert.deepStrictEqual(result, { changes: {}, remove: [] });
});

test("Linkumori: the imported rules clean the domain and its subdomains, the whitelist excludes them", () => {
	let changes = migrate.migrate(LINKUMORI, "2026.10.24", DEFAULT_PARAMS).changes;
	let config = makeConfig({ blocked: changes.neat_url_blocked_params, blacklist: changes.neat_url_blacklist });
	assert.strictEqual(clean.cleanUrl("https://www.example.com/?ref=1&id=2", config), "https://www.example.com/?id=2");
	assert.strictEqual(clean.cleanUrl("https://a.shop.example.org/?aff=1&src=2", config), "https://a.shop.example.org/");
	assert.strictEqual(clean.cleanUrl("https://other.example/?ref=1", config), "https://other.example/?ref=1");
	assert.strictEqual(clean.cleanUrl("https://login.bank.example/?utm_source=x", config), "https://login.bank.example/?utm_source=x");
});
