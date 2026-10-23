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
	for(let page of ["options.html", "log.html"]){
		let html = fs.readFileSync(path.join(ROOT, page), "utf8");
		let ids = Array.from(html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g), (match) => match[1]);
		assert.deepStrictEqual(ids.filter((id) => !(id in english)), [], page);
	}
});
