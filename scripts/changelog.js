// Prints the release notes of one version from CHANGELOG.md.
// Usage: node scripts/changelog.js <version>
// A version is a line "<version>" or "<version> (<date>)", underlined with "=".
"use strict";
const fs = require("fs");
const path = require("path");

function getSection(changelog, version) {
	let lines = changelog.replace(/\r\n/g, "\n").split("\n");
	let isHeading = (i) => i + 1 < lines.length && /^=+$/.test(lines[i + 1]) && lines[i].trim() !== "";
	let start = lines.findIndex((line, i) => isHeading(i) && line.trim().split(" ")[0] === version);
	if (start === -1) return null;

	let end = start + 2;
	while (end < lines.length && !isHeading(end)) end++;
	let match = lines[start].match(/\((\d{4}-\d{2}-\d{2})\)/);
	return {
		date: match ? match[1] : null,
		notes: lines.slice(start + 2, end).join("\n").trim()
	};
}

if (require.main === module) {
	let version = process.argv[2];
	let section = version && getSection(fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8"), version);
	if (!section) {
		console.error("Version " + version + " not found in CHANGELOG.md");
		process.exit(1);
	}
	console.log(section.notes);
}

module.exports = { getSection };
