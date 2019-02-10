// Slideshow Viewer, Init
// Public Domain / CC0, MirceaKitsune 2018

// to avoid broken image warnings, img elements are initialized using this fake 1x1px transparent gif
const SRC_BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

// valid extensions
const EXTENSIONS_IMG = ["jpg", "jpeg", "png", "gif"];
const EXTENSIONS_SND = ["mp3", "ogg", "wav", "flac"];

// the symbol or word describing a given media type
const TYPE_IMAGES = "⎙";
const TYPE_MUSIC = "♫";

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

// settings, cookie, set
function settings_cookie_set() {
	const expire = 365 * 24 * 60 * 60; // year, hour, minute, second
	const string = JSON.stringify(settings);
	var time = new Date();
	time.setTime(time.getTime() + 1 * expire * 1000);
	document.cookie = "slideshowplayer" + "=" + string + "; expires=" + time.toUTCString();
}

// settings, cookie, get
function settings_cookie_get() {
	const table = document.cookie.match(new RegExp("slideshowplayer" + "=([^;]+)"));
	if(table)
		settings = JSON.parse(table[1]);
}

// settings, global object
var settings = {
	sites: [],
	images: {
		keywords: "artwork",
		count: 100,
		score: 0,
		duration: 10,
		nsfw: false,
		loop: false,
		shuffle: false
	},
	music: {
		keywords: "instrumental",
		count: 10,
		score: 0,
		loop: false,
		shuffle: false,
		volume: 1
	}
};
settings_cookie_get();

// plugins, global object
var plugins = {};
var plugins_settings = [];

// plugins, functions, register
function plugins_register(name, type, func) {
	const name_plugin = type + " " + name;
	plugins[name_plugin] = {
		func: func,
		busy: false,
		busy_timeout: null
	};
	interface_update_controls_sites();
}

// plugins, functions, load
function plugins_load(name) {
	plugins[name].func();
}

// plugins, functions, settings, read
function plugins_settings_read(name, type) {
	// take note that this setting was used by a plugin
	const name_settings = type + "_" + name;
	if(plugins_settings.indexOf(name_settings) < 0)
		plugins_settings.push(name_settings);

	switch(type) {
		case TYPE_IMAGES:
			return settings.images[name];
		case TYPE_MUSIC:
			return settings.music[name];
		default:
			return null;
	}
}

// plugins, functions, ready
function plugins_ready() {
	images_pick();
	music_pick();
}

// plugins, functions, settings, used
function plugins_settings_used(name, type) {
	const name_settings = type + "_" + name;
	return (plugins_settings.indexOf(name_settings) >= 0);
}

// plugins, busy check
function plugins_busy() {
	// return true if any plugin is busy
	for(var plugin in plugins) {
		if(plugins[plugin].busy === true)
			return true;
	}
	return false;
}

// plugins, busy set
function plugins_busy_set(name, type, timeout) {
	const busy = timeout > 0;
	const name_plugin = type + " " + name;
	plugins[name_plugin].busy = busy;

	// automatically mark the plugin as no longer busy after the given timeout
	clearTimeout(plugins[name_plugin].busy_timeout);
	if(busy === true) {
		plugins[name_plugin].busy_timeout = setTimeout(function() {
			plugins_busy_set(name, type, 0);
		}, timeout * 1000);
	}

	// call the ready function if this was the last plugin that finished working
	if(plugins_busy() === false)
		plugins_ready();

	interface_update_media(true, false, false);
}

// data, images, global list
var data_images_all = data_images = [];

// data, images, functions, clear
function images_clear() {
	player_detach();
	data_images_all = [];
	data_images = [];
	interface_update_media(true, true, false);
}

// data, images, functions, add
function images_add(item) {
	player_detach();

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
	if(valid_ext !== true)
		return;

	data_images_all.push(item);
}

// data, images, functions, pick
function images_pick() {
	var new_images = [];
	for(image in data_images_all) {
		// we've reached the maximum count, stop here
		if(new_images.length >= settings.images.count)
			break;

		// add this image if it meets the necessary criteria
		if(data_images_all[image].score >= settings.images.score)
			new_images.push(data_images_all[image]);
	}

	// don't apply the change if it would leave the active player with no images
	if(player_active() === true && new_images.length <= 0)
		return;

	if(new_images.length !== data_images.length) {
		data_images = new_images;

		// suffle the images again
		if(settings.images.shuffle)
			images_shuffle();

		// if the player is active while we changed images, refresh the image player
		if(player_active() === true)
			player_images_skip(player.images.index);
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
	player_detach();
	data_music_all = [];
	data_music = [];
	interface_update_media(true, false, true);
}

// data, music, functions, add
function music_add(item) {
	player_detach();

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
	if(valid_ext !== true)
		return;

	data_music_all.push(item);
}

// data, music, functions, pick
function music_pick() {
	var new_music = [];
	for(song in data_music_all) {
		// we've reached the maximum count, stop here
		if(new_music.length >= settings.music.count)
			break;

		// add this song if it meets the necessary criteria
		if(data_music_all[song].score >= settings.music.score)
			new_music.push(data_music_all[song]);
	}

	// don't apply the change if it would leave the active player with no songs
	if(player_active() === true && new_music.length <= 0)
		return;

	if(new_music.length !== data_music.length) {
		data_music = new_music;

		// suffle the songs again
		if(settings.music.shuffle)
			music_shuffle();

		// if the player is active while we changed songs, refresh the music player
		if(player_active() === true)
			player_music_skip(player.music.index);
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
	if(player_active() === true)
		return "Closing this page will end the current slideshow. Are you sure?";
}

// initialize the interface
interface_init();
