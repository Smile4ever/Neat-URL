// The format of the preferences in storage.sync, for the option "Sync preferences" (#123).
// storage.sync allows 8 KB per item and 100 KB in total, so every preference is stored as JSON
// in chunks, with one meta item that lists the chunks:
// * neat_url_sync_meta: { version, time, prefs: { <preference>: { chunks, hash } } }
// * neat_url_sync_chunk:<preference>:<n>: a part of the JSON of the preference
// Another device can receive the items one by one, so the hash tells whether all chunks have arrived.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};
	const defaults = NeatURL.defaults || require("./defaults.js");

	const META_KEY = "neat_url_sync_meta";
	const CHUNK_PREFIX = "neat_url_sync_chunk:";
	// storage.sync.QUOTA_BYTES_PER_ITEM is 8192 bytes for the key and the JSON of the value
	const CHUNK_BYTES = 7000;
	// storage.sync.QUOTA_BYTES is 102400 bytes, some room is left for the other devices of an older version
	const MAX_BYTES = 100000;

	const encoder = new TextEncoder();

	function byteLength(text){
		return encoder.encode(text).length;
	}

	// FNV-1a, enough to notice chunks of different uploads
	function hash(text){
		let h = 0x811c9dc5;
		for(let i = 0; i < text.length; i++){
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return (h >>> 0).toString(16);
	}

	// Splits text so that the JSON of every part has at most maxBytes, without splitting a character
	function splitText(text, maxBytes){
		let parts = [];
		let current = "";
		let size = 2; // the quotes of the JSON string
		for(let character of text){
			let cost = byteLength(JSON.stringify(character)) - 2;
			if(size + cost > maxBytes && current != ""){
				parts.push(current);
				current = "";
				size = 2;
			}
			current += character;
			size += cost;
		}
		parts.push(current);
		return parts;
	}

	function chunkKey(pref, n){
		return CHUNK_PREFIX + pref + ":" + n;
	}

	// The items for storage.sync with these preferences
	function toSyncItems(prefs, version, time){
		let meta = { version: version, time: time, prefs: {} };
		let items = {};
		for(let pref in defaults.validPrefs(prefs)){
			let json = JSON.stringify(prefs[pref]);
			let chunks = splitText(json, CHUNK_BYTES);
			chunks.forEach((chunk, n) => items[chunkKey(pref, n)] = chunk);
			meta.prefs[pref] = { chunks: chunks.length, hash: hash(json) };
		}
		items[META_KEY] = meta;
		return items;
	}

	// The size that storage.sync counts: the key and the JSON of the value
	function totalBytes(items){
		let total = 0;
		for(let key in items) total += byteLength(key) + byteLength(JSON.stringify(items[key]));
		return total;
	}

	// Chunks in storage.sync that the new items don't use any more
	function staleKeys(items, storedKeys){
		return storedKeys.filter((key) => key.startsWith(CHUNK_PREFIX) && !(key in items));
	}

	// The preferences in the items of storage.sync: { version, time, prefs }.
	// null if there are none, or if not all chunks have arrived yet. Unknown preferences (of a newer version) are left out.
	function fromSyncItems(items){
		let meta = items && items[META_KEY];
		if(meta == null || typeof meta != "object" || meta.prefs == null || typeof meta.prefs != "object") return null;

		let prefs = {};
		for(let pref in meta.prefs){
			if(!(pref in defaults.PREFS)) continue;
			let info = meta.prefs[pref];
			let json = "";
			for(let n = 0; n < info.chunks; n++){
				let chunk = items[chunkKey(pref, n)];
				if(typeof chunk != "string") return null;
				json += chunk;
			}
			if(hash(json) != info.hash) return null;
			try{
				prefs[pref] = JSON.parse(json);
			}catch(error){
				return null;
			}
		}
		return { version: String(meta.version || ""), time: Number(meta.time) || 0, prefs: defaults.validPrefs(prefs) };
	}

	// Compares versions like 2026.10.24.1 and 5.0.0 part by part: < 0, 0 or > 0
	function compareVersions(a, b){
		let pa = String(a).split(".").map(Number);
		let pb = String(b).split(".").map(Number);
		for(let i = 0; i < Math.max(pa.length, pb.length); i++){
			let d = (pa[i] || 0) - (pb[i] || 0);
			if(d != 0) return d;
		}
		return 0;
	}

	// The preferences in synced that are different in prefs
	function changedPrefs(synced, prefs){
		let result = {};
		for(let pref in synced){
			if(synced[pref] !== prefs[pref]) result[pref] = synced[pref];
		}
		return result;
	}

	NeatURL.sync = { META_KEY, CHUNK_PREFIX, CHUNK_BYTES, MAX_BYTES, splitText, toSyncItems, totalBytes, staleKeys, fromSyncItems, compareVersions, changedPrefs };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.sync;
})(globalThis);
