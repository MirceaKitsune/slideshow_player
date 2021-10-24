// Slideshow Viewer, Data
// Public Domain / CC0, MirceaKitsune 2018

// the symbol or word describing a given media type
const TYPE_IMAGES = "⎙";
const TYPE_MUSIC = "♫";
const TYPE_SOURCES = "✉";

// valid extensions, "/" is included to support redirect URL's
const EXTENSIONS_IMG = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "svgz", "/"];
const EXTENSIONS_SND = ["mp3", "ogg", "wav", "flac", "/"];

// plugins, global object
var plugins = {};
var plugins_settings = [];
plugins_settings[TYPE_IMAGES] = [];
plugins_settings[TYPE_MUSIC] = [];

// plugins, HTML element storage
var plugins_jsonp_elements = [];

// plugins, functions, register
function plugins_register(name, type, url, func) {
	plugins[name] = {
		func: func,
		type: type,
		url: url,
		busy: false,
		busy_timeout: null
	};
	interface_update_controls_sites();
}

// plugins, functions, load
function plugins_load(name) {
	plugins[name].func();
}

// plugins, get, jsonp
function plugins_get_jsonp(url, callback, proxy) {
	// most sources that offer JSON don't offer JSONP support too, meaning the callback parameter will have no effect by default
	// if so we need to run the URL through a JSON to JSONP converter, which can wrap our response in a callback function
	var src = url + "&callback=" + callback;

	// list of known JSONP proxies, pick one below
	// 1: json2jsonp.com
	// 2: jsonp.afeld.me
	const proxy_server = 1;
	if(proxy) {
		switch(proxy_server) {
			case 1:
				src = "https://json2jsonp.com/?url=" + encodeURIComponent(url + " ") + "&callback=" + callback;
				break;
			case 2:
				src = "https://jsonp.afeld.me/?callback=" + callback + "&url=" + encodeURIComponent(url);
				break;
		}
	}

	// create a script element and give it the new URL
	var element = document.createElement("script");
	element.type = "text/javascript";
	element.src = src;
	element.onerror = "eval(" + callback + "({}))";
	document.body.appendChild(element);
	plugins_jsonp_elements.push(element);
}

// plugins, get, fetch
function plugins_get_fetch(url, callback) {
	// use the builtin fetch function to download the response body
	fetch(url).then(function(response) {
		// convert the response to json
		return response.json();
	}).then(function(json) {
		// fetching the resource succeeded
		// in this case, execute the callback function with the response
		// as the callback function is delivered as a string, for compatibility with the fallback method below, use eval to call it
		eval(callback + "(" + JSON.stringify(json) + ")");
	}).catch(function(error) {
		// fetching the resource failed
		// if we're here, the cross-origin policy most likely restricted our attempt to download the response directly
		// as in some cases this may be a page issue, the best approach is running the callback without any data to keep the chain going
		eval(callback + "({})");
	});
}

// plugins, get
function plugins_get(url, callback, proxy) {
	// to access the search results returned by an API, we need to fetch and parse the JSON object
	// this can be complicated as many servers don't add an exception to the cross-origin policy for their responses
	// as such, we use various methods to get the response as efficiently as possible, based on the capabilities indicated by the plugin

	// proxy is null: the plugin tells us that CORS is supported, attempt to fetch the resource directly
	// proxy is false: the plugin tells us that CORS is not supported, but jsonp is supported, so embed as JSONP
	// proxy is true: the plugin tells us that CORS is not supported, and jsonp is not supported either, so embed as JSONP using a proxy
	if(proxy === null || proxy === undefined)
		plugins_get_fetch(url, callback);
	else if(proxy === false)
		plugins_get_jsonp(url, callback, false);
	else if(proxy === true)
		plugins_get_jsonp(url, callback, true);
}

