"use strict";
const test = require("node:test");
const assert = require("node:assert");
const sync = require("../src/core/sync.js");
const defaults = require("../src/core/defaults.js");

const bytes = (text) => Buffer.byteLength(text, "utf8");
const hashOf = (value) => sync.toSyncItems({ neat_url_blacklist: value }, "1", 1)[sync.META_KEY].prefs.neat_url_blacklist.hash;

test("splitText keeps every part within the limit and doesn't split characters", () => {
	let text = "a€😀\n\"".repeat(500);
	let parts = sync.splitText(text, 100);
	assert.strictEqual(parts.join(""), text);
	for(let part of parts){
		assert.ok(bytes(JSON.stringify(part)) <= 100, JSON.stringify(part));
		assert.ok(!/[\uD800-\uDBFF]$/.test(part), "no half of a surrogate pair");
	}
	assert.deepStrictEqual(sync.splitText("", 100), [""]);
});

test("the items fit in storage.sync and give the same preferences back", () => {
	let prefs = defaults.getDefaultPrefs();
	prefs.neat_url_blocked_params = Array.from({ length: 2000 }, (_, i) => "p" + i + "@example.com").join("\n");
	prefs.neat_url_clean_nested = true;
	let items = sync.toSyncItems(prefs, "2026.10.24.2", 1234);
	for(let key in items) assert.ok(bytes(key) + bytes(JSON.stringify(items[key])) <= 8192, key);
	assert.ok(sync.totalBytes(items) < sync.MAX_BYTES);

	let result = sync.fromSyncItems(JSON.parse(JSON.stringify(items)));
	assert.deepStrictEqual(result, { version: "2026.10.24.2", time: 1234, prefs: prefs });
});

test("fromSyncItems waits until every chunk of the same upload has arrived", () => {
	let prefs = defaults.getDefaultPrefs();
	prefs.neat_url_blocked_params = "x".repeat(20000);
	let items = sync.toSyncItems(prefs, "1", 1);
	let missing = Object.assign({}, items);
	delete missing["neat_url_sync_chunk:neat_url_blocked_params:1"];
	assert.strictEqual(sync.fromSyncItems(missing), null);

	// A chunk of another upload
	let other = sync.toSyncItems(Object.assign({}, prefs, { neat_url_blocked_params: "y".repeat(20000) }), "1", 2);
	let mixed = Object.assign({}, items, { "neat_url_sync_chunk:neat_url_blocked_params:2": other["neat_url_sync_chunk:neat_url_blocked_params:2"] });
	assert.strictEqual(sync.fromSyncItems(mixed), null);

	assert.strictEqual(sync.fromSyncItems({}), null);
});

test("unknown preferences and wrong types are left out", () => {
	let items = sync.toSyncItems({ neat_url_blacklist: "a.example" }, "1", 1);
	let meta = items[sync.META_KEY];
	items["neat_url_sync_chunk:neat_url_future:0"] = "true";
	meta.prefs.neat_url_future = { chunks: 1, hash: sync.toSyncItems({ neat_url_show_counter: true }, "1", 1)[sync.META_KEY].prefs.neat_url_show_counter.hash };
	items["neat_url_sync_chunk:neat_url_show_counter:0"] = "\"yes\"";
	meta.prefs.neat_url_show_counter = { chunks: 1, hash: hashOf("yes") };
	assert.deepStrictEqual(sync.fromSyncItems(items).prefs, { neat_url_blacklist: "a.example" });
});

test("staleKeys only removes chunks", () => {
	let items = sync.toSyncItems({ neat_url_blacklist: "a" }, "1", 1);
	let stored = ["neat_url_sync_meta", "neat_url_sync_chunk:neat_url_blacklist:0", "neat_url_sync_chunk:neat_url_blacklist:1", "other"];
	assert.deepStrictEqual(sync.staleKeys(items, stored), ["neat_url_sync_chunk:neat_url_blacklist:1"]);
});

test("compareVersions", () => {
	assert.ok(sync.compareVersions("2026.10.24.2", "2026.10.24") > 0);
	assert.ok(sync.compareVersions("2026.10.24", "2026.10.24.1") < 0);
	assert.ok(sync.compareVersions("5.0.0", "2026.10.24") < 0);
	assert.strictEqual(sync.compareVersions("2026.10.24", "2026.10.24"), 0);
});
