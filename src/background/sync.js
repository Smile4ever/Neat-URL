// Option "Sync preferences" (#123): the preferences of storage.local are copied to storage.sync and back,
// so they are the same on every device where the option is on. The format is in src/core/sync.js.
// * storage.local stays the source of truth: the rest of Neat URL only reads storage.local.
// * The last change wins. A local change that is not uploaded yet is kept in PENDING_KEY with its time,
//   so a download of older preferences doesn't overwrite it, also when the background was suspended.
// * A device with an older version of Neat URL doesn't download or upload the preferences of a newer version.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL;
	const sync = NeatURL.sync;
	const PREF_KEYS = Object.keys(NeatURL.defaults.PREFS);
	const SYNC_KEY = "neat_url_sync"; // true when the option is on, per device
	const PENDING_KEY = "neat_url_sync_pending"; // time of a local change that is not uploaded yet, or 0
	const STATUS_KEY = "neat_url_sync_status"; // { time, result } for the options page
	const UPLOAD_DELAY = 2000; // storage.sync allows 120 writes per minute, so changes are combined

	let version = browser.runtime.getManifest().version;
	let uploadTimer = null;
	let queue = Promise.resolve();

	// One synchronization at a time
	function enqueue(task){
		queue = queue.then(task).catch(async (error) => {
			console.error("[Neat URL]: sync failed", error);
			await setStatus("error");
		});
		return queue;
	}

	async function isOn(){
		let result = await browser.storage.local.get(SYNC_KEY);
		return result[SYNC_KEY] === true;
	}

	async function getLocal(){
		let stored = await browser.storage.local.get(PREF_KEYS.concat([PENDING_KEY]));
		let prefs = NeatURL.defaults.getDefaultPrefs();
		for(let key of PREF_KEYS){
			if(stored[key] != undefined) prefs[key] = stored[key];
		}
		return { prefs: prefs, pending: stored[PENDING_KEY] || 0 };
	}

	async function getSynced(){
		let items = await browser.storage.sync.get(null);
		return { items: items, synced: sync.fromSyncItems(items) };
	}

	function setStatus(result){
		return browser.storage.local.set({ [STATUS_KEY]: { time: Date.now(), result: result } });
	}

	async function upload(){
		let local = await getLocal();
		if(!local.pending) return;
		let { items, synced } = await getSynced();
		if(synced && sync.compareVersions(synced.version, version) > 0){
			await setStatus("newer_version");
			return;
		}
		if(synced && Object.keys(sync.changedPrefs(local.prefs, synced.prefs)).length == 0){
			await browser.storage.local.set({ [PENDING_KEY]: 0 });
			return;
		}

		let newItems = sync.toSyncItems(local.prefs, version, local.pending);
		if(sync.totalBytes(newItems) > sync.MAX_BYTES){
			await setStatus("too_big");
			return;
		}
		await browser.storage.sync.set(newItems);
		let stale = sync.staleKeys(newItems, Object.keys(items));
		if(stale.length > 0) await browser.storage.sync.remove(stale);

		// Only clear the pending change when there was no newer one in the meantime
		let after = await getLocal();
		if(after.pending == local.pending) await browser.storage.local.set({ [PENDING_KEY]: 0 });
		await setStatus("uploaded");
	}

	// force: use the synchronized preferences, also when there is a newer local change
	async function download(force){
		let { synced } = await getSynced();
		if(synced == null) return; // nothing synchronized yet, or not all chunks have arrived
		if(sync.compareVersions(synced.version, version) > 0){
			await setStatus("newer_version");
			return;
		}
		let local = await getLocal();
		if(!force && local.pending > synced.time) return; // the local change is newer, it is uploaded

		let changes = sync.changedPrefs(synced.prefs, local.prefs);
		changes[PENDING_KEY] = 0;
		// storage.onChanged of common.js reloads the state
		await browser.storage.local.set(changes);
		if(Object.keys(changes).length > 1) await setStatus("downloaded");
	}

	function scheduleUpload(){
		clearTimeout(uploadTimer);
		uploadTimer = setTimeout(() => enqueue(upload), UPLOAD_DELAY);
	}

	browser.storage.onChanged.addListener((changes, area) => {
		if(area == "local" && PREF_KEYS.some((key) => key in changes)){
			enqueue(async () => {
				if(!(await isOn())) return;
				// A download also changes storage.local: that is no local change
				let [local, { synced }] = await Promise.all([getLocal(), getSynced()]);
				if(synced && Object.keys(sync.changedPrefs(local.prefs, synced.prefs)).length == 0) return;
				await browser.storage.local.set({ [PENDING_KEY]: Date.now() });
				scheduleUpload();
			});
		}
		if(area == "sync" && sync.META_KEY in changes){
			enqueue(async () => {
				if(await isOn()) await download(false);
			});
		}
	});

	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		// From the options page. use: "local" keeps the preferences of this device, "synced" takes the synchronized ones
		if(message.action == "sync-enable"){
			enqueue(async () => {
				await browser.storage.local.set({ [SYNC_KEY]: true, [PENDING_KEY]: message.use == "local" ? Date.now() : 0 });
				if(message.use == "local") await upload();
				else await download(true);
			}).then(() => sendResponse(true));
			return true; // sendResponse is called asynchronously
		}
		if(message.action == "sync-disable"){
			clearTimeout(uploadTimer);
			enqueue(() => browser.storage.local.set({ [SYNC_KEY]: false, [PENDING_KEY]: 0 })).then(() => sendResponse(true));
			return true;
		}
	});

	// The background may have been suspended before an upload, or changes may have arrived while it didn't run
	enqueue(async () => {
		if(!(await isOn())) return;
		let local = await getLocal();
		if(local.pending) await upload();
		else await download(false);
	});

	NeatURL.backgroundSync = { upload, download };
})(globalThis);
