// Slideshow Viewer, Init
// Public Domain / CC0, MirceaKitsune 2018

// to avoid broken image warnings, img elements are initialized using this fake 1x1px transparent gif
const SRC_BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

// valid extensions, "/" is included to support redirect URL's
const EXTENSIONS_IMG = ["jpg", "jpeg", "png", "gif", "/"];
const EXTENSIONS_SND = ["mp3", "ogg", "wav", "flac", "/"];

// the symbol or word describing a given media type
const TYPE_IMAGES = "⎙";
const TYPE_MUSIC = "♫";
const TYPE_SOURCES = "✉";

// shortcut definitions
const KEY_PLAY = "Enter";
const KEY_IMAGES_PREVIOUS = "ArrowLeft";
const KEY_IMAGES_PLAY = "Backspace";
const KEY_IMAGES_NEXT = "ArrowRight";
const KEY_IMAGES_OPEN = "Tab";
const KEY_MUSIC_PREVIOUS = "ArrowDown";
const KEY_MUSIC_PLAY = "\\";
const KEY_MUSIC_NEXT = "ArrowUp";
const KEY_MUSIC_OPEN = "`";

// set the user agent
Object.defineProperty(navigator, "userAgent", {
	get: function() {
		return "SlideshowViewer/0.1 (by MirceaKitsune)";
	}
});

// settings, url, set
function settings_url_set() {
	var params = "";

	// images
	for(var entry in settings.images) {
		const setting_name = "images_" + entry;
		const setting_value = settings.images[entry];
		const setting_value_default = settings_default.images[entry];
		if(setting_value !== setting_value_default)
			params += setting_name + "=" + setting_value + "&";
	}
	// music
	for(var entry in settings.music) {
		const setting_name = "music_" + entry;
		const setting_value = settings.music[entry];
		const setting_value_default = settings_default.music[entry];
		if(setting_value !== setting_value_default)
			params += setting_name + "=" + setting_value + "&";
	}
	// sites
	if(settings.sites.length > 0 && settings.sites.length < Object.keys(plugins).length)
	{
		const setting_name = "sites";
		const setting_value = settings.sites.toString();
		const setting_value_default = settings_default.sites.toString();
		if(setting_value !== setting_value_default)
			params += setting_name + "=" + setting_value + "&";
	}

	if(params.length > 0)
		params = params.substring(0, params.length - 1); // remove the last &
	else
		params = "default";

	if("#" + params !== window.location.hash) {
		window.location.hash = params;
		onhashchange_block = true; // we don't want a manual update to reload the page, block onhashchange for the next detection
	}
}

// settings, url, get
function settings_url_get() {
	const url = window.location.hash;
	const params = url.substring(1).split("&");
	for(var entry in params) {
		const param = params[entry];
		const param_namevalue = param.split("="); // [0] = param type + name, [1] = param value
		const param_typename = param_namevalue[0].split("_"); // [0] = param type, [1] = param name

		const param_type = param_typename[0];
		const param_name = param_typename.length > 1 ? param_typename[1] : param_typename[0];
		var param_value = param_namevalue[1];

		// convert the value to the proper type
		if(!isNaN(param_value))
			param_value = Number(param_value);
		else if(param_value === "true" || param_value === "false")
			param_value = param_value === "true";

		if(param_value !== null && param_value !== undefined && param_value !== "") {
			if(param_type == "images")
				settings.images[param_name] = param_value;
			else if(param_type == "music")
				settings.music[param_name] = param_value;
			else if(param_type == "sites")
				settings[param_name] = param_value.split(",");
		}
	}
}

// settings, global object
const settings_default = {
	sites: [],
	images: {
		keywords: "anthro",
		count: 1000,
		duration: 10,
		nsfw: false,
		loop: true,
		shuffle: true
	},
	music: {
		keywords: "trance",
		count: 100,
		loop: true,
		shuffle: true,
		volume: 1
	}
};
var settings = {
	sites: settings_default.sites.slice(),
	images: Object.assign({}, settings_default.images),
	music: Object.assign({}, settings_default.music)
};
settings_url_get();

// plugins, global object
var plugins = {};
var plugins_settings = [];
plugins_settings[TYPE_IMAGES] = [];
plugins_settings[TYPE_MUSIC] = [];

// plugins, functions, register
function plugins_register(name, type, func) {
	plugins[name] = {
		func: func,
		type: type,
		busy: false,
		busy_timeout: null
	};
	interface_update_controls_sites();
}

// plugins, functions, load
function plugins_load(name) {
	plugins[name].func();
}

// plugins, functions, ready
function plugins_ready() {
	if(interface_refresh.images) {
		images_pick();
		interface_update_recommendations_images_clear();
	}
	if(interface_refresh.music) {
		music_pick();
		interface_update_recommendations_music_clear();
	}

	// make sure we don't have another update scheduled before marking images and music as refreshed
	if(interface_refresh.timer == 0) {
		interface_refresh.images = false;
		interface_refresh.music = false;
	}
}