// plugins, functions, update items
function plugins_update(type) {
	const busy = plugins_busy();
	const update_images = type === TYPE_IMAGES || type === null || type === undefined;
	const update_music = type === TYPE_MUSIC || type === null || type === undefined;

	// pick the items added by the plugin, if either it was the final plugin of its type or the player is stopped
	// this offers availability as soon as possible once the player loads, but without refreshing the items constantly while the viewer is watching
	if(update_images && interface_refresh.images) {
		// if this was the last image plugin, we've finished refreshing images
		if(busy[TYPE_IMAGES] == 0)
			interface_refresh.images = false;

		// pick the new images added by the plugin
		if(busy[TYPE_IMAGES] == 0 || !player_active()) {
			images_pick();
			interface_update_recommendations_images_clear();
			interface_update_media(false, true, true, false, false);
		}
	}
	if(update_music && interface_refresh.music) {
		// if this was the last music plugin, we've finished refreshing music
		if(busy[TYPE_MUSIC] == 0)
			interface_refresh.music = false;

		// pick the new songs added by the plugin
		if(busy[TYPE_MUSIC] == 0 || !player_active()) {
			music_pick();
			interface_update_recommendations_music_clear();
			interface_update_media(false, false, true, true, false);
		}
	}

	// if all plugins finished working, remove the HTML elements of jsonp plugin scripts
	if(busy[TYPE_IMAGES] == 0 && busy[TYPE_MUSIC] == 0) {
		for(var item in plugins_jsonp_elements) {
			var element = plugins_jsonp_elements[item];
			if(document.body.contains(element))
				document.body.removeChild(element);
		}
		plugins_jsonp_elements = [];
	}
}

// plugins, busy check per plugin type
function plugins_busy() {
	var busy = {};
	busy[TYPE_IMAGES] = 0;
	busy[TYPE_MUSIC] = 0;

	for(var plugin in plugins) {
		if(plugins[plugin].busy) {
			if(plugins[plugin].type === TYPE_IMAGES)
				++busy[TYPE_IMAGES];
			if(plugins[plugin].type === TYPE_MUSIC)
				++busy[TYPE_MUSIC];
		}
	}

	return busy;
}

// plugins, busy check
function plugins_busy_get(name) {
	return plugins[name].busy;
}

// plugins, busy set
function plugins_busy_set(name, timeout) {
	const busy = timeout !== null && timeout !== undefined;
	plugins[name].busy = busy;

	// automatically mark the plugin as no longer busy after the given timeout
	clearTimeout(plugins[name].busy_timeout);
	if(busy) {
		plugins[name].busy_timeout = setTimeout(function() {
			plugins_busy_set(name, null);
		}, timeout * 1000);
	} else {
		plugins_update(null);
	}

	interface_update_media(false, false, true, false, false);
}

// plugins, functions, settings, read
function plugins_settings_read(name, type) {
	// take note that this setting was used by a plugin
	if(plugins_settings[type].indexOf(name) < 0)
		plugins_settings[type].push(name);

	switch(type) {
		case TYPE_IMAGES:
			return settings.images[name];
		case TYPE_MUSIC:
			return settings.music[name];
		default:
			return null;
	}
}

// plugins, functions, settings, used
function plugins_settings_used(name, type) {
	return plugins_settings[type].indexOf(name) >= 0;
}

// data, images, global list
var data_images_all = data_images = [];
var score_images_best = 0;
var score_images_average = 0;

// data, images, get current
function images_current() {
	if(data_images.length >= player.images.index)
		return data_images[player.images.index - 1];
	return null;
}

// data, images, functions, clear
function images_clear() {
	data_images_all = [];
	interface_update_media(false, true, true, false, false);
}

// data, images, functions, clear active
function images_clear_active() {
	data_images = [];
	images_pick();
	interface_update_media(false, true, true, false, false);
}

// data, images, functions, add
function images_add(item) {
	// check that all mandatory fields are set
	if(typeof item.src !== "string")
		return;
	if(typeof item.thumb !== "string")
		return;
	if(typeof item.title !== "string")
		return;
	if(typeof item.author !== "string")
		return;
	if(typeof item.url !== "string")
		return;
	if(typeof item.score !== "number")
		return;
	if(typeof item.tags !== "object")
		return;

	// check that the extension is a valid image
	var valid_ext = false;
	for(extension in EXTENSIONS_IMG) {
		const check_ext = EXTENSIONS_IMG[extension];
		const str_url = item.src;
		const str_ext = str_url.substring(str_url.length, str_url.length - check_ext.length).toLowerCase();
		if(str_ext === check_ext) {
			valid_ext = true;
			break;
		}
	}
	if(!valid_ext)
		return;

	data_images_all.push(item);
	data_images_all.splice(1000000);
}

