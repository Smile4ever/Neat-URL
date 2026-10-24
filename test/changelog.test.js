"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { getSection } = require("../scripts/changelog.js");

const CHANGELOG = "2026.10.24\n=====\n* New\n\n6.0.0 (2022-02-07)\n=====\n* Six\n    * Nested\n\n1.0.0\n=====\n- First\n";

test("changelog: section of a version with a date", () => {
	assert.deepStrictEqual(getSection(CHANGELOG, "6.0.0"), { date: "2022-02-07", notes: "* Six\n    * Nested" });
});

test("changelog: section without a date and the last section", () => {
	assert.deepStrictEqual(getSection(CHANGELOG, "1.0.0"), { date: null, notes: "- First" });
	assert.deepStrictEqual(getSection(CHANGELOG, "2026.10.24"), { date: null, notes: "* New" });
});

test("changelog: unknown version", () => {
	assert.strictEqual(getSection(CHANGELOG, "2.0.0"), null);
	assert.strictEqual(getSection(CHANGELOG, "2026.10"), null);
});

test("changelog: the version in manifest.json is in CHANGELOG.md", () => {
	let version = require("../manifest.json").version;
	let changelog = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
	assert.ok(getSection(changelog, version), "CHANGELOG.md has no section for " + version);
});
