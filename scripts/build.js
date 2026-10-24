// Builds Neat URL for Firefox and Chrome.
// Usage: node scripts/build.js [firefox] [chrome]
// Output: web-ext-artifacts/neat_url-<version>.<target>.zip, built from dist/<target>/ (also used by the e2e test and web-ext lint)
//
// manifest.json in the repository works in both browsers, so the repository can be loaded without a build.
// A build only keeps the files and manifest keys that one browser needs.
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");

const COMMON_FILES = [
	"_locales", "css", "data", "icons", "options.html", "options.js", "log.js",
	"src/core/defaults.js", "src/core/domain.js", "src/core/params.js", "src/core/clean.js", "src/core/migrate.js",
	"src/background/common.js", "src/content/links.js"
];

const TARGETS = {
	firefox: {
		files: ["src/background/firefox.js"],
		manifest: (manifest) => {
			delete manifest.background.service_worker;
			delete manifest.minimum_chrome_version;
			manifest.permissions = manifest.permissions.filter((permission) => permission != "declarativeNetRequestWithHostAccess");
		}
	},
	chrome: {
		files: ["src/core/dnr.js", "src/background/chrome.js", "src/background/chrome-sw.js"],
		manifest: (manifest) => {
			delete manifest.background.scripts;
			delete manifest.browser_specific_settings;
			manifest.permissions = manifest.permissions.filter((permission) => permission != "webRequestBlocking");
		}
	}
};

function readJson(file){
	return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function copy(relative, outDir){
	let source = path.join(ROOT, relative);
	let target = path.join(outDir, relative);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.cpSync(source, target, { recursive: true });
}

function listFiles(dir, prefix){
	let result = [];
	for(let entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))){
		let relative = prefix ? prefix + "/" + entry.name : entry.name;
		if(entry.isDirectory()) result = result.concat(listFiles(path.join(dir, entry.name), relative));
		else result.push(relative);
	}
	return result;
}

let crcTable = null;
function crc32(buffer){
	if(crcTable == null){
		crcTable = [];
		for(let n = 0; n < 256; n++){
			let c = n;
			for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
			crcTable[n] = c >>> 0;
		}
	}
	let crc = 0xFFFFFFFF;
	for(let byte of buffer) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
	return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Minimal ZIP writer (deflate), so no external tools are needed
function writeZip(dir, zipFile){
	let localParts = [];
	let centralParts = [];
	let offset = 0;

	for(let name of listFiles(dir, "")){
		let data = fs.readFileSync(path.join(dir, name));
		let compressed = zlib.deflateRawSync(data, { level: 9 });
		let nameBuffer = Buffer.from(name, "utf8");
		let crc = crc32(data);

		let local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(0x0800, 6); // UTF-8 names
		local.writeUInt16LE(8, 8); // deflate
		local.writeUInt32LE(0, 10); // time and date
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(compressed.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBuffer.length, 26);
		local.writeUInt16LE(0, 28);
		localParts.push(local, nameBuffer, compressed);

		let central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt16LE(0x0800, 8);
		central.writeUInt16LE(8, 10);
		central.writeUInt32LE(0, 12);
		central.writeUInt32LE(crc, 16);
		central.writeUInt32LE(compressed.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(nameBuffer.length, 28);
		central.writeUInt32LE(offset, 42);
		centralParts.push(central, nameBuffer);

		offset += local.length + nameBuffer.length + compressed.length;
	}

	let centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
	let end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(centralParts.length / 2, 8);
	end.writeUInt16LE(centralParts.length / 2, 10);
	end.writeUInt32LE(centralSize, 12);
	end.writeUInt32LE(offset, 16);

	fs.mkdirSync(path.dirname(zipFile), { recursive: true });
	fs.writeFileSync(zipFile, Buffer.concat(localParts.concat(centralParts, [end])));
}

function build(target){
	let outDir = path.join(ROOT, "dist", target);
	// Retries: sync tools like Dropbox can briefly lock files
	fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
	fs.mkdirSync(outDir, { recursive: true });

	for(let file of COMMON_FILES.concat(TARGETS[target].files)) copy(file, outDir);

	let manifest = readJson("manifest.json");
	TARGETS[target].manifest(manifest);
	fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, "\t") + "\n");

	console.log("Built Neat URL " + manifest.version + " for " + target + ": " + path.relative(ROOT, outDir));

	let zipFile = path.join(ROOT, "web-ext-artifacts", "neat_url-" + manifest.version + "." + target + ".zip");
	writeZip(outDir, zipFile);
	console.log("  " + path.relative(ROOT, zipFile));
}

let args = process.argv.slice(2);
let targets = args.filter((arg) => TARGETS[arg]);
if(targets.length == 0) targets = Object.keys(TARGETS);
for(let target of targets) build(target);