// data, images, functions, pick
function images_pick() {
	const current_image = images_current();

	// pick the images with the highest score
	data_images = data_images_all.slice();
	data_images.sort(function(a, b) { return b.score - a.score });
	data_images.splice(settings.images.count);

	// update global score
	score_images_best = 0;
	score_images_average = 0;
	var score_all = 0;
	for(image in data_images) {
		const score = data_images[image].score;
		if(score > score_images_best)
			score_images_best = score;
		score_all += score;
	}
	score_images_average = Math.round(score_all / data_images.length);

	if(!player_available_images()) {
		// if the player is active and no images are left, clear the image player
		if(player_active_images())
			player_images_clear();
	} else if(player_active_images()) {
		// suffle the images again
		images_shuffle();

		// refresh the image player if there are changes to apply
		if(player.images.index >= data_images.length || current_image === null || current_image === undefined || images_current().src !== current_image.src) {
			player.images.transition = 1;
			player.images.index = 1;
			player_images_skip(player.images.index);

			// immediately mark images as preloading
			player.images.preloading_previous = true;
			player.images.preloading_current = true;
			player.images.preloading_next = true;
		}
	}
}

// data, images, functions, shuffle
function images_shuffle() {
	if(!settings.images.shuffle)
		return;

	for(var i = data_images.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[data_images[i], data_images[j]] = [data_images[j], data_images[i]];
	}
}

// data, music, global list
var data_music_all = data_music = [];
var score_music_best = 0;
var score_music_average = 0;

// data, music, get current
function music_current() {
	if(data_music.length >= player.music.index)
		return data_music[player.music.index - 1];
	return null;
}

// data, music, functions, clear
function music_clear() {
	data_music_all = [];
	interface_update_media(false, false, true, true, false);
}

// data, music, functions, clear active
function music_clear_active() {
	data_music = [];
	music_pick();
	interface_update_media(false, false, true, true, false);
}

// data, music, functions, add
function music_add(item) {
	// check that all mandatory fields are set
	if(typeof item.src !== "string")
		return;
	if(typeof item.thumb !== "string")
		return;
	if(typeof item.title !== "string")
		return;
	if(typeof item.author !== "string")
		return;
	if(typeof item.url !== "string")
		return;
	if(typeof item.score !== "number")
		return;
	if(typeof item.tags !== "object")
		return;

	// check that the extension is a valid song
	var valid_ext = false;
	for(extension in EXTENSIONS_SND) {
		const check_ext = EXTENSIONS_SND[extension];
		const str_url = item.src;
		const str_ext = str_url.substring(str_url.length, str_url.length - check_ext.length).toLowerCase();
		if(str_ext === check_ext) {
			valid_ext = true;
			break;
		}
	}
	if(!valid_ext)
		return;

	data_music_all.push(item);
	data_music_all.splice(1000000);
}

// data, music, functions, pick
function music_pick() {
	const current_song = music_current();

	// pick the songs with the highest score
	data_music = data_music_all.slice();
	data_music.sort(function(a, b) { return b.score - a.score });
	data_music.splice(settings.music.count);

	// update global score
	score_music_best = 0;
	score_music_average = 0;
	var score_all = 0;
	for(song in data_music) {
		const score = data_music[song].score;
		if(score > score_music_best)
			score_music_best = score;
		score_all += score;
	}
	score_music_average = Math.round(score_all / data_music.length);

	if(!player_available_music()) {
		// if the player is active and no songs are left, clear the music player
		if(player_active_music())
			player_music_clear();
	} else if(player_active_music()) {
		// suffle the songs again
		music_shuffle();

		// refresh the music player if there are changes to apply
		if(player.music.index >= data_music.length || current_song === null || current_song === undefined || music_current().src !== current_song.src) {
			player.music.index = 1;
			player_music_skip(player.music.index);

			// immediately mark songs as preloading
			player.music.preloading = true;
		}
	}
}

// data, music, functions, shuffle
function music_shuffle() {
	if(!settings.music.shuffle)
		return;

	for(var i = data_music.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[data_music[i], data_music[j]] = [data_music[j], data_music[i]];
	}
}

// initialize the interface
interface_init();
