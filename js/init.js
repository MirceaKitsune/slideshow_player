// Slideshow Viewer, Init
// Public Domain / CC0, MirceaKitsune 2018

// to avoid broken image warnings, img elements are initialized using this fake 1x1px transparent gif
const SRC_BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

// valid extensions
const EXTENSIONS_IMG = ["jpg", "jpeg", "png", "gif"];

// shortcut definitions
const KEY_KEYCODE_PLAY = 13;
const KEY_KEYCODE_IMAGES_PREVIOUS = 37;
const KEY_KEYCODE_IMAGES_PLAY = 8;
const KEY_KEYCODE_IMAGES_NEXT = 39;
const KEY_KEYCODE_IMAGES_OPEN = 9;
const KEY_LABEL_PLAY = "Enter";
const KEY_LABEL_IMAGES_PREVIOUS = "Left arrow";
const KEY_LABEL_IMAGES_PLAY = "Backspace";
const KEY_LABEL_IMAGES_NEXT = "Right arrow";
const KEY_LABEL_IMAGES_OPEN = "Tab";

// set the user agent
Object.defineProperty(navigator, "userAgent", {
	get: function() {
		return "SlideshowViewer/0.1 (by MirceaKitsune)";
	}
});

// settings, cookie, set
function settings_cookie_set() {
	var expire = 365 * 24 * 60 * 60; // year, hour, minute, second
	var string = JSON.stringify(settings);
	var time = new Date();
	time.setTime(time.getTime() + 1 * expire * 1000);
	document.cookie = "slideshowplayer" + "=" + string + "; expires=" + time.toUTCString();
}

// settings, cookie, get
function settings_cookie_get() {
	var table = document.cookie.match(new RegExp("slideshowplayer" + "=([^;]+)"));
	if(table)
		settings = JSON.parse(table[1]);
}

// settings, global object
var settings = {
	sites: [],
	images: {
		keywords: "artwork",
		count: 100,
		duration: 10,
		nsfw: false,
		loop: false,
		shuffle: false
	}
};
settings_cookie_get();

// plugins, global object
var plugins = {};
var plugins_settings = [];

// plugins, functions, register
function plugins_register(name, func) {
	plugins[name] = {
		func: func,
		busy: false,
		busy_timeout: null
	};
	interface_update_controls_sites_list();
}

// plugins, functions, load
function plugins_load(name) {
	plugins[name].func();
}

// plugins, functions, settings, images, read
function plugins_settings_images_read(name) {
	// take note that this setting was used by a plugin
	if(plugins_settings.indexOf(name) < 0)
		plugins_settings.push(name);

	return settings.images[name];
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
function plugins_busy_set(name, busy) {
	plugins[name].busy = busy;
	interface_update_media();

	// automatically mark the plugin as no longer busy after a given timeout
	clearTimeout(plugins[name].busy_timeout);
	if(busy === true) {
		plugins[name].busy_timeout = setTimeout(function() {
			plugins_busy_set(name, false);
		}, 1000 * 30);
	}
}

// data, images, global list
var data_images = [];

// data, images, functions, clear
function images_clear() {
	player_detach();
	data_images = [];
	interface_update_media();
}

// data, images, functions, add
function images_add(item) {
	player_detach();

	// check that this image doesn't already exist
	for(image in data_images) {
		if(data_images[image].src === item.src)
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
		var check_ext = EXTENSIONS_IMG[extension];
		var str_url = item.src;
		var str_ext = str_url.substring(str_url.length, str_url.length - check_ext.length).toLowerCase();
		if(str_ext === check_ext) {
			valid_ext = true;
			break;
		}
	}
	if(valid_ext !== true)
		return;

	data_images.push(item);
}

// data, images, functions, shuffle
function images_shuffle() {
	for(var i = data_images.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		[data_images[i], data_images[j]] = [data_images[j], data_images[i]];
	}
}

// bind shortcut keys to the events of their corresponding elements
document.onkeydown = function(event) {
	// don't handle the event if the key was used inside an input element
	if(event.target.id !== "")
		return;

	var event_key = event.keyCode;
	switch(event_key) {
		case KEY_KEYCODE_PLAY:
			if(typeof interface.media_controls_play.onclick === "function")
				interface.media_controls_play.onclick.apply(interface.media_controls_play);
			break;
		case KEY_KEYCODE_IMAGES_PREVIOUS:
			if(typeof interface.media_images_previous.onclick === "function")
				interface.media_images_previous.onclick.apply(interface.media_images_previous);
			break;
		case KEY_KEYCODE_IMAGES_PLAY:
			if(typeof interface.media_images_play.onclick === "function")
				interface.media_images_play.onclick.apply(interface.media_images_play);
			break;
		case KEY_KEYCODE_IMAGES_NEXT:
			if(typeof interface.media_images_next.onclick === "function")
				interface.media_images_next.onclick.apply(interface.media_images_next);
			break;
		case KEY_KEYCODE_IMAGES_OPEN:
			if(typeof interface.media_images_thumb.href === "string" && interface.media_images_thumb.href !== "")
				window.open(interface.media_images_thumb.href, "_blank");
			break;
	}
}

// initialize the interface
interface_init();
