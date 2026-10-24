"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./helpers.js");

const LOCALES = path.join(ROOT, "_locales");
const read = (locale) => JSON.parse(fs.readFileSync(path.join(LOCALES, locale, "messages.json"), "utf8"));

test("every locale has every message of the default locale", () => {
	let english = Object.keys(read("en"));
	for(let locale of fs.readdirSync(LOCALES)){
		let missing = english.filter((key) => !(key in read(locale)));
		assert.deepStrictEqual(missing, [], locale);
	}
});

test("every data-i18n id in the pages exists", () => {
	let english = read("en");
	for(let page of ["options.html"]){
		let html = fs.readFileSync(path.join(ROOT, page), "utf8");
		let ids = Array.from(html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g), (match) => match[1]);
		assert.deepStrictEqual(ids.filter((id) => !(id in english)), [], page);
	}
});

test("the language picker of the options page has every locale", () => {
	let code = fs.readFileSync(path.join(ROOT, "options.js"), "utf8");
	let list = JSON.parse(/const LANGUAGES = (\{[^}]*\});/.exec(code)[1]);
	assert.deepStrictEqual(Object.keys(list).sort(), fs.readdirSync(LOCALES).sort());
});

test("every message id in the scripts of the pages exists", () => {
	let english = read("en");
	for(let script of ["options.js", "log.js"]){
		let code = fs.readFileSync(path.join(ROOT, script), "utf8");
		let ids = Array.from(code.matchAll(/(?:\bmessage|getMessage)\("([^"]+)"/g), (match) => match[1]);
		assert.ok(ids.length > 0, script);
		assert.deepStrictEqual(ids.filter((id) => !(id in english)), [], script);
	}
});