// plugins, busy check
function plugins_busy() {
	// return true if any plugin is busy
	var busy = 0;
	for(var plugin in plugins) {
		if(plugins[plugin].busy)
			++busy;
	}
	return busy;
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
	} else if(plugins_busy() == 0) {
		// call the ready function if this was the last plugin that finished working
		plugins_ready();
	}

	interface_update_media(true, false, false);
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

// data, images, functions, clear
function images_clear() {
	data_images_all = [];
	interface_update_media(true, true, false);
}

// data, images, functions, add
function images_add(item) {
	// check that this image doesn't already exist
	for(image in data_images_all) {
		if(data_images_all[image].src === item.src)
			return;
	}

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
	const current_image = data_images[player.images.index];

	// pick the images with the highest score
	data_images = data_images_all.slice();
	data_images.sort(function(a, b) { return b.score - a.score });
	data_images.splice(settings.images.count);

	if(!player_available_images()) {
		// if the player is active and no images are left, clear the image player
		if(player_active_images())
			player_images_clear();
	} else {
		// suffle the images again
		if(settings.images.shuffle)
			images_shuffle();

		// refresh the image player if there are changes to apply
		if(player.images.index >= data_images.length || current_image === null || current_image === undefined || data_images[player.images.index].src !== current_image.src) {
			if(player_active_images() && (player.images.index <= 0 || player.images.index >= data_images.length))
				player.images.index = 1;
			player_images_skip(player.images.index);
		}
	}
}

// data, images, functions, shuffle
function images_shuffle() {
	for(var i = data_images.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[data_images[i], data_images[j]] = [data_images[j], data_images[i]];
	}
}

// data, music, global list
var data_music_all = data_music = [];

// data, music, functions, clear
function music_clear() {
	data_music_all = [];
	interface_update_media(true, false, true);
}

// data, music, functions, add
function music_add(item) {
	// check that this song doesn't already exist
	for(song in data_music_all) {
		if(data_music_all[song].src === item.src)
			return;
	}

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
	const current_song = data_music[player.music.index];

	// pick the songs with the highest score
	data_music = data_music_all.slice();
	data_music.sort(function(a, b) { return b.score - a.score });
	data_music.splice(settings.music.count);

	if(!player_available_music()) {
		// if the player is active and no songs are left, clear the music player
		if(player_active_music())
			player_music_clear();
	} else {
		// suffle the songs again
		if(settings.music.shuffle)
			music_shuffle();

		// refresh the music player if there are changes to apply
		if(player.music.index >= data_music.length || current_song === null || current_song === undefined || data_music[player.music.index].src !== current_song.src) {
			if(player_active_music() && (player.music.index <= 0 || player.music.index >= data_music.length))
				player.music.index = 1;
			player_music_skip(player.music.index);
		}
	}
}

// data, music, functions, shuffle
function music_shuffle() {
	for(var i = data_music.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[data_music[i], data_music[j]] = [data_music[j], data_music[i]];
	}
}

// bind shortcut keys to the events of their corresponding elements
document.onkeydown = function(event) {
	// don't handle the event if the key was used inside an input element
	if(event.target.id !== "")
		return;

	switch(event.key) {
		case KEY_PLAY:
			if(typeof interface.media_controls_play.onclick === "function")
				interface.media_controls_play.onclick.apply(interface.media_controls_play);
			break;
		case KEY_IMAGES_PREVIOUS:
			if(typeof interface.media_images_previous.onclick === "function")
				interface.media_images_previous.onclick.apply(interface.media_images_previous);
			break;
		case KEY_IMAGES_PLAY:
			if(typeof interface.media_images_play.onclick === "function")
				interface.media_images_play.onclick.apply(interface.media_images_play);
			break;
		case KEY_IMAGES_NEXT:
			if(typeof interface.media_images_next.onclick === "function")
				interface.media_images_next.onclick.apply(interface.media_images_next);
			break;
		case KEY_IMAGES_OPEN:
			if(typeof interface.media_images_thumb.href === "string" && interface.media_images_thumb.href !== "")
				window.open(interface.media_images_thumb.href, "_blank");
			break;
		case KEY_MUSIC_PREVIOUS:
			if(typeof interface.media_music_previous.onclick === "function")
				interface.media_music_previous.onclick.apply(interface.media_music_previous);
			break;
		case KEY_MUSIC_PLAY:
			if(typeof interface.media_music_play.onclick === "function")
				interface.media_music_play.onclick.apply(interface.media_music_play);
			break;
		case KEY_MUSIC_NEXT:
			if(typeof interface.media_music_next.onclick === "function")
				interface.media_music_next.onclick.apply(interface.media_music_next);
			break;
		case KEY_MUSIC_OPEN:
			if(typeof interface.media_music_thumb.href === "string" && interface.media_music_thumb.href !== "")
				window.open(interface.media_music_thumb.href, "_blank");
			break;
	}
}

// ask the user to confirm they want to leave if the player is busy
window.onbeforeunload = function() {
	if(player_active())
		return "Closing this page will end the current slideshow. Are you sure?";
}

// refresh the page if settings have been updated in the hash URL
// this behavior can be blocked for a turn by setting the blocker to true
var onhashchange_block = false;
window.onhashchange = function() {
	if(onhashchange_block)
		onhashchange_block = false;
	else
		window.location.reload();
}

// initialize the interface
interface_init();
